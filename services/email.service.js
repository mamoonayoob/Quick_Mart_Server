const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise<Object>} - Nodemailer send mail response
 */
exports.sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `QuickMart <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send welcome email to new user
 * @param {string} to - Recipient email address
 * @param {string} name - User's name
 * @returns {Promise<Object>} - Nodemailer send mail response
 */
exports.sendWelcomeEmail = async (to, name) => {
  const subject = 'Welcome to QuickMart!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to QuickMart, ${name}!</h2>
      <p>Thank you for joining our platform. We're excited to have you as a member of our community.</p>
      <p>With QuickMart, you can:</p>
      <ul>
        <li>Browse thousands of products from various vendors</li>
        <li>Place orders with ease</li>
        <li>Track your deliveries in real-time</li>
        <li>Manage your profile and preferences</li>
      </ul>
      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      <p>Happy shopping!</p>
      <p>The QuickMart Team</p>
    </div>
  `;

  return exports.sendEmail(to, subject, html);
};

/**
 * Send order confirmation email
 * @param {string} to - Recipient email address
 * @param {string} name - User's name
 * @param {Object} order - Order object
 * @returns {Promise<Object>} - Nodemailer send mail response
 */
exports.sendOrderConfirmationEmail = async (to, name, order) => {
  const subject = `Order Confirmation #${order._id}`;
  
  // Generate order items HTML
  let orderItemsHtml = '';
  order.orderItems.forEach(item => {
    orderItemsHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `;
  });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Confirmation</h2>
      <p>Hello ${name},</p>
      <p>Thank you for your order! We've received your order and it's being processed.</p>
      
      <h3>Order Details</h3>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <p><strong>Delivery Type:</strong> ${order.deliveryType}</p>
      
      <h3>Items</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: left;">Quantity</th>
            <th style="padding: 10px; text-align: left;">Price</th>
            <th style="padding: 10px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${orderItemsHtml}
        </tbody>
      </table>
      
      <h3>Order Summary</h3>
      <p><strong>Items Total:</strong> $${order.itemsPrice.toFixed(2)}</p>
      <p><strong>Tax:</strong> $${order.taxPrice.toFixed(2)}</p>
      <p><strong>Shipping:</strong> $${order.shippingPrice.toFixed(2)}</p>
      <p><strong>Order Total:</strong> $${order.totalPrice.toFixed(2)}</p>
      
      <h3>Shipping Address</h3>
      <p>${order.shippingAddress.street}</p>
      <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
      <p>${order.shippingAddress.country}</p>
      
      <p>You will receive updates about your order status via email and in-app notifications.</p>
      <p>Thank you for shopping with QuickMart!</p>
    </div>
  `;

  return exports.sendEmail(to, subject, html);
};

/**
 * Send order status update email
 * @param {string} to - Recipient email address
 * @param {string} name - User's name
 * @param {Object} order - Order object
 * @param {string} status - New order status
 * @returns {Promise<Object>} - Nodemailer send mail response
 */
exports.sendOrderStatusUpdateEmail = async (to, name, order, status) => {
  const subject = `Order #${order._id} Status Update`;
  
  let statusMessage = '';
  switch (status) {
    case 'confirmed':
      statusMessage = 'Your order has been confirmed and is being prepared.';
      break;
    case 'preparing':
      statusMessage = 'Your order is currently being prepared by the vendor.';
      break;
    case 'dispatched':
      statusMessage = 'Your order has been dispatched and is on its way to you.';
      break;
    case 'delivered':
      statusMessage = 'Your order has been delivered. We hope you enjoy your purchase!';
      break;
    case 'cancelled':
      statusMessage = 'Your order has been cancelled. If you did not request this cancellation, please contact customer support.';
      break;
    default:
      statusMessage = `Your order status has been updated to ${status}.`;
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Status Update</h2>
      <p>Hello ${name},</p>
      <p>${statusMessage}</p>
      
      <h3>Order Details</h3>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
      <p><strong>Current Status:</strong> ${status}</p>
      
      <p>You can track your order in real-time through the QuickMart app or website.</p>
      <p>Thank you for shopping with QuickMart!</p>
    </div>
  `;

  return exports.sendEmail(to, subject, html);
};

/**
 * Send password reset email
 * @param {string} to - Recipient email address
 * @param {string} name - User's name
 * @param {string} resetToken - Password reset token
 * @returns {Promise<Object>} - Nodemailer send mail response
 */
exports.sendPasswordResetEmail = async (to, name, resetToken) => {
  const subject = 'Password Reset Request';
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>You requested a password reset for your QuickMart account. Please click the button below to reset your password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      
      <p>If you did not request this password reset, please ignore this email or contact our support team if you have concerns.</p>
      <p>This link will expire in 10 minutes.</p>
      <p>Thank you,</p>
      <p>The QuickMart Team</p>
    </div>
  `;

  return exports.sendEmail(to, subject, html);
};
