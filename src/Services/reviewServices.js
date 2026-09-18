const reviewRepo = require("../Repositories/reviewRepository");
const orderRepo = require("../Repositories/orderRepository");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

exports.addReview = (userId, payload, callback) => {
  const { order_id, product_id, rating, comment } = payload;

  if (!order_id || !product_id || !rating) {
    return callback(
      new AppError(
        "VALIDATION_ERROR",
        "order_id, product_id and rating are required",
        errorCodes.VALIDATION_ERROR.httpStatus
      )
    );
  }

  // Verify order exists and belongs to user and is Delivered
  orderRepo.getOrderById(order_id, (err, order) => {
    if (err) return callback(err);
    if (!order)
      return callback(
        new AppError(
          "ORDER_NOT_FOUND",
          errorCodes.ORDER_NOT_FOUND.message,
          errorCodes.ORDER_NOT_FOUND.httpStatus
        )
      );

    if (order.user_id !== userId)
      return callback(
        new AppError("FORBIDDEN", errorCodes.FORBIDDEN.message, errorCodes.FORBIDDEN.httpStatus)
      );

    if (String(order.status).toLowerCase() !== "delivered")
      return callback(
        new AppError("NOT_ALLOWED", "You can only review delivered orders.", 400)
      );

    // Ensure the product was part of the order
    const belongs = (order.items || []).some((it) => Number(it.product_id) === Number(product_id));
    if (!belongs)
      return callback(
        new AppError("INVALID_OPERATION", "Product not part of the order.", 400)
      );

    // Check duplicate
    reviewRepo.hasReviewForOrderProduct(order_id, product_id, userId, (hErr, exists) => {
      if (hErr) return callback(hErr);
      if (exists)
        return callback(
          new AppError("ALREADY_REVIEWED", "You already reviewed this product for this order.", 400)
        );

      reviewRepo.createReview({ user_id: userId, order_id, product_id, rating, comment }, (cErr, result) => {
        if (cErr) return callback(cErr);
        callback(null, { success: true, id: result.insertId });
      });
    });
  });
};

exports.getProductReviews = (productId, callback) => {
  reviewRepo.getReviewsByProduct(productId, (err, rows) => {
    if (err) return callback(err);
    callback(null, rows || []);
  });
};
