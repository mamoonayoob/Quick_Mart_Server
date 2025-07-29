const cloudinary = require('../config/cloudinary').cloudinary;

/**
 * Upload a file to Cloudinary
 * @param {string} filePath - Path to the file to upload
 * @param {string} folder - Folder to upload the file to
 * @returns {Promise<Object>} - Cloudinary upload response
 */
exports.uploadFile = async (filePath, folder = 'quickmart') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });

    return result;
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @returns {Promise<Object>} - Cloudinary delete response
 */
exports.deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

/**
 * Get a transformed URL for an image
 * @param {string} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} - Transformed image URL
 */
exports.getImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    width: 500,
    height: 500,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  };

  const transformOptions = { ...defaultOptions, ...options };

  return cloudinary.url(publicId, transformOptions);
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array<string>} filePaths - Array of file paths to upload
 * @param {string} folder - Folder to upload the files to
 * @returns {Promise<Array<Object>>} - Array of Cloudinary upload responses
 */
exports.uploadMultipleFiles = async (filePaths, folder = 'quickmart') => {
  try {
    const uploadPromises = filePaths.map(filePath =>
      exports.uploadFile(filePath, folder)
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error uploading multiple files to Cloudinary:', error);
    throw error;
  }
};
