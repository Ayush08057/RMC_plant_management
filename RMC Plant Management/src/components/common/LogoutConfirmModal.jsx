import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X, Loader2 } from 'lucide-react';

/**
 * LogoutConfirmModal
 * Clean, simple confirmation dialog before signing out.
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 app-modal-backdrop transition-opacity duration-200"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
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
        className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 
                id="logout-dialog-title" 
                className="text-base font-bold text-slate-900 leading-tight"
              >
                Sign Out
              </h3>
              {user && (
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                  {user.name || user.email || 'Active Session'}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simple Body */}
        <div className="px-5 py-3 text-sm text-slate-600">
          Are you sure you want to sign out?
        </div>

        {/* Actions Footer */}
        <div className="p-4 pt-3 flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <span>Sign Out</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
