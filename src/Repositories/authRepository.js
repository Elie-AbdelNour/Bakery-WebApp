const db = require("../config/config");

/**
 * ✅ Find user by email
 * Returns the raw MySQL results array for backward compatibility.
 */
function findUserByEmail(email, callback) {
  const sql = "SELECT id, email, role, created_at FROM users WHERE email = ? LIMIT 1";
  db.query(sql, [email], (err, results) => {
    if (err) return callback(err);
    // ⚠️ Return in the old style your service expects
    return callback(null, results);
  });
}

/**
 * ✅ Create new user only if not already exists
 * Prevents duplicates but returns same shape (results-like) for authServices.
 */
function createUserWithEmail(email, callback) {
  const checkSql = "SELECT id, email, role, created_at FROM users WHERE email = ? LIMIT 1";
  db.query(checkSql, [email], (err, results) => {
    if (err) return callback(err);

    if (results.length > 0) {
      // ✅ Return existing user in the same results[] format
      return callback(null, results);
    }

    // ✅ Insert new user if not found
    const insertSql = "INSERT INTO users (email, role) VALUES (?, 'customer')";
    db.query(insertSql, [email], (insertErr, insertRes) => {
      if (insertErr) return callback(insertErr);

      // ✅ Return as array to match your original service structure
      const newUserResult = [
        {
          id: insertRes.insertId,
          email,
          role: "customer",
          created_at: new Date(),
        },
      ];

      callback(null, newUserResult);
    });
  });
}

/**
 * ✅ Get user by ID (for sending invoices)
 */
function getUserById(id, callback) {
  const sql = "SELECT id, email, role, created_at FROM users WHERE id = ? LIMIT 1";
  db.query(sql, [id], (err, results) => {
    if (err) return callback(err);
    callback(null, results[0] || null);
  });
}

module.exports = {
  findUserByEmail,
  createUserWithEmail,
  getUserById,
};
