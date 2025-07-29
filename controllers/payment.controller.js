const stripe = require('../config/stripe');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Cart = require('../models/cart.model');

// @desc    Create payment intent for Stripe
// @route   POST /api/payments/create-payment-intent
// @access  Private
exports.createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order ID',
      });
    }

    // Find order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order',
      });
    }

    // Check if order is already paid
    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid',
      });
    }

    // Check if order already has a payment intent
    if (order.paymentResult && order.paymentResult.id) {
      // Retrieve existing payment intent to check its status
      try {
        const existingPaymentIntent = await stripe.paymentIntents.retrieve(order.paymentResult.id);
        
        // If payment intent exists and is already succeeded, return success with client secret
        if (existingPaymentIntent.status === 'succeeded') {
          return res.status(200).json({
            success: true,
            clientSecret: existingPaymentIntent.client_secret,
            alreadyPaid: true,
            message: 'Payment has already been processed successfully'
          });
        }
        
        // If payment intent exists but is not succeeded (e.g., requires_payment_method, requires_confirmation)
        // Return the existing client secret to continue the payment flow
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPaymentIntent.status)) {
          return res.status(200).json({
            success: true,
            clientSecret: existingPaymentIntent.client_secret,
            paymentIntentStatus: existingPaymentIntent.status
          });
        }
      } catch (error) {
        // If payment intent doesn't exist in Stripe anymore, continue to create a new one
        console.log('Previous payment intent not found in Stripe, creating new one');
      }
    }

    // Create new payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100), // Stripe requires amount in cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id,
      },
      // Add idempotency key based on order ID to prevent duplicate payment intents
      idempotencyKey: `order_${order._id}_${Date.now()}`
    });

    // Update order with payment intent ID
    order.paymentResult = {
      id: paymentIntent.id,
      status: paymentIntent.status,
      update_time: Date.now(),
    };

    await order.save();

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Handle Stripe webhook events
// @route   POST /api/payments/webhook
// @access  Public
exports.handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;

    // Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;

        // Update order payment status
        const order = await Order.findById(orderId);
        if (order) {
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
          
          // Clear user's cart after successful payment
          if (order.user) {
            await Cart.findOneAndUpdate(
              { user: order.user },
              { $set: { items: [], totalAmount: 0 } },
              { new: true }
            );
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;

        // Update order payment status
        const order = await Order.findById(orderId);
        if (order) {
          order.paymentStatus = 'failed';
          order.paymentResult = {
            id: paymentIntent.id,
            status: 'failed',
            update_time: Date.now(),
            email_address: paymentIntent.receipt_email,
          };

          await order.save();
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get payment methods for user
// @route   GET /api/payments/methods
// @access  Private
exports.getPaymentMethods = async (req, res) => {
  try {
    // In a real app, you would store and retrieve payment methods from your database
    // or from Stripe's API. For simplicity, we're returning dummy data.
    res.status(200).json({
      success: true,
      data: [
        {
          id: 'cod',
          name: 'Cash on Delivery',
          description: 'Pay when you receive your order',
        },
        {
          id: 'card',
          name: 'Credit/Debit Card',
          description: 'Pay securely with your card',
        },
        {
          id: 'wallet',
          name: 'Digital Wallet',
          description: 'Pay with your digital wallet',
        },
      ],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};
