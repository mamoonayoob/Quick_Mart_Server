const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary").cloudinary;

// Set up storage engine for different types of uploads
const createStorage = (folder) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `quickmart/${folder}`,
      allowed_formats: ["jpg", "jpeg", "png", "gif"],
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    },
  });
};

// Create different upload instances for different types of content
const profileImageStorage = createStorage("profiles");
const productImageStorage = createStorage("products");
const businessLogoStorage = createStorage("business");

// Set up multer upload for different types
exports.uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
}).single("profileImage");

exports.uploadProductImages = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).array("images", 5); // Allow up to 5 images

exports.uploadBusinessLogo = multer({
  storage: businessLogoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
}).single("businessLogo");

// Error handling middleware for multer errors
exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message:
          "File size too large. Maximum size allowed is 2MB for profile images and 5MB for product images.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }
  next(err);
};
