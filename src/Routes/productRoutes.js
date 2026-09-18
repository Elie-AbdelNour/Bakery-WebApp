const express = require("express");
const router = express.Router();
const productController = require("../Controllers/productController");
const requireAuth = require("../Middleware/requireAuth");
const authorizeRole = require("../Middleware/authRole");
const upload = require("../Middleware/upload");

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management and browsing endpoints
 */

// Public routes
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products (with pagination, sorting, and filtering)
 *     description: Retrieve all products with optional pagination, sorting, and filters by category, price, and search keyword.
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number (default = 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of products per page (default = 10)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: price
 *           enum: [id, name, price, category, created_at]
 *         description: Field to sort results by (default = price)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           example: asc
 *           enum: [asc, desc]
 *         description: Sort order (ascending or descending, default = desc)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           example: "Cake"
 *         description: Filter products by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           example: 5.0
 *         description: Filter products by minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           example: 20.0
 *         description: Filter products by maximum price
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "chocolate"
 *         description: Search term to match product name or description
 *     responses:
 *       200:
 *         description: Successfully retrieved a list of products
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
 *                   example: "Products retrieved successfully"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalItems:
 *                       type: integer
 *                       example: 57
 *                     totalPages:
 *                       type: integer
 *                       example: 6
 *                 filters:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       example: "Cake"
 *                     minPrice:
 *                       type: number
 *                       example: 5.0
 *                     maxPrice:
 *                       type: number
 *                       example: 20.0
 *                     search:
 *                       type: string
 *                       example: "chocolate"
 *                 sort:
 *                   type: object
 *                   properties:
 *                     sortBy:
 *                       type: string
 *                       example: "price"
 *                     order:
 *                       type: string
 *                       example: "asc"
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Chocolate Croissant"
 *                       description:
 *                         type: string
 *                         example: "Flaky croissant filled with chocolate."
 *                       price:
 *                         type: number
 *                         example: 4.5
 *                       stock:
 *                         type: integer
 *                         example: 30
 *                       category:
 *                         type: string
 *                         example: "Pastry"
 *                       image_url:
 *                         type: string
 *                         example: "https://example.com/choco-croissant.jpg"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-11-09T12:00:00Z"
 */

router.get("/", productController.getAll);
/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product details by ID
 *     tags: [Products]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */

router.get("/:id", productController.getOne);

// Admin routes
/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Chocolate Cake"
 *               description:
 *                 type: string
 *                 example: "Rich chocolate layer cake"
 *               price:
 *                 type: number
 *                 example: 10.99
 *               stock:
 *                 type: integer
 *                 example: 15
 *               category:
 *                 type: string
 *                 example: "Cake"
 *               image_url:
 *                 type: string
 *                 example: "https://example.com/cake.jpg"
 *     responses:
 *       201:
 *         description: Product created
 *       403:
 *         description: Forbidden (not admin)
 */
router.post(
  "/",
  requireAuth,
  authorizeRole("admin"),
  upload.single("image"),
  productController.create
);
/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update an existing product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               category:
 *                 type: string
 *               image_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product updated
 *       403:
 *         description: Forbidden (not admin)
 */
router.put(
  "/:id",
  requireAuth,
  authorizeRole("admin"),
  upload.single("image"),
  productController.update
);
/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted
 *       403:
 *         description: Forbidden (not admin)
 */
router.delete(
  "/:id",
  requireAuth,
  authorizeRole("admin"),
  productController.remove
);

module.exports = router;
