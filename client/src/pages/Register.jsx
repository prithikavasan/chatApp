import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !username || !email || !password || !confirmPassword) {
      return toast.error('All fields are required.');
    }

    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }

    if (password !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    setLoading(true);
    const result = await register(name, username, email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Registration successful! Welcome to ChatCode.');
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
      <h2 style={{ fontSize: '1.75rem', marginBottom: '8px', fontWeight: 'bold' }}>Create Account</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Register to get your unique Chat Code.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Name Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
            Full Name
          </label>
          <div style={{ position: 'relative' }}>
            <FiUser style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
            <input
              type="text"
              className="glass-input"
              style={{ paddingLeft: '44px' }}
              placeholder="e.g. Sundar Avasan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Username Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <FiUser style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
            <input
              type="text"
              className="glass-input"
              style={{ paddingLeft: '44px' }}
              placeholder="e.g. sundar"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Email Input */}
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
              placeholder="e.g. developer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
            Password
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

        {/* Confirm Password Input */}
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
        <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '12px', marginTop: '8px' }} disabled={loading}>
          {loading ? (
            <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
          ) : (
            <>
              Register <FiArrowRight />
            </>
          )}
        </button>
      </form>

      {/* Redirect Footer */}
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          Sign In
        </Link>
      </div>
    </motion.div>
  );
};

export default Register;
