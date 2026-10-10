import React from 'react';
import { AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AlertCard({ title, desc, time, type = 'warning', onAction, actionLabel = 'Review' }) {
  const typeMap = {
    warning: {
      border: 'border-orange-200/90 bg-orange-50/80 text-orange-900',
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
    },
    danger: {
      border: 'border-rose-200/90 bg-rose-50/80 text-rose-900',
      icon: AlertCircle,
      iconColor: 'text-rose-600',
    },
    info: {
      border: 'border-cyan-200/90 bg-cyan-50/80 text-cyan-900',
      icon: Info,
      iconColor: 'text-cyan-600',
    },
    success: {
      border: 'border-emerald-200/90 bg-emerald-50/80 text-emerald-900',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
  };

  const active = typeMap[type] || typeMap.warning;
  const IconComponent = active.icon;

  return (
    <div className={`p-3.5 sm:p-4 rounded-xl border backdrop-blur-md ${active.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-md transition-all w-full max-w-full overflow-hidden min-w-0`}>
      <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
          <IconComponent className={`w-4 h-4 ${active.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-900 break-words">{title}</h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{desc}</p>
          {time && <span className="text-[10px] text-slate-500 font-mono mt-1 block">{time}</span>}
        </div>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition-colors shrink-0 cursor-pointer shadow-2xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
