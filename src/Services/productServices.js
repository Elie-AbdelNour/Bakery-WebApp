const productRepo = require("../Repositories/productRepository");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

/**
 * List all products with pagination, sorting, and filtering
 */
exports.listAllProducts = (query, callback) => {
  let {
    page = 1,
    limit = 10,
    sortBy = "price",
    order = "desc",
    category,
    minPrice,
    maxPrice,
    search,
  } = query;

  page = parseInt(page);
  limit = parseInt(limit);
  const offset = (page - 1) * limit;

  const options = {
    offset,
    limit,
    sortBy,
    order,
    category,
    minPrice,
    maxPrice,
    search,
  };

  productRepo.countProducts(options, (err, countResult) => {
    if (err)
      return callback(
        new AppError("QUERY_FAILED", "Failed to count products", 500)
      );

    const totalItems = countResult[0]?.total || 0;

    productRepo.getAllProducts(options, (err2, products) => {
      if (err2)
        return callback(
          new AppError("QUERY_FAILED", "Failed to fetch products", 500)
        );

      const totalPages = Math.ceil(totalItems / limit);

      callback(null, {
        success: true,
        message: "Products retrieved successfully",
        pagination: {
          currentPage: page,
          limit,
          totalItems,
          totalPages,
        },
        filters: { category, minPrice, maxPrice, search },
        sort: { sortBy, order },
        products,
      });
    });
  });
};

/**
 * Get single product details
 */
exports.getProductDetails = (id, callback) => {
  productRepo.getProductById(id, (err, product) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          500
        )
      );

    if (!product)
      return callback(
        new AppError(
          "PRODUCT_NOT_FOUND",
          errorCodes.PRODUCT_NOT_FOUND.message,
          404
        )
      );

    const reviewService = require("./reviewServices");

    // Fetch reviews and attach to product details
    reviewService.getProductReviews(id, (rErr, reviews) => {
      if (rErr) return callback(rErr);

      // compute average rating and count
      let avg = 0;
      if (reviews && reviews.length) {
        avg = reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length;
      }

      const result = {
        ...product,
        reviews: reviews || [],
        avg_rating: Number(avg.toFixed(2)),
        review_count: reviews.length || 0,
      };

      // Return the raw product object (controller will wrap for the API)
      callback(null, result);
    });
  });
};


/**
 * Create a new product
 */
exports.addProduct = (data, callback) => {
  if (!data.name || !data.price)
    return callback(
      new AppError(
        "INVALID_PRODUCT_DATA",
        errorCodes.INVALID_PRODUCT_DATA.message,
        errorCodes.INVALID_PRODUCT_DATA.httpStatus
      )
    );

  productRepo.createProduct(data, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "PRODUCT_CREATION_FAILED",
          errorCodes.PRODUCT_CREATION_FAILED.message,
          errorCodes.PRODUCT_CREATION_FAILED.httpStatus
        )
      );

    callback(null, {
      success: true,
      message: "Product created successfully",
      id: result.insertId,
    });
  });
};

/**
 * Update product
 */
exports.editProduct = (id, data, callback) => {
  productRepo.updateProduct(id, data, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "PRODUCT_UPDATE_FAILED",
          errorCodes.PRODUCT_UPDATE_FAILED.message,
          errorCodes.PRODUCT_UPDATE_FAILED.httpStatus
        )
      );

    if (!result || result.affectedRows === 0)
      return callback(
        new AppError(
          "PRODUCT_NOT_FOUND",
          errorCodes.PRODUCT_NOT_FOUND.message,
          errorCodes.PRODUCT_NOT_FOUND.httpStatus
        )
      );

    callback(null, { success: true, message: "Product updated successfully" });
  });
};

/**
 * Delete product
 */
exports.removeProduct = (id, callback) => {
  productRepo.deleteProduct(id, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "PRODUCT_DELETE_FAILED",
          errorCodes.PRODUCT_DELETE_FAILED.message,
          errorCodes.PRODUCT_DELETE_FAILED.httpStatus
        )
      );

    if (!result || result.affectedRows === 0)
      return callback(
        new AppError(
          "PRODUCT_NOT_FOUND",
          errorCodes.PRODUCT_NOT_FOUND.message,
          errorCodes.PRODUCT_NOT_FOUND.httpStatus
        )
      );

    callback(null, { success: true, message: "Product deleted successfully" });
  });
};
