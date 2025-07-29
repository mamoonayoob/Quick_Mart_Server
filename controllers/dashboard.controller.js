const Order = require('../models/order.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    // Calculate current date and date 30 days ago for comparison
    const currentDate = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(currentDate.getDate() - 60);
    
    // Get total revenue from all completed orders
    const totalRevenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = totalRevenueResult.length > 0 ? Math.round(totalRevenueResult[0].total) : 0;
    
    // Get revenue from last 30 days
    const revenueLastMonthResult = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'completed',
          createdAt: { $gte: thirtyDaysAgo, $lte: currentDate }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const revenueLastMonth = revenueLastMonthResult.length > 0 ? revenueLastMonthResult[0].total : 0;
    
    // Get revenue from 30-60 days ago for comparison
    const revenuePreviousMonthResult = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'completed',
          createdAt: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const revenuePreviousMonth = revenuePreviousMonthResult.length > 0 ? revenuePreviousMonthResult[0].total : 0;
    
    // Calculate revenue change percentage
    const revenueChange = revenuePreviousMonth === 0 
      ? 100 
      : parseFloat(((revenueLastMonth - revenuePreviousMonth) / revenuePreviousMonth * 100).toFixed(1));
    
    // Get total orders
    const totalOrders = await Order.countDocuments();
    
    // Get orders from last 30 days
    const ordersLastMonth = await Order.countDocuments({
      createdAt: { $gte: thirtyDaysAgo, $lte: currentDate }
    });
    
    // Get orders from 30-60 days ago
    const ordersPreviousMonth = await Order.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo }
    });
    
    // Calculate orders change percentage
    const ordersChange = ordersPreviousMonth === 0 
      ? 100 
      : parseFloat(((ordersLastMonth - ordersPreviousMonth) / ordersPreviousMonth * 100).toFixed(1));
    
    // Get total customers (users with customer role)
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    
    // Get customers from last 30 days
    const customersLastMonth = await User.countDocuments({
      role: 'customer',
      createdAt: { $gte: thirtyDaysAgo, $lte: currentDate }
    });
    
    // Get customers from 30-60 days ago
    const customersPreviousMonth = await User.countDocuments({
      role: 'customer',
      createdAt: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo }
    });
    
    // Calculate customers change percentage
    const customersChange = customersPreviousMonth === 0 
      ? 100 
      : parseFloat(((customersLastMonth - customersPreviousMonth) / customersPreviousMonth * 100).toFixed(1));
    
    // Get total products
    const totalProducts = await Product.countDocuments();
    
    // Get products from last 30 days
    const productsLastMonth = await Product.countDocuments({
      createdAt: { $gte: thirtyDaysAgo, $lte: currentDate }
    });
    
    // Get products from 30-60 days ago
    const productsPreviousMonth = await Product.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo }
    });
    
    // Calculate products change percentage
    const productsChange = productsPreviousMonth === 0 
      ? 100 
      : parseFloat(((productsLastMonth - productsPreviousMonth) / productsPreviousMonth * 100).toFixed(1));
    
    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        revenueChange,
        totalOrders,
        ordersChange,
        totalCustomers,
        customersChange,
        totalProducts,
        productsChange
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get sales data for chart
// @route   GET /api/dashboard/sales
// @access  Private (Admin)
exports.getSalesData = async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    
    let groupBy, labels;
    
    if (period === 'monthly') {
      // Group by month for the current year
      groupBy = { $month: '$createdAt' };
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    } else if (period === 'weekly') {
      // Group by week for the last 7 weeks
      groupBy = { $week: '$createdAt' };
      
      // Generate week labels for the last 7 weeks
      const currentDate = new Date();
      labels = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(currentDate.getDate() - (i * 7));
        labels.push(`Week ${date.getDate()}/${date.getMonth() + 1}`);
      }
    } else if (period === 'daily') {
      // Group by day for the last 7 days
      groupBy = { $dayOfMonth: '$createdAt' };
      
      // Generate day labels for the last 7 days
      const currentDate = new Date();
      labels = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
      }
    }
    
    // Set date range based on period
    const dateFilter = {};
    if (period === 'monthly') {
      // Filter by year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      dateFilter.createdAt = { $gte: startDate, $lte: endDate };
    } else if (period === 'weekly') {
      // Filter by last 7 weeks
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 49); // 7 weeks ago
      dateFilter.createdAt = { $gte: startDate };
    } else if (period === 'daily') {
      // Filter by last 7 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      dateFilter.createdAt = { $gte: startDate };
    }
    
    // Aggregate sales data
    const salesData = await Order.aggregate([
      { $match: { ...dateFilter, paymentStatus: 'completed' } },
      {
        $group: {
          _id: groupBy,
          totalSales: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Format data for chart
    let data;
    
    if (period === 'monthly') {
      // Initialize data array with zeros for all months
      data = Array(12).fill(0);
      
      // Fill in actual data
      salesData.forEach(item => {
        const monthIndex = item._id - 1; // MongoDB months are 1-indexed
        data[monthIndex] = Math.round(item.totalSales);
      });
    } else if (period === 'weekly' || period === 'daily') {
      // For weekly and daily, we need to map the data to the correct positions
      data = Array(7).fill(0);
      
      // Fill in actual data (simplified approach)
      salesData.forEach((item, index) => {
        if (index < 7) {
          data[index] = Math.round(item.totalSales);
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        labels,
        datasets: [
          {
            label: 'Sales',
            data,
          },
        ],
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get sales by category
// @route   GET /api/dashboard/category-sales
// @access  Private (Admin)
exports.getCategorySales = async (req, res) => {
  try {
    // Get all orders with completed payment status
    const orders = await Order.find({ paymentStatus: 'completed' })
      .populate({
        path: 'orderItems.product',
        select: 'category'
      });
    
    // Calculate sales by category
    const categorySales = {};
    
    orders.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.product && item.product.category) {
          const category = item.product.category;
          const itemTotal = item.price * item.quantity;
          
          if (categorySales[category]) {
            categorySales[category] += itemTotal;
          } else {
            categorySales[category] = itemTotal;
          }
        }
      });
    });
    
    // Convert to array and sort by sales amount
    const sortedCategories = Object.entries(categorySales)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Get top 5 categories
    
    // Format data for chart
    const labels = sortedCategories.map(item => item.category);
    const data = sortedCategories.map(item => Math.round(item.amount));
    
    res.status(200).json({
      success: true,
      data: {
        labels,
        datasets: [
          {
            label: 'Sales by Category',
            data,
          },
        ],
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get recent orders
// @route   GET /api/dashboard/recent-orders
// @access  Private (Admin)
exports.getRecentOrders = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('user', 'name email');
    
    const formattedOrders = orders.map(order => ({
      id: order._id,
      customer: order.user ? order.user.name : 'Unknown Customer',
      date: order.createdAt.toISOString().split('T')[0],
      amount: order.totalPrice,
      status: order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)
    }));
    
    res.status(200).json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get top products
// @route   GET /api/dashboard/top-products
// @access  Private (Admin)
exports.getTopProducts = async (req, res) => {
  try {
    // Get all completed orders
    const orders = await Order.find({ paymentStatus: 'completed' });
    
    // Calculate product sales
    const productSales = {};
    
    orders.forEach(order => {
      order.orderItems.forEach(item => {
        const productId = item.product.toString();
        const quantity = item.quantity;
        
        if (productSales[productId]) {
          productSales[productId] += quantity;
        } else {
          productSales[productId] = quantity;
        }
      });
    });
    
    // Get product details for top selling products
    const topProductIds = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);
    
    const topProducts = await Product.find({ _id: { $in: topProductIds } })
      .select('name category stock');
    
    // Format data
    const formattedProducts = topProducts.map((product, index) => ({
      id: index + 1,
      name: product.name,
      category: product.category,
      stock: product.stock,
      sold: productSales[product._id.toString()] || 0
    }));
    
    res.status(200).json({
      success: true,
      data: formattedProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
