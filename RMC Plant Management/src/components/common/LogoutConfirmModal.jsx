import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  LogOut, 
  X, 
  AlertTriangle, 
  User, 
  ShieldAlert, 
  Factory, 
  CheckCircle2,
  Loader2
} from 'lucide-react';

/**
 * LogoutConfirmModal
 * High-definition industrial executive confirmation dialog before signing out of SM Concrete Tech ERP.
 */
export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoggingOut = false,
}) {
  const cancelButtonRef = useRef(null);

  // Keyboard accessibility: Escape to cancel & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    // Focus Cancel button to prevent accidental enter-key logouts
    if (cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoggingOut) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isLoggingOut, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoggingOut) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-950/30 overflow-hidden transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Warning Hazard Accent */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-orange-500" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            
            {/* Warning Icon Badge */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-xs ring-4 ring-rose-100/60">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                    SECURITY CONFIRMATION
                  </span>
                </div>
                <h3 
                  id="logout-dialog-title" 
                  className="text-lg font-black text-slate-900 tracking-tight mt-1 leading-snug"
                >
                  Confirm Sign Out
                </h3>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoggingOut}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-5 sm:px-6 space-y-4">
          
          {/* Main Question & Prompt */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-slate-700">
            <p className="text-sm font-bold text-slate-900 leading-snug">
              Are you sure you want to sign out?
            </p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Your active operational terminal will be disconnected. Any unsaved batch allocations, transit tickets, or draft reports in progress should be reviewed first.
            </p>
          </div>

          {/* Active Session Identity Card */}
          {user && (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                  Active Logged In Session
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {user.name || 'Plant User'}
                  </div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {user.email || user.employeeId || 'ID: Authenticated'}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {user.role && (
                    <span className="inline-block px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 truncate">
                  <Factory className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{user.plant || user.plantLocation || 'Sangli Main Unit'}</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  SM ERP v2.4
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 sm:p-6 pt-4 bg-slate-50/80 border-t border-slate-200/90 mt-5 flex items-center justify-end gap-2.5">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50"
          >
            Stay Signed In
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-600/25 active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Sign Out</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
