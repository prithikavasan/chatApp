import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { ChatProvider } from '../../contexts/ChatContext';

const DashboardLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ChatProvider>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          padding: '16px', // elegant margin around layout for premium SaaS desktop styling
          background: 'var(--bg-gradient)',
        }}
        className="dashboard-container"
      >
        <div
          className="glass-panel"
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: 'var(--sidebar-width) 1fr',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Outlet />
        </div>

        {/* Global responsive override for grid gap */}
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 1023px) {
            .dashboard-container {
              padding: 0 !important;
            }
            .dashboard-container > .glass-panel {
              border-radius: 0 !important;
              border: none !important;
              grid-template-columns: 1fr !important;
            }
          }
        `}} />
      </div>
    </ChatProvider>
  );
};

export default DashboardLayout;
