const orderService = require("../Services/orderServices");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

/**
 * @desc Place a new order (User)
 * @route POST /api/orders
 */
exports.placeOrder = (req, res, next) => {
  const userId = req.user.id;

  orderService.placeOrder(userId, (err, result) => {
    if (err) return next(err);

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: result,
    });
  });
};

/**
 * @desc Get all orders (Admin)
 * @route GET /api/orders?page=1&limit=10&sortBy=created_at&order=DESC&status=Pending
 */
exports.getAllOrders = (req, res, next) => {
  orderService.getAllOrders(req.query, (err, result) => {
    if (err) return next(err);

    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      orders: result.orders || [],
      pagination: result.pagination || {},
    });
  });
};

/**
 * @desc Get current user's own orders
 * @route GET /api/orders/my?page=1&limit=10&sortBy=created_at&order=DESC&status=Pending
 */
exports.getMyOrders = (req, res, next) => {
  const userId = req.user.id;

  orderService.getUserOrders(userId, req.query, (err, result) => {
    if (err) return next(err);

    return res.status(200).json({
      success: true,
      message: "Your orders retrieved successfully",
      orders: result.orders || [],
      pagination: result.pagination || {},
    });
  });
};

/**
 * @desc Get a specific order (Admin or the owner)
 * @route GET /api/orders/:id
 */
exports.getOrderById = (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  orderService.getOrderById(id, user, (err, result) => {
    if (err) return next(err);

    return res.status(200).json({
      success: true,
      message: "Order details retrieved successfully",
      order: result,
    });
  });
};

/**
 * @desc Update order status (Admin)
 * @route PATCH /api/orders/:id/status
 */
exports.updateOrderStatus = (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return next(
      new AppError(
        "VALIDATION_ERROR",
        "Status field is required.",
        errorCodes.VALIDATION_ERROR.httpStatus
      )
    );
  }

  orderService.updateOrderStatus(id, status, (err, result) => {
    if (err) return next(err);

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      result,
    });
  });
};

/* ------------------------------------------------------------------
   🚚 DRIVER LOGIC (New)
------------------------------------------------------------------ */

/**
 * @desc Assign a driver to an order (Admin)
 * @route PATCH /api/orders/:id/assign-driver
 */
exports.assignDriver = (req, res, next) => {
  const { id } = req.params;
  const { driver_id } = req.body;

  if (!driver_id) {
    return next(
      new AppError(
        "VALIDATION_ERROR",
        "driver_id field is required.",
        errorCodes.VALIDATION_ERROR.httpStatus
      )
    );
  }

  orderService.assignDriverToOrder(id, driver_id, (err, result) => {
    if (err) return next(err);

    return res.status(200).json({
      success: true,
      message: "Driver assigned successfully to order.",
      result,
    });
  });
};

/**
 * @desc Get all orders assigned to the current driver
 * @route GET /api/orders/driver
 */
exports.getDriverOrders = (req, res, next) => {
  const driverId = req.user.id;

  orderService.getOrdersByDriver(driverId, req.query, (err, result) => {
    if (err) return next(err);

    return res.status(200).json({
      success: true,
      message: "Driver's orders retrieved successfully",
      orders: result.orders || [],
      pagination: result.pagination || {},
    });
  });
};

/**
 * @desc Update delivery status of an order (Driver)
 * @route PATCH /api/orders/:id/delivery-status
 */
exports.updateDeliveryStatus = (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  const driverId = req.user.id;

  if (!status) {
    return next(
      new AppError(
        "VALIDATION_ERROR",
        "status field is required.",
        errorCodes.VALIDATION_ERROR.httpStatus
      )
    );
  }

  orderService.updateDeliveryStatus(id, driverId, status, (err, result) => {
    if (err) return next(err);

    return res.status(200).json({
      success: true,
      message: "Delivery status updated successfully",
      result,
    });
  });
};