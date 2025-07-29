const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const asyncHandler = require("../middleware/async");
const { sendNotification } = require("../services/firebase.service");

/**
 * @desc    Get all notifications for the current user
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  // Check if notification belongs to user
  if (notification.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access this notification",
    });
  }

  notification.isRead = true;
  notification.readAt = Date.now();
  await notification.save();

  res.status(200).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, isRead: false },
    { isRead: true, readAt: Date.now() }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread/count
 * @access  Private
 */
exports.getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    user: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    count,
  });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  // Check if notification belongs to user
  if (notification.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this notification",
    });
  }

  await notification.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Send notification to a user (Admin only)
 * @route   POST /api/notifications
 * @access  Private (Admin)
 */
exports.sendNotificationToUser = asyncHandler(async (req, res) => {
  const { userId, title, message, data } = req.body;

  // Validate input
  if (!userId || !title || !message) {
    return res.status(400).json({
      success: false,
      message: "Please provide userId, title, and message",
    });
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Send notification
  const notification = await sendNotification(userId, title, message, data);

  res.status(201).json({
    success: true,
    data: notification,
  });
});

/**
 * @desc    Register FCM token for push notifications
 * @route   POST /api/notifications/register-token
 * @access  Private
 */
exports.registerToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;

  // Validate input
  if (!fcmToken) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid FCM token",
    });
  }

  // Update user's FCM token
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { fcmToken },
    { new: true }
  ).select("-password");

  res.status(200).json({
    success: true,
    message: "FCM token registered successfully",
    data: { user },
  });
});
