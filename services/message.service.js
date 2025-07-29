const Message = require("../models/message.model");
const User = require("../models/user.model");
const Order = require("../models/order.model");
const firebaseService = require("./firebase.service");

/**
 * Send a message from customer to vendor
 * @param {string} customerId - Customer ID sending the message
 * @param {string} orderId - Order ID related to the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendCustomerToVendorMessage = async (customerId, orderId, content) => {
  try {
    // Verify order exists and belongs to the customer
    const order = await Order.findOne({ _id: orderId, user: customerId });
    if (!order) {
      throw new Error("Order not found or does not belong to this customer");
    }

    // Get vendor ID from order
    const vendorId = order.vendorId;

    // Create message
    const message = await Message.create({
      sender: customerId,
      receiver: vendorId,
      content,
      orderId,
      messageType: "customer-to-vendor",
      isRead: false,
    });

    // Send notification to vendor
    await firebaseService.sendNotification(
      vendorId,
      "New Customer Message",
      `You have a new message regarding order #${order._id
        .toString()
        .slice(-6)}`,
      {
        type: "message",
        orderId: orderId,
        messageId: message._id,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending customer to vendor message:", error);
    throw error;
  }
};

/**
 * Send a message from vendor to customer
 * @param {string} vendorId - Vendor ID sending the message
 * @param {string} orderId - Order ID related to the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendVendorToCustomerMessage = async (vendorId, orderId, content) => {
  try {
    // Verify order exists and belongs to the vendor
    const order = await Order.findOne({ _id: orderId, vendorId });
    if (!order) {
      throw new Error("Order not found or does not belong to this vendor");
    }

    // Get customer ID from order
    const customerId = order.user;

    // Create message
    const message = await Message.create({
      sender: vendorId,
      receiver: customerId,
      content,
      orderId,
      messageType: "vendor-to-customer",
      isRead: false,
    });

    // Send notification to customer
    await firebaseService.sendNotification(
      customerId,
      "New Vendor Message",
      `You have a new message regarding your order #${order._id
        .toString()
        .slice(-6)}`,
      {
        type: "message",
        orderId: orderId,
        messageId: message._id,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending vendor to customer message:", error);
    throw error;
  }
};

/**
 * Send a message from customer to admin
 * @param {string} customerId - Customer ID sending the message
 * @param {string} content - Message content
 * @param {string} orderId - Optional order ID related to the message
 * @returns {Promise<Object>} - Created message object
 */
exports.sendCustomerToAdminMessage = async (
  customerId,
  content,
  orderId = null
) => {
  try {
    // Find all admin users
    const admins = await User.find({ role: "admin", isActive: true }).select(
      "_id"
    );
    const adminIds = admins.map((admin) => admin._id);

    if (adminIds.length === 0) {
      throw new Error("No active admin users found");
    }

    // Create message (without specific receiver, will be sent to all admins)
    const message = await Message.create({
      sender: customerId,
      content,
      orderId,
      messageType: "customer-to-admin",
      isRead: false,
      adminRecipients: adminIds,
    });

    // Send notification to all admins
    for (const adminId of adminIds) {
      await firebaseService.sendNotification(
        adminId,
        "New Customer Support Message",
        `A customer has sent a new support message`,
        {
          type: "message",
          orderId: orderId,
          messageId: message._id,
        }
      );
    }

    return message;
  } catch (error) {
    console.error("Error sending customer to admin message:", error);
    throw error;
  }
};

/**
 * Send a message from admin to customer
 * @param {string} adminId - Admin ID sending the message
 * @param {string} customerId - Customer ID to receive the message
 * @param {string} content - Message content
 * @param {string} orderId - Optional order ID related to the message
 * @returns {Promise<Object>} - Created message object
 */
exports.sendAdminToCustomerMessage = async (
  adminId,
  customerId,
  content,
  orderId = null
) => {
  try {
    // Verify admin exists and is active
    const admin = await User.findOne({
      _id: adminId,
      role: "admin",
      isActive: true,
    });
    if (!admin) {
      throw new Error("Admin not found or is not active");
    }

    // Verify customer exists
    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Create message
    const message = await Message.create({
      sender: adminId,
      receiver: customerId,
      content,
      orderId,
      messageType: "admin-to-customer",
      isRead: false,
    });

    // Send notification to customer
    await firebaseService.sendNotification(
      customerId,
      "New Admin Message",
      `You have a new message from support`,
      {
        type: "message",
        orderId: orderId,
        messageId: message._id,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending admin to customer message:", error);
    throw error;
  }
};

/**
 * Send a message from admin to all admins
 * @param {string} adminId - Admin ID sending the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendAdminToAdminsMessage = async (adminId, content) => {
  try {
    // Verify admin exists and is active
    const admin = await User.findOne({
      _id: adminId,
      role: "admin",
      isActive: true,
    });
    if (!admin) {
      throw new Error("Admin not found or is not active");
    }

    // Find all other admin users
    const admins = await User.find({
      role: "admin",
      isActive: true,
      _id: { $ne: adminId }, // Exclude the sender
    }).select("_id");

    const adminIds = admins.map((admin) => admin._id);

    if (adminIds.length === 0) {
      throw new Error("No other active admin users found");
    }

    // Create message
    const message = await Message.create({
      sender: adminId,
      content,
      messageType: "admin-to-admin",
      isRead: false,
      adminRecipients: adminIds,
    });

    // Send notification to all admins
    for (const recipientId of adminIds) {
      await firebaseService.sendNotification(
        recipientId,
        "New Admin Message",
        `An admin has sent a new message to all admins`,
        {
          type: "message",
          messageId: message._id,
        }
      );
    }

    return message;
  } catch (error) {
    console.error("Error sending admin to admins message:", error);
    throw error;
  }
};

/**
 * Get vendor by order ID
 * @param {string} orderId - Order ID to get vendor for
 * @returns {Promise<Object>} - Vendor object
 */
exports.getVendorByOrderId = async (orderId) => {
  try {
    const order = await Order.findById(orderId).populate(
      "vendorId",
      "name email phone businessName businessLogo"
    );

    if (!order) {
      throw new Error("Order not found");
    }

    return order.vendorId;
  } catch (error) {
    console.error("Error getting vendor by order ID:", error);
    throw error;
  }
};

/**
 * Get messages for a specific order
 * @param {string} orderId - Order ID to get messages for
 * @param {string} userId - User ID requesting the messages
 * @returns {Promise<Array>} - Array of message objects
 */
exports.getMessagesByOrderId = async (orderId, userId) => {
  try {
    // Verify user has access to this order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Check if user is customer, vendor, or admin
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    let query = { orderId };

    // If user is customer, they should only see messages they're involved in
    if (user.role === "customer") {
      if (!order.user.equals(userId)) {
        throw new Error("Access denied: This order does not belong to you");
      }
    }
    // If user is vendor, they should only see messages for orders they're assigned to
    else if (user.role === "vendor") {
      if (!order.vendorId.equals(userId)) {
        throw new Error("Access denied: This order is not assigned to you");
      }
    }
    // Admins can see all messages

    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .populate("sender", "name role profileImage businessName businessLogo")
      .populate("receiver", "name role profileImage businessName businessLogo");

    return messages;
  } catch (error) {
    console.error("Error getting messages by order ID:", error);
    throw error;
  }
};

/**
 * Get all admin messages for an admin
 * @param {string} adminId - Admin ID to get messages for
 * @returns {Promise<Array>} - Array of message objects
 */
exports.getAdminMessages = async (adminId) => {
  try {
    // Verify admin exists and is active
    const admin = await User.findOne({
      _id: adminId,
      role: "admin",
      isActive: true,
    });
    if (!admin) {
      throw new Error("Admin not found or is not active");
    }

    // Get messages where admin is recipient or sender
    const messages = await Message.find({
      $or: [
        { sender: adminId },
        { receiver: adminId },
        { adminRecipients: adminId },
      ],
      messageType: {
        $in: ["customer-to-admin", "admin-to-customer", "admin-to-admin"],
      },
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name role profileImage")
      .populate("receiver", "name role profileImage");

    return messages;
  } catch (error) {
    console.error("Error getting admin messages:", error);
    throw error;
  }
};

/**
 * Get all customer messages
 * @param {string} customerId - Customer ID to get messages for
 * @returns {Promise<Array>} - Array of message objects
 */
exports.getCustomerMessages = async (customerId) => {
  try {
    // Verify customer exists
    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Get messages where customer is recipient or sender
    const messages = await Message.find({
      $or: [{ sender: customerId }, { receiver: customerId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name role profileImage businessName businessLogo")
      .populate("receiver", "name role profileImage businessName businessLogo")
      .populate("orderId", "orderStatus");

    return messages;
  } catch (error) {
    console.error("Error getting customer messages:", error);
    throw error;
  }
};

/**
 * Get all vendor messages
 * @param {string} vendorId - Vendor ID to get messages for
 * @returns {Promise<Array>} - Array of message objects
 */
exports.getVendorMessages = async (vendorId) => {
  try {
    // Verify vendor exists
    const vendor = await User.findOne({ _id: vendorId, role: "vendor" });
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Get messages where vendor is recipient or sender
    const messages = await Message.find({
      $or: [{ sender: vendorId }, { receiver: vendorId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name role profileImage")
      .populate("receiver", "name role profileImage")
      .populate("orderId", "orderStatus");

    return messages;
  } catch (error) {
    console.error("Error getting vendor messages:", error);
    throw error;
  }
};

/**
 * Mark message as read
 * @param {string} messageId - Message ID to mark as read
 * @param {string} userId - User ID marking the message as read
 * @returns {Promise<Object>} - Updated message object
 */
exports.markMessageAsRead = async (messageId, userId) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is the intended receiver
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // For admin-to-admin messages, handle multiple recipients
    if (message.messageType === "admin-to-admin" && user.role === "admin") {
      // Check if admin is in recipients and hasn't read it yet
      if (
        message.adminRecipients.includes(userId) &&
        !message.readByAdmins.some((item) => item.adminId.equals(userId))
      ) {
        // Add admin to readByAdmins array
        message.readByAdmins.push({
          adminId: userId,
          readAt: new Date(),
        });

        // If all admins have read it, mark as read
        if (message.readByAdmins.length === message.adminRecipients.length) {
          message.isRead = true;
          message.readAt = new Date();
        }

        await message.save();
        return message;
      }
    }
    // For customer-to-admin messages, any admin can mark as read
    else if (
      message.messageType === "customer-to-admin" &&
      user.role === "admin"
    ) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
      return message;
    }

    // For regular messages, only the receiver can mark as read
    else if (message.receiver && message.receiver.equals(userId)) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
      return message;
    } else {
      console.log("message", message);
      console.log("user", userId);
      throw new Error("You are not authorized to mark this message as read");
    }

    return message;
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
};

/**
 * Send general message from admin to delivery user
 * @param {string} adminId - Admin ID sending the message
 * @param {string} deliveryId - Delivery user ID receiving the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralAdminToDeliveryMessage = async (
  adminId,
  deliveryId,
  content
) => {
  try {
    // Verify admin exists
    const admin = await User.findOne({ _id: adminId, role: "admin" });
    if (!admin) {
      throw new Error("Admin not found");
    }

    // Verify delivery user exists
    const delivery = await User.findOne({ _id: deliveryId, role: "delivery" });
    if (!delivery) {
      throw new Error("Delivery user not found");
    }

    // Create message
    const message = await Message.create({
      sender: adminId,
      receiver: deliveryId,
      content,
      messageType: "general",
      isRead: false,
    });

    // Send notification to delivery user
    await firebaseService.sendNotification(
      deliveryId,
      "New Admin Message",
      `You have a new message from admin ${admin.name}`,
      {
        type: "message",
        messageId: message._id,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending admin to delivery message:", error);
    throw error;
  }
};

/**
 * Send general message from admin to vendor
 * @param {string} adminId - Admin ID sending the message
 * @param {string} vendorId - Vendor ID receiving the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralAdminToVendorMessage = async (
  adminId,
  vendorId,
  content
) => {
  try {
    // Verify admin exists
    const admin = await User.findOne({ _id: adminId, role: "admin" });
    if (!admin) {
      throw new Error("Admin not found");
    }

    // Verify vendor user exists
    const vendor = await User.findOne({ _id: vendorId, role: "vendor" });
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Create message
    const message = await Message.create({
      sender: adminId,
      receiver: vendorId,
      content,
      messageType: "general",
      isRead: false,
    });

    // Send notification to vendor
    await firebaseService.sendNotification(
      vendorId,
      "New Admin Message",
      `You have a new message from admin ${admin.name}`,
      {
        type: "message",
        messageId: message._id,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending admin to vendor message:", error);
    throw error;
  }
};

/**
 * Send general message from admin to customer
 * @param {string} adminId - Admin ID sending the message
 * @param {string} customerId - Customer ID receiving the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralAdminToCustomerMessage = async (
  adminId,
  customerId,
  content
) => {
  try {
    console.log(
      `🛡️ Service: Admin ${adminId} sending general message to customer ${customerId}`
    );

    // Verify admin exists
    const admin = await User.findOne({ _id: adminId, role: "admin" });
    if (!admin) {
      throw new Error("Admin not found");
    }

    // Verify customer user exists
    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Create message
    const message = await Message.create({
      sender: adminId,
      receiver: customerId,
      content,
      messageType: "general",
      isRead: false,
    });

    console.log(`✅ Admin-to-customer message created with ID: ${message._id}`);

    // Send notification to customer
    await firebaseService.sendNotification(
      customerId,
      "New Admin Message",
      `You have a new message from admin ${admin.name}`,
      {
        type: "message",
        messageId: message._id,
      }
    );

    return message;
  } catch (error) {
    console.error("❌ Error sending admin to customer message:", error);
    throw error;
  }
};

/**
 * Get unread message count
 * @param {string} userId - User ID to get unread count for
 * @returns {Promise<Number>} - Number of unread messages
 */
exports.getUnreadMessageCount = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    let query = {};

    if (user.role === "admin") {
      query = {
        $or: [
          { receiver: userId, isRead: false },
          { adminRecipients: userId, isRead: false },
        ],
      };
    } else {
      query = { receiver: userId, isRead: false };
    }

    const count = await Message.countDocuments(query);
    return count;
  } catch (error) {
    console.error("Error getting unread message count:", error);
    throw error;
  }
};

// ============================================
// ENHANCED GENERAL MESSAGING FUNCTIONS
// ============================================

/**
 * Send a general message from customer to vendor (not order-based)
 * @param {string} customerId - Customer ID sending the message
 * @param {string} vendorId - Vendor ID to receive the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralCustomerToVendorMessage = async (
  customerId,
  vendorId,
  content
) => {
  try {
    // Verify customer exists
    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Verify vendor exists
    const vendor = await User.findOne({ _id: vendorId, role: "vendor" });
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Create general message (no orderId)
    const message = await Message.create({
      sender: customerId,
      receiver: vendorId,
      content,
      messageType: "customer-to-vendor-general",
      isRead: false,
    });

    // Send notification to vendor
    await firebaseService.sendNotification(
      vendorId,
      "New Customer Message",
      `${customer.name} sent you a message`,
      {
        type: "general-message",
        messageId: message._id,
        senderId: customerId,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending general customer to vendor message:", error);
    throw error;
  }
};

/**
 * Send a general message from vendor to customer (not order-based)
 * @param {string} vendorId - Vendor ID sending the message
 * @param {string} customerId - Customer ID to receive the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralVendorToCustomerMessage = async (
  vendorId,
  customerId,
  content
) => {
  try {
    // Verify vendor exists
    const vendor = await User.findOne({ _id: vendorId, role: "vendor" });
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Verify customer exists
    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Create general message (no orderId)
    const message = await Message.create({
      sender: vendorId,
      receiver: customerId,
      content,
      messageType: "vendor-to-customer-general",
      isRead: false,
    });

    // Send notification to customer
    await firebaseService.sendNotification(
      customerId,
      "New Vendor Message",
      `${vendor.businessName || vendor.name} sent you a message`,
      {
        type: "general-message",
        messageId: message._id,
        senderId: vendorId,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending general vendor to customer message:", error);
    throw error;
  }
};

/**
 * Get customer conversations (both general and order-based)
 * @param {string} customerId - Customer ID to get conversations for
 * @returns {Promise<Array>} - Array of conversation objects
 */
exports.getCustomerConversations = async (customerId) => {
  try {
    // Verify customer exists
    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Get all messages where customer is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: customerId }, { receiver: customerId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name role profileImage businessName businessLogo")
      .populate("receiver", "name role profileImage businessName businessLogo")
      .populate("orderId", "orderStatus _id");

    // Group messages by conversation partner
    const conversations = {};

    messages.forEach((message) => {
      const partnerId = message.sender._id.equals(customerId)
        ? message.receiver._id.toString()
        : message.sender._id.toString();

      const partner = message.sender._id.equals(customerId)
        ? message.receiver
        : message.sender;

      if (!conversations[partnerId]) {
        conversations[partnerId] = {
          partnerId,
          partner,
          messages: [],
          lastMessage: null,
          unreadCount: 0,
          isGeneral: !message.orderId,
        };
      }

      conversations[partnerId].messages.push(message);

      // Update last message
      if (
        !conversations[partnerId].lastMessage ||
        message.createdAt > conversations[partnerId].lastMessage.createdAt
      ) {
        conversations[partnerId].lastMessage = message;
      }

      // Count unread messages
      if (!message.isRead && message.receiver._id.equals(customerId)) {
        conversations[partnerId].unreadCount++;
      }
    });

    return Object.values(conversations);
  } catch (error) {
    console.error("Error getting customer conversations:", error);
    throw error;
  }
};

// First implementation of getVendorConversations removed to avoid duplication
// Using the newer implementation below (around line 1734)

/**
 * Get conversation history between two users
 * @param {string} userId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @returns {Promise<Array>} - Array of messages in conversation
 */
exports.getConversationHistory = async (userId, otherUserId) => {
  try {
    // Verify both users exist
    const user = await User.findById(userId);
    const otherUser = await User.findById(otherUserId);

    if (!user || !otherUser) {
      throw new Error("One or both users not found");
    }

    // Get all messages between these two users
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name role profileImage businessName businessLogo")
      .populate("receiver", "name role profileImage businessName businessLogo")
      .populate("orderId", "orderStatus _id");

    return messages;
  } catch (error) {
    console.error("Error getting conversation history:", error);
    throw error;
  }
};

/**
 * Get vendors directory for customers to browse
 * @returns {Promise<Array>} - Array of vendor objects
 */
exports.getVendorsDirectory = async () => {
  try {
    const vendors = await User.find({
      role: "vendor",
      isActive: true,
    })
      .select(
        "name email businessName businessDescription businessLogo profileImage createdAt"
      )
      .sort({ businessName: 1 });

    // Get additional stats for each vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        // Get product count
        const Product = require("../models/product.model");
        const productCount = await Product.countDocuments({
          vendorId: vendor._id,
          isAvailable: true,
        });

        // Get order count
        const orderCount = await Order.countDocuments({
          vendorId: vendor._id,
        });

        return {
          ...vendor.toObject(),
          stats: {
            productCount,
            orderCount,
            joinedDate: vendor.createdAt,
          },
        };
      })
    );

    return vendorsWithStats;
  } catch (error) {
    console.error("Error getting vendors directory:", error);
    throw error;
  }
};

/**
 * Get customers directory for vendors to browse
 * @returns {Promise<Array>} - Array of customer objects
 */
exports.getCustomersDirectory = async () => {
  try {
    const customers = await User.find({
      role: "customer",
      isActive: true,
    })
      .select("name email profileImage createdAt")
      .sort({ name: 1 });

    // Get additional stats for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        // Get order count
        const orderCount = await Order.countDocuments({
          user: customer._id,
        });

        return {
          ...customer.toObject(),
          stats: {
            orderCount,
            joinedDate: customer.createdAt,
          },
        };
      })
    );

    return customersWithStats;
  } catch (error) {
    console.error("Error getting customers directory:", error);
    throw error;
  }
};

/**
 * Get admins directory for messaging
 * @returns {Promise<Array>} - Array of admin objects
 */
exports.getAdminsDirectory = async () => {
  try {
    const admins = await User.find({
      role: "admin",
      isActive: true,
    })
      .select("name email profileImage createdAt")
      .sort({ name: 1 });

    return admins.map((admin) => admin.toObject());
  } catch (error) {
    console.error("Error getting admins directory:", error);
    throw error;
  }
};

/**
 * Search users for messaging (vendors or customers)
 * @param {string} query - Search query
 * @param {string} userRole - Role of users to search for ("vendor" or "customer")
 * @param {string} currentUserId - Current user ID (to exclude from results)
 * @returns {Promise<Array>} - Array of matching user objects
 */
exports.searchUsersForMessaging = async (query, userRole, currentUserId) => {
  try {
    const searchRegex = new RegExp(query, "i");

    let searchQuery = {
      role: userRole,
      isActive: true,
      _id: { $ne: currentUserId }, // Exclude current user
    };

    // Build search criteria based on role
    if (userRole === "vendor") {
      searchQuery.$or = [
        { name: searchRegex },
        { businessName: searchRegex },
        { email: searchRegex },
        { businessDescription: searchRegex },
      ];
    } else if (userRole === "customer") {
      searchQuery.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const users = await User.find(searchQuery)
      .select(
        userRole === "vendor"
          ? "name email businessName businessDescription businessLogo profileImage"
          : "name email profileImage"
      )
      .limit(20)
      .sort({ name: 1 });

    return users;
  } catch (error) {
    console.error("Error searching users for messaging:", error);
    throw error;
  }
};

// ============================================
// DELIVERY MESSAGING SERVICE FUNCTIONS
// ============================================

/**
 * Send a general message from delivery to vendor
 * @param {string} deliveryId - Delivery ID sending the message
 * @param {string} vendorId - Vendor ID to receive the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralDeliveryToVendorMessage = async (
  deliveryId,
  vendorId,
  content
) => {
  try {
    // Verify delivery user exists
    const delivery = await User.findOne({ _id: deliveryId, role: "delivery" });
    if (!delivery) {
      throw new Error("Delivery user not found");
    }

    // Verify vendor exists
    const vendor = await User.findOne({ _id: vendorId, role: "vendor" });
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Create general message
    const message = await Message.create({
      sender: deliveryId,
      receiver: vendorId,
      content,
      messageType: "delivery-to-vendor",
      isRead: false,
    });

    // Send notification to vendor
    await firebaseService.sendNotification(
      vendorId,
      "New Delivery Message",
      `${delivery.name} sent you a message`,
      {
        type: "general-message",
        messageId: message._id,
        senderId: deliveryId,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending general delivery to vendor message:", error);
    throw error;
  }
};

/**
 * Send a general message from delivery to admin
 * @param {string} deliveryId - Delivery ID sending the message
 * @param {string} adminId - Admin ID to receive the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralDeliveryToAdminMessage = async (
  deliveryId,
  adminId,
  content
) => {
  try {
    // Verify delivery user exists
    const delivery = await User.findOne({ _id: deliveryId, role: "delivery" });
    if (!delivery) {
      throw new Error("Delivery user not found");
    }

    // Verify admin exists
    const admin = await User.findOne({ _id: adminId, role: "admin" });
    if (!admin) {
      throw new Error("Admin not found");
    }

    // Create general message
    const message = await Message.create({
      sender: deliveryId,
      receiver: adminId,
      content,
      messageType: "general", // Using general type since delivery-to-admin is not in the enum
      isRead: false,
    });

    // Send notification to admin
    await firebaseService.sendNotification(
      adminId,
      "New Delivery Message",
      `${delivery.name} sent you a message`,
      {
        type: "general-message",
        messageId: message._id,
        senderId: deliveryId,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending general delivery to admin message:", error);
    throw error;
  }
};

/**
 * Send a general message from delivery to customer
 * @param {string} deliveryId - Delivery ID sending the message
 * @param {string} customerId - Customer ID to receive the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralDeliveryToCustomerMessage = async (
  deliveryId,
  customerId,
  content
) => {
  try {
    // Verify delivery user exists
    const delivery = await User.findOne({ _id: deliveryId, role: "delivery" });
    if (!delivery) {
      throw new Error("Delivery user not found");
    }

    // Verify customer exists
    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Create general message
    const message = await Message.create({
      sender: deliveryId,
      receiver: customerId,
      content,
      messageType: "general", // Using general type since delivery-to-customer is not in the enum
      isRead: false,
    });

    // Send notification to customer
    await firebaseService.sendNotification(
      customerId,
      "New Delivery Message",
      `${delivery.name} sent you a message`,
      {
        type: "general-message",
        messageId: message._id,
        senderId: deliveryId,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending general delivery to customer message:", error);
    throw error;
  }
};

/**
 * Get all conversations for a delivery user
 * @param {string} deliveryId - Delivery user ID
 * @returns {Promise<Array>} - Array of conversations
 */
exports.getDeliveryConversations = async (deliveryId) => {
  try {
    // Verify delivery user exists
    const delivery = await User.findOne({ _id: deliveryId, role: "delivery" });
    if (!delivery) {
      throw new Error("Delivery user not found");
    }

    // Find all messages where delivery user is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: deliveryId }, { receiver: deliveryId }],
    }).sort({ createdAt: -1 });

    // Get unique user IDs from conversations
    const userIds = new Set();
    messages.forEach((message) => {
      if (message.sender.toString() !== deliveryId) {
        userIds.add(message.sender.toString());
      }
      if (message.receiver.toString() !== deliveryId) {
        userIds.add(message.receiver.toString());
      }
    });

    // Get user details for each conversation
    const conversations = [];
    for (const userId of userIds) {
      // Find the last message in the conversation
      const lastMessage = messages.find(
        (message) =>
          message.sender.toString() === userId ||
          message.receiver.toString() === userId
      );

      if (lastMessage) {
        // Get user details
        const user = await User.findById(userId).select(
          "name email role image"
        );
        if (user) {
          // Count unread messages
          const unreadCount = await Message.countDocuments({
            sender: userId,
            receiver: deliveryId,
            isRead: false,
          });

          conversations.push({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
            lastMessage: {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              isRead: lastMessage.isRead,
            },
            unreadCount,
          });
        }
      }
    }

    // Sort conversations by last message date
    return conversations.sort((a, b) => {
      return (
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
      );
    });
  } catch (error) {
    console.error("Error getting delivery conversations:", error);
    throw error;
  }
};

/**
 * Get conversation history between two users
 * @param {string} currentUserId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @returns {Promise<Array>} - Array of messages between the two users
 */
exports.getConversationHistory = async (currentUserId, otherUserId) => {
  try {
    // Verify both users exist
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      throw new Error("Current user not found");
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      throw new Error("Other user not found");
    }

    // Find all messages between the two users (in both directions)
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: 1 }) // Sort by date ascending (oldest first)
      .populate("sender", "name email role image")
      .populate("receiver", "name email role image");

    // Mark messages from other user as read
    const unreadMessages = messages.filter(
      (message) =>
        message.sender.toString() === otherUserId &&
        message.receiver.toString() === currentUserId &&
        !message.isRead
    );

    // Update all unread messages to read
    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          sender: otherUserId,
          receiver: currentUserId,
          isRead: false,
        },
        { isRead: true, readAt: new Date() }
      );
    }

    return messages;
  } catch (error) {
    console.error("Error getting conversation history:", error);
    throw error;
  }
};

// ============================================
// UNIVERSAL MESSAGING SERVICE FUNCTIONS
// ============================================

/**
 * Send a general message from vendor to delivery boy
 * @param {string} vendorId - Vendor ID sending the message
 * @param {string} deliveryBoyId - Delivery boy ID to receive the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralVendorToDeliveryMessage = async (
  vendorId,
  deliveryBoyId,
  content
) => {
  try {
    // Verify vendor exists
    const vendor = await User.findOne({ _id: vendorId, role: "vendor" });
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Verify delivery boy exists
    const deliveryBoy = await User.findOne({
      _id: deliveryBoyId,
      role: { $in: ["deliveryman", "delivery"] },
    });
    if (!deliveryBoy) {
      throw new Error("Delivery boy not found");
    }

    // Create general message
    const message = await Message.create({
      sender: vendorId,
      receiver: deliveryBoyId,
      content,
      messageType: "vendor-to-delivery-general",
      isRead: false,
    });

    // Send notification to delivery boy
    await firebaseService.sendNotification(
      deliveryBoyId,
      "New Vendor Message",
      `${vendor.businessName || vendor.name} sent you a message`,
      {
        type: "general-message",
        messageId: message._id,
        senderId: vendorId,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending general vendor to delivery message:", error);
    throw error;
  }
};

/**
 * Send a general message from delivery boy to vendor
 * @param {string} deliveryBoyId - Delivery boy ID sending the message
 * @param {string} vendorId - Vendor ID to receive the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralDeliveryToVendorMessage = async (
  deliveryBoyId,
  vendorId,
  content
) => {
  try {
    // Verify delivery boy exists
    const deliveryBoy = await User.findOne({
      _id: deliveryBoyId,
      role: { $in: ["deliveryman", "delivery"] },
    });
    if (!deliveryBoy) {
      throw new Error("Delivery boy not found");
    }

    // Verify vendor exists
    const vendor = await User.findOne({ _id: vendorId, role: "vendor" });
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Create general message
    const message = await Message.create({
      sender: deliveryBoyId,
      receiver: vendorId,
      content,
      messageType: "delivery-to-vendor-general",
      isRead: false,
    });

    // Send notification to vendor
    await firebaseService.sendNotification(
      vendorId,
      "New Delivery Message",
      `${deliveryBoy.name} sent you a message`,
      {
        type: "general-message",
        messageId: message._id,
        senderId: deliveryBoyId,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending general delivery to vendor message:", error);
    throw error;
  }
};

/**
 * Send a general message from delivery boy to customer
 * @param {string} deliveryBoyId - Delivery boy ID sending the message
 * @param {string} customerId - Customer ID to receive the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralDeliveryToCustomerMessage = async (
  deliveryBoyId,
  customerId,
  content
) => {
  try {
    // Verify delivery boy exists
    const deliveryBoy = await User.findOne({
      _id: deliveryBoyId,
      role: { $in: ["deliveryman", "delivery"] },
    });
    if (!deliveryBoy) {
      throw new Error("Delivery boy not found");
    }

    // Verify customer exists
    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Create general message
    const message = await Message.create({
      sender: deliveryBoyId,
      receiver: customerId,
      content,
      messageType: "delivery-to-customer-general",
      isRead: false,
    });

    // Send notification to customer
    await firebaseService.sendNotification(
      customerId,
      "New Delivery Message",
      `${deliveryBoy.name} sent you a message`,
      {
        type: "general-message",
        messageId: message._id,
        senderId: deliveryBoyId,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending general delivery to customer message:", error);
    throw error;
  }
};

/**
 * Get delivery boys directory for vendor messaging
 * @route   GET /api/messages/delivery/directory
 * @access  Private (Vendor)
 */
exports.getDeliveryBoysDirectory = async () => {
  try {
    const deliveryBoys = await User.find(
      { role: "delivery" },
      "_id name profileImage role"
    );
    return deliveryBoys;
  } catch (error) {
    console.error("Error getting delivery boys directory:", error);
    throw error;
  }
};

/**
 * Get all users for messaging (vendors, admins, customers, delivery)
 * @param {string} requestingUserId - ID of the user requesting the directory
 * @param {string} requestingUserRole - Role of the user requesting the directory
 * @returns {Promise<Object>} - Object containing arrays of users by role
 */
exports.getAllUsersForMessaging = async (
  requestingUserId,
  requestingUserRole
) => {
  try {
    console.log(
      `👥 Getting all users for ${requestingUserRole} with ID ${requestingUserId}`
    );

    // Initialize result object with empty arrays
    const result = {
      vendors: [],
      admins: [],
      customers: [],
      delivery: [],
    };

    // Get vendors (exclude requesting user if they are a vendor)
    if (requestingUserRole !== "vendor") {
      result.vendors = await User.find(
        { role: "vendor" },
        "_id name email role profileImage businessName businessLogo"
      );
    } else {
      result.vendors = await User.find(
        { role: "vendor", _id: { $ne: requestingUserId } },
        "_id name email role profileImage businessName businessLogo"
      );
    }

    // Get admins (exclude requesting user if they are an admin)
    if (requestingUserRole !== "admin") {
      result.admins = await User.find(
        { role: "admin" },
        "_id name email role profileImage"
      );
    } else {
      result.admins = await User.find(
        { role: "admin", _id: { $ne: requestingUserId } },
        "_id name email role profileImage"
      );
    }

    // Get customers (exclude requesting user if they are a customer)
    if (requestingUserRole !== "customer") {
      result.customers = await User.find(
        { role: "customer" },
        "_id name email role profileImage"
      );
    } else {
      result.customers = await User.find(
        { role: "customer", _id: { $ne: requestingUserId } },
        "_id name email role profileImage"
      );
    }

    // Get delivery users (exclude requesting user if they are a delivery user)
    if (requestingUserRole !== "delivery") {
      result.delivery = await User.find(
        { role: "delivery" },
        "_id name email role profileImage"
      );
    } else {
      result.delivery = await User.find(
        { role: "delivery", _id: { $ne: requestingUserId } },
        "_id name email role profileImage"
      );
    }

    console.log(
      `📊 Found ${result.vendors.length} vendors, ${result.admins.length} admins, ${result.customers.length} customers, ${result.delivery.length} delivery users`
    );

    return result;
  } catch (error) {
    console.error("Error getting all users for messaging:", error);
    throw error;
  }
};

/**
 * Get all conversations for a delivery user
 * @param {string} deliveryId - Delivery user ID
 * @returns {Promise<Array>} - Array of messages
 */
exports.getDeliveryConversations = async (deliveryId) => {
  try {
    console.log(`🚚 Service: Getting conversations for delivery ${deliveryId}`);

    // Validate delivery user exists
    const deliveryUser = await User.findById(deliveryId);
    if (!deliveryUser || deliveryUser.role !== "delivery") {
      throw new Error(
        `Delivery user with ID ${deliveryId} not found or invalid role`
      );
    }

    // Get all messages where delivery user is sender or receiver
    // Include both order-based and general messages
    const messages = await Message.find({
      $or: [{ sender: deliveryId }, { receiver: deliveryId }],
      messageType: {
        $in: [
          "delivery-to-vendor",
          "vendor-to-delivery",
          "delivery-to-customer",
          "customer-to-delivery",
          "delivery-to-admin",
          "admin-to-delivery",
          "general",
        ],
      },
    })
      .sort({ createdAt: -1 })
      .populate(
        "sender",
        "_id name email role profileImage businessName businessLogo"
      )
      .populate(
        "receiver",
        "_id name email role profileImage businessName businessLogo"
      )
      .populate("order", "_id orderNumber totalPrice");

    console.log(
      `💬 Found ${messages.length} messages for delivery ${deliveryId}`
    );

    return messages;
  } catch (error) {
    console.error(`Error getting delivery conversations: ${error.message}`);
    throw error;
  }
};

/**
 * Send a general message from delivery to vendor
 * @param {string} deliveryId - Delivery user ID sending the message
 * @param {string} vendorId - Vendor ID receiving the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message
 */
exports.sendGeneralDeliveryToVendorMessage = async (
  deliveryId,
  vendorId,
  content
) => {
  try {
    console.log(
      `🚚 Sending message from delivery ${deliveryId} to vendor ${vendorId}`
    );

    // Verify delivery user exists
    const deliveryUser = await User.findOne({
      _id: deliveryId,
      role: "delivery",
    });
    if (!deliveryUser) {
      throw new Error("Delivery user not found");
    }

    // Verify vendor exists
    const vendor = await User.findOne({ _id: vendorId, role: "vendor" });
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Create message
    const message = await Message.create({
      sender: deliveryId,
      receiver: vendorId,
      content,
      messageType: "general",
      isRead: false,
    });

    // Send notification to vendor
    await firebaseService.sendNotification(
      vendorId,
      "New Message from Delivery",
      `You have a new message from ${deliveryUser.name}`,
      {
        type: "message",
        messageId: message._id,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending delivery to vendor message:", error);
    throw error;
  }
};

/**
 * Send a general message from delivery to admin
 * @param {string} deliveryId - Delivery user ID sending the message
 * @param {string} adminId - Admin ID receiving the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralDeliveryToAdminMessage = async (
  deliveryId,
  adminId,
  content
) => {
  try {
    console.log(
      `🚚 Sending message from delivery ${deliveryId} to admin ${adminId}`
    );

    // Verify delivery user exists
    const deliveryUser = await User.findOne({
      _id: deliveryId,
      role: "delivery",
    });
    if (!deliveryUser) {
      throw new Error("Delivery user not found");
    }

    // Verify admin exists
    const admin = await User.findOne({ _id: adminId, role: "admin" });
    if (!admin) {
      throw new Error("Admin not found");
    }

    // Create message
    const message = await Message.create({
      sender: deliveryId,
      receiver: adminId,
      content,
      messageType: "general",
      isRead: false,
    });

    // Send notification to admin
    await firebaseService.sendNotification(
      adminId,
      "New Message from Delivery",
      `You have a new message from ${deliveryUser.name}`,
      {
        type: "message",
        messageId: message._id,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending delivery to admin message:", error);
    throw error;
  }
};

/**
 * Send a general message from delivery to customer
 * @param {string} deliveryId - Delivery user ID sending the message
 * @param {string} customerId - Customer ID receiving the message
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralDeliveryToCustomerMessage = async (
  deliveryId,
  customerId,
  content
) => {
  try {
    console.log(
      `🚚 Sending message from delivery ${deliveryId} to customer ${customerId}`
    );

    // Verify delivery user exists
    const deliveryUser = await User.findOne({
      _id: deliveryId,
      role: "delivery",
    });
    if (!deliveryUser) {
      throw new Error("Delivery user not found");
    }

    // Verify customer exists
    const customer = await User.findOne({ _id: customerId, role: "customer" });
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Create message
    const message = await Message.create({
      sender: deliveryId,
      receiver: customerId,
      content,
      messageType: "general",
      isRead: false,
    });

    // Send notification to customer
    await firebaseService.sendNotification(
      customerId,
      "New Message from Delivery",
      `You have a new message from ${deliveryUser.name}`,
      {
        type: "message",
        messageId: message._id,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending delivery to customer message:", error);
    throw error;
  }
};

/**
 * Get delivery conversations (both general and order-based)
 * @param {string} deliveryBoyId - Delivery boy ID to get conversations for
 * @returns {Promise<Array>} - Array of conversation objects
 */
exports.getDeliveryConversations = async (deliveryBoyId) => {
  try {
    console.log("🔍 Fetching delivery conversations for:", deliveryBoyId);

    // Find all messages where the delivery boy is either sender or receiver
    const messages = await Message.find({
      $or: [{ sender: deliveryBoyId }, { receiver: deliveryBoyId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name email role profileImage")
      .populate("receiver", "name email role profileImage");

    // Group messages by conversation partner
    const conversationsMap = new Map();

    for (const message of messages) {
      const partnerId =
        message.sender._id.toString() === deliveryBoyId
          ? message.receiver._id.toString()
          : message.sender._id.toString();

      const partner =
        message.sender._id.toString() === deliveryBoyId
          ? message.receiver
          : message.sender;

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          _id: partnerId,
          partner: {
            _id: partner._id,
            name: partner.name,
            email: partner.email,
            role: partner.role,
            profileImage: partner.profileImage,
          },
          lastMessage: {
            _id: message._id,
            content: message.content,
            createdAt: message.createdAt,
            isRead: message.isRead,
            sender: message.sender._id.toString(),
          },
          unreadCount:
            message.receiver._id.toString() === deliveryBoyId && !message.isRead
              ? 1
              : 0,
        });
      } else if (
        message.createdAt >
        conversationsMap.get(partnerId).lastMessage.createdAt
      ) {
        // Update last message if this one is newer
        const conversation = conversationsMap.get(partnerId);
        conversation.lastMessage = {
          _id: message._id,
          content: message.content,
          createdAt: message.createdAt,
          isRead: message.isRead,
          sender: message.sender._id.toString(),
        };
      }

      // Count unread messages
      if (
        message.receiver._id.toString() === deliveryBoyId &&
        !message.isRead
      ) {
        const conversation = conversationsMap.get(partnerId);
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
    }

    // Convert map to array and sort by last message date
    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt
    );

    console.log(`✅ Found ${conversations.length} delivery conversations`);
    return conversations;
  } catch (error) {
    console.error("❌ Error getting delivery conversations:", error);
    throw error;
  }
};

/**
 * Get delivery boy conversations
 * @param {string} deliveryBoyId - Delivery boy ID to get conversations for
 * @returns {Promise<Array>} - Array of conversation objects
 */
exports.getDeliveryConversations = async (deliveryBoyId) => {
  try {
    // Verify delivery boy exists
    const deliveryBoy = await User.findOne({
      _id: deliveryBoyId,
      role: { $in: ["deliveryman", "delivery"] },
    });
    if (!deliveryBoy) {
      throw new Error("Delivery boy not found");
    }

    // Get all messages where delivery boy is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: deliveryBoyId }, { receiver: deliveryBoyId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name role profileImage businessName businessLogo")
      .populate("receiver", "name role profileImage businessName businessLogo")
      .populate("orderId", "orderStatus _id");

    // Group messages by conversation partner
    const conversations = {};

    messages.forEach((message) => {
      const partnerId = message.sender._id.equals(deliveryBoyId)
        ? message.receiver._id.toString()
        : message.sender._id.toString();

      const partner = message.sender._id.equals(deliveryBoyId)
        ? message.receiver
        : message.sender;

      if (!conversations[partnerId]) {
        conversations[partnerId] = {
          partnerId,
          partner,
          messages: [],
          lastMessage: null,
          unreadCount: 0,
          isGeneral: !message.orderId,
        };
      }

      conversations[partnerId].messages.push(message);

      // Update last message
      if (
        !conversations[partnerId].lastMessage ||
        message.createdAt > conversations[partnerId].lastMessage.createdAt
      ) {
        conversations[partnerId].lastMessage = message;
      }

      // Count unread messages
      if (!message.isRead && message.receiver._id.equals(deliveryBoyId)) {
        conversations[partnerId].unreadCount++;
      }
    });

    return Object.values(conversations);
  } catch (error) {
    console.error("Error getting delivery conversations:", error);
    throw error;
  }
};

/**
 * Universal message sending function (auto-detects roles)
 * @param {string} senderId - Sender user ID
 * @param {string} receiverId - Receiver user ID
 * @param {string} content - Message content
 * @param {string} senderRole - Sender role
 * @param {string} receiverRole - Receiver role
 * @returns {Promise<Object>} - Created message object
 */
exports.sendUniversalMessage = async (
  senderId,
  receiverId,
  content,
  senderRole,
  receiverRole
) => {
  try {
    // Verify sender exists
    const sender = await User.findById(senderId);
    if (!sender) {
      throw new Error("Sender not found");
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new Error("Receiver not found");
    }

    // Create message type based on roles
    const messageType = `${senderRole}-to-${receiverRole}-general`;

    // Create universal message
    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content,
      messageType,
      isRead: false,
    });

    // Send notification
    const senderName = sender.businessName || sender.name;
    await firebaseService.sendNotification(
      receiverId,
      "New Message",
      `${senderName} sent you a message`,
      {
        type: "general-message",
        messageId: message._id,
        senderId: senderId,
      }
    );

    return message;
  } catch (error) {
    console.error("Error sending universal message:", error);
    throw error;
  }
};

/**
 * Get universal conversations for any role
 * @param {string} userId - User ID to get conversations for
 * @param {string} userRole - User role
 * @returns {Promise<Array>} - Array of conversation objects
 */
exports.getUniversalConversations = async (userId, userRole) => {
  try {
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name role profileImage businessName businessLogo")
      .populate("receiver", "name role profileImage businessName businessLogo")
      .populate("orderId", "orderStatus _id");

    // Group messages by conversation partner
    const conversations = {};

    messages.forEach((message) => {
      const partnerId = message.sender._id.equals(userId)
        ? message.receiver._id.toString()
        : message.sender._id.toString();

      const partner = message.sender._id.equals(userId)
        ? message.receiver
        : message.sender;

      if (!conversations[partnerId]) {
        conversations[partnerId] = {
          partnerId,
          partner,
          messages: [],
          lastMessage: null,
          unreadCount: 0,
          isGeneral: !message.orderId,
        };
      }

      conversations[partnerId].messages.push(message);

      // Update last message
      if (
        !conversations[partnerId].lastMessage ||
        message.createdAt > conversations[partnerId].lastMessage.createdAt
      ) {
        conversations[partnerId].lastMessage = message;
      }

      // Count unread messages
      if (!message.isRead && message.receiver._id.equals(userId)) {
        conversations[partnerId].unreadCount++;
      }
    });

    return Object.values(conversations);
  } catch (error) {
    console.error("Error getting universal conversations:", error);
    throw error;
  }
};

/**
 * Get all users for messaging (customers, vendors, delivery boys, admins)
 * @param {string} currentUserId - Current user ID (to exclude from results)
 * @param {string} currentUserRole - Current user role
 * @param {string} excludeRole - Role to exclude from results
 * @returns {Promise<Object>} - Object with users grouped by role
 */
exports.getAllUsersForMessaging = async (
  currentUserId,
  currentUserRole,
  excludeRole = null
) => {
  try {
    console.log(
      `🔍 Getting all users for messaging - User: ${currentUserId}, Role: ${currentUserRole}`
    );

    let query = {
      isActive: true,
      _id: { $ne: currentUserId }, // Exclude current user
    };

    // Build role filter
    const allowedRoles = [];
    if (currentUserRole === "vendor") {
      allowedRoles.push("customer", "deliveryman", "delivery");
    } else if (currentUserRole === "customer") {
      // Allow customers to message vendors, admins, and delivery personnel
      allowedRoles.push("vendor", "admin", "delivery", "deliveryman");
      console.log("👥 Customer messaging allowed roles:", allowedRoles);
    } else if (["deliveryman", "delivery"].includes(currentUserRole)) {
      allowedRoles.push("vendor", "customer");
    }

    if (excludeRole) {
      const filteredRoles = allowedRoles.filter((role) => role !== excludeRole);
      query.role = { $in: filteredRoles };
    } else {
      query.role = { $in: allowedRoles };
    }

    console.log("🔍 User query:", JSON.stringify(query));

    const users = await User.find(query)
      .select(
        "name email role profileImage businessName businessDescription businessLogo createdAt"
      )
      .sort({ role: 1, name: 1 });

    console.log(`👥 Found ${users.length} users for messaging`);

    // Group users by role for better organization
    const groupedUsers = {
      vendors: [],
      admins: [],
      deliveryBoys: [],
    };

    users.forEach((user) => {
      if (user.role === "vendor") {
        groupedUsers.vendors.push(user);
      } else if (user.role === "admin") {
        groupedUsers.admins.push(user);
      } else if (["deliveryman", "delivery"].includes(user.role)) {
        groupedUsers.deliveryBoys.push(user);
      }
    });

    console.log("👥 Grouped users:", {
      vendors: groupedUsers.vendors.length,
      admins: groupedUsers.admins.length,
      deliveryBoys: groupedUsers.deliveryBoys.length,
    });

    return groupedUsers;
  } catch (error) {
    console.error("❌ Error getting all users for messaging:", error);
    throw error;
  }
};

/**
 * Get all vendors for customer messaging directory
 * @returns {Promise<Array>} - Array of vendor objects
 */
exports.getVendorsDirectory = async () => {
  try {
    console.log("🏪 Fetching vendors directory for customer messaging...");

    const vendors = await User.find({ role: "vendor" })
      .select(
        "name email businessName businessDescription businessLogo profileImage createdAt"
      )
      .sort({ name: 1 });

    console.log("🏪 Found vendors:", vendors.length);
    return vendors;
  } catch (error) {
    console.error("Error getting vendors directory:", error);
    throw error;
  }
};

/**
 * Get all customers for vendor messaging directory
 * @returns {Promise<Array>} - Array of customer objects
 */
exports.getCustomersDirectory = async () => {
  try {
    console.log("👥 Fetching customers directory for vendor messaging...");

    const customers = await User.find({ role: "customer" })
      .select("name email profileImage createdAt")
      .sort({ name: 1 });

    console.log("👥 Found customers:", customers.length);
    return customers;
  } catch (error) {
    console.error("Error getting customers directory:", error);
    throw error;
  }
};

/**
 * Send general message from customer to vendor (not order-based)
 * @param {string} customerId - Customer ID
 * @param {string} vendorId - Vendor ID
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralCustomerToVendorMessage = async (
  customerId,
  vendorId,
  content
) => {
  try {
    console.log("📤 Sending general customer-to-vendor message:", {
      customerId,
      vendorId,
      content: content.substring(0, 50) + "...",
    });

    // Verify customer exists
    const customer = await User.findById(customerId);
    if (!customer || customer.role !== "customer") {
      throw new Error("Invalid customer");
    }

    // Verify vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== "vendor") {
      throw new Error("Invalid vendor");
    }

    // Create the message
    const message = new Message({
      sender: customerId,
      receiver: vendorId,
      content: content.trim(),
      messageType: "general",
      isRead: false,
      createdAt: new Date(),
    });

    await message.save();

    // Populate sender and receiver details
    await message.populate([
      { path: "sender", select: "name email role profileImage" },
      { path: "receiver", select: "name email role profileImage businessName" },
    ]);

    console.log(
      "✅ Customer-to-vendor message sent successfully:",
      message._id
    );

    // Send push notification to vendor
    try {
      if (vendor.fcmToken) {
        await admin.messaging().send({
          token: vendor.fcmToken,
          notification: {
            title: "New Message",
            body: `${customer.name}: ${content.substring(0, 100)}`,
          },
          data: {
            type: "message",
            senderId: customerId.toString(),
            messageId: message._id.toString(),
          },
        });
        console.log("🔔 Push notification sent to vendor:", vendor.name);
      }
    } catch (notificationError) {
      console.error("❌ Failed to send push notification:", notificationError);
      // Don't throw error for notification failure
    }

    return message;
  } catch (error) {
    console.error("❌ Error sending customer-to-vendor message:", error);
    throw error;
  }
};

/**
 * Send general message from vendor to customer (not order-based)
 * @param {string} vendorId - Vendor ID
 * @param {string} customerId - Customer ID
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralVendorToCustomerMessage = async (
  vendorId,
  customerId,
  content
) => {
  try {
    console.log("📤 Sending general vendor-to-customer message:", {
      vendorId,
      customerId,
      content: content.substring(0, 50) + "...",
    });

    // Verify vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== "vendor") {
      throw new Error("Invalid vendor");
    }

    // Verify customer exists
    const customer = await User.findById(customerId);
    if (!customer || customer.role !== "customer") {
      throw new Error("Invalid customer");
    }

    // Create the message
    const message = new Message({
      sender: vendorId,
      receiver: customerId,
      content: content.trim(),
      messageType: "general",
      isRead: false,
      createdAt: new Date(),
    });

    await message.save();

    // Populate sender and receiver details
    await message.populate([
      { path: "sender", select: "name email role profileImage businessName" },
      { path: "receiver", select: "name email role profileImage" },
    ]);

    console.log(
      "✅ Vendor-to-customer message sent successfully:",
      message._id
    );

    // Send push notification to customer
    try {
      if (customer.fcmToken) {
        await admin.messaging().send({
          token: customer.fcmToken,
          notification: {
            title: "New Message from Vendor",
            body: `${vendor.businessName || vendor.name}: ${content.substring(
              0,
              100
            )}`,
          },
          data: {
            type: "message",
            senderId: vendorId.toString(),
            messageId: message._id.toString(),
          },
        });
        console.log("🔔 Push notification sent to customer:", customer.name);
      }
    } catch (notificationError) {
      console.error("❌ Failed to send push notification:", notificationError);
      // Don't throw error for notification failure
    }

    return message;
  } catch (error) {
    console.error("❌ Error sending vendor-to-customer message:", error);
    throw error;
  }
};

/**
 * Get all conversations for customer (both general and order-based)
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} - Array of conversation objects
 */
exports.getCustomerConversations = async (customerId) => {
  try {
    console.log("💬 Fetching customer conversations for:", customerId);

    // Get all messages where customer is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: customerId }, { receiver: customerId }],
    })
      .populate([
        { path: "sender", select: "name email role profileImage businessName" },
        {
          path: "receiver",
          select: "name email role profileImage businessName",
        },
      ])
      .sort({ createdAt: -1 });

    console.log("📨 Found messages for customer:", messages.length);

    // Group messages by conversation partner
    const conversationMap = new Map();

    messages.forEach((message) => {
      // Determine the conversation partner (not the customer)
      const partnerId =
        message.sender._id.toString() === customerId
          ? message.receiver._id.toString()
          : message.sender._id.toString();

      const partner =
        message.sender._id.toString() === customerId
          ? message.receiver
          : message.sender;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: message,
          unreadCount: 0,
          messages: [],
        });
      }

      const conversation = conversationMap.get(partnerId);
      conversation.messages.push(message);

      // Count unread messages (where customer is receiver and message is unread)
      if (message.receiver._id.toString() === customerId && !message.isRead) {
        conversation.unreadCount++;
      }

      // Update last message if this message is more recent
      if (message.createdAt > conversation.lastMessage.createdAt) {
        conversation.lastMessage = message;
      }
    });

    // Convert map to array and sort by last message time
    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    console.log("✅ Customer conversations processed:", conversations.length);
    return conversations;
  } catch (error) {
    console.error("❌ Error getting customer conversations:", error);
    throw error;
  }
};

/**
 * Get all conversations for vendor (both general and order-based)
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Array>} - Array of conversation objects
 */
exports.getVendorConversations = async (vendorId) => {
  try {
    console.log("💬 Fetching vendor conversations for:", vendorId);

    // Get all messages where vendor is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: vendorId }, { receiver: vendorId }],
    })
      .populate([
        { path: "sender", select: "name email role profileImage businessName" },
        {
          path: "receiver",
          select: "name email role profileImage businessName",
        },
      ])
      .sort({ createdAt: -1 });

    console.log("📨 Found messages for vendor:", messages.length);

    // Group messages by conversation partner
    const conversationMap = new Map();

    messages.forEach((message) => {
      // Determine the conversation partner (not the vendor)
      const partnerId =
        message.sender._id.toString() === vendorId
          ? message.receiver._id.toString()
          : message.sender._id.toString();

      const partner =
        message.sender._id.toString() === vendorId
          ? message.receiver
          : message.sender;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: message,
          unreadCount: 0,
          messages: [],
        });
      }

      const conversation = conversationMap.get(partnerId);
      conversation.messages.push(message);

      // Count unread messages (where vendor is receiver and message is unread)
      if (message.receiver._id.toString() === vendorId && !message.isRead) {
        conversation.unreadCount++;
      }

      // Update last message if this message is more recent
      if (message.createdAt > conversation.lastMessage.createdAt) {
        conversation.lastMessage = message;
      }
    });

    // Convert map to array and sort by last message time
    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    console.log("✅ Vendor conversations processed:", conversations.length);
    return conversations;
  } catch (error) {
    console.error("❌ Error getting vendor conversations:", error);
    throw error;
  }
};

/**
 * Get conversation history between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @param {string} messageType - Optional message type filter
 * @returns {Promise<Array>} - Array of message objects
 */
exports.getConversationHistory = async (
  userId1,
  userId2,
  messageType = null
) => {
  try {
    console.log(
      "💬 Fetching conversation history between:",
      userId1,
      "and",
      userId2
    );

    // Build query to find messages between the two users
    const query = {
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    };

    // Add message type filter if specified
    if (messageType) {
      query.messageType = messageType;
    }

    const messages = await Message.find(query)
      .populate([
        { path: "sender", select: "name email role profileImage businessName" },
        {
          path: "receiver",
          select: "name email role profileImage businessName",
        },
      ])
      .sort({ createdAt: 1 }); // Sort ascending for chat history

    console.log("📨 Found conversation messages:", messages.length);
    return messages;
  } catch (error) {
    console.error("❌ Error getting conversation history:", error);
    throw error;
  }
};

/**
 * Get all delivery boys for vendor messaging directory
 * @returns {Promise<Array>} - Array of delivery boy objects
 */
exports.getDeliveryBoysDirectory = async () => {
  try {
    console.log("🚚 Fetching delivery boys directory for vendor messaging...");

    const deliveryBoys = await User.find({
      role: { $in: ["deliveryman", "delivery"] },
    })
      .select("name email phone profileImage createdAt")
      .sort({ name: 1 });

    console.log("🚚 Found delivery boys:", deliveryBoys.length);
    return deliveryBoys;
  } catch (error) {
    console.error("Error getting delivery boys directory:", error);
    throw error;
  }
};

/**
 * Send general message from customer to admin (not order-based)
 * @param {string} customerId - Customer ID
 * @param {string} adminId - Admin ID
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralCustomerToAdminMessage = async (
  customerId,
  adminId,
  content
) => {
  try {
    console.log("📤 Sending general customer-to-admin message:", {
      customerId,
      adminId,
      content: content.substring(0, 50) + "...",
    });

    // Verify customer exists
    const customer = await User.findById(customerId);
    if (!customer || customer.role !== "customer") {
      throw new Error("Invalid customer");
    }

    // Verify admin exists
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "admin") {
      throw new Error("Invalid admin");
    }

    // Create the message
    const message = new Message({
      sender: customerId,
      receiver: adminId,
      content: content.trim(),
      messageType: "general",
      isRead: false,
      createdAt: new Date(),
    });

    await message.save();

    // Populate sender and receiver details
    await message.populate([
      { path: "sender", select: "name email role profileImage" },
      { path: "receiver", select: "name email role profileImage" },
    ]);

    console.log("✅ Customer-to-admin message sent successfully:", message._id);

    // Send push notification to admin
    try {
      if (admin.fcmToken) {
        await admin.messaging().send({
          token: admin.fcmToken,
          notification: {
            title: "New Message from Customer",
            body: `${customer.name}: ${content.substring(0, 100)}`,
          },
          data: {
            type: "message",
            senderId: customerId.toString(),
            messageId: message._id.toString(),
          },
        });
        console.log("🔔 Push notification sent to admin:", admin.name);
      }
    } catch (notificationError) {
      console.error("❌ Failed to send push notification:", notificationError);
      // Don't throw error for notification failure
    }

    return message;
  } catch (error) {
    console.error("❌ Error sending customer-to-admin message:", error);
    throw error;
  }
};

/**
 * Send general message from customer to delivery person (not order-based)
 * @param {string} customerId - Customer ID
 * @param {string} deliveryId - Delivery person ID
 * @param {string} content - Message content
 * @returns {Promise<Object>} - Created message object
 */
exports.sendGeneralCustomerToDeliveryMessage = async (
  customerId,
  deliveryId,
  content
) => {
  try {
    console.log("📤 Sending general customer-to-delivery message:", {
      customerId,
      deliveryId,
      content: content.substring(0, 50) + "...",
    });

    // Verify customer exists
    const customer = await User.findById(customerId);
    if (!customer || customer.role !== "customer") {
      throw new Error("Invalid customer");
    }

    // Verify delivery person exists
    const deliveryPerson = await User.findById(deliveryId);
    if (
      !deliveryPerson ||
      !["deliveryman", "delivery"].includes(deliveryPerson.role)
    ) {
      throw new Error("Invalid delivery person");
    }

    // Create the message
    const message = new Message({
      sender: customerId,
      receiver: deliveryId,
      content: content.trim(),
      messageType: "general",
      isRead: false,
      createdAt: new Date(),
    });

    await message.save();

    // Populate sender and receiver details
    await message.populate([
      { path: "sender", select: "name email role profileImage" },
      { path: "receiver", select: "name email role profileImage" },
    ]);

    console.log(
      "✅ Customer-to-delivery message sent successfully:",
      message._id
    );

    // Send push notification to delivery person
    try {
      if (deliveryPerson.fcmToken) {
        await admin.messaging().send({
          token: deliveryPerson.fcmToken,
          notification: {
            title: "New Message from Customer",
            body: `${customer.name}: ${content.substring(0, 100)}`,
          },
          data: {
            type: "message",
            senderId: customerId.toString(),
            messageId: message._id.toString(),
          },
        });
        console.log(
          "🔔 Push notification sent to delivery person:",
          deliveryPerson.name
        );
      }
    } catch (notificationError) {
      console.error("❌ Failed to send push notification:", notificationError);
      // Don't throw error for notification failure
    }

    return message;
  } catch (error) {
    console.error("❌ Error sending customer-to-delivery message:", error);
    throw error;
  }
};
