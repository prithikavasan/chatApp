import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiArrowRight } from 'react-icons/fi';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [receivedToken, setReceivedToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      return toast.error('Please enter your email.');
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgotpassword', { email });
      if (response.data && response.data.success) {
        toast.success('Reset code generated!');
        setReceivedToken(response.data.token);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request reset.');
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
      <h2 style={{ fontSize: '1.75rem', marginBottom: '8px', fontWeight: 'bold' }}>Forgot Password</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Enter your email to receive a local simulated OTP reset token.
      </p>

      {!receivedToken ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
              <input
                type="email"
                className="glass-input"
                style={{ paddingLeft: '44px' }}
                placeholder="e.g. dev@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '12px' }} disabled={loading}>
            {loading ? (
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
            ) : (
              <>
                Generate OTP <FiArrowRight />
              </>
            )}
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
          <div
            className="glass-card"
            style={{
              background: 'var(--primary-light)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--primary)',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Simulated Reset Code (OTP)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '4px', color: 'var(--text-main)' }}>
              {receivedToken}
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Copy this token and use it on the password reset screen.
          </p>
          <button
            onClick={() => navigate('/reset-password')}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Proceed to Reset
          </button>
        </div>
      )}

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
          <FiArrowLeft /> Back to Sign In
        </Link>
      </div>
    </motion.div>
  );
};

export default ForgotPassword;
