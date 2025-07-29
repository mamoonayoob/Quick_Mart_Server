const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");
const bcrypt = require("bcryptjs");

// Load models
const User = require("./models/user.model");
const Product = require("./models/product.model");
const Category = require("./models/category.model");
const Order = require("./models/order.model");
const Cart = require("./models/cart.model");
const Delivery = require("./models/delivery.model");
const Notification = require("./models/notification.model");

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Sample Users
const users = [
  {
    name: "Admin User",
    email: "admin@example.com",
    password: bcrypt.hashSync("123456", 10),
    role: "admin",
    phone: "+1234567890",
    adminLevel: "super",
    address: {
      street: "123 Admin St",
      city: "Admin City",
      state: "Admin State",
      postalCode: "12345",
      country: "USA",
    },
  },
  {
    name: "Vendor User",
    email: "vendor@example.com",
    password: bcrypt.hashSync("123456", 10),
    role: "vendor",
    phone: "+1234567891",
    businessName: "Vendor Store",
    businessDescription: "A store that sells various products",
    businessLogo: "default-business-logo.jpg",
    address: {
      street: "123 Vendor St",
      city: "Vendor City",
      state: "Vendor State",
      postalCode: "12345",
      country: "USA",
    },
  },
  {
    name: "Delivery User",
    email: "delivery@example.com",
    password: bcrypt.hashSync("123456", 10),
    role: "delivery",
    phone: "+1234567892",
    vehicleType: "car",
    licenseNumber: "ABC123",
    address: {
      street: "123 Delivery St",
      city: "Delivery City",
      state: "Delivery State",
      postalCode: "12345",
      country: "USA",
    },
  },
  {
    name: "Customer User",
    email: "customer@example.com",
    password: bcrypt.hashSync("123456", 10),
    role: "customer",
    phone: "+1234567893",
    address: {
      street: "123 Customer St",
      city: "Customer City",
      state: "Customer State",
      postalCode: "12345",
      country: "USA",
    },
  },
];

// Sample Categories
const categories = [
  {
    name: "electronics",
    description: "Electronic devices and accessories",
    icon: "laptop",
  },
  {
    name: "clothing",
    description: "Apparel and fashion items",
    icon: "tshirt",
  },
  {
    name: "household",
    description: "Home appliances and kitchen items",
    icon: "home",
  },
  {
    name: "books",
    description: "Books and educational materials",
    icon: "book",
  },
  {
    name: "sports",
    description: "Sports equipment and outdoor gear",
    icon: "basketball-ball",
  },
];

// Sample Products
const products = [
  {
    name: "iPhone 13 Pro",
    description: "Latest iPhone with advanced features",
    price: 999.99,
    category: "electronics",
    stock: 50,
    isAvailable: true,
    image: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    supportImages: [
      "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    ],
    brand: "Apple",
    rating: 4.8,
    numReviews: 12,
    status: "Active",
    reviews: [
      {
        user: null, // Will be set dynamically
        rating: 5,
        comment: "Excellent product, very satisfied!",
      },
    ],
    specifications: {
      processor: "A15 Bionic",
      storage: "128GB",
      camera: "12MP",
      display: "6.1 inches",
    },
  },
  {
    name: "Samsung Galaxy S21",
    description: "Flagship Android smartphone",
    price: 799.99,
    category: "electronics",
    stock: 40,
    isAvailable: true,
    image: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    supportImages: [
      "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    ],
    brand: "Samsung",
    rating: 4.5,
    numReviews: 10,
    status: "Active",
    reviews: [],
    specifications: {
      processor: "Snapdragon 888",
      storage: "128GB",
      camera: "64MP",
      display: "6.2 inches",
    },
  },
  {
    name: "Nike Air Max",
    description: "Comfortable running shoes",
    price: 129.99,
    category: "clothing",
    stock: 100,
    isAvailable: true,
    image: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    supportImages: [
      "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    ],
    brand: "Nike",
    rating: 4.2,
    numReviews: 8,
    status: "Active",
    reviews: [],
    specifications: {
      material: "Synthetic",
      color: "Black/White",
      size: "US 9-12",
    },
  },
  {
    name: "Instant Pot Duo",
    description: "Multi-use pressure cooker",
    price: 89.99,
    category: "household",
    stock: 30,
    isAvailable: true,
    image: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    supportImages: [
      "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    ],
    brand: "Instant Pot",
    rating: 4.7,
    numReviews: 15,
    status: "Active",
    reviews: [],
    specifications: {
      capacity: "6 Quart",
      programs: "7-in-1",
      material: "Stainless Steel",
    },
  },
  {
    name: "The Alchemist",
    description: "Novel by Paulo Coelho",
    price: 14.99,
    category: "books",
    stock: 200,
    isAvailable: true,
    image: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    supportImages: [
      "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    ],
    brand: "HarperOne",
    rating: 4.9,
    numReviews: 20,
    status: "Active",
    reviews: [],
    specifications: {
      author: "Paulo Coelho",
      pages: 208,
      language: "English",
      format: "Paperback",
    },
  },
];

// Sample Orders
const orders = [
  {
    // Will be populated dynamically
    orderItems: [],
    shippingAddress: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA",
    },
    paymentMethod: "card",
    itemsPrice: 999.99,
    taxPrice: 100.0,
    shippingPrice: 10.0,
    totalPrice: 1109.99,
    paymentStatus: "completed",
    orderStatus: "delivered",
    deliveryType: "standard",
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isPaid: true,
    paidAt: new Date(),
    isDelivered: true,
    deliveredAt: new Date(),
  },
  {
    // Will be populated dynamically
    orderItems: [],
    shippingAddress: {
      street: "456 Elm St",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90001",
      country: "USA",
    },
    paymentMethod: "cod",
    itemsPrice: 129.99,
    taxPrice: 13.0,
    shippingPrice: 5.0,
    totalPrice: 147.99,
    paymentStatus: "pending",
    orderStatus: "confirmed",
    deliveryType: "express",
    expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    isPaid: false,
  },
];

// Sample Carts
const carts = [
  {
    // Will be populated dynamically
    items: [],
    totalAmount: 0,
  },
];

// Sample Deliveries
const deliveries = [
  {
    // Will be populated dynamically
    status: "assigned",
    currentLocation: {
      latitude: 40.7128,
      longitude: -74.006,
      timestamp: new Date(),
    },
    locationHistory: [
      {
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
      },
    ],
    estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000),
    isAccepted: true,
    acceptedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
];

// Sample Notifications
const notifications = [
  {
    // Will be populated dynamically
    type: "order",
    title: "Order Placed",
    message: "Your order has been placed successfully!",
    isRead: false,
  },
  {
    // Will be populated dynamically
    type: "delivery",
    title: "Delivery Update",
    message: "Your order is out for delivery!",
    isRead: false,
  },
  {
    // Will be populated dynamically
    type: "payment",
    title: "Payment Successful",
    message: "Your payment has been processed successfully!",
    isRead: true,
  },
];

// Import data into DB
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await Order.deleteMany();
    await Cart.deleteMany();
    await Delivery.deleteMany();
    await Notification.deleteMany();

    // Insert categories
    const createdCategories = await Category.insertMany(categories);
    console.log(
      `${createdCategories.length} categories imported`.green.inverse
    );

    // Insert users
    const createdUsers = await User.insertMany(users);
    console.log(`${createdUsers.length} users imported`.green.inverse);

    // Get user IDs
    const adminUser = createdUsers.find((user) => user.role === "admin");
    const vendorUser = createdUsers.find((user) => user.role === "vendor");
    const deliveryUser = createdUsers.find((user) => user.role === "delivery");
    const customerUser = createdUsers.find((user) => user.role === "customer");

    // Update products with user IDs for reviews and categories
    const productsWithUserAndCategory = products.map((product) => {
      // Find category ID
      const category = createdCategories.find(
        (cat) => cat.name === product.category
      );

      // Update reviews with user ID
      const updatedReviews = product.reviews.map((review) => {
        return { ...review, user: customerUser._id };
      });

      return {
        ...product,
        category: product.category,
        reviews: updatedReviews,
        vendorId: vendorUser._id, // Assign to vendor
      };
    });

    // Insert products
    const createdProducts = await Product.insertMany(
      productsWithUserAndCategory
    );
    console.log(`${createdProducts.length} products imported`.green.inverse);

    // Create cart items
    const cartItems = [
      {
        product: createdProducts[0]._id,
        quantity: 1,
        price: createdProducts[0].price,
      },
      {
        product: createdProducts[1]._id,
        quantity: 2,
        price: createdProducts[1].price,
      },
    ];

    // Update carts with user IDs and items
    const cartsWithUserAndItems = carts.map((cart) => {
      return {
        ...cart,
        user: customerUser._id,
        items: cartItems,
        totalAmount: cartItems.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        ),
      };
    });

    // Insert carts
    const createdCarts = await Cart.insertMany(cartsWithUserAndItems);
    console.log(`${createdCarts.length} carts imported`.green.inverse);

    // Create order items
    const orderItems = [
      {
        product: createdProducts[0]._id,
        name: createdProducts[0].name,
        quantity: 1,
        price: createdProducts[0].price,
        image: createdProducts[0].images[0],
      },
      {
        product: createdProducts[2]._id,
        name: createdProducts[2].name,
        quantity: 1,
        price: createdProducts[2].price,
        image: createdProducts[2].images[0],
      },
    ];

    // Update orders with user IDs and items
    const ordersWithUserAndItems = orders.map((order, index) => {
      return {
        ...order,
        user: customerUser._id,
        orderItems: index === 0 ? [orderItems[0]] : [orderItems[1]],
        vendorId: vendorUser._id,
        deliveryPersonId: index === 0 ? deliveryUser._id : null,
      };
    });

    // Insert orders
    const createdOrders = await Order.insertMany(ordersWithUserAndItems);
    console.log(`${createdOrders.length} orders imported`.green.inverse);

    // Update deliveries with order and user IDs
    const deliveriesWithOrderAndUser = deliveries.map((delivery) => {
      return {
        ...delivery,
        order: createdOrders[0]._id,
        deliveryPerson: deliveryUser._id,
      };
    });

    // Insert deliveries
    const createdDeliveries = await Delivery.insertMany(
      deliveriesWithOrderAndUser
    );
    console.log(
      `${createdDeliveries.length} deliveries imported`.green.inverse
    );

    // Update notifications with user IDs and related items
    const notificationsWithUserAndRelated = notifications.map(
      (notification, index) => {
        let relatedTo = null;
        let onModel = null;

        if (index === 0 || index === 1) {
          relatedTo = createdOrders[0]._id;
          onModel = "Order";
        } else {
          relatedTo = createdProducts[0]._id;
          onModel = "Product";
        }

        return {
          ...notification,
          user: customerUser._id,
          relatedTo,
          onModel,
          data: { id: relatedTo },
        };
      }
    );

    // Insert notifications
    const createdNotifications = await Notification.insertMany(
      notificationsWithUserAndRelated
    );
    console.log(
      `${createdNotifications.length} notifications imported`.green.inverse
    );

    console.log("Data Import Success!".green.inverse);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

// Delete all data from DB
const destroyData = async () => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await Order.deleteMany();
    await Cart.deleteMany();
    await Delivery.deleteMany();
    await Notification.deleteMany();

    console.log("Data Destroyed!".red.inverse);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

// Check command line argument to determine action
if (process.argv[2] === "-d") {
  destroyData();
} else {
  importData();
}
