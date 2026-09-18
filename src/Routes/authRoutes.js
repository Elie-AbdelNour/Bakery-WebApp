const express = require("express");
const authController = require("../Controllers/authController.js");
const {
  validateRequestOtp,
  validateLoginOtp,
} = require("../Validations/authValidations");

// ✅ Import middlewares
const requireAuth = require("../Middleware/requireAuth.js"); // verifies JWT
const authorizeRole = require("../Middleware/authRole.js"); // restricts roles

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user login endpoints
 */
const router = express.Router();

// --------------------
// 📨 Public routes
// --------------------

/**
 * @swagger
 * /api/auth/request-otp:
 *   post:
 *     summary: Request a one-time password (OTP)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@bakery.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Missing or invalid email
 */
router.post("/request-otp", validateRequestOtp, authController.requestOtp);

/**
 * @swagger
 * /api/auth/login-otp:
 *   post:
 *     summary: Verify OTP and log in the user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@bakery.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/login-otp", validateLoginOtp, authController.loginWithOtp);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out the authenticated user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User logged out successfully
 */
router.post("/logout", authController.logout);

// --------------------
// 🔒 Protected routes (JWT required)
// --------------------

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user details
 *       401:
 *         description: Missing or invalid token
 */
router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authenticated user info",
    user: req.user, // ← now set correctly by requireAuth
  });
});

/**
 * @swagger
 * /api/auth/admin/dashboard:
 *   get:
 *     summary: Access admin dashboard (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard info
 *       403:
 *         description: Access denied (not admin)
 */
router.get(
  "/admin/dashboard",
  requireAuth,
  authorizeRole("admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome to the Admin Dashboard",
      user: req.user,
    });
  }
);

module.exports = router;
