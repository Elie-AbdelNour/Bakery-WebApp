const db = require("../config/config");

function createReview({ user_id, order_id, product_id, rating, comment }, callback) {
  const sql = `
    INSERT INTO reviews (user_id, order_id, product_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;
  db.query(sql, [user_id, order_id, product_id, rating, comment], callback);
}

function getReviewsByProduct(productId, callback) {
  const sql = `
    SELECT r.id, r.user_id, r.order_id, r.product_id, r.rating, r.comment, r.created_at, u.email as user_email
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `;
  db.query(sql, [productId], callback);
}

function getReviewsByOrderAndUser(orderId, userId, callback) {
  const sql = `SELECT * FROM reviews WHERE order_id = ? AND user_id = ?`;
  db.query(sql, [orderId, userId], callback);
}

function hasReviewForOrderProduct(orderId, productId, userId, callback) {
  const sql = `SELECT COUNT(*) AS cnt FROM reviews WHERE order_id = ? AND product_id = ? AND user_id = ?`;
  db.query(sql, [orderId, productId, userId], (err, rows) => {
    if (err) return callback(err);
    callback(null, (rows[0]?.cnt || 0) > 0);
  });
}

module.exports = {
  createReview,
  getReviewsByProduct,
  getReviewsByOrderAndUser,
  hasReviewForOrderProduct,
};
