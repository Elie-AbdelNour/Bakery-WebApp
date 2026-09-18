const cartService = require("../Services/cartServices");


exports.getCart = (req, res, next) => {
  const userId = req.user.id;

  cartService.getUserCart(userId, (err, cart) => {
    if (err) return next(err);
    res.json({ success: true, cart });
  });
};


exports.addToCart = (req, res, next) => {
  const userId = req.user.id;
  const { product_id, quantity } = req.body;

  cartService.addItemToCart(userId, product_id, quantity, (err, result) => {
    if (err) return next(err);
    res.status(201).json(result);
  });
};

/**
 * Update the quantity of a specific product in the cart
 */
exports.updateCartItem = (req, res, next) => {
  const userId = req.user.id;
  const { productId } = req.params;
  const { quantity } = req.body;

  cartService.updateCartItem(userId, productId, quantity, (err, result) => {
    if (err) return next(err);
    res.json(result);
  });
};

/**
 * Remove a single product from the cart
 */
exports.removeCartItem = (req, res, next) => {
  const userId = req.user.id;
  const { productId } = req.params;

  cartService.deleteCartItem(userId, productId, (err, result) => {
    if (err) return next(err);
    res.json(result);
  });
};

/**
 * Clear the entire cart for a user
 */
exports.clearCart = (req, res, next) => {
  const userId = req.user.id;

  cartService.clearUserCart(userId, (err, result) => {
    if (err) return next(err);
    res.json(result);
  });
};
