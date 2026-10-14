import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_ROUTES } from '../../data/mockUsers';

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, login, authError, clearAuthError } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const dest = ROLE_ROUTES[user.role] || '/admin';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (location.state?.email) {
      setIdentifier(location.state.email);
    }
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();
    setSuccessMessage('');

    if (!identifier.trim()) {
      setLocalError('Please enter your Username, Employee ID, or Email.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(identifier, password, rememberMe);

      if (result.success) {
        if (result.requiresFirstLoginSetup) {
          setSuccessMessage('User login successfully! Redirecting to first-time credentials setup...');
          setTimeout(() => {
            navigate('/first-time-setup');
          }, 700);
        } else {
          const displayName = result.user?.name || identifier;
          setSuccessMessage(`User login successfully! Welcome back, ${displayName}.`);

          try {
            sessionStorage.setItem('rmc_login_toast', JSON.stringify({
              title: 'User login successfully',
              userName: displayName,
              role: result.role,
              timestamp: Date.now()
            }));
          } catch {
            // ignore
          }

          setTimeout(() => {
            navigate(result.redirectPath, {
              state: {
                loginSuccess: true,
                message: `User login successfully! Welcome back, ${displayName}.`,
                userName: displayName,
                userRole: result.role
              }
            });
          }, 750);
        }
      } else {
        setLocalError(result.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setLocalError('Plant authentication service timeout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">

      {/* ========================================================
          ENTERPRISE INDUSTRIAL LOGIN CARD - PROPER UPPER SPACING
          ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-amber-950/10 transition-all duration-300">

        {/* Top Accent Line */}
        <div className="h-1.5 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300" />

        {/* Brand Header Banner - Balanced Warm Industrial Gold-Orange Theme */}
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-400 pt-5 pb-4 px-5 sm:pt-6 sm:pb-5 sm:px-6 text-slate-950 text-center relative overflow-hidden shadow-inner">

          {/* Subtle Ambient Depth */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-52 h-52 bg-white/25 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 right-0 w-36 h-36 bg-orange-300/30 rounded-full blur-lg pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">

            {/* COMPANY LOGO EMBLEM - PROPORTIONAL & BALANCED SIZE */}
            <div className="relative group mb-3">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 border border-slate-200 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:scale-105 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="SM ConcreTech Logo"
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-full rounded-xl bg-slate-50 items-center justify-center text-slate-700 hidden">
                  <Building2 className="w-12 h-12" />
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug drop-shadow-2xs">
              SM CONCRETECH
            </h1>
            <p className="text-xs text-amber-950 font-extrabold tracking-wide mt-0.5">
              Ready-Mix Concrete Plant Management ERP
            </p>

          </div>
        </div>

        {/* Card Body - Streamlined Spacing */}
        <div className="p-4 sm:p-5 space-y-3 bg-white">

          {/* Error Alert */}
          {(localError || authError) && (
            <div className="p-2 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-800 text-xs animate-shake shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-tight font-medium flex-1 text-[11px]">{localError || authError}</div>
            </div>
          )}

          {/* Executive Success Notification */}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 flex items-center gap-3 text-emerald-950 shadow-md animate-fadeIn">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-emerald-300/60">
                <CheckCircle2 className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[11px] font-black text-emerald-900 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <span>User login successfully</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 truncate mt-0.5">
                  {successMessage.replace('User login successfully! ', '')}
                </div>
              </div>
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">

            {/* Identifier Field */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-0.5 flex items-center justify-between">
                <span>Username, ID, or Email</span>
                <span className="text-[9px] text-amber-700 font-semibold font-mono">e.g. rahul_driver, ADM-001</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter Username, Employee ID, or Email"
                  disabled={isSubmitting}
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium shadow-2xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] text-amber-700 hover:text-amber-800 hover:underline font-semibold transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-0.5 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-600/20 cursor-pointer accent-amber-600"
                />
                <span className="text-slate-700 font-medium text-[11px]">
                  Keep signed in
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
