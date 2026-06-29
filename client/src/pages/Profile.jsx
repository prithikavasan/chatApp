import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { FiCamera, FiUser, FiInfo, FiMail, FiHash, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePicPreview, setProfilePicPreview] = useState(user?.profilePic || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return toast.error('Profile picture must be under 5MB.');
      }
      setSelectedFile(file);
      // Create local preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfilePicPreview(previewUrl);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error('Name cannot be empty.');
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('bio', bio);
    if (selectedFile) {
      formData.append('profilePic', selectedFile);
    }

    const result = await updateProfile(formData);
    setLoading(false);

    if (result.success) {
      toast.success('Profile updated successfully!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '24px',
        overflowY: 'auto',
        color: 'var(--text-main)',
        background: 'rgba(15, 23, 42, 0.25)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-secondary"
          style={{ padding: '8px', borderRadius: '50%', minWidth: '40px', height: '40px' }}
        >
          <FiArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Profile</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Update your public profile information.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleFormSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          maxWidth: '550px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Profile Pic Upload */}
        <div style={{ position: 'relative', width: '130px', height: '130px' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '3px solid var(--primary)',
              overflow: 'hidden',
              background: 'var(--input-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--panel-shadow)',
            }}
          >
            {profilePicPreview ? (
              <img
                src={profilePicPreview}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <FiUser size={48} style={{ color: 'var(--text-dark)' }} />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              transition: 'var(--transition)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            disabled={loading}
          >
            <FiCamera size={16} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Form Fields */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Chat Code (Disabled - Read Only) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              My Chat Code
            </label>
            <div style={{ position: 'relative' }}>
              <FiHash style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
              <input
                type="text"
                className="glass-input"
                style={{ paddingLeft: '44px', fontWeight: 'bold', color: 'var(--primary)', background: 'rgba(255,255,255,0.03)' }}
                value={user?.chatCode || ''}
                readOnly
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '4px', display: 'block' }}>
              Share this code so friends can send you request.
            </span>
          </div>

          {/* Full Name */}
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Full Name"
                disabled={loading}
              />
            </div>
          </div>

          {/* Username (Disabled) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <FiUser style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
              <input
                type="text"
                className="glass-input"
                style={{ paddingLeft: '44px', color: 'var(--text-dark)', background: 'rgba(255,255,255,0.03)' }}
                value={user?.username || ''}
                readOnly
              />
            </div>
          </div>

          {/* Email (Disabled) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
              <input
                type="email"
                className="glass-input"
                style={{ paddingLeft: '44px', color: 'var(--text-dark)', background: 'rgba(255,255,255,0.03)' }}
                value={user?.email || ''}
                readOnly
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Bio
            </label>
            <div style={{ position: 'relative' }}>
              <FiInfo style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-dark)' }} />
              <textarea
                className="glass-input"
                style={{ paddingLeft: '44px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                disabled={loading}
                maxLength={160}
              />
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '8px', marginTop: '12px' }} disabled={loading}>
            {loading ? (
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default Profile;
