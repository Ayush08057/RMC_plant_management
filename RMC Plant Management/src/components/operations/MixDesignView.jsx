import React, { useState } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Search, 
  CheckCircle2, 
  Scale, 
  Layers, 
  Sparkles, 
  FileText,
  Sliders,
  X
} from 'lucide-react';
import { MIX_DESIGN_PRESETS } from './BatchingSheetsView';

const INITIAL_DESIGNS = [
  { id: 'MD-M15', grade: 'M15', name: 'Standard Bedding / PCC Concrete', cement: 300, flyash: 40, agg20: 780, agg10: 520, sand: 820, water: 175, admixture: 2.2, slump: '100 ± 25 mm', wcRatio: 0.52, targetStrength: '20.5 N/mm²', status: 'Active' },
  { id: 'MD-M20', grade: 'M20', name: 'General Structural RCC Concrete', cement: 330, flyash: 50, agg20: 760, agg10: 510, sand: 810, water: 170, admixture: 2.5, slump: '110 ± 25 mm', wcRatio: 0.48, targetStrength: '26.0 N/mm²', status: 'Active' },
  { id: 'MD-M25', grade: 'M25', name: 'Heavy Structural Columns & Slabs', cement: 360, flyash: 60, agg20: 750, agg10: 500, sand: 800, water: 165, admixture: 3.0, slump: '120 ± 25 mm', wcRatio: 0.42, targetStrength: '31.5 N/mm²', status: 'Active' },
  { id: 'MD-M30', grade: 'M30', name: 'Commercial Pavement & Bridges', cement: 390, flyash: 70, agg20: 740, agg10: 490, sand: 790, water: 160, admixture: 3.5, slump: '130 ± 25 mm', wcRatio: 0.38, targetStrength: '38.0 N/mm²', status: 'Active' },
  { id: 'MD-M35', grade: 'M35', name: 'High-Strength Pre-stressed Girders', cement: 420, flyash: 80, agg20: 730, agg10: 480, sand: 780, water: 155, admixture: 4.0, slump: '140 ± 25 mm', wcRatio: 0.35, targetStrength: '43.5 N/mm²', status: 'Active' },
  { id: 'MD-M40', grade: 'M40', name: 'High-Performance Marine Concrete', cement: 450, flyash: 90, agg20: 720, agg10: 470, sand: 770, water: 150, admixture: 4.5, slump: '150 ± 25 mm', wcRatio: 0.32, targetStrength: '49.0 N/mm²', status: 'Active' },
];

export default function MixDesignView() {
  const [designs, setDesigns] = useState(INITIAL_DESIGNS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDesign, setSelectedDesign] = useState(null);

  const filtered = designs.filter(d => 
    d.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-600" />
            <span>IS:10262 & IS:456 Concrete Mix Design Library</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            Calibrated batching plant master formulations for automated SCADA proportioning
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search grade (e.g. M25, M30)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
          />
        </div>
      </div>

      {/* Grid of Mix Designs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((d) => (
          <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 hover:border-blue-400 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xl font-black font-mono text-blue-700 block">{d.grade}</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{d.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                {d.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div>Target 28D: <strong>{d.targetStrength}</strong></div>
              <div>W/C Ratio: <strong>{d.wcRatio}</strong></div>
              <div>Design Slump: <strong>{d.slump}</strong></div>
              <div>Admixture: <strong>{d.admixture} kg/m³</strong></div>
            </div>

            <div className="space-y-1 text-[11px] border-t border-slate-100 pt-2 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Cement (OPC 53):</span>
                <strong className="text-slate-900">{d.cement} kg/m³</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Fly Ash:</span>
                <strong className="text-slate-900">{d.flyash} kg/m³</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>20mm Aggregate:</span>
                <strong className="text-slate-900">{d.agg20} kg/m³</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>10mm Aggregate:</span>
                <strong className="text-slate-900">{d.agg10} kg/m³</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Crushed M-Sand:</span>
                <strong className="text-slate-900">{d.sand} kg/m³</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Water:</span>
                <strong className="text-slate-900">{d.water} L/m³</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
