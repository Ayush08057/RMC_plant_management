import React from 'react';
import { AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AlertCard({ title, desc, time, type = 'warning', onAction, actionLabel = 'Review' }) {
  const typeMap = {
    warning: {
      cardBorder: 'border-amber-400 hover:border-amber-500',
      bgGradient: 'bg-gradient-to-b from-amber-50/40 via-white to-white',
      topBar: 'bg-amber-500',
      iconBox: 'bg-amber-100/90 border-amber-300 text-amber-700',
      icon: AlertTriangle,
      glow: 'hover:shadow-amber-500/15',
    },
    danger: {
      cardBorder: 'border-rose-400 hover:border-rose-500',
      bgGradient: 'bg-gradient-to-b from-rose-50/40 via-white to-white',
      topBar: 'bg-rose-500',
      iconBox: 'bg-rose-100/90 border-rose-300 text-rose-700',
      icon: AlertCircle,
      glow: 'hover:shadow-rose-500/15',
    },
    info: {
      cardBorder: 'border-blue-400 hover:border-blue-500',
      bgGradient: 'bg-gradient-to-b from-blue-50/40 via-white to-white',
      topBar: 'bg-[#136dec]',
      iconBox: 'bg-blue-100/90 border-blue-300 text-[#136dec]',
      icon: Info,
      glow: 'hover:shadow-blue-500/15',
    },
    success: {
      cardBorder: 'border-emerald-400 hover:border-emerald-500',
      bgGradient: 'bg-gradient-to-b from-emerald-50/40 via-white to-white',
      topBar: 'bg-emerald-500',
      iconBox: 'bg-emerald-100/90 border-emerald-300 text-emerald-700',
      icon: CheckCircle2,
      glow: 'hover:shadow-emerald-500/15',
    },
  };

  const active = typeMap[type] || typeMap.info;
  const IconComponent = active.icon;

  return (
    <div className={`p-2 sm:p-2.5 pt-3 rounded-xl border-2 ${active.cardBorder} ${active.bgGradient} ${active.glow} flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs hover:shadow-sm transition-all w-full max-w-full overflow-hidden min-w-0 relative group`}>
      {/* Top Accent Lining Highlight */}
      <div 
        className={`absolute top-0 left-0 right-0 h-[3px] ${active.topBar} transition-all duration-300 group-hover:h-[4px]`} 
        aria-hidden="true"
      />

      <div className="flex items-start gap-2 min-w-0 flex-1">
        <div className={`w-5 h-5 rounded-md ${active.iconBox} border shadow-2xs shrink-0 flex items-center justify-center mt-0.5`}>
          <IconComponent className="w-3 h-3" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 break-words">{title}</h4>
          <p className="text-[10px] sm:text-[10.5px] text-slate-700 mt-0.5 leading-tight break-words font-medium">{desc}</p>
          {time && <span className="text-[8.5px] text-slate-500 font-mono mt-0.5 block font-semibold">{time}</span>}
        </div>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="self-start sm:self-auto px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition-colors shrink-0 cursor-pointer shadow-2xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
