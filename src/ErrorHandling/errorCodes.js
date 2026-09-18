module.exports = {
  //General / System
  SERVER_ERROR: { httpStatus: 500, message: "Internal server error" },
  VALIDATION_ERROR: { httpStatus: 400, message: "Invalid input data" },
  NOT_FOUND: { httpStatus: 404, message: "Resource not found" },
  UNAUTHORIZED: { httpStatus: 401, message: "Unauthorized access" },
  FORBIDDEN: { httpStatus: 403, message: "Permission denied" },
  QUERY_FAILED: { httpStatus: 500, message: "Database query failed" },
  BAD_REQUEST: { httpStatus: 400, message: "Bad request" },

  //Authentication / OTP
  EMAIL_REQUIRED: { httpStatus: 400, message: "Email is required" },
  OTP_SEND_FAIL: { httpStatus: 500, message: "Failed to send OTP" },
  INVALID_OTP: { httpStatus: 400, message: "Invalid OTP" },
  OTP_EXPIRED: { httpStatus: 400, message: "OTP expired or not found" },
  LOGIN_FAILED: { httpStatus: 401, message: "Login failed" },
  TOKEN_MISSING: { httpStatus: 401, message: "Authentication token missing" },
  TOKEN_INVALID: { httpStatus: 401, message: "Invalid or expired token" },

  //Products
  PRODUCT_NOT_FOUND: { httpStatus: 404, message: "Product not found" },
  INVALID_PRODUCT_DATA: { httpStatus: 400, message: "Invalid product data" },
  PRODUCT_CREATION_FAILED: {
    httpStatus: 500,
    message: "Could not create product",
  },
  PRODUCT_UPDATE_FAILED: {
    httpStatus: 500,
    message: "Could not update product",
  },
  PRODUCT_DELETE_FAILED: {
    httpStatus: 500,
    message: "Could not delete product",
  },
  STOCK_TOGGLE_FAILED: {
    httpStatus: 500,
    message: "Could not update product stock",
  },

  //Cart
  CART_EMPTY: { httpStatus: 400, message: "Your cart is empty" },
  INVALID_QUANTITY: {
    httpStatus: 400,
    message: "Quantity must be greater than zero",
  },
  PRODUCT_ALREADY_IN_CART: {
    httpStatus: 400,
    message: "Product is already in the cart",
  },
  CART_ITEM_NOT_FOUND: {
    httpStatus: 404,
    message: "Cart item not found",
  },
  CART_UPDATE_FAILED: {
    httpStatus: 500,
    message: "Failed to update cart",
  },

  //Orders (if used)
  ORDER_NOT_FOUND: { httpStatus: 404, message: "Order not found" },
  INVALID_ORDER_STATUS: {
    httpStatus: 400,
    message: "Invalid order status value",
  },
  ORDER_CREATION_FAILED: {
    httpStatus: 500,
    message: "Could not create order",
  },
  ORDER_UPDATE_FAILED: {
    httpStatus: 500,
    message: "Could not update order",
  },

  //Database / Integration
  DB_CONNECTION_FAILED: {
    httpStatus: 500,
    message: "Database connection failed",
  },
  EMAIL_SERVICE_FAILED: {
    httpStatus: 500,
    message: "Email service unavailable",
  },
};
