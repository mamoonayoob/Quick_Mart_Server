const admin = require("../config/firebase");
const Notification = require("../models/notification.model");

/**
 * Send notification to a user
 * @param {string} userId - User ID to send notification to
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data for the notification
 * @returns {Promise<Object>} - Notification object
 */
exports.sendNotification = async (userId, title, message, data = {}) => {
  try {
    // Determine the correct onModel value based on data type
    let onModel = "User"; // Default to User if no specific type
    let relatedTo = null;

    if (data.orderId) {
      onModel = "Order";
      relatedTo = data.orderId;
    } else if (data.productId) {
      onModel = "Product";
      relatedTo = data.productId;
    } else if (data.userId) {
      onModel = "User";
      relatedTo = data.userId;
    }

    // Save notification to database
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type: "system",
      relatedTo: relatedTo,
      onModel: onModel, // Always provide a valid enum value
      data,
    });

    // Get user's FCM token (in a real app, you would store this with the user)
    // For this example, we'll assume we don't have the token and just return the notification
    // In a real app, you would get the token and send the notification via FCM
    /*
    const user = await User.findById(userId);
    if (user && user.fcmToken) {
      const message = {
        notification: {
          title,
          body: message,
        },
        data: {
          ...data,
          notificationId: notification._id.toString(),
        },
        token: user.fcmToken,
      };

      const response = await admin.messaging().send(message);
      console.log('Notification sent:', response);
    }
    */

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

/**
 * Get notifications for a user
 * @param {string} userId - User ID to get notifications for
 * @param {boolean} unreadOnly - Get only unread notifications
 * @returns {Promise<Array>} - Array of notification objects
 */
exports.getUserNotifications = async (userId, unreadOnly = false) => {
  try {
    const query = { user: userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .populate("relatedTo");

    return notifications;
  } catch (error) {
    console.error("Error getting notifications:", error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID to mark as read
 * @param {string} userId - User ID who owns the notification
 * @returns {Promise<Object>} - Updated notification object
 */
exports.markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID to mark all notifications as read
 * @returns {Promise<Object>} - Result of the update operation
 */
exports.markAllNotificationsAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );

    return result;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};
