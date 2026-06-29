import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            
            {/* Main Application Router */}
            <AppRoutes />

            {/* Global Styled Notifications overlay */}
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--panel-border)',
                  backdropFilter: 'blur(10px)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--primary)',
                    secondary: '#ffffff',
                  },
                },
              }}
            />

          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
