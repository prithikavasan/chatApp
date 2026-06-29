const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/conversationController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/multerMiddleware');

router.get('/', protect, getConversations);
router.get('/:id', protect, getConversationById);
router.post('/group', protect, createGroupChat);
router.put('/group/:id/rename', protect, renameGroup);
router.put('/group/:id/description', protect, updateGroupDescription);
router.put('/group/:id/icon', protect, upload.single('groupIcon'), updateGroupIcon);
router.put('/group/:id/add', protect, addMembersToGroup);
router.put('/group/:id/remove', protect, removeMemberFromGroup);
router.put('/pin/:id', protect, togglePinConversation);
router.put('/mute/:id', protect, toggleMuteConversation);
router.put('/archive/:id', protect, toggleArchiveConversation);

module.exports = router;
