const multer = require('multer');

// Store files in memory buffer
const storage = multer.memoryStorage();

// File size limits (e.g. 50MB to support documents/videos)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

module.exports = upload;
