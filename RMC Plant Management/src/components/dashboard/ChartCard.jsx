import React, { useState } from 'react';
import { Maximize2, BarChart2, TrendingUp, Download } from 'lucide-react';
import Modal from './Modal';

export default function ChartCard({
  title,
  subtitle,
  icon: Icon,
  tabs = ['Today', '7D', '30D'],
  defaultTab = 'Today',
  data = [],
  dataKey = 'volume',
  labelKey = 'hour',
  unit = 'm³',
  color = 'amber',
  secondaryKey = null,
  secondaryUnit = '',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [showPopUp, setShowPopUp] = useState(false);

  // Compute maximum for SVG scaling
  const maxVal = Math.max(...data.map(d => Math.max(d[dataKey] || 0, secondaryKey ? (d[secondaryKey] || 0) : 0)), 10);
  const totalVal = data.reduce((sum, d) => sum + (Number(d[dataKey]) || 0), 0);
  const maxItem = data.reduce((prev, current) => ((prev[dataKey] || 0) > (current[dataKey] || 0)) ? prev : current, data[0] || {});

  const themeColors = {
    amber: { bar: 'from-[#123B6D] via-[#1D5FA7] to-[#246BCE]', hover: 'bg-[#246BCE]', stroke: '#1D5FA7' },
    purple: { bar: 'from-[#123B6D] via-[#1D5FA7] to-[#246BCE]', hover: 'bg-[#246BCE]', stroke: '#1D5FA7' },
    emerald: { bar: 'from-[#123B6D] via-[#1D5FA7] to-[#246BCE]', hover: 'bg-[#246BCE]', stroke: '#1D5FA7' },
    blue: { bar: 'from-[#123B6D] via-[#1D5FA7] to-[#246BCE]', hover: 'bg-[#246BCE]', stroke: '#1D5FA7' },
    rose: { bar: 'from-[#123B6D] via-[#1D5FA7] to-[#246BCE]', hover: 'bg-[#246BCE]', stroke: '#1D5FA7' },
  };

  const activeTheme = themeColors[color] || themeColors.blue;

  return (
    <>
      <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-[#D4E4F7] shadow-2xs flex flex-col justify-between w-full max-w-full overflow-hidden min-w-0">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <div className="w-6 h-6 rounded-md bg-[#EAF3FF] border border-[#D4E4F7] text-[#1D5FA7] flex items-center justify-center shrink-0">
                <Icon className="w-3 h-3" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-black tracking-tight truncate">{title}</h3>
              {subtitle && <p className="text-[10px] text-slate-700 truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* Pop-Up Modal Expansion Button */}
            <button
              type="button"
              onClick={() => setShowPopUp(true)}
              className="px-1.5 py-0.5 rounded-md bg-[#F5F9FF] hover:bg-[#EAF3FF] text-black border border-[#D4E4F7] text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Open Detailed Analytics Pop-Up"
            >
              <Maximize2 className="w-2.5 h-2.5 text-[#1D5FA7]" />
              <span>Pop-Up</span>
            </button>

            {/* Tab Filters */}
            {tabs && tabs.length > 0 && (
              <div className="flex items-center bg-[#F5F9FF] border border-[#D4E4F7] rounded-md p-0.5 self-start sm:self-auto shrink-0 shadow-2xs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${activeTab === tab
                        ? 'bg-[#1D5FA7] text-white shadow-xs'
                        : 'text-black hover:text-[#1D5FA7]'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SVG Responsive Bar Visualizer */}
        <div
          onClick={() => setShowPopUp(true)}
          className="h-28 sm:h-36 w-full flex items-end gap-1.5 sm:gap-2 pt-3 pb-1.5 px-1 relative min-w-0 overflow-hidden bg-[#F5F9FF] rounded-lg border border-[#D4E4F7] p-2 cursor-pointer group/chart"
          title="Click to view detailed analytics Pop-Up"
        >
          {data.map((item, idx) => {
            const heightPercent = Math.max(10, Math.round(((item[dataKey] || 0) / maxVal) * 100));
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer min-w-0"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-12 z-30 px-2.5 py-1 bg-[#123B6D] border border-[#D4E4F7] text-white text-[10px] font-mono rounded-lg shadow-xl pointer-events-none whitespace-nowrap animate-pop-in">
                    <div>{item[labelKey]}: <span className="font-bold text-white">{item[dataKey]} {unit}</span></div>
                    {secondaryKey && item[secondaryKey] && (
                      <div className="text-[#D4E4F7]">Col: {item[secondaryKey]} {secondaryUnit}</div>
                    )}
                  </div>
                )}

                {/* Bar */}
                <div
                  className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 bg-gradient-to-t ${activeTheme.bar} ${isHovered ? 'opacity-100 scale-y-105 shadow-md shadow-[#246BCE]/20' : 'opacity-85 group-hover:opacity-100'
                    }`}
                  style={{ height: `${heightPercent}%` }}
                />

                {/* Label */}
                <span className="text-[9px] font-mono text-black mt-1.5 truncate max-w-full text-center font-bold">
                  {item[labelKey]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Metric legend footer */}
        <div className="pt-2 mt-2.5 border-t border-[#D4E4F7] flex items-center justify-between text-[10px] text-slate-700 gap-1 overflow-hidden">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-sm bg-[#246BCE] shrink-0 shadow-2xs" />
            <span className="truncate font-bold text-black">Primary Metric: {unit}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPopUp(true)}
            className="text-[10px] sm:text-[11px] font-mono text-black shrink-0 font-bold px-2 py-0.5 rounded bg-[#EAF3FF] border border-[#D4E4F7] hover:bg-[#D4E4F7]/60 transition-colors cursor-pointer"
          >
            {activeTab} Analytics Pop-Up ↗
          </button>
        </div>
      </div>

      {/* Pop-Up Modal for Chart Telemetry Details */}
      <Modal
        isOpen={showPopUp}
        onClose={() => setShowPopUp(false)}
        title={`${title} • Detailed Telemetry Breakdown`}
        subtitle={`${activeTab} historical load cell readings and telemetry logs`}
        icon={Icon || BarChart2}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
            <div className="p-3.5 rounded-2xl bg-[#EAF3FF] border border-[#D4E4F7]">
              <span className="text-[10px] text-slate-700 font-bold uppercase block">Accumulated Total</span>
              <span className="text-2xl font-bold text-black block mt-0.5">{totalVal.toLocaleString()} {unit}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F5F9FF] border border-[#D4E4F7]">
              <span className="text-[10px] text-slate-700 font-bold uppercase block">Peak Reading Interval</span>
              <span className="text-lg font-bold text-black block mt-0.5">
                {maxItem ? `${maxItem[labelKey] || 'N/A'}: ${maxItem[dataKey]} ${unit}` : 'N/A'}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#D4E4F7]">
              <span className="text-[10px] text-slate-700 font-bold uppercase block">Average Rate</span>
              <span className="text-2xl font-bold text-black block mt-0.5">
                {data.length ? (totalVal / data.length).toFixed(1) : 0} {unit}
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="border border-[#D4E4F7] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#123B6D] text-white font-mono text-[10px] font-bold uppercase tracking-wider border-b border-[#123B6D]">
                <tr>
                  <th className="p-2.5 pl-4">Time Interval / Label</th>
                  <th className="p-2.5 font-right text-right">Recorded {unit}</th>
                  {secondaryKey && <th className="p-2.5 text-right">{secondaryKey}</th>}
                  <th className="p-2.5 pr-4 text-right">% of Peak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4E4F7] font-mono">
                {data.map((item, idx) => {
                  const val = item[dataKey] || 0;
                  const pct = Math.round((val / (maxItem[dataKey] || 1)) * 100);
                  return (
                    <tr key={idx} className="hover:bg-[#EAF3FF] transition-colors">
                      <td className="p-2.5 pl-4 font-bold text-black">{item[labelKey]}</td>
                      <td className="p-2.5 text-right font-bold text-black">{val} {unit}</td>
                      {secondaryKey && <td className="p-2.5 text-right text-slate-800 font-bold">{item[secondaryKey] || '-'}</td>}
                      <td className="p-2.5 pr-4 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF3FF] text-black border border-[#D4E4F7]">
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#D4E4F7]">
            <span className="text-[11px] text-slate-700 font-mono">Telemetry SCADA Node Connected</span>
            <button
              type="button"
              onClick={() => setShowPopUp(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white cursor-pointer shadow-xs"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
