const { sendOtpEmail } = require("../integrations/emailService");
const jwt = require("jsonwebtoken");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");
const userRepo = require("../Repositories/authRepository");

const otpStore = {}; // temporary in-memory OTP store

/**
 * Send OTP to user email
 */
exports.sendLoginOtp = (email, callback) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔐 [authService] Generated OTP: ${otp} for ${email}`);

    // Send OTP email
    console.log(`📤 [authService] Calling sendOtpEmail...`);
    sendOtpEmail(email, otp)
      .then(() => {
        console.log(`✅ [authService] sendOtpEmail resolved successfully`);
        otpStore[email] = otp;
        setTimeout(() => delete otpStore[email], 10 * 60 * 1000);

        // ✅ Send OTP back as 3rd param (for console logging)
        console.log(`📞 [authService] Calling callback with OTP: ${otp}`);
        callback(null, { message: "OTP sent successfully." }, otp);
      })
      .catch((err) => {
        console.error("❌ Error sending OTP email:", err);
        callback(
          new AppError(
            "OTP_SEND_FAIL",
            errorCodes.OTP_SEND_FAIL.message,
            errorCodes.OTP_SEND_FAIL.httpStatus
          )
        );
      });
  } catch (error) {
    console.error("❌ [authService] Exception in sendLoginOtp:", error);
    callback(
      new AppError(
        "SERVER_ERROR",
        "Failed to generate OTP.",
        errorCodes.SERVER_ERROR.httpStatus
      )
    );
  }
};


/**
 * Verify OTP and log in user (create if new)
 */
exports.verifyLoginOtp = (email, otp, callback) => {
  try {
    if (!email || !otp) {
      return callback(
        new AppError(
          "VALIDATION_ERROR",
          "Email and OTP are required",
          errorCodes.VALIDATION_ERROR.httpStatus
        )
      );
    }

    const storedOtp = otpStore[email];

    if (!storedOtp) {
      return callback(
        new AppError(
          "OTP_EXPIRED",
          errorCodes.OTP_EXPIRED.message,
          errorCodes.OTP_EXPIRED.httpStatus
        )
      );
    }

    if (storedOtp !== otp) {
      return callback(
        new AppError(
          "INVALID_OTP",
          errorCodes.INVALID_OTP.message,
          errorCodes.INVALID_OTP.httpStatus
        )
      );
    }

    // Remove OTP after successful verification
    delete otpStore[email];

    // Check if user exists
    userRepo.findUserByEmail(email, (err, results) => {
      if (err) {
        console.error("❌ DB Error (findUserByEmail):", err);
        return callback(
          new AppError(
            "QUERY_FAILED",
            errorCodes.QUERY_FAILED.message,
            errorCodes.QUERY_FAILED.httpStatus
          )
        );
      }

      if (results && results.length > 0) {
        const user = results[0];
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "5h" }
        );
        return callback(null, {
          message: "OTP verified successfully. User logged in.",
          user,
          token,
        });
      }

      // If not found, create new user
      userRepo.createUserWithEmail(email, (err2) => {
        if (err2) {
          console.error("❌ DB Error (createUserWithEmail):", err2);
          return callback(
            new AppError(
              "QUERY_FAILED",
              errorCodes.QUERY_FAILED.message,
              errorCodes.QUERY_FAILED.httpStatus
            )
          );
        }

        // Fetch the new user
        userRepo.findUserByEmail(email, (err3, newUser) => {
          if (err3) {
            console.error("❌ DB Error (findUserByEmail after create):", err3);
            return callback(
              new AppError(
                "QUERY_FAILED",
                errorCodes.QUERY_FAILED.message,
                errorCodes.QUERY_FAILED.httpStatus
              )
            );
          }

          const user = newUser[0];
          const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "5h" }
          );

          return callback(null, {
            message: "OTP verified successfully. User logged in.",
            user,
            token,
          });
        });
      });
    });
  } catch (err) {
    console.error("❌ Error verifying OTP:", err);
    return callback(
      new AppError(
        "LOGIN_FAILED",
        errorCodes.LOGIN_FAILED.message,
        errorCodes.LOGIN_FAILED.httpStatus
      )
    );
  }
};
