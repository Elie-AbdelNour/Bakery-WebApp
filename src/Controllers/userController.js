const userService = require("../Services/userServices");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

/**
 * @desc Create a new driver (Admin only)
 * @route POST /api/users/drivers
 */
exports.createDriver = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(
      new AppError(
        "VALIDATION_ERROR",
        "Email field is required.",
        errorCodes.VALIDATION_ERROR.httpStatus
      )
    );
  }

  userService.createDriver(email, (err, driver) => {
    if (err) return next(err);
    res.status(201).json({
      success: true,
      message: "Driver created successfully.",
      driver,
    });
  });
};

/**
 * @desc Promote an existing user to driver (Admin only)
 * @route PATCH /api/users/:id/role
 */
exports.promoteToDriver = (req, res, next) => {
  const { id } = req.params;

  userService.promoteToDriver(id, (err, result) => {
    if (err) return next(err);
    res.status(200).json({
      success: true,
      message: "User promoted to driver successfully.",
      user_id: id,
    });
  });
};

/**
 * @desc Get all drivers (Admin only)
 * @route GET /api/users/drivers
 */
exports.getAllDrivers = (req, res, next) => {
  userService.getAllDrivers((err, drivers) => {
    if (err) return next(err);
    res.status(200).json({
      success: true,
      message: "Drivers retrieved successfully.",
      drivers,
    });
  });
};

/**
 * @desc Get all users (Admin only)
 * @route GET /api/users
 */
exports.getAllUsers = (req, res, next) => {
  userService.getAllUsers((err, users) => {
    if (err) return next(err);
    res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      users,
    });
  });
};

/**
 * @desc Delete a driver (Admin only)
 * @route DELETE /api/users/drivers/:id
 */
exports.deleteDriver = (req, res, next) => {
  const { id } = req.params;

  userService.deleteDriver(id, (err, result) => {
    if (err) return next(err);
    res.status(200).json({
      success: true,
      message: "Driver deleted successfully.",
      driver_id: id,
      ordersAffected: result.ordersAffected || 0,
    });
  });
};
