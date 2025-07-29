const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const messageController = require("../controllers/message.controller");

// Routes for customer
router.post(
  "/customer-to-vendor",
  protect,
  authorize("customer"),
  messageController.sendCustomerToVendorMessage
);

router.post(
  "/customer-to-admin",
  protect,
  authorize("customer"),
  messageController.sendCustomerToAdminMessage
);

router.get(
  "/customer",
  protect,
  authorize("customer"),
  messageController.getCustomerMessages
);

// Routes for vendor
router.post(
  "/vendor-to-customer",
  protect,
  authorize("vendor"),
  messageController.sendVendorToCustomerMessage
);

router.get(
  "/vendor",
  protect,
  authorize("vendor"),
  messageController.getVendorMessages
);

// Routes for admin
router.post(
  "/admin-to-customer",
  protect,
  authorize("admin"),
  messageController.sendAdminToCustomerMessage
);

router.post(
  "/admin-to-delivery/general",
  protect,
  authorize("admin"),
  messageController.sendGeneralAdminToDeliveryMessage
);

router.post(
  "/admin-to-vendor/general",
  protect,
  authorize("admin"),
  messageController.sendGeneralAdminToVendorMessage
);

router.post(
  "/admin-to-customer/general",
  protect,
  authorize("admin"),
  messageController.sendGeneralAdminToCustomerMessage
);

router.post(
  "/admin-to-admins",
  protect,
  authorize("admin"),
  messageController.sendAdminToAdminsMessage
);

router.get(
  "/admin",
  protect,
  authorize("admin"),
  messageController.getAdminMessages
);

// Common routes
router.get(
  "/vendor/:orderId",
  protect,
  authorize("customer", "admin"),
  messageController.getVendorByOrderId
);

router.get(
  "/order/:orderId",
  protect,
  authorize("customer", "vendor", "admin"),
  messageController.getMessagesByOrderId
);

router.put(
  "/:messageId/read",
  protect,
  authorize("customer", "vendor", "admin"),
  messageController.markMessageAsRead
);

router.get(
  "/unread/count",
  protect,
  authorize("customer", "vendor", "admin", "delivery"),
  messageController.getUnreadMessageCount
);

// ============================================
// ENHANCED GENERAL MESSAGING ROUTES
// ============================================

// General messaging routes (not order-based)
router.post(
  "/customer-to-vendor/general",
  protect,
  authorize("customer"),
  messageController.sendGeneralCustomerToVendorMessage
);

router.post(
  "/vendor-to-customer/general",
  protect,
  authorize("vendor"),
  messageController.sendGeneralVendorToCustomerMessage
);

// Customer to Admin messaging
router.post(
  "/customer-to-admin/general",
  protect,
  authorize("customer"),
  messageController.sendGeneralCustomerToAdminMessage
);

// Customer to Delivery messaging
router.post(
  "/customer-to-delivery/general",
  protect,
  authorize("customer"),
  messageController.sendGeneralCustomerToDeliveryMessage
);

// Enhanced conversation routes
router.get(
  "/customer/conversations",
  protect,
  authorize("customer"),
  messageController.getCustomerConversations
);

router.get(
  "/vendor/conversations",
  protect,
  authorize("vendor"),
  messageController.getVendorConversations
);

router.get(
  "/conversation/:otherUserId",
  protect,
  authorize("customer", "vendor", "delivery", "admin"),
  messageController.getConversationHistory
);

// Directory routes for browsing users
router.get(
  "/vendors/directory",
  protect,
  authorize("customer", "delivery", "admin"),
  messageController.getVendorsDirectory
);

router.get(
  "/customers/directory",
  protect,
  authorize("vendor", "delivery", "admin"),
  messageController.getCustomersDirectory
);

router.get(
  "/admins/directory",
  protect,
  authorize("customer", "vendor", "delivery"),
  messageController.getAdminsDirectory
);

router.get(
  "/users/search",
  protect,
  authorize("customer", "vendor"),
  messageController.searchUsersForMessaging
);

// Universal conversation endpoint for all user types
router.get(
  "/conversation/:otherUserId",
  protect,
  authorize("customer", "vendor", "admin", "delivery"),
  messageController.getConversationHistory
);

// ============================================
// UNIVERSAL MESSAGING ROUTES (ALL ROLES)
// ============================================

// Vendor to delivery boy messaging
router.post(
  "/vendor-to-delivery/general",
  protect,
  authorize("vendor"),
  messageController.sendVendorToDeliveryMessage
);

// These routes have been commented out to avoid duplication with the routes below
// Keeping the code for reference
// // Delivery boy to vendor messaging
// router.post(
//   "/delivery-to-vendor/general",
//   protect,
//   authorize("deliveryman", "delivery"),
//   messageController.sendDeliveryToVendorMessage
// );
//
// // Delivery boy to customer messaging
// router.post(
//   "/delivery-to-customer/general",
//   protect,
//   authorize("deliveryman", "delivery"),
//   messageController.sendDeliveryToCustomerMessage
// );

// Directory// Routes for delivery
router.get(
  "/delivery/directory",
  protect,
  authorize("vendor", "admin"),
  messageController.getDeliveryBoysDirectory
);

router.get(
  "/delivery/conversations",
  protect,
  authorize("delivery"),
  messageController.getDeliveryConversations
);

// Delivery messaging routes
router.post(
  "/delivery-to-vendor/general",
  protect,
  authorize("delivery"),
  messageController.sendGeneralDeliveryToVendorMessage
);

router.post(
  "/delivery-to-admin/general",
  protect,
  authorize("delivery"),
  messageController.sendGeneralDeliveryToAdminMessage
);

router.post(
  "/delivery-to-customer/general",
  protect,
  authorize("delivery"),
  messageController.sendGeneralDeliveryToCustomerMessage
);

// Universal messaging routes
router.post(
  "/universal/send",
  protect,
  authorize("customer", "vendor", "deliveryman", "delivery"),
  messageController.sendUniversalMessage
);

router.get(
  "/universal/conversations",
  protect,
  authorize("customer", "vendor", "deliveryman", "delivery"),
  messageController.getUniversalConversations
);

router.get(
  "/users/all",
  protect,
  authorize("customer", "vendor", "deliveryman", "delivery"),
  messageController.getAllUsersForMessaging
);

module.exports = router;
