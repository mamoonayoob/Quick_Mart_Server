const express = require("express");
const { check } = require("express-validator");
const vendorController = require("../controllers/vendor.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

// ===== AUTH ROUTES =====
// @route   POST /api/vendor/auth/login
// @desc    Login as a vendor
// @access  Public
router.post(
  "/auth/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  vendorController.login
);

// Apply vendor authorization middleware to all protected routes
router.use(protect);
router.use(authorize("vendor"));

// @route   PUT /api/vendor/auth/change-password
// @desc    Change vendor password
// @access  Private (Vendor only)
router.put(
  "/auth/change-password",
  [
    check("currentPassword", "Current password is required").exists(),
    check("newPassword", "New password must be at least 6 characters").isLength(
      { min: 6 }
    ),
    check("confirmPassword", "Confirm password is required").exists(),
  ],
  vendorController.changePassword
);

// ===== DASHBOARD ROUTES =====
// @route   GET /api/vendor/dashboard/stats
// @desc    Get vendor dashboard statistics
// @access  Private (Vendor only)
router.get("/dashboard/stats", vendorController.getDashboardStats);

// @route   GET /api/vendor/dashboard/recent-orders
// @desc    Get vendor's recent orders
// @access  Private (Vendor only)
router.get("/dashboard/recent-orders", vendorController.getRecentOrders);

// @route   GET /api/vendor/dashboard/top-products
// @desc    Get vendor's top selling products
// @access  Private (Vendor only)
router.get("/dashboard/top-products", vendorController.getTopProducts);

// ===== PRODUCT MANAGEMENT ROUTES =====
// @route   GET /api/vendor/products
// @desc    Get all products for this vendor
// @access  Private (Vendor only)
router.get("/products", vendorController.getVendorProducts);

// @route   GET /api/vendor/products/:id
// @desc    Get details of a specific product
// @access  Private (Vendor only)
router.get("/products/:id", vendorController.getProductDetails);

// @route   POST /api/vendor/products
// @desc    Add a new product
// @access  Private (Vendor only)
router.post(
  "/products",
  [
    check("name", "Name is required").not().isEmpty(),
    check("price", "Price must be a number").isNumeric(),
    check("stock", "Stock must be a number").isNumeric(),
    check("category", "Category is required").not().isEmpty(),
    check("description", "Description is required").not().isEmpty(),
    check("mainImage", "Image URL is required").not().isEmpty(),
    check("status", "Status is required").not().isEmpty(),
  ],
  vendorController.addProduct
);

// @route   PUT /api/vendor/products/:id
// @desc    Update an existing product
// @access  Private (Vendor only)
router.put("/products/:id", vendorController.updateProduct);

// @route   DELETE /api/vendor/products/:id
// @desc    Delete a product
// @access  Private (Vendor only)
router.delete("/products/:id", vendorController.deleteProduct);

// @route   PATCH /api/vendor/products/:id/status
// @desc    Enable or disable a product
// @access  Private (Vendor only)
router.patch(
  "/products/:id/status",
  [check("status", "Status is required").not().isEmpty()],
  vendorController.updateProductStatus
);

// @route   POST /api/vendor/products/upload-image
// @desc    Upload a product image
// @access  Private (Vendor only)
router.post("/products/upload-image", vendorController.uploadProductImage);

// @route   PUT /api/vendor/products/:id/inventory
// @desc    Update product inventory
// @access  Private (Vendor only)
router.put(
  "/products/:id/inventory",
  [
    check("stock", "Stock must be a number").optional().isNumeric(),
    check("isAvailable", "Availability must be a boolean")
      .optional()
      .isBoolean(),
  ],
  vendorController.updateProductInventory
);

// @route   GET /api/vendor/inventory/low-stock
// @desc    Get low stock alerts
// @access  Private (Vendor only)
router.get("/inventory/low-stock", vendorController.getLowStockAlerts);

// ===== ORDER MANAGEMENT ROUTES =====
// @route   GET /api/vendor/orders
// @desc    Get all orders for this vendor
// @access  Private (Vendor only)
router.get("/orders", vendorController.getVendorOrders);

// @route   GET /api/vendor/orders/pending-delivery
// @desc    Get all orders with pending delivery status
// @access  Private (Vendor only)
router.get(
  "/orders/pending-delivery",
  vendorController.getPendingDeliveryOrders
);

// @route   GET /api/vendor/orders/:id
// @desc    Get details of a specific order
// @access  Private (Vendor only)
router.get("/orders/:id", vendorController.getOrderDetails);

// @route   PATCH /api/vendor/orders/:id/status
// @desc    Update the status of an order
// @access  Private (Vendor only)
router.patch(
  "/orders/:id/status",
  [check("status", "Status is required").not().isEmpty()],
  vendorController.updateOrderStatus
);

// @route   POST /api/vendor/orders/:id/assign-delivery
// @desc    Assign a delivery person to an order
// @access  Private (Vendor only)
router.post(
  "/orders/:id/assign-delivery",
  [check("deliveryPersonId", "Delivery person ID is required").not().isEmpty()],
  vendorController.assignDeliveryPerson
);

// @route   GET /api/vendor/analytics
// @desc    Get vendor analytics
// @access  Private (Vendor only)
router.get("/analytics", vendorController.getVendorAnalytics);

// @route   GET /api/vendor/delivery-users
// @desc    Get all delivery users
// @access  Private (Vendor only)
router.get("/delivery-users", vendorController.getAllDeliveryUsers);

// ===== TRANSACTION ROUTES =====
// @route   GET /api/vendor/transactions
// @desc    Get all transactions for this vendor
// @access  Private (Vendor only)
router.get("/transactions", vendorController.getVendorTransactions);

// @route   GET /api/vendor/transactions/:id
// @desc    Get details of a specific transaction
// @access  Private (Vendor only)
router.get("/transactions/:id", vendorController.getTransactionDetails);

// @route   POST /api/vendor/transactions
// @desc    Create a new transaction
// @access  Private (Vendor only)
router.post(
  "/transactions",
  [
    check("amount", "Amount is required and must be a number").isNumeric(),
    check("type", "Type is required").isIn(["credit", "debit"]),
    check("paymentMethod", "Payment method is required").isIn([
      "bank_transfer",
      "platform_credit",
      "payment_gateway",
      "other",
    ]),
    check("description", "Description is required").not().isEmpty(),
  ],
  vendorController.createTransaction
);

// ===== ANALYTICS ROUTES =====
// @route   GET /api/vendor/analytics
// @desc    Get vendor analytics data
// @access  Private (Vendor only)
router.get("/analytics", vendorController.getVendorAnalytics);

// @route   GET /api/vendor/test
// @desc    Test vendor API endpoint
// @access  Private (Vendor only)
router.get("/test", (req, res) => {
  console.log("TEST API CALLED");
  console.log("User:", req.user);
  res.json({ success: true, message: "Test successful", user: req.user });
});

module.exports = router;
