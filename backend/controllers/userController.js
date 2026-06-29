const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const FriendRequest = require('../models/FriendRequest');
const { uploadToCloudinary } = require('../utils/cloudinary');
const bcrypt = require('bcryptjs');

/**
 * @desc    Update user profile details
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, bio, themePreference, themeColor, chatBackground } = req.body;

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (themePreference) user.themePreference = themePreference;
    if (themeColor) user.themeColor = themeColor;
    if (chatBackground !== undefined) user.chatBackground = chatBackground;

    // Handle Profile Picture upload if file exists
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'image', req.file.originalname);
        user.profilePic = uploadResult.url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Failed to upload profile picture' });
      }
    }

    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        chatCode: updatedUser.chatCode,
        profilePic: updatedUser.profilePic,
        bio: updatedUser.bio,
        themePreference: updatedUser.themePreference,
        themeColor: updatedUser.themeColor,
        chatBackground: updatedUser.chatBackground,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change User Password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new passwords' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Block/Unblock User
 * @route   PUT /api/users/block/:id
 * @access  Private
 */
const toggleBlockUser = async (req, res, next) => {
  try {
    const userIdToBlock = req.params.id;
    if (userIdToBlock === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot block yourself' });
    }

    const targetUser = await User.findById(userIdToBlock);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const user = await User.findById(req.user._id);

    const isBlocked = user.blockedUsers.includes(userIdToBlock);

    if (isBlocked) {
      user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userIdToBlock);
      await user.save();
      res.status(200).json({ success: true, message: 'User unblocked successfully', blockedUsers: user.blockedUsers });
    } else {
      user.blockedUsers.push(userIdToBlock);
      await user.save();
      res.status(200).json({ success: true, message: 'User blocked successfully', blockedUsers: user.blockedUsers });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get blocked users list
 * @route   GET /api/users/blocked
 * @access  Private
 */
const getBlockedUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'name username profilePic email chatCode');
    res.status(200).json({ success: true, blockedUsers: user.blockedUsers });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account entirely
 * @route   DELETE /api/users/account
 * @access  Private
 */
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Delete user from all conversations
    await Conversation.updateMany(
      { participants: userId },
      { $pull: { participants: userId, groupAdmins: userId } }
    );

    // 2. Delete conversations where participants list becomes empty
    await Conversation.deleteMany({ participants: { $size: 0 } });

    // 3. Delete Friend requests sent or received
    await FriendRequest.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }],
    });

    // 4. Delete the User record
    await User.findByIdAndDelete(userId);

    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  changePassword,
  toggleBlockUser,
  getBlockedUsers,
  deleteAccount,
};
