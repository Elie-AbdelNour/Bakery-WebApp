const reviewService = require("../Services/reviewServices");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");

exports.createReview = (req, res, next) => {
  const userId = req.user.id;
  const { order_id, product_id, rating, comment } = req.body;

  reviewService.addReview(userId, { order_id, product_id, rating, comment }, (err, result) => {
    if (err) return next(err);
    return res.status(201).json({ success: true, message: "Review submitted", result });
  });
};

exports.getProductReviews = (req, res, next) => {
  const productId = req.params.productId;
  reviewService.getProductReviews(productId, (err, rows) => {
    if (err) return next(err);
    return res.status(200).json({ success: true, reviews: rows });
  });
};
