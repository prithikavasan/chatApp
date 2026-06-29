import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import MessageBubble from './MessageBubble';
import api from '../../services/api';
import {
  FiSend,
  FiPaperclip,
  FiSmile,
  FiCode,
  FiMic,
  FiSearch,
  FiInfo,
  FiX,
  FiChevronLeft,
  FiUsers,
  FiEdit,
  FiTrash2,
  FiPlusCircle,
  FiFolder,
  FiCornerUpLeft,
  FiMessageSquare
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const ChatWindow = () => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const {
    activeConversation,
    setActiveConversation,
    messages,
    fetchMessages,
    sendMessage,
    typingUsers,
    page,
    hasMoreMessages,
    pinConversation,
    muteConversation,
    archiveConversation,
    addMembers,
    removeMember,
    conversations
  } = useChat();

  const isGroup = activeConversation?.isGroupChat;
  
  // Header / Search states
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // Message scroll tracking
  const messageEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  // Input states
  const [inputText, setInputText] = useState('');
  const [replyParent, setReplyParent] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  
  // Code snippet editor panel
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');

  // File attachment states
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');

  // Voice note states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef(null);

  // Group settings drawer states (for modifying groups)
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [addMemberCode, setAddMemberCode] = useState('');
  const [loadingGroupEdit, setLoadingGroupEdit] = useState(false);

  // Typing debounce timer
  const typingTimeoutRef = useRef(null);

  // Load message logs on switch
  useEffect(() => {
    if (activeConversation?._id) {
      fetchMessages(activeConversation._id, 1);
      // Reset scroll tracking
      prevScrollHeightRef.current = 0;
      setShowSearch(false);
      setSearchResults([]);
      setReplyParent(null);
      setSelectedFile(null);
      setFilePreview('');
      setShowCodePanel(false);
      setShowInfoPanel(false);
      
      // Initialize edit states for Group
      if (isGroup) {
        setNewGroupName(activeConversation.groupName);
        setNewGroupDesc(activeConversation.groupDescription || '');
      }
    }
  }, [activeConversation?._id, fetchMessages, isGroup]);

  // Keep chat scroll at the bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      // If we are loading older pages (infinite scroll), preserve scroll position
      if (prevScrollHeightRef.current > 0) {
        const diff = scrollContainerRef.current.scrollHeight - prevScrollHeightRef.current;
        scrollContainerRef.current.scrollTop = diff;
        prevScrollHeightRef.current = 0;
      } else {
        // Auto scroll to bottom
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [messages]);

  // Infinite Scroll Scroll trigger
  const handleScroll = (e) => {
    const container = e.target;
    if (container.scrollTop === 0 && hasMoreMessages && messages.length > 0) {
      prevScrollHeightRef.current = container.scrollHeight;
      fetchMessages(activeConversation._id, page + 1, true);
    }
  };

  // Typing state emitters
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    if (socket && activeConversation) {
      // Emit typing
      socket.emit('typing', { conversationId: activeConversation._id, username: user.username });

      // Clear previous timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      // Set stop typing trigger after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { conversationId: activeConversation._id, username: user.username });
      }, 2000);
    }
  };

  // File picker handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        return toast.error('Attachment must be under 25MB.');
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview('file_placeholder'); // generic doc placeholder indicator
      }
    }
  };

  // Voice recording toggle
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        toast.success('Voice note recorded!');
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error('Permission to access microphone denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      // Stop stream tracks to turn off recording light
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Submit main message
  const handleSendMessageSubmit = async (e) => {
    if (e) e.preventDefault();

    // Check if sending code snippet
    if (showCodePanel) {
      if (!codeContent.trim()) return;
      await sendMessage(activeConversation._id, inputText, 'code', {
        codeContent,
        codeLanguage,
        replyTo: replyParent?._id,
      });
      setCodeContent('');
      setShowCodePanel(false);
      setInputText('');
      setReplyParent(null);
      return;
    }

    // Check voice memo
    if (recordedAudio) {
      const filename = `voice_note_${Date.now()}.webm`;
      const audioFile = new File([recordedAudio], filename, { type: 'audio/webm' });
      await sendMessage(activeConversation._id, '', 'voice', {
        file: audioFile,
        replyTo: replyParent?._id,
      });
      setRecordedAudio(null);
      setReplyParent(null);
      return;
    }

    // Check attachments
    if (selectedFile) {
      await sendMessage(activeConversation._id, inputText, 'document', {
        file: selectedFile,
        replyTo: replyParent?._id,
      });
      setSelectedFile(null);
      setFilePreview('');
      setInputText('');
      setReplyParent(null);
      return;
    }

    // Normal Text Send
    if (!inputText.trim()) return;
    await sendMessage(activeConversation._id, inputText.trim(), 'text', {
      replyTo: replyParent?._id,
    });
    setInputText('');
    setReplyParent(null);

    // Stop typing socket trigger
    if (socket && activeConversation) {
      socket.emit('stop_typing', { conversationId: activeConversation._id, username: user.username });
    }
  };

  // Message keyword searching
  const handleSearchMessages = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await api.get(`/messages/search/${activeConversation._id}?query=${searchQuery}`);
      if (res.data && res.data.success) {
        setSearchResults(res.data.results);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Forward message logic (send it as a new copy)
  const handleForwardMessageClick = async (targetConvId) => {
    if (!forwardMessage) return;
    
    // Determine content keys
    const options = {
      isForwarded: true,
    };
    if (forwardMessage.messageType === 'code') {
      options.codeContent = forwardMessage.codeContent;
      options.codeLanguage = forwardMessage.codeLanguage;
    }
    
    await sendMessage(targetConvId, forwardMessage.text, forwardMessage.messageType, options);
    toast.success('Message forwarded');
    setForwardMessage(null);
  };

  // Group modifications
  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!addMemberCode.trim()) return;
    
    setLoadingGroupEdit(true);
    try {
      // Find user first using search
      const userRes = await api.get(`/friends/search/${addMemberCode.trim()}`);
      if (userRes.data && userRes.data.success) {
        const targetUser = userRes.data.user;
        const res = await addMembers(activeConversation._id, [targetUser._id]);
        if (res.success) {
          setAddMemberCode('');
        }
      }
    } catch (err) {
      toast.error('User not found or connection is not friends.');
    } finally {
      setLoadingGroupEdit(false);
    }
  };

  const handleUpdateGroupDetails = async () => {
    if (!newGroupName.trim()) return;
    setLoadingGroupEdit(true);
    try {
      await api.put(`/conversations/group/${activeConversation._id}/rename`, { groupName: newGroupName });
      await api.put(`/conversations/group/${activeConversation._id}/description`, { groupDescription: newGroupDesc });
      toast.success('Group settings updated');
    } catch (err) {
      toast.error('Failed to update group detail settings');
    } finally {
      setLoadingGroupEdit(false);
    }
  };

  // Formats typing display nicely
  const getTypingText = () => {
    const typingList = Object.keys(typingUsers);
    if (typingList.length === 0) return '';
    if (typingList.length === 1) return `${typingList[0]} is typing...`;
    return `${typingList.join(', ')} are typing...`;
  };

  // Header Details: profile image and title
  const getHeaderDetails = () => {
    if (isGroup) {
      return {
        title: activeConversation.groupName,
        pic: activeConversation.groupIcon,
        subtitle: `${activeConversation.participants.length} members`,
      };
    } else {
      const other = activeConversation.participants.find((p) => p._id !== user._id);
      const isOnline = other ? socket && activeConversation && user && other && (onlineUsers || []).includes(other._id) : false;
      return {
        title: other?.name || 'ChatCode User',
        pic: other?.profilePic,
        subtitle: isOnline ? 'Online' : 'Offline',
        online: isOnline,
      };
    }
  };

  const details = getHeaderDetails();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        color: 'var(--text-main)',
      }}
    >
      {/* Main chat center console */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Chat Header */}
        <div
          style={{
            height: 'var(--header-height)',
            padding: '12px 20px',
            borderBottom: '1px solid var(--panel-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.2)',
          }}
        >
          {/* Profile details left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {/* Back button (Mobile view) */}
            <button
              onClick={() => setActiveConversation(null)}
              className="btn btn-secondary"
              style={{
                padding: '6px',
                borderRadius: '50%',
                minWidth: '32px',
                height: '32px',
                display: 'none',
              }}
              className="mobile-back-button"
            >
              <FiChevronLeft size={20} />
            </button>

            {/* Avatar */}
            {details.pic ? (
              <img
                src={details.pic}
                alt=""
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--panel-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                }}
              >
                {isGroup ? 'GP' : details.title.charAt(0)}
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {details.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: details.online ? 'var(--secondary)' : 'var(--text-dark)', fontWeight: details.online ? '600' : '400' }}>
                {getTypingText() || details.subtitle}
              </div>
            </div>
          </div>

          {/* Action buttons right */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="btn btn-secondary"
              style={{ padding: '8px', borderRadius: '50%', minWidth: '36px', height: '36px' }}
              title="Search Messages"
            >
              <FiSearch size={16} />
            </button>
            <button
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className="btn btn-secondary"
              style={{ padding: '8px', borderRadius: '50%', minWidth: '36px', height: '36px' }}
              title="Chat Info"
            >
              <FiInfo size={16} />
            </button>
          </div>
        </div>

        {/* SEARCH BAR (Dropdown panel) */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: 'var(--input-bg)',
                borderBottom: '1px solid var(--panel-border)',
                padding: '10px 20px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              <input
                type="text"
                className="glass-input"
                placeholder="Search keywords in text or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: '36px' }}
              />
              <button onClick={handleSearchMessages} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Search
              </button>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messaging Area (Scrollable pane with Custom Wallpaper support) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
          className={`chat-wallpaper-pane ${user?.chatBackground || ''}`}
        >
          {/* Search Results Drawer */}
          {searchResults.length > 0 && (
            <div
              className="glass-card"
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                background: 'var(--panel-bg-hover)',
                marginBottom: '16px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                <span>Search Results ({searchResults.length})</span>
                <button onClick={() => setSearchResults([])} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                {searchResults.map((msg) => (
                  <div
                    key={msg._id}
                    style={{ fontSize: '0.78rem', padding: '6px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', cursor: 'pointer' }}
                    onClick={() => {
                      // Simple focus element scroll helper
                      const el = document.getElementById(`msg-${msg._id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <strong>{msg.sender.name}:</strong> {msg.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List Messages */}
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dark)' }}>
              <FiMessageSquare size={44} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p style={{ fontSize: '0.85rem' }}>No messages in this chat. Say hello!</p>
            </div>
          ) : (
            <>
              {hasMoreMessages && (
                <div style={{ textAlign: 'center', padding: '10px', fontSize: '0.75rem', color: 'var(--text-dark)' }}>
                  Loading older messages...
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg._id} id={`msg-${msg._id}`} style={{ width: '100%' }}>
                  <MessageBubble
                    message={msg}
                    onReply={(parent) => setReplyParent(parent)}
                    onForward={(forwardObj) => setForwardMessage(forwardObj)}
                  />
                </div>
              ))}
              <div ref={messageEndRef} />
            </>
          )}
        </div>

        {/* INPUT PANEL & MEDIA TOOLS */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--panel-border)',
            background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Reply Parent Bar */}
          {replyParent && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                borderLeft: '4px solid var(--primary)',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 'bold' }}>Replying to {replyParent.sender?.name}:</span>{' '}
                <span style={{ color: 'var(--text-muted)' }}>
                  {replyParent.messageType === 'text' ? replyParent.text : `[Attachment: ${replyParent.messageType}]`}
                </span>
              </div>
              <button
                onClick={() => setReplyParent(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dark)', cursor: 'pointer' }}
              >
                <FiX size={16} />
              </button>
            </div>
          )}

          {/* Code Sharing input slide-down panel */}
          <AnimatePresence>
            {showCodePanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--primary)' }}>
                    Share Code Snippet
                  </div>
                  {/* Language Selector */}
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--panel-border)',
                      color: 'var(--text-main)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      outline: 'none',
                      fontSize: '0.8rem',
                    }}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                <textarea
                  className="glass-input"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    minHeight: '120px',
                    color: '#c9d1d9',
                    background: '#0d1117',
                  }}
                  placeholder="// Paste or write your code snippet here..."
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attachment Preview thumbnail */}
          {filePreview && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                alignSelf: 'flex-start',
              }}
            >
              {filePreview === 'file_placeholder' ? (
                <FiFolder size={24} style={{ color: 'var(--primary)' }} />
              ) : (
                <img
                  src={filePreview}
                  alt=""
                  style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                />
              )}
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{selectedFile?.name}</span>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreview('');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
              >
                <FiX size={16} />
              </button>
            </div>
          )}

          {/* Voice Memo bar indicators */}
          {isRecording && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: 'var(--danger)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--danger)',
                    animation: 'pulse-ring 1.5s infinite',
                  }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Recording Voice note...</span>
              </div>
              <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </div>
              <button onClick={stopRecording} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                Stop & Attach
              </button>
            </div>
          )}

          {/* Normal Input Form */}
          <form onSubmit={handleSendMessageSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Attachment icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              style={{ padding: '10px', borderRadius: '50%', minWidth: '40px', height: '40px' }}
              title="Attach File"
            >
              <FiPaperclip size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Code share icon toggle */}
            <button
              type="button"
              onClick={() => setShowCodePanel(!showCodePanel)}
              className="btn btn-secondary"
              style={{
                padding: '10px',
                borderRadius: '50%',
                minWidth: '40px',
                height: '40px',
                background: showCodePanel ? 'var(--primary-light)' : 'var(--panel-border)',
                border: showCodePanel ? '1px solid var(--primary)' : 'none',
              }}
              title="Share Code"
            >
              <FiCode size={18} />
            </button>

            {/* Voice record trigger */}
            {!recordedAudio ? (
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
                style={{ padding: '10px', borderRadius: '50%', minWidth: '40px', height: '40px' }}
                title="Voice Note"
              >
                <FiMic size={18} />
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 'bold' }}>🎤 Audio Attached</span>
                <button
                  type="button"
                  onClick={() => setRecordedAudio(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                >
                  <FiX size={14} />
                </button>
              </div>
            )}

            {/* Text input */}
            <input
              type="text"
              className="glass-input"
              style={{ height: '40px' }}
              placeholder={showCodePanel ? 'Enter description for code (optional)...' : 'Type message here...'}
              value={inputText}
              onChange={handleInputChange}
              disabled={isRecording}
            />

            {/* Send */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '10px', borderRadius: '50%', minWidth: '40px', height: '40px' }}
              disabled={isRecording || (!inputText.trim() && !selectedFile && !recordedAudio && !codeContent.trim())}
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* CHAT INFO SIDEBAR PANEL (Drawer details) */}
      <AnimatePresence>
        {showInfoPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '320px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{
              height: '100%',
              background: 'rgba(15, 23, 42, 0.45)',
              borderLeft: '1px solid var(--panel-border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Conversation Details</h3>
              <button
                onClick={() => setShowInfoPanel(false)}
                className="btn btn-secondary"
                style={{ padding: '4px', borderRadius: '50%', minWidth: '24px', height: '24px' }}
              >
                <FiX size={14} />
              </button>
            </div>

            {/* Info display container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                {details.pic ? (
                  <img
                    src={details.pic}
                    alt=""
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', marginBottom: '12px' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'var(--panel-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '2rem',
                      color: 'var(--text-muted)',
                      margin: '0 auto 12px',
                    }}
                  >
                    {isGroup ? 'GP' : details.title.charAt(0)}
                  </div>
                )}
                <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{details.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{details.subtitle}</p>
              </div>

              {/* Preferences checklist (pin/mute/archive) */}
              <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => pinConversation(activeConversation._id)}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '8px', justifyContent: 'flex-start' }}
                >
                  📌 {conversations.find(c => c._id === activeConversation._id)?.isPinned ? 'Unpin Conversation' : 'Pin Conversation'}
                </button>
                <button
                  onClick={() => muteConversation(activeConversation._id)}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '8px', justifyContent: 'flex-start' }}
                >
                  🔇 {conversations.find(c => c._id === activeConversation._id)?.isMuted ? 'Unmute Chat' : 'Mute Notifications'}
                </button>
                <button
                  onClick={() => archiveConversation(activeConversation._id)}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '8px', justifyContent: 'flex-start' }}
                >
                  📁 {conversations.find(c => c._id === activeConversation._id)?.isArchived ? 'Unarchive Chat' : 'Archive Conversation'}
                </button>
              </div>

              {/* GROUP ACTIONS DRAWER VIEW */}
              {isGroup ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Edit group form (if admin) */}
                  {activeConversation.groupAdmins.some((a) => a._id === user._id) && (
                    <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>Edit Group Details</div>
                      <input
                        type="text"
                        className="glass-input"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Rename Group"
                        style={{ height: '34px', fontSize: '0.82rem' }}
                      />
                      <textarea
                        className="glass-input"
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        placeholder="Group Description"
                        style={{ fontSize: '0.82rem', minHeight: '50px' }}
                      />
                      <button onClick={handleUpdateGroupDetails} className="btn btn-primary" style={{ padding: '6px', fontSize: '0.8rem' }} disabled={loadingGroupEdit}>
                        Save Group Details
                      </button>
                    </div>
                  )}

                  {/* Add Members section */}
                  {activeConversation.groupAdmins.some((a) => a._id === user._id) && (
                    <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>Add Member</div>
                      <form onSubmit={handleAddMemberSubmit} style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          className="glass-input"
                          placeholder="Friend's Chat Code"
                          value={addMemberCode}
                          onChange={(e) => setAddMemberCode(e.target.value)}
                          style={{ height: '34px', fontSize: '0.82rem', textTransform: 'uppercase' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '6px 10px' }} disabled={loadingGroupEdit}>
                          Add
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Members listing */}
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px' }}>
                      Group Participants ({activeConversation.participants.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeConversation.participants.map((member) => {
                        const isAdmin = activeConversation.groupAdmins.some((a) => a._id === member._id);
                        const isMeAdmin = activeConversation.groupAdmins.some((a) => a._id === user._id);
                        return (
                          <div key={member._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img src={member.profilePic || 'https://via.placeholder.com/150'} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 'bold' }}>{member.name}</div>
                                {isAdmin && <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 'bold' }}>Admin</span>}
                              </div>
                            </div>
                            
                            {/* Remove button (if I am admin and member is not me) */}
                            {isMeAdmin && member._id !== user._id && (
                              <button
                                onClick={() => removeMember(activeConversation._id, member._id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                title="Remove Member"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Leave Group button */}
                  <button
                    onClick={() => removeMember(activeConversation._id, user._id)}
                    className="btn btn-danger"
                    style={{ width: '100%', fontSize: '0.85rem', padding: '10px' }}
                  >
                    Leave Group
                  </button>
                </div>
              ) : (
                /* Private Chat details */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Bio</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {activeConversation.participants.find((p) => p._id !== user._id)?.bio || 'No bio written.'}
                  </p>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginTop: '10px' }}>Chat Code</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                    {activeConversation.participants.find((p) => p._id !== user._id)?.chatCode || 'NONE'}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward message selection modal popup */}
      {forwardMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold' }}>Forward Message To:</div>
              <button onClick={() => setForwardMessage(null)} className="btn btn-secondary" style={{ padding: '4px', borderRadius: '50%' }}>
                <FiX size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {conversations.map((conv) => {
                const title = conv.isGroupChat
                  ? conv.groupName
                  : conv.participants.find((p) => p._id !== user._id)?.name || 'User';
                return (
                  <button
                    key={conv._id}
                    onClick={() => handleForwardMessageClick(conv._id)}
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.85rem' }}
                  >
                    {title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CSS Wallpapers designs classes injected */}
      <style dangerouslySetInnerHTML={{__html: `
        /* wallpaper designs */
        .wp-binary {
          background-image: linear-gradient(rgba(15,23,42,0.9), rgba(15,23,42,0.9)), url('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400');
          background-size: cover;
        }
        .wp-stars {
          background-image: linear-gradient(rgba(15,23,42,0.85), rgba(15,23,42,0.85)), url('https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=400');
          background-size: cover;
        }
        .wp-gradient {
          background: radial-gradient(circle at 10% 20%, rgb(59, 149, 237) 0%, rgb(7, 12, 24) 90%) !important;
        }

        .mobile-back-button {
          display: none;
        }

        @media (max-width: 1023px) {
          .mobile-back-button {
            display: flex !important;
          }
        }
      `}} />
    </div>
  );
};

export default ChatWindow;
