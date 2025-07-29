const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'vendor', 'delivery', 'admin'],
      default: 'customer',
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    profileImage: {
      type: String,
      default: 'default-profile.jpg',
    },
    // Vendor specific fields
    businessName: {
      type: String,
      required: function() {
        return this.role === 'vendor';
      },
    },
    businessDescription: {
      type: String,
      required: function() {
        return this.role === 'vendor';
      },
    },
    businessLogo: {
      type: String,
      default: function() {
        return this.role === 'vendor' ? 'default-business-logo.jpg' : undefined;
      },
    },
    // Delivery personnel specific fields
    vehicleType: {
      type: String,
      required: function() {
        return this.role === 'delivery';
      },
      enum: ['bicycle', 'motorcycle', 'car', 'van', 'truck'],
    },
    licenseNumber: {
      type: String,
      required: function() {
        return this.role === 'delivery';
      },
    },
    // Admin specific fields
    adminLevel: {
      type: String,
      enum: ['junior', 'senior', 'super'],
      required: function() {
        return this.role === 'admin';
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    wishlist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    fcmToken: {
      type: String,
      default: null
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
