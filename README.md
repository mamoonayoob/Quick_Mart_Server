# QuickMart

A comprehensive e-commerce platform with multi-user roles including Customers, Vendors, Delivery Personnel, and Admin.

## Tech Stack

- **Backend**: Express.js, Node.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Image Storage**: Cloudinary
- **Payment Processing**: Stripe
- **Real-time Notifications**: Firebase
- **Architecture**: MVC (Model-View-Controller)

## Features

### Common Features
- User Authentication & Authorization (JWT-based)
- Role-based access control
- Profile management

### Customer Module
- Browse & Search Products
- Order Placement
- Payment Integration
- Order Tracking & Notifications
- Order History
- Product Recommendations

### Vendor Module
- Inventory Management
- Order Fulfillment
- Sales Analytics Dashboard
- Notification System

### Delivery Personnel Module
- Task Assignment & Tracking
- Route Optimization
- Customer Communication
- Status Updates

### Admin Panel
- User Management
- Order Management
- Reports & Analytics
- System Monitoring

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Cloudinary account
- Stripe account
- Firebase project

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd quickmart
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Configure environment variables
   - Rename `.env.example` to `.env`
   - Update the values in `.env` with your credentials

4. Start the development server
   ```
   npm run dev
   ```

5. Access the application
   - Backend API: http://localhost:5000

## API Documentation

### Postman Collection

A Postman collection is included in the repository (`QuickMart-API.postman_collection.json`). Import this collection into Postman to test all API endpoints.

### API Endpoints

#### Authentication Routes
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

#### Product Routes
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get a single product
- `POST /api/products` - Create a product (Vendor only)
- `PUT /api/products/:id` - Update a product (Vendor only)
- `DELETE /api/products/:id` - Delete a product (Vendor only)
- `POST /api/products/:id/reviews` - Add a product review (Customer only)
- `GET /api/products/category/:category` - Get products by category
- `GET /api/products/search` - Search products

#### Order Routes
- `POST /api/orders` - Create a new order (Customer only)
- `GET /api/orders` - Get all orders for current user
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/status` - Update order status (Vendor/Admin)
- `GET /api/orders/history` - Get order history

#### User Routes (Cart & Notifications)
- `GET /api/user/cart` - Get user cart
- `POST /api/user/cart` - Add item to cart
- `PUT /api/user/cart/:productId` - Update cart item quantity
- `DELETE /api/user/cart/:productId` - Remove item from cart
- `DELETE /api/user/cart` - Clear cart
- `GET /api/user/notifications` - Get user notifications
- `PUT /api/user/notifications/:id/read` - Mark notification as read
- `DELETE /api/user/notifications/:id` - Delete notification
- `GET /api/user/wishlist` - Get user wishlist
- `POST /api/user/wishlist` - Add item to wishlist
- `DELETE /api/user/wishlist/:productId` - Remove item from wishlist

#### Payment Routes
- `POST /api/payment/create-payment-intent` - Create payment intent
- `POST /api/payment/webhook` - Handle Stripe webhook events
- `GET /api/payment/config` - Get Stripe publishable key
- `POST /api/payment/refund` - Process refund
- `GET /api/payment/methods` - Get user's saved payment methods

#### Vendor Routes
- `GET /api/vendor/products` - Get vendor products
- `GET /api/vendor/orders` - Get vendor orders
- `GET /api/vendor/analytics` - Get vendor analytics
- `PUT /api/vendor/products/:id/inventory` - Update product inventory
- `GET /api/vendor/inventory/low-stock` - Get low stock alerts

#### Delivery Routes
- `GET /api/delivery/tasks` - Get delivery tasks
- `PUT /api/delivery/tasks/:id/accept` - Accept delivery task
- `PUT /api/delivery/tasks/:id/status` - Update delivery status
- `GET /api/delivery/route/:orderId` - Get optimized route
- `GET /api/delivery/my-tasks` - Get delivery person's current tasks

#### Admin Routes
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/analytics/sales` - Get sales analytics
- `GET /api/admin/analytics/users` - Get user analytics
- `GET /api/admin/analytics/products` - Get product analytics
- `POST /api/admin/users` - Create a new user
- `GET /api/admin/dashboard` - Get admin dashboard data

## License

ISC
