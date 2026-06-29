import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiLock, FiEye, FiTrash2, FiUserCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';

const Settings = () => {
  const { user, changePassword, deleteAccount, updateProfile } = useAuth();
  const { theme, toggleTheme, themeColor, setThemeColor, chatBackground, setChatBackground } = useTheme();
  const navigate = useNavigate();

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Blocked List
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Confirm delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Fetch blocked users
  const fetchBlocked = async () => {
    setLoadingBlocked(true);
    try {
      const response = await api.get('/users/blocked');
      if (response.data && response.data.success) {
        setBlockedUsers(response.data.blockedUsers);
      }
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoadingBlocked(false);
    }
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  // Handlers
  const handleUnblock = async (blockedId) => {
    try {
      const response = await api.put(`/users/block/${blockedId}`);
      if (response.data && response.data.success) {
        toast.success('User unblocked');
        setBlockedUsers(prev => prev.filter(u => u._id !== blockedId));
      }
    } catch (error) {
      toast.error('Failed to unblock user');
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return toast.error('Please enter all fields.');
    }
    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }
    if (newPassword !== confirmNewPassword) {
      return toast.error('Passwords do not match.');
    }

    setLoadingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoadingPassword(false);

    if (result.success) {
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      toast.error(result.message);
    }
  };

  const handleColorChange = async (colorHex) => {
    setThemeColor(colorHex);
    // Persist in DB
    try {
      await api.put('/users/profile', { themeColor: colorHex });
    } catch (err) {
      console.error('Failed to persist theme color in DB:', err);
    }
  };

  const handleWallpaperChange = async (wallpaperClass) => {
    setChatBackground(wallpaperClass);
    // Persist in DB
    try {
      await api.put('/users/profile', { chatBackground: wallpaperClass });
    } catch (err) {
      console.error('Failed to persist wallpaper in DB:', err);
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    // Persist in DB
    try {
      await api.put('/users/profile', { themePreference: newTheme });
    } catch (err) {
      console.error('Failed to persist theme in DB:', err);
    }
  };

  const handleDeleteAccountSubmit = async () => {
    if (confirmText.toLowerCase() !== 'delete') {
      return toast.error('Type "delete" to confirm.');
    }
    try {
      const result = await deleteAccount();
      if (result.success) {
        toast.success('Account permanently deleted.');
        navigate('/register');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to delete account.');
    }
  };

  // Color Swatches list
  const colorSwatches = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Sky Blue', hex: '#0ea5e9' },
    { name: 'Crimson', hex: '#e11d48' },
  ];

  // Wallpapers list
  const wallpapers = [
    { name: 'Clear Glass', class: '' },
    { name: 'Binary Grid', class: 'wp-binary' },
    { name: 'Constellation', class: 'wp-stars' },
    { name: 'Abstract Gradient', class: 'wp-gradient' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '24px',
        overflowY: 'auto',
        color: 'var(--text-main)',
        background: 'rgba(15, 23, 42, 0.25)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-secondary"
          style={{ padding: '8px', borderRadius: '50%', minWidth: '40px', height: '40px' }}
        >
          <FiArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Customize your themes, security configurations, and block lists.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          maxWidth: '1000px',
          width: '100%',
          margin: '0 auto',
        }}
        className="settings-grid-layout"
      >
        {/* Left Column: UI Customs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 1: Themes & Toggles */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 'bold' }}>Aesthetics</h3>
            
            {/* Toggle light/dark */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Appearance Theme</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Choose between Light or Dark views</div>
              </div>
              <button onClick={handleThemeToggle} className="btn btn-secondary" style={{ textTransform: 'capitalize' }}>
                {theme} Mode
              </button>
            </div>

            {/* Accent Color picker */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px' }}>
                Custom Color Theme
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {colorSwatches.map((swatch) => (
                  <button
                    key={swatch.hex}
                    onClick={() => handleColorChange(swatch.hex)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: swatch.hex,
                      border: themeColor === swatch.hex ? '3px solid white' : '1px solid rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      boxShadow: themeColor === swatch.hex ? '0 0 10px var(--primary)' : 'none',
                      transition: 'var(--transition)',
                    }}
                    title={swatch.name}
                  />
                ))}
              </div>
            </div>

            {/* Wallpaper selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px' }}>
                Chat Wallpaper
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {wallpapers.map((wp) => (
                  <button
                    key={wp.name}
                    onClick={() => handleWallpaperChange(wp.class)}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.85rem',
                      padding: '10px',
                      border: chatBackground === wp.class ? '2px solid var(--primary)' : '1px solid var(--panel-border)',
                      background: chatBackground === wp.class ? 'var(--primary-light)' : 'var(--input-bg)',
                    }}
                  >
                    {wp.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Blocked Users list */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 'bold' }}>Privacy Settings</h3>
            <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '12px' }}>Blocked Accounts</div>

            {loadingBlocked ? (
              <div className="spinner" style={{ margin: '20px auto', width: '20px', height: '20px' }}></div>
            ) : blockedUsers.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No blocked accounts.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '160px', overflowY: 'auto' }}>
                {blockedUsers.map((bu) => (
                  <div
                    key={bu._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--panel-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={bu.profilePic || 'https://via.placeholder.com/150'}
                        alt=""
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{bu.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{bu.username}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(bu._id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Security forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 3: Change Password */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 'bold' }}>Security</h3>
            <form onSubmit={handlePasswordChangeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loadingPassword}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loadingPassword}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={loadingPassword}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start', padding: '10px 18px', fontSize: '0.9rem' }}
                disabled={loadingPassword}
              >
                {loadingPassword ? (
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                ) : (
                  'Change Password'
                )}
              </button>
            </form>
          </div>

          {/* Section 4: Account Deletion */}
          <div
            className="glass-card"
            style={{
              padding: '20px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              background: 'rgba(239, 68, 68, 0.02)',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--danger)', fontWeight: 'bold' }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Permanently delete your account. This action is irreversible and deletes all friends, chats, and files.
            </p>

            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-danger" style={{ display: 'flex', gap: '8px' }}>
                <FiTrash2 /> Delete Account
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Type <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>delete</span> to confirm:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    style={{ borderColor: 'var(--danger)' }}
                  />
                  <button onClick={handleDeleteAccountSubmit} className="btn btn-danger" style={{ whiteSpace: 'nowrap' }}>
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setConfirmText('');
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          .settings-grid-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </motion.div>
  );
};

export default Settings;
