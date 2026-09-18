const orderRepo = require("../Repositories/orderRepository");
const cartRepo = require("../Repositories/cartRepository");
const productRepo = require("../Repositories/productRepository");
const authRepo = require("../Repositories/authRepository"); // ✅ used to fetch customer email
const { generateAndSendInvoice } = require("../integrations/invoiceService");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");
const emailService = require("../integrations/emailService"); // ✅ used to send status emails

/**
 * PLACE NEW ORDER
 * - Creates order from user's cart
 * - Clears the cart
 * - Sends invoice via email (background async)
 */
exports.placeOrder = (userId, callback) => {
  cartRepo.getCartByUser(userId, (err, cart) => {
    if (err) {
      console.error("❌ DB Error (getCartByUser):", err);
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    }

    if (!cart || cart.length === 0) {
      return callback(
        new AppError(
          "CART_EMPTY",
          errorCodes.CART_EMPTY.message,
          errorCodes.CART_EMPTY.httpStatus
        )
      );
    }

    let totalAmount = 0;
    const items = [];
    let processed = 0;

    cart.forEach((item) => {
      productRepo.getProductById(item.product_id, (err2, product) => {
        if (err2 || !product) {
          console.error("❌ Product fetch error:", err2 || "Product not found");
          return callback(
            new AppError(
              "PRODUCT_NOT_FOUND",
              errorCodes.PRODUCT_NOT_FOUND.message,
              errorCodes.PRODUCT_NOT_FOUND.httpStatus
            )
          );
        }

        const price = Number(product.price);
        const quantity = Number(item.quantity);
        const subtotal = price * quantity;
        totalAmount += subtotal;

        items.push({
          product_id: item.product_id,
          quantity,
          price,
          subtotal,
          product_name: product.name,
        });

        processed++;

        // ✅ Once all products are processed
        if (processed === cart.length) {
          orderRepo.createOrder(userId, totalAmount, items, (err3, order) => {
            if (err3) {
              console.error("❌ DB Error (createOrder):", err3);
              return callback(
                new AppError(
                  "ORDER_CREATION_FAILED",
                  errorCodes.ORDER_CREATION_FAILED.message,
                  errorCodes.ORDER_CREATION_FAILED.httpStatus
                )
              );
            }

            // 🔻 Decrease stock for each ordered product (best effort)
            items.forEach((it) => {
              productRepo.decreaseStock(
                it.product_id,
                it.quantity,
                (stockErr) => {
                  if (stockErr) {
                    console.error(
                      `⚠️ Failed to decrease stock for product ${it.product_id}:`,
                      stockErr
                    );
                  }
                }
              );
            });

            // ✅ Clear cart after successful order
            cartRepo.clearCart(userId, (err4) => {
              if (err4)
                console.warn("⚠️ Could not clear cart after order:", err4);
            });

            // ✅ Respond to client immediately
            callback(null, order);

            // 🧾 Background async invoice generation and sending
            authRepo.getUserById(userId, (userErr, user) => {
              if (userErr || !user?.email) {
                return console.warn(
                  "⚠️ Could not fetch user email for invoice:",
                  userErr
                );
              }

              const fullOrder = {
                ...order,
                items,
                created_at: new Date(),
              };

              generateAndSendInvoice(fullOrder, user.email)
                .then(() => {
                  console.log(
                    `✅ Invoice generated and emailed to ${user.email} for order #${order.id}`
                  );
                })
                .catch((invoiceErr) => {
                  console.error(
                    `⚠️ Failed to send invoice for order #${order.id}:`,
                    invoiceErr
                  );
                });
            });
          });
        }
      });
    });
  });
};

/**
 * GET ALL ORDERS (Admin)
 */
exports.getAllOrders = (query, callback) => {
  orderRepo.getAllOrders(query, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    callback(null, result);
  });
};

/**
 * GET USER’S OWN ORDERS
 */
exports.getUserOrders = (userId, query, callback) => {
  orderRepo.getOrdersByUser(userId, query, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );
    callback(null, result);
  });
};

/**
 * GET A SPECIFIC ORDER (Admin or Owner)
 */
exports.getOrderById = (orderId, user, callback) => {
  const reviewRepo = require("../Repositories/reviewRepository");

  orderRepo.getOrderById(orderId, (err, order) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );

    if (!order)
      return callback(
        new AppError(
          "ORDER_NOT_FOUND",
          errorCodes.ORDER_NOT_FOUND.message,
          errorCodes.ORDER_NOT_FOUND.httpStatus
        )
      );

    // ✅ Only allow customer to view their own order
    if (user.role === "customer" && order.user_id !== user.id) {
      return callback(
        new AppError(
          "FORBIDDEN",
          errorCodes.FORBIDDEN.message,
          errorCodes.FORBIDDEN.httpStatus
        )
      );
    }

    // If the requester is the order owner, fetch any reviews they already left
    if (user && user.role === "customer" && order.user_id === user.id) {
      reviewRepo.getReviewsByOrderAndUser(orderId, user.id, (rErr, reviews) => {
        if (rErr) return callback(rErr);

        const reviewedMap = {};
        (reviews || []).forEach((r) => {
          reviewedMap[Number(r.product_id)] = true;
        });

        // attach `reviewed` flag to each order item
        order.items = (order.items || []).map((it) => ({
          ...it,
          reviewed: !!reviewedMap[Number(it.product_id)],
        }));

        callback(null, order);
      });
    } else {
      callback(null, order);
    }
  });
};

/**
 * UPDATE ORDER STATUS (Admin)
 */
exports.updateOrderStatus = (orderId, status, callback) => {
  const validStatuses = [
    "Pending",
    "Preparing",
    "Ready",
    "Delivered",
    "Cancelled",
  ];

  if (!validStatuses.includes(status)) {
    return callback(
      new AppError(
        "INVALID_ORDER_STATUS",
        errorCodes.INVALID_ORDER_STATUS.message,
        errorCodes.INVALID_ORDER_STATUS.httpStatus
      )
    );
  }

  orderRepo.updateOrderStatus(orderId, status, (err, updated) => {
    if (err || !updated) {
      return callback(
        new AppError(
          "ORDER_UPDATE_FAILED",
          errorCodes.ORDER_UPDATE_FAILED.message,
          errorCodes.ORDER_UPDATE_FAILED.httpStatus
        )
      );
    }

    callback(null, { orderId, status });
  });
};

/* ------------------------------------------------------------------
   🚚 DRIVER LOGIC (New)
------------------------------------------------------------------ */

/**
 * ASSIGN DRIVER TO ORDER (Admin)
 */
exports.assignDriverToOrder = (orderId, driverId, callback) => {
  orderRepo.assignDriver(orderId, driverId, (err, updated) => {
    if (err || !updated) {
      return callback(
        new AppError(
          "ORDER_UPDATE_FAILED",
          "Failed to assign driver to order.",
          errorCodes.ORDER_UPDATE_FAILED.httpStatus
        )
      );
    }

    callback(null, { orderId, driverId });
  });
};

/**
 * GET ALL ORDERS ASSIGNED TO A DRIVER
 */
exports.getOrdersByDriver = (driverId, query, callback) => {
  orderRepo.getOrdersByDriver(driverId, query, (err, result) => {
    if (err)
      return callback(
        new AppError(
          "QUERY_FAILED",
          errorCodes.QUERY_FAILED.message,
          errorCodes.QUERY_FAILED.httpStatus
        )
      );

    callback(null, result);
  });
};

/**
 * UPDATE DELIVERY STATUS (Driver)
 */
exports.updateDeliveryStatus = (orderId, driverId, status, callback) => {
  // Valid statuses (no more "Ready")
  const validStatuses = ["On the way", "Delivered", "Cancelled"];

  if (!validStatuses.includes(status)) {
    return callback(
      new AppError("INVALID_DELIVERY_STATUS", "Invalid delivery status.", 400)
    );
  }

  orderRepo.updateDeliveryStatus(
    orderId,
    driverId,
    status,
    async (err, updated) => {
      if (err || !updated) {
        return callback(
          new AppError(
            "ORDER_UPDATE_FAILED",
            "Failed to update delivery status.",
            errorCodes.ORDER_UPDATE_FAILED.httpStatus
          )
        );
      }

      // 📧 Send email ONLY when status becomes "On the way"
      if (status === "On the way") {
        orderRepo.getCustomerEmailByOrder(orderId, async (emailErr, email) => {
          if (!emailErr && email) {
            try {
              await emailService.sendDeliveryStatusEmail(
                email,
                orderId,
                status
              );
              console.log(
                `📧 Email sent: Order #${orderId} is ON THE WAY → ${email}`
              );
            } catch (e) {
              console.error("❌ Failed to send 'On the Way' email:", e);
            }
          }
        });
      }

      callback(null, { orderId, driverId, status });
    }
  );
};
