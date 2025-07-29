const messageService = require("../services/message.service");
const asyncHandler = require("../middleware/async");

/**
 * @desc    Send message from customer to vendor
 * @route   POST /api/messages/customer-to-vendor
 * @access  Private (Customer)
 */
exports.sendCustomerToVendorMessage = asyncHandler(async (req, res) => {
  const { orderId, content } = req.body;
  const customerId = req.user.id;

  const message = await messageService.sendCustomerToVendorMessage(
    customerId,
    orderId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send message from vendor to customer
 * @route   POST /api/messages/vendor-to-customer
 * @access  Private (Vendor)
 */
exports.sendVendorToCustomerMessage = asyncHandler(async (req, res) => {
  const { orderId, content } = req.body;
  const vendorId = req.user.id;

  const message = await messageService.sendVendorToCustomerMessage(
    vendorId,
    orderId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send message from admin to delivery user
 * @route   POST /api/messages/admin-to-delivery/general
 * @access  Private (Admin)
 */
exports.sendGeneralAdminToDeliveryMessage = asyncHandler(async (req, res) => {
  const { deliveryId, content } = req.body;
  const adminId = req.user.id;

  const message = await messageService.sendGeneralAdminToDeliveryMessage(
    adminId,
    deliveryId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send message from admin to vendor
 * @route   POST /api/messages/admin-to-vendor/general
 * @access  Private (Admin)
 */
exports.sendGeneralAdminToVendorMessage = asyncHandler(async (req, res) => {
  const { vendorId, content } = req.body;
  const adminId = req.user.id;

  const message = await messageService.sendGeneralAdminToVendorMessage(
    adminId,
    vendorId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send general message from admin to customer
 * @route   POST /api/messages/admin-to-customer/general
 * @access  Private (Admin)
 */
exports.sendGeneralAdminToCustomerMessage = asyncHandler(async (req, res) => {
  const { customerId, content } = req.body;
  const adminId = req.user.id;

  console.log(
    `🛡️ Controller: Admin ${adminId} sending general message to customer ${customerId}`
  );
  console.log("Request body:", req.body);

  if (!customerId || !content) {
    return res.status(400).json({
      success: false,
      message: "Please provide customerId and content",
    });
  }

  const message = await messageService.sendGeneralAdminToCustomerMessage(
    adminId,
    customerId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send message from customer to admin
 * @route   POST /api/messages/customer-to-admin
 * @access  Private (Customer)
 */
exports.sendCustomerToAdminMessage = asyncHandler(async (req, res) => {
  const { content, orderId } = req.body;
  const customerId = req.user.id;

  const message = await messageService.sendCustomerToAdminMessage(
    customerId,
    content,
    orderId
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send message from admin to customer
 * @route   POST /api/messages/admin-to-customer
 * @access  Private (Admin)
 */
exports.sendAdminToCustomerMessage = asyncHandler(async (req, res) => {
  const { customerId, content, orderId } = req.body;
  const adminId = req.user.id;

  const message = await messageService.sendAdminToCustomerMessage(
    adminId,
    customerId,
    content,
    orderId
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send message from admin to all admins
 * @route   POST /api/messages/admin-to-admins
 * @access  Private (Admin)
 */
exports.sendAdminToAdminsMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const adminId = req.user.id;

  const message = await messageService.sendAdminToAdminsMessage(
    adminId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Get vendor by order ID
 * @route   GET /api/messages/vendor/:orderId
 * @access  Private (Customer, Admin)
 */
exports.getVendorByOrderId = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const vendor = await messageService.getVendorByOrderId(orderId);

  res.status(200).json({
    success: true,
    data: vendor,
  });
});

/**
 * @desc    Get messages for a specific order
 * @route   GET /api/messages/order/:orderId
 * @access  Private (Customer, Vendor, Admin)
 */
exports.getMessagesByOrderId = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  const messages = await messageService.getMessagesByOrderId(orderId, userId);

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});

/**
 * @desc    Get all admin messages
 * @route   GET /api/messages/admin
 * @access  Private (Admin)
 */
exports.getAdminMessages = asyncHandler(async (req, res) => {
  const adminId = req.user.id;

  const messages = await messageService.getAdminMessages(adminId);

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});

/**
 * @desc    Get all customer messages
 * @route   GET /api/messages/customer
 * @access  Private (Customer)
 */
exports.getCustomerMessages = asyncHandler(async (req, res) => {
  const customerId = req.user.id;

  const messages = await messageService.getCustomerMessages(customerId);

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});

/**
 * @desc    Get all vendor messages
 * @route   GET /api/messages/vendor
 * @access  Private (Vendor)
 */
exports.getVendorMessages = asyncHandler(async (req, res) => {
  const vendorId = req.user.id;

  const messages = await messageService.getVendorMessages(vendorId);

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});

/**
 * @desc    Mark message as read
 * @route   PUT /api/messages/:messageId/read
 * @access  Private (Customer, Vendor, Admin)
 */
exports.markMessageAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;

  const message = await messageService.markMessageAsRead(messageId, userId);

  res.status(200).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Get unread message count
 * @route   GET /api/messages/unread/count
 * @access  Private (Customer, Vendor, Admin)
 */
exports.getUnreadMessageCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const count = await messageService.getUnreadMessageCount(userId);

  res.status(200).json({
    success: true,
    count,
  });
});

// ============================================
// ENHANCED GENERAL MESSAGING FUNCTIONS
// ============================================

/**
 * @desc    Send general message from customer to vendor (not order-based)
 * @route   POST /api/messages/customer-to-vendor/general
 * @access  Private (Customer)
 */
exports.sendGeneralCustomerToVendorMessage = asyncHandler(async (req, res) => {
  const { vendorId, content } = req.body;
  const customerId = req.user.id;

  const message = await messageService.sendGeneralCustomerToVendorMessage(
    customerId,
    vendorId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send general message from vendor to customer (not order-based)
 * @route   POST /api/messages/vendor-to-customer/general
 * @access  Private (Vendor)
 */
exports.sendGeneralVendorToCustomerMessage = asyncHandler(async (req, res) => {
  const { customerId, content } = req.body;
  const vendorId = req.user.id;

  const message = await messageService.sendGeneralVendorToCustomerMessage(
    vendorId,
    customerId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send general message from customer to admin (not order-based)
 * @route   POST /api/messages/customer-to-admin/general
 * @access  Private (Customer)
 */
exports.sendGeneralCustomerToAdminMessage = asyncHandler(async (req, res) => {
  const { adminId, content } = req.body;
  const customerId = req.user.id;

  const message = await messageService.sendGeneralCustomerToAdminMessage(
    customerId,
    adminId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send general message from customer to delivery person (not order-based)
 * @route   POST /api/messages/customer-to-delivery/general
 * @access  Private (Customer)
 */
exports.sendGeneralCustomerToDeliveryMessage = asyncHandler(
  async (req, res) => {
    const { deliveryId, content } = req.body;
    const customerId = req.user.id;

    const message = await messageService.sendGeneralCustomerToDeliveryMessage(
      customerId,
      deliveryId,
      content
    );

    res.status(201).json({
      success: true,
      data: message,
    });
  }
);

/**
 * @desc    Get all conversations for customer (both general and order-based)
 * @route   GET /api/messages/customer/conversations
 * @access  Private (Customer)
 */
exports.getCustomerConversations = asyncHandler(async (req, res) => {
  const customerId = req.user.id;

  const conversations = await messageService.getCustomerConversations(
    customerId
  );

  res.status(200).json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
});

/**
 * @desc    Get all conversations for vendor (both general and order-based)
 * @route   GET /api/messages/vendor/conversations
 * @access  Private (Vendor)
 */
exports.getVendorConversations = asyncHandler(async (req, res) => {
  const vendorId = req.user.id;

  const conversations = await messageService.getVendorConversations(vendorId);

  res.status(200).json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
});

/**
 * @desc    Get conversation history between current user and another user
 * @route   GET /api/messages/conversation/:otherUserId
 * @access  Private (Customer, Vendor)
 */
exports.getConversationHistory = asyncHandler(async (req, res) => {
  const { otherUserId } = req.params;
  const { type = "general" } = req.query;
  const currentUserId = req.user.id;

  const messages = await messageService.getConversationHistory(
    currentUserId,
    otherUserId,
    type
  );

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});

/**
 * @desc    Get all vendors for customer messaging directory
 * @route   GET /api/messages/vendors/directory
 * @access  Private (Customer)
 */
exports.getVendorsDirectory = asyncHandler(async (req, res) => {
  const vendors = await messageService.getVendorsDirectory();

  res.status(200).json({
    success: true,
    count: vendors.length,
    data: vendors,
  });
});

/**
 * @desc    Get all customers for vendor messaging
 * @route   GET /api/messages/customers/directory
 * @access  Private (Vendor)
 */
exports.getCustomersDirectory = asyncHandler(async (req, res) => {
  const customers = await messageService.getCustomersDirectory();

  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers,
  });
});

/**
 * @desc    Get all admins for messaging
 * @route   GET /api/messages/admins/directory
 * @access  Private (Customer, Vendor, Delivery)
 */
exports.getAdminsDirectory = asyncHandler(async (req, res) => {
  const admins = await messageService.getAdminsDirectory();

  res.status(200).json({
    success: true,
    count: admins.length,
    data: admins,
  });
});

/**
 * @desc    Send general message from delivery to vendor
 * @route   POST /api/messages/delivery-to-vendor/general
 * @access  Private (Delivery)
 */
exports.sendGeneralDeliveryToVendorMessage = asyncHandler(async (req, res) => {
  const { vendorId, content } = req.body;
  const deliveryId = req.user.id;

  const message = await messageService.sendGeneralDeliveryToVendorMessage(
    deliveryId,
    vendorId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send general message from delivery to admin
 * @route   POST /api/messages/delivery-to-admin/general
 * @access  Private (Delivery)
 */
exports.sendGeneralDeliveryToAdminMessage = asyncHandler(async (req, res) => {
  const { adminId, content } = req.body;
  const deliveryId = req.user.id;

  const message = await messageService.sendGeneralDeliveryToAdminMessage(
    deliveryId,
    adminId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send general message from delivery to customer
 * @route   POST /api/messages/delivery-to-customer/general
 * @access  Private (Delivery)
 */
exports.sendGeneralDeliveryToCustomerMessage = asyncHandler(
  async (req, res) => {
    const { customerId, content } = req.body;
    const deliveryId = req.user.id;

    const message = await messageService.sendGeneralDeliveryToCustomerMessage(
      deliveryId,
      customerId,
      content
    );

    res.status(201).json({
      success: true,
      data: message,
    });
  }
);

/**
 * @desc    Get all conversations for a delivery user
 * @route   GET /api/messages/delivery/conversations
 * @access  Private (Delivery)
 */
exports.getDeliveryConversations = asyncHandler(async (req, res) => {
  const deliveryId = req.user.id;

  // Get conversations with vendors, customers, and admins
  const conversations = await messageService.getDeliveryConversations(
    deliveryId
  );

  res.status(200).json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
});

/**
 * @desc    Get conversation history between current user and another user
 * @route   GET /api/messages/conversation/:otherUserId
 * @access  Private (All authenticated users)
 */
exports.getConversationHistory = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const { otherUserId } = req.params;

  // Get conversation history between the two users
  const messages = await messageService.getConversationHistory(
    currentUserId,
    otherUserId
  );

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});

/**
 * @desc    Search users for messaging
 * @route   GET /api/messages/users/search
 * @access  Private (Customer, Vendor)
 */
exports.searchUsersForMessaging = asyncHandler(async (req, res) => {
  const { q: searchTerm, type = "all" } = req.query;
  const currentUserId = req.user.id;
  const currentUserRole = req.user.role;

  // Determine target role based on current user role
  let targetRole;
  if (currentUserRole === "customer") {
    targetRole = type === "vendor" ? "vendor" : "all";
  } else if (currentUserRole === "vendor") {
    targetRole = type === "customer" ? "customer" : "all";
  } else {
    targetRole = "all";
  }

  const users = await messageService.searchUsersForMessaging(
    searchTerm,
    targetRole,
    currentUserId
  );

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

/**
 * @desc    Get all users for messaging (customers and delivery boys) for vendor
 * @route   GET /api/messages/users/all
 * @access  Private (Vendor)
 */
exports.getAllUsersForMessaging = asyncHandler(async (req, res) => {
  console.log("🔍 Fetching all users for messaging...");
  console.log("👤 Current user:", req.user.id, "Role:", req.user.role);

  const excludeRole = req.query.exclude;
  console.log("🚫 Exclude role:", excludeRole);

  const userData = await messageService.getAllUsersForMessaging(
    req.user.id,
    req.user.role, // Add the missing currentUserRole parameter
    excludeRole
  );

  console.log("👥 Found users:", {
    vendors: userData.vendors?.length || 0,
    customers: userData.customers?.length || 0,
    deliveryBoys: userData.deliveryBoys?.length || 0,
    admins: userData.admins?.length || 0,
  });

  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: userData,
  });
});

// ============================================
// UNIVERSAL MESSAGING CONTROLLER FUNCTIONS
// ============================================

/**
 * @desc    Send message from vendor to delivery boy
 * @route   POST /api/messages/vendor-to-delivery/general
 * @access  Private (Vendor)
 */
exports.sendVendorToDeliveryMessage = asyncHandler(async (req, res) => {
  const { deliveryBoyId, content } = req.body;
  const vendorId = req.user.id;

  const message = await messageService.sendGeneralVendorToDeliveryMessage(
    vendorId,
    deliveryBoyId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send message from delivery boy to vendor
 * @route   POST /api/messages/delivery-to-vendor/general
 * @access  Private (Delivery)
 */
exports.sendDeliveryToVendorMessage = asyncHandler(async (req, res) => {
  const { vendorId, content } = req.body;
  const deliveryBoyId = req.user.id;

  const message = await messageService.sendGeneralDeliveryToVendorMessage(
    deliveryBoyId,
    vendorId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send message from delivery boy to customer
 * @route   POST /api/messages/delivery-to-customer/general
 * @access  Private (Delivery)
 */
exports.sendDeliveryToCustomerMessage = asyncHandler(async (req, res) => {
  const { customerId, content } = req.body;
  const deliveryBoyId = req.user.id;

  const message = await messageService.sendGeneralDeliveryToCustomerMessage(
    deliveryBoyId,
    customerId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Get delivery boys directory for vendor messaging
 * @route   GET /api/messages/delivery/directory
 * @access  Private (Vendor)
 */
exports.getDeliveryBoysDirectory = asyncHandler(async (req, res) => {
  const deliveryBoys = await messageService.getDeliveryBoysDirectory();

  res.status(200).json({
    success: true,
    data: deliveryBoys,
  });
});

/**
 * @desc    Send general message from delivery to vendor
 * @route   POST /api/messages/delivery-to-vendor/general
 * @access  Private (Delivery)
 */
exports.sendGeneralDeliveryToVendorMessage = asyncHandler(async (req, res) => {
  const { vendorId, content } = req.body;
  const deliveryId = req.user.id;

  console.log(
    `🚚 Controller: Delivery ${deliveryId} sending message to vendor ${vendorId}`
  );
  console.log("Request body:", req.body);

  if (!vendorId || !content) {
    return res.status(400).json({
      success: false,
      message: "Please provide vendorId and content",
    });
  }

  const message = await messageService.sendGeneralDeliveryToVendorMessage(
    deliveryId,
    vendorId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send general message from delivery to admin
 * @route   POST /api/messages/delivery-to-admin/general
 * @access  Private (Delivery)
 */
exports.sendGeneralDeliveryToAdminMessage = asyncHandler(async (req, res) => {
  const { adminId, content } = req.body;
  const deliveryId = req.user.id;

  console.log(
    `🚚 Controller: Delivery ${deliveryId} sending message to admin ${adminId}`
  );
  console.log("Request body:", req.body);

  if (!adminId || !content) {
    return res.status(400).json({
      success: false,
      message: "Please provide adminId and content",
    });
  }

  const message = await messageService.sendGeneralDeliveryToAdminMessage(
    deliveryId,
    adminId,
    content
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Send general message from delivery to customer
 * @route   POST /api/messages/delivery-to-customer/general
 * @access  Private (Delivery)
 */
exports.sendGeneralDeliveryToCustomerMessage = asyncHandler(
  async (req, res) => {
    const { customerId, content } = req.body;
    const deliveryId = req.user.id;

    console.log(
      `🚚 Controller: Delivery ${deliveryId} sending message to customer ${customerId}`
    );
    console.log("Request body:", req.body);

    if (!customerId || !content) {
      return res.status(400).json({
        success: false,
        message: "Please provide customerId and content",
      });
    }

    const message = await messageService.sendGeneralDeliveryToCustomerMessage(
      deliveryId,
      customerId,
      content
    );

    res.status(201).json({
      success: true,
      data: message,
    });
  }
);

/**
 * @desc    Get delivery conversations
 * @route   GET /api/messages/delivery/conversations
 * @access  Private (Delivery)
 */
exports.getDeliveryConversations = asyncHandler(async (req, res) => {
  const deliveryId = req.user.id;

  console.log(
    `🚚 Controller: Fetching conversations for delivery ${deliveryId}`
  );

  const conversations = await messageService.getDeliveryConversations(
    deliveryId
  );

  res.status(200).json({
    success: true,
    data: conversations,
  });
});

/**
 * @desc    Get all users for messaging (vendors, admins, customers, delivery)
 * @route   GET /api/messages/users/all
 * @access  Private (All authenticated users)
 */
exports.getAllUsersForMessaging = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  console.log(
    `👥 Controller: Getting all users for ${userRole} with ID ${userId}`
  );

  const users = await messageService.getAllUsersForMessaging(userId, userRole);

  res.status(200).json({
    success: true,
    data: users,
  });
});

/**
 * @desc    Send universal message (auto-detects roles)
 * @route   POST /api/messages/universal/send
 * @access  Private (All roles)
 */
exports.sendUniversalMessage = asyncHandler(async (req, res) => {
  const { receiverId, content, receiverRole } = req.body;
  const senderId = req.user.id;
  const senderRole = req.user.role;

  const message = await messageService.sendUniversalMessage(
    senderId,
    receiverId,
    content,
    senderRole,
    receiverRole
  );

  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Get universal conversations for any role
 * @route   GET /api/messages/universal/conversations
 * @access  Private (All roles)
 */
exports.getUniversalConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  const conversations = await messageService.getUniversalConversations(
    userId,
    userRole
  );

  res.status(200).json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
});
