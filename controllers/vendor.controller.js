const Product = require("../models/product.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const cloudinary = require("cloudinary").v2;

// @desc    Login as a vendor
// @route   POST /api/vendor/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if vendor exists
    const vendor = await User.findOne({ email, role: "vendor" });
    if (!vendor) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const payload = {
      id: vendor.id,
      role: vendor.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    // Return token and vendor data (excluding password)
    const vendorData = {
      _id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      logo: vendor.logo,
      description: vendor.description,
    };

    res.status(200).json({
      success: true,
      token,
      vendor: vendorData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Change vendor password
// @route   PUT /api/vendor/auth/change-password
// @access  Private (Vendor only)
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    // Get vendor from database
    const vendor = await User.findById(req.user.id);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, vendor.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    vendor.password = await bcrypt.hash(newPassword, salt);

    // Save updated vendor
    await vendor.save();

    res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get all products for this vendor
// @route   GET /api/vendor/products
// @access  Private (Vendor only)
exports.getVendorProducts = async (req, res) => {
  try {
    const { category, search, sort, limit = 10, page = 1 } = req.query;

    // Build query
    const query = { vendorId: req.user.id };

    // Filter by category
    if (category) {
      query.category = category;
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

    // Execute query
    const products = await Product.find(query)
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

// @desc    Get all orders for this vendor
// @route   GET /api/vendor/orders
// @access  Private (Vendor only)
exports.getVendorOrders = async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;

    // Build query
    const query = { vendorId: req.user.id };

    // Filter by status
    if (status) {
      query.orderStatus = status;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const orders = await Order.find(query)
      .populate("user", "name email")
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

// @desc    Get vendor dashboard statistics
// @route   GET /api/vendor/dashboard/stats
// @access  Private (Vendor only)
exports.getDashboardStats = async (req, res) => {
  try {
    // Get total revenue
    const revenueData = await Order.aggregate([
      {
        $match: {
          vendorId: new ObjectId(req.user.id),
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    // Get previous period revenue for comparison
    const currentDate = new Date();
    const previousPeriodStart = new Date();
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);

    const previousRevenueData = await Order.aggregate([
      {
        $match: {
          vendorId: new ObjectId(req.user.id),
          orderStatus: { $nin: ["cancelled"] },
          createdAt: { $gte: previousPeriodStart, $lt: currentDate },
        },
      },
      {
        $group: {
          _id: null,
          previousRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    // Calculate revenue change percentage
    const totalRevenue =
      revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
    const previousRevenue =
      previousRevenueData.length > 0
        ? previousRevenueData[0].previousRevenue
        : 0;
    const revenueChange =
      previousRevenue === 0
        ? 0
        : ((totalRevenue - previousRevenue) / previousRevenue) * 100;

    // Get total orders
    const orderData = await Order.aggregate([
      {
        $match: {
          vendorId: new ObjectId(req.user.id),
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    // Get previous period orders for comparison
    const previousOrderData = await Order.aggregate([
      {
        $match: {
          vendorId: new ObjectId(req.user.id),
          createdAt: { $gte: previousPeriodStart, $lt: currentDate },
        },
      },
      {
        $group: {
          _id: null,
          previousOrders: { $sum: 1 },
        },
      },
    ]);

    // Calculate orders change percentage
    const totalOrders = orderData.length > 0 ? orderData[0].totalOrders : 0;
    const previousOrders =
      previousOrderData.length > 0 ? previousOrderData[0].previousOrders : 0;
    const ordersChange =
      previousOrders === 0
        ? 0
        : ((totalOrders - previousOrders) / previousOrders) * 100;

    // Get total products
    const productData = await Product.aggregate([
      {
        $match: {
          vendorId: new ObjectId(req.user.id),
        },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
        },
      },
    ]);

    // Get previous period products for comparison
    const previousProductData = await Product.aggregate([
      {
        $match: {
          vendorId: new ObjectId(req.user.id),
          createdAt: { $gte: previousPeriodStart, $lt: currentDate },
        },
      },
      {
        $group: {
          _id: null,
          previousProducts: { $sum: 1 },
        },
      },
    ]);

    // Calculate products change percentage
    const totalProducts =
      productData.length > 0 ? productData[0].totalProducts : 0;
    const previousProducts =
      previousProductData.length > 0
        ? previousProductData[0].previousProducts
        : 0;
    const productsChange =
      previousProducts === 0
        ? 0
        : ((totalProducts - previousProducts) / previousProducts) * 100;

    // Get pending deliveries
    const pendingDeliveriesData = await Order.aggregate([
      {
        $match: {
          vendorId: new ObjectId(req.user.id),
          orderStatus: "Pending Delivery",
        },
      },
      {
        $group: {
          _id: null,
          pendingDeliveries: { $sum: 1 },
        },
      },
    ]);

    const pendingDeliveries =
      pendingDeliveriesData.length > 0
        ? pendingDeliveriesData[0].pendingDeliveries
        : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        totalOrders,
        ordersChange: parseFloat(ordersChange.toFixed(1)),
        totalProducts,
        productsChange: parseFloat(productsChange.toFixed(1)),
        pendingDeliveries,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get vendor's recent orders
// @route   GET /api/vendor/dashboard/recent-orders
// @access  Private (Vendor only)
exports.getRecentOrders = async (req, res) => {
  try {
    // First try to get orders without populate to see if basic query works
    const orders = await Order.find({ vendorId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(); // Use lean for better performance

    console.log(`Found ${orders.length} orders for vendor ${req.user.id}`);

    // If no orders found, return empty array
    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: [],
      });
    }

    // Try to populate user and product data separately with error handling
    const populatedOrders = [];

    for (const order of orders) {
      try {
        // Get user data
        const user = await User.findById(order.user)
          .select("name email")
          .lean();

        // Format order with safe data access
        const formattedOrder = {
          _id: order._id,
          customer: {
            name: user?.name || "Unknown Customer",
            email: user?.email || "No Email",
          },
          totalAmount: order.totalPrice || 0,
          status: order.orderStatus || "Unknown",
          paymentMethod: order.paymentMethod || "Unknown",
          createdAt: order.createdAt
            ? order.createdAt.toISOString().split("T")[0]
            : "Unknown Date",
          products: [], // Initialize empty products array
        };

        // Try to get product details for each order item
        if (order.orderItems && Array.isArray(order.orderItems)) {
          for (const item of order.orderItems) {
            try {
              const product = await Product.findById(item.product)
                .select("name price image")
                .lean();
              formattedOrder.products.push({
                name: product?.name || "Product Deleted",
                price: product?.price || item.price || 0,
                quantity: item.quantity || 0,
              });
            } catch (productError) {
              // If product not found, add placeholder
              formattedOrder.products.push({
                name: "Product Deleted",
                price: item.price || 0,
                quantity: item.quantity || 0,
              });
            }
          }
        }

        populatedOrders.push(formattedOrder);
      } catch (orderError) {
        console.error("Error processing order:", order._id, orderError);
        // Skip this order and continue with others
        continue;
      }
    }

    res.status(200).json({
      success: true,
      orders: populatedOrders,
    });
  } catch (error) {
    console.error("Error in getRecentOrders:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get vendor's top selling products
// @route   GET /api/vendor/dashboard/top-products
// @access  Private (Vendor only)
exports.getTopProducts = async (req, res) => {
  try {
    console.log(`Getting top products for vendor: ${req.user.id}`);

    // First check if there are any orders for this vendor
    const orderCount = await Order.countDocuments({
      vendorId: new ObjectId(req.user.id),
      orderStatus: { $nin: ["cancelled"] },
    });

    console.log(`Found ${orderCount} non-cancelled orders for vendor`);

    if (orderCount === 0) {
      return res.status(200).json({
        success: true,
        products: [],
        message: "No orders found for this vendor",
      });
    }

    // Aggregate to find top selling products using orderItems field
    const topSellingProducts = await Order.aggregate([
      {
        $match: {
          vendorId: new ObjectId(req.user.id),
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      { $unwind: "$orderItems" }, // Use orderItems instead of products
      {
        $group: {
          _id: "$orderItems.product",
          sold: { $sum: "$orderItems.quantity" },
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 5 },
    ]);

    console.log(`Aggregation result:`, topSellingProducts);

    if (!topSellingProducts || topSellingProducts.length === 0) {
      return res.status(200).json({
        success: true,
        products: [],
        message: "No product sales data found",
      });
    }

    // Get product details for top selling products
    const productIds = topSellingProducts.map((p) => p._id).filter((id) => id); // Filter out null IDs
    console.log(`Product IDs to fetch:`, productIds);

    const products = await Product.find({ _id: { $in: productIds } });
    console.log(`Found ${products.length} products in database`);

    // Combine product details with sold quantities
    const formattedProducts = products.map((product) => {
      const soldData = topSellingProducts.find(
        (p) => p._id && p._id.toString() === product._id.toString()
      );
      return {
        _id: product._id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        sold: soldData ? soldData.sold : 0,
        image: product.image || "https://via.placeholder.com/50",
        category: product.category,
      };
    });

    // Sort by sold quantity (descending)
    formattedProducts.sort((a, b) => b.sold - a.sold);

    console.log(`Returning ${formattedProducts.length} formatted products`);

    res.status(200).json({
      success: true,
      products: formattedProducts,
    });
  } catch (error) {
    console.error("Error in getTopProducts:", error);
    console.error("Error details:", error.stack);
    console.error("Error message:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get vendor analytics
// @route   GET /api/vendor/analytics
// @access  Private (Vendor only)
exports.getVendorAnalytics = async (req, res) => {
  console.log("=== ANALYTICS API CALLED ===");
  console.log("Request user:", req.user);
  console.log("Request query:", req.query);

  try {
    const { period = "month" } = req.query;
    console.log("Period:", period);

    // Set date range based on period
    const now = new Date();
    let startDate;
    console.log("Current date:", now);

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    console.log("Date calculation completed:", { startDate, now });

    // Convert vendor ID to ObjectId safely
    console.log("Converting vendor ID to ObjectId...");
    console.log("Vendor ID:", req.user.id, "Type:", typeof req.user.id);

    let vendorObjectId;
    try {
      vendorObjectId = new ObjectId(req.user.id);
      console.log("ObjectId conversion successful:", vendorObjectId);
    } catch (objIdError) {
      console.error("ObjectId conversion failed:", objIdError);
      return res.status(200).json({
        success: true,
        data: {
          totalSales: { totalAmount: 0, count: 0 },
          salesByDay: [],
          topProducts: [],
          orderStatusDistribution: [],
          salesByCategory: [],
        },
      });
    }

    // Initialize response data with defaults
    let responseData = {
      totalSales: { totalAmount: 0, count: 0 },
      salesByDay: [],
      topProducts: [],
      orderStatusDistribution: [],
      salesByCategory: [],
    };

    try {
      console.log("Starting aggregation queries...");

      // Get total sales with error handling
      console.log("Starting total sales aggregation...");
      const totalSales = await Order.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,
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

      console.log("Total sales aggregation completed:", totalSales);
      if (totalSales && totalSales.length > 0) {
        responseData.totalSales = totalSales[0];
        console.log("Total sales data set:", responseData.totalSales);
      } else {
        console.log("No total sales data found, using defaults");
      }

      // Get sales by day
      const salesByDay = await Order.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,
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

      responseData.salesByDay = salesByDay || [];

      // Get top selling products
      const topProducts = await Order.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,
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
              $sum: {
                $multiply: ["$orderItems.price", "$orderItems.quantity"],
              },
            },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
      ]);

      responseData.topProducts = topProducts || [];

      // Get order status distribution
      const orderStatusDistribution = await Order.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,
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

      responseData.orderStatusDistribution = orderStatusDistribution || [];

      // Get sales by category
      console.log("Starting sales by category aggregation...");
      const salesByCategory = await Order.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,
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
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$productInfo.category",
            totalAmount: {
              $sum: {
                $multiply: ["$orderItems.price", "$orderItems.quantity"],
              },
            },
            totalQuantity: { $sum: "$orderItems.quantity" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]);

      console.log("Sales by category aggregation completed:", salesByCategory);
      responseData.salesByCategory = salesByCategory || [];
    } catch (aggregationError) {
      console.error("=== AGGREGATION ERROR ===");
      console.error("Error message:", aggregationError.message);
      console.error("Error stack:", aggregationError.stack);
      console.error("Error details:", aggregationError);
      // Keep default data on aggregation error
    }

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("=== ANALYTICS API MAIN ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error details:", error);
    console.error("Request user ID:", req.user?.id);
    console.error("Request query:", req.query);

    // Return default empty data instead of 500 error
    res.status(200).json({
      success: true,
      data: {
        totalSales: { totalAmount: 0, count: 0 },
        salesByDay: [],
        topProducts: [],
        orderStatusDistribution: [],
        salesByCategory: [],
      },
    });
  }
};

// @desc    Get details of a specific product
// @route   GET /api/vendor/products/:id
// @access  Private (Vendor only)
exports.getProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product belongs to vendor
    if (product.vendorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this product",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Add a new product
// @route   POST /api/vendor/products
// @access  Private (Vendor only)
exports.addProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      price,
      stock,
      category,
      description,
      mainImage,
      subImages,
      specifications,
      status,
    } = req.body;

    // Create new product
    const product = new Product({
      name,
      price,
      stock,
      category,
      description,
      image: mainImage, // Map mainImage to image field in database
      supportImages: subImages || [], // Map subImages to supportImages field in database
      specifications: specifications || {},
      vendorId: req.user.id,
      status,
      sold: 0,
    });

    // Save product
    await product.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update an existing product
// @route   PUT /api/vendor/products/:id
// @access  Private (Vendor only)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product belongs to vendor
    if (product.vendorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this product",
      });
    }

    // Update fields
    const {
      name,
      price,
      stock,
      description,
      image,
      supportImages,
      specifications,
      status,
    } = req.body;

    if (name) product.name = name;
    if (price) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (description) product.description = description;
    if (image) product.image = image;
    if (supportImages) product.supportImages = supportImages;
    if (specifications) product.specifications = specifications;
    if (status) product.status = status;

    product.updatedAt = Date.now();

    // Save updated product
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Delete a product
// @route   DELETE /api/vendor/products/:id
// @access  Private (Vendor only)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product belongs to vendor
    if (product.vendorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this product",
      });
    }

    // Delete product
    await Product.findByIdAndDelete(req.params.id);

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

// @desc    Enable or disable a product
// @route   PATCH /api/vendor/products/:id/status
// @access  Private (Vendor only)
exports.updateProductStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { status } = req.body;

    // Check if status is valid
    if (!["Active", "Disabled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be Active or Disabled",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product belongs to vendor
    if (product.vendorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this product",
      });
    }

    // Update status
    product.status = status;
    product.updatedAt = Date.now();

    // Save updated product
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product status updated successfully",
      product: {
        _id: product._id,
        name: product.name,
        status: product.status,
        updatedAt: product.updatedAt,
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

// @desc    Upload a product image
// @route   POST /api/vendor/products/upload-image
// @access  Private (Vendor only)
exports.uploadProductImage = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    const file = req.files.image;
    const type = req.body.type || "main"; // 'main' or 'support'

    // Check if file is an image
    if (!file.mimetype.startsWith("image")) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file",
      });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Image size should be less than 5MB",
      });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "products",
      public_id: `${req.user.id}_${Date.now()}`,
      width: type === "main" ? 300 : 800,
      crop: "scale",
    });

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: result.secure_url,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update product inventory
// @route   PUT /api/vendor/products/:id/inventory
// @access  Private (Vendor only)
exports.updateProductInventory = async (req, res) => {
  try {
    const { stock, isAvailable } = req.body;

    if (stock === undefined && isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide stock or availability",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product belongs to vendor
    if (product.vendorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this product",
      });
    }

    // Update fields
    if (stock !== undefined) {
      product.stock = stock;
    }

    if (isAvailable !== undefined) {
      product.isAvailable = isAvailable;
    }

    await product.save();

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

// @desc    Get details of a specific order
// @route   GET /api/vendor/orders/:id
// @access  Private (Vendor only)
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email address phone")
      .populate("orderItems.product", "name price image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order belongs to vendor
    if (order.vendorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    // Format order for response
    const formattedOrder = {
      _id: order._id,
      customer: {
        name: order.user.name,
        email: order.user.email,
        address: order.user.address,
        phone: order.user.phone,
      },
      totalAmount: order.totalPrice,
      status: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      products: order.orderItems.map((item) => ({
        productId: item.product._id,
        name: item.product.name,
        price: item.price,
        quantity: item.quantity,
        image: item.product.image,
      })),
      shippingAddress: order.shippingAddress,
      deliveryInfo: order.deliveryInfo,
      paymentInfo: order.paymentInfo,
    };

    res.status(200).json({
      success: true,
      order: formattedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update the status of an order
// @route   PATCH /api/vendor/orders/:id/status
// @access  Private (Vendor only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { status } = req.body;

    // Check if status is valid
    const validStatuses = [
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Pending Delivery",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status value. Must be one of: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order belongs to vendor
    if (order.vendorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    // Update status
    order.orderStatus = status;
    order.updatedAt = Date.now();

    // If order is cancelled, handle refund logic if needed
    if (status === "Cancelled" && order.paymentStatus === "Paid") {
      order.paymentStatus = "Refunded";
      // Additional refund logic would go here
    }

    // Save updated order
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: {
        _id: order._id,
        status: order.orderStatus,
        paymentStatus: order.paymentStatus,
        updatedAt: order.updatedAt,
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

// @desc    Get low stock alerts
// @route   GET /api/vendor/inventory/low-stock
// @access  Private (Vendor only)
exports.getLowStockAlerts = async (req, res) => {
  try {
    const { threshold = 5 } = req.query;

    const products = await Product.find({
      vendorId: req.user.id,
      stock: { $lte: Number(threshold) },
      isAvailable: true,
    }).sort({ stock: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
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

// @desc    Get all orders with pending delivery status
// @route   GET /api/vendor/orders/pending-delivery
// @access  Private (Vendor only)
exports.getPendingDeliveryOrders = async (req, res) => {
  try {
    // Find all orders for this vendor with delivery status pending
    const orders = await Order.find({
      vendorId: req.user.id,
      deliveryStatus: "pending",
    })
      .populate("user", "name email phone")
      .populate("deliveryPersonId", "name email phone")
      .sort({ createdAt: -1 });

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

// @desc    Get all delivery users
// @route   GET /api/vendor/delivery-users
// @access  Private (Vendor only)
exports.getAllDeliveryUsers = async (req, res) => {
  try {
    // Find all users with role 'delivery' and isActive true
    const deliveryUsers = await User.find({
      role: "delivery",
      isActive: true,
    }).select("_id name email phone vehicleType profileImage");

    res.status(200).json({
      success: true,
      count: deliveryUsers.length,
      data: deliveryUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get vendor transactions
// @route   GET /api/vendor/transactions
// @access  Private (Vendor only)
exports.getVendorTransactions = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      status,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    const query = { vendorId: req.user.id };

    // Filter by date range
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }

    // Filter by transaction type
    if (type && ["credit", "debit"].includes(type)) {
      query.type = type;
    }

    // Filter by status
    if (
      status &&
      ["pending", "completed", "failed", "refunded"].includes(status)
    ) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = {};
    sortOptions[sort] = sortOrder;

    // Execute query with pagination
    const transactions = await Transaction.find(query)
      .populate("orderId", "_id orderStatus totalPrice")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(query);

    // Calculate total amounts
    const totalCredits = await Transaction.aggregate([
      {
        $match: {
          vendorId: mongoose.Types.ObjectId(req.user.id),
          type: "credit",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalDebits = await Transaction.aggregate([
      {
        $match: {
          vendorId: mongoose.Types.ObjectId(req.user.id),
          type: "debit",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const balance =
      (totalCredits[0]?.total || 0) - (totalDebits[0]?.total || 0);

    res.status(200).json({
      success: true,
      count: transactions.length,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      currentPage: parseInt(page),
      data: transactions,
      summary: {
        totalCredits: totalCredits[0]?.total || 0,
        totalDebits: totalDebits[0]?.total || 0,
        balance,
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

// @desc    Get transaction details
// @route   GET /api/vendor/transactions/:id
// @access  Private (Vendor only)
exports.getTransactionDetails = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("orderId")
      .populate("vendorId", "name email businessName");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Check if transaction belongs to vendor
    if (transaction.vendorId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this transaction",
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Create a new transaction
// @route   POST /api/vendor/transactions
// @access  Private (Vendor only)
exports.createTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      orderId,
      amount,
      type,
      paymentMethod,
      description,
      reference,
      metadata,
    } = req.body;

    // Create new transaction
    const transaction = new Transaction({
      vendorId: req.user.id,
      orderId,
      amount,
      type,
      paymentMethod,
      description,
      reference,
      metadata,
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Assign delivery person to an order
// @route   POST /api/vendor/orders/:id/assign-delivery
// @access  Private (Vendor only)
exports.assignDeliveryPerson = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { deliveryPersonId } = req.body;
    const orderId = req.params.id;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order belongs to vendor
    if (order.vendorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      });
    }

    // Check if the delivery person exists and is active
    const deliveryPerson = await User.findOne({
      _id: deliveryPersonId,
      role: "delivery",
      isActive: true,
    });

    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: "Delivery person not found or inactive",
      });
    }

    // Check payment status for non-COD orders
    if (order.paymentMethod !== "cod" && order.paymentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot assign delivery for non-COD orders with incomplete payment",
      });
    }

    // Update order with delivery person
    order.deliveryPersonId = deliveryPersonId;
    order.deliveryStatus = "pending";
    order.orderStatus = "preparing"; // Update order status
    order.updatedAt = Date.now();

    // Make sure deliveryLocation is present and valid
    // If shippingAddress has coordinates, use those
    if (
      order.shippingAddress &&
      order.shippingAddress.latitude &&
      order.shippingAddress.longitude
    ) {
      order.deliveryLocation = {
        latitude: order.shippingAddress.latitude,
        longitude: order.shippingAddress.longitude,
      };
    }
    // If there's no valid location info, use default coordinates
    else if (
      !order.deliveryLocation ||
      !order.deliveryLocation.latitude ||
      !order.deliveryLocation.longitude
    ) {
      order.deliveryLocation = {
        latitude: 0,
        longitude: 0,
      };
    }

    // Save the updated order
    await order.save();

    // Check if a delivery task already exists for this order
    const Delivery = mongoose.model("Delivery");
    let deliveryTask = await Delivery.findOne({ order: orderId });

    // If no delivery task exists, create one
    if (!deliveryTask) {
      // Calculate estimated delivery time (30 minutes from now)
      const estimatedDeliveryTime = new Date();
      estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + 30);

      // Create a new delivery task
      deliveryTask = new Delivery({
        order: orderId,
        deliveryPerson: deliveryPersonId,
        status: "assigned",
        currentLocation: {
          latitude: order.deliveryLocation.latitude || 0,
          longitude: order.deliveryLocation.longitude || 0,
          timestamp: new Date(),
        },
        locationHistory: [
          {
            latitude: order.deliveryLocation.latitude || 0,
            longitude: order.deliveryLocation.longitude || 0,
            timestamp: new Date(),
          },
        ],
        estimatedDeliveryTime: estimatedDeliveryTime,
        isAccepted: false,
      });

      await deliveryTask.save();
    }
    // If delivery task exists, update it
    else {
      deliveryTask.deliveryPerson = deliveryPersonId;
      deliveryTask.status = "assigned";
      await deliveryTask.save();
    }

    res.status(200).json({
      success: true,
      message: "Delivery person assigned successfully",
      data: {
        orderId: order._id,
        deliveryPerson: {
          id: deliveryPerson._id,
          name: deliveryPerson.name,
          phone: deliveryPerson.phone,
        },
        deliveryStatus: order.deliveryStatus,
        orderStatus: order.orderStatus,
        deliveryTask: {
          id: deliveryTask._id,
          status: deliveryTask.status,
          estimatedDeliveryTime: deliveryTask.estimatedDeliveryTime,
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
