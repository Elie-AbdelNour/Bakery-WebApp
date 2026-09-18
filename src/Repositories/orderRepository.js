const db = require("../config/config");

/**
 * Create a new order and related order details
 * NOTE:
 *  - subtotal is a GENERATED column in MySQL, so we do NOT insert it manually.
 */
function createOrder(userId, totalAmount, items, callback) {
  db.beginTransaction((err) => {
    if (err) return callback(err);

    const orderSql = `
      INSERT INTO orders (user_id, status, created_at)
      VALUES (?, 'Pending', NOW())
    `;

    db.query(orderSql, [userId], (err, orderRes) => {
      if (err) return db.rollback(() => callback(err));

      const orderId = orderRes.insertId;

      // subtotal column exists in this schema -> compute and include it
      const detailSql = `
        INSERT INTO order_details (order_id, product_id, quantity, price, subtotal, created_at)
        VALUES ?
      `;

      const values = items.map((i) => {
        const quantity = Number(i.quantity) || 0;
        const price = Number(i.price) || 0;
        const subtotal = (price * quantity).toFixed(2);
        return [orderId, i.product_id, quantity, price, subtotal, new Date()];
      });

      db.query(detailSql, [values], (err2) => {
        if (err2) return db.rollback(() => callback(err2));

        db.commit((err3) => {
          if (err3) return db.rollback(() => callback(err3));

          console.log("✅ Order created successfully:", orderId);
          callback(null, {
            id: orderId,
            user_id: userId,
            total_amount: totalAmount,
            status: "Pending",
          });
        });
      });
    });
  });
}

/**
 * Get all orders (Admin) with pagination, sorting, and optional filtering
 */
function getAllOrders(query, callback) {
  const {
    page = 1,
    limit = 10,
    sortBy = "created_at",
    order = "DESC",
    status,
  } = query;

  const offset = (Number(page) - 1) * Number(limit);
  const validSortColumns = ["id", "created_at", "total_amount", "status"];
  const validOrderValues = ["ASC", "DESC"];

  const finalSort = validSortColumns.includes(sortBy) ? sortBy : "created_at";
  const finalOrder = validOrderValues.includes(order.toUpperCase())
    ? order.toUpperCase()
    : "DESC";

  // include aggregated total_amount from order_details
  let baseQuery = `
    SELECT o.*, COALESCE(od.total_amount, 0) AS total_amount
    FROM orders o
    LEFT JOIN (
      SELECT order_id, SUM(price * quantity) AS total_amount
      FROM order_details
      GROUP BY order_id
    ) od ON od.order_id = o.id
  `;
  const params = [];

  if (status) {
    baseQuery += " WHERE LOWER(status) = LOWER(?)";
    params.push(status);
  }

  baseQuery += ` ORDER BY ${finalSort} ${finalOrder} LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  console.log("🧠 [Admin Orders] Query:", baseQuery, params);

  db.query(baseQuery, params, (err, rows) => {
    if (err) {
      console.error("DB Error (getOrdersByDriver):", err);
      console.error("SQL:", baseQuery);
      console.error("Params:", params);
      return callback(err);
    }

    let countQuery = "SELECT COUNT(*) AS total FROM orders";
    const countParams = [];

    if (status) {
      countQuery += " WHERE LOWER(status) = LOWER(?)";
      countParams.push(status);
    }

    db.query(countQuery, countParams, (err2, countRes) => {
      if (err2) return callback(err2);

      const total = countRes[0].total;
      callback(null, {
        orders: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    });
  });
}

/**
 * Get all orders for a specific user with pagination/sorting
 */
function getOrdersByUser(userId, query, callback) {
  const {
    page = 1,
    limit = 10,
    sortBy = "created_at",
    order = "DESC",
    status,
  } = query;

  const offset = (Number(page) - 1) * Number(limit);
  const validSortColumns = ["id", "created_at", "total_amount", "status"];
  const validOrderValues = ["ASC", "DESC"];

  const finalSort = validSortColumns.includes(sortBy) ? sortBy : "created_at";
  const finalOrder = validOrderValues.includes(order.toUpperCase())
    ? order.toUpperCase()
    : "DESC";

  // include aggregated total_amount per order
  let baseQuery = `
    SELECT o.*, COALESCE(od.total_amount, 0) AS total_amount
    FROM orders o
    LEFT JOIN (
      SELECT order_id, SUM(price * quantity) AS total_amount
      FROM order_details
      GROUP BY order_id
    ) od ON od.order_id = o.id
    WHERE o.user_id = ?
  `;
  const params = [userId];

  if (status) {
    baseQuery += " AND LOWER(status) = LOWER(?)";
    params.push(status);
  }

  baseQuery += ` ORDER BY ${finalSort} ${finalOrder} LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  console.log("🧠 [User Orders] Query:", baseQuery, params);

  db.query(baseQuery, params, (err, rows) => {
    if (err) return callback(err);

    let countQuery = "SELECT COUNT(*) AS total FROM orders WHERE user_id = ?";
    const countParams = [userId];

    if (status) {
      countQuery += " AND LOWER(status) = LOWER(?)";
      countParams.push(status);
    }

    db.query(countQuery, countParams, (err2, countRes) => {
      if (err2) return callback(err2);

      const total = countRes[0].total;
      callback(null, {
        orders: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    });
  });
}

/**
 * Get single order by ID with details
 */
function getOrderById(orderId, callback) {
  // fetch order and aggregated total
  const sql = `
    SELECT o.*, COALESCE(od.total_amount, 0) AS total_amount
    FROM orders o
    LEFT JOIN (
      SELECT order_id, SUM(price * quantity) AS total_amount
      FROM order_details
      GROUP BY order_id
    ) od ON od.order_id = o.id
    WHERE o.id = ?
  `;

  db.query(sql, [orderId], (err, orderRows) => {
    if (err) return callback(err);
    if (orderRows.length === 0) return callback(null, null);

    db.query(
      `
      SELECT od.*, p.name AS product_name 
      FROM order_details od
      JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?
      `,
      [orderId],
      (err2, details) => {
        if (err2) return callback(err2);
        callback(null, { ...orderRows[0], items: details });
      }
    );
  });
}

/**
 * Update order status
 */
function updateOrderStatus(orderId, status, callback) {
  db.query(
    "UPDATE orders SET status = ? WHERE id = ?",
    [status, orderId],
    (err, result) => {
      if (err) return callback(err);
      callback(null, result.affectedRows > 0);
    }
  );
}

/**
 * Set ready time for order (requires ready_time column)
 */
function setReadyTime(orderId, readyTime, callback) {
  db.query(
    "UPDATE orders SET ready_time = ? WHERE id = ?",
    [readyTime, orderId],
    (err, result) => {
      if (err) return callback(err);
      callback(null, result.affectedRows > 0);
    }
  );
}

/* ------------------------------------------------------------------
   🚚 DRIVER LOGIC
------------------------------------------------------------------ */

/**
 * Assign driver to an order (Admin)
 */
function assignDriver(orderId, driverId, callback) {
  const sql = "UPDATE orders SET driver_id = ? WHERE id = ?";
  db.query(sql, [driverId, orderId], (err, result) => {
    if (err) return callback(err);
    callback(null, result.affectedRows > 0);
  });
}

/**
 * Get all orders assigned to a specific driver
 */
function getOrdersByDriver(driverId, query, callback) {
  const {
    page = 1,
    limit = 10,
    sortBy = "created_at",
    order = "DESC",
    status,
  } = query;

  const offset = (Number(page) - 1) * Number(limit);
  const validSortColumns = ["id", "created_at", "total_amount", "status"];
  const validOrderValues = ["ASC", "DESC"];
  const finalSort = validSortColumns.includes(sortBy) ? sortBy : "created_at";
  const finalOrder = validOrderValues.includes(order.toUpperCase())
    ? order.toUpperCase()
    : "DESC";

  let baseQuery = `
    SELECT o.*, u.email AS customer_email, COALESCE(od.total_amount, 0) AS total_amount
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN (
      SELECT order_id, SUM(price * quantity) AS total_amount
      FROM order_details
      GROUP BY order_id
    ) od ON o.id = od.order_id
    WHERE o.driver_id = ?
  `;
  const params = [driverId];

  // By default, drivers should not see Delivered orders on their dashboard
  // unless explicitly requested via the `status` query param.
  if (status) {
    baseQuery += " AND o.status = ?";
    params.push(status);
  } else {
    baseQuery += " AND o.status != 'Delivered'";
  }

  baseQuery += ` ORDER BY o.${finalSort} ${finalOrder} LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  db.query(baseQuery, params, (err, rows) => {
    if (err) return callback(err);

    const countQuery =
      "SELECT COUNT(*) AS total FROM orders WHERE driver_id = ?";
    db.query(countQuery, [driverId], (err2, countRes) => {
      if (err2) return callback(err2);

      const total = countRes[0].total;
      callback(null, {
        orders: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    });
  });
}

/**
 * Update delivery status (Driver)
 */
function updateDeliveryStatus(orderId, driverId, status, callback) {
  const sql = "UPDATE orders SET status = ? WHERE id = ? AND driver_id = ?";
  db.query(sql, [status, orderId, driverId], (err, result) => {
    if (err) return callback(err);
    callback(null, result.affectedRows > 0);
  });
}

function getCustomerEmailByOrder(orderId, callback) {
  const sql = `
    SELECT u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `;

  db.query(sql, [orderId], (err, result) => {
    if (err) return callback(err, null);
    if (result.length === 0) return callback(null, null);
    callback(null, result[0].email);
  });
}

/**
 * Unassign driver from orders and set status to Pending
 */
function unassignDriverFromOrders(driverId, callback) {
  const sql =
    "UPDATE orders SET driver_id = NULL, status = 'Pending' WHERE driver_id = ?";
  db.query(sql, [driverId], (err, result) => {
    if (err) return callback(err);
    callback(null, result.affectedRows);
  });
}

module.exports = {
  createOrder,
  getAllOrders,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
  setReadyTime,
  assignDriver,
  getOrdersByDriver,
  updateDeliveryStatus,
  getCustomerEmailByOrder,
  unassignDriverFromOrders,
};
