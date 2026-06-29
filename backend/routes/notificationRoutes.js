const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getNotifications);
router.put('/mark-all-read', protect, markAllNotificationsRead);
router.put('/:id/read', protect, markNotificationRead);
router.delete('/', protect, clearNotifications);

module.exports = router;
