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

  // First-time login mandatory password change
  if (user.mustChangePassword) {
    return <Navigate to="/first-time-setup" replace />;
  }

  // Check role authorization
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <UnauthorizedPage 
        attemptedPath={location.pathname} 
        requiredRoles={allowedRoles} 
        userRole={user.role} 
      />
    );
  }

  return children;
}
