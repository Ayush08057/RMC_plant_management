import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
    info: <Info className="w-4 h-4 text-cyan-600 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-white text-emerald-950 shadow-xl',
    error: 'border-rose-200 bg-white text-rose-950 shadow-xl',
    info: 'border-cyan-200 bg-white text-cyan-950 shadow-xl',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center max-w-sm animate-slide-up">
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md ${borders[type] || borders.success}`}>
        {icons[type] || icons.success}
        <span className="text-xs font-semibold text-slate-800">{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
