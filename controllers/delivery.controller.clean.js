const Delivery = require("../models/delivery.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const { sendNotification } = require("../services/firebase.service");
const { getOptimizedRoute } = require("../services/maps.service");

// @desc    Get delivery tasks
// @route   GET /api/delivery/tasks
// @access  Private (Delivery personnel only)
exports.getDeliveryTasks = async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;

    // Build query
    const query = {};

    // If delivery person is assigned, show only their tasks
    if (req.user.role === "delivery") {
      query.$or = [
        { deliveryPerson: req.user.id },
        { deliveryPerson: { $exists: false } }, // Also show unassigned tasks
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const deliveries = await Delivery.find(query)
      .populate({
        path: "order",
        select: "orderItems shippingAddress totalPrice orderStatus",
        populate: {
          path: "user",
          select: "name email phone",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const total = await Delivery.countDocuments(query);
    console.log("total", total);
    res.status(200).json({
      success: true,
      count: deliveries.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: deliveries,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
// @desc    Reject delivery task
// @route   PUT /api/delivery/tasks/:id/reject
// @access  Private (Delivery personnel only)
exports.rejectDeliveryTask = async (req, res) => {
  try {
    const { reason } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery task not found",
      });
    }

    // Check if delivery is assigned to current user
    if (
      delivery.deliveryPerson &&
      delivery.deliveryPerson.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reject this delivery",
      });
    }

    // Reset delivery assignment
    delivery.deliveryPerson = null;
    delivery.status = "pending";
    delivery.isAccepted = false;
    delivery.rejectedBy = req.user.id;
    delivery.rejectedAt = Date.now();
    delivery.rejectionReason = reason || "Rejected by delivery person";

    await delivery.save();

    // Update order status back to pending
    const order = await Order.findById(delivery.order);
    if (order) {
      order.deliveryPersonId = null;
      order.orderStatus = "confirmed"; // Back to confirmed status for reassignment
      await order.save();
    }

    // Send notification to vendor/admin about rejection
    await sendNotification(
      order.vendor || order.user,
      "Delivery Assignment Rejected",
      `Delivery person rejected assignment for order #${order._id}. Reason: ${
        reason || "No reason provided"
      }`,
      {
        type: "delivery",
        orderId: order._id,
      }
    );

    res.status(200).json({
      success: true,
      message: "Assignment rejected successfully",
      data: delivery,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
// @desc    Accept delivery task
// @route   PUT /api/delivery/tasks/:id/accept
// @access  Private (Delivery personnel only)
exports.acceptDeliveryTask = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery task not found",
      });
    }

    // Check if delivery is already assigned
    if (delivery.deliveryPerson) {
      return res.status(400).json({
        success: false,
        message: "Delivery task is already assigned",
      });
    }

    // Assign delivery to current user
    delivery.deliveryPerson = req.user.id;
    delivery.status = "assigned";
    delivery.isAccepted = true;
    delivery.acceptedAt = Date.now();

    await delivery.save();

    // Update order with delivery person ID
    const order = await Order.findById(delivery.order);
    if (order) {
      order.deliveryPersonId = req.user.id;
      await order.save();
    }

    // Get optimized route
    const route = await getOptimizedRoute(order.shippingAddress);
    delivery.route = route;
    await delivery.save();

    // Send notification to customer
    await sendNotification(
      order.user,
      "Delivery Assigned",
      `Your order #${order._id} has been assigned to a delivery person`,
      {
        type: "delivery",
        orderId: order._id,
      }
    );

    res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update delivery status
// @route   PUT /api/delivery/tasks/:id/status
// @access  Private (Delivery personnel only)
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status, currentLocation } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Please provide status",
      });
    }

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery task not found",
      });
    }

    // Check if delivery person is authorized
    if (delivery.deliveryPerson.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this delivery",
      });
    }

    // Update delivery status and location
    delivery.status = status;
    if (currentLocation) {
      delivery.currentLocation = currentLocation;
      delivery.locationHistory.push(currentLocation);
    }

    // Set timestamps based on status
    if (status === "picked_up") {
      delivery.pickupTime = Date.now();
    } else if (status === "delivered") {
      delivery.deliveryTime = Date.now();
    }

    await delivery.save();

    // Update order status
    const order = await Order.findById(delivery.order);
    if (order) {
      if (status === "picked_up") {
        order.orderStatus = "dispatched";
      } else if (status === "in_transit") {
        order.deliveryStatus = "in_transit";
      } else if (status === "delivered") {
        order.orderStatus = "delivered";
        order.deliveryStatus = "delivered";
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      }
      await order.save();

      // Send notification to customer
      await sendNotification(
        order.user,
        "Delivery Status Updated",
        `Your order #${order._id} delivery status has been updated to ${status}`,
        {
          type: "delivery",
          orderId: order._id,
        }
      );
    }

    res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get optimized route
// @route   GET /api/delivery/route/:orderId
// @access  Private (Delivery personnel only)
exports.getDeliveryRoute = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if delivery person is authorized
    if (order.deliveryPersonId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    // Get optimized route
    const route = await getOptimizedRoute(order.shippingAddress);

    res.status(200).json({
      success: true,
      data: route,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get delivery person's current tasks
// @route   GET /api/delivery/my-tasks
// @access  Private (Delivery personnel only)
exports.getMyTasks = async (req, res) => {
  try {
    // First get all deliveries assigned to this delivery person
    const deliveries = await Delivery.find({
      deliveryPerson: req.user.id,
      status: { $nin: ["delivered", "cancelled"] },
    });

    // For each delivery, fetch the complete order information
    const formattedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        const formattedDelivery = delivery.toObject();
        let orderData = null;

        // Try to get order from the order field
        if (delivery.order) {
          try {
            orderData = await Order.findById(delivery.order)
              .select(
                "orderItems shippingAddress totalPrice orderStatus user deliveryLocation"
              )
              .populate("user", "name email phone _id");
          } catch (err) {
            console.error("Error fetching order by order field:", err);
          }
        }

        // If order is still null and we have an orderId field, try that
        if (!orderData && delivery.orderId) {
          try {
            orderData = await Order.findById(delivery.orderId)
              .select(
                "orderItems shippingAddress totalPrice orderStatus user deliveryLocation"
              )
              .populate("user", "name email phone _id");
          } catch (err) {
            console.error("Error fetching order by orderId field:", err);
          }
        }

        // If we found order data, add it to the delivery object
        if (orderData) {
          formattedDelivery.order = orderData.toObject();
        }

        // Always include orderPerson object
        if (formattedDelivery.order && formattedDelivery.order.user) {
          // Order exists and has user information
          formattedDelivery.orderPerson = {
            id: formattedDelivery.order.user._id,
            name: formattedDelivery.order.user.name,
            phone: formattedDelivery.order.user.phone,
          };

          // Add delivery location coordinates if available
          if (formattedDelivery.order.deliveryLocation) {
            formattedDelivery.orderPerson.location = {
              latitude: formattedDelivery.order.deliveryLocation.latitude,
              longitude: formattedDelivery.order.deliveryLocation.longitude,
            };
          }
        } else {
          // No order or user information available, add placeholder
          formattedDelivery.orderPerson = {
            id: null,
            name: "Order information unavailable",
            phone: "N/A",
            location: {
              latitude: 0,
              longitude: 0,
            },
          };
        }

        // Populate delivery person information
        if (delivery.deliveryPerson) {
          try {
            const deliveryPersonData = await User.findById(
              delivery.deliveryPerson
            ).select("name phone _id");
            if (deliveryPersonData) {
              formattedDelivery.deliveryPerson = deliveryPersonData.toObject();
            }
          } catch (err) {
            console.error("Error fetching delivery person:", err);
          }
        }

        return formattedDelivery;
      })
    );

    res.status(200).json({
      success: true,
      count: formattedDeliveries.length,
      data: formattedDeliveries,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get delivery dashboard statistics
// @route   GET /api/delivery/dashboard/stats
// @access  Private (Delivery personnel only)
exports.getDashboardStats = async (req, res) => {
  try {
    const deliveryPersonId = req.user.id;
    console.log(
      "Fetching dashboard stats for delivery person:",
      deliveryPersonId
    );

    // Get current date boundaries for today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    console.log("Date range - Today:", today, "Tomorrow:", tomorrow);

    // Build base query for this delivery person
    const baseQuery = { deliveryPerson: deliveryPersonId };

    // 1. Total Deliveries Count
    const totalDeliveries = await Delivery.countDocuments(baseQuery);
    console.log("Total deliveries:", totalDeliveries);

    // 2. Delivered Orders Count
    const deliveredOrders = await Delivery.countDocuments({
      ...baseQuery,
      status: "delivered",
    });
    console.log("Delivered orders:", deliveredOrders);

    // 3. Pending Orders Count
    const pendingOrders = await Delivery.countDocuments({
      ...baseQuery,
      status: { $in: ["pending", "assigned"] },
    });
    console.log("Pending orders:", pendingOrders);

    // 4. In Progress Orders Count
    const inProgressOrders = await Delivery.countDocuments({
      ...baseQuery,
      status: { $in: ["picked_up", "in_transit"] },
    });
    console.log("In progress orders:", inProgressOrders);

    // 5. Today's Deliveries
    const todaysDeliveries = await Delivery.find({
      ...baseQuery,
      createdAt: { $gte: today, $lt: tomorrow },
    });
    console.log("Todays deliveries count:", todaysDeliveries.length);

    // 6. Calculate Total Revenue (from delivered orders)
    const deliveredDeliveries = await Delivery.find({
      ...baseQuery,
      status: "delivered",
    }).populate({
      path: "order",
      select: "totalPrice deliveryFee",
    });

    let totalRevenue = 0;
    let todaysRevenue = 0;

    for (const delivery of deliveredDeliveries) {
      if (delivery.order) {
        const orderTotal = delivery.order.totalPrice || 0;
        const deliveryFee = delivery.order.deliveryFee || 0;
        const revenue = deliveryFee; // Delivery person gets delivery fee

        totalRevenue += revenue;

        // Check if this delivery was completed today
        if (
          delivery.deliveryTime &&
          delivery.deliveryTime >= today &&
          delivery.deliveryTime < tomorrow
        ) {
          todaysRevenue += revenue;
        }
      }
    }

    console.log("Total revenue:", totalRevenue);
    console.log("Todays revenue:", todaysRevenue);

    // 7. Success Rate Calculation
    const successRate =
      totalDeliveries > 0
        ? ((deliveredOrders / totalDeliveries) * 100).toFixed(1)
        : 0;
    console.log("Success rate:", successRate + "%");

    // 8. Average Delivery Time (for completed deliveries)
    let averageDeliveryTime = 0;
    const completedWithTimes = deliveredDeliveries.filter(
      (d) => d.pickupTime && d.deliveryTime
    );

    if (completedWithTimes.length > 0) {
      const totalTime = completedWithTimes.reduce((sum, delivery) => {
        const timeDiff =
          new Date(delivery.deliveryTime) - new Date(delivery.pickupTime);
        return sum + timeDiff;
      }, 0);
      averageDeliveryTime = Math.round(
        totalTime / completedWithTimes.length / (1000 * 60)
      ); // in minutes
    }
    console.log("Average delivery time:", averageDeliveryTime, "minutes");

    // 9. Recent Activity (last 5 deliveries)
    const recentDeliveries = await Delivery.find(baseQuery)
      .populate({
        path: "order",
        select: "totalPrice orderItems",
        populate: {
          path: "user",
          select: "name",
        },
      })
      .sort({ updatedAt: -1 })
      .limit(5);

    console.log("Recent deliveries count:", recentDeliveries.length);

    // Format response
    const stats = {
      totalDeliveries,
      deliveredOrders,
      pendingOrders,
      inProgressOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      todaysRevenue: parseFloat(todaysRevenue.toFixed(2)),
      todaysDeliveries: todaysDeliveries.length,
      successRate: parseFloat(successRate),
      averageDeliveryTime,
      recentActivity: recentDeliveries.map((delivery) => ({
        id: delivery._id,
        status: delivery.status,
        customerName: delivery.order?.user?.name || "Unknown",
        orderValue: delivery.order?.totalPrice || 0,
        updatedAt: delivery.updatedAt,
      })),
    };

    console.log("Final stats response:", stats);

    res.status(200).json({
      success: true,
      message: "Dashboard stats retrieved successfully",
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
