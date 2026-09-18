const productService = require("../Services/productServices");
const AppError = require("../ErrorHandling/appErrors");
const errorCodes = require("../ErrorHandling/errorCodes");
exports.getAll = (req, res, next) => {
  productService.listAllProducts(req.query, (err, result) => {
    if (err) return next(err);
    res.json(result);
  });
};

exports.getOne = (req, res, next) => {
  // Prefer using productService.getProductDetails if available
  if (productService && typeof productService.getProductDetails === "function") {
    return productService.getProductDetails(req.params.id, (err, result) => {
      if (err) return next(err);

      if (!result) {
        return next(
          new AppError(
            "PRODUCT_NOT_FOUND",
            errorCodes.PRODUCT_NOT_FOUND.message,
            errorCodes.PRODUCT_NOT_FOUND.httpStatus
          )
        );
      }

      return res.json({ success: true, product: result });
    });
  }

  // Fallback: directly query repository + reviews in case service isn't available
  try {
    const productRepo = require("../Repositories/productRepository");
    const reviewRepo = require("../Repositories/reviewRepository");

    productRepo.getProductById(req.params.id, (pErr, product) => {
      if (pErr) return next(pErr);
      if (!product)
        return next(
          new AppError(
            "PRODUCT_NOT_FOUND",
            errorCodes.PRODUCT_NOT_FOUND.message,
            errorCodes.PRODUCT_NOT_FOUND.httpStatus
          )
        );

      reviewRepo.getReviewsByProduct(req.params.id, (rErr, reviews) => {
        if (rErr) return next(rErr);

        let avg = 0;
        if (reviews && reviews.length)
          avg = reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length;

        const result = {
          ...product,
          reviews: reviews || [],
          avg_rating: Number((avg || 0).toFixed(2)),
          review_count: reviews.length || 0,
        };

        return res.json({ success: true, product: result });
      });
    });
  } catch (fallbackErr) {
    return next(fallbackErr);
  }
};

exports.create = (req, res, next) => {
  // If file uploaded, add image path to body
  if (req.file) {
    req.body.image_url = `/uploads/products/${req.file.filename}`;
  }

  productService.addProduct(req.body, (err, result) => {
    if (err) return next(err);
    res.status(201).json({ success: true, message: "Product created", result });
  });
};

exports.update = (req, res, next) => {
  // If file uploaded, add image path to body
  if (req.file) {
    req.body.image_url = `/uploads/products/${req.file.filename}`;
  }

  productService.editProduct(req.params.id, req.body, (err, result) => {
    if (err) return next(err);
    res.json({ success: true, message: "Product updated", result });
  });
};

exports.remove = (req, res, next) => {
  productService.removeProduct(req.params.id, (err, result) => {
    if (err) return next(err);
    res.json({ success: true, message: "Product deleted", result });
  });
};
