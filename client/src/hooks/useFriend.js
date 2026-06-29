import { useState, useCallback } from 'react';
import api from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { toast } from 'react-hot-toast';

export const useFriend = () => {
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({ received: [], sent: [] });
  const [searchResult, setSearchResult] = useState(null);

  // Search User by Chat Code
  const searchByChatCode = useCallback(async (chatCode) => {
    setLoading(true);
    setSearchResult(null);
    try {
      const response = await api.get(`/friends/search/${chatCode}`);
      if (response.data && response.data.success) {
        setSearchResult({
          user: response.data.user,
          relationship: response.data.relationship,
          requestId: response.data.requestId,
        });
      }
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'User not found.';
      setSearchResult(null);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Send Friend Request
  const sendRequest = useCallback(async (chatCode) => {
    setLoading(true);
    try {
      const response = await api.post(`/friends/request/${chatCode}`);
      if (response.data && response.data.success) {
        toast.success('Friend request sent!');
        
        // Notify recipient via socket
        if (socket && response.data.friendRequest) {
          socket.emit('friend_request', {
            receiverId: response.data.friendRequest.receiver,
            requestPayload: response.data.friendRequest,
          });
        }
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send request.';
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [socket]);

  // Accept Friend Request
  const acceptRequest = useCallback(async (requestId, senderId) => {
    setLoading(true);
    try {
      const response = await api.put(`/friends/request/accept/${requestId}`);
      if (response.data && response.data.success) {
        toast.success('Friend request accepted!');
        
        // Notify sender via socket
        if (socket) {
          socket.emit('friend_request_accepted', {
            senderId,
            acceptPayload: {
              requestId,
              conversationId: response.data.conversationId,
            },
          });
        }
        return { success: true, conversationId: response.data.conversationId };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to accept request.';
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [socket]);

  // Reject Friend Request
  const rejectRequest = useCallback(async (requestId) => {
    setLoading(true);
    try {
      const response = await api.put(`/friends/request/reject/${requestId}`);
      if (response.data && response.data.success) {
        toast.success('Friend request rejected');
        
        // Update local list
        setPendingRequests(prev => ({
          ...prev,
          received: prev.received.filter(req => req._id !== requestId),
        }));
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to reject request.';
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel Sent Request
  const cancelRequest = useCallback(async (requestId) => {
    setLoading(true);
    try {
      const response = await api.delete(`/friends/request/cancel/${requestId}`);
      if (response.data && response.data.success) {
        toast.success('Friend request cancelled');
        setPendingRequests(prev => ({
          ...prev,
          sent: prev.sent.filter(req => req._id !== requestId),
        }));
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to cancel request.';
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Remove Friend
  const deleteFriend = useCallback(async (friendId) => {
    setLoading(true);
    try {
      const response = await api.delete(`/friends/remove/${friendId}`);
      if (response.data && response.data.success) {
        toast.success('Friend removed');
        setFriends(prev => prev.filter(f => f._id !== friendId));
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to remove friend.';
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Friends List
  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/friends/list');
      if (response.data && response.data.success) {
        setFriends(response.data.friends);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Pending Requests (both sent & received)
  const fetchPendingRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/friends/requests');
      if (response.data && response.data.success) {
        setPendingRequests({
          received: response.data.received || [],
          sent: response.data.sent || [],
        });
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    friends,
    pendingRequests,
    searchResult,
    searchByChatCode,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    deleteFriend,
    fetchFriends,
    fetchPendingRequests,
    setSearchResult,
  };
};
