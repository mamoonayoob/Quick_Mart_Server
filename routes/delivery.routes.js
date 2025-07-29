const express = require("express");
const { check } = require("express-validator");
const deliveryController = require("../controllers/delivery.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

// Apply delivery authorization middleware to all routes
router.use(protect);
router.use(authorize("delivery", "admin"));

// @route   GET /api/delivery/tasks
// @desc    Get delivery tasks
// @access  Private (Delivery personnel only)
router.get("/tasks", deliveryController.getDeliveryTasks);

// @route   PUT /api/delivery/tasks/:id/accept
// @desc    Accept delivery task
// @access  Private (Delivery personnel only)
router.put("/tasks/:id/accept", deliveryController.acceptDeliveryTask);

// @route   PUT /api/delivery/tasks/:id/status
// @desc    Update delivery status
// @access  Private (Delivery personnel only)
router.put(
  "/tasks/:id/status",
  [
    check("status", "Status is required").not().isEmpty(),
    check("currentLocation", "Current location is required").optional(),
  ],
  deliveryController.updateDeliveryStatus
);

// @route   GET /api/delivery/route/:orderId
// @desc    Get optimized route
// @access  Private (Delivery personnel only)
router.get("/route/:orderId", deliveryController.getDeliveryRoute);

// @route   GET /api/delivery/my-tasks
// @desc    Get delivery person's current tasks
// @access  Private (Delivery personnel only)
router.get("/my-tasks", deliveryController.getMyTasks);

// @route   GET /api/delivery/dashboard/stats
// @desc    Get delivery dashboard statistics
// @access  Private (Delivery personnel only)
router.get("/dashboard/stats", protect, deliveryController.getDashboardStats);
// router.get("/dashboard/earnings", protect, deliveryController.getEarnings); // DISABLED - function doesn't exist

// Get all delivered orders (for table display)
router.get("/all-delivered-orders", protect, deliveryController.getAllDeliveredOrders);

// @route   PUT /api/delivery/tasks/:id/accept
// @desc    Accept delivery task
// @access  Private (Delivery personnel only)
router.put("/tasks/:id/accept", deliveryController.acceptDeliveryTask);

// @route   PUT /api/delivery/tasks/:id/reject
// @desc    Reject delivery task
// @access  Private (Delivery personnel only)
router.put("/tasks/:id/reject", deliveryController.rejectDeliveryTask);

module.exports = router;
