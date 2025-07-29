const { validationResult } = require("express-validator");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");

/**
 * @desc    Get user cart
 * @route   GET /api/user/cart
 * @access  Private
 */
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate({
      path: "items.product",
      select: "name price image supportImages stock isAvailable",
    });

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Error in getCart:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/user/cart
 * @access  Private
 */
exports.addToCart = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { productId, quantity } = req.body;

    // Check if product exists and is available
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    if (!product.isAvailable || product.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: "Product is not available or insufficient stock",
      });
    }

    // Find user's cart or create a new one
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    // Check if product already in cart
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      // Update quantity if product already in cart
      cart.items[itemIndex].quantity += quantity;
      // Ensure price is set
      cart.items[itemIndex].price = product.price;
    } else {
      // Add new item to cart with price
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
      });
    }

    // Calculate total
    cart.totalAmount = cart.items.reduce((total, item) => {
      return total + item.quantity * product.price;
    }, 0);

    await cart.save();

    // Return updated cart with populated product details
    cart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name price images stock isAvailable",
    });

    res.status(200).json({
      success: true,
      data: cart,
      message: "Item added to cart",
    });
  } catch (error) {
    console.error("Error in addToCart:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/user/cart/:productId
 * @access  Private
 */
exports.updateCartItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        error: "Insufficient stock",
      });
    }

    // Find user's cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found",
      });
    }

    // Find the item in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Item not found in cart",
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;

    // Recalculate total amount
    await cart.save();

    // Return updated cart with populated product details
    cart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name price images stock isAvailable",
    });

    res.status(200).json({
      success: true,
      data: cart,
      message: "Cart updated",
    });
  } catch (error) {
    console.error("Error in updateCartItem:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/user/cart/:productId
 * @access  Private
 */
exports.removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;

    // Find user's cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found",
      });
    }

    // Filter out the item to remove
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    // Recalculate total amount
    await cart.save();

    // Return updated cart with populated product details
    cart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name price images stock isAvailable",
    });

    res.status(200).json({
      success: true,
      data: cart,
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("Error in removeCartItem:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Clear cart
 * @route   DELETE /api/user/cart
 * @access  Private
 */
exports.clearCart = async (req, res) => {
  try {
    // Find user's cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found",
      });
    }

    // Clear items and reset total
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    res.status(200).json({
      success: true,
      data: cart,
      message: "Cart cleared",
    });
  } catch (error) {
    console.error("Error in clearCart:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Get user notifications
 * @route   GET /api/user/notifications
 * @access  Private
 */
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/user/notifications/:id/read
 * @access  Private
 */
exports.markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/user/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    await notification.remove();

    res.status(200).json({
      success: true,
      data: {},
      message: "Notification removed",
    });
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Get user wishlist
 * @route   GET /api/user/wishlist
 * @access  Private
 */
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "wishlist",
      select: "name price image description category rating isAvailable stock",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      count: user.wishlist.length,
      data: user.wishlist,
    });
  } catch (error) {
    console.error("Error in getWishlist:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Add item to wishlist
 * @route   POST /api/user/wishlist
 * @access  Private
 */
exports.addToWishlist = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { productId } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    const user = await User.findById(req.user.id);

    // Check if product already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({
        success: false,
        error: "Product already in wishlist",
      });
    }

    // Add to wishlist
    user.wishlist.push(productId);
    await user.save();

    // Return updated wishlist
    const updatedUser = await User.findById(req.user.id).populate({
      path: "wishlist",
      select: "name price images description category rating",
    });

    res.status(200).json({
      success: true,
      data: updatedUser.wishlist,
      message: "Item added to wishlist",
    });
  } catch (error) {
    console.error("Error in addToWishlist:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

/**
 * @desc    Remove item from wishlist
 * @route   DELETE /api/user/wishlist/:productId
 * @access  Private
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);

    // Check if product in wishlist
    if (!user.wishlist.includes(productId)) {
      return res.status(400).json({
        success: false,
        error: "Product not in wishlist",
      });
    }

    // Remove from wishlist
    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    await user.save();

    // Return updated wishlist
    const updatedUser = await User.findById(req.user.id).populate({
      path: "wishlist",
      select: "name price images description category rating",
    });

    res.status(200).json({
      success: true,
      data: updatedUser.wishlist,
      message: "Item removed from wishlist",
    });
  } catch (error) {
    console.error("Error in removeFromWishlist:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};
