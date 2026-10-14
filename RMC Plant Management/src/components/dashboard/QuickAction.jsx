import React from 'react';

export default function QuickAction({
  icon: Icon,
  title,
  desc,
  onClick,
  color = 'amber',
  badge = null
}) {
  const colorMap = {
    amber: 'border-orange-200/90 hover:border-orange-400 bg-white/80 hover:bg-orange-50/80 text-orange-700',
    purple: 'border-purple-200/90 hover:border-purple-400 bg-white/80 hover:bg-purple-50/80 text-purple-700',
    blue: 'border-blue-200/90 hover:border-blue-400 bg-white/80 hover:bg-blue-50/80 text-blue-700',
    emerald: 'border-emerald-200/90 hover:border-emerald-400 bg-white/80 hover:bg-emerald-50/80 text-emerald-700',
    cyan: 'border-cyan-200/90 hover:border-cyan-400 bg-white/80 hover:bg-cyan-50/80 text-cyan-800',
    rose: 'border-rose-200/90 hover:border-rose-400 bg-white/80 hover:bg-rose-50/80 text-rose-700',
  };

  const style = colorMap[color] || colorMap.amber;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-2 sm:p-2.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-left transition-colors flex items-center gap-2 shadow-2xs cursor-pointer min-w-0 overflow-hidden group"
    >
      {Icon && (
        <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
          <Icon className="w-3 h-3" />
        </div>
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
            {title}
          </span>
          {badge && (
            <span className="text-[8.5px] px-1 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono shrink-0">
              {badge}
            </span>
          )}
        </div>
        {desc && <p className="text-[9.5px] text-slate-500 mt-0.5 truncate leading-tight">{desc}</p>}
      </div>
    </button>
  );
}
