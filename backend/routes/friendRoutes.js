const express = require('express');
const router = express.Router();
const {
  searchUserByChatCode,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriendsList,
  getMutualFriends,
  getPendingRequests,
} = require('../controllers/friendController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/search/:chatCode', protect, searchUserByChatCode);
router.post('/request/:chatCode', protect, sendFriendRequest);
router.put('/request/accept/:requestId', protect, acceptFriendRequest);
router.put('/request/reject/:requestId', protect, rejectFriendRequest);
router.delete('/request/cancel/:requestId', protect, cancelFriendRequest);
router.delete('/remove/:friendId', protect, removeFriend);
router.get('/list', protect, getFriendsList);
router.get('/mutual/:friendId', protect, getMutualFriends);
router.get('/requests', protect, getPendingRequests);

module.exports = router;
