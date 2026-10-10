import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, Lock, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_ROUTES } from '../../data/mockUsers';

export default function UnauthorizedPage({ attemptedPath = '', requiredRoles = [], userRole = '' }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [countdown, setCountdown] = useState(5);

  const targetRole = userRole || user?.role;
  const userDashboardUrl = targetRole && ROLE_ROUTES[targetRole] ? ROLE_ROUTES[targetRole] : '/login';

  // Auto-redirect to authorized portal after 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(userDashboardUrl);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, userDashboardUrl]);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-black">
      <div className="w-full max-w-lg bg-[#13161f] border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
        
        {/* Top Danger Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 mb-5 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono font-semibold mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span>HTTP 403 • ACCESS RESTRICTED</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Access Denied – You do not have permission to access this page.
        </h1>

        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Your account role (<strong className="text-amber-400">{targetRole || 'Current Role'}</strong>) does not hold authorization clearance for this portal zone.
        </p>

        {/* Diagnostic Metadata Box */}
        <div className="my-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-2 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Current User:</span>
            <span className="font-semibold text-slate-200">{user?.name} ({user?.employeeId})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Your Assigned Role:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {targetRole}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Required Role(s):</span>
            <span className="text-red-300 text-[11px]">
              {requiredRoles.length > 0 ? requiredRoles.join(', ') : 'Restricted'}
            </span>
          </div>
          {attemptedPath && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[11px]">
              <span className="text-slate-500">Attempted Route:</span>
              <span className="text-slate-400 truncate max-w-[200px]">{attemptedPath}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <Link
            to={userDashboardUrl}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Your Authorized Portal ({targetRole}) [Redirecting in {countdown}s]</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs border border-slate-700 hover:border-slate-600 bg-slate-900/60 text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
