const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  reactToMessage,
  searchMessagesInConversation,
} = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/multerMiddleware');

router.post('/:conversationId', protect, upload.single('file'), sendMessage);
router.get('/:conversationId', protect, getMessages);
router.put('/edit/:id', protect, editMessage);
router.delete('/delete-me/:id', protect, deleteMessageForMe);
router.delete('/delete-everyone/:id', protect, deleteMessageForEveryone);
router.post('/react/:id', protect, reactToMessage);
router.get('/search/:conversationId', protect, searchMessagesInConversation);

module.exports = router;
