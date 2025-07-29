const mongoose = require("mongoose");
const Product = require("./models/product.model");

async function debugProducts() {
  try {
    await mongoose.connect("mongodb://localhost:27017/quickmart", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("🔍 DEBUGGING PRODUCT VISIBILITY ISSUE");
    console.log("=====================================\n");

    // 1. Get all products (no filters)
    const allProducts = await Product.find({}).populate(
      "vendorId",
      "name businessName email"
    );
    console.log(`📊 TOTAL PRODUCTS IN DATABASE: ${allProducts.length}\n`);

    // 2. Get recent products (likely your new vendor's products)
    const recentProducts = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("vendorId", "name businessName email");

    console.log("🆕 MOST RECENT PRODUCTS:");
    console.log("========================");
    recentProducts.forEach((product, index) => {
      console.log(`${index + 1}. "${product.name}"`);
      console.log(
        `   📍 Vendor: ${
          product.vendorId?.businessName || product.vendorId?.name || "Unknown"
        }`
      );
      console.log(`   📦 Stock: ${product.stock}`);
      console.log(`   ✅ Available: ${product.isAvailable}`);
      console.log(`   🏷️  Status: ${product.status}`);
      console.log(`   ⭐ Featured: ${product.featured}`);
      console.log(
        `   📅 Created: ${new Date(product.createdAt).toLocaleString()}`
      );
      console.log(`   🆔 ID: ${product._id}`);
      console.log("   ---");
    });

    // 3. Simulate the EXACT filter used by the "All Products" API
    console.log('\n🔍 SIMULATING "ALL PRODUCTS" PAGE FILTER:');
    console.log("=========================================");

    const customerPageQuery = {
      isAvailable: true,
      stock: { $gte: 0 }, // Using the new filter we applied
    };

    const customerVisibleProducts = await Product.find(customerPageQuery)
      .populate("vendorId", "name businessName email")
      .sort({ createdAt: -1 });

    console.log(
      `✅ Products that SHOULD show on "All Products" page: ${customerVisibleProducts.length}`
    );

    if (customerVisibleProducts.length > 0) {
      console.log("\n📋 PRODUCTS THAT SHOULD BE VISIBLE:");
      customerVisibleProducts.slice(0, 10).forEach((product, index) => {
        console.log(
          `${index + 1}. "${product.name}" - Stock: ${
            product.stock
          } - Vendor: ${
            product.vendorId?.businessName || product.vendorId?.name
          }`
        );
      });
    }

    // 4. Find products that are being filtered OUT
    console.log("\n❌ PRODUCTS BEING FILTERED OUT:");
    console.log("===============================");

    const filteredOutProducts = await Product.find({
      $or: [
        { isAvailable: false },
        { isAvailable: { $exists: false } },
        { stock: { $lt: 0 } },
        { stock: { $exists: false } },
      ],
    }).populate("vendorId", "name businessName email");

    if (filteredOutProducts.length > 0) {
      filteredOutProducts.forEach((product, index) => {
        console.log(`${index + 1}. "${product.name}"`);
        console.log(
          `   📍 Vendor: ${
            product.vendorId?.businessName || product.vendorId?.name
          }`
        );
        console.log(
          `   📦 Stock: ${product.stock} ${
            product.stock < 0
              ? "❌ (NEGATIVE)"
              : product.stock === undefined
              ? "❌ (UNDEFINED)"
              : ""
          }`
        );
        console.log(
          `   ✅ Available: ${product.isAvailable} ${
            !product.isAvailable ? "❌ (NOT AVAILABLE)" : ""
          }`
        );
        console.log(`   🏷️  Status: ${product.status}`);
        console.log("   ---");
      });
    } else {
      console.log(
        "✅ No products are being filtered out by availability/stock filters."
      );
    }

    // 5. Check for other potential issues
    console.log("\n🔍 CHECKING FOR OTHER POTENTIAL ISSUES:");
    console.log("======================================");

    // Check for products with unusual status values
    const statusGroups = await Product.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    console.log("📊 Products by Status:");
    statusGroups.forEach((group) => {
      console.log(`   ${group._id}: ${group.count} products`);
    });

    // Check for products with unusual isAvailable values
    const availabilityGroups = await Product.aggregate([
      { $group: { _id: "$isAvailable", count: { $sum: 1 } } },
    ]);

    console.log("\n📊 Products by Availability:");
    availabilityGroups.forEach((group) => {
      console.log(`   ${group._id}: ${group.count} products`);
    });

    // 6. Test the actual API endpoint simulation
    console.log("\n🌐 TESTING API ENDPOINT LOGIC:");
    console.log("==============================");

    // Simulate what happens in the controller
    const query = {};

    // This simulates the filter for non-admin users
    query.isAvailable = true;
    query.stock = { $gte: 0 };

    const apiResult = await Product.find(query)
      .populate("vendorId", "name businessName")
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`🔄 API would return ${apiResult.length} products`);

    if (apiResult.length > 0) {
      console.log("\n📋 FIRST 5 PRODUCTS API WOULD RETURN:");
      apiResult.slice(0, 5).forEach((product, index) => {
        console.log(
          `${index + 1}. "${product.name}" - Stock: ${
            product.stock
          } - Available: ${product.isAvailable}`
        );
      });
    }

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

debugProducts();
