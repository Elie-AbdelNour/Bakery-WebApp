require("dotenv").config();
const jwt = require("jsonwebtoken");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

function authorizeRole(requiredRole) {
  return (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
      return next(
        new AppError(
          "TOKEN_MISSING",
          errorCodes.TOKEN_MISSING.message,
          errorCodes.TOKEN_MISSING.httpStatus
        )
      );
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (decoded.role !== requiredRole) {
        return next(
          new AppError(
            "FORBIDDEN",
            `Access denied. Only ${requiredRole}s allowed.`,
            errorCodes.FORBIDDEN.httpStatus
          )
        );
      }

      next();
    } catch (err) {
      return next(
        new AppError(
          "TOKEN_INVALID",
          errorCodes.TOKEN_INVALID.message,
          errorCodes.TOKEN_INVALID.httpStatus
        )
      );
    }
  };
}

module.exports = authorizeRole;
