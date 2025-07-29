const express = require("express");
const { check } = require("express-validator");
const adminController = require("../controllers/admin.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

// Apply admin authorization middleware to all routes
router.use(protect);
router.use(authorize("admin"));

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin only)
router.get("/users", adminController.getUsers);

// @route   GET /api/admin/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get("/users/:id", adminController.getUserById);

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put("/users/:id", adminController.updateUser);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete("/users/:id", adminController.deleteUser);

// @route   GET /api/admin/orders
// @desc    Get all orders
// @access  Private (Admin only)
router.get("/orders", adminController.getOrders);

// @route   GET /api/admin/analytics/sales
// @desc    Get sales analytics
// @access  Private (Admin only)
router.get("/analytics/sales", adminController.getSalesAnalytics);

// @route   GET /api/admin/analytics/categories
// @desc    Get category analytics
// @access  Private (Admin only)
router.get("/analytics/categories", adminController.getCategoryAnalytics);

// @route   GET /api/admin/analytics/customers
// @desc    Get customer analytics
// @access  Private (Admin only)
router.get("/analytics/customers", adminController.getCustomerAnalytics);

// @route   GET /api/admin/analytics/users
// @desc    Get user analytics
// @access  Private (Admin only)
// router.get("/analytics/users", adminController.getUserAnalytics);

// @route   GET /api/admin/analytics/products
// @desc    Get product analytics
// @access  Private (Admin only)
//router.get("/analytics/products", adminController.getProductAnalytics);

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post(
  "/users",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({
      min: 6,
    }),
    check("role", "Role is required").isIn([
      "customer",
      "vendor",
      "delivery",
      "admin",
    ]),
  ],
  adminController.createUser
);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin only)
// router.get("/dashboard", adminController.getDashboardData);

// @route   GET /api/admin/products
// @desc    Get all products from all vendors
// @access  Private (Admin only)
router.get("/products", adminController.getAllProducts);

// @route   GET /api/admin/products/:id
// @desc    Get product by ID
// @access  Private (Admin only)
router.get("/products/:id", adminController.getProductById);

// @route   PUT /api/admin/products/:id
// @desc    Update product (including disable/enable)
// @access  Private (Admin only)
router.put("/products/:id", adminController.updateProduct);

// @route   DELETE /api/admin/products/:id
// @desc    Delete product
// @access  Private (Admin only)
router.delete("/products/:id", adminController.deleteProduct);

module.exports = router;
