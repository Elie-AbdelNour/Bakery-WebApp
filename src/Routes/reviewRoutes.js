const express = require("express");
const router = express.Router();
const reviewController = require("../Controllers/reviewController");
const requireAuth = require("../Middleware/requireAuth");
const authorizeRole = require("../Middleware/authRole");

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Product reviews submitted by customers after delivery
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Submit a review for a product in an order
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               order_id:
 *                 type: integer
 *                 example: 123
 *               product_id:
 *                 type: integer
 *                 example: 5
 *               rating:
 *                 type: integer
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Tasty and fresh!"
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       400:
 *         description: Validation error or not allowed (e.g., order not delivered)
 *       401:
 *         description: Unauthorized
 */
router.post("/", requireAuth, authorizeRole("customer"), reviewController.createReview);

/**
 * @swagger
 * /api/reviews/product/{productId}:
 *   get:
 *     summary: Get reviews for a specific product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product
 *     responses:
 *       200:
 *         description: List of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       user_id:
 *                         type: integer
 *                       order_id:
 *                         type: integer
 *                       product_id:
 *                         type: integer
 *                       rating:
 *                         type: integer
 *                       comment:
 *                         type: string
 *                       created_at:
 *                         type: string
 */
router.get("/product/:productId", reviewController.getProductReviews);

module.exports = router;
