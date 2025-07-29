const express = require("express");
const router = express.Router();
const {
  getProductForecast,
  getVendorForecast,
  getTopPredictedProducts,
} = require("../controllers/forecasting.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

// @desc    Get demand forecast for a specific product
// @route   GET /api/forecast/product/:productId
// @access  Private (Vendor/Admin)
// @params  productId - Product ID to forecast
// @query   days - Number of days to forecast (default: 30, max: 365)
// @query   lookback - Number of days to look back for historical data (default: 90)
// @query   vendorId - Optional vendor filter (admin only)
router.get(
  "/product/:productId",
  protect,
  authorize("vendor", "admin"),
  getProductForecast
);

// @desc    Get demand forecast for all products of a vendor
// @route   GET /api/forecast/vendor
// @access  Private (Vendor/Admin)
// @note    Vendor ID extracted from JWT token
// @query   days - Number of days to forecast (default: 30, max: 365)
// @query   lookback - Number of days to look back for historical data (default: 90)
// @query   limit - Maximum number of products to forecast (default: 10)
// @query   category - Optional category filter
router.get("/vendor", protect, authorize("vendor", "admin"), getVendorForecast);

// @desc    Get top products by predicted demand (Admin only)
// @route   GET /api/forecast/top-products
// @access  Private (Admin only)
// @query   days - Number of days to forecast (default: 30, max: 365)
// @query   lookback - Number of days to look back for historical data (default: 90)
// @query   limit - Maximum number of products to return (default: 20)
// @query   category - Optional category filter
// @query   vendorId - Optional vendor filter
router.get(
  "/top-products",
  protect,
  authorize("admin"),
  getTopPredictedProducts
);

module.exports = router;
