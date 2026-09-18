const db = require("../config/config");

function getCartByUser(userId, callback) {
  const sql = `
    SELECT ci.id, ci.product_id, p.name, p.price, p.image_url, ci.quantity, (p.price * ci.quantity) AS total
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?`;
  db.query(sql, [userId], callback);
}

function addToCart(userId, productId, quantity, callback) {
  // First check if the user already has this product in cart
  const checkSql = `SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?`;
  db.query(checkSql, [userId, productId], (err, rows) => {
    if (err) return callback(err);

    if (rows && rows.length > 0) {
      // Update existing quantity (increment)
      const updateSql = `UPDATE cart_items SET quantity = quantity + ? WHERE id = ?`;
      return db.query(updateSql, [quantity, rows[0].id], callback);
    }

    // Otherwise insert a new row
    const insertSql = `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`;
    db.query(insertSql, [userId, productId, quantity], callback);
  });
}

function updateQuantity(userId, productId, quantity, callback) {
  const sql = `
    UPDATE cart_items SET quantity = ? 
    WHERE user_id = ? AND product_id = ?`;
  db.query(sql, [quantity, userId, productId], callback);
}

// Remove a single product from cart
function removeFromCart(userId, productId, callback) {
  const sql = `DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`;
  db.query(sql, [userId, productId], callback);
}

// Clear entire cart
function clearCart(userId, callback) {
  const sql = `DELETE FROM cart_items WHERE user_id = ?`;
  db.query(sql, [userId], callback);
}

module.exports = {
  getCartByUser,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
};
