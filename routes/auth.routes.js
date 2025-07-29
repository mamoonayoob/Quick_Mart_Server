const express = require("express");
const { check } = require("express-validator");
const authController = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadProfileImage } = require("../middleware/upload.middleware");

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({
      min: 6,
    }),
    check("phone", "Phone number is required").not().isEmpty(),
  ],
  authController.register
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  authController.login
);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get("/profile", protect, authController.getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  protect,
  uploadProfileImage,
  authController.updateProfile
);

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put(
  "/password",
  [
    protect,
    check("currentPassword", "Current password is required").not().isEmpty(),
    check(
      "newPassword",
      "Please enter a password with 6 or more characters"
    ).isLength({
      min: 6,
    }),
  ],
  authController.changePassword
);

module.exports = router;
