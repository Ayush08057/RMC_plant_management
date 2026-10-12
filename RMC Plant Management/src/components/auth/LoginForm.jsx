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
          setSuccessMessage('First-time login detected. Redirecting to password setup...');
          setTimeout(() => {
            navigate('/first-time-setup');
          }, 600);
        } else {
          setSuccessMessage(`Authenticated as ${result.role}. Redirecting...`);
          setTimeout(() => {
            navigate(result.redirectPath);
          }, 700);
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
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

        {/* Brand Header Banner - Perfectly Proportioned Professional Spacing */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 pt-5 pb-4 px-5 sm:pt-6 sm:pb-5 sm:px-6 text-slate-950 text-center relative overflow-hidden shadow-inner">
          
          {/* Subtle Ambient Light Accents */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-56 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 right-0 w-40 h-40 bg-amber-400/30 rounded-full blur-xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            
            {/* CRISP 3D LOGO EMBLEM - Balanced with clear breathing room */}
            <div className="relative group mb-2.5">
              <div className="absolute -inset-2 bg-white/25 rounded-full blur-md group-hover:opacity-100 transition duration-300 pointer-events-none" />
              
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1 border-2 border-amber-300 shadow-md shadow-black/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ring-4 ring-white/30">
                <img 
                  src="/logo.png" 
                  alt="SM ConcreTech Logo" 
                  className="w-full h-full object-contain rounded-full drop-shadow-xs"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-full rounded-full bg-amber-50 items-center justify-center text-amber-700 hidden">
                  <Building2 className="w-7 h-7" />
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
              RMC Plant Management
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-900/90 font-bold tracking-wide mt-0.5">
              Ready-Mix Concrete Industrial Control System
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

          {/* Success Alert */}
          {successMessage && (
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <div className="font-semibold flex-1 text-[11px]">{successMessage}</div>
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
