const Notification = require('../models/Notification');

/**
 * @desc    Get unread notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
      isRead: false,
    })
      .populate('sender', 'name username profilePic chatCode')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete all notifications for current user
 * @route   DELETE /api/notifications
 * @access  Private
 */
const clearNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.status(200).json({ success: true, message: 'Notifications cleared' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
};
