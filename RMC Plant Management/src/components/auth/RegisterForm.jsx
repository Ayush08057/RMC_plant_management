import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Phone,
  Clock,
  IdCard,
  Building2,
  BadgeCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register, authError, clearAuthError } = useAuth();

  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setLocalError('');
    clearAuthError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();

    // 1. Mandatory Validations
    if (!formData.employeeId.trim()) {
      setLocalError('Please enter your official Employee ID.');
      return;
    }

    if (!formData.name.trim()) {
      setLocalError('Please enter your full name as registered by Admin.');
      return;
    }

    if (!formData.mobile.trim()) {
      setLocalError('Please enter your registered mobile number.');
      return;
    }

    if (!formData.email.trim()) {
      setLocalError('Please enter your work or registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setLocalError('Please enter a valid email address format.');
      return;
    }

    if (!formData.password) {
      setLocalError('Please choose a secure password.');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must contain at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match. Please verify confirmation password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        employeeId: formData.employeeId.trim().toUpperCase(),
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (result.success) {
        setIsSuccess(true);
        setSuccessInfo({
          employeeId: formData.employeeId.trim().toUpperCase(),
          name: formData.name.trim(),
          role: result.role || 'Designated Plant Role',
          message: result.message || 'Registration submitted. Your account is pending Admin authorization.',
        });
      } else {
        setLocalError(result.error || 'Registration failed. Please verify credentials with Admin.');
      }
    } catch (err) {
      setLocalError(err.message || 'Service communication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS VIEW: Registration Submitted -> Pending Admin Approval
  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto animate-pop-in">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-cyan-950/10 transition-all duration-300">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500" />
          
          <div className="p-5 sm:p-6 text-center space-y-4">
            
            {/* Animated Status Icon */}
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 bg-amber-400/30 rounded-2xl blur-lg animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-600 shadow-sm">
                <Clock className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            <div>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-widest inline-flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                PENDING ADMIN APPROVAL
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2">
                Registration Submitted!
              </h2>
              <p className="text-xs font-medium text-slate-600 mt-0.5 max-w-md mx-auto">
                Your plant personnel access dossier has been submitted for Administrator verification.
              </p>
            </div>

            {/* Confirmation Dossier Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto shadow-inner">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 font-mono">
                <span className="text-slate-500 font-medium">Employee ID:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {successInfo?.employeeId}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Full Name:</span>
                <span className="font-bold text-slate-900">{successInfo?.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Mapped Role:</span>
                <span className="font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  {successInfo?.role}
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                  Pending Verification
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200 text-left text-xs text-cyan-950 leading-relaxed max-w-md mx-auto font-medium shadow-2xs">
              <div className="flex gap-2.5">
                <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <strong>What happens next?</strong> Admin will verify your Employee ID. You will be able to log in immediately upon approval.
                </div>
              </div>
            </div>

            <div className="pt-1 max-w-md mx-auto">
              <Link
                to="/login"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer group"
              >
                <span>Return to Login Screen</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayError = localError || authError;

  return (
    <div className="w-full max-w-md mx-auto">
      
      {/* ========================================================
          ENTERPRISE VERTICAL REGISTRATION CARD (SLEEK MAX-W-MD)
          ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-amber-950/10 transition-all duration-300">
        
        {/* Top Accent Line */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500" />

        {/* Brand Header Banner - Bright Light Theme */}
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

            <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight mt-1.5">
              Register Plant Account
            </h1>
            <p className="text-[11px] text-slate-900/90 font-bold mt-0.5">
              Link your Employee ID to activate credentials
            </p>

          </div>
        </div>

        {/* Card Body Section - Vertical Form Stack */}
        <div className="p-4 sm:p-5 space-y-3 bg-white">

          {/* Error Alert Box */}
          {displayError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-shake shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="leading-relaxed font-medium flex-1 text-[11px]">{displayError}</div>
            </div>
          )}

          {/* Registration Form - Sleek Vertical Layout */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            
            {/* Field 1: Employee ID */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Official Employee ID <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <IdCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                <input
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value.toUpperCase())}
                  placeholder="e.g. ADM-001, DRV-001"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 font-mono font-bold tracking-wider uppercase focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Field 2: Full Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Full Employee Name <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium shadow-2xs"
                />
              </div>
            </div>

            {/* Field 3: Mobile Number */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value)}
                  placeholder="+91 98200 44001"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 font-mono focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Field 4: Work / Official Email */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="name@smconcretech.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium shadow-2xs"
                />
              </div>
            </div>

            {/* Grid for Passwords in 2 columns inside vertical form stack */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              {/* Field 5: Password */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 6: Confirm Password */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Retype password"
                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <BadgeCheck className="w-4 h-4 text-slate-950" />
                  <span>Submit Registration for Admin Approval</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="pt-2 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-600 font-medium">
              Already registered and approved?{' '}
              <Link
                to="/login"
                className="font-bold text-amber-900 hover:text-amber-950 hover:underline underline-offset-2"
              >
                Sign in to your portal
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
