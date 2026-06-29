import React, { useEffect, useState } from 'react';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { useChat } from '../hooks/useChat';
import { FiMessageSquare, FiTerminal } from 'react-icons/fi';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { activeConversation } = useChat();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 1024; // matches index.css breakpoints

  // Conditional rendering for mobile vs desktop layouts
  if (isMobile) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>
        {activeConversation ? (
          <ChatWindow />
        ) : (
          <Sidebar />
        )}
      </div>
    );
  }

  // Desktop layout (Grid of Sidebar + Chat pane/Welcome screen)
  return (
    <>
      <Sidebar />
      {activeConversation ? (
        <ChatWindow />
      ) : (
        <WelcomeScreen />
      )}
    </>
  );
};

// Rendered on desktop when no conversation is active
const WelcomeScreen = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '32px',
        textAlign: 'center',
        background: 'rgba(15, 23, 42, 0.15)',
        color: 'var(--text-main)',
      }}
    >
      <motion.div
        animate={{
          y: [0, -12, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'var(--primary-light)',
          border: '1px solid var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)',
          marginBottom: '24px',
          boxShadow: '0 8px 30px var(--primary-light)',
        }}
      >
        <FiTerminal size={40} />
      </motion.div>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
        Welcome to ChatCode
      </h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '420px', fontSize: '0.92rem', lineHeight: '1.5' }}>
        Select a conversation from the sidebar or search your friends' Chat Codes to start sharing text, files, and syntax-highlighted code.
      </p>
    </div>
  );
};

export default Dashboard;
