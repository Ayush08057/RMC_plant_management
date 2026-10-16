import React, { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart2, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';

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
        className="p-2.5 sm:p-3 rounded-xl bg-white border border-[#D4E4F7] hover:border-[#1D5FA7] hover:shadow-xs transition-all duration-150 flex flex-col justify-between w-full max-w-full min-w-0 overflow-hidden group relative cursor-pointer shadow-2xs"
      >
        <div>
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-black uppercase tracking-wider leading-tight block truncate font-sans">
              {title}
            </span>
            {Icon && (
              <div className="w-5 h-5 rounded-md bg-[#EAF3FF] border border-[#D4E4F7] text-[#1D5FA7] flex items-center justify-center shrink-0">
                <Icon className="w-3 h-3" />
              </div>
            )}
          </div>
          <div className="text-base sm:text-lg lg:text-xl font-bold text-black tracking-tight font-sans tabular-nums my-1 leading-tight">
            {value}
          </div>
        </div>

        {(subtext || trend) && (
          <div className="mt-1 pt-1.5 border-t border-[#D4E4F7] flex items-center justify-between text-xs text-slate-700 gap-1.5 min-w-0">
            {subtext && (
              <span className="text-slate-600 text-[11px] font-medium leading-tight truncate flex-1 min-w-0" title={subtext}>
                {subtext}
              </span>
            )}
            {trend && (
              <span className={`inline-flex items-center gap-1 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                trendType === 'up' 
                  ? 'text-black bg-[#EAF3FF] border-[#D4E4F7]' 
                  : trendType === 'down' 
                    ? 'text-black bg-white border-[#D4E4F7]' 
                    : 'text-black bg-[#F5F9FF] border-[#D4E4F7]'
              }`}>
                {trendType === 'up' ? <TrendingUp className="w-2.5 h-2.5 text-[#1D5FA7] shrink-0" /> : trendType === 'down' ? <TrendingDown className="w-2.5 h-2.5 text-[#1D5FA7] shrink-0" /> : null}
                <span className="whitespace-nowrap">{trend}</span>
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
          <div className="space-y-3.5 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-[#F5F9FF] border border-[#D4E4F7] space-y-1">
              <span className="text-xs font-mono text-slate-700 uppercase font-semibold tracking-wider">Current Metric Value</span>
              <div className="text-2xl sm:text-3xl font-bold text-black font-mono">{value}</div>
              <p className="text-xs sm:text-sm text-slate-700 font-medium">{subtext}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-lg bg-white border border-[#D4E4F7]">
                <span className="text-xs text-slate-600 block font-semibold">Trend Status</span>
                <span className="font-semibold text-black flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1D5FA7]" />
                  <span>{trend || 'Active Telemetry'}</span>
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#D4E4F7]">
                <span className="text-xs text-slate-600 block font-semibold">SCADA Sync Time</span>
                <span className="font-semibold text-black mt-0.5 block">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>
            </div>

            {detailsData && (
              <div className="p-3 rounded-xl bg-[#F5F9FF] border border-[#D4E4F7] space-y-2">
                <span className="font-bold text-black text-xs">Sub-system Breakdown</span>
                <div className="space-y-1 text-xs">
                  {Object.entries(detailsData).map(([k, v], i) => (
                    <div key={i} className="flex justify-between border-b border-[#D4E4F7] pb-1">
                      <span className="text-slate-700 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
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
                Close Pop-Up
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
