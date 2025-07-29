const mongoose = require('mongoose');
const Product = require('./models/product.model');

async function checkProducts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/quickmart', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Get the most recent products (likely your new vendor's products)
    const recentProducts = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('vendorId', 'name businessName email');
    
    console.log('\n=== RECENT PRODUCTS ===');
    recentProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   Vendor: ${product.vendorId?.businessName || product.vendorId?.name}`);
      console.log(`   Stock: ${product.stock}`);
      console.log(`   isAvailable: ${product.isAvailable}`);
      console.log(`   Status: ${product.status}`);
      console.log(`   Featured: ${product.featured}`);
      console.log(`   Created: ${product.createdAt}`);
    });
    
    // Check products that would be filtered out from "All Products" page
    console.log('\n=== PRODUCTS FILTERED OUT FROM ALL PRODUCTS PAGE ===');
    const filteredOutProducts = await Product.find({
      $or: [
        { isAvailable: false },
        { stock: { $lte: 0 } }
      ]
    }).populate('vendorId', 'name businessName email');
    
    if (filteredOutProducts.length > 0) {
      filteredOutProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Vendor: ${product.vendorId?.businessName || product.vendorId?.name}`);
        console.log(`   Stock: ${product.stock} (ISSUE: Stock <= 0)`);
        console.log(`   isAvailable: ${product.isAvailable} ${!product.isAvailable ? '(ISSUE: Not Available)' : ''}`);
        console.log(`   Status: ${product.status}`);
      });
    } else {
      console.log('No products are being filtered out.');
    }
    
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProducts();
