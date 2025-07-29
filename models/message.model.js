const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    messageType: {
      type: String,
      enum: [
        "customer-to-vendor",
        "vendor-to-customer",
        "customer-to-admin",
        "admin-to-customer",
        "vendor-to-delivery",
        "delivery-to-vendor",
        "general", // For general messaging between any user types
      ],
      required: true,
    },
    // For admin-to-admin messages, we can store all admin recipients
    adminRecipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // For tracking if the message is read by multiple admins
    readByAdmins: [
      {
        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
        },
      },
    ],
  },
  { timestamps: true }
);

// Create indexes for faster queries
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ orderId: 1 });
messageSchema.index({ messageType: 1 });

module.exports = mongoose.model("Message", messageSchema);
