import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Building2,
  Sparkles,
  ShieldCheck,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authError, clearAuthError } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
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
      setLocalError('Please enter your Registered Email or Employee ID.');
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
          COMPACT LIGHT INDUSTRIAL ENTERPRISE LOGIN CARD
          ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-amber-950/10 transition-all duration-300">
        
        {/* Top Accent Line */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500" />

        {/* Brand Header Banner - Bright Light Theme (Matching RegisterForm) */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-4 sm:p-5 text-slate-950 text-center relative overflow-hidden shadow-inner">
          
          {/* Subtle Light Accents */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-36 h-36 bg-amber-400/30 rounded-full blur-xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            
            {/* CRISP 3D LOGO EMBLEM - Balanced, clearly visible & circular */}
            <div className="relative group my-1">
              {/* Soft Golden Ambient Glow */}
              <div className="absolute -inset-2 bg-amber-300/40 rounded-full blur-md group-hover:opacity-100 transition duration-300 pointer-events-none" />
              
              {/* Logo Badge Card */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/95 p-1 border-2 border-amber-300/80 shadow-lg shadow-black/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <img 
                  src="/logo.png" 
                  alt="SM ConcreTech Logo" 
                  className="w-full h-full object-contain rounded-full drop-shadow-md"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-full rounded-full bg-amber-50 items-center justify-center text-amber-700 hidden">
                  <Building2 className="w-10 h-10" />
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight mt-1.5">
              RMC Plant Management
            </h1>
            <p className="text-[11px] text-slate-900/90 font-bold mt-0.5">
              Ready-Mix Concrete Industrial Control System
            </p>

          </div>
        </div>

        {/* Card Body - Matching Form Section */}
        <div className="p-4 sm:p-5 space-y-3 bg-white">

          {/* Error Alert */}
          {(localError || authError) && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs animate-shake shadow-2xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium flex-1">{localError || authError}</div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-xs shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-semibold flex-1">{successMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Identifier Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                <span>Employee ID or Work Email</span>
                <span className="text-[10px] text-amber-700 font-semibold font-mono">e.g. ADM-001</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
                  <User className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter Employee ID or Email"
                  disabled={isSubmitting}
                  autoComplete="username"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium shadow-2xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-amber-700 hover:text-amber-800 hover:underline font-semibold transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Quick Demo Trigger */}
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

            {/* High-Impact Submit Button - Industrial Amber-Orange */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1.5 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Register Account Footer Section */}
          <div className="pt-3 border-t border-slate-200 text-center space-y-1.5">
            <p className="text-[11px] text-slate-600 font-medium">
              New employee without portal access?
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-1.5 font-bold text-amber-900 hover:text-amber-950 transition-all py-2 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/90 text-xs w-full shadow-2xs"
            >
              <span>Register New Account</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
