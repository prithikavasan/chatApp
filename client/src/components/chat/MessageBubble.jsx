import React, { useState, useRef, useEffect } from 'react';
import CodeSharing from './CodeSharing';
import ReactionPicker from './ReactionPicker';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../hooks/useChat';
import {
  FiMoreVertical,
  FiCornerUpLeft,
  FiEdit3,
  FiTrash,
  FiCopy,
  FiArrowRight,
  FiFileText,
  FiPlay,
  FiPause,
  FiCheck,
  FiCheckCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const MessageBubble = ({ message, onReply, onForward }) => {
  const { user } = useAuth();
  const { reactToMessage, editMessage, deleteMessageForMe, deleteMessageForEveryone, activeConversation } = useChat();

  const isMe = message.sender._id === user._id;
  const isDeleted = message.deletedForEveryone;

  // UI state hooks
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const menuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowReactionPicker(false);
      }
    };
    if (showMenu || showReactionPicker) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu, showReactionPicker]);

  const handleCopy = () => {
    const content = message.messageType === 'code' ? message.codeContent : message.text;
    navigator.clipboard.writeText(content);
    toast.success('Message content copied!');
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    const res = await editMessage(message._id, editText.trim());
    if (res.success) {
      setIsEditing(false);
      setShowMenu(false);
    }
  };

  // Render checkmark icon for receipt status (for my messages)
  const renderStatus = () => {
    if (!isMe || isDeleted) return null;
    
    // In group conversations, seen count check
    const otherParticipants = activeConversation.participants.filter(p => p._id !== user._id).map(p => p._id);
    const seenByOthers = message.seenBy.filter(id => otherParticipants.includes(id));
    const deliveredToOthers = message.deliveredTo.filter(id => otherParticipants.includes(id));

    if (seenByOthers.length > 0) {
      // Blue Double Check
      return <span style={{ color: '#38bdf8', fontSize: '0.9rem', marginLeft: '4px' }}>✓✓</span>;
    }
    if (deliveredToOthers.length > 0) {
      // Gray Double Check
      return <span style={{ color: 'var(--text-dark)', fontSize: '0.9rem', marginLeft: '4px' }}>✓✓</span>;
    }
    // Single Check
    return <span style={{ color: 'var(--text-dark)', fontSize: '0.9rem', marginLeft: '4px' }}>✓</span>;
  };

  // Render attachment depending on file type
  const renderAttachment = () => {
    if (isDeleted) return null;

    switch (message.messageType) {
      case 'image':
        return (
          <img
            src={message.fileUrl}
            alt="Shared attachment"
            style={{
              maxWidth: '100%',
              maxHeight: '260px',
              borderRadius: '8px',
              marginTop: '4px',
              cursor: 'zoom-in',
              objectFit: 'cover',
            }}
            onClick={() => window.open(message.fileUrl, '_blank')}
          />
        );
      case 'video':
        return (
          <video
            src={message.fileUrl}
            controls
            style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', marginTop: '4px' }}
          />
        );
      case 'pdf':
      case 'document':
        return (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.15)',
              borderRadius: '8px',
              color: 'inherit',
              textDecoration: 'none',
              marginTop: '4px',
              border: '1px solid var(--panel-border)',
            }}
          >
            <FiFileText size={20} style={{ color: 'var(--primary)' }} />
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>{message.fileName || 'Attachment Document'}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click to View File</div>
            </div>
          </a>
        );
      case 'voice':
        return (
          <audio
            src={message.fileUrl}
            controls
            style={{ marginTop: '6px', maxWidth: '100%', height: '36px' }}
          />
        );
      case 'code':
        return <CodeSharing code={message.codeContent} language={message.codeLanguage} />;
      default:
        return null;
    }
  };

  // Reactions count calculations
  const reactionsMap = message.reactions.reduce((acc, curr) => {
    acc[curr.emoji] = (acc[acc.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
        width: '100%',
        margin: '6px 0',
        padding: '0 8px',
      }}
    >
      {/* Sender Profile Pic & Name (if group chat and not me) */}
      {!isMe && activeConversation.isGroupChat && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', marginLeft: '6px' }}>
          <img
            src={message.sender.profilePic || 'https://via.placeholder.com/150'}
            alt=""
            style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
            {message.sender.name}
          </span>
        </div>
      )}

      {/* Main Bubble body */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          maxWidth: '80%',
          flexDirection: isMe ? 'row-reverse' : 'row',
          position: 'relative',
        }}
        className="message-bubble-wrapper"
      >
        {/* Actual bubble container */}
        <div
          style={{
            background: isDeleted
              ? 'rgba(255,255,255,0.02)'
              : isMe
              ? 'var(--message-sent-bg)'
              : 'var(--message-received-bg)',
            border: isDeleted
              ? '1px dashed var(--panel-border)'
              : isMe
              ? 'none'
              : '1px solid var(--panel-border)',
            color: isMe && !isDeleted ? '#ffffff' : 'var(--text-main)',
            padding: message.messageType === 'code' ? '0' : '10px 14px',
            borderRadius: isMe
              ? '16px 16px 4px 16px'
              : '16px 16px 16px 4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Render Reply Header if this is a reply message */}
          {message.replyTo && !isDeleted && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.15)',
                borderLeft: '3px solid var(--primary)',
                padding: '6px 8px',
                borderRadius: '4px',
                marginBottom: '8px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                {message.replyTo.sender?.name || 'User'}
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                {message.replyTo.messageType === 'text' ? message.replyTo.text : `[Attachment: ${message.replyTo.messageType}]`}
              </div>
            </div>
          )}

          {/* EDIT FORM VIEW */}
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px', padding: '6px' }}>
              <textarea
                className="glass-input"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{ fontSize: '0.85rem', color: '#000000', background: '#ffffff', minHeight: '60px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button onClick={handleSaveEdit} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Message text content */}
              {message.text && (message.messageType === 'text' || message.messageType === 'code') && (
                <div style={{ fontSize: '0.9rem', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {message.text}
                </div>
              )}

              {/* Media file block */}
              {renderAttachment()}
            </>
          )}

          {/* Timestamp and checkmarks info */}
          {!isEditing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginTop: '4px',
                fontSize: '0.68rem',
                color: isMe && !isDeleted ? 'rgba(255,255,255,0.7)' : 'var(--text-dark)',
              }}
            >
              <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {message.isEdited && <span style={{ marginLeft: '4px', fontStyle: 'italic' }}>(edited)</span>}
              {message.isForwarded && <span style={{ marginLeft: '4px', fontStyle: 'italic' }}>↪ forwarded</span>}
              {renderStatus()}
            </div>
          )}

          {/* Reactions swatches */}
          {message.reactions.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginTop: '6px',
                flexWrap: 'wrap',
              }}
            >
              {Object.keys(reactionsMap).map((emoji) => (
                <div
                  key={emoji}
                  onClick={() => reactToMessage(message._id, emoji)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '12px',
                    padding: '2px 6px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                  title="Click to toggle reaction"
                >
                  <span>{emoji}</span>
                  <span style={{ fontWeight: 'bold' }}>{reactionsMap[emoji]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hover Menu Trigger button */}
        {!isDeleted && !isEditing && (
          <div
            className="bubble-action-menu"
            ref={menuRef}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dark)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
              }}
            >
              <FiMoreVertical size={16} />
            </button>

            {/* Float context menu options */}
            {showMenu && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: isMe ? 0 : 'auto',
                  left: !isMe ? 0 : 'auto',
                  background: 'var(--panel-bg)',
                  borderRadius: '8px',
                  boxShadow: 'var(--panel-shadow)',
                  border: '1px solid var(--panel-border)',
                  padding: '4px 0',
                  minWidth: '130px',
                  zIndex: 30,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Reaction Picker overlay trigger */}
                <button
                  onClick={() => {
                    setShowReactionPicker(true);
                    setShowMenu(false);
                  }}
                  className="menu-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  👍 React...
                </button>
                <button
                  onClick={() => {
                    onReply(message);
                    setShowMenu(false);
                  }}
                  className="menu-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  <FiCornerUpLeft /> Reply
                </button>
                <button
                  onClick={() => {
                    onForward(message);
                    setShowMenu(false);
                  }}
                  className="menu-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  <FiArrowRight /> Forward
                </button>
                <button
                  onClick={handleCopy}
                  className="menu-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  <FiCopy /> Copy
                </button>
                {isMe && (message.messageType === 'text' || message.messageType === 'code') && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="menu-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    <FiEdit3 /> Edit
                  </button>
                )}
                <button
                  onClick={() => {
                    deleteMessageForMe(message._id);
                    setShowMenu(false);
                  }}
                  className="menu-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  <FiTrash /> Delete For Me
                </button>
                {isMe && (
                  <button
                    onClick={() => {
                      deleteMessageForEveryone(message._id);
                      setShowMenu(false);
                    }}
                    className="menu-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--danger)', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    <FiTrash /> Recall Message
                  </button>
                )}
              </div>
            )}

            {/* Reaction picker float box */}
            {showReactionPicker && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: isMe ? 0 : 'auto',
                  left: !isMe ? 0 : 'auto',
                  zIndex: 40,
                }}
              >
                <ReactionPicker
                  onSelectEmoji={(emoji) => {
                    reactToMessage(message._id, emoji);
                    setShowReactionPicker(false);
                  }}
                  onClose={() => setShowReactionPicker(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global CSS for actions hovering layout */}
      <style dangerouslySetInnerHTML={{__html: `
        .bubble-action-menu {
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .message-bubble-wrapper:hover .bubble-action-menu {
          opacity: 1;
        }
        .menu-item:hover {
          background: rgba(255,255,255,0.05) !important;
        }
      `}} />
    </motion.div>
  );
};

export default MessageBubble;
