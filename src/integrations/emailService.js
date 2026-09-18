// src/integrations/emailService.js
require("dotenv").config();
const nodemailer = require("nodemailer");
const dns = require("dns");

// ✅ Use stable DNS resolvers
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_DISABLED = process.env.EMAIL_DISABLED === "true";

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.warn(
    "⚠️ Missing Gmail credentials in .env (GMAIL_USER or GMAIL_APP_PASSWORD). Email will be disabled."
  );
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  family: 4,
});

// 🔐 OTP email
exports.sendOtpEmail = (recipientEmail, otp) => {
  console.log(`📨 [emailService] sendOtpEmail called for ${recipientEmail} with OTP: ${otp}`);
  console.log(`📨 [emailService] EMAIL_DISABLED: ${EMAIL_DISABLED}, GMAIL_USER: ${GMAIL_USER ? 'set' : 'missing'}, GMAIL_APP_PASSWORD: ${GMAIL_APP_PASSWORD ? 'set' : 'missing'}`);

  // ✅ Development mode: skip email sending if disabled or credentials missing
  if (EMAIL_DISABLED || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log(`📧 [DEV MODE] OTP for ${recipientEmail}: ${otp}`);
    return Promise.resolve({ messageId: "dev-mode-skip" });
  }

  console.log(`📤 [emailService] Attempting to send real email...`);
  const mailOptions = {
    from: `"Bakery App" <${GMAIL_USER}>`,
    to: recipientEmail,
    subject: "Your Bakery One-Time Password (OTP)",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Bakery Login Code</h2>
        <p>Use the following code to log in:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Error sending OTP email:", err.message || err);
        console.error("Full error:", err);
        return reject(err);
      }
      console.log(`✅ OTP email sent successfully to ${recipientEmail}`);
      console.log(`✅ [emailService] Email info:`, info);
      resolve(info);
    });
  });
};

// 🧾 Invoice email
exports.sendInvoiceEmail = (recipientEmail, invoicePath, orderId) => {
  const mailOptions = {
    from: `"Bakery App" <${GMAIL_USER}>`,
    to: recipientEmail,
    subject: `Your Bakery Invoice #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
        <h2 style="color: #d2691e;">Thank you for your order!</h2>
        <p>Attached is your invoice for Order <strong>#${orderId}</strong>.</p>
        <p>If you have any questions about your order, feel free to reply to this email.</p>
        <p style="margin-top: 10px;">Best regards,<br><strong>The Bakery Team</strong></p>
      </div>
    `,
    attachments: [
      {
        filename: `invoice_${orderId}.pdf`,
        path: invoicePath,
      },
    ],
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Error sending invoice email:", err.message || err);
        return reject(err);
      }
      console.log(
        `✅ Invoice #${orderId} sent successfully to ${recipientEmail}`
      );
      resolve(info);
    });
  });
};

// ⭐ NEW: Driver promotion email
exports.sendDriverPromotionEmail = (recipientEmail) => {
  const mailOptions = {
    from: `"Bakery App" <${GMAIL_USER}>`,
    to: recipientEmail,
    subject: "You have been promoted to Driver",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color:#d2691e;">🎉 Congratulations!</h2>
        <p>Your account has been <strong>promoted to Driver</strong> in the Bakery system.</p>
        <p>You can now log in and access your <strong>Driver Dashboard</strong> to view and deliver assigned orders.</p>
        <p style="margin-top:10px;">Best regards,<br><strong>The Bakery Admin Team</strong></p>
      </div>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(
          "❌ Error sending driver promotion email:",
          err.message || err
        );
        return reject(err);
      }
      console.log(`✅ Driver promotion email sent to ${recipientEmail}`);
      resolve(info);
    });
  });
};

// ⭐ NEW: Order Delivery Status Email
exports.sendDeliveryStatusEmail = (recipientEmail, orderId, status) => {
  const mailOptions = {
    from: `"Bakery App" <${GMAIL_USER}>`,
    to: recipientEmail,
    subject: `Your Order #${orderId} is now ${status}!`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color:#d2691e;">🚚 Your Order is On The Way!</h2>
        <p>Your order <strong>#${orderId}</strong> is now <strong>${status}</strong>.</p>
        <p>Our driver is heading to your location. Get ready to enjoy your fresh bakery items! 🥐</p>
        <p style="margin-top: 10px;">Thank you for choosing us,<br><strong>The Bakery Team</strong></p>
      </div>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(
          `❌ Failed to send delivery status email:`,
          err.message || err
        );
        return reject(err);
      }
      console.log(
        `📧 Delivery status email sent to ${recipientEmail} for order #${orderId}`
      );
      resolve(info);
    });
  });
};
