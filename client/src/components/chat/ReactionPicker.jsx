import React from 'react';
import { motion } from 'framer-motion';

const ReactionPicker = ({ onSelectEmoji, onClose }) => {
  const emojis = ['❤️', '😂', '👍', '🔥', '👏', '😍'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 10 }}
      transition={{ duration: 0.15 }}
      style={{
        display: 'flex',
        gap: '6px',
        padding: '6px 10px',
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '24px',
        boxShadow: 'var(--panel-shadow)',
        backdropFilter: 'blur(10px)',
        zIndex: 50,
      }}
      onMouseLeave={onClose}
    >
      {emojis.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelectEmoji(emoji);
            if (onClose) onClose();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '50%',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
};

export default ReactionPicker;
