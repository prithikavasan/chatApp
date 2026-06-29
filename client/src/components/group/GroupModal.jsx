import React, { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useFriend } from '../../hooks/useFriend';
import { FiX, FiUsers, FiPlus, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const GroupModal = ({ onClose }) => {
  const { createGroup } = useChat();
  const { friends, fetchFriends } = useFriend();

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleToggleSelectFriend = (friendId) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter((id) => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) {
      return alert('Group name is required.');
    }

    if (selectedFriends.length === 0) {
      return alert('Select at least one member to add.');
    }

    setLoading(true);
    const res = await createGroup(groupName.trim(), groupDescription.trim(), selectedFriends);
    setLoading(false);

    if (res.success) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          color: 'var(--text-main)',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUsers size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>New Group Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px', borderRadius: '50%', minWidth: '32px', height: '32px' }}
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Group Name *
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="e.g. Code Ninjas"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Group Description (optional)
            </label>
            <textarea
              className="glass-input"
              placeholder="What is this group about?"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              style={{ resize: 'vertical', minHeight: '60px' }}
              disabled={loading}
            />
          </div>

          {/* Members List Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Select Group Members ({selectedFriends.length} selected) *
            </label>
            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: 'var(--input-bg)',
              }}
            >
              {friends.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dark)', padding: '12px', textAlign: 'center', fontStyle: 'italic' }}>
                  No friends list found. Connect with users first.
                </p>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedFriends.includes(friend._id);
                  return (
                    <div
                      key={friend._id}
                      onClick={() => handleToggleSelectFriend(friend._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--primary-light)' : 'transparent',
                        transition: 'var(--transition-fast)',
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={friend.profilePic || 'https://via.placeholder.com/150'}
                          alt=""
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div style={{ fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: 'bold' }}>{friend.name}</span>{' '}
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>@{friend.username}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: '1.5px solid var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          color: 'white',
                          transition: 'var(--transition-fast)',
                        }}
                      >
                        {isSelected && <FiCheck size={12} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            disabled={loading || selectedFriends.length === 0}
          >
            {loading ? (
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
            ) : (
              'Create Group'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default GroupModal;
