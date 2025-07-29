/**
 * Test script for QuickMart Demand Forecasting Feature
 * Run with: node test_forecasting.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Test data - simulating historical sales
const testSalesData = [
  { date: '2024-06-01', quantity: 10 },
  { date: '2024-06-02', quantity: 12 },
  { date: '2024-06-03', quantity: 8 },
  { date: '2024-06-04', quantity: 15 },
  { date: '2024-06-05', quantity: 11 },
  { date: '2024-06-06', quantity: 13 },
  { date: '2024-06-07', quantity: 9 },
  { date: '2024-06-08', quantity: 14 },
  { date: '2024-06-09', quantity: 16 },
  { date: '2024-06-10', quantity: 12 },
  { date: '2024-06-11', quantity: 18 },
  { date: '2024-06-12', quantity: 20 },
  { date: '2024-06-13', quantity: 15 },
  { date: '2024-06-14', quantity: 17 },
  { date: '2024-06-15', quantity: 19 },
  { date: '2024-06-16', quantity: 22 },
  { date: '2024-06-17', quantity: 16 },
  { date: '2024-06-18', quantity: 14 },
  { date: '2024-06-19', quantity: 21 },
  { date: '2024-06-20', quantity: 18 },
  { date: '2024-06-21', quantity: 25 },
  { date: '2024-06-22', quantity: 23 },
  { date: '2024-06-23', quantity: 20 },
  { date: '2024-06-24', quantity: 24 },
  { date: '2024-06-25', quantity: 26 }
];

const testForecastingService = () => {
  return new Promise((resolve, reject) => {
    console.log('🧪 Testing QuickMart Forecasting Service...\n');
    
    const pythonScriptPath = path.join(__dirname, 'services/forecasting_service.py');
    
    const inputData = {
      sales_data: testSalesData,
      forecast_days: 7,
      product_id: 'test_product_123',
      product_name: 'Test iPhone 14'
    };
    
    console.log('📊 Input Data:');
    console.log(`- Product: ${inputData.product_name}`);
    console.log(`- Historical data points: ${inputData.sales_data.length}`);
    console.log(`- Forecast period: ${inputData.forecast_days} days`);
    console.log(`- Date range: ${testSalesData[0].date} to ${testSalesData[testSalesData.length-1].date}\n`);
    
    const pythonProcess = spawn('python', [pythonScriptPath, JSON.stringify(inputData)]);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Python process failed:');
        console.error(`Exit code: ${code}`);
        console.error(`Error: ${errorData}`);
        reject(new Error(`Python process exited with code ${code}`));
        return;
      }
      
      try {
        const result = JSON.parse(outputData);
        
        if (result.success) {
          console.log('✅ Forecasting Test Successful!\n');
          
          console.log('📈 Forecast Results:');
          console.log(`- Total predicted quantity (7 days): ${result.summary.total_predicted_quantity}`);
          console.log(`- Average daily quantity: ${result.summary.average_daily_quantity}`);
          console.log(`- Historical daily average: ${result.summary.historical_daily_average}`);
          console.log(`- Predicted growth rate: ${result.summary.predicted_growth_rate_percent}%`);
          console.log(`- Data points used: ${result.summary.data_points_used}\n`);
          
          console.log('📅 Daily Forecast:');
          result.forecast.forEach((day, index) => {
            console.log(`Day ${index + 1} (${day.date}): ${day.predicted_quantity} units (${day.lower_bound}-${day.upper_bound})`);
          });
          
          console.log('\n🎯 Recommendations:');
          if (result.summary.predicted_growth_rate_percent > 10) {
            console.log('- Strong growth predicted! Consider increasing inventory.');
          } else if (result.summary.predicted_growth_rate_percent < -10) {
            console.log('- Declining demand predicted. Review marketing strategy.');
          } else {
            console.log('- Stable demand predicted. Maintain current inventory levels.');
          }
          
          const avgPredicted = result.summary.average_daily_quantity;
          const currentStock = 50; // Example current stock
          const daysOfStock = Math.floor(currentStock / avgPredicted);
          
          console.log(`- With current stock of ${currentStock} units, you have ~${daysOfStock} days of inventory.`);
          
          if (daysOfStock < 7) {
            console.log('- ⚠️  LOW STOCK ALERT: Consider reordering soon!');
          }
          
        } else {
          console.error('❌ Forecasting failed:');
          console.error(result.error);
          reject(new Error(result.error));
        }
        
        resolve(result);
        
      } catch (parseError) {
        console.error('❌ Failed to parse Python output:');
        console.error(parseError.message);
        console.error('Raw output:', outputData);
        reject(parseError);
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('❌ Failed to start Python process:');
      console.error(error.message);
      console.error('\n💡 Make sure Python is installed and in your PATH');
      console.error('💡 Install required packages: pip install -r requirements.txt');
      reject(error);
    });
  });
};

// Run the test
console.log('🚀 QuickMart Demand Forecasting Test\n');
console.log('This test will verify that the forecasting service is working correctly.\n');

testForecastingService()
  .then(() => {
    console.log('\n✅ All tests passed! The forecasting service is ready to use.');
    console.log('\n📚 Next steps:');
    console.log('1. Start your Node.js server: npm start');
    console.log('2. Test the API endpoints using the examples in FORECASTING_SETUP.md');
    console.log('3. Integrate forecasting widgets into your vendor dashboard');
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure Python is installed: python --version');
    console.error('2. Install requirements: pip install -r requirements.txt');
    console.error('3. Check the FORECASTING_SETUP.md for detailed instructions');
    process.exit(1);
  });
