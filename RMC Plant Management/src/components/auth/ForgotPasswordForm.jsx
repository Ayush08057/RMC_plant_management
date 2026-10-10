import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  KeyRound, 
  ArrowLeft, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Send,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ForgotPasswordForm() {
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo(null);

    if (!identifier.trim()) {
      setError('Please provide your registered plant Email or Employee ID.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(identifier);
      if (result.success) {
        setSuccessInfo({
          message: result.message,
          user: result.user || { employeeId: identifier },
        });
      } else {
        setError(result.error || 'Failed to locate user account in plant registry.');
      }
    } catch (err) {
      setError('Connection failure communicating with plant identity server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-slate-300/50 transition-all duration-300">
      
      {/* Header */}
      <div className="text-left mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-3">
          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          <span>Credential Recovery</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Forgot Password?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed font-medium">
          Enter your registered work email or Employee ID to reset your credentials.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-medium">{error}</div>
        </div>
      )}

      {successInfo ? (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Reset Link Dispatched</span>
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">
              {successInfo.message}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to={`/reset-password?id=${encodeURIComponent(successInfo.user.employeeId)}`}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/25"
            >
              <span>Proceed to Reset Password Screen</span>
            </Link>

            <Link
              to="/login"
              className="w-full py-3 px-4 rounded-2xl font-bold text-xs border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Email or Employee ID
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. manager@smconcretech.com or ADM-001"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all duration-200 disabled:opacity-50 font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Instructions will be routed to your verified plant contact profile
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 px-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Locating Plant Account...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Password Reset Link</span>
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-amber-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      )}

      {/* Industrial Support Footnote */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
        <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Need urgent plant access? Contact Plant Operations Admin on Ext #101.</span>
      </div>

    </div>
  );
}
