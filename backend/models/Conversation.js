const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      trim: true,
      default: '',
    },
    groupIcon: {
      type: String,
      default: '',
    },
    groupDescription: {
      type: String,
      trim: true,
      default: '',
    },
    groupAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', ConversationSchema);
