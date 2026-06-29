import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FiKey, FiLock, FiArrowLeft } from 'react-icons/fi';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token || !password || !confirmPassword) {
      return toast.error('Please enter all fields.');
    }

    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }

    if (password !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/resetpassword', { token, password });
      if (response.data && response.data.success) {
        toast.success('Password updated successfully! Please login.');
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 style={{ fontSize: '1.75rem', marginBottom: '8px', fontWeight: 'bold' }}>Reset Password</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Enter the 6-digit OTP code and select a secure new password.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* OTP Code */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
            OTP Reset Code
          </label>
          <div style={{ position: 'relative' }}>
            <FiKey style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
            <input
              type="text"
              className="glass-input"
              style={{ paddingLeft: '44px', letterSpacing: '2px', fontWeight: 'bold' }}
              placeholder="e.g. 837482"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={loading}
              maxLength={6}
            />
          </div>
        </div>

        {/* New Password */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
            New Password
          </label>
          <div style={{ position: 'relative' }}>
            <FiLock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
            <input
              type="password"
              className="glass-input"
              style={{ paddingLeft: '44px' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
            Confirm Password
          </label>
          <div style={{ position: 'relative' }}>
            <FiLock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
            <input
              type="password"
              className="glass-input"
              style={{ paddingLeft: '44px' }}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
          {loading ? (
            <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>

      {/* Back to Login */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link
          to="/login"
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FiArrowLeft /> Cancel and Return
        </Link>
      </div>
    </motion.div>
  );
};

export default ResetPassword;
