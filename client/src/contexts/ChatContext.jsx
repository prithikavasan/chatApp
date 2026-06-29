import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const ChatContext = createContext();

export const useChatState = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> username
  const [notifications, setNotifications] = useState([]);
  
  // Pagination refs/states for infinite scroll
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Keep a ref of activeConversation because socket event callbacks need the freshest value
  const activeConversationRef = useRef(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      const response = await api.get('/conversations');
      if (response.data && response.data.success) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.get('/notifications');
      if (response.data && response.data.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  // Fetch messages in a conversation
  const fetchMessages = useCallback(async (convId, pageNum = 1, isLoadMore = false) => {
    if (!convId) return;
    if (!isLoadMore) setLoadingMessages(true);
    try {
      const response = await api.get(`/messages/${convId}?page=${pageNum}&limit=30`);
      if (response.data && response.data.success) {
        const fetchedMessages = response.data.messages;
        
        if (isLoadMore) {
          setMessages((prev) => [...fetchedMessages, ...prev]);
        } else {
          setMessages(fetchedMessages);
        }
        
        setPage(pageNum);
        setHasMoreMessages(pageNum < response.data.totalPages);

        // Mark last message as seen in database
        if (fetchedMessages.length > 0) {
          const lastMsg = fetchedMessages[fetchedMessages.length - 1];
          if (socket && lastMsg.sender._id !== user._id && !lastMsg.seenBy.includes(user._id)) {
            socket.emit('message_seen', {
              conversationId: convId,
              messageId: lastMsg._id,
              userId: user._id,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (!isLoadMore) setLoadingMessages(false);
    }
  }, [socket, user]);

  // Send message with file support
  const sendMessage = useCallback(async (convId, text, type = 'text', options = {}) => {
    try {
      const { file, codeContent, codeLanguage, replyTo } = options;
      const formData = new FormData();
      
      if (text) formData.append('text', text);
      formData.append('messageType', type);
      
      if (file) {
        formData.append('file', file);
      }
      if (codeContent) {
        formData.append('codeContent', codeContent);
        formData.append('codeLanguage', codeLanguage || 'javascript');
      }
      if (replyTo) {
        formData.append('replyTo', replyTo);
      }

      const response = await api.post(`/messages/${convId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.success) {
        const newMsg = response.data.message;
        
        // Update local messages
        setMessages((prev) => [...prev, newMsg]);

        // Find active conversation to get participants
        const activeConv = conversations.find(c => c._id === convId) || activeConversation;

        // Socket emit to other users
        if (socket && activeConv) {
          socket.emit('send_message', {
            message: newMsg,
            participants: activeConv.participants.map(p => p._id),
          });
        }

        // Update conversation lastMessage locally
        setConversations((prev) =>
          prev.map((c) =>
            c._id === convId ? { ...c, lastMessage: newMsg, updatedAt: new Date().toISOString() } : c
          ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );

        return { success: true, message: newMsg };
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message.');
      return { success: false };
    }
  }, [socket, conversations, activeConversation]);

  // Edit Message
  const editMessage = useCallback(async (messageId, newText) => {
    try {
      const response = await api.put(`/messages/edit/${messageId}`, { text: newText });
      if (response.data && response.data.success) {
        const editedMsg = response.data.message;
        
        // Update messages state
        setMessages((prev) => prev.map((m) => (m._id === messageId ? editedMsg : m)));
        
        // If it was the last message, sync sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c.lastMessage?._id === messageId ? { ...c, lastMessage: editedMsg } : c
          )
        );

        // Notify socket
        if (socket && activeConversation) {
          socket.to(activeConversation._id).emit('message_edited', editedMsg);
        }
        
        toast.success('Message edited');
        return { success: true };
      }
    } catch (error) {
      console.error('Error editing message:', error);
      return { success: false };
    }
  }, [socket, activeConversation]);

  // Delete message for everyone
  const deleteMessageForEveryone = useCallback(async (messageId) => {
    try {
      const response = await api.delete(`/messages/delete-everyone/${messageId}`);
      if (response.data && response.data.success) {
        // Update messages locally
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, deletedForEveryone: true, text: 'This message was deleted', fileUrl: '', fileName: '', codeContent: '' }
              : m
          )
        );

        // If it was the last message, update conversation listing
        setConversations((prev) =>
          prev.map((c) =>
            c.lastMessage?._id === messageId
              ? {
                  ...c,
                  lastMessage: { ...c.lastMessage, deletedForEveryone: true, text: 'This message was deleted' },
                }
              : c
          )
        );

        // Emit socket deletion
        if (socket && activeConversation) {
          socket.to(activeConversation._id).emit('message_deleted_everyone', { messageId });
        }

        toast.success('Message deleted for everyone');
        return { success: true };
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      return { success: false };
    }
  }, [socket, activeConversation]);

  // Delete message for me
  const deleteMessageForMe = useCallback(async (messageId) => {
    try {
      const response = await api.delete(`/messages/delete-me/${messageId}`);
      if (response.data && response.data.success) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
        toast.success('Message deleted for me');
        return { success: true };
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      return { success: false };
    }
  }, []);

  // React to message
  const reactToMessage = useCallback(async (messageId, emoji) => {
    try {
      const response = await api.post(`/messages/react/${messageId}`, { emoji });
      if (response.data && response.data.success) {
        const reactions = response.data.reactions;
        
        // Update message locally
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
        );

        // Notify socket
        if (socket && activeConversation) {
          socket.to(activeConversation._id).emit('message_reaction', { messageId, reactions });
        }

        return { success: true };
      }
    } catch (error) {
      console.error('Error reacting to message:', error);
      return { success: false };
    }
  }, [socket, activeConversation]);

  // Group Creation
  const createGroup = useCallback(async (groupName, groupDescription, participants) => {
    try {
      const response = await api.post('/conversations/group', { groupName, groupDescription, participants });
      if (response.data && response.data.success) {
        const newGroup = response.data.conversation;
        setConversations((prev) => [newGroup, ...prev]);
        toast.success('Group created successfully!');
        return { success: true, conversation: newGroup };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create group.';
      toast.error(msg);
      return { success: false, message: msg };
    }
  }, []);

  // Toggle Preferences: Pin
  const pinConversation = useCallback(async (convId) => {
    try {
      const response = await api.put(`/conversations/pin/${convId}`);
      if (response.data && response.data.success) {
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, isPinned: !c.isPinned } : c))
        );
        toast.success('Conversation pin status updated');
      }
    } catch (error) {
      console.error('Error pinning conversation:', error);
    }
  }, []);

  // Toggle Preferences: Mute
  const muteConversation = useCallback(async (convId) => {
    try {
      const response = await api.put(`/conversations/mute/${convId}`);
      if (response.data && response.data.success) {
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, isMuted: !c.isMuted } : c))
        );
        toast.success('Conversation mute status updated');
      }
    } catch (error) {
      console.error('Error muting conversation:', error);
    }
  }, []);

  // Toggle Preferences: Archive
  const archiveConversation = useCallback(async (convId) => {
    try {
      const response = await api.put(`/conversations/archive/${convId}`);
      if (response.data && response.data.success) {
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, isArchived: !c.isArchived } : c))
        );
        toast.success('Conversation archive status updated');
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  }, []);

  // Manage Group: Add members
  const addMembers = useCallback(async (convId, userIds) => {
    try {
      const response = await api.put(`/conversations/group/${convId}/add`, { userIds });
      if (response.data && response.data.success) {
        const updatedGroup = response.data.conversation;
        if (activeConversation && activeConversation._id === convId) {
          setActiveConversation(updatedGroup);
        }
        setConversations((prev) => prev.map((c) => (c._id === convId ? updatedGroup : c)));
        toast.success('Members added successfully');
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add members.';
      toast.error(msg);
      return { success: false };
    }
  }, [activeConversation]);

  // Manage Group: Remove member / Leave group
  const removeMember = useCallback(async (convId, targetUserId) => {
    try {
      const response = await api.put(`/conversations/group/${convId}/remove`, { userId: targetUserId });
      if (response.data && response.data.success) {
        const updatedGroup = response.data.conversation;
        
        if (targetUserId === user._id) {
          // I left the group
          toast.success('You left the group');
          setActiveConversation(null);
          setConversations((prev) => prev.filter((c) => c._id !== convId));
        } else {
          // Admin removed someone
          toast.success('Member removed');
          if (activeConversation && activeConversation._id === convId) {
            setActiveConversation(updatedGroup);
          }
          setConversations((prev) => prev.map((c) => (c._id === convId ? updatedGroup : c)));
        }
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to remove member.';
      toast.error(msg);
      return { success: false };
    }
  }, [user, activeConversation]);

  // Notifications: mark read
  const markNotificationRead = useCallback(async (notifId) => {
    try {
      await api.put(`/notifications/${notifId}/read`);
      setNotifications((prev) => prev.filter((n) => n._id !== notifId));
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications([]);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications read:', error);
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      toast.success('Notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, []);

  // Set up active conversation room switching
  useEffect(() => {
    if (socket) {
      if (activeConversation?._id) {
        socket.emit('join_room', activeConversation._id);
        
        // Mark conversation unread count to 0 locally
        setConversations((prev) =>
          prev.map((c) => (c._id === activeConversation._id ? { ...c, unreadCount: 0 } : c))
        );
      }

      return () => {
        if (activeConversation?._id) {
          socket.emit('leave_room', activeConversation._id);
        }
      };
    }
  }, [activeConversation?._id, socket]);

  // Socket IO Listeners for real-time updates
  useEffect(() => {
    if (!socket || !user) return;

    // 1. Receive chat message
    const handleReceiveMessage = (message) => {
      const activeConv = activeConversationRef.current;
      
      if (activeConv && message.conversation === activeConv._id) {
        // Active chat window: append message, trigger seen receipt
        setMessages((prev) => [...prev, message]);
        
        // Emit seen receipt to socket
        socket.emit('message_seen', {
          conversationId: activeConv._id,
          messageId: message._id,
          userId: user._id,
        });
      } else {
        // Other chat: update sidebar unread and sort
        setConversations((prev) =>
          prev.map((c) =>
            c._id === message.conversation
              ? { ...c, lastMessage: message, unreadCount: c.unreadCount + 1, updatedAt: new Date().toISOString() }
              : c
          ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );
      }
    };

    // 2. Direct message notifications (when app is online, but user is looking at other screens)
    const handleMessageNotification = ({ conversationId, message }) => {
      const activeConv = activeConversationRef.current;
      if (activeConv && conversationId === activeConv._id) return; // Already handled

      // Trigger custom React Hot Toast for desktop preview
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'shake' : ''
          } glass-card`}
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            boxShadow: 'var(--panel-shadow)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--text-main)',
            maxWidth: '350px',
            backdropFilter: 'blur(10px)',
          }}
        >
          {message.sender.profilePic && (
            <img
              src={message.sender.profilePic}
              alt=""
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{message.sender.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
              {message.messageType === 'text' ? message.text : `[Attachment: ${message.messageType}]`}
            </div>
          </div>
        </div>
      ), { duration: 3000 });

      // Increment sidebar unread count
      setConversations((prev) => {
        const hasConv = prev.some(c => c._id === conversationId);
        if (!hasConv) {
          // If conversation isn't loaded in the current sidebar list yet (e.g. first message in a newly created connection), fetch list again
          fetchConversations();
          return prev;
        }

        return prev.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage: message, unreadCount: (c.unreadCount || 0) + 1, updatedAt: new Date().toISOString() }
            : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    // 3. Typing status broadcast
    const handleTyping = ({ conversationId, username }) => {
      const activeConv = activeConversationRef.current;
      if (activeConv && conversationId === activeConv._id) {
        setTypingUsers((prev) => ({ ...prev, [username]: true }));
      }
    };

    const handleStopTyping = ({ conversationId, username }) => {
      const activeConv = activeConversationRef.current;
      if (activeConv && conversationId === activeConv._id) {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[username];
          return updated;
        });
      }
    };

    // 4. Message seen receipts
    const handleMessageSeen = ({ conversationId, messageId, userId }) => {
      const activeConv = activeConversationRef.current;
      if (activeConv && conversationId === activeConv._id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === messageId) {
              return { ...m, seenBy: [...new Set([...m.seenBy, userId])] };
            }
            return m;
          })
        );
      }
    };

    // 5. Message delivered receipts
    const handleMessageDelivered = ({ conversationId, messageId, userId }) => {
      const activeConv = activeConversationRef.current;
      if (activeConv && conversationId === activeConv._id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === messageId) {
              return { ...m, deliveredTo: [...new Set([...m.deliveredTo, userId])] };
            }
            return m;
          })
        );
      }
    };

    // 6. Realtime message edit receipts
    const handleMessageEdited = (editedMsg) => {
      const activeConv = activeConversationRef.current;
      if (activeConv && editedMsg.conversation === activeConv._id) {
        setMessages((prev) => prev.map((m) => (m._id === editedMsg._id ? editedMsg : m)));
      }
      setConversations((prev) =>
        prev.map((c) => (c.lastMessage?._id === editedMsg._id ? { ...c, lastMessage: editedMsg } : c))
      );
    };

    // 7. Message recalls
    const handleMessageDeletedEveryone = ({ messageId }) => {
      const activeConv = activeConversationRef.current;
      if (activeConv) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? {
                  ...m,
                  deletedForEveryone: true,
                  text: 'This message was deleted',
                  fileUrl: '',
                  fileName: '',
                  codeContent: '',
                }
              : m
          )
        );
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.lastMessage?._id === messageId
            ? { ...c, lastMessage: { ...c.lastMessage, deletedForEveryone: true, text: 'This message was deleted' } }
            : c
        )
      );
    };

    // 8. Reactions update
    const handleMessageReaction = ({ messageId, reactions }) => {
      const activeConv = activeConversationRef.current;
      if (activeConv) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
        );
      }
    };

    // 9. Friend request notifications (badges)
    const handleFriendRequestReceived = (requestPayload) => {
      toast('You received a new friend request!', { icon: '🤝' });
      fetchNotifications();
    };

    const handleFriendRequestAccepted = (acceptPayload) => {
      toast.success('Your friend request was accepted!');
      fetchConversations();
      fetchNotifications();
    };

    // Bind event hooks
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_notification', handleMessageNotification);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('message_seen', handleMessageSeen);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted_everyone', handleMessageDeletedEveryone);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('friend_request_received', handleFriendRequestReceived);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_notification', handleMessageNotification);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('message_seen', handleMessageSeen);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted_everyone', handleMessageDeletedEveryone);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('friend_request_received', handleFriendRequestReceived);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
    };
  }, [socket, user, fetchConversations, fetchNotifications]);

  // Boot strap user feeds
  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchNotifications();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setNotifications([]);
    }
  }, [user, fetchConversations, fetchNotifications]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loadingConversations,
        loadingMessages,
        typingUsers,
        notifications,
        page,
        hasMoreMessages,
        setActiveConversation,
        fetchConversations,
        fetchMessages,
        sendMessage,
        editMessage,
        deleteMessageForMe,
        deleteMessageForEveryone,
        reactToMessage,
        createGroup,
        pinConversation,
        muteConversation,
        archiveConversation,
        addMembers,
        removeMember,
        markNotificationRead,
        markAllNotificationsRead,
        clearAllNotifications,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
