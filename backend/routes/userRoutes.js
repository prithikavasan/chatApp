const express = require('express');
const router = express.Router();
const {
  updateProfile,
  changePassword,
  toggleBlockUser,
  getBlockedUsers,
  deleteAccount,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/multerMiddleware');

router.put('/profile', protect, upload.single('profilePic'), updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/block/:id', protect, toggleBlockUser);
router.get('/blocked', protect, getBlockedUsers);
router.delete('/account', protect, deleteAccount);

module.exports = router;
