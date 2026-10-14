import React from 'react';
import { AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AlertCard({ title, desc, time, type = 'warning', onAction, actionLabel = 'Review' }) {
  const typeMap = {
    warning: {
      border: 'border-[#D4E4F7] bg-[#EAF3FF] text-[#123B6D]',
      icon: AlertTriangle,
      iconColor: 'text-[#1D5FA7]',
    },
    danger: {
      border: 'border-[#123B6D] bg-[#F5F9FF] text-[#123B6D]',
      icon: AlertCircle,
      iconColor: 'text-[#123B6D]',
    },
    info: {
      border: 'border-[#D4E4F7] bg-[#F5F9FF] text-[#123B6D]',
      icon: Info,
      iconColor: 'text-[#1D5FA7]',
    },
    success: {
      border: 'border-[#246BCE] bg-[#EAF3FF] text-[#123B6D]',
      icon: CheckCircle2,
      iconColor: 'text-[#246BCE]',
    },
  };

  const active = typeMap[type] || typeMap.info;
  const IconComponent = active.icon;

  return (
    <div className={`p-2 sm:p-2.5 rounded-lg border ${active.border} flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs hover:shadow-xs transition-all w-full max-w-full overflow-hidden min-w-0`}>
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <div className="w-5 h-5 rounded bg-white border border-[#D4E4F7] shadow-2xs shrink-0 flex items-center justify-center mt-0.5">
          <IconComponent className={`w-3 h-3 ${active.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[11px] sm:text-xs font-bold text-black break-words">{title}</h4>
          <p className="text-[10px] sm:text-[10.5px] text-slate-800 mt-0.5 leading-tight break-words">{desc}</p>
          {time && <span className="text-[8.5px] text-slate-700 font-mono mt-0.5 block font-semibold">{time}</span>}
        </div>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-[#EAF3FF] text-black border border-[#D4E4F7] transition-colors shrink-0 cursor-pointer shadow-2xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
