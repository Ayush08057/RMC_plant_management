import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PasswordStrengthMeter, { getPasswordStrength } from './PasswordStrengthMeter';

export default function FirstTimeSetupForm() {
  const navigate = useNavigate();
  const { pendingFirstLoginUser, completeFirstTimeSetup, logout } = useAuth();

  const effectiveUser = pendingFirstLoginUser || {
    id: 'USR-NEW-09',
    name: 'Kunal Shinde',
    employeeId: 'EMP-NEW-909',
    role: 'Site Supervisor',
    department: 'Site Pouring & Inspection',
  };

  const [currentPassword, setCurrentPassword] = useState('TempPassword123');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please provide your temporary password given by plant dispatch/admin.');
      return;
    }

    if (!newPassword) {
      setError('Please enter your new permanent password.');
      return;
    }

    const { isAcceptable } = getPasswordStrength(newPassword);
    if (!isAcceptable) {
      setError('Your new password does not meet the industrial security criteria.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password cannot be identical to the temporary password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Confirm password does not match new password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await completeFirstTimeSetup(effectiveUser.id, currentPassword, newPassword);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(result.redirectPath);
        }, 1200);
      } else {
        setError(result.error || 'Failed to complete initial password setup.');
      }
    } catch (err) {
      setError('Failed to establish initial security session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-slate-300/50 transition-all duration-300">
      
      {/* Header */}
      <div className="text-left mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-3">
          <UserCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>First-Time Employee Onboarding</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Set Your Permanent Password
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed font-medium">
          Welcome to SM Concrete Tech! As a new plant team member, please establish your personal credentials to activate your account.
        </p>
      </div>

      {/* Employee Identity Chip */}
      <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-900">{effectiveUser.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">ID: {effectiveUser.employeeId}</div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          {effectiveUser.role}
        </span>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-semibold">{error}</div>
        </div>
      )}

      {/* Success View */}
      {success && (
        <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="font-semibold">Password set successfully! Launching your {effectiveUser.role} Dashboard...</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Temporary Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Current Temporary Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current temporary password"
              disabled={isSubmitting}
              className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all duration-200 disabled:opacity-60 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            (Pre-filled with default demo key: TempPassword123)
          </p>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            New Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Create strong permanent password"
              disabled={isSubmitting}
              className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all duration-200 disabled:opacity-60 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength Meter with Checklist */}
          <PasswordStrengthMeter password={newPassword} showChecklist={true} />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Confirm New Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={isSubmitting}
              className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all duration-200 disabled:opacity-60 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[11px] text-red-500 mt-1 font-semibold">Passwords do not match yet.</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3.5 px-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-950" />
              <span>Activating Account & Logging In...</span>
            </>
          ) : (
            <>
              <span>Activate & Continue to Dashboard</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancel & Return to Login
          </button>
        </div>
      </form>
    </div>
  );
}
