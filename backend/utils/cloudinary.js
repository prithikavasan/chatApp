const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if keys are provided
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn('WARNING: Cloudinary credentials not set. Uploads will fallback to local simulated Data URLs.');
}

/**
 * Uploads a file buffer to Cloudinary
 * @param {Buffer} fileBuffer 
 * @param {String} resourceType 'image' | 'video' | 'raw' (for pdf/docs)
 * @param {String} originalName
 * @returns {Promise<{url: String, public_id: String}>}
 */
const uploadToCloudinary = (fileBuffer, resourceType = 'auto', originalName = '') => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) {
      // Mock Fallback: return a Base64 Data URL
      // Extract file extension to form proper mime type (approximate fallback)
      let mimeType = 'application/octet-stream';
      const ext = originalName.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
        mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      } else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
        mimeType = `video/${ext}`;
      } else if (ext === 'pdf') {
        mimeType = 'application/pdf';
      }
      
      const base64Data = fileBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      
      console.log(`Cloudinary Mock: Uploaded '${originalName}' as inline data URI.`);
      return resolve({
        url: dataUri,
        public_id: `mock_${Date.now()}`,
      });
    }

    // Direct stream upload to Cloudinary
    const { Readable } = require('stream');
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'chatcode',
        public_id: `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9]/g, '_')}`,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Deletes a resource from Cloudinary
 * @param {String} publicId 
 * @param {String} resourceType 'image' | 'video' | 'raw'
 * @returns {Promise<Object>}
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!isCloudinaryConfigured) {
    console.log(`Cloudinary Mock: Deleted resource '${publicId}'.`);
    return { result: 'ok' };
  }
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured };

