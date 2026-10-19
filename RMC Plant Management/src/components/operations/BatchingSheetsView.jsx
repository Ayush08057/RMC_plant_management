import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Truck, 
  User, 
  MapPin, 
  Layers, 
  X, 
  ArrowLeft, 
  AlertCircle,
  FileText,
  TrendingUp,
  Scale,
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';

const BATCHING_STORAGE_KEY = 'rmc_batching_sheets_v2';

// Standard IS:10262 Concrete Mix Proportions per 1 m³
export const MIX_DESIGN_PRESETS = {
  'M15': { grade: 'M15', cement: 300, flyash: 40, agg20: 780, agg10: 520, sand: 820, water: 175, admixture: 2.2, slump: '100 ± 25 mm', wcRatio: 0.52 },
  'M20': { grade: 'M20', cement: 330, flyash: 50, agg20: 760, agg10: 510, sand: 810, water: 170, admixture: 2.5, slump: '110 ± 25 mm', wcRatio: 0.48 },
  'M25': { grade: 'M25', cement: 360, flyash: 60, agg20: 750, agg10: 500, sand: 800, water: 165, admixture: 3.0, slump: '120 ± 25 mm', wcRatio: 0.42 },
  'M30': { grade: 'M30', cement: 390, flyash: 70, agg20: 740, agg10: 490, sand: 790, water: 160, admixture: 3.5, slump: '130 ± 25 mm', wcRatio: 0.38 },
  'M35': { grade: 'M35', cement: 420, flyash: 80, agg20: 730, agg10: 480, sand: 780, water: 155, admixture: 4.0, slump: '140 ± 25 mm', wcRatio: 0.35 },
  'M40': { grade: 'M40', cement: 450, flyash: 90, agg20: 720, agg10: 470, sand: 770, water: 150, admixture: 4.5, slump: '150 ± 25 mm', wcRatio: 0.32 },
};

// Initial realistic batch sheets for SM CONCRETECH
const INITIAL_BATCH_SHEETS = [
  {
    id: 'BS-25-26/1042',
    sheetNo: '25-26/1042',
    date: '19-Oct-2026',
    time: '09:45 AM',
    mixGrade: 'M25',
    volume: 6.0,
    batchesCount: 6,
    customerName: 'Shree Construction & Infra',
    site: 'Tanang Highway Pier Zone #4',
    vehicleNo: 'MH-10-CR-1212',
    driverName: 'Sachin Shinde',
    operatorName: 'Rajesh Mane',
    qcStatus: 'Approved',
    targetSlump: '120 ± 25 mm',
    actualSlump: '125 mm',
    moisturePercent: 2.5,
    materials: [
      { name: 'Cement (OPC 53)', target: 2160, actual: 2168, unit: 'kg' },
      { name: 'Fly Ash (Pozzocrete)', target: 360, actual: 358, unit: 'kg' },
      { name: '20mm Coarse Aggregate', target: 4500, actual: 4522, unit: 'kg' },
      { name: '10mm Coarse Aggregate', target: 3000, actual: 2994, unit: 'kg' },
      { name: 'Crushed M-Sand', target: 4800, actual: 4815, unit: 'kg' },
      { name: 'Water', target: 990, actual: 994, unit: 'L' },
      { name: 'Admixture (PCE)', target: 18.0, actual: 18.2, unit: 'kg' },
    ],
    remarks: 'Pumping concrete batch approved by site engineer.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'BS-25-26/1041',
    sheetNo: '25-26/1041',
    date: '19-Oct-2026',
    time: '08:15 AM',
    mixGrade: 'M30',
    volume: 6.0,
    batchesCount: 6,
    customerName: 'Kulkarni Builders & Developers',
    site: 'Sangli Bypass Bridge Slab #2',
    vehicleNo: 'MH-10-CR-1313',
    driverName: 'Vikas Jadhav',
    operatorName: 'Rajesh Mane',
    qcStatus: 'Approved',
    targetSlump: '130 ± 25 mm',
    actualSlump: '135 mm',
    moisturePercent: 2.2,
    materials: [
      { name: 'Cement (OPC 53)', target: 2340, actual: 2345, unit: 'kg' },
      { name: 'Fly Ash (Pozzocrete)', target: 420, actual: 418, unit: 'kg' },
      { name: '20mm Coarse Aggregate', target: 4440, actual: 4455, unit: 'kg' },
      { name: '10mm Coarse Aggregate', target: 2940, actual: 2932, unit: 'kg' },
      { name: 'Crushed M-Sand', target: 4740, actual: 4752, unit: 'kg' },
      { name: 'Water', target: 960, actual: 962, unit: 'L' },
      { name: 'Admixture (PCE)', target: 21.0, actual: 21.1, unit: 'kg' },
    ],
    remarks: 'Bridge grade mix. High early strength formulation.',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

export default function BatchingSheetsView() {
  const [sheets, setSheets] = useState(() => {
    try {
      const saved = localStorage.getItem(BATCHING_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load batching sheets:', e);
    }
    return INITIAL_BATCH_SHEETS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(BATCHING_STORAGE_KEY, JSON.stringify(sheets));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }, [sheets]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [printingSheet, setPrintingSheet] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Form State for creating a new Batch Sheet
  const [form, setForm] = useState({
    sheetNo: `25-26/${sheets.length + 1043}`,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    mixGrade: 'M25',
    volume: 6.0,
    customerName: '',
    site: '',
    vehicleNo: 'MH-10-CR-1212',
    driverName: 'Sachin Shinde',
    operatorName: 'Rajesh Mane',
    targetSlump: '120 ± 25 mm',
    actualSlump: '125 mm',
    moisturePercent: 2.0,
    qcStatus: 'Approved',
    remarks: 'Standard transit mixer load dispatched on schedule.',
    materials: [],
  });

  // Automatically update recipe targets when mixGrade or volume changes
  const updateMaterialsForGradeAndVolume = (grade, vol) => {
    const preset = MIX_DESIGN_PRESETS[grade] || MIX_DESIGN_PRESETS['M25'];
    const v = Number(vol) || 1;
    return [
      { name: 'Cement (OPC 53)', target: Math.round(preset.cement * v), actual: Math.round(preset.cement * v + (Math.random() * 8 - 4)), unit: 'kg' },
      { name: 'Fly Ash (Pozzocrete)', target: Math.round(preset.flyash * v), actual: Math.round(preset.flyash * v + (Math.random() * 4 - 2)), unit: 'kg' },
      { name: '20mm Coarse Aggregate', target: Math.round(preset.agg20 * v), actual: Math.round(preset.agg20 * v + (Math.random() * 16 - 8)), unit: 'kg' },
      { name: '10mm Coarse Aggregate', target: Math.round(preset.agg10 * v), actual: Math.round(preset.agg10 * v + (Math.random() * 12 - 6)), unit: 'kg' },
      { name: 'Crushed M-Sand', target: Math.round(preset.sand * v), actual: Math.round(preset.sand * v + (Math.random() * 18 - 9)), unit: 'kg' },
      { name: 'Water', target: Math.round(preset.water * v), actual: Math.round(preset.water * v + (Math.random() * 4 - 2)), unit: 'L' },
      { name: 'Admixture (PCE)', target: Number((preset.admixture * v).toFixed(1)), actual: Number((preset.admixture * v + (Math.random() * 0.2 - 0.1)).toFixed(1)), unit: 'kg' },
    ];
  };

  const handleOpenCreateModal = () => {
    const defaultGrade = 'M25';
    const defaultVol = 6.0;
    setForm({
      sheetNo: `25-26/${sheets.length + 1043}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      mixGrade: defaultGrade,
      volume: defaultVol,
      customerName: '',
      site: '',
      vehicleNo: 'MH-10-CR-1212',
      driverName: 'Sachin Shinde',
      operatorName: 'Rajesh Mane',
      targetSlump: MIX_DESIGN_PRESETS[defaultGrade].slump,
      actualSlump: '125 mm',
      moisturePercent: 2.0,
      qcStatus: 'Approved',
      remarks: 'Automated SCADA batch verified and logged.',
      materials: updateMaterialsForGradeAndVolume(defaultGrade, defaultVol),
    });
    setShowCreateModal(true);
  };

  const handleGradeChange = (grade) => {
    const preset = MIX_DESIGN_PRESETS[grade];
    setForm((prev) => ({
      ...prev,
      mixGrade: grade,
      targetSlump: preset ? preset.slump : prev.targetSlump,
      materials: updateMaterialsForGradeAndVolume(grade, prev.volume),
    }));
  };

  const handleVolumeChange = (vol) => {
    const numVol = Number(vol) || 1;
    setForm((prev) => ({
      ...prev,
      volume: numVol,
      materials: updateMaterialsForGradeAndVolume(prev.mixGrade, numVol),
    }));
  };

  const handleMaterialActualChange = (idx, value) => {
    const updated = [...form.materials];
    updated[idx].actual = Number(value) || 0;
    setForm((prev) => ({ ...prev, materials: updated }));
  };

  const handleSaveSheet = (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      alert('Please enter Customer / Project Name.');
      return;
    }

    const newSheet = {
      id: `BS-${Date.now()}`,
      ...form,
      customerName: form.customerName.trim(),
      site: (form.site || 'Main Delivery Zone').trim(),
      batchesCount: Math.ceil(Number(form.volume) || 1),
      createdAt: new Date().toISOString(),
    };

    const updated = [newSheet, ...sheets];
    setSheets(updated);
    showToast(`✓ Batching Sheet #${newSheet.sheetNo} generated successfully!`);
    setShowCreateModal(false);
    setSelectedSheet(newSheet);
  };

  const handleDeleteSheet = (id, sheetNo) => {
    if (confirm(`Are you sure you want to delete Batching Sheet #${sheetNo}?`)) {
      const updated = sheets.filter((s) => s.id !== id);
      setSheets(updated);
      showToast(`Batching Sheet #${sheetNo} removed.`);
      if (selectedSheet?.id === id) setSelectedSheet(null);
    }
  };

  // Filtered sheets
  const filteredSheets = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sheets.filter((s) => 
      s.sheetNo.toLowerCase().includes(q) ||
      (s.customerName || '').toLowerCase().includes(q) ||
      (s.site || '').toLowerCase().includes(q) ||
      (s.vehicleNo || '').toLowerCase().includes(q) ||
      (s.mixGrade || '').toLowerCase().includes(q)
    );
  }, [sheets, searchQuery]);

  // Statistics
  const totalVolume = sheets.reduce((s, it) => s + (Number(it.volume) || 0), 0);
  const totalCementKg = sheets.reduce((s, it) => {
    const c = (it.materials || []).find((m) => m.name.toLowerCase().includes('cement'));
    return s + (c ? Number(c.actual) : 0);
  }, 0);

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      
      {/* Toast Notification */}
      {notification && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-5 right-5 z-[100000] p-4 rounded-2xl bg-slate-900/95 text-white border border-slate-700 shadow-2xl flex items-center gap-3 animate-pop-in backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold text-xs">{notification}</span>
        </div>,
        document.body
      )}

      {/* Top 4 KPI Operational Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. Total Volume */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Concrete Batched</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-black text-slate-900 text-lg sm:text-xl">
              {totalVolume.toFixed(1)} <span className="text-xs font-normal text-slate-500">m³</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              {sheets.length} Total Batches Produced
            </div>
          </div>
        </div>

        {/* 2. Cement Consumed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cement Batched</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-black text-slate-900 text-lg sm:text-xl">
              {(totalCementKg / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-500">Tons</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
              OPC 53 Silo Consumption
            </div>
          </div>
        </div>

        {/* 3. SCADA Accuracy */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/30 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Batching Accuracy</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-black text-emerald-700 text-lg sm:text-xl">
              99.6% <span className="text-xs font-normal text-emerald-600">IS:4926</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Within ±1.5% Target Tolerance
            </div>
          </div>
        </div>

        {/* 4. Mixer Fleet Batched */}
        <div className="bg-white rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white to-blue-50/30 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Mixers Loaded</span>
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="font-mono font-black text-blue-700 text-lg sm:text-xl">
              {sheets.length} <span className="text-xs font-normal text-blue-600">Trips</span>
            </div>
            <div className="text-[10px] text-blue-700 font-medium mt-0.5">
              All Mixers Slump Verified
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sheet no, mixer vehicle, site..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Batching Sheet</span>
          </button>
        </div>
      </div>

      {/* Batching Sheets Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs text-slate-700 border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100/90 text-slate-900 font-black uppercase tracking-wider text-[10px] border-b-2 border-slate-200/90 select-none">
                <th className="py-3 px-3 w-[13%]">Sheet # & Time</th>
                <th className="py-3 px-3 w-[18%]">Customer & Project Site</th>
                <th className="py-3 px-3 w-[11%]">Grade & Volume</th>
                <th className="py-3 px-3 w-[36%]">Batched Materials (SCADA Actuals)</th>
                <th className="py-3 px-3 w-[12%]">Mixer & Driver</th>
                <th className="py-3 px-3 w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredSheets.length > 0 ? (
                filteredSheets.map((s) => (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-3 px-3">
                      <div className="font-mono font-black text-slate-900 flex items-center gap-1">
                        <ClipboardList className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>#{s.sheetNo}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {s.date} • {s.time}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 truncate">{s.customerName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="truncate">{s.site}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-mono font-bold text-[11px] border border-blue-200">
                        {s.mixGrade}
                      </span>
                      <div className="font-mono font-black text-slate-900 text-xs mt-1">
                        {Number(s.volume).toFixed(1)} m³
                      </div>
                    </td>

                    {/* All Materials - Compact, Professional Telemetry Chips */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap items-center gap-1 max-w-lg">
                        {s.materials?.map((m) => {
                          let short = 'Mat';
                          let pillStyle = 'bg-slate-50 text-slate-800 border-slate-200';
                          if (m.name.includes('Cement')) {
                            short = 'Cement';
                            pillStyle = 'bg-slate-100 text-slate-900 border-slate-300 font-bold';
                          } else if (m.name.includes('Fly Ash')) {
                            short = 'FlyAsh';
                            pillStyle = 'bg-purple-50 text-purple-900 border-purple-200';
                          } else if (m.name.includes('20mm')) {
                            short = '20mm';
                            pillStyle = 'bg-stone-50 text-stone-800 border-stone-200';
                          } else if (m.name.includes('10mm')) {
                            short = '10mm';
                            pillStyle = 'bg-stone-50 text-stone-800 border-stone-200';
                          } else if (m.name.includes('Sand')) {
                            short = 'Sand';
                            pillStyle = 'bg-amber-50 text-amber-900 border-amber-200';
                          } else if (m.name.includes('Water')) {
                            short = 'Water';
                            pillStyle = 'bg-cyan-50 text-cyan-900 border-cyan-200';
                          } else if (m.name.includes('Admixture')) {
                            short = 'Admix';
                            pillStyle = 'bg-orange-50 text-orange-900 border-orange-200';
                          }

                          return (
                            <span
                              key={m.name}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border shadow-2xs ${pillStyle}`}
                              title={`${m.name}: Actual ${Number(m.actual).toLocaleString()} ${m.unit} (Target: ${Number(m.target).toLocaleString()} ${m.unit})`}
                            >
                              <span className="font-sans font-semibold text-[9px] opacity-75">{short}:</span>
                              <span className="font-bold">{Number(m.actual).toLocaleString()}</span>
                              <span className="text-[8px] opacity-60 font-sans">{m.unit}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-slate-800">
                        <Truck className="w-3 h-3 text-slate-500" />
                        <span>{s.vehicleNo}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {s.driverName}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedSheet(s)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold transition-colors cursor-pointer"
                          title="View Batching Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrintingSheet(s)}
                          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-2xs transition-colors cursor-pointer"
                          title="Print Batch Sheet Ticket"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSheet(s.id, s.sheetNo)}
                          className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                          title="Delete Batch Sheet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No batching sheets found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL: CREATE NEW BATCHING SHEET FORM
          ======================================================== */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] app-modal-backdrop flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-pop-in"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="bg-white rounded-3xl border border-[#D4E4F7] shadow-2xl max-w-3xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col my-auto overflow-hidden text-slate-900 text-xs">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0D2847] via-[#123B6D] to-[#1E528F] text-white p-3.5 sm:px-6 flex items-center justify-between border-b border-[#123B6D]/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>Generate Official Batching Sheet</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      SCADA Integration
                    </span>
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    SM CONCRETECH • Plant Unit #01 Automated Concrete Batching
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSheet} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
              
              {/* Step 1: Batch Info & Mix Grade */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <span className="font-bold text-xs text-slate-900 block border-b border-slate-100 pb-2">
                  1. Batch Order & Recipe Selection
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Sheet Number</label>
                    <input
                      type="text"
                      value={form.sheetNo}
                      onChange={(e) => setForm({ ...form, sheetNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Date & Time</label>
                    <input
                      type="text"
                      value={`${form.date} ${form.time}`}
                      disabled
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-mono text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Batch Volume (m³) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="12"
                      value={form.volume}
                      onChange={(e) => handleVolumeChange(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-blue-700 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Slump</label>
                    <input
                      type="text"
                      value={form.targetSlump}
                      onChange={(e) => setForm({ ...form, targetSlump: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium"
                    />
                  </div>
                </div>

                {/* Grade Selector Pills */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Select IS:10262 Concrete Mix Grade:
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {Object.keys(MIX_DESIGN_PRESETS).map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => handleGradeChange(grade)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          form.mixGrade === grade
                            ? 'bg-[#1D5FA7] text-white border-[#1D5FA7] shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Client & Transit Logistics */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <span className="font-bold text-xs text-slate-900 block border-b border-slate-100 pb-2">
                  2. Client & Transit Dispatch Logistics
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Customer / Client Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      placeholder="e.g. Shree Construction"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Pouring Site Location
                    </label>
                    <input
                      type="text"
                      value={form.site}
                      onChange={(e) => setForm({ ...form, site: e.target.value })}
                      placeholder="e.g. Tanang Pier Site #04"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Transit Mixer Truck</label>
                    <input
                      type="text"
                      value={form.vehicleNo}
                      onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })}
                      placeholder="e.g. MH-10-CR-1212"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono uppercase font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Driver Name</label>
                    <input
                      type="text"
                      value={form.driverName}
                      onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                      placeholder="e.g. Sachin Shinde"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Material Consumption Breakdown (Target vs Actual) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-slate-900">
                    3. SCADA Material Weights for {form.volume} m³ ({form.mixGrade})
                  </span>
                  <span className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Auto-Calibrated
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2 px-3 text-left">Material Component</th>
                        <th className="py-2 px-3 text-right">Target Proportions</th>
                        <th className="py-2 px-3 text-right">Actual Batched Weight</th>
                        <th className="py-2 px-3 text-right">Variance (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.materials.map((m, idx) => {
                        const diff = m.target > 0 ? (((m.actual - m.target) / m.target) * 100) : 0;
                        const isOk = Math.abs(diff) <= 2.0;
                        return (
                          <tr key={m.name} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-semibold text-slate-900">{m.name}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {m.target} {m.unit}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="any"
                                value={m.actual}
                                onChange={(e) => handleMaterialActualChange(idx, e.target.value)}
                                className="w-24 text-right px-2 py-1 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white"
                              />
                              <span className="ml-1 text-[10px] text-slate-500 font-mono">{m.unit}</span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                                isOk ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {diff >= 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#123B6D] to-[#1D5FA7] hover:from-[#0F2D54] hover:to-[#123B6D] shadow-md shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate & Approve Batch Sheet</span>
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          MODAL: VIEW BATCHING SHEET DETAILS
          ======================================================== */}
      {selectedSheet && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] app-modal-backdrop flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-pop-in"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden text-slate-900 text-xs">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-3.5 sm:px-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black truncate">
                    Batching Sheet #{selectedSheet.sheetNo}
                  </h3>
                  <p className="text-[11px] text-slate-300 truncate">
                    {selectedSheet.customerName} • {selectedSheet.mixGrade} Concrete ({selectedSheet.volume} m³)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrintingSheet(selectedSheet);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSheet(null)}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Batch Date</span>
                  <span className="font-mono font-bold text-slate-900">{selectedSheet.date} {selectedSheet.time}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Mix Grade</span>
                  <span className="font-mono font-black text-blue-700">{selectedSheet.mixGrade} Concrete</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Transit Mixer</span>
                  <span className="font-mono font-bold text-slate-900">{selectedSheet.vehicleNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Slump</span>
                  <span className="font-mono font-bold text-emerald-700">{selectedSheet.actualSlump || '125 mm'}</span>
                </div>
              </div>

              {/* Material Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <span className="font-bold text-xs text-slate-900 block border-b border-slate-100 pb-2">
                  Actual Material Consumption & SCADA Weights
                </span>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                      <th className="py-2 text-left">Material Component</th>
                      <th className="py-2 text-right">Target</th>
                      <th className="py-2 text-right">Actual Batched</th>
                      <th className="py-2 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedSheet.materials?.map((m) => {
                      const diff = m.target > 0 ? (((m.actual - m.target) / m.target) * 100) : 0;
                      return (
                        <tr key={m.name}>
                          <td className="py-2 font-sans font-medium text-slate-900">{m.name}</td>
                          <td className="py-2 text-right text-slate-500">{m.target} {m.unit}</td>
                          <td className="py-2 text-right font-bold text-slate-900">{m.actual} {m.unit}</td>
                          <td className="py-2 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              Math.abs(diff) <= 2 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {diff >= 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                <span>Batch Operator: <strong>{selectedSheet.operatorName || 'Rajesh Mane'}</strong></span>
                <span>QC Verification: <strong className="text-emerald-700">✓ IS:4926 Certified</strong></span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:px-5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSheet(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setPrintingSheet(selectedSheet)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1D5FA7] text-white hover:bg-[#123B6D] flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Slip</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          MODAL: PRINTABLE COMPUTERIZED BATCH TICKET
          ======================================================== */}
      {printingSheet && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[10000] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 print:p-0 print:bg-white print:static print:block"
        >
          <div className="bg-white text-black max-w-lg w-full rounded-2xl shadow-2xl p-5 border border-black space-y-3 font-mono text-[11px] print:shadow-none print:border-none print:max-w-none print:w-full print:p-2">
            
            <div className="flex items-center justify-between border-b pb-2 no-print">
              <span className="font-bold text-xs text-slate-700">Batch Ticket Print Preview</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-amber-500 font-bold text-xs text-slate-950 flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingSheet(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Ticket Area */}
            <div className="text-center border-b border-black pb-2">
              <h2 className="text-base font-black tracking-wider uppercase">SM CONCRETECH</h2>
              <p className="text-[10px]">A/P Tanang, Sangli - 416410 • +91 9421858683</p>
              <div className="mt-1 font-bold border border-black py-0.5 uppercase tracking-wide text-xs">
                Computerized RMC Batching Slip
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 border-b border-black pb-2 text-[10px]">
              <div><strong>Ticket #: </strong>{printingSheet.sheetNo}</div>
              <div><strong>Date: </strong>{printingSheet.date} {printingSheet.time}</div>
              <div><strong>Customer: </strong>{printingSheet.customerName}</div>
              <div><strong>Mix Grade: </strong>{printingSheet.mixGrade}</div>
              <div><strong>Site: </strong>{printingSheet.site}</div>
              <div><strong>Mixer #: </strong>{printingSheet.vehicleNo}</div>
              <div><strong>Batch Qty: </strong>{printingSheet.volume} m³</div>
              <div><strong>Driver: </strong>{printingSheet.driverName}</div>
            </div>

            <table className="w-full text-[10px] border-b border-black pb-2">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="py-1">Material</th>
                  <th className="py-1 text-right">Target</th>
                  <th className="py-1 text-right">Actual</th>
                  <th className="py-1 text-right">Var%</th>
                </tr>
              </thead>
              <tbody>
                {printingSheet.materials?.map((m) => {
                  const diff = m.target > 0 ? (((m.actual - m.target) / m.target) * 100) : 0;
                  return (
                    <tr key={m.name}>
                      <td className="py-0.5">{m.name}</td>
                      <td className="text-right">{m.target}</td>
                      <td className="text-right font-bold">{m.actual} {m.unit}</td>
                      <td className="text-right">{diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="pt-2 text-[10px] space-y-0.5">
              <div>Slump at Plant: <strong>{printingSheet.actualSlump || '125 mm'}</strong></div>
              <div>Water-Cement Ratio: <strong>{MIX_DESIGN_PRESETS[printingSheet.mixGrade]?.wcRatio || '0.42'}</strong></div>
              <div>Plant Operator: <strong>{printingSheet.operatorName || 'Rajesh Mane'}</strong></div>
            </div>

            <div className="pt-6 grid grid-cols-2 text-center text-[10px] border-t border-black">
              <div>
                <div className="h-6"></div>
                <div className="border-t border-dotted border-black pt-0.5">Plant Operator Sign</div>
              </div>
              <div>
                <div className="h-6"></div>
                <div className="border-t border-dotted border-black pt-0.5">Transit Driver Sign</div>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
