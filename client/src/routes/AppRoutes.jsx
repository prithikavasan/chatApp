import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from '../components/layout/AuthLayout';
import DashboardLayout from '../components/layout/DashboardLayout';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect to Dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Authentication Routes (Wrapped in AuthLayout) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Dashboard Protected Routes (Wrapped in DashboardLayout) */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
