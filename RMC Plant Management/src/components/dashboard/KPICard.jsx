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
    cardBorder: 'border-emerald-400 hover:border-emerald-500',
    bgGradient: 'bg-gradient-to-b from-emerald-50/35 via-white to-white',
    topBar: 'bg-emerald-500',
    iconBox: 'bg-emerald-100/90 border-emerald-300 text-emerald-700',
    divider: 'border-emerald-200/90',
    trendBadge: 'text-emerald-800 bg-emerald-50 border-emerald-300',
    trendIcon: 'text-emerald-600',
    hoverGlow: 'hover:shadow-emerald-500/20 hover:shadow-md',
  },
  blue: {
    cardBorder: 'border-blue-400 hover:border-blue-500',
    bgGradient: 'bg-gradient-to-b from-blue-50/35 via-white to-white',
    topBar: 'bg-[#136dec]',
    iconBox: 'bg-blue-100/90 border-blue-300 text-[#136dec]',
    divider: 'border-blue-200/90',
    trendBadge: 'text-blue-800 bg-blue-50 border-blue-300',
    trendIcon: 'text-[#136dec]',
    hoverGlow: 'hover:shadow-blue-500/20 hover:shadow-md',
  },
  amber: {
    cardBorder: 'border-amber-400 hover:border-amber-500',
    bgGradient: 'bg-gradient-to-b from-amber-50/35 via-white to-white',
    topBar: 'bg-amber-500',
    iconBox: 'bg-amber-100/90 border-amber-300 text-amber-700',
    divider: 'border-amber-200/90',
    trendBadge: 'text-amber-800 bg-amber-50 border-amber-300',
    trendIcon: 'text-amber-600',
    hoverGlow: 'hover:shadow-amber-500/20 hover:shadow-md',
  },
  rose: {
    cardBorder: 'border-rose-400 hover:border-rose-500',
    bgGradient: 'bg-gradient-to-b from-rose-50/35 via-white to-white',
    topBar: 'bg-rose-500',
    iconBox: 'bg-rose-100/90 border-rose-300 text-rose-700',
    divider: 'border-rose-200/90',
    trendBadge: 'text-rose-800 bg-rose-50 border-rose-300',
    trendIcon: 'text-rose-600',
    hoverGlow: 'hover:shadow-rose-500/20 hover:shadow-md',
  },
  purple: {
    cardBorder: 'border-purple-400 hover:border-purple-500',
    bgGradient: 'bg-gradient-to-b from-purple-50/35 via-white to-white',
    topBar: 'bg-purple-500',
    iconBox: 'bg-purple-100/90 border-purple-300 text-purple-700',
    divider: 'border-purple-200/90',
    trendBadge: 'text-purple-800 bg-purple-50 border-purple-300',
    trendIcon: 'text-purple-600',
    hoverGlow: 'hover:shadow-purple-500/20 hover:shadow-md',
  },
  cyan: {
    cardBorder: 'border-cyan-400 hover:border-cyan-500',
    bgGradient: 'bg-gradient-to-b from-cyan-50/35 via-white to-white',
    topBar: 'bg-cyan-500',
    iconBox: 'bg-cyan-100/90 border-cyan-300 text-cyan-700',
    divider: 'border-cyan-200/90',
    trendBadge: 'text-cyan-800 bg-cyan-50 border-cyan-300',
    trendIcon: 'text-cyan-600',
    hoverGlow: 'hover:shadow-cyan-500/20 hover:shadow-md',
  },
  indigo: {
    cardBorder: 'border-indigo-400 hover:border-indigo-500',
    bgGradient: 'bg-gradient-to-b from-indigo-50/35 via-white to-white',
    topBar: 'bg-indigo-500',
    iconBox: 'bg-indigo-100/90 border-indigo-300 text-indigo-700',
    divider: 'border-indigo-200/90',
    trendBadge: 'text-indigo-800 bg-indigo-50 border-indigo-300',
    trendIcon: 'text-indigo-600',
    hoverGlow: 'hover:shadow-indigo-500/20 hover:shadow-md',
  },
  slate: {
    cardBorder: 'border-slate-300 hover:border-slate-400',
    bgGradient: 'bg-gradient-to-b from-slate-50/35 via-white to-white',
    topBar: 'bg-slate-500',
    iconBox: 'bg-slate-100 border-slate-300 text-slate-700',
    divider: 'border-slate-200',
    trendBadge: 'text-slate-800 bg-slate-50 border-slate-300',
    trendIcon: 'text-slate-600',
    hoverGlow: 'hover:shadow-slate-500/20 hover:shadow-md',
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
        className={`p-2 sm:px-2.5 sm:py-2 pt-2.5 rounded-xl ${theme.bgGradient} border-2 ${theme.cardBorder} ${theme.hoverGlow} transition-all duration-200 flex flex-col justify-between w-full max-w-full min-w-0 overflow-hidden group relative cursor-pointer shadow-xs`}
      >
        {/* Top Accent Lining Highlight */}
        <div 
          className={`absolute top-0 left-0 right-0 h-[3px] ${theme.topBar} transition-all duration-300 group-hover:h-[4px]`} 
          aria-hidden="true"
        />

        <div>
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider leading-tight block truncate font-sans">
              {typeof title === 'string' ? t(title) : title}
            </span>
            {Icon && (
              <div className={`w-5 h-5 rounded-md ${theme.iconBox} border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-2xs`}>
                <Icon className="w-3 h-3" />
              </div>
            )}
          </div>
          <div className="text-xs sm:text-sm font-black text-slate-900 tracking-tight font-sans tabular-nums my-0.5 leading-tight">
            {value}
          </div>
        </div>

        {(subtext || trend) && (
          <div className={`mt-0.5 pt-1.5 border-t ${theme.divider} flex items-center justify-between text-[10px] text-slate-700 gap-1 min-w-0`}>
            {subtext && (
              <span className="text-slate-600 text-[10px] font-medium leading-tight truncate flex-1 min-w-0" title={typeof subtext === 'string' ? t(subtext) : subtext}>
                {typeof subtext === 'string' ? t(subtext) : subtext}
              </span>
            )}
            {trend && (
              <span className={`inline-flex items-center gap-1 shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${theme.trendBadge}`}>
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
