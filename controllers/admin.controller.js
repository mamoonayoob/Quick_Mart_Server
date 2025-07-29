const User = require("../models/user.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Delivery = require("../models/delivery.model");
const mongoose = require("mongoose");

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    const { role, search, sort, limit = 10, page = 1 } = req.query;

    // Build query
    const query = {};

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    let sortObj = {};
    if (sort) {
      const sortFields = sort.split(",");
      sortFields.forEach((field) => {
        if (field.startsWith("-")) {
          sortObj[field.substring(1)] = -1;
        } else {
          sortObj[field] = 1;
        }
      });
    } else {
      // Default sort by createdAt desc
      sortObj = { createdAt: -1 };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const users = await User.find(query)
      .select("-password")
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (role) updateFields.role = role;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is an admin
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete admin user",
      });
    }

    await user.remove();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private (Admin only)
exports.getOrders = async (req, res) => {
  try {
    const { status, paymentStatus, limit = 10, page = 1 } = req.query;

    // Build query
    const query = {};

    // Filter by status
    if (status) {
      query.orderStatus = status;
    }

    // Filter by payment status
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("vendorId", "name businessName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const total = await Order.countDocuments(query);

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

// @desc    Update order
// @route   PUT /api/admin/orders/:id
// @access  Private (Admin only)
exports.updateOrder = async (req, res) => {
  try {
    const { orderStatus, paymentStatus, deliveryStatus } = req.body;

    // Build update object
    const updateFields = {};
    if (orderStatus) updateFields.orderStatus = orderStatus;
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;
    if (deliveryStatus) updateFields.deliveryStatus = deliveryStatus;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update delivery status if needed
    if (deliveryStatus) {
      const delivery = await Delivery.findOne({ order: order._id });
      if (delivery) {
        delivery.status = deliveryStatus;
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

// @desc    Get system analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
exports.getAnalytics = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    console.log("📊 Dashboard analytics fetching data for period:", period);

    // Set date range based on period (matching Analytics tab exactly)
    const now = new Date();
    let startDate;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    // Get user counts by role
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get total sales
    const totalSales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get sales by day
    const salesByDay = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalAmount: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          name: { $first: "$orderItems.name" },
          totalQuantity: { $sum: "$orderItems.quantity" },
          totalAmount: {
            $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
          },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    // Get order status distribution
    const orderStatusDistribution = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get payment method distribution
    const paymentMethodDistribution = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        userCounts,
        totalSales:
          totalSales.length > 0 ? totalSales[0] : { totalAmount: 0, count: 0 },
        salesByDay,
        topProducts,
        orderStatusDistribution,
        paymentMethodDistribution,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Create a new user
// @route   POST /api/admin/users
// @access  Private (Admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    console.log("🔧 Creating user with data:", {
      name,
      email,
      role,
      phone,
      address,
    });

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, password, and role",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Prepare user data with role-specific required fields
    const userData = {
      name,
      email,
      password,
      role,
      phone: phone || "0000000000", // Default phone if not provided
      address: address || {},
    };

    // Add role-specific required fields with defaults
    if (role === "vendor") {
      userData.businessName = `${name}'s Business`; // Default business name
      userData.businessDescription = "Business description not provided";
    } else if (role === "delivery") {
      userData.vehicleType = "motorcycle"; // Default vehicle type
      userData.licenseNumber = "LICENSE-" + Date.now(); // Default license number
    } else if (role === "admin") {
      userData.adminLevel = "junior"; // Default admin level
    }

    console.log("🔧 Final user data for creation:", userData);

    // Create new user
    const user = await User.create(userData);

    console.log("✅ User created successfully:", {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Fetch all users to return updated list
    const allUsers = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: allUsers, // Return all users for frontend to update the list
      totalCount: allUsers.length,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Handle specific validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: validationErrors,
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
};

// @desc    Get all products from all vendors
// @route   GET /api/admin/products
// @access  Private (Admin only)
exports.getAllProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      vendor,
      isAvailable,
      sort,
      limit = 10,
      page = 1,
    } = req.query;

    // Build query
    const query = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by vendor
    if (vendor) {
      query.vendorId = vendor;
    }

    // Filter by availability
    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable === "true";
    }

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    let sortObj = {};
    if (sort) {
      const sortFields = sort.split(",");
      sortFields.forEach((field) => {
        if (field.startsWith("-")) {
          sortObj[field.substring(1)] = -1;
        } else {
          sortObj[field] = 1;
        }
      });
    } else {
      // Default sort by createdAt desc
      sortObj = { createdAt: -1 };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query with vendor information
    const products = await Product.find(query)
      .populate("vendorId", "name email")
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      data: products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get product by ID
// @route   GET /api/admin/products/:id
// @access  Private (Admin only)
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "vendorId",
      "name email"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Private (Admin only)
exports.updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      isAvailable,
      featured,
      discount,
    } = req.body;

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (description) updateFields.description = description;
    if (price) updateFields.price = price;
    if (category) updateFields.category = category;
    if (stock !== undefined) updateFields.stock = stock;
    if (isAvailable !== undefined) updateFields.isAvailable = isAvailable;
    if (featured !== undefined) updateFields.featured = featured;
    if (discount !== undefined) updateFields.discount = discount;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate("vendorId", "name email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.remove();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

exports.getSystemHealth = async (req, res) => {
  try {
    // Get database stats
    const dbStats = await mongoose.connection.db.stats();

    // Get counts of main collections
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    const deliveryCount = await Delivery.countDocuments();

    // Get recent orders (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentOrderCount = await Order.countDocuments({
      createdAt: { $gte: yesterday },
    });

    // Get active users (with orders in last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const activeUsers = await Order.distinct("user", {
      createdAt: { $gte: lastWeek },
    });

    res.status(200).json({
      success: true,
      data: {
        dbStats: {
          collections: dbStats.collections,
          views: dbStats.views,
          objects: dbStats.objects,
          avgObjSize: dbStats.avgObjSize,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize,
        },
        counts: {
          users: userCount,
          products: productCount,
          orders: orderCount,
          deliveries: deliveryCount,
        },
        activity: {
          recentOrders: recentOrderCount,
          activeUsers: activeUsers.length,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get sales analytics data
// @route   GET /api/admin/analytics/sales
// @access  Private (Admin only)
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    console.log("📊 Fetching sales analytics for period:", period);

    // Set date range based on period
    const now = new Date();
    let startDate;
    let groupFormat;
    let labels = [];

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupFormat = "%Y-%m-%d";
        // Generate last 7 days labels
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));
        }
        break;
      case "year":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        groupFormat = "%Y-%m";
        // Generate last 12 months labels
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          labels.push(date.toLocaleDateString("en-US", { month: "short" }));
        }
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        groupFormat = "%Y-%m";
        // Generate last 12 months labels
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          labels.push(date.toLocaleDateString("en-US", { month: "short" }));
        }
    }

    // Get sales data from database
    const salesByPeriod = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          totalRevenue: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log("📊 Raw sales data from DB:", salesByPeriod);

    // Create data arrays matching the labels
    const revenueData = new Array(labels.length).fill(0);
    const ordersData = new Array(labels.length).fill(0);

    // Map database results to chart data
    salesByPeriod.forEach((item) => {
      let labelIndex;
      if (period === "week") {
        const date = new Date(item._id);
        const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
        labelIndex = labels.indexOf(dayLabel);
      } else {
        const date = new Date(item._id + "-01");
        const monthLabel = date.toLocaleDateString("en-US", { month: "short" });
        labelIndex = labels.indexOf(monthLabel);
      }

      if (labelIndex !== -1) {
        revenueData[labelIndex] = item.totalRevenue || 0;
        ordersData[labelIndex] = item.totalOrders || 0;
      }
    });

    // Calculate totals and metrics
    const totalRevenue = revenueData.reduce((sum, value) => sum + value, 0);
    const totalOrders = ordersData.reduce((sum, value) => sum + value, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate growth (compare with previous period)
    const previousPeriodStart = new Date(
      startDate.getTime() - (now.getTime() - startDate.getTime())
    );
    const previousPeriodSales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousPeriodStart, $lt: startDate },
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const previousRevenue =
      previousPeriodSales.length > 0 ? previousPeriodSales[0].totalRevenue : 0;
    const revenueGrowth =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    const salesData = {
      labels,
      datasets: [
        {
          label: "Revenue",
          data: revenueData,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
        },
        {
          label: "Orders",
          data: ordersData,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          tension: 0.4,
        },
      ],
    };

    console.log("📊 Final sales analytics data:", {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      revenueGrowth: revenueGrowth.toFixed(1) + "%",
    });

    res.status(200).json({
      success: true,
      data: {
        chartData: salesData,
        metrics: {
          totalRevenue,
          totalOrders,
          averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
          revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
          ordersGrowth: parseFloat(revenueGrowth.toFixed(1)), // Using same growth for orders
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getSalesAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get category analytics data
// @route   GET /api/admin/analytics/categories
// @access  Private (Admin only)
exports.getCategoryAnalytics = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    console.log("📊 Fetching category analytics for period:", period);

    // Set date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    // Get category sales data from database
    const categorySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$productInfo.category",
          totalRevenue: {
            $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
          },
          totalQuantity: { $sum: "$orderItems.quantity" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }, // Top 10 categories
    ]);

    console.log("📊 Raw category data from DB:", categorySales);

    // Calculate total revenue for percentage calculation
    const totalRevenue = categorySales.reduce(
      (sum, cat) => sum + (cat.totalRevenue || 0),
      0
    );

    // Prepare chart data
    const labels = [];
    const data = [];
    const categoryInsights = [];

    categorySales.forEach((category, index) => {
      const categoryName = category._id || "Uncategorized";
      const revenue = category.totalRevenue || 0;
      const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

      labels.push(categoryName);
      data.push(parseFloat(percentage.toFixed(1)));

      // Generate mock growth data for now (can be enhanced later)
      const growth =
        index % 2 === 0
          ? `+${(Math.random() * 10).toFixed(1)}%`
          : `-${(Math.random() * 5).toFixed(1)}%`;

      categoryInsights.push({
        category: categoryName,
        percentage: `${percentage.toFixed(1)}%`,
        growth,
        revenue: revenue,
        quantity: category.totalQuantity || 0,
      });
    });

    // Define colors for the chart
    const backgroundColors = [
      "rgba(255, 99, 132, 0.7)",
      "rgba(54, 162, 235, 0.7)",
      "rgba(255, 206, 86, 0.7)",
      "rgba(75, 192, 192, 0.7)",
      "rgba(153, 102, 255, 0.7)",
      "rgba(255, 159, 64, 0.7)",
      "rgba(255, 99, 255, 0.7)",
      "rgba(99, 255, 132, 0.7)",
      "rgba(132, 99, 255, 0.7)",
      "rgba(255, 132, 99, 0.7)",
    ];

    const borderColors = [
      "rgba(255, 99, 132, 1)",
      "rgba(54, 162, 235, 1)",
      "rgba(255, 206, 86, 1)",
      "rgba(75, 192, 192, 1)",
      "rgba(153, 102, 255, 1)",
      "rgba(255, 159, 64, 1)",
      "rgba(255, 99, 255, 1)",
      "rgba(99, 255, 132, 1)",
      "rgba(132, 99, 255, 1)",
      "rgba(255, 132, 99, 1)",
    ];

    const categoryData = {
      labels,
      datasets: [
        {
          label: "Sales by Category (%)",
          data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderColor: borderColors.slice(0, labels.length),
          borderWidth: 1,
        },
      ],
    };

    // Find top category
    const topCategory =
      categoryInsights.length > 0
        ? categoryInsights[0]
        : {
            name: "No Data",
            percentage: "0%",
            growth: "0%",
          };

    console.log("📊 Final category analytics data:", {
      totalCategories: labels.length,
      topCategory: topCategory.category,
      totalRevenue,
    });

    res.status(200).json({
      success: true,
      data: {
        chartData: categoryData,
        insights: categoryInsights,
        topCategory: {
          name: topCategory.category,
          percentage: topCategory.percentage,
          growth: topCategory.growth,
        },
        summary: {
          totalCategories: labels.length,
          totalRevenue,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getCategoryAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get customer analytics data
// @route   GET /api/admin/analytics/customers
// @access  Private (Admin only)
exports.getCustomerAnalytics = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    console.log("📊 Fetching customer analytics for period:", period);

    // Set date range based on period
    const now = new Date();
    let startDate;
    let groupFormat;
    let labels = [];

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupFormat = "%Y-%m-%d";
        // Generate last 7 days labels
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));
        }
        break;
      case "year":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        groupFormat = "%Y-%m";
        // Generate last 12 months labels
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          labels.push(date.toLocaleDateString("en-US", { month: "short" }));
        }
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        groupFormat = "%Y-%m";
        // Generate last 12 months labels
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          labels.push(date.toLocaleDateString("en-US", { month: "short" }));
        }
    }

    // Get new customers by period
    const newCustomersByPeriod = await User.aggregate([
      {
        $match: {
          role: "customer",
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get returning customers (customers who made more than one order)
    const returningCustomersByPeriod = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            customer: "$customer",
            period: {
              $dateToString: { format: groupFormat, date: "$createdAt" },
            },
          },
          orderCount: { $sum: 1 },
        },
      },
      {
        $match: {
          orderCount: { $gt: 1 }, // More than one order = returning customer
        },
      },
      {
        $group: {
          _id: "$_id.period",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log("📊 Raw customer data from DB:", {
      newCustomers: newCustomersByPeriod,
      returningCustomers: returningCustomersByPeriod,
    });

    // Create data arrays matching the labels
    const newCustomersData = new Array(labels.length).fill(0);
    const returningCustomersData = new Array(labels.length).fill(0);

    // Map database results to chart data
    newCustomersByPeriod.forEach((item) => {
      let labelIndex;
      if (period === "week") {
        const date = new Date(item._id);
        const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
        labelIndex = labels.indexOf(dayLabel);
      } else {
        const date = new Date(item._id + "-01");
        const monthLabel = date.toLocaleDateString("en-US", { month: "short" });
        labelIndex = labels.indexOf(monthLabel);
      }

      if (labelIndex !== -1) {
        newCustomersData[labelIndex] = item.count || 0;
      }
    });

    returningCustomersByPeriod.forEach((item) => {
      let labelIndex;
      if (period === "week") {
        const date = new Date(item._id);
        const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
        labelIndex = labels.indexOf(dayLabel);
      } else {
        const date = new Date(item._id + "-01");
        const monthLabel = date.toLocaleDateString("en-US", { month: "short" });
        labelIndex = labels.indexOf(monthLabel);
      }

      if (labelIndex !== -1) {
        returningCustomersData[labelIndex] = item.count || 0;
      }
    });

    // Calculate totals and metrics
    const totalNewCustomers = newCustomersData.reduce(
      (sum, value) => sum + value,
      0
    );
    const totalReturningCustomers = returningCustomersData.reduce(
      (sum, value) => sum + value,
      0
    );
    const totalCustomers = await User.countDocuments({ role: "customer" });
    const retentionRate =
      totalCustomers > 0 ? (totalReturningCustomers / totalCustomers) * 100 : 0;

    // Calculate customer lifetime value (average order value * average orders per customer)
    const customerLTV = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: "$customer",
          totalSpent: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          avgLifetimeValue: { $avg: "$totalSpent" },
        },
      },
    ]);

    const customerLifetimeValue =
      customerLTV.length > 0 ? customerLTV[0].avgLifetimeValue : 0;

    const customerData = {
      labels,
      datasets: [
        {
          label: "New Customers",
          data: newCustomersData,
          backgroundColor: "rgba(153, 102, 255, 0.7)",
        },
        {
          label: "Returning Customers",
          data: returningCustomersData,
          backgroundColor: "rgba(255, 159, 64, 0.7)",
        },
      ],
    };

    // Get customer demographics by role distribution
    const roleDistribution = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    // Mock demographics (can be enhanced with real data later)
    const demographics = {
      roles: roleDistribution.map((role) => ({
        group: role._id,
        count: role.count,
        percentage: Math.round((role.count / totalCustomers) * 100) || 0,
      })),
      location: [
        { region: "Local Area", percentage: 85 },
        { region: "Nearby Cities", percentage: 12 },
        { region: "Other", percentage: 3 },
      ],
    };

    console.log("📊 Final customer analytics data:", {
      totalCustomers,
      totalNewCustomers,
      totalReturningCustomers,
      retentionRate: retentionRate.toFixed(1) + "%",
      customerLifetimeValue: "$" + customerLifetimeValue.toFixed(2),
    });

    res.status(200).json({
      success: true,
      data: {
        chartData: customerData,
        metrics: {
          totalCustomers,
          newCustomers: totalNewCustomers,
          returningCustomers: totalReturningCustomers,
          retentionRate: `${retentionRate.toFixed(1)}%`,
          customerLifetimeValue: `$${customerLifetimeValue.toFixed(2)}`,
          customersGrowth:
            totalNewCustomers > 0
              ? (totalNewCustomers / totalCustomers) * 100
              : 0,
        },
        demographics,
      },
    });
  } catch (error) {
    console.error("❌ Error in getCustomerAnalytics:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
