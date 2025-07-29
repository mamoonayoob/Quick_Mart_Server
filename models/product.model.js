const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a product name"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a product description"],
    },
    price: {
      type: Number,
      required: [true, "Please provide a product price"],
      min: 0,
    },
    status: {
      type: String,
      required: [true, "Please provide a product status"],
      enum: ["Active", "Inactive"],
    },
    category: {
      type: String,
      required: [true, "Please provide a product category"],
      // enum: [
      //   'electronics',
      //   'clothing',
      //   'food',
      //   'beverages',
      //   'household',
      //   'health',
      //   'beauty',
      //   'sports',
      //   'toys',
      //   'books',
      //   'other',
      // ],
    },
    image: {
      type: String,
      required: [true, "Please provide a main product image"],
    },
    supportImages: [
      {
        type: String,
      },
    ],
    // images: [
    //   {
    //     type: String,
    //   },
    // ],
    stock: {
      type: Number,
      required: [true, "Please provide product stock"],
      min: 0,
      default: 0,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    reviews: [reviewSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// Calculate average rating when reviews are modified
productSchema.pre("save", function (next) {
  if (this.reviews.length > 0) {
    this.averageRating =
      this.reviews.reduce((acc, item) => item.rating + acc, 0) /
      this.reviews.length;
    this.numReviews = this.reviews.length;
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
