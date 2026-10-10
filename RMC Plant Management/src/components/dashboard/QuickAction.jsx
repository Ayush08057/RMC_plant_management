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
      className={`w-full p-3 sm:p-4 rounded-xl border backdrop-blur-md text-left transition-all duration-300 group flex items-start gap-2.5 sm:gap-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer min-w-0 overflow-hidden ${style}`}
    >
      {Icon && (
        <div className="p-1.5 sm:p-2 rounded-lg bg-white border border-slate-200 text-current shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-orange-700 transition-colors truncate">
            {title}
          </span>
          {badge && (
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600 font-mono shrink-0">
              {badge}
            </span>
          )}
        </div>
        {desc && <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 line-clamp-1 truncate">{desc}</p>}
      </div>
    </button>
  );
}
