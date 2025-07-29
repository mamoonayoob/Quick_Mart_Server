const express = require("express");
const { check } = require("express-validator");
const paymentController = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// @route   POST /api/payment/create-payment-intent
// @desc    Create payment intent
// @access  Private
router.post(
  "/create-payment-intent",
  [
    protect,
    check("amount", "Amount is required").isNumeric(),
    check("currency", "Currency is required").isString(),
    check("orderId", "Order ID is required").not().isEmpty(),
  ],
  paymentController.createPaymentIntent
);

// @route   POST /api/payment/webhook
// @desc    Handle Stripe webhook events
// @access  Public
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook
);

// @route   GET /api/payment/config
// @desc    Get Stripe publishable key
// @access  Public
// router.get('/config', paymentController.getPaymentConfig);

// @route   POST /api/payment/refund
// @desc    Process refund
// @access  Private
// router.post(
//   "/refund",
//   [
//     protect,
//     check("paymentIntentId", "Payment intent ID is required").not().isEmpty(),
//     check("amount", "Amount is required").optional().isNumeric(),
//   ],
//   paymentController.processRefund
// );

// @route   GET /api/payment/methods
// @desc    Get user's saved payment methods
// @access  Private
router.get("/methods", protect, paymentController.getPaymentMethods);

module.exports = router;
