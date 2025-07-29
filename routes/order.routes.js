const express = require('express');
const { check } = require('express-validator');
const orderController = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private (Customer only)
router.post(
  '/',
  [
    protect,
    authorize('customer'),
    check('orderItems', 'Order items are required').isArray({ min: 1 }),
    check('shippingAddress', 'Shipping address is required').notEmpty(),
    check('paymentMethod', 'Payment method is required').notEmpty().isIn(['cod', 'card', 'wallet']).withMessage('Payment method must be cod, card, or wallet'),
    check('deliveryLocation', 'Delivery location is required').notEmpty(),
    check('deliveryLocation.latitude', 'Valid latitude is required').isNumeric(),
    check('deliveryLocation.longitude', 'Valid longitude is required').isNumeric(),
  ],
  orderController.createOrder
);

// @route   GET /api/orders
// @desc    Get all orders for current user
// @access  Private
router.get('/', protect, orderController.getMyOrders);

// @route   GET /api/orders/history
// @desc    Get order history
// @access  Private
router.get('/history', protect, orderController.getOrderHistory);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', protect, orderController.getOrderById);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Vendor/Admin)
router.put(
  '/:id/status',
  [
    protect,
    authorize('vendor', 'admin'),
    check('status', 'Status is required').not().isEmpty(),
  ],
  orderController.updateOrderStatus
);

// @route   GET /api/orders/history
// @desc    Get order history
// @access  Private
router.get('/history', protect, orderController.getOrderHistory);

// @route   PUT /api/orders/:id/payment
// @desc    Update payment status
// @access  Private (Admin/System)
router.put(
  '/:id/payment',
  [
    protect,
    authorize('admin'),
    check('paymentId', 'Payment ID is required').not().isEmpty(),
    check('status', 'Status is required').not().isEmpty(),
  ],
  orderController.updatePaymentStatus
);

// @route   PUT /api/orders/:id/payment-update
// @desc    Update payment status after frontend payment confirmation
// @access  Private (Customer)
router.put(
  '/:id/payment-update',
  [
    protect,
    check('paymentIntentId', 'Payment Intent ID is required').not().isEmpty(),
  ],
  orderController.updatePaymentAfterConfirmation
);

module.exports = router;
