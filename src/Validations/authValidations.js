const Joi = require("joi");

// Reusable validator middleware
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.details[0].message.replace(/"/g, ""),
      },
    });
  }
  next();
};

// OTP request (email only)
const requestOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

const loginOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    "string.length": "OTP must be 6 digits",
    "string.pattern.base": "OTP must only contain digits",
  }),
});

module.exports = {
  validateRequestOtp: validate(requestOtpSchema),
  validateLoginOtp: validate(loginOtpSchema),
};
