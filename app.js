// app.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const swaggerDocs = require("./src/swagger");
const AppError = require("./src/ErrorHandling/appErrors");
const errorCodes = require("./src/ErrorHandling/errorCodes");
const errorHandler = require("./src/Middleware/errorHandler.js");
const requireAuth = require("./src/Middleware/requireAuth");
const authorizeRole = require("./src/Middleware/authRole");
const guestOrCustomerOnly = require("./src/Middleware/guestOrCustomerOnly");

const app = express();

// =======================
// 🌐 Middleware
// =======================
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or same-origin)
      if (!origin) return callback(null, true);
      // Allow any localhost origin
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, "FrontEnd")));
app.use("/images", express.static(path.join(__dirname, "FrontEnd", "images")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================
// 📦 Routes
// =======================
const authRoutes = require("./src/Routes/authRoutes");
const productRoutes = require("./src/Routes/productRoutes");
const cartRoutes = require("./src/Routes/cartRoutes");
const orderRoutes = require("./src/Routes/orderRoutes");
const userRoutes = require("./src/Routes/userRoutes");
const reviewRoutes = require("./src/Routes/reviewRoutes");

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);

// ✅ Health check (optional)
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Bakery API is running!" });
});

// ✅ HTML pages
app.get("/loginPage", (req, res) => {
  if (req.cookies.token) {
    return res.redirect("/home");
  }
  return res.sendFile(path.join(__dirname, "FrontEnd", "Login.html"));
});

app.get("/home", guestOrCustomerOnly, (req, res) => {
  return res.sendFile(path.join(__dirname, "FrontEnd", "homepage.html"));
});
// Serve Cart Page
app.get("/cart", (req, res) => {
  res.sendFile(path.join(__dirname, "FrontEnd", "cart.html"));
});

// Serve Orders Page
app.get("/orders", (req, res) => {
  res.sendFile(path.join(__dirname, "FrontEnd", "order.html"));
});

// ✅ Admin dashboard (server-side protected)
app.get("/admin", requireAuth, authorizeRole("admin"), (req, res) => {
  return res.sendFile(path.join(__dirname, "FrontEnd", "admin.html"));
});

// ✅ Driver dashboard (server-side protected)
app.get("/driver", requireAuth, authorizeRole("driver"), (req, res) => {
  return res.sendFile(path.join(__dirname, "FrontEnd", "driver.html"));
});

// ✅ Swagger setup
swaggerDocs(app);

// =======================
// 🚨 Error Handling
// =======================
app.use((req, res, next) => {
  if (!res.headersSent) {
    return next(
      new AppError(
        "NOT_FOUND",
        errorCodes.NOT_FOUND.message,
        errorCodes.NOT_FOUND.httpStatus
      )
    );
  }
  next();
});

app.use(errorHandler);

module.exports = app;
