const errorCodes = require("../ErrorHandling/errorCodes");

function errorHandler(err, req, res, next) {
  // ✅ Don't log expected client errors (like missing token for guests)
  const suppressedErrors = ["TOKEN_MISSING", "TOKEN_INVALID", "UNAUTHORIZED"];
  if (!suppressedErrors.includes(err.code)) {
    console.error("❌ Error caught by global handler:", err);
  }

  // ✅ Prevent sending multiple responses
  if (res.headersSent) {
    return next(err);
  }

  const errorDef = errorCodes[err.code] || errorCodes.SERVER_ERROR;
  const status = err.httpStatus || errorDef.httpStatus || 500;
  const message = err.message || errorDef.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    code: err.code || "SERVER_ERROR",
    message,
  });
}

module.exports = errorHandler;
