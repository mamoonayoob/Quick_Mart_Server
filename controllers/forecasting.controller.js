const { spawn } = require("child_process");
const path = require("path");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * Execute Python forecasting service
 * @param {Object} inputData - Data to send to Python service
 * @returns {Promise<Object>} - Forecasting results
 */
const executePythonForecast = (inputData) => {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(
      __dirname,
      "../services/forecasting_service.py"
    );
    const pythonProcess = spawn("python", [
      pythonScriptPath,
      JSON.stringify(inputData),
    ]);

    let outputData = "";
    let errorData = "";

    pythonProcess.stdout.on("data", (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Python process exited with code ${code}: ${errorData}`)
        );
        return;
      }

      try {
        const result = JSON.parse(outputData);
        resolve(result);
      } catch (parseError) {
        reject(
          new Error(`Failed to parse Python output: ${parseError.message}`)
        );
      }
    });

    pythonProcess.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};

/**
 * Get historical sales data for a specific product
 * @param {string} productId - Product ID
 * @param {string} vendorId - Vendor ID (optional, for filtering)
 * @param {number} daysBack - Number of days to look back (default: 90)
 * @returns {Promise<Array>} - Historical sales data
 */
const getProductSalesHistory = async (
  productId,
  vendorId = null,
  daysBack = 90
) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const matchStage = {
      createdAt: { $gte: startDate },
      orderStatus: { $nin: ["cancelled"] }, // Exclude cancelled orders
      "orderItems.product": new ObjectId(productId),
    };

    // Add vendor filter if provided
    if (vendorId) {
      matchStage.vendorId = new ObjectId(vendorId);
    }

    const salesData = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$orderItems" },
      {
        $match: {
          "orderItems.product": new ObjectId(productId),
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
          },
          quantity: { $sum: "$orderItems.quantity" },
          revenue: {
            $sum: { $multiply: ["$orderItems.quantity", "$orderItems.price"] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          quantity: 1,
          revenue: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    console.log(
      `[DEBUG] Aggregation completed. Results count: ${salesData.length}`
    );
    if (salesData.length > 0) {
      console.log(
        `[DEBUG] Sample sales data:`,
        JSON.stringify(salesData[0], null, 2)
      );
    } else {
      console.log(`[DEBUG] No sales data found. Checking raw orders...`);

      // Let's check what raw orders look like
      const rawOrders = await Order.find({
        vendorId: new ObjectId(vendorId),
        createdAt: { $gte: startDate },
      })
        .limit(2)
        .lean();

      console.log(
        `[DEBUG] Raw orders sample:`,
        JSON.stringify(rawOrders, null, 2)
      );
    }

    return salesData;
  } catch (error) {
    throw new Error(`Failed to fetch sales history: ${error.message}`);
  }
};

/**
 * Get historical sales data for all products of a vendor
 * @param {string} vendorId - Vendor ID
 * @param {number} daysBack - Number of days to look back (default: 90)
 * @returns {Promise<Object>} - Sales data grouped by product
 */
const getVendorSalesHistory = async (vendorId, daysBack = 90) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    console.log(`[DEBUG] getVendorSalesHistory called with:`);
    console.log(`[DEBUG] - vendorId: ${vendorId}`);
    console.log(`[DEBUG] - daysBack: ${daysBack}`);
    console.log(`[DEBUG] - startDate: ${startDate}`);

    // First, let's check if any orders exist for this vendor
    const totalOrders = await Order.countDocuments({
      vendorId: new ObjectId(vendorId),
    });
    console.log(`[DEBUG] Total orders for vendor: ${totalOrders}`);

    const recentOrders = await Order.countDocuments({
      vendorId: new ObjectId(vendorId),
      createdAt: { $gte: startDate },
    });
    console.log(
      `[DEBUG] Recent orders (last ${daysBack} days): ${recentOrders}`
    );

    const salesData = await Order.aggregate([
      {
        $match: {
          vendorId: new ObjectId(vendorId),
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
          _id: {
            productId: "$orderItems.product",
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
          },
          productName: { $first: "$productInfo.name" },
          category: { $first: "$productInfo.category" },
          currentStock: { $first: "$productInfo.stock" },
          quantity: { $sum: "$orderItems.quantity" },
          revenue: {
            $sum: { $multiply: ["$orderItems.quantity", "$orderItems.price"] },
          },
        },
      },
      {
        $group: {
          _id: "$_id.productId",
          productName: { $first: "$productName" },
          category: { $first: "$category" },
          currentStock: { $first: "$currentStock" },
          salesHistory: {
            $push: {
              date: "$_id.date",
              quantity: "$quantity",
              revenue: "$revenue",
            },
          },
          totalQuantity: { $sum: "$quantity" },
          totalRevenue: { $sum: "$revenue" },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    return salesData;
  } catch (error) {
    throw new Error(`Failed to fetch vendor sales history: ${error.message}`);
  }
};

// @desc    Get demand forecast for a specific product
// @route   GET /api/forecast/product/:productId
// @access  Private (Vendor/Admin)
exports.getProductForecast = async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 30, lookback = 90, vendorId = null } = req.query;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // Validate forecast days
    const forecastDays = parseInt(days);
    if (forecastDays < 1 || forecastDays > 365) {
      return res.status(400).json({
        success: false,
        message: "Forecast days must be between 1 and 365",
      });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user is authorized to view this product's forecast
    if (
      req.user.role === "vendor" &&
      product.vendorId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this product forecast",
      });
    }

    // Get historical sales data
    const salesHistory = await getProductSalesHistory(
      productId,
      vendorId || (req.user.role === "vendor" ? req.user.id : null),
      parseInt(lookback)
    );

    console.log(`[DEBUG] Individual product forecast for: ${product.name}`);
    console.log(`[DEBUG] Product ID: ${productId}`);
    console.log(`[DEBUG] Vendor ID: ${req.user.id}`);
    console.log(`[DEBUG] Sales history length: ${salesHistory.length}`);
    console.log(`[DEBUG] Sales history sample:`, salesHistory.slice(0, 2));

    // Reduced minimum requirement from 2 to 1 for consistency with vendor forecast
    if (salesHistory.length < 1) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient historical data for forecasting (minimum 1 data point required)",
        data: {
          product: {
            id: product._id,
            name: product.name,
            category: product.category,
          },
          dataPoints: salesHistory.length,
        },
      });
    }

    // If only 1 data point, duplicate it to create minimal time series
    let processedSalesData = salesHistory;
    if (salesHistory.length === 1) {
      const originalData = salesHistory[0];
      const nextDate = new Date(originalData.date);
      nextDate.setDate(nextDate.getDate() + 1);
      processedSalesData = [
        originalData,
        {
          date: nextDate.toISOString().split("T")[0],
          quantity: Math.max(1, Math.floor(originalData.quantity * 0.8)), // Slight variation
        },
      ];
      console.log(`[DEBUG] Enhanced single data point to:`, processedSalesData);
    }

    // Prepare input for Python forecasting service
    const forecastInput = {
      sales_data: processedSalesData, // Use processed data instead of original
      forecast_days: forecastDays,
      product_id: productId,
      product_name: product.name,
    };

    // Execute Python forecasting
    const forecastResult = await executePythonForecast(forecastInput);

    if (!forecastResult.success) {
      return res.status(500).json({
        success: false,
        message: "Forecasting failed",
        error: forecastResult.error,
      });
    }

    // Add product information to response
    const response = {
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
          currentStock: product.stock,
          vendorId: product.vendorId,
        },
        forecast: forecastResult.forecast,
        summary: forecastResult.summary,
        metadata: {
          forecast_generated_at: forecastResult.forecast_generated_at,
          lookback_days: parseInt(lookback),
          forecast_days: forecastDays,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Product forecast error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get demand forecast for all products of a vendor
// @route   GET /api/forecast/vendor
// @access  Private (Vendor/Admin)
exports.getVendorForecast = async (req, res) => {
  try {
    // Extract vendor ID from JWT token
    const vendorId = req.user.id;
    const { days = 30, lookback = 90, limit = 10, category = null } = req.query;

    // Validate vendor ID
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID from token",
      });
    }

    // Check authorization
    if (req.user.role === "vendor" && vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this vendor forecast",
      });
    }

    // Validate forecast days
    const forecastDays = parseInt(days);
    if (forecastDays < 1 || forecastDays > 365) {
      return res.status(400).json({
        success: false,
        message: "Forecast days must be between 1 and 365",
      });
    }

    // Get vendor sales history
    const vendorSalesData = await getVendorSalesHistory(
      vendorId,
      parseInt(lookback)
    );

    console.log(`[DEBUG] Vendor ID: ${vendorId}`);
    console.log(`[DEBUG] Sales data found: ${vendorSalesData.length} products`);
    console.log(`[DEBUG] Sales data sample:`, vendorSalesData.slice(0, 2));

    if (vendorSalesData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No sales data found for this vendor",
        data: {
          vendorId: vendorId,
          lookbackDays: parseInt(lookback),
        },
      });
    }

    // Filter by category if specified
    let filteredData = vendorSalesData;
    if (category) {
      filteredData = vendorSalesData.filter(
        (item) => item.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Limit results
    const limitedData = filteredData.slice(0, parseInt(limit));

    // Generate forecasts for each product
    const forecastPromises = limitedData.map(async (productData) => {
      try {
        // Reduced minimum requirement from 2 to 1 for better data availability
        if (productData.salesHistory.length < 1) {
          console.log(
            `[DEBUG] Product ${productData.productName} has insufficient data: ${productData.salesHistory.length} records`
          );
          return {
            productId: productData._id,
            productName: productData.productName,
            category: productData.category,
            success: false,
            error: "Insufficient data",
          };
        }

        console.log(
          `[DEBUG] Processing forecast for ${productData.productName} with ${productData.salesHistory.length} sales records`
        );

        // If only 1 data point, duplicate it to create minimal time series
        let salesData = productData.salesHistory;
        if (salesData.length === 1) {
          const originalData = salesData[0];
          const nextDate = new Date(originalData.date);
          nextDate.setDate(nextDate.getDate() + 1);
          salesData = [
            originalData,
            {
              date: nextDate.toISOString().split("T")[0],
              quantity: Math.max(1, Math.floor(originalData.quantity * 0.8)), // Slight variation
            },
          ];
        }

        const forecastInput = {
          sales_data: salesData, // Use processed salesData instead of original
          forecast_days: forecastDays,
          product_id: productData._id.toString(),
          product_name: productData.productName,
        };

        const result = await executePythonForecast(forecastInput);

        return {
          productId: productData._id,
          productName: productData.productName,
          category: productData.category,
          currentStock: productData.currentStock,
          totalHistoricalQuantity: productData.totalQuantity,
          totalHistoricalRevenue: productData.totalRevenue,
          ...result,
        };
      } catch (error) {
        return {
          productId: productData._id,
          productName: productData.productName,
          category: productData.category,
          currentStock: productData.currentStock,
          success: false,
          error: error.message,
        };
      }
    });

    const forecastResults = await Promise.all(forecastPromises);

    // Separate successful and failed forecasts
    const successfulForecasts = forecastResults.filter(
      (result) => result.success
    );
    const failedForecasts = forecastResults.filter((result) => !result.success);

    // Calculate vendor-level summary
    const vendorSummary = {
      totalProducts: vendorSalesData.length,
      productsWithSufficientData: successfulForecasts.length,
      productsWithInsufficientData: failedForecasts.length,
      totalPredictedQuantity: successfulForecasts.reduce(
        (sum, forecast) =>
          sum + (forecast.summary?.total_predicted_quantity || 0),
        0
      ),
      averageDailyQuantity:
        successfulForecasts.length > 0
          ? successfulForecasts.reduce(
              (sum, forecast) =>
                sum + (forecast.summary?.average_daily_quantity || 0),
              0
            ) / successfulForecasts.length
          : 0,
    };

    const response = {
      success: true,
      data: {
        vendorId: vendorId,
        summary: vendorSummary,
        forecasts: successfulForecasts,
        failed: failedForecasts,
        metadata: {
          forecast_generated_at: new Date().toISOString(),
          lookback_days: parseInt(lookback),
          forecast_days: forecastDays,
          category_filter: category,
          limit: parseInt(limit),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Vendor forecast error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get top products by predicted demand
// @route   GET /api/forecast/top-products
// @access  Private (Admin only)
exports.getTopPredictedProducts = async (req, res) => {
  try {
    const {
      days = 30,
      lookback = 90,
      limit = 20,
      category = null,
      vendorId = null,
    } = req.query;

    // Admin only endpoint
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // Build match criteria for products
    const productMatch = {};
    if (category) {
      productMatch.category = category;
    }
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      productMatch.vendorId = new ObjectId(vendorId);
    }

    // Get all products with sales data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(lookback));

    const productsWithSales = await Order.aggregate([
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
      { $unwind: "$productInfo" },
      { $match: { productInfo: { $exists: true, ...productMatch } } },
      {
        $group: {
          _id: "$orderItems.product",
          productName: { $first: "$productInfo.name" },
          category: { $first: "$productInfo.category" },
          vendorId: { $first: "$productInfo.vendorId" },
          totalQuantity: { $sum: "$orderItems.quantity" },
          salesHistory: {
            $push: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
              quantity: "$orderItems.quantity",
            },
          },
        },
      },
      { $match: { totalQuantity: { $gte: 2 } } }, // Only products with sufficient sales
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) * 2 }, // Get more to account for forecasting failures
    ]);

    if (productsWithSales.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No products with sufficient sales data found",
      });
    }

    // Generate forecasts for top products
    const forecastPromises = productsWithSales
      .slice(0, parseInt(limit))
      .map(async (productData) => {
        try {
          // Group sales by date and sum quantities
          const salesByDate = {};
          productData.salesHistory.forEach((sale) => {
            if (salesByDate[sale.date]) {
              salesByDate[sale.date] += sale.quantity;
            } else {
              salesByDate[sale.date] = sale.quantity;
            }
          });

          const salesData = Object.entries(salesByDate).map(
            ([date, quantity]) => ({
              date,
              quantity,
            })
          );

          if (salesData.length < 2) {
            return null;
          }

          const forecastInput = {
            sales_data: salesData,
            forecast_days: parseInt(days),
            product_id: productData._id.toString(),
            product_name: productData.productName,
          };

          const result = await executePythonForecast(forecastInput);

          if (result.success) {
            return {
              productId: productData._id,
              productName: productData.productName,
              category: productData.category,
              vendorId: productData.vendorId,
              historicalTotalQuantity: productData.totalQuantity,
              predictedTotalQuantity: result.summary.total_predicted_quantity,
              predictedDailyAverage: result.summary.average_daily_quantity,
              growthRate: result.summary.predicted_growth_rate_percent,
              forecast: result.forecast.slice(0, 7), // First 7 days for preview
            };
          }

          return null;
        } catch (error) {
          console.error(
            `Forecast error for product ${productData._id}:`,
            error
          );
          return null;
        }
      });

    const forecastResults = await Promise.all(forecastPromises);
    const validForecasts = forecastResults.filter((result) => result !== null);

    // Sort by predicted total quantity
    validForecasts.sort(
      (a, b) => b.predictedTotalQuantity - a.predictedTotalQuantity
    );

    const response = {
      success: true,
      data: {
        topProducts: validForecasts,
        metadata: {
          forecast_generated_at: new Date().toISOString(),
          lookback_days: parseInt(lookback),
          forecast_days: parseInt(days),
          total_products_analyzed: productsWithSales.length,
          successful_forecasts: validForecasts.length,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Top products forecast error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  getProductForecast: exports.getProductForecast,
  getVendorForecast: exports.getVendorForecast,
  getTopPredictedProducts: exports.getTopPredictedProducts,
};
