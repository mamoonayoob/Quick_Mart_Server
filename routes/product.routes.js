const express = require("express");
const { check } = require("express-validator");
const productController = require("../controllers/product.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { uploadProductImages } = require("../middleware/upload.middleware");

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get("/", productController.getProducts);

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get("/:id", productController.getProduct);

// @route   POST /api/products
// @desc    Create a product
// @access  Private (Vendor only)
router.post(
  "/",
  [
    protect,
    authorize("vendor", "admin"),
    uploadProductImages,
    check("name", "Name is required").not().isEmpty(),
    check("description", "Description is required").not().isEmpty(),
    check("price", "Price is required and must be a number").isNumeric(),
    check("category", "Category is required").not().isEmpty(),
    check("stock", "Stock is required and must be a number").isNumeric(),
  ],
  productController.createProduct
);

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Vendor only)
router.put(
  "/:id",
  [protect, authorize("vendor", "admin"), uploadProductImages],
  productController.updateProduct
);

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (Vendor only)
router.delete(
  "/:id",
  [protect, authorize("vendor", "admin")],
  productController.deleteProduct
);

// @route   POST /api/products/:id/reviews
// @desc    Add product review
// @access  Private (Customer only)
router.post(
  "/:id/reviews",
  [
    protect,
    authorize("customer"),
    check("rating", "Rating is required and must be between 1 and 5").isFloat({
      min: 1,
      max: 5,
    }),
    check("comment", "Comment is required").not().isEmpty(),
  ],
  productController.addProductReview
);

// @route   GET /api/products/category/:category
// @desc    Get products by category
// @access  Public
router.get("/category/:category", productController.getProductsByCategory);

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get("/search", productController.searchProducts);

module.exports = router;
