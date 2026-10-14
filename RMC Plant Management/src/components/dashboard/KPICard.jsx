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
        className="p-2 sm:p-2.5 rounded-lg bg-white border border-[#D4E4F7] hover:border-[#1D5FA7] hover:shadow-xs transition-all duration-150 flex flex-col justify-between w-full max-w-full min-w-0 overflow-hidden group relative cursor-pointer shadow-2xs"
      >
        <div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[9.5px] font-semibold text-[#1D5FA7] uppercase tracking-wider leading-none block truncate font-sans">
              {title}
            </span>
            {Icon && (
              <div className="w-4.5 h-4.5 rounded bg-[#EAF3FF] border border-[#D4E4F7] text-[#1D5FA7] flex items-center justify-center shrink-0">
                <Icon className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
          <div className="text-sm sm:text-base font-bold text-[#123B6D] tracking-tight font-sans tabular-nums my-0.5 leading-tight">
            {value}
          </div>
        </div>

        {(subtext || trend) && (
          <div className="mt-0.5 pt-1 border-t border-[#D4E4F7] flex items-center justify-between text-[9px] text-[#1D5FA7] gap-1 min-w-0">
            {subtext && (
              <span className="text-[#1D5FA7]/70 text-[9px] font-normal leading-tight truncate flex-1 min-w-0" title={subtext}>
                {subtext}
              </span>
            )}
            {trend && (
              <span className={`inline-flex items-center gap-0.5 shrink-0 text-[8.5px] font-medium px-1 py-0.2 rounded border ${
                trendType === 'up' 
                  ? 'text-[#123B6D] bg-[#EAF3FF] border-[#D4E4F7]' 
                  : trendType === 'down' 
                    ? 'text-[#123B6D] bg-white border-[#D4E4F7]' 
                    : 'text-[#123B6D] bg-[#F5F9FF] border-[#D4E4F7]'
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
          <div className="space-y-3.5 text-xs">
            <div className="p-4 rounded-xl bg-[#F5F9FF] border border-[#D4E4F7] space-y-1">
              <span className="text-[10px] font-mono text-[#1D5FA7] uppercase font-semibold">Current Metric Value</span>
              <div className="text-2xl sm:text-3xl font-bold text-[#123B6D] font-mono">{value}</div>
              <p className="text-xs text-[#1D5FA7] font-medium">{subtext}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-lg bg-white border border-[#D4E4F7]">
                <span className="text-[10px] text-[#1D5FA7] block font-semibold">Trend Status</span>
                <span className="font-semibold text-[#123B6D] flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1D5FA7]" />
                  <span>{trend || 'Active Telemetry'}</span>
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#D4E4F7]">
                <span className="text-[10px] text-[#1D5FA7] block font-semibold">SCADA Sync Time</span>
                <span className="font-semibold text-[#123B6D] mt-0.5 block">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>
            </div>

            {detailsData && (
              <div className="p-3 rounded-xl bg-[#F5F9FF] border border-[#D4E4F7] space-y-2">
                <span className="font-bold text-[#123B6D] text-xs">Sub-system Breakdown</span>
                <div className="space-y-1 text-xs">
                  {Object.entries(detailsData).map(([k, v], i) => (
                    <div key={i} className="flex justify-between border-b border-[#D4E4F7] pb-1">
                      <span className="text-[#1D5FA7] capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-semibold text-[#123B6D] font-mono">{String(v)}</span>
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
