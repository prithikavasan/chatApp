const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);

module.exports = router;
