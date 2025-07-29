const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    deliveryPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "rejected",
      ],
      default: "pending",
    },
    currentLocation: locationSchema,
    locationHistory: [locationSchema],
    pickupTime: {
      type: Date,
    },
    deliveryTime: {
      type: Date,
    },
    estimatedDeliveryTime: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
    },
    isAccepted: {
      type: Boolean,
      default: false,
    },
    acceptedAt: {
      type: Date,
    },
    route: {
      type: Object,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", deliverySchema);
