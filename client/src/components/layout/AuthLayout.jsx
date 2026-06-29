import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  // If already authenticated, redirect to Dashboard
  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px',
      }}
    >
      {/* Decorative Floating Circles */}
      <motion.div
        animate={{
          y: [0, -30, 0],
          x: [0, 20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--primary) 0%, rgba(99, 102, 241, 0.1) 70%)',
          filter: 'blur(30px)',
          zIndex: 0,
        }}
      />
      <motion.div
        animate={{
          y: [0, 40, 0],
          x: [0, -30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '20%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--primary) 0%, rgba(99, 102, 241, 0.05) 75%)',
          filter: 'blur(45px)',
          zIndex: 0,
        }}
      />

      {/* Main Form Box */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '460px',
          zIndex: 1,
        }}
      >
        {/* App Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              background: 'linear-gradient(to right, #ffffff, var(--primary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
              marginBottom: '6px',
            }}
          >
            ChatCode
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            "Share. Connect. Code."
          </p>
        </div>

        <div className="glass-card">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;
