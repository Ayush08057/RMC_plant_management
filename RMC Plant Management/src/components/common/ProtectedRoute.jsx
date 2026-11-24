import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UnauthorizedPage from './UnauthorizedPage';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Verifying Plant Security Tokens...
        </p>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Active status validation: Inactive, suspended, or pending accounts cannot access protected routes
  if (user.status && user.status !== 'Active') {
    return <Navigate to="/login" state={{ from: location, error: 'Your account is not active. Please contact Admin.' }} replace />;
  }

  // First-time login mandatory password change
  if (user.mustChangePassword) {
    return <Navigate to="/first-time-setup" replace />;
  }

  // Admin authority has unrestricted master clearance to access all roles and routes
  const hasAdminMasterClearance = Boolean(
    user.role === 'Admin' ||
    user.isMasterAdmin ||
    user.originalAdminUser?.role === 'Admin'
  );

  if (hasAdminMasterClearance) {
    return children;
  }

  // Other roles (Plant Manager, Plant Incharge, Driver, Accountant, Dispatcher, QC, etc.)
  // strictly cannot access other roles' routes
  if (allowedRoles.length > 0) {
    const userRoleNorm = (user.role || '').trim().toLowerCase();
    const isAllowed = allowedRoles.some((allowed) => {
      const allowedNorm = (allowed || '').trim().toLowerCase();
      if (allowedNorm === userRoleNorm) return true;
      // Plant Incharge, Plant Manager, and Operator share plant operations route access
      if (
        (userRoleNorm.includes('incharge') || userRoleNorm.includes('manager') || userRoleNorm.includes('operator')) &&
        (allowedNorm.includes('manager') || allowedNorm.includes('incharge') || allowedNorm.includes('operator'))
      ) {
        return true;
      }
      return false;
    });

    if (!isAllowed) {
      return (
        <UnauthorizedPage 
          attemptedPath={location.pathname} 
          requiredRoles={allowedRoles} 
          userRole={user.role} 
        />
      );
    }
  }

  return children;
}
