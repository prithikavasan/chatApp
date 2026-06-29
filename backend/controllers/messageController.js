const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { uploadToCloudinary } = require('../utils/cloudinary');

/**
 * Helper to determine resource type and message type for Cloudinary and Schema from mime type
 */
const detectFileType = (mimetype, filename) => {
  if (!mimetype) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return { rType: 'image', mType: ext === 'gif' ? 'gif' : 'image' };
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return { rType: 'video', mType: 'video' };
    if (ext === 'pdf') return { rType: 'raw', mType: 'pdf' };
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return { rType: 'video', mType: 'voice' }; // voice is uploaded as video/audio in Cloudinary
    return { rType: 'raw', mType: 'document' };
  }

  if (mimetype.startsWith('image/')) {
    if (mimetype.includes('gif')) return { rType: 'image', mType: 'gif' };
    return { rType: 'image', mType: 'image' };
  }
  if (mimetype.startsWith('video/')) return { rType: 'video', mType: 'video' };
  if (mimetype.startsWith('audio/')) return { rType: 'video', mType: 'voice' };
  if (mimetype === 'application/pdf') return { rType: 'raw', mType: 'pdf' };
  
  return { rType: 'raw', mType: 'document' };
};

/**
 * @desc    Send a message (Text, Code, File upload)
 * @route   POST /api/messages/:conversationId
 * @access  Private
 */
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { text, messageType, codeContent, codeLanguage, replyTo, isForwarded } = req.body;
    const senderId = req.user._id;

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or access denied' });
    }

    let msgType = messageType || 'text';
    let fileUrl = '';
    let fileName = '';

    // Handle File Attachment if present
    if (req.file) {
      const { rType, mType } = detectFileType(req.file.mimetype, req.file.originalname);
      msgType = mType;
      fileName = req.file.originalname;

      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, rType, req.file.originalname);
        fileUrl = uploadResult.url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Failed to upload attachment' });
      }
    }

    // Build message data
    const messageData = {
      conversation: conversationId,
      sender: senderId,
      text: text || '',
      messageType: msgType,
      fileUrl,
      fileName,
      codeContent: codeContent || '',
      codeLanguage: codeLanguage || 'javascript',
      replyTo: replyTo || null,
      isForwarded: isForwarded === 'true' || isForwarded === true,
      seenBy: [senderId],
      deliveredTo: [senderId],
    };

    const message = await Message.create(messageData);

    // Update conversation's last message
    conversation.lastMessage = message._id;
    await conversation.save();

    // Populate sender details and reply details
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username profilePic status lastSeen')
      .populate({
        path: 'replyTo',
        select: 'text messageType sender fileUrl fileName codeContent codeLanguage',
        populate: {
          path: 'sender',
          select: 'name username',
        },
      });

    res.status(217).json({ success: true, message: populatedMessage }); // 201 Created
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated messages for a conversation
 * @route   GET /api/messages/:conversationId
 * @access  Private
 */
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 40;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or access denied' });
    }

    // Get messages that are NOT deleted for the current user
    const query = {
      conversation: conversationId,
      deletedFor: { $ne: userId },
    };

    const totalMessages = await Message.countDocuments(query);

    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Sort latest messages first for infinite scroll
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name username profilePic status lastSeen')
      .populate({
        path: 'replyTo',
        select: 'text messageType sender fileUrl fileName codeContent codeLanguage deletedForEveryone',
        populate: {
          path: 'sender',
          select: 'name username',
        },
      })
      .populate('reactions.user', 'name username');

    // Return reversed messages so that standard chronological order (old to new) is easier for front-end rendering
    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Edit message text
 * @route   PUT /api/messages/edit/:id
 * @access  Private
 */
const editMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(401).json({ message: 'Unauthorized to edit this message' });
    }

    if (message.messageType !== 'text' && message.messageType !== 'code') {
      return res.status(400).json({ message: 'Only text or code messages can be edited' });
    }

    if (message.deletedForEveryone) {
      return res.status(400).json({ message: 'Cannot edit deleted message' });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const populated = await Message.findById(id)
      .populate('sender', 'name username profilePic')
      .populate({
        path: 'replyTo',
        select: 'text messageType sender fileUrl fileName',
      });

    res.status(200).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete message for me (hide it)
 * @route   DELETE /api/messages/delete-me/:id
 * @access  Private
 */
const deleteMessageForMe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Add user to deletedFor array
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({ success: true, messageId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete message for everyone (recall message)
 * @route   DELETE /api/messages/delete-everyone/:id
 * @access  Private
 */
const deleteMessageForEveryone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(401).json({ message: 'Unauthorized to delete this message' });
    }

    message.deletedForEveryone = true;
    // Clear content fields for security and storage optimization
    message.text = 'This message was deleted';
    message.codeContent = '';
    message.fileUrl = '';
    message.fileName = '';
    await message.save();

    res.status(200).json({ success: true, messageId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle Emoji Reaction on message
 * @route   POST /api/messages/react/:id
 * @access  Private
 */
const reactToMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body; // emoji must be one of: ❤️, 😂, 👍, 🔥, 👏, 😍
    const userId = req.user._id;

    const validEmojis = ['❤️', '😂', '👍', '🔥', '👏', '😍'];
    if (!emoji || !validEmojis.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid or missing emoji reaction' });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted
    const reactionIndex = message.reactions.findIndex(
      (react) => react.user.toString() === userId.toString()
    );

    if (reactionIndex > -1) {
      if (message.reactions[reactionIndex].emoji === emoji) {
        // Toggle off if clicking the same emoji
        message.reactions.splice(reactionIndex, 1);
      } else {
        // Update to new emoji if clicking a different emoji
        message.reactions[reactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    const populated = await Message.findById(id)
      .populate('reactions.user', 'name username');

    res.status(200).json({ success: true, messageId: id, reactions: populated.reactions });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search keywords within conversation messages
 * @route   GET /api/messages/search/:conversationId
 * @access  Private
 */
const searchMessagesInConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { query } = req.query;
    const userId = req.user._id;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or access denied' });
    }

    // Search messages in text or code content
    const searchRegex = new RegExp(query, 'i');
    const matchedMessages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: userId },
      deletedForEveryone: false,
      $or: [{ text: searchRegex }, { codeContent: searchRegex }],
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name username profilePic');

    res.status(200).json({ success: true, results: matchedMessages });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  reactToMessage,
  searchMessagesInConversation,
};
