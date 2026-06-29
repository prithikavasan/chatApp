const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    chatCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    profilePic: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: 'Hey there! I am using ChatCode.',
      maxlength: [160, 'Bio cannot exceed 160 characters'],
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    themePreference: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark',
    },
    themeColor: {
      type: String,
      default: '#6366f1', // default Indigo color
    },
    chatBackground: {
      type: String,
      default: '',
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    mutedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
      },
    ],
    pinnedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
      },
    ],
    archivedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
      },
    ],
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
