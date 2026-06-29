import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../hooks/useChat';
import { useFriend } from '../../hooks/useFriend';
import { useSocket } from '../../contexts/SocketContext';
import GroupModal from '../group/GroupModal';
import {
  FiSearch,
  FiUserPlus,
  FiSettings,
  FiLogOut,
  FiUser,
  FiCheck,
  FiX,
  FiMessageSquare,
  FiPlus,
  FiBell,
  FiAlertCircle,
  FiCompass,
  FiCornerDownRight,
  FiGrid
} from 'react-icons/fi';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    notifications,
    pinConversation,
    muteConversation,
    archiveConversation,
    markNotificationRead,
  } = useChat();

  const {
    friends,
    pendingRequests,
    searchResult,
    searchByChatCode,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    fetchPendingRequests,
    fetchFriends,
    setSearchResult,
  } = useFriend();

  const { onlineUsers } = useSocket();
  const navigate = useNavigate();

  // Component UI Tabs: 'chats', 'requests', 'search'
  const [activeTab, setActiveTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatCodeQuery, setChatCodeQuery] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchPendingRequests();
    } else if (activeTab === 'chats') {
      fetchFriends();
    }
  }, [activeTab, fetchPendingRequests, fetchFriends]);

  // Filter conversations based on keyword
  const filteredConversations = conversations.filter((conv) => {
    if (conv.isGroupChat) {
      return conv.groupName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    const otherParticipant = conv.participants.find((p) => p._id !== user._id);
    return (
      otherParticipant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      otherParticipant?.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Split into pinned and normal
  const pinnedConversations = filteredConversations.filter(c => c.isPinned && !c.isArchived);
  const normalConversations = filteredConversations.filter(c => !c.isPinned && !c.isArchived);

  const handleChatCodeSearchSubmit = (e) => {
    e.preventDefault();
    if (chatCodeQuery.trim()) {
      searchByChatCode(chatCodeQuery.trim());
    }
  };

  const handleConversationClick = (conv) => {
    setActiveConversation(conv);
  };

  // Helper to format timestamps nicely
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(15, 23, 42, 0.35)',
        borderRight: '1px solid var(--panel-border)',
        overflow: 'hidden',
        color: 'var(--text-main)',
      }}
    >
      {/* Sidebar Header */}
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ChatCode
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowGroupModal(true)}
            className="btn btn-secondary"
            style={{ padding: '8px', borderRadius: '50%', minWidth: '36px', height: '36px' }}
            title="Create Group"
          >
            <FiPlus size={16} />
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'requests' ? 'chats' : 'requests')}
            className="btn btn-secondary"
            style={{ padding: '8px', borderRadius: '50%', minWidth: '36px', height: '36px', position: 'relative' }}
            title="Friend Requests"
          >
            <FiBell size={16} />
            {pendingRequests.received.length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px' }} className="badge">
                {pendingRequests.received.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', padding: '10px 20px', gap: '8px' }}>
        <button
          onClick={() => { setActiveTab('chats'); setSearchResult(null); }}
          className={`btn ${activeTab === 'chats' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
        >
          Chats
        </button>
        <button
          onClick={() => { setActiveTab('search'); setSearchResult(null); }}
          className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', gap: '4px' }}
        >
          <FiUserPlus size={14} /> Add Code
        </button>
      </div>

      {/* SEARCH CHAT CODE TAB */}
      {activeTab === 'search' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
          <form onSubmit={handleChatCodeSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="glass-input"
              placeholder="Enter Friend's Chat Code (e.g. CP84562)"
              value={chatCodeQuery}
              onChange={(e) => setChatCodeQuery(e.target.value)}
              style={{ textTransform: 'uppercase' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px' }}>
              <FiSearch size={16} />
            </button>
          </form>

          {/* Search result display */}
          {searchResult && (
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <img
                src={searchResult.user.profilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100'}
                alt=""
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '1rem' }}>{searchResult.user.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{searchResult.user.username}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '4px' }}>
                  Code: {searchResult.user.chatCode}
                </div>
                {searchResult.user.bio && (
                  <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    "{searchResult.user.bio}"
                  </p>
                )}
              </div>

              {/* Relationship Buttons */}
              {searchResult.relationship === 'none' && (
                <button
                  onClick={() => sendRequest(searchResult.user.chatCode)}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  Send Friend Request
                </button>
              )}
              {searchResult.relationship === 'pending_sent' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem', cursor: 'default' }} disabled>
                    Request Pending...
                  </button>
                  <button
                    onClick={async () => {
                      await cancelRequest(searchResult.requestId);
                      setSearchResult(null);
                    }}
                    className="btn btn-danger"
                    style={{ width: '100%', fontSize: '0.85rem', padding: '6px' }}
                  >
                    Cancel Request
                  </button>
                </div>
              )}
              {searchResult.relationship === 'pending_received' && (
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    onClick={async () => {
                      const res = await acceptRequest(searchResult.requestId, searchResult.user._id);
                      if (res.success) {
                        setSearchResult(null);
                        setActiveTab('chats');
                      }
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      await rejectRequest(searchResult.requestId);
                      setSearchResult(null);
                    }}
                    className="btn btn-danger"
                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                  >
                    Reject
                  </button>
                </div>
              )}
              {searchResult.relationship === 'friends' && (
                <button
                  onClick={() => {
                    // Open existing conversation
                    const match = conversations.find(c =>
                      !c.isGroupChat && c.participants.some(p => p._id === searchResult.user._id)
                    );
                    if (match) setActiveConversation(match);
                    setActiveTab('chats');
                    setSearchResult(null);
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  Start Chatting
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* FRIEND REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Pending Requests ({pendingRequests.received.length})</h3>
          
          {pendingRequests.received.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
              No incoming friend requests.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingRequests.received.map((req) => (
                <div
                  key={req._id}
                  className="glass-card"
                  style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={req.sender.profilePic || 'https://via.placeholder.com/150'}
                      alt=""
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{req.sender.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {req.sender.chatCode}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={async () => {
                        await acceptRequest(req._id, req.sender._id);
                        fetchPendingRequests();
                      }}
                      className="btn btn-primary"
                      style={{ padding: '6px', minWidth: '30px', height: '30px', borderRadius: '50%' }}
                    >
                      <FiCheck size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        await rejectRequest(req._id);
                        fetchPendingRequests();
                      }}
                      className="btn btn-danger"
                      style={{ padding: '6px', minWidth: '30px', height: '30px', borderRadius: '50%' }}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '10px' }}>Sent Requests ({pendingRequests.sent.length})</h3>
          {pendingRequests.sent.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
              No sent pending requests.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingRequests.sent.map((req) => (
                <div
                  key={req._id}
                  className="glass-card"
                  style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={req.receiver.profilePic || 'https://via.placeholder.com/150'}
                      alt=""
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{req.receiver.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {req.receiver.chatCode}</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await cancelRequest(req._id);
                      fetchPendingRequests();
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHATS LIST TAB */}
      {activeTab === 'chats' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search bar inside chats */}
          <div style={{ padding: '10px 20px' }}>
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
              <input
                type="text"
                className="glass-input"
                style={{ paddingLeft: '38px', paddingRight: '14px', height: '38px' }}
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations scroll area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-dark)' }}>
                <FiMessageSquare size={36} style={{ marginBottom: '10px', opacity: 0.6 }} />
                <p style={{ fontSize: '0.85rem' }}>No conversations yet.</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: '12px' }}
                >
                  Find Friends
                </button>
              </div>
            ) : (
              <>
                {/* Pinned Chats */}
                {pinnedConversations.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dark)', fontWeight: 'bold', padding: '4px 8px' }}>
                      Pinned
                    </div>
                    {pinnedConversations.map((conv) => (
                      <ConversationItem
                        key={conv._id}
                        conv={conv}
                        activeUser={user}
                        isActive={activeConversation?._id === conv._id}
                        onlineUsers={onlineUsers}
                        onClick={handleConversationClick}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}

                {/* Normal Chats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {pinnedConversations.length > 0 && normalConversations.length > 0 && (
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dark)', fontWeight: 'bold', padding: '4px 8px' }}>
                      All Chats
                    </div>
                  )}
                  {normalConversations.map((conv) => (
                    <ConversationItem
                      key={conv._id}
                      conv={conv}
                      activeUser={user}
                      isActive={activeConversation?._id === conv._id}
                      onlineUsers={onlineUsers}
                      onClick={handleConversationClick}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sidebar Footer (User details / menu) */}
      <div
        style={{
          padding: '16px 20px',
          background: 'rgba(15, 23, 42, 0.45)',
          borderTop: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <img
            src={user?.profilePic || 'https://via.placeholder.com/150'}
            alt=""
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)' }}
            onClick={() => navigate('/profile')}
            className="btn-secondary"
          />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: '700', fontSize: '0.88rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              Code: {user?.chatCode}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => navigate('/profile')}
            className="btn btn-secondary"
            style={{ padding: '8px', borderRadius: '50%', minWidth: '32px', height: '32px' }}
            title="Edit Profile"
          >
            <FiUser size={14} />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="btn btn-secondary"
            style={{ padding: '8px', borderRadius: '50%', minWidth: '32px', height: '32px' }}
            title="Settings"
          >
            <FiSettings size={14} />
          </button>
          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ padding: '8px', borderRadius: '50%', minWidth: '32px', height: '32px', color: 'var(--danger)' }}
            title="Log Out"
          >
            <FiLogOut size={14} />
          </button>
        </div>
      </div>

      {/* Group Create Modal dialog */}
      {showGroupModal && (
        <GroupModal
          onClose={() => setShowGroupModal(false)}
        />
      )}
    </div>
  );
};

// Sub-component representing a single Chat item in sidebar list
const ConversationItem = ({ conv, activeUser, isActive, onlineUsers, onClick, formatTime }) => {
  const isGroup = conv.isGroupChat;
  let title = '';
  let pic = '';
  let isOnline = false;

  if (isGroup) {
    title = conv.groupName;
    pic = conv.groupIcon || '';
  } else {
    // Find the other participant in a 1-to-1 conversation
    const otherParticipant = conv.participants.find((p) => p._id !== activeUser._id);
    title = otherParticipant?.name || 'Deleted User';
    pic = otherParticipant?.profilePic || '';
    isOnline = otherParticipant ? onlineUsers.includes(otherParticipant._id) : false;
  }

  // Format the last message preview nicely
  const renderLastMessage = () => {
    if (!conv.lastMessage) return <span style={{ fontStyle: 'italic', color: 'var(--text-dark)' }}>No messages yet</span>;
    
    const lastMsg = conv.lastMessage;
    const isMe = lastMsg.sender?._id === activeUser._id;
    const prefix = isMe ? 'You: ' : '';

    if (lastMsg.deletedForEveryone) {
      return <span style={{ fontStyle: 'italic', color: 'var(--text-dark)' }}>This message was deleted</span>;
    }

    switch (lastMsg.messageType) {
      case 'image': return <span>🖼️ Image</span>;
      case 'video': return <span>🎥 Video</span>;
      case 'pdf': return <span>📄 PDF Document</span>;
      case 'document': return <span>📁 File Attachment</span>;
      case 'voice': return <span>🎤 Voice Note</span>;
      case 'gif': return <span>👾 GIF</span>;
      case 'code': return <span>💻 Code Snippet</span>;
      default: return <span>{prefix}{lastMsg.text}</span>;
    }
  };

  return (
    <div
      onClick={() => onClick(conv)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '12px',
        cursor: 'pointer',
        background: isActive ? 'var(--primary-light)' : 'transparent',
        border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
        transition: 'var(--transition-fast)',
      }}
      className="conversation-item-hover"
      onMouseOver={(e) => {
        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseOut={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Profile/Group Picture with Online Status Indicator */}
      <div style={{ position: 'relative', display: 'flex' }}>
        {pic ? (
          <img
            src={pic}
            alt=""
            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--panel-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '1rem',
              fontWeight: 'bold',
            }}
          >
            {isGroup ? 'GP' : title.charAt(0)}
          </div>
        )}
        {!isGroup && (
          <div
            style={{ position: 'absolute', bottom: '0', right: '0' }}
            className={isOnline ? 'online-dot' : 'offline-dot'}
          />
        )}
      </div>

      {/* Middle: Title & Message preview */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
          <div style={{ fontWeight: '700', fontSize: '0.88rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {title}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dark)', marginLeft: '6px' }}>
            {formatTime(conv.lastMessage?.createdAt || conv.updatedAt)}
          </div>
        </div>
        <div
          style={{
            fontSize: '0.78rem',
            color: conv.unreadCount > 0 ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: conv.unreadCount > 0 ? '600' : '400',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {renderLastMessage()}
        </div>
      </div>

      {/* Right side status indicators (pin, mute, unread count badge) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        {conv.unreadCount > 0 && (
          <span className="badge" style={{ padding: '2px 6px', fontSize: '0.7rem', minWidth: '18px', minHeight: '18px' }}>
            {conv.unreadCount}
          </span>
        )}
        {conv.isMuted && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>🔇</span>
        )}
        {conv.isPinned && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>📌</span>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
