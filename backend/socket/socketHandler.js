const User = require('../models/User');
const Message = require('../models/Message');

// Store online users: userId -> Array of socket.id
const userSockets = new Map();

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    // Register User
    socket.on('register_user', async (userId) => {
      if (!userId) return;
      
      socket.userId = userId;

      // Add socket ID to mapping
      if (userSockets.has(userId)) {
        userSockets.get(userId).push(socket.id);
      } else {
        userSockets.set(userId, [socket.id]);
      }

      // Mark user as online in DB
      try {
        await User.findByIdAndUpdate(userId, { status: 'online' });
      } catch (err) {
        console.error('Error updating user online status:', err);
      }

      // Broadcast list of online user IDs
      io.emit('online_users', Array.from(userSockets.keys()));
      console.log(`User registered: ${userId} with socket ${socket.id}`);
    });

    // Join Conversation Room
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    // Leave Conversation Room
    socket.on('leave_room', (room) => {
      socket.leave(room);
      console.log(`Socket ${socket.id} left room ${room}`);
    });

    // Typing Indicators
    socket.on('typing', ({ conversationId, username }) => {
      socket.to(conversationId).emit('typing', { conversationId, username });
    });

    socket.on('stop_typing', ({ conversationId, username }) => {
      socket.to(conversationId).emit('stop_typing', { conversationId, username });
    });

    // Realtime Message Broadcast
    socket.on('send_message', ({ message, participants }) => {
      // 1. Emit to room participants (for users who currently have the chat window open)
      socket.to(message.conversation).emit('receive_message', message);

      // 2. Emit to participants who are online but not currently in the room 
      // (to trigger live notification toasts or increment unread counts on their sidebar)
      if (participants && Array.isArray(participants)) {
        participants.forEach((pId) => {
          // Avoid sending back to the sender
          if (pId.toString() === socket.userId) return;

          const recipientSockets = userSockets.get(pId.toString());
          if (recipientSockets) {
            recipientSockets.forEach((sId) => {
              // Send direct live notification payload
              io.to(sId).emit('message_notification', {
                conversationId: message.conversation,
                message,
              });
            });
          }
        });
      }
    });

    // Mark message as seen
    socket.on('message_seen', async ({ conversationId, messageId, userId }) => {
      try {
        // Update Message DB
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { seenBy: userId },
        });

        // Broadcast seen receipt to the conversation room
        socket.to(conversationId).emit('message_seen', { conversationId, messageId, userId });
      } catch (err) {
        console.error('Error handling message_seen socket event:', err);
      }
    });

    // Mark message as delivered
    socket.on('message_delivered', async ({ conversationId, messageId, userId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { deliveredTo: userId },
        });

        socket.to(conversationId).emit('message_delivered', { conversationId, messageId, userId });
      } catch (err) {
        console.error('Error handling message_delivered socket event:', err);
      }
    });

    // Friend Request Realtime Notifications
    socket.on('friend_request', ({ receiverId, requestPayload }) => {
      const recipientSockets = userSockets.get(receiverId);
      if (recipientSockets) {
        recipientSockets.forEach((sId) => {
          io.to(sId).emit('friend_request_received', requestPayload);
        });
      }
    });

    // Friend Request Acceptance Notification
    socket.on('friend_request_accepted', ({ senderId, acceptPayload }) => {
      const recipientSockets = userSockets.get(senderId);
      if (recipientSockets) {
        recipientSockets.forEach((sId) => {
          io.to(sId).emit('friend_request_accepted', acceptPayload);
        });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: ${socket.id}`);

      if (socket.userId) {
        const userId = socket.userId;
        const sockets = userSockets.get(userId);

        if (sockets) {
          // Remove the specific disconnected socket
          const updatedSockets = sockets.filter((id) => id !== socket.id);
          
          if (updatedSockets.length > 0) {
            userSockets.set(userId, updatedSockets);
          } else {
            // No sockets left, user is offline
            userSockets.delete(userId);
            try {
              await User.findByIdAndUpdate(userId, { 
                status: 'offline',
                lastSeen: Date.now() 
              });
            } catch (err) {
              console.error('Error updating status on disconnect:', err);
            }
          }
        }
      }

      // Broadcast updated online users list
      io.emit('online_users', Array.from(userSockets.keys()));
    });
  });
};

module.exports = { socketHandler, userSockets };
