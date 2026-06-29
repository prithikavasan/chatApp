const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

/**
 * Helper to fetch friend IDs for a specific user ID
 */
const getFriendIds = async (userId) => {
  const requests = await FriendRequest.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: 'accepted',
  });

  return requests.map(req => 
    req.sender.toString() === userId.toString() ? req.receiver : req.sender
  );
};

/**
 * @desc    Search user by Chat Code
 * @route   GET /api/friends/search/:chatCode
 * @access  Private
 */
const searchUserByChatCode = async (req, res, next) => {
  try {
    const { chatCode } = req.params;
    const currentUserId = req.user._id;

    if (!chatCode) {
      return res.status(400).json({ message: 'Chat Code is required' });
    }

    const targetUser = await User.findOne({ chatCode: chatCode.toUpperCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found with this Chat Code' });
    }

    // Check relationship status
    const pendingRequest = await FriendRequest.findOne({
      $or: [
        { sender: currentUserId, receiver: targetUser._id },
        { sender: targetUser._id, receiver: currentUserId }
      ]
    });

    let relationship = 'none'; // 'none', 'pending_sent', 'pending_received', 'friends'
    let requestId = null;

    if (pendingRequest) {
      requestId = pendingRequest._id;
      if (pendingRequest.status === 'accepted') {
        relationship = 'friends';
      } else if (pendingRequest.sender.toString() === currentUserId.toString()) {
        relationship = 'pending_sent';
      } else {
        relationship = 'pending_received';
      }
    }

    res.status(200).json({
      success: true,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        email: targetUser.email,
        chatCode: targetUser.chatCode,
        profilePic: targetUser.profilePic,
        bio: targetUser.bio,
        status: targetUser.status,
      },
      relationship,
      requestId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send Friend Request
 * @route   POST /api/friends/request/:chatCode
 * @access  Private
 */
const sendFriendRequest = async (req, res, next) => {
  try {
    const { chatCode } = req.params;
    const senderId = req.user._id;

    const receiver = await User.findOne({ chatCode: chatCode.toUpperCase().trim() });
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (receiver._id.toString() === senderId.toString()) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    // Check if block exists either way
    const senderUser = await User.findById(senderId);
    if (senderUser.blockedUsers.includes(receiver._id) || receiver.blockedUsers.includes(senderId)) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    // Check for existing request
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiver._id },
        { sender: receiver._id, receiver: senderId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends' });
      }
      return res.status(400).json({ message: 'A friend request is already pending between you' });
    }

    const friendRequest = await FriendRequest.create({
      sender: senderId,
      receiver: receiver._id,
      status: 'pending',
    });

    // Create Notification
    await Notification.create({
      recipient: receiver._id,
      sender: senderId,
      type: 'friend_request',
      relatedEntityId: friendRequest._id,
    });

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      friendRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept Friend Request
 * @route   PUT /api/friends/request/accept/:requestId
 * @access  Private
 */
const acceptFriendRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const receiverId = req.user._id;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.receiver.toString() !== receiverId.toString()) {
      return res.status(401).json({ message: 'Unauthorized to accept this request' });
    }

    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Create a 1-to-1 conversation if it doesn't exist
    let conversation = await Conversation.findOne({
      isGroupChat: false,
      participants: { $all: [friendRequest.sender, friendRequest.receiver] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        isGroupChat: false,
        participants: [friendRequest.sender, friendRequest.receiver],
      });
    }

    // Notify sender about request acceptance
    await Notification.create({
      recipient: friendRequest.sender,
      sender: receiverId,
      type: 'friend_request_accept',
      relatedEntityId: conversation._id,
    });

    // Mark previous friend_request notifications for this user as read
    await Notification.updateMany(
      { recipient: receiverId, relatedEntityId: friendRequest._id },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'Friend request accepted',
      conversationId: conversation._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject Friend Request
 * @route   PUT /api/friends/request/reject/:requestId
 * @access  Private
 */
const rejectFriendRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const receiverId = req.user._id;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.receiver.toString() !== receiverId.toString()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Delete the request record to allow requesting again later
    await FriendRequest.findByIdAndDelete(requestId);

    // Mark notification as read or delete it
    await Notification.deleteMany({ relatedEntityId: requestId });

    res.status(200).json({ success: true, message: 'Friend request rejected/deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel Sent Friend Request
 * @route   DELETE /api/friends/request/cancel/:requestId
 * @access  Private
 */
const cancelFriendRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const senderId = req.user._id;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.sender.toString() !== senderId.toString()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await FriendRequest.findByIdAndDelete(requestId);
    await Notification.deleteMany({ relatedEntityId: requestId });

    res.status(200).json({ success: true, message: 'Friend request cancelled' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove Friend
 * @route   DELETE /api/friends/remove/:friendId
 * @access  Private
 */
const removeFriend = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    // Delete accepted request in either direction
    const deletedRequest = await FriendRequest.findOneAndDelete({
      $or: [
        { sender: userId, receiver: friendId, status: 'accepted' },
        { sender: friendId, receiver: userId, status: 'accepted' }
      ]
    });

    if (!deletedRequest) {
      return res.status(404).json({ message: 'Friend connection not found' });
    }

    res.status(200).json({ success: true, message: 'Friend removed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get List of Friends
 * @route   GET /api/friends/list
 * @access  Private
 */
const getFriendsList = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const friendIds = await getFriendIds(userId);

    const friends = await User.find({ _id: { $in: friendIds } })
      .select('name username profilePic email chatCode bio status lastSeen');

    res.status(200).json({ success: true, friends });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Mutual Friends count and list
 * @route   GET /api/friends/mutual/:friendId
 * @access  Private
 */
const getMutualFriends = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    const myFriendIds = await getFriendIds(userId);
    const targetFriendIds = await getFriendIds(friendId);

    const myFriendStrings = myFriendIds.map(id => id.toString());
    const mutualIds = targetFriendIds.filter(id => myFriendStrings.includes(id.toString()));

    const mutualFriends = await User.find({ _id: { $in: mutualIds } })
      .select('name username profilePic chatCode');

    res.status(200).json({
      success: true,
      count: mutualFriends.length,
      mutualFriends,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all requests (received pending and sent pending)
 * @route   GET /api/friends/requests
 * @access  Private
 */
const getPendingRequests = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const received = await FriendRequest.find({ receiver: userId, status: 'pending' })
      .populate('sender', 'name username profilePic chatCode status');

    const sent = await FriendRequest.find({ sender: userId, status: 'pending' })
      .populate('receiver', 'name username profilePic chatCode status');

    res.status(200).json({
      success: true,
      received,
      sent,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUserByChatCode,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriendsList,
  getMutualFriends,
  getPendingRequests,
};
