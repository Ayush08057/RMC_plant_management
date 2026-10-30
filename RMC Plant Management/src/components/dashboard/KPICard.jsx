import React, { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart2, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Cohesive Theme Configurations for KPI Cards
 * Provides full-perimeter colored borders (all 4 sides: top, right, bottom, left),
 * reinforced top accent lining, matching icon containers, dividers, and subtle hover micro-glows.
 */
const COLOR_THEMES = {
  emerald: {
    cardBorder: 'border-white/70 hover:border-emerald-200/90 ring-1 ring-emerald-500/[0.08]',
    bgGradient: 'bg-white/75 backdrop-blur-xl bg-gradient-to-br from-emerald-50/40 via-white/85 to-teal-50/20',
    topBar: 'bg-gradient-to-r from-emerald-400 to-teal-400',
    iconBox: 'bg-emerald-50/90 text-emerald-600 border-emerald-200/70 shadow-xs',
    divider: 'border-slate-100/80',
    trendBadge: 'text-emerald-700 bg-emerald-50/80 border-emerald-200/70',
    trendIcon: 'text-emerald-600',
    hoverGlow: 'hover:shadow-[0_12px_32px_rgba(16,185,129,0.12)] hover:-translate-y-1',
  },
  blue: {
    cardBorder: 'border-white/70 hover:border-blue-200/90 ring-1 ring-blue-500/[0.08]',
    bgGradient: 'bg-white/75 backdrop-blur-xl bg-gradient-to-br from-blue-50/40 via-white/85 to-sky-50/20',
    topBar: 'bg-gradient-to-r from-blue-400 to-sky-400',
    iconBox: 'bg-blue-50/90 text-blue-600 border-blue-200/70 shadow-xs',
    divider: 'border-slate-100/80',
    trendBadge: 'text-blue-700 bg-blue-50/80 border-blue-200/70',
    trendIcon: 'text-blue-600',
    hoverGlow: 'hover:shadow-[0_12px_32px_rgba(59,130,246,0.12)] hover:-translate-y-1',
  },
  amber: {
    cardBorder: 'border-white/70 hover:border-amber-200/90 ring-1 ring-amber-500/[0.08]',
    bgGradient: 'bg-white/75 backdrop-blur-xl bg-gradient-to-br from-amber-50/40 via-white/85 to-orange-50/20',
    topBar: 'bg-gradient-to-r from-amber-400 to-orange-400',
    iconBox: 'bg-amber-50/90 text-amber-600 border-amber-200/70 shadow-xs',
    divider: 'border-slate-100/80',
    trendBadge: 'text-amber-700 bg-amber-50/80 border-amber-200/70',
    trendIcon: 'text-amber-600',
    hoverGlow: 'hover:shadow-[0_12px_32px_rgba(245,158,11,0.12)] hover:-translate-y-1',
  },
  rose: {
    cardBorder: 'border-white/70 hover:border-rose-200/90 ring-1 ring-rose-500/[0.08]',
    bgGradient: 'bg-white/75 backdrop-blur-xl bg-gradient-to-br from-rose-50/40 via-white/85 to-pink-50/20',
    topBar: 'bg-gradient-to-r from-rose-400 to-pink-400',
    iconBox: 'bg-rose-50/90 text-rose-600 border-rose-200/70 shadow-xs',
    divider: 'border-slate-100/80',
    trendBadge: 'text-rose-700 bg-rose-50/80 border-rose-200/70',
    trendIcon: 'text-rose-600',
    hoverGlow: 'hover:shadow-[0_12px_32px_rgba(244,63,94,0.12)] hover:-translate-y-1',
  },
  purple: {
    cardBorder: 'border-white/70 hover:border-purple-200/90 ring-1 ring-purple-500/[0.08]',
    bgGradient: 'bg-white/75 backdrop-blur-xl bg-gradient-to-br from-purple-50/40 via-white/85 to-fuchsia-50/20',
    topBar: 'bg-gradient-to-r from-purple-400 to-fuchsia-400',
    iconBox: 'bg-purple-50/90 text-purple-600 border-purple-200/70 shadow-xs',
    divider: 'border-slate-100/80',
    trendBadge: 'text-purple-700 bg-purple-50/80 border-purple-200/70',
    trendIcon: 'text-purple-600',
    hoverGlow: 'hover:shadow-[0_12px_32px_rgba(168,85,247,0.12)] hover:-translate-y-1',
  },
  cyan: {
    cardBorder: 'border-white/70 hover:border-cyan-200/90 ring-1 ring-cyan-500/[0.08]',
    bgGradient: 'bg-white/75 backdrop-blur-xl bg-gradient-to-br from-cyan-50/40 via-white/85 to-blue-50/20',
    topBar: 'bg-gradient-to-r from-cyan-400 to-blue-400',
    iconBox: 'bg-cyan-50/90 text-cyan-600 border-cyan-200/70 shadow-xs',
    divider: 'border-slate-100/80',
    trendBadge: 'text-cyan-700 bg-cyan-50/80 border-cyan-200/70',
    trendIcon: 'text-cyan-600',
    hoverGlow: 'hover:shadow-[0_12px_32px_rgba(6,182,212,0.12)] hover:-translate-y-1',
  },
  indigo: {
    cardBorder: 'border-white/70 hover:border-indigo-200/90 ring-1 ring-indigo-500/[0.08]',
    bgGradient: 'bg-white/75 backdrop-blur-xl bg-gradient-to-br from-indigo-50/40 via-white/85 to-purple-50/20',
    topBar: 'bg-gradient-to-r from-indigo-400 to-purple-400',
    iconBox: 'bg-indigo-50/90 text-indigo-600 border-indigo-200/70 shadow-xs',
    divider: 'border-slate-100/80',
    trendBadge: 'text-indigo-700 bg-indigo-50/80 border-indigo-200/70',
    trendIcon: 'text-indigo-600',
    hoverGlow: 'hover:shadow-[0_12px_32px_rgba(99,102,241,0.12)] hover:-translate-y-1',
  },
  slate: {
    cardBorder: 'border-white/70 hover:border-slate-300 ring-1 ring-slate-500/[0.08]',
    bgGradient: 'bg-white/75 backdrop-blur-xl bg-gradient-to-br from-slate-50/40 via-white/85 to-slate-100/20',
    topBar: 'bg-gradient-to-r from-slate-400 to-slate-500',
    iconBox: 'bg-slate-50/90 text-slate-600 border-slate-200/70 shadow-xs',
    divider: 'border-slate-100/80',
    trendBadge: 'text-slate-700 bg-slate-50/80 border-slate-200/70',
    trendIcon: 'text-slate-600',
    hoverGlow: 'hover:shadow-[0_12px_32px_rgba(100,116,139,0.12)] hover:-translate-y-1',
  }
};

export default function KPICard({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  trend, 
  trendType = 'up',
  color = 'blue',
  onClick = null,
  detailsData = null,
}) {
  const [showInternalModal, setShowInternalModal] = useState(false);
  const { t } = useLanguage();

  const themeKey = (color && COLOR_THEMES[color]) ? color : 'blue';
  const theme = COLOR_THEMES[themeKey];

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
        className={`p-3.5 sm:p-4 pt-4 rounded-2xl ${theme.bgGradient} ${theme.cardBorder} ${theme.hoverGlow} transition-all duration-300 flex flex-col justify-between w-full max-w-full min-w-0 overflow-hidden group relative cursor-pointer shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]`}
      >
        {/* Top Accent Lining Highlight */}
        <div 
          className={`absolute top-0 left-0 right-0 h-[2.5px] ${theme.topBar} transition-all duration-300 group-hover:h-[3.5px]`} 
          aria-hidden="true"
        />

        <div>
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight block truncate font-sans">
              {typeof title === 'string' ? t(title) : title}
            </span>
            {Icon && (
              <div className={`w-7 h-7 rounded-xl ${theme.iconBox} border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-2xs`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-sans tabular-nums mt-1 mb-0.5 leading-tight">
            {typeof value === 'string' ? t(value) : value}
          </div>
        </div>

        {(subtext || trend) && (
          <div className={`mt-2 pt-2 border-t ${theme.divider} flex items-center justify-between text-[11px] text-slate-500 gap-1.5 min-w-0`}>
            {subtext && (
              <span className="text-slate-500 text-[11px] font-medium leading-tight truncate flex-1 min-w-0" title={typeof subtext === 'string' ? t(subtext) : subtext}>
                {typeof subtext === 'string' ? t(subtext) : subtext}
              </span>
            )}
            {trend && (
              <span className={`inline-flex items-center gap-1 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.trendBadge}`}>
                {trendType === 'up' ? (
                  <TrendingUp className={`w-2.5 h-2.5 ${theme.trendIcon} shrink-0`} />
                ) : trendType === 'down' ? (
                  <TrendingDown className={`w-2.5 h-2.5 ${theme.trendIcon} shrink-0`} />
                ) : null}
                <span className="whitespace-nowrap">{typeof trend === 'string' ? t(trend) : trend}</span>
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
          title={`${typeof title === 'string' ? t(title) : title} • ${t('Detailed Metrics & Telemetry')}`}
          subtitle={t('Real-time KPI breakdown and SCADA synchronized parameters')}
          icon={Icon || BarChart2}
        >
          <div className="space-y-3.5 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-[#F5F9FF] border border-[#D4E4F7] space-y-1">
              <span className="text-xs font-mono text-slate-700 uppercase font-semibold tracking-wider">{t('Current Metric Value')}</span>
              <div className="text-2xl sm:text-3xl font-bold text-black font-mono">{value}</div>
              <p className="text-xs sm:text-sm text-slate-700 font-medium">{typeof subtext === 'string' ? t(subtext) : subtext}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-lg bg-white border border-[#D4E4F7]">
                <span className="text-xs text-slate-600 block font-semibold">{t('Trend Status')}</span>
                <span className="font-semibold text-black flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1D5FA7]" />
                  <span>{(typeof trend === 'string' ? t(trend) : trend) || t('Active Telemetry')}</span>
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#D4E4F7]">
                <span className="text-xs text-slate-600 block font-semibold">{t('SCADA Sync Time')}</span>
                <span className="font-semibold text-black mt-0.5 block">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>
            </div>

            {detailsData && (
              <div className="p-3 rounded-xl bg-[#F5F9FF] border border-[#D4E4F7] space-y-2">
                <span className="font-bold text-black text-xs">{t('Sub-system Breakdown')}</span>
                <div className="space-y-1 text-xs">
                  {Object.entries(detailsData).map(([k, v], i) => (
                    <div key={i} className="flex justify-between border-b border-[#D4E4F7] pb-1">
                      <span className="text-slate-700 capitalize">{t(k.replace(/([A-Z])/g, ' $1'))}:</span>
                      <span className="font-semibold text-black font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#D4E4F7]">
              <button
                type="button"
                onClick={() => setShowInternalModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white cursor-pointer shadow-2xs"
              >
                {t('Close Pop-Up')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
