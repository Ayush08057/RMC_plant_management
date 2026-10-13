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
      accentBar: 'bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500',
      bgHover: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
      iconBg: 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-100',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-blue-600',
      glow: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      cardBg: 'bg-white',
    },
    amber: {
      accentBar: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500',
      bgHover: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
      iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-100',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-blue-500',
      glow: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      cardBg: 'bg-white',
    },
    emerald: {
      accentBar: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500',
      bgHover: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
      iconBg: 'bg-gradient-to-br from-blue-600 to-teal-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-100',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-emerald-500',
      glow: 'from-blue-500/10 via-teal-500/5 to-transparent',
      cardBg: 'bg-white',
    },
    blue: {
      accentBar: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500',
      bgHover: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-100',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-blue-600',
      glow: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      cardBg: 'bg-white',
    },
    cyan: {
      accentBar: 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600',
      bgHover: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-100',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-blue-500',
      glow: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      cardBg: 'bg-white',
    },
    rose: {
      accentBar: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500',
      bgHover: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
      iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-100',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-rose-500',
      glow: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      cardBg: 'bg-white',
    },
    slate: {
      accentBar: 'bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600',
      bgHover: 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
      iconBg: 'bg-gradient-to-br from-slate-700 to-blue-900 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-100',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-blue-600',
      glow: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      cardBg: 'bg-white',
    },
  };

  const activeColor = colorMap[color] || colorMap.blue;

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
        className={`px-3 py-2 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl ${activeColor.cardBg} border border-slate-200/85 transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between w-full max-w-full min-w-0 overflow-hidden group relative cursor-pointer ${activeColor.bgHover} hover:-translate-y-0.5 active:scale-[0.99]`}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight block truncate font-sans">
              {title}
            </span>
            {Icon && (
              <div className="w-5.5 h-5.5 rounded-md bg-slate-50 border border-slate-200/70 text-slate-500 flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105">
                <Icon className="w-3 h-3 text-slate-500" />
              </div>
            )}
          </div>
          <div className="text-base sm:text-[17px] font-semibold text-slate-800 tracking-tight font-sans tabular-nums my-0.5 leading-snug group-hover:text-blue-900 transition-colors">
            {value}
          </div>
        </div>

        {(subtext || trend) && (
          <div className="mt-1 pt-1 border-t border-slate-100/90 flex items-center justify-between text-[9.5px] sm:text-[10px] text-slate-500 gap-1 font-normal min-w-0 relative z-10">
            {subtext && (
              <span className="font-normal text-slate-500 text-[9.5px] sm:text-[10px] leading-tight truncate flex-1 min-w-0" title={subtext}>
                {subtext}
              </span>
            )}
            {trend && (
              <span className={`inline-flex items-center gap-0.5 font-medium shrink-0 text-[8.5px] px-1.5 py-0.2 rounded border shadow-2xs ${
                trendType === 'up' 
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200' 
                  : trendType === 'down' 
                    ? 'text-rose-800 bg-rose-50 border-rose-200' 
                    : activeColor.badgeBg
              }`}>
                {trendType === 'up' ? <TrendingUp className="w-2.5 h-2.5 text-emerald-600 shrink-0" /> : trendType === 'down' ? <TrendingDown className="w-2.5 h-2.5 text-rose-600 shrink-0" /> : null}
                <span className="whitespace-nowrap font-normal font-sans">{trend}</span>
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
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
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
