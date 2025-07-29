# QuickMart Demand Forecasting Setup Guide

## Overview

This guide explains how to set up and use the demand forecasting feature for QuickMart eCommerce platform. The feature uses Facebook Prophet for time series forecasting to predict future product demand based on historical sales data.

## Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- MongoDB with existing order and product data
- QuickMart backend server running

## Installation Steps

### 1. Install Python Dependencies

Navigate to your server directory and install the required Python packages:

```bash
cd "e:\nodejs\Quick mart\sever"
pip install -r requirements.txt
```

**Note:** If you encounter issues installing Prophet, try these alternatives:

**For Windows:**

```bash
# Option 1: Using conda (recommended)
conda install -c conda-forge prophet

# Option 2: Using pip with pre-compiled wheels
pip install prophet --no-deps
pip install pystan==3.3.0 prophet==1.1.4
```

**For macOS/Linux:**

```bash
pip install prophet
```

### 2. Verify Python Installation

Test if the forecasting service works:

```bash
python services/forecasting_service.py '{"sales_data":[{"date":"2024-01-01","quantity":10},{"date":"2024-01-02","quantity":15}],"forecast_days":7,"product_id":"test","product_name":"Test Product"}'
```

You should see a JSON response with forecast data.

### 3. Restart Node.js Server

The forecasting routes are automatically integrated. Simply restart your server:

```bash
npm start
```

## API Endpoints

### 1. Product Forecast

Get demand forecast for a specific product.

**Endpoint:** `GET /api/forecast/product/:productId`

**Access:** Vendor (own products) or Admin (all products)

**Query Parameters:**

- `days` (optional): Number of days to forecast (1-365, default: 30)
- `lookback` (optional): Days of historical data to use (default: 90)
- `vendorId` (optional): Filter by vendor (admin only)

**Example Request:**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/forecast/product/64a7b8c9d1e2f3a4b5c6d7e8?days=30&lookback=90"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "name": "iPhone 14",
      "category": "electronics",
      "currentStock": 50,
      "vendorId": "64a7b8c9d1e2f3a4b5c6d7e9"
    },
    "forecast": [
      {
        "date": "2024-07-27",
        "predicted_quantity": 12.5,
        "lower_bound": 8.2,
        "upper_bound": 16.8,
        "trend": 0.5
      }
    ],
    "summary": {
      "total_predicted_quantity": 375.0,
      "average_daily_quantity": 12.5,
      "historical_daily_average": 11.2,
      "predicted_growth_rate_percent": 11.6,
      "forecast_period_days": 30,
      "data_points_used": 45
    },
    "metadata": {
      "forecast_generated_at": "2024-07-26T15:44:07.123Z",
      "lookback_days": 90,
      "forecast_days": 30
    }
  }
}
```

### 2. Vendor Forecast

Get demand forecast for all products of a vendor.

**Endpoint:** `GET /api/forecast/vendor/:vendorId`

**Access:** Vendor (own products) or Admin (all vendors)

**Query Parameters:**

- `days` (optional): Number of days to forecast (default: 30)
- `lookback` (optional): Days of historical data to use (default: 90)
- `limit` (optional): Maximum products to forecast (default: 10)
- `category` (optional): Filter by product category

**Example Request:**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/forecast/vendor/64a7b8c9d1e2f3a4b5c6d7e9?days=30&limit=5"
```

### 3. Top Predicted Products (Admin Only)

Get products with highest predicted demand across all vendors.

**Endpoint:** `GET /api/forecast/top-products`

**Access:** Admin only

**Query Parameters:**

- `days` (optional): Number of days to forecast (default: 30)
- `lookback` (optional): Days of historical data to use (default: 90)
- `limit` (optional): Maximum products to return (default: 20)
- `category` (optional): Filter by product category
- `vendorId` (optional): Filter by vendor

**Example Request:**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/forecast/top-products?limit=10&category=electronics"
```

## Data Requirements

### Minimum Data Requirements

- At least 2 data points (orders) for any product to generate a forecast
- Recommended: 30+ days of historical data for better accuracy
- Orders must have valid `createdAt` timestamps and `orderItems` with quantities

### Data Quality Tips

1. **Regular Sales:** Products with consistent sales patterns forecast better
2. **Sufficient History:** More historical data (60-90 days) improves accuracy
3. **Recent Data:** Recent sales data is weighted more heavily
4. **Seasonal Patterns:** Prophet automatically detects weekly/yearly seasonality

## Error Handling

### Common Errors and Solutions

**1. "Insufficient historical data for forecasting"**

- **Cause:** Product has fewer than 2 sales records
- **Solution:** Wait for more sales data or check if product ID is correct

**2. "Prophet not installed"**

- **Cause:** Python Prophet library not installed
- **Solution:** Run `pip install prophet` or follow installation steps above

**3. "Python process exited with code 1"**

- **Cause:** Python script error or missing dependencies
- **Solution:** Check Python installation and run the verification command

**4. "Not authorized to view this product forecast"**

- **Cause:** Vendor trying to access another vendor's product
- **Solution:** Ensure correct authentication and product ownership

## Performance Considerations

### Optimization Tips

1. **Batch Processing:** Use vendor forecast endpoint for multiple products
2. **Caching:** Consider caching forecast results for frequently requested products
3. **Async Processing:** For large datasets, consider implementing queue-based processing
4. **Data Limits:** Use appropriate `lookback` and `limit` parameters to control processing time

### Expected Response Times

- Single product forecast: 2-5 seconds
- Vendor forecast (10 products): 10-30 seconds
- Top products (20 products): 30-60 seconds

## Integration with Frontend

### Vendor Dashboard Integration

Add forecasting widgets to your existing vendor analytics dashboard:

```javascript
// Example API call from frontend
const getForecast = async (productId, days = 30) => {
  try {
    const response = await fetch(
      `/api/forecast/product/${productId}?days=${days}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Forecast error:", error);
  }
};
```

### Chart Integration

The forecast data is ready for chart libraries like Chart.js or Recharts:

```javascript
// Transform forecast data for charts
const chartData = forecast.map((item) => ({
  x: item.date,
  y: item.predicted_quantity,
  lower: item.lower_bound,
  upper: item.upper_bound,
}));
```

## Troubleshooting

### Debug Mode

Enable detailed logging by setting environment variable:

```bash
export DEBUG=forecasting
```

### Test Endpoints

Use these test commands to verify functionality:

```bash
# Test product forecast
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/forecast/product/VALID_PRODUCT_ID"

# Test vendor forecast
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/forecast/vendor/VALID_VENDOR_ID"
```

### Logs Location

Check server logs for detailed error messages:

- Node.js logs: Console output
- Python errors: Captured in API response

## Support and Maintenance

### Regular Maintenance

1. **Update Dependencies:** Regularly update Prophet and other Python packages
2. **Monitor Performance:** Track API response times and optimize as needed
3. **Data Cleanup:** Periodically clean old order data if storage is a concern

### Scaling Considerations

For high-traffic applications, consider:

1. **Separate Python Service:** Run forecasting as a separate microservice
2. **Queue System:** Use Redis/Bull for background processing
3. **Caching Layer:** Implement Redis caching for frequent forecasts
4. **Load Balancing:** Distribute forecasting load across multiple instances

## Contact

For issues or questions regarding the forecasting feature, please check the server logs and ensure all dependencies are properly installed.
