const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const notificationController = require("../controllers/notification.controller");

// Routes accessible by all authenticated users
router.get("/", protect, notificationController.getMyNotifications);

router.post("/register-token", protect, notificationController.registerToken);

router.put("/:id/read", protect, notificationController.markNotificationAsRead);

router.put(
  "/read-all",
  protect,
  notificationController.markAllNotificationsAsRead
);

router.get(
  "/unread/count",
  protect,
  notificationController.getUnreadNotificationCount
);

router.delete("/:id", protect, notificationController.deleteNotification);

// Admin-only routes
router.post(
  "/",
  protect,
  authorize("admin"),
  notificationController.sendNotificationToUser
);

module.exports = router;
