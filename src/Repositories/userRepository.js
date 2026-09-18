// src/Repositories/userRepository.js
const db = require("../config/config");

/**
 * Create a driver by email.
 * - If user with this email already exists → update their role to 'driver'
 * - If not → insert a new user with role 'driver'
 */
function createDriver(email, callback) {
  // 1️⃣ Check if user already exists
  const findSql = "SELECT id, email, role FROM users WHERE email = ? LIMIT 1";

  db.query(findSql, [email], (err, rows) => {
    if (err) return callback(err);

    if (rows.length > 0) {
      // 2️⃣ User exists → just promote to driver
      const existingId = rows[0].id;
      const updateSql = "UPDATE users SET role = 'driver' WHERE id = ?";

      db.query(updateSql, [existingId], (err2, result) => {
        if (err2) return callback(err2);

        // mimic insert-like result so service layer keeps working
        callback(null, {
          insertId: existingId,
          affectedRows: result.affectedRows,
        });
      });

      return;
    }

    // 3️⃣ No user → create a brand new driver
    const insertSql =
      "INSERT INTO users (email, role, created_at) VALUES (?, 'driver', NOW())";

    db.query(insertSql, [email], (err3, result) => {
      if (err3) return callback(err3);
      callback(null, result);
    });
  });
}

/**
 * Promote an existing user (by id) to driver
 */
function promoteToDriver(userId, callback) {
  const sql = "UPDATE users SET role = 'driver' WHERE id = ?";
  db.query(sql, [userId], (err, result) => {
    if (err) return callback(err);
    callback(null, result.affectedRows > 0);
  });
}

/**
 * Get all drivers
 */
function getAllDrivers(callback) {
  const sql =
    "SELECT id, email, role, created_at FROM users WHERE role = 'driver'";
  db.query(sql, (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

/**
 * Get all users (Admin)
 */
function getAllUsers(callback) {
  const sql =
    "SELECT id, email, role, created_at FROM users ORDER BY created_at DESC";
  db.query(sql, (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

/**
 * Delete a driver by ID and unassign from orders
 */
function deleteDriver(driverId, unassignCallback, callback) {
  // First verify this is actually a driver
  const checkSql = "SELECT id FROM users WHERE id = ? AND role = 'driver'";
  db.query(checkSql, [driverId], (err, rows) => {
    if (err) return callback(err);
    if (rows.length === 0) return callback(null, false);

    // Now delete the driver (orders will be handled by service layer)
    const deleteSql = "DELETE FROM users WHERE id = ?";
    db.query(deleteSql, [driverId], (err2, result) => {
      if (err2) return callback(err2);
      callback(null, result.affectedRows > 0);
    });
  });
}

module.exports = {
  createDriver,
  promoteToDriver,
  getAllDrivers,
  getAllUsers,
  deleteDriver,
};
