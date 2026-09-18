const express = require("express");
const router = express.Router();
const orderController = require("../Controllers/orderController");
const requireAuth = require("../Middleware/requireAuth");
const authorizeRole = require("../Middleware/authRole");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: API endpoints for managing bakery orders
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new order from the logged-in customer's cart.
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Bad Request or empty cart
 *       401:
 *         description: Unauthorized or missing token
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  requireAuth,
  authorizeRole("customer"),
  orderController.placeOrder
);

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     summary: Get current user's orders (Customer)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all orders belonging to the logged-in customer, with optional pagination, sorting, and filtering by status.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination (default = 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of orders per page (default = 10)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, total_amount, status]
 *           example: created_at
 *         description: Field to sort orders by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           example: DESC
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Preparing, Ready, Delivered, Cancelled]
 *           example: Ready
 *         description: Filter orders by their current status
 *     responses:
 *       200:
 *         description: Successfully retrieved user's orders
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/my",
  requireAuth,
  authorizeRole("customer"),
  orderController.getMyOrders
);

/**
 * @swagger
 * /api/orders/driver:
 *   get:
 *     summary: Get all orders assigned to the logged-in driver
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of driver’s assigned orders
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - driver role required
 *       500:
 *         description: Server error
 */
router.get(
  "/driver",
  requireAuth,
  authorizeRole("driver"),
  orderController.getDriverOrders
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all customer orders with optional pagination, sorting, and filtering by status.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination (default = 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of orders per page (default = 10)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, total_amount, status]
 *           example: total_amount
 *         description: Field to sort orders by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           example: DESC
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Preparing, Ready, Delivered, Cancelled]
 *           example: Delivered
 *         description: Filter orders by their current status
 *     responses:
 *       200:
 *         description: Successfully retrieved all orders
 *       403:
 *         description: Forbidden - admin role required
 *       401:
 *         description: Unauthorized or invalid token
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  requireAuth,
  authorizeRole("admin"),
  orderController.getAllOrders
);

/**
 * @swagger
 * /api/orders/{id}/assign-driver:
 *   patch:
 *     summary: Assign a driver to an order (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     description: Assign an existing user with role 'driver' to handle delivery for this order.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Order ID
 *         schema:
 *           type: integer
 *           example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               driver_id:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Driver assigned successfully to order
 *       400:
 *         description: Validation error (missing driver_id)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id/assign-driver",
  requireAuth,
  authorizeRole("admin"),
  orderController.assignDriver
);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     description: Update the status of an existing order (e.g., Pending → Preparing → Ready → Delivered).
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Order ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, Preparing, Ready, Delivered, Cancelled]
 *                 example: Ready
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id/status",
  requireAuth,
  authorizeRole("admin"),
  orderController.updateOrderStatus
);

/**
 * @swagger
 * /api/orders/{id}/delivery-status:
 *   patch:
 *     summary: Update delivery status of an order (Driver)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: "On the way"
 *     responses:
 *       200:
 *         description: Delivery status updated successfully
 *       400:
 *         description: Invalid delivery status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - driver role required
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */

router.patch(
  "/:id/delivery-status",
  requireAuth,
  authorizeRole("driver"),
  orderController.updateDeliveryStatus
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get specific order details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve details for a specific order. Admins can view any order; customers can only view their own.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Order ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved order details
 *       403:
 *         description: Forbidden - not your order
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get("/:id", requireAuth, orderController.getOrderById);

module.exports = router;
