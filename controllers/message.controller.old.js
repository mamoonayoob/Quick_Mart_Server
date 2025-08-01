const messageService = require('../services/message.service');
const asyncHandler = require('../middleware/async');

/**
 * @desc    Send message from customer to vendor
 * @route   POST /api/messages/customer-to-vendor
 * @access  Private (Customer)
 */
exports.sendCustomerToVendorMessage = asyncHandler(async (req, res) => {
  const { orderId, content } = req.body;
  const customerId = req.user.id;

  const message = await messageService.sendCustomerToVendorMessage(customerId, orderId, content);

  res.status(201).json({
    success: true,
    data: message
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

  const message = await messageService.sendVendorToCustomerMessage(vendorId, orderId, content);

  res.status(201).json({
    success: true,
    data: message
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

  const message = await messageService.sendCustomerToAdminMessage(customerId, content, orderId);

  res.status(201).json({
    success: true,
    data: message
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

  const message = await messageService.sendAdminToCustomerMessage(adminId, customerId, content, orderId);

  res.status(201).json({
    success: true,
    data: message
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

  const message = await messageService.sendAdminToAdminsMessage(adminId, content);

  res.status(201).json({
    success: true,
    data: message
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
    data: vendor
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
    data: messages
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
    data: messages
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
    data: messages
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
    data: messages
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
    data: message
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
    count
  });
});
