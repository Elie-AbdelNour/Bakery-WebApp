const cartRepo = require("../Repositories/cartRepository");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

exports.getUserCart = (userId, callback) => {
  cartRepo.getCartByUser(userId, (err, cart) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );

    // ✅ Empty cart is valid - return empty array instead of error
    if (!cart || cart.length === 0) {
      return callback(null, []);
    }

    callback(null, cart);
  });
};

exports.addItemToCart = (userId, productId, quantity, callback) => {
  if (quantity <= 0)
    return callback(
      new AppError(
        "INVALID_QUANTITY",
        errorCodes.INVALID_QUANTITY.message,
        errorCodes.INVALID_QUANTITY.httpStatus
      )
    );

  cartRepo.addToCart(userId, productId, quantity, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );

    if (!result || result.affectedRows === 0)
      return callback(
        new AppError(
          "CART_UPDATE_FAILED",
          errorCodes.CART_UPDATE_FAILED.message,
          errorCodes.CART_UPDATE_FAILED.httpStatus
        )
      );

    callback(null, { success: true, message: "Item added to cart." });
  });
};

/**
 * Update item quantity in cart
 */
exports.updateCartItem = (userId, productId, quantity, callback) => {
  if (quantity <= 0)
    return callback(
      new AppError(
        "INVALID_QUANTITY",
        errorCodes.INVALID_QUANTITY.message,
        errorCodes.INVALID_QUANTITY.httpStatus
      )
    );

  cartRepo.updateQuantity(userId, productId, quantity, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );

    if (!result || result.affectedRows === 0)
      return callback(
        new AppError(
          "CART_UPDATE_FAILED",
          errorCodes.CART_UPDATE_FAILED.message,
          errorCodes.CART_UPDATE_FAILED.httpStatus
        )
      );

    callback(null, { success: true, message: "Cart item updated." });
  });
};

exports.deleteCartItem = (userId, productId, callback) => {
  cartRepo.removeFromCart(userId, productId, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );

    if (!result || result.affectedRows === 0)
      return callback(
        new AppError(
          "CART_ITEM_NOT_FOUND",
          errorCodes.CART_ITEM_NOT_FOUND.message,
          errorCodes.CART_ITEM_NOT_FOUND.httpStatus
        )
      );

    callback(null, { success: true, message: "Item removed from cart." });
  });
};

exports.clearUserCart = (userId, callback) => {
  cartRepo.clearCart(userId, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );

    if (!result || result.affectedRows === 0)
      return callback(
        new AppError(
          "CART_UPDATE_FAILED",
          errorCodes.CART_UPDATE_FAILED.message,
          errorCodes.CART_UPDATE_FAILED.httpStatus
        )
      );

    callback(null, { success: true, message: "Cart cleared successfully." });
  });
};
