const express = require("express");
const router = express.Router();
const cartController = require("../Controllers/cartController");
const requireAuth = require("../Middleware/requireAuth");

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Manage user shopping cart
 */
// ✅ All cart routes require authentication
router.use(requireAuth);
/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get all items in the current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of cart items
 *       401:
 *         description: Missing or invalid token
 */
router.get("/", cartController.getCart);
/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add a product to the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: integer
 *                 example: 2
 *               quantity:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Item added to cart
 *       400:
 *         description: Invalid quantity or data
 */
router.post("/", cartController.addToCart);
/**
 * @swagger
 * /api/cart/{productId}:
 *   put:
 *     summary: Update quantity of a product in the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Cart item updated
 */
router.put("/:productId", cartController.updateCartItem);
/**
 * @swagger
 * /api/cart/{productId}:
 *   delete:
 *     summary: Remove a product from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item removed from cart
 */
router.delete("/:productId", cartController.removeCartItem);
/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear the entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 */
router.delete("/", cartController.clearCart);

module.exports = router;
