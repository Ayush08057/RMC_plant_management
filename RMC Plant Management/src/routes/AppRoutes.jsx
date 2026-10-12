import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_ROUTES } from '../data/mockUsers';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import FirstTimeSetupPage from '../pages/auth/FirstTimeSetupPage';

// Common & Security Components
import ProtectedRoute from '../components/common/ProtectedRoute';
import NotFoundPage from '../pages/common/NotFoundPage';

// Role Dashboard Pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import PlantManagerDashboardPage from '../pages/plant-manager/PlantManagerDashboardPage';
import AccountantDashboardPage from '../pages/accountant/AccountantDashboardPage';
import DispatcherDashboardPage from '../pages/dispatcher/DispatcherDashboardPage';
import QcDashboardPage from '../pages/qc/QcDashboardPage';
import SiteSupervisorDashboardPage from '../pages/site-supervisor/SiteSupervisorDashboardPage';
import DriverDashboardPage from '../pages/driver/DriverDashboardPage';
import OwnerDashboardPage from '../pages/owner/OwnerDashboardPage';

/**
 * Root Redirector: determines where to land when hitting "/"
 */
function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-amber-400">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/first-time-setup" replace />;
  }

  const destination = ROLE_ROUTES[user.role] || '/login';
  return <Navigate to={destination} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Authentication Pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/first-time-setup" element={<FirstTimeSetupPage />} />

      {/* Role-Protected Dashboards */}
      {/* Role-Protected Dashboards — Admin has master clearance; other roles are strictly isolated */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/plant-manager"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR]}>
            <PlantManagerDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/accountant"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT]}>
            <AccountantDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dispatcher"
        element={
          <ProtectedRoute allowedRoles={[ROLES.DISPATCHER]}>
            <DispatcherDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/qc"
        element={
          <ProtectedRoute allowedRoles={[ROLES.QC_ENGINEER]}>
            <QcDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/site-supervisor"
        element={
          <ProtectedRoute allowedRoles={[ROLES.SITE_SUPERVISOR]}>
            <SiteSupervisorDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={[ROLES.DRIVER]}>
            <DriverDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/owner"
        element={
          <ProtectedRoute allowedRoles={[ROLES.OWNER_DIRECTOR]}>
            <OwnerDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
