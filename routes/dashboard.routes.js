const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// All routes are protected and require admin access
router.use(protect, authorize('admin'));

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/stats', dashboardController.getDashboardStats);

// @route   GET /api/dashboard/sales
// @desc    Get sales data for charts
// @access  Private (Admin)
router.get('/sales', dashboardController.getSalesData);

// @route   GET /api/dashboard/category-sales
// @desc    Get sales by category
// @access  Private (Admin)
router.get('/category-sales', dashboardController.getCategorySales);

// @route   GET /api/dashboard/recent-orders
// @desc    Get recent orders
// @access  Private (Admin)
router.get('/recent-orders', dashboardController.getRecentOrders);

// @route   GET /api/dashboard/top-products
// @desc    Get top selling products
// @access  Private (Admin)
router.get('/top-products', dashboardController.getTopProducts);

module.exports = router;
