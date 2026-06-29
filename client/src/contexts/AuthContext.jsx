import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useTheme } from './ThemeContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setTheme, setThemeColor, setChatBackground } = useTheme();

  // Validate persistent login on app start
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data && response.data.success) {
          const userData = response.data.user;
          setUser(userData);
          
          // Apply user preferences loaded from database
          if (userData.themePreference) setTheme(userData.themePreference);
          if (userData.themeColor) setThemeColor(userData.themeColor);
          if (userData.chatBackground) setChatBackground(userData.chatBackground);
        }
      } catch (err) {
        console.log('No persistent auth session found.');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, [setTheme, setThemeColor, setChatBackground]);

  // Register User
  const register = async (name, username, email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { name, username, email, password });
      if (response.data && response.data.success) {
        const { user: registeredUser, token } = response.data;
        localStorage.setItem('token', token);
        setUser(registeredUser);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Please try again.',
      };
    } finally {
      setLoading(false);
    }
  };

  // Login User
  const login = async (loginCredential, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { loginCredential, password });
      if (response.data && response.data.success) {
        const { user: loggedUser, token } = response.data;
        localStorage.setItem('token', token);
        setUser(loggedUser);
        
        // Sync custom themes from user profile
        if (loggedUser.themePreference) setTheme(loggedUser.themePreference);
        if (loggedUser.themeColor) setThemeColor(loggedUser.themeColor);
        if (loggedUser.chatBackground) setChatBackground(loggedUser.chatBackground);

        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid username/email or password.',
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout User
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      // Keep loading as false
    }
  };

  // Update profile details (multipart/form-data supported)
  const updateProfile = async (formData) => {
    try {
      const response = await api.put('/users/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data && response.data.success) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile.',
      };
    }
  };

  // Change Password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/users/change-password', { currentPassword, newPassword });
      return { success: response.data.success, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change password.',
      };
    }
  };

  // Delete User Account
  const deleteAccount = async () => {
    try {
      const response = await api.delete('/users/account');
      if (response.data.success) {
        setUser(null);
        localStorage.removeItem('token');
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete account.',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        updateProfile,
        changePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
