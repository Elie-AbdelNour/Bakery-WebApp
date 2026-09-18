const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");
const requireAuth = require("../Middleware/requireAuth");
const authorizeRole = require("../Middleware/authRole");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User and Driver management (Admin only)
 */

/* ------------------------------------------------------------------
   👥 USER MANAGEMENT ROUTES (Admin)
------------------------------------------------------------------ */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Returns a list of all users including their roles.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users retrieved successfully.
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       email:
 *                         type: string
 *                         example: admin@bakery.com
 *                       role:
 *                         type: string
 *                         example: admin
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */
router.get(
  "/",
  requireAuth,
  authorizeRole("admin"),
  userController.getAllUsers
);

/**
 * @swagger
 * /api/users/drivers:
 *   get:
 *     summary: Get all drivers (Admin only)
 *     description: Returns all users who have the 'driver' role.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved all drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Drivers retrieved successfully.
 *                 drivers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 3
 *                       email:
 *                         type: string
 *                         example: driver1@bakery.com
 *                       role:
 *                         type: string
 *                         example: driver
 */
router.get(
  "/drivers",
  requireAuth,
  authorizeRole("admin"),
  userController.getAllDrivers
);

/**
 * @swagger
 * /api/users/drivers:
 *   post:
 *     summary: Create a new driver (Admin only)
 *     description: Adds a new driver to the system.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: driver2@bakery.com
 *     responses:
 *       201:
 *         description: Driver created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Driver created successfully.
 *                 driver:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 7
 *                     email:
 *                       type: string
 *                       example: driver2@bakery.com
 *                     role:
 *                       type: string
 *                       example: driver
 */
router.post(
  "/drivers",
  requireAuth,
  authorizeRole("admin"),
  userController.createDriver
);

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     summary: Promote a user to driver (Admin only)
 *     description: Changes the role of an existing user to 'driver'.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: ID of the user to promote
 *     responses:
 *       200:
 *         description: User promoted to driver successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User promoted to driver successfully.
 *                 user_id:
 *                   type: integer
 *                   example: 4
 */
router.patch(
  "/:id/role",
  requireAuth,
  authorizeRole("admin"),
  userController.promoteToDriver
);

/**
 * @swagger
 * /api/users/drivers/{id}:
 *   delete:
 *     summary: Delete a driver (Admin only)
 *     description: Permanently deletes a driver from the system.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *         description: ID of the driver to delete
 *     responses:
 *       200:
 *         description: Driver deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Driver deleted successfully.
 *                 driver_id:
 *                   type: integer
 *                   example: 5
 */
router.delete(
  "/drivers/:id",
  requireAuth,
  authorizeRole("admin"),
  userController.deleteDriver
);

module.exports = router;
