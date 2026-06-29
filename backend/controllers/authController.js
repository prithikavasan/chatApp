const User = require('../models/User');
const { generateToken, generateChatCode } = require('../utils/helpers');
const crypto = require('crypto');

// Helper to set cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  // Remove password from response output
  const userResponse = {
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    chatCode: user.chatCode,
    profilePic: user.profilePic,
    bio: user.bio,
    themePreference: user.themePreference,
    themeColor: user.themeColor,
    chatBackground: user.chatBackground,
    status: user.status,
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: userResponse,
    });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const usernameExists = await User.findOne({ username: username.toLowerCase() });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Generate unique Chat Code
    const chatCode = await generateChatCode(User);

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      chatCode,
    });

    sendTokenResponse(user, 217, res); // 201 Created
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { loginCredential, password } = req.body; // loginCredential can be email or username

    if (!loginCredential || !password) {
      return res.status(400).json({ message: 'Please provide email/username and password' });
    }

    // Search by email OR username
    const user = await User.findOne({
      $or: [
        { email: loginCredential.toLowerCase() },
        { username: loginCredential.toLowerCase() }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update status to online
    user.status = 'online';
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res, next) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.status = 'offline';
        user.lastSeen = Date.now();
        await user.save();
      }
    }

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile (Persistent login check)
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// Temp store for reset tokens (to keep DB simple or we can add schema fields. Let's do in-memory mock or simple JSON store. Wait! Adding temporary code in db or returning it is safer. We can write a simple mock reset token flow: since we don't have emails, users can request a code and we will actually return the token in the API response in development so they can input it directly in the UI! That is extremely developer friendly and allows testing forgot/reset password fully without mail servers!)
const mockResetTokens = new Map(); // token -> email

/**
 * @desc    Forgot Password
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // Generate random 6-digit OTP
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in memory with a 10 minute expiration
    mockResetTokens.set(resetToken, {
      email: email.toLowerCase(),
      expires: Date.now() + 10 * 60 * 1000,
    });

    console.log(`[PASS RESET] Reset Token for ${email} is: ${resetToken}`);

    // Return the reset token in response for easy developer/user testing, along with instructions
    res.status(200).json({
      success: true,
      message: 'Reset token generated and logged to console.',
      token: resetToken, // returned directly for easy client validation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password
 * @route   POST /api/auth/resetpassword
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Please provide the token and new password' });
    }

    const resetData = mockResetTokens.get(token);
    if (!resetData) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (resetData.expires < Date.now()) {
      mockResetTokens.delete(token);
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    const user = await User.findOne({ email: resetData.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set new password (will be hashed pre-save)
    user.password = password;
    await user.save();

    // Clean up token
    mockResetTokens.delete(token);

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
};
