import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // Only connect if user is authenticated
    if (user && user._id) {
      const serverUrl = import.meta.env.VITE_SOCKET_URL || 
        (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);
      
      const newSocket = io(serverUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      setSocket(newSocket);

      // Register current user on connect
      newSocket.on('connect', () => {
        console.log('Socket client connected:', newSocket.id);
        newSocket.emit('register_user', user._id);
      });

      // Listen for list of online user IDs
      newSocket.on('online_users', (userIds) => {
        setOnlineUsers(userIds);
      });

      // Clean up connection when user changes or component unmounts
      return () => {
        newSocket.disconnect();
        console.log('Socket client disconnected.');
      };
    } else {
      // Disconnect socket if user logs out
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setOnlineUsers([]);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
