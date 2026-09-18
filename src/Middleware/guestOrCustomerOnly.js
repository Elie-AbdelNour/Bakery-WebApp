require("dotenv").config();
const jwt = require("jsonwebtoken");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

function guestOrCustomerOnly(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (decoded.role === "customer") {
      return next();
    }

    // Redirect admin and driver to their respective dashboards
    if (decoded.role === "admin") {
      return res.redirect("/admin");
    }

    if (decoded.role === "driver") {
      return res.redirect("/driver");
    }

    return next(
      new AppError(
        "FORBIDDEN",
        "Access denied. This page is only for guests and customers.",
        errorCodes.FORBIDDEN.httpStatus
      )
    );
  } catch (err) {
    return next(
      new AppError(
        "TOKEN_INVALID",
        errorCodes.TOKEN_INVALID.message,
        errorCodes.TOKEN_INVALID.httpStatus
      )
    );
  }
}

module.exports = guestOrCustomerOnly;
