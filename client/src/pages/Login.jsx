import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [loginCredential, setLoginCredential] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!loginCredential || !password) {
      return toast.error('Please enter all fields.');
    }

    setLoading(true);
    const result = await login(loginCredential, password);
    setLoading(false);

    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 style={{ fontSize: '1.75rem', marginBottom: '8px', fontWeight: 'bold' }}>Sign In</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Welcome back to ChatCode. Let's get coding.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Username/Email Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
            Username or Email
          </label>
          <div style={{ position: 'relative' }}>
            <FiMail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
            <input
              type="text"
              className="glass-input"
              style={{ paddingLeft: '44px' }}
              placeholder="e.g. sundar or dev@example.com"
              value={loginCredential}
              onChange={(e) => setLoginCredential(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Password</label>
            <Link
              to="/forgot-password"
              style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
            >
              Forgot?
            </Link>
          </div>
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

        {/* Submit button */}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '12px' }} disabled={loading}>
          {loading ? (
            <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
          ) : (
            <>
              Sign In <FiArrowRight />
            </>
          )}
        </button>
      </form>

      {/* Redirect Footer */}
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        Don't have an account?{' '}
        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          Create Account
        </Link>
      </div>
    </motion.div>
  );
};

export default Login;
