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
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_ROUTES } from '../../data/mockUsers';
import defaultLogo from '../../assets/logo.png';

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
          ENTERPRISE INDUSTRIAL LOGIN CARD - BRAND HARMONIZED
          ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/25 transition-all duration-300">

        {/* Top Accent Strip - Tri-tone blue, cyan & safety amber echoing the logo palette */}
        <div className="h-1.5 bg-gradient-to-r from-blue-700 via-sky-400 to-amber-400" />

        {/* Brand Header Banner - Deep Architectural Navy & Blueprint Theme */}
        <div className="bg-gradient-to-b from-[#070e1c] via-[#0c1a36] to-[#071124] pt-6 pb-5 px-5 sm:pt-7 sm:pb-6 sm:px-6 text-white text-center relative overflow-hidden shadow-inner border-b border-sky-950/60">

          {/* Blueprint Geometric Accents & Ambient Glows */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(56, 189, 248, 0.4) 1px, transparent 1px)",
              backgroundSize: "16px 16px"
            }}
          />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-56 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 right-0 w-36 h-36 bg-amber-400/15 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">

            {/* COMPANY LOGO EMBLEM - CIRCULAR MEDALLION TO MATCH CIRCULAR LOGO */}
            <div className="relative group mb-3">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-sky-400/50 via-white to-amber-400/60 shadow-xl shadow-slate-950/40 ring-4 ring-sky-500/25 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:ring-sky-400/50">
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5">
                  <img
                    src={defaultLogo}
                    alt="SM ConcreTech Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full rounded-full bg-white items-center justify-center text-sky-600 hidden">
                    <Building2 className="w-14 h-14" />
                  </div>
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider leading-snug drop-shadow-md">
              SM CONCRETECH
            </h1>
            <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/30 text-[11px] font-bold text-sky-300 tracking-wide shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Ready-Mix Concrete Plant Management ERP</span>
            </div>

          </div>
        </div>

        {/* Card Body - Streamlined Spacing */}
        <div className="p-4 sm:p-5 space-y-3 bg-white">

          {/* Error Alert */}
          {(localError || authError) && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-800 text-xs animate-shake shadow-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
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
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Identifier Field */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                <span>Username, ID, or Email</span>
                <span className="text-[9px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/60 font-semibold font-mono">
                  e.g. @suraj, rahul_driver, ADM-001
                </span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter @username, Employee ID, or Email"
                  disabled={isSubmitting}
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 transition-all font-medium shadow-xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-semibold transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 transition-all font-mono shadow-xs"
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
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600"
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
              className="w-full mt-1.5 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 hover:from-blue-600 hover:via-blue-500 hover:to-sky-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Enterprise Security Subtext */}
            <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-400 font-medium font-mono">
              <Lock className="w-3 h-3 text-sky-600" />
              <span>256-Bit SCADA Encryption • Gateway Active</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
