import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react';
import Modal from './Modal';

export default function KPICard({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  trend, 
  trendType = 'up',
  color = 'amber',
  onClick = null,
  detailsData = null,
}) {
  const [showInternalModal, setShowInternalModal] = useState(false);

  const colorMap = {
    purple: {
      accentBar: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500',
      bgHover: 'hover:border-purple-300/90 hover:shadow-lg hover:shadow-purple-500/10',
      iconBg: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 ring-4 ring-purple-100/90',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
      dotColor: 'bg-purple-500',
      glow: 'from-purple-500/15 via-indigo-500/5 to-transparent',
      cardBg: 'bg-gradient-to-b from-white via-white to-purple-50/30',
    },
    amber: {
      accentBar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500',
      bgHover: 'hover:border-amber-300/90 hover:shadow-lg hover:shadow-amber-500/10',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-4 ring-amber-100/90',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
      dotColor: 'bg-amber-500',
      glow: 'from-amber-500/15 via-orange-500/5 to-transparent',
      cardBg: 'bg-gradient-to-b from-white via-white to-amber-50/30',
    },
    emerald: {
      accentBar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
      bgHover: 'hover:border-emerald-300/90 hover:shadow-lg hover:shadow-emerald-500/10',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-4 ring-emerald-100/90',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      dotColor: 'bg-emerald-500',
      glow: 'from-emerald-500/15 via-teal-500/5 to-transparent',
      cardBg: 'bg-gradient-to-b from-white via-white to-emerald-50/30',
    },
    blue: {
      accentBar: 'bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400',
      bgHover: 'hover:border-blue-300/90 hover:shadow-lg hover:shadow-blue-500/10',
      iconBg: 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25 ring-4 ring-blue-100/90',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200/80',
      dotColor: 'bg-blue-500',
      glow: 'from-blue-500/15 via-cyan-500/5 to-transparent',
      cardBg: 'bg-gradient-to-b from-white via-white to-blue-50/30',
    },
    cyan: {
      accentBar: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500',
      bgHover: 'hover:border-cyan-300/90 hover:shadow-lg hover:shadow-cyan-500/10',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-4 ring-cyan-100/90',
      badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200/80',
      dotColor: 'bg-cyan-500',
      glow: 'from-cyan-500/15 via-blue-500/5 to-transparent',
      cardBg: 'bg-gradient-to-b from-white via-white to-cyan-50/30',
    },
    rose: {
      accentBar: 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500',
      bgHover: 'hover:border-rose-300/90 hover:shadow-lg hover:shadow-rose-500/10',
      iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25 ring-4 ring-rose-100/90',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200/80',
      dotColor: 'bg-rose-500',
      glow: 'from-rose-500/15 via-pink-500/5 to-transparent',
      cardBg: 'bg-gradient-to-b from-white via-white to-rose-50/30',
    },
    slate: {
      accentBar: 'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-900',
      bgHover: 'hover:border-slate-400/90 hover:shadow-lg hover:shadow-slate-500/10',
      iconBg: 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md shadow-slate-500/25 ring-4 ring-slate-100',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
      dotColor: 'bg-slate-500',
      glow: 'from-slate-500/15 via-slate-700/5 to-transparent',
      cardBg: 'bg-gradient-to-b from-white via-white to-slate-50/40',
    },
  };

  const activeColor = colorMap[color] || colorMap.amber;

  const handleCardClick = (e) => {
    if (onClick) {
      onClick(e);
    } else {
      setShowInternalModal(true);
    }
  };

  return (
    <>
      <div 
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(e);
          }
        }}
        className={`p-4 sm:p-4.5 rounded-2xl ${activeColor.cardBg} border border-slate-200/90 transition-all duration-300 shadow-2xs hover:shadow-xl flex flex-col justify-between w-full max-w-full min-w-0 overflow-hidden group relative cursor-pointer ${activeColor.bgHover} hover:-translate-y-1 active:scale-[0.99]`}
      >
        {/* Top Gradient Accent Line */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${activeColor.accentBar}`} />

        {/* Top Right Subtle Ambient Glow on Hover */}
        <div className={`absolute -top-8 -right-8 w-28 h-28 bg-gradient-to-br ${activeColor.glow} rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

        <div className="pt-0.5 relative z-10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-2 h-2 rounded-full ${activeColor.dotColor} shrink-0 animate-pulse`} />
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider truncate">{title}</span>
            </div>
            {Icon && (
              <div className={`w-9 h-9 rounded-xl ${activeColor.iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ease-out`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight break-words font-sans group-hover:text-slate-950 transition-colors">
            {value}
          </div>
        </div>

        {(subtext || trend) && (
          <div className="mt-3 pt-2.5 border-t border-slate-100/90 flex items-center justify-between text-[11px] text-slate-500 gap-1.5 font-medium min-w-0 relative z-10">
            <span className="font-semibold text-slate-600 truncate text-[10px] sm:text-[11px]" title={subtext}>
              {subtext}
            </span>
            {trend && (
              <span className={`inline-flex items-center gap-1.5 font-bold shrink-0 text-[10px] px-2 py-0.5 rounded-lg border shadow-2xs transition-transform group-hover:scale-105 ${
                trendType === 'up' 
                  ? 'text-emerald-800 bg-emerald-50/90 border-emerald-200/90' 
                  : trendType === 'down' 
                    ? 'text-rose-800 bg-rose-50/90 border-rose-200/90' 
                    : activeColor.badgeBg
              }`}>
                {trendType === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" /> : trendType === 'down' ? <TrendingDown className="w-3 h-3 text-rose-600 shrink-0" /> : null}
                <span className="font-mono whitespace-nowrap">{trend}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Internal Detailed Pop-Up Modal when no external onClick is provided */}
      {!onClick && (
        <Modal
          isOpen={showInternalModal}
          onClose={() => setShowInternalModal(false)}
          title={`${title} • Detailed Metrics & Telemetry`}
          subtitle="Real-time KPI breakdown and SCADA synchronized parameters"
          icon={Icon || BarChart2}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-cyan-50/50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Current Metric Value</span>
              <div className="text-3xl font-black text-slate-900 font-mono">{value}</div>
              <p className="text-xs text-slate-600 font-medium">{subtext}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Trend Status</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{trend || 'Active Telemetry'}</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">SCADA Sync Time</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {detailsData && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 text-xs">Sub-system Breakdown</span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(detailsData).map(([k, v], i) => (
                    <div key={i} className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-600 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-bold text-slate-900 font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowInternalModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
              >
                Close Pop-Up
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
