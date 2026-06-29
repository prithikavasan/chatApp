const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');

/**
 * @desc    Create a new Group Chat
 * @route   POST /api/conversations/group
 * @access  Private
 */
const createGroupChat = async (req, res, next) => {
  try {
    const { groupName, groupDescription, participants } = req.body;

    if (!groupName) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: 'Please select at least one member to add' });
    }

    // Add current user to group participants and admins
    const allParticipants = [...new Set([...participants, req.user._id.toString()])];

    const group = await Conversation.create({
      isGroupChat: true,
      groupName,
      groupDescription: groupDescription || '',
      groupAdmins: [req.user._id],
      participants: allParticipants,
    });

    const populatedGroup = await Conversation.findById(group._id)
      .populate('participants', 'name username profilePic status lastSeen')
      .populate('groupAdmins', 'name username profilePic');

    res.status(217).json({ success: true, conversation: populatedGroup }); // 201 Created
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all conversations (1-on-1 and Groups) for current user
 * @route   GET /api/conversations
 * @access  Private
 */
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch conversations where current user is a participant
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name username profilePic status lastSeen themePreference')
      .populate('groupAdmins', 'name username profilePic')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name username',
        },
      })
      .sort({ updatedAt: -1 });

    // Fetch user settings to identify pinned/muted/archived conversations
    const user = await User.findById(userId);

    // Attach unread messages count, pin, mute, and archive status on the fly
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          seenBy: { $ne: userId },
          deletedForEveryone: false,
          deletedFor: { $ne: userId },
        });

        return {
          ...conv.toObject(),
          unreadCount,
          isPinned: user.pinnedChats.includes(conv._id),
          isMuted: user.mutedChats.includes(conv._id),
          isArchived: user.archivedChats.includes(conv._id),
        };
      })
    );

    res.status(200).json({ success: true, conversations: conversationsWithDetails });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Conversation details
 * @route   GET /api/conversations/:id
 * @access  Private
 */
const getConversationById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: userId,
    })
      .populate('participants', 'name username profilePic bio status lastSeen chatCode')
      .populate('groupAdmins', 'name username profilePic chatCode');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or access denied' });
    }

    const user = await User.findById(userId);

    res.status(200).json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        isPinned: user.pinnedChats.includes(conversation._id),
        isMuted: user.mutedChats.includes(conversation._id),
        isArchived: user.archivedChats.includes(conversation._id),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Rename a Group
 * @route   PUT /api/conversations/group/:id/rename
 * @access  Private
 */
const renameGroup = async (req, res, next) => {
  try {
    const { groupName } = req.body;
    const { id } = req.params;

    if (!groupName) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await Conversation.findOne({ _id: id, isGroupChat: true });
    if (!group) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // Verify current user is admin
    if (!group.groupAdmins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can rename the group' });
    }

    group.groupName = groupName;
    await group.save();

    res.status(200).json({ success: true, groupName: group.groupName });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Group Description
 * @route   PUT /api/conversations/group/:id/description
 * @access  Private
 */
const updateGroupDescription = async (req, res, next) => {
  try {
    const { groupDescription } = req.body;
    const { id } = req.params;

    const group = await Conversation.findOne({ _id: id, isGroupChat: true });
    if (!group) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    if (!group.groupAdmins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can update group details' });
    }

    group.groupDescription = groupDescription || '';
    await group.save();

    res.status(200).json({ success: true, groupDescription: group.groupDescription });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Group Icon
 * @route   PUT /api/conversations/group/:id/icon
 * @access  Private
 */
const updateGroupIcon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Conversation.findOne({ _id: id, isGroupChat: true });
    if (!group) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    if (!group.groupAdmins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can update the group icon' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, 'image', req.file.originalname);
    group.groupIcon = uploadResult.url;
    await group.save();

    res.status(200).json({ success: true, groupIcon: group.groupIcon });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add Members to Group
 * @route   PUT /api/conversations/group/:id/add
 * @access  Private
 */
const addMembersToGroup = async (req, res, next) => {
  try {
    const { userIds } = req.body; // array of userIds
    const { id } = req.params;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Provide userIds to add' });
    }

    const group = await Conversation.findOne({ _id: id, isGroupChat: true });
    if (!group) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    if (!group.groupAdmins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Add unique participants
    const currentParticipants = group.participants.map(p => p.toString());
    const newParticipants = userIds.filter(userId => !currentParticipants.includes(userId));

    if (newParticipants.length === 0) {
      return res.status(400).json({ message: 'All selected users are already members of this group' });
    }

    group.participants.push(...newParticipants);
    await group.save();

    const populatedGroup = await Conversation.findById(id)
      .populate('participants', 'name username profilePic status lastSeen')
      .populate('groupAdmins', 'name username profilePic');

    res.status(200).json({ success: true, conversation: populatedGroup });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove Member or Leave Group
 * @route   PUT /api/conversations/group/:id/remove
 * @access  Private
 */
const removeMemberFromGroup = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const { id } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const group = await Conversation.findOne({ _id: id, isGroupChat: true });
    if (!group) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // If target userId is NOT current user (meaning an admin is removing someone), verify admin authorization
    if (userId !== req.user._id.toString() && !group.groupAdmins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    // Filter out user from participants
    group.participants = group.participants.filter(p => p.toString() !== userId);
    // Filter out user from admins
    group.groupAdmins = group.groupAdmins.filter(a => a.toString() !== userId);

    // If no participants left, delete conversation completely
    if (group.participants.length === 0) {
      await Conversation.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: 'Group empty. Group deleted.' });
    }

    // If leaving user was the sole admin and there are still users, assign a new admin
    if (group.groupAdmins.length === 0 && group.participants.length > 0) {
      group.groupAdmins.push(group.participants[0]);
    }

    await group.save();

    const populatedGroup = await Conversation.findById(id)
      .populate('participants', 'name username profilePic status lastSeen')
      .populate('groupAdmins', 'name username profilePic');

    res.status(200).json({ success: true, conversation: populatedGroup });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Pinned Conversation
 * @route   PUT /api/conversations/pin/:id
 * @access  Private
 */
const togglePinConversation = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const convId = req.params.id;

    const isPinned = user.pinnedChats.includes(convId);

    if (isPinned) {
      user.pinnedChats = user.pinnedChats.filter(id => id.toString() !== convId);
    } else {
      user.pinnedChats.push(convId);
    }

    await user.save();
    res.status(200).json({ success: true, pinnedChats: user.pinnedChats });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Muted Conversation
 * @route   PUT /api/conversations/mute/:id
 * @access  Private
 */
const toggleMuteConversation = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const convId = req.params.id;

    const isMuted = user.mutedChats.includes(convId);

    if (isMuted) {
      user.mutedChats = user.mutedChats.filter(id => id.toString() !== convId);
    } else {
      user.mutedChats.push(convId);
    }

    await user.save();
    res.status(200).json({ success: true, mutedChats: user.mutedChats });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Archived Conversation
 * @route   PUT /api/conversations/archive/:id
 * @access  Private
 */
const toggleArchiveConversation = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const convId = req.params.id;

    const isArchived = user.archivedChats.includes(convId);

    if (isArchived) {
      user.archivedChats = user.archivedChats.filter(id => id.toString() !== convId);
    } else {
      user.archivedChats.push(convId);
    }

    await user.save();
    res.status(200).json({ success: true, archivedChats: user.archivedChats });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroupChat,
  getConversations,
  getConversationById,
  renameGroup,
  updateGroupDescription,
  updateGroupIcon,
  addMembersToGroup,
  removeMemberFromGroup,
  togglePinConversation,
  toggleMuteConversation,
  toggleArchiveConversation,
};
