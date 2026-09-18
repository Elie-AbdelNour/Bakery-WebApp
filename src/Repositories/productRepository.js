const db = require("../config/config");

/**
 * Get all products with pagination, sorting, and filtering
 */
function getAllProducts(options, callback) {
  const { offset, limit, sortBy, order, category, minPrice, maxPrice, search } =
    options;

  // Include aggregated review data (avg rating, count)
  let sql = `SELECT p.id, p.name, p.description, p.price, p.stock, p.category, p.image_url, p.created_at,
    COALESCE(r.avg_rating, 0) as avg_rating, COALESCE(r.count, 0) as review_count
    FROM products p
    LEFT JOIN (
      SELECT product_id, AVG(rating) as avg_rating, COUNT(*) as count
      FROM reviews
      GROUP BY product_id
    ) r ON r.product_id = p.id
    WHERE 1=1`;
  const params = [];

  // Filtering
  if (category) {
    sql += " AND category LIKE ?";
    params.push(`%${category}%`);
  }

  if (minPrice) {
    sql += " AND price >= ?";
    params.push(minPrice);
  }

  if (maxPrice) {
    sql += " AND price <= ?";
    params.push(maxPrice);
  }

  if (search) {
    sql += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  // Sorting
  const validSortFields = ["id", "name", "price", "category", "created_at"];
  const validOrders = ["asc", "desc"];

  const sortField = validSortFields.includes(sortBy) ? sortBy : "price"; // default: price
  const sortOrder = validOrders.includes(order?.toLowerCase()) ? order : "desc";

  sql += ` ORDER BY ${sortField} ${sortOrder}`;

  // Pagination
  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  db.query(sql, params, (err, rows) => {
    if (err) return callback(err);
    // normalize numeric fields
    (rows || []).forEach((r) => {
      r.avg_rating = Number(r.avg_rating) || 0;
      r.review_count = Number(r.review_count) || 0;
      r.price = Number(r.price);
    });
    callback(null, rows);
  });
}

/**
 * Count products for pagination metadata
 */
function countProducts(options, callback) {
  const { category, minPrice, maxPrice, search } = options;
  let sql = "SELECT COUNT(*) AS total FROM products WHERE 1=1";
  const params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  if (minPrice) {
    sql += " AND price >= ?";
    params.push(minPrice);
  }

  if (maxPrice) {
    sql += " AND price <= ?";
    params.push(maxPrice);
  }

  if (search) {
    sql += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  db.query(sql, params, callback);
}

/**
 * Get product by ID
 */
function getProductById(id, callback) {
  const sql = `
    SELECT id, name, description, price, stock, category, image_url, created_at
    FROM products
    WHERE id = ?
  `;
  db.query(sql, [id], (err, rows) => {
    if (err) return callback(err);
    if (rows.length === 0) return callback(null, null);

    const p = rows[0];
    const product = {
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      stock: p.stock,
      category: p.category,
      image_url: p.image_url,
      created_at: p.created_at,
    };

    callback(null, product);
  });
}

/**
 * Create product
 */
function createProduct(product, callback) {
  const sql = `
    INSERT INTO products (name, description, price, stock, category, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [
      product.name,
      product.description,
      product.price,
      product.stock,
      product.category,
      product.image_url,
    ],
    callback
  );
}

/**
 * Update product
 */
function updateProduct(id, product, callback) {
  const sql = `
    UPDATE products
    SET name=?, description=?, price=?, stock=?, category=?, image_url=?
    WHERE id=?`;
  db.query(
    sql,
    [
      product.name,
      product.description,
      product.price,
      product.stock,
      product.category,
      product.image_url,
      id,
    ],
    callback
  );
}
/**
 * Decrease stock for a product
 */
function decreaseStock(productId, quantity, callback) {
  const sql = `
    UPDATE products
    SET stock = stock - ?
    WHERE id = ? AND stock >= ?
  `;
  db.query(sql, [quantity, productId, quantity], callback);
}

/**
 * Delete product
 */
function deleteProduct(id, callback) {
  const sql = "DELETE FROM products WHERE id = ?";
  db.query(sql, [id], callback);
}

module.exports = {
  getAllProducts,
  countProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  decreaseStock,
};
