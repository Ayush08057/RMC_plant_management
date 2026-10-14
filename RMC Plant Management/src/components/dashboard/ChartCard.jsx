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
    amber: { bar: 'from-amber-500 via-orange-500 to-amber-600', hover: 'bg-orange-500', stroke: '#ea580c' },
    purple: { bar: 'from-indigo-600 via-purple-600 to-pink-500', hover: 'bg-purple-500', stroke: '#9333ea' },
    emerald: { bar: 'from-emerald-600 via-teal-500 to-emerald-400', hover: 'bg-emerald-500', stroke: '#059669' },
    blue: { bar: 'from-cyan-600 via-blue-600 to-indigo-600', hover: 'bg-cyan-500', stroke: '#0891b2' },
    rose: { bar: 'from-rose-600 via-pink-600 to-rose-400', hover: 'bg-rose-500', stroke: '#e11d48' },
  };

  const activeTheme = themeColors[color] || themeColors.amber;

  return (
    <>
      <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between w-full max-w-full overflow-hidden min-w-0">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <Icon className="w-3 h-3" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight truncate">{title}</h3>
              {subtitle && <p className="text-[10px] text-slate-500 truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* Pop-Up Modal Expansion Button */}
            <button
              type="button"
              onClick={() => setShowPopUp(true)}
              className="px-1.5 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Open Detailed Analytics Pop-Up"
            >
              <Maximize2 className="w-2.5 h-2.5 text-slate-500" />
              <span>Pop-Up</span>
            </button>

            {/* Tab Filters */}
            {tabs && tabs.length > 0 && (
              <div className="flex items-center bg-slate-100 border border-slate-200/90 rounded-md p-0.5 self-start sm:self-auto shrink-0 shadow-2xs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${activeTab === tab
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
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
          className="h-28 sm:h-36 w-full flex items-end gap-1.5 sm:gap-2 pt-3 pb-1.5 px-1 relative min-w-0 overflow-hidden bg-slate-50/70 rounded-lg border border-slate-200/80 p-2 cursor-pointer group/chart"
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
                  <div className="absolute -top-12 z-30 px-2.5 py-1 bg-slate-50 border border-slate-300 text-white text-[10px] font-mono rounded-lg shadow-xl pointer-events-none whitespace-nowrap animate-pop-in">
                    <div>{item[labelKey]}: <span className="font-bold text-amber-400">{item[dataKey]} {unit}</span></div>
                    {secondaryKey && item[secondaryKey] && (
                      <div className="text-cyan-300">Col: {item[secondaryKey]} {secondaryUnit}</div>
                    )}
                  </div>
                )}

                {/* Bar */}
                <div
                  className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 bg-gradient-to-t ${activeTheme.bar} ${isHovered ? 'opacity-100 scale-y-105 shadow-md shadow-cyan-500/20' : 'opacity-85 group-hover:opacity-100'
                    }`}
                  style={{ height: `${heightPercent}%` }}
                />

                {/* Label */}
                <span className="text-[9px] font-mono text-slate-500 mt-1.5 truncate max-w-full text-center font-bold">
                  {item[labelKey]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Metric legend footer */}
        <div className="pt-2 mt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-600 gap-1 overflow-hidden">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-sm bg-gradient-to-r from-cyan-600 to-blue-600 shrink-0 shadow-2xs" />
            <span className="truncate font-semibold text-slate-700">Primary Metric: {unit}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPopUp(true)}
            className="text-[10px] sm:text-[11px] font-mono text-cyan-800 shrink-0 font-bold px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 transition-colors cursor-pointer"
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
            <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200/90">
              <span className="text-[10px] text-cyan-800 font-bold uppercase block">Accumulated Total</span>
              <span className="text-2xl font-black text-cyan-950 block mt-0.5">{totalVal.toLocaleString()} {unit}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90">
              <span className="text-[10px] text-amber-800 font-bold uppercase block">Peak Reading Interval</span>
              <span className="text-lg font-black text-amber-950 block mt-0.5">
                {maxItem ? `${maxItem[labelKey] || 'N/A'}: ${maxItem[dataKey]} ${unit}` : 'N/A'}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90">
              <span className="text-[10px] text-emerald-800 font-bold uppercase block">Average Rate</span>
              <span className="text-2xl font-black text-emerald-950 block mt-0.5">
                {data.length ? (totalVal / data.length).toFixed(1) : 0} {unit}
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-2.5 pl-4">Time Interval / Label</th>
                  <th className="p-2.5 font-right text-right">Recorded {unit}</th>
                  {secondaryKey && <th className="p-2.5 text-right">{secondaryKey}</th>}
                  <th className="p-2.5 pr-4 text-right">% of Peak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {data.map((item, idx) => {
                  const val = item[dataKey] || 0;
                  const pct = Math.round((val / (maxItem[dataKey] || 1)) * 100);
                  return (
                    <tr key={idx} className="hover:bg-cyan-50/50 transition-colors">
                      <td className="p-2.5 pl-4 font-bold text-slate-900">{item[labelKey]}</td>
                      <td className="p-2.5 text-right font-bold text-cyan-700">{val} {unit}</td>
                      {secondaryKey && <td className="p-2.5 text-right text-slate-600">{item[secondaryKey] || '-'}</td>}
                      <td className="p-2.5 pr-4 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pct > 80 ? 'bg-emerald-100 text-emerald-800' : pct > 40 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-[11px] text-slate-500 font-mono">Telemetry SCADA Node Connected</span>
            <button
              type="button"
              onClick={() => setShowPopUp(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
