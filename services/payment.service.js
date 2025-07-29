const stripe = require('../config/stripe');
const Order = require('../models/order.model');

/**
 * Create a payment intent for an order
 * @param {string} orderId - Order ID to create payment intent for
 * @param {string} userId - User ID making the payment
 * @returns {Promise<Object>} - Stripe payment intent
 */
exports.createPaymentIntent = async (orderId, userId) => {
  try {
    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Check if order belongs to user
    if (order.user.toString() !== userId) {
      throw new Error('Not authorized to access this order');
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100), // Stripe requires amount in cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        userId,
      },
    });

    // Update order with payment intent ID
    order.paymentResult = {
      id: paymentIntent.id,
      status: paymentIntent.status,
      update_time: Date.now(),
    };

    await order.save();

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Confirm a payment intent
 * @param {string} paymentIntentId - Payment intent ID to confirm
 * @param {string} paymentMethodId - Payment method ID to use
 * @returns {Promise<Object>} - Confirmed payment intent
 */
exports.confirmPaymentIntent = async (paymentIntentId, paymentMethodId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw error;
  }
};

/**
 * Process a successful payment
 * @param {string} paymentIntentId - Payment intent ID that was successful
 * @returns {Promise<Object>} - Updated order
 */
exports.processSuccessfulPayment = async (paymentIntentId) => {
  try {
    // Get payment intent details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const orderId = paymentIntent.metadata.orderId;

    // Update order payment status
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentStatus = 'completed';
    order.paymentResult = {
      id: paymentIntent.id,
      status: 'completed',
      update_time: Date.now(),
      email_address: paymentIntent.receipt_email,
    };

    await order.save();

    return order;
  } catch (error) {
    console.error('Error processing successful payment:', error);
    throw error;
  }
};

/**
 * Process a failed payment
 * @param {string} paymentIntentId - Payment intent ID that failed
 * @returns {Promise<Object>} - Updated order
 */
exports.processFailedPayment = async (paymentIntentId) => {
  try {
    // Get payment intent details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const orderId = paymentIntent.metadata.orderId;

    // Update order payment status
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    order.paymentStatus = 'failed';
    order.paymentResult = {
      id: paymentIntent.id,
      status: 'failed',
      update_time: Date.now(),
      email_address: paymentIntent.receipt_email,
    };

    await order.save();

    return order;
  } catch (error) {
    console.error('Error processing failed payment:', error);
    throw error;
  }
};

/**
 * Create a refund for a payment
 * @param {string} paymentIntentId - Payment intent ID to refund
 * @param {number} amount - Amount to refund (in cents)
 * @returns {Promise<Object>} - Stripe refund
 */
exports.createRefund = async (paymentIntentId, amount) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
    });

    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
};
