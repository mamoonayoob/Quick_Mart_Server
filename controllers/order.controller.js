const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Cart = require("../models/cart.model");
const User = require("../models/user.model");
const Delivery = require("../models/delivery.model");
const stripe = require("../config/stripe");
const { sendNotification } = require("../services/firebase.service");
const emailService = require("../services/email.service");

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Customer only)
exports.createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      deliveryLocation,
      paymentMethod,
      deliveryType,
      notes,
    } = req.body;

    // Validate delivery location
    if (
      !deliveryLocation ||
      typeof deliveryLocation.latitude !== "number" ||
      typeof deliveryLocation.longitude !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Delivery location with valid latitude and longitude coordinates is required",
      });
    }

    // Validate payment method
    if (!["cod", "card", "wallet"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method. Must be one of: cod, card, wallet",
      });
    }

    // Validate shipping address
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    // Ensure all required shipping address fields are present
    const completeShippingAddress = {
      street: shippingAddress.street || "",
      city: shippingAddress.city || "",
      state: shippingAddress.state || "",
      zipCode: shippingAddress.zipCode || "00000", // Default zipCode if not provided
      country: shippingAddress.country || "Unknown",
    };

    // Check if any required fields are missing or empty
    const requiredFields = ["street", "city", "state"];
    const missingFields = requiredFields.filter(
      (field) => !completeShippingAddress[field]
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required shipping address fields: ${missingFields.join(
          ", "
        )}`,
      });
    }

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No order items",
      });
    }

    // Verify all products and calculate prices
    let itemsPrice = 0;
    let vendorId = null;

    const orderItemsWithDetails = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}`,
        });
      }

      // Set vendor ID (assuming all products are from the same vendor)
      if (!vendorId) {
        vendorId = product.vendorId;
      } else if (vendorId.toString() !== product.vendorId.toString()) {
        return res.status(400).json({
          success: false,
          message: "All products must be from the same vendor",
        });
      }

      // Calculate price
      const itemPrice = product.price * item.quantity;
      itemsPrice += itemPrice;

      // Add to order items
      orderItemsWithDetails.push({
        product: item.product,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        image: product.image,
        supportImages: product.supportImages,
      });

      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Calculate prices
    const taxPrice = itemsPrice * 0.15; // 15% tax
    const shippingPrice = deliveryType === "express" ? 15 : 10;
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    // Calculate expected delivery date
    const deliveryDays = deliveryType === "express" ? 1 : 3;
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + deliveryDays);

    // Create order
    const order = await Order.create({
      user: req.user.id,
      orderItems: orderItemsWithDetails,
      shippingAddress: completeShippingAddress, // Use the complete shipping address with default values
      deliveryLocation,
      paymentMethod,
      deliveryType,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      vendorId,
      expectedDeliveryDate,
      notes,
      // Track order creation
      orderStatus: "placed",
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
    });

    // Handle payment if online payment method
    if (paymentMethod === "card") {
      try {
        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalPrice * 100), // Stripe requires amount in cents
          currency: "usd",
          metadata: {
            orderId: order._id.toString(),
            userId: req.user.id,
            customerEmail: req.user.email || "customer@example.com",
          },
          description: `Payment for order ${order._id}`,
          receipt_email: req.user.email,
        });

        // Update order with payment intent ID
        order.paymentResult = {
          id: paymentIntent.id,
          status: paymentIntent.status,
          update_time: Date.now(),
        };

        await order.save();

        // Return client secret for frontend to complete payment
        return res.status(201).json({
          success: true,
          data: {
            order,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
          },
          message: "Order created successfully. Please complete payment.",
        });
      } catch (stripeError) {
        console.error("Stripe payment error:", stripeError);
        // If Stripe fails, still create the order but mark payment as failed
        order.paymentStatus = "failed";
        order.paymentResult = {
          status: "failed",
          update_time: Date.now(),
          error: stripeError.message,
        };
        await order.save();
      }
    }

    // Create delivery record with location
    const delivery = await Delivery.create({
      order: order._id,
      estimatedDeliveryTime: expectedDeliveryDate,
      currentLocation: {
        latitude: 0, // Initial location (will be updated by delivery person)
        longitude: 0,
        timestamp: Date.now(),
      },
      // Store customer's delivery location for reference
      deliveryDestination: {
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude,
        timestamp: Date.now(),
      },
    });

    // Send notification to vendor
    const vendor = await User.findById(vendorId);
    if (vendor) {
      await sendNotification(
        vendor._id,
        "New Order",
        `You have received a new order #${order._id}`,
        {
          type: "order",
          orderId: order._id,
        }
      );
    }

    // Save order
    const createdOrder = await order.save();

    // Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [], totalAmount: 0 } }
    );

    // Get customer information for email
    const customer = await User.findById(req.user.id);
    
    // Send order confirmation email
    try {
      await emailService.sendOrderConfirmationEmail(
        customer.email,
        customer.name || customer.username,
        createdOrder
      );
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      data: {
        order: createdOrder,
        delivery,
        paymentMethod,
        trackingInfo: {
          orderId: order._id,
          status: order.orderStatus,
          expectedDelivery: expectedDeliveryDate,
        },
      },
      message: "Order created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get all orders for current user
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("vendorId", "name businessName");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order belongs to user or user is admin/vendor/delivery
    if (
      order.user._id.toString() !== req.user.id &&
      req.user.role !== "admin" &&
      order.vendorId._id.toString() !== req.user.id &&
      (req.user.role !== "delivery" ||
        order.deliveryPersonId?.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this order",
      });
    }

    // Get delivery info if exists
    const delivery = await Delivery.findOne({ order: order._id });

    res.status(200).json({
      success: true,
      data: { order, delivery },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Vendor/Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Please provide status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user is vendor or admin
    if (
      req.user.role !== "admin" &&
      order.vendorId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    // Update order status
    order.orderStatus = status;

    // If order is cancelled, restore product stock
    if (status === "cancelled") {
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    await order.save();

    // Send notification to customer
    await sendNotification(
      order.user,
      "Order Status Updated",
      `Your order #${order._id} status has been updated to ${status}`,
      {
        type: "order",
        orderId: order._id,
      }
    );

    // If order is dispatched, update delivery status
    if (status === "dispatched") {
      const delivery = await Delivery.findOne({ order: order._id });
      if (delivery) {
        delivery.status = "picked_up";
        delivery.pickupTime = Date.now();
        await delivery.save();
      }
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get order history
// @route   GET /api/orders/history
// @access  Private
exports.getOrderHistory = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("vendorId", "name businessName");

    const total = await Order.countDocuments({ user: req.user.id });

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment
// @access  Private (Admin/System)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId, status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update payment status
    order.paymentStatus = status;
    order.paymentResult = {
      ...order.paymentResult,
      id: paymentId,
      status,
      update_time: Date.now(),
    };

    if (status === "completed") {
      order.isPaid = true;
      order.paidAt = Date.now();
    }

    await order.save();

    // Get customer information for email
    const customer = await User.findById(order.user);
    
    // Send order status update email
    try {
      await emailService.sendOrderStatusUpdateEmail(
        customer.email,
        customer.name || customer.username,
        order,
        status
      );
    } catch (emailError) {
      console.error('Error sending order status update email:', emailError);
      // Don't fail the request if email fails
    }

    // Send notification to customer
    await sendNotification(
      order.user,
      "Payment Status Updated",
      `Your payment for order #${order._id} has been ${status}`,
      {
        type: "payment",
        orderId: order._id,
      }
    );

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update payment status after frontend payment confirmation
// @route   PUT /api/orders/:id/payment-update
// @access  Private (Customer)
exports.updatePaymentAfterConfirmation = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const orderId = req.params.id;

    // Find order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this order",
      });
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Check if payment intent is valid and matches the order
    if (!paymentIntent || paymentIntent.metadata.orderId !== orderId) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment intent for this order",
      });
    }

    // Check payment intent status
    if (paymentIntent.status === "succeeded") {
      // Update order payment status
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentStatus = "completed";
      order.paymentResult = {
        id: paymentIntent.id,
        status: "completed",
        update_time: Date.now(),
        email_address: paymentIntent.receipt_email || req.user.email,
      };

      await order.save();

      // Clear user's cart after successful payment
      await Cart.findOneAndUpdate(
        { user: req.user.id },
        { $set: { items: [], totalAmount: 0 } },
        { new: true }
      );

      // Get customer information for email
      const customer = await User.findById(order.user);
      
      // Send payment confirmation email
      try {
        await emailService.sendEmail(
          customer.email,
          `Payment Confirmation for Order #${order._id}`,
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Payment Confirmation</h2>
            <p>Hello ${customer.name || customer.username},</p>
            <p>Your payment for order #${order._id} has been completed successfully.</p>
            <p><strong>Payment Amount:</strong> $${order.totalPrice.toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Payment Date:</strong> ${new Date(order.paidAt).toLocaleDateString()}</p>
            <p>Thank you for shopping with QuickMart!</p>
          </div>
          `
        );
      } catch (emailError) {
        console.error('Error sending payment confirmation email:', emailError);
        // Don't fail the request if email fails
      }

      // Send notification to customer
      await sendNotification(
        order.user,
        "Payment Successful",
        `Your payment for order #${order._id} has been completed successfully`,
        {
          type: "payment",
          orderId: order._id,
        }
      );

      return res.status(200).json({
        success: true,
        message: "Payment confirmed successfully",
        data: order,
      });
    } else if (
      [
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
      ].includes(paymentIntent.status)
    ) {
      // Payment is still in progress
      return res.status(200).json({
        success: false,
        message: "Payment is still in progress",
        paymentStatus: paymentIntent.status,
      });
    } else if (paymentIntent.status === "canceled") {
      // Payment was canceled
      order.paymentStatus = "failed";
      order.paymentResult = {
        id: paymentIntent.id,
        status: "failed",
        update_time: Date.now(),
      };

      await order.save();

      return res.status(200).json({
        success: false,
        message: "Payment was canceled",
        data: order,
      });
    } else {
      // Other payment status
      return res.status(200).json({
        success: false,
        message: `Payment status: ${paymentIntent.status}`,
        paymentStatus: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
