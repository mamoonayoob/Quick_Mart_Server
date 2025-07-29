const express = require("express");
const { check } = require("express-validator");
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/users/cart
// @desc    Get user cart
// @access  Private
router.get("/cart", userController.getCart);

// @route   POST /api/users/cart
// @desc    Add item to cart
// @access  Private
router.post(
  "/cart",
  [
    check("productId", "Product ID is required").not().isEmpty(),
    check("quantity", "Quantity is required and must be a number").isNumeric(),
  ],
  userController.addToCart
);

// @route   PUT /api/users/cart/:productId
// @desc    Update cart item quantity
// @access  Private
router.put(
  "/cart/:productId",
  [check("quantity", "Quantity is required and must be a number").isNumeric()],
  userController.updateCartItem
);

// @route   DELETE /api/users/cart/:productId
// @desc    Remove item from cart
// @access  Private
router.delete("/cart/:productId", userController.removeCartItem);

// @route   DELETE /api/users/cart
// @desc    Clear cart
// @access  Private
router.delete("/cart", userController.clearCart);

// @route   GET /api/users/notifications
// @desc    Get user notifications
// @access  Private
router.get("/notifications", userController.getNotifications);

// @route   PUT /api/users/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put("/notifications/:id/read", userController.markNotificationAsRead);

// @route   DELETE /api/user/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete("/notifications/:id", userController.deleteNotification);

// @route   GET /api/users/wishlist
// @desc    Get user wishlist
// @access  Private
router.get("/wishlist", userController.getWishlist);

// @route   POST /api/users/wishlist
// @desc    Add item to wishlist
// @access  Private
router.post(
  "/wishlist",
  [check("productId", "Product ID is required").not().isEmpty()],
  userController.addToWishlist
);

// @route   DELETE /api/user/wishlist/:productId
// @desc    Remove item from wishlist
// @access  Private
router.delete("/wishlist/:productId", userController.removeFromWishlist);

module.exports = router;
