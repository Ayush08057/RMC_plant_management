import React from 'react';

const COLOR_THEMES = {
  amber: {
    cardBorder: 'border-amber-400 hover:border-amber-500',
    bgGradient: 'bg-gradient-to-b from-amber-50/30 via-white to-white',
    topBar: 'bg-amber-500',
    iconBox: 'bg-amber-100/90 border-amber-300 text-amber-700',
    badge: 'bg-amber-100 border-amber-300 text-amber-800',
    hoverGlow: 'hover:shadow-amber-500/20 hover:shadow-md',
  },
  blue: {
    cardBorder: 'border-blue-400 hover:border-blue-500',
    bgGradient: 'bg-gradient-to-b from-blue-50/30 via-white to-white',
    topBar: 'bg-[#136dec]',
    iconBox: 'bg-blue-100/90 border-blue-300 text-[#136dec]',
    badge: 'bg-blue-100 border-blue-300 text-blue-800',
    hoverGlow: 'hover:shadow-blue-500/20 hover:shadow-md',
  },
  emerald: {
    cardBorder: 'border-emerald-400 hover:border-emerald-500',
    bgGradient: 'bg-gradient-to-b from-emerald-50/30 via-white to-white',
    topBar: 'bg-emerald-500',
    iconBox: 'bg-emerald-100/90 border-emerald-300 text-emerald-700',
    badge: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    hoverGlow: 'hover:shadow-emerald-500/20 hover:shadow-md',
  },
  purple: {
    cardBorder: 'border-purple-400 hover:border-purple-500',
    bgGradient: 'bg-gradient-to-b from-purple-50/30 via-white to-white',
    topBar: 'bg-purple-500',
    iconBox: 'bg-purple-100/90 border-purple-300 text-purple-700',
    badge: 'bg-purple-100 border-purple-300 text-purple-800',
    hoverGlow: 'hover:shadow-purple-500/20 hover:shadow-md',
  },
  cyan: {
    cardBorder: 'border-cyan-400 hover:border-cyan-500',
    bgGradient: 'bg-gradient-to-b from-cyan-50/30 via-white to-white',
    topBar: 'bg-cyan-500',
    iconBox: 'bg-cyan-100/90 border-cyan-300 text-cyan-700',
    badge: 'bg-cyan-100 border-cyan-300 text-cyan-800',
    hoverGlow: 'hover:shadow-cyan-500/20 hover:shadow-md',
  },
  rose: {
    cardBorder: 'border-rose-400 hover:border-rose-500',
    bgGradient: 'bg-gradient-to-b from-rose-50/30 via-white to-white',
    topBar: 'bg-rose-500',
    iconBox: 'bg-rose-100/90 border-rose-300 text-rose-700',
    badge: 'bg-rose-100 border-rose-300 text-rose-800',
    hoverGlow: 'hover:shadow-rose-500/20 hover:shadow-md',
  },
  indigo: {
    cardBorder: 'border-indigo-400 hover:border-indigo-500',
    bgGradient: 'bg-gradient-to-b from-indigo-50/30 via-white to-white',
    topBar: 'bg-indigo-500',
    iconBox: 'bg-indigo-100/90 border-indigo-300 text-indigo-700',
    badge: 'bg-indigo-100 border-indigo-300 text-indigo-800',
    hoverGlow: 'hover:shadow-indigo-500/20 hover:shadow-md',
  }
};

export default function QuickAction({
  icon: Icon,
  title,
  desc,
  onClick,
  color = 'amber',
  badge = null
}) {
  const theme = COLOR_THEMES[color] || COLOR_THEMES.amber;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-2 sm:p-2.5 pt-3 rounded-xl border-2 ${theme.cardBorder} ${theme.bgGradient} ${theme.hoverGlow} text-left transition-all duration-200 flex items-center gap-2 shadow-xs cursor-pointer min-w-0 overflow-hidden group relative`}
    >
      {/* Top Accent Lining Highlight */}
      <div 
        className={`absolute top-0 left-0 right-0 h-[3px] ${theme.topBar} transition-all duration-300 group-hover:h-[4px]`} 
        aria-hidden="true"
      />

      {Icon && (
        <div className={`w-6 h-6 rounded-md ${theme.iconBox} border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-2xs`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-bold text-slate-900 group-hover:text-black transition-colors truncate">
            {title}
          </span>
          {badge && (
            <span className={`text-[8.5px] px-1 py-0.2 rounded border font-mono font-bold shrink-0 ${theme.badge}`}>
              {badge}
            </span>
          )}
        </div>
        {desc && <p className="text-[9.5px] text-slate-600 mt-0.5 truncate leading-tight font-medium">{desc}</p>}
      </div>
    </button>
  );
}
