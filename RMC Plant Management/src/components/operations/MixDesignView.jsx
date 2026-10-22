import React, { useState, useEffect } from 'react';
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
  X,
  Edit2,
  Trash2,
  Calendar,
  ShieldCheck,
  Clock,
  ChevronRight,
  Filter
} from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';
import { DEFAULT_MIX_DESIGNS, STORAGE_KEYS } from '../../services/plantOperationsService';
import { useLanguage } from '../../context/LanguageContext';

const MIX_DESIGNS_KEY = STORAGE_KEYS.MIX_DESIGNS;

export default function MixDesignView() {
  const { language } = useLanguage();
  const isMarathi = language === 'mr';

  const [designs, setDesigns] = useState(() => {
    try {
      const saved = localStorage.getItem(MIX_DESIGNS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MIX_DESIGNS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Subscribe to Cloud Sync
  useEffect(() => {
    const unsub = subscribeCloudStore('cloud_mix_designs', MIX_DESIGNS_KEY, DEFAULT_MIX_DESIGNS, (cloudDesigns) => {
      if (Array.isArray(cloudDesigns) && cloudDesigns.length > 0) {
        setDesigns(cloudDesigns);
      }
    });
    return () => unsub();
  }, []);

  const saveDesigns = (updated) => {
    setDesigns(updated);
    try {
      localStorage.setItem(MIX_DESIGNS_KEY, JSON.stringify(updated));
      pushCloudStore('cloud_mix_designs', MIX_DESIGNS_KEY, updated);
    } catch (e) {
      console.warn('Failed to save mix designs:', e);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Form state for creating / editing mix design
  const [form, setForm] = useState({
    id: 'MD-M25',
    grade: 'M25',
    name: 'Structural Concrete (Beams & Columns)',
    cement: 360,
    flyash: 60,
    agg20: 750,
    agg10: 500,
    sand: 800,
    water: 165,
    admixture: 3.0,
    slump: '120 ± 25 mm',
    wcRatio: 0.42,
    targetStrength: '31.5 N/mm²',
    designRef: `SM-MIX-${new Date().getFullYear()}-M25-R1`,
    effectiveDate: new Date().toISOString().split('T')[0],
    revision: 'v1.0',
    status: 'Active',
    approvalStatus: 'Approved',
    approvedBy: 'Quality Control Head'
  });

  const handleOpenAdd = () => {
    setEditingDesign(null);
    setForm({
      id: `MD-M${Math.floor(20 + Math.random() * 20)}`,
      grade: 'M25',
      name: 'Structural Reinforced Concrete',
      cement: 360,
      flyash: 60,
      agg20: 750,
      agg10: 500,
      sand: 800,
      water: 165,
      admixture: 3.0,
      slump: '120 ± 25 mm',
      wcRatio: 0.42,
      targetStrength: '31.5 N/mm²',
      designRef: `SM-MIX-${new Date().getFullYear()}-R${Math.floor(1 + Math.random() * 5)}`,
      effectiveDate: new Date().toISOString().split('T')[0],
      revision: 'v1.0',
      status: 'Active',
      approvalStatus: 'Approved',
      approvedBy: 'Quality Control Head'
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (design) => {
    setEditingDesign(design);
    setForm({ ...design });
    setShowAddModal(true);
  };

  const handleSaveDesign = (e) => {
    e.preventDefault();
    if (!form.grade.trim() || !form.id.trim()) {
      showToast('Please provide Grade and Mix Design ID.');
      return;
    }

    if (editingDesign) {
      // Update existing design
      const updated = designs.map(d => d.id === editingDesign.id ? { ...form, updatedAt: new Date().toISOString() } : d);
      saveDesigns(updated);
      showToast(`✓ Mix Design ${form.grade} (${form.revision}) updated.`);
    } else {
      // Add new design
      const newDesign = {
        ...form,
        createdAt: new Date().toISOString()
      };
      const updated = [newDesign, ...designs];
      saveDesigns(updated);
      showToast(`✓ New Mix Design ${form.grade} created and approved.`);
    }

    setShowAddModal(false);
  };

  const handleDeleteDesign = (id, grade) => {
    if (window.confirm(`Are you sure you want to retire Mix Design ${grade} (${id})?`)) {
      const updated = designs.filter(d => d.id !== id);
      saveDesigns(updated);
      showToast(`Mix Design ${grade} retired.`);
      if (selectedDesign?.id === id) setSelectedDesign(null);
    }
  };

  const filtered = designs.filter(d => 
    d.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.designRef || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-3 text-xs text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage('')} className="p-1 hover:bg-emerald-700 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-600" />
            <span>IS:10262 & IS:456 Concrete Mix Design Master Library</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            Calibrated plant recipes with ingredient proportions per m³ for SCADA batching automation
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search grade (M20, M25, M30)..."
              className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Mix Design</span>
          </button>
        </div>
      </div>

      {/* Grid of Mix Designs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5 hover:border-blue-400 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black font-mono text-blue-700 block">{d.grade}</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {d.revision || 'v1.0'}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-800 block mt-0.5 leading-snug">{d.name}</span>
                <span className="text-[10px] text-slate-400 font-mono block">{d.designRef}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  {d.approvalStatus || 'Approved'}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(d)}
                  className="p-1 rounded-md text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                  title="Edit Recipe"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDesign(d.id, d.grade)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Retire Recipe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div>Target 28D: <strong>{d.targetStrength}</strong></div>
              <div>W/C Ratio: <strong>{d.wcRatio}</strong></div>
              <div>Design Slump: <strong>{d.slump}</strong></div>
              <div>Admixture: <strong>{d.admixture} kg/m³</strong></div>
            </div>

            {/* Compact Recipe Formulation Grid (Per 1 m³) */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Batch Targets per 1 m³
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/80">
                  <span className="font-sans text-[8px] text-slate-500 font-bold block">Cement</span>
                  <span className="font-bold text-slate-900">{d.cement}</span> <span className="text-[8px] text-slate-400">kg</span>
                </div>
                <div className="bg-purple-50/60 p-1.5 rounded-lg border border-purple-200/80">
                  <span className="font-sans text-[8px] text-purple-700 font-bold block">Fly Ash</span>
                  <span className="font-bold text-purple-900">{d.flyash}</span> <span className="text-[8px] text-purple-400">kg</span>
                </div>
                <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-200/80">
                  <span className="font-sans text-[8px] text-stone-600 font-bold block">20mm Agg</span>
                  <span className="font-bold text-stone-900">{d.agg20}</span> <span className="text-[8px] text-stone-400">kg</span>
                </div>
                <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-200/80">
                  <span className="font-sans text-[8px] text-stone-600 font-bold block">10mm Agg</span>
                  <span className="font-bold text-stone-900">{d.agg10}</span> <span className="text-[8px] text-stone-400">kg</span>
                </div>
                <div className="bg-amber-50/60 p-1.5 rounded-lg border border-amber-200/80">
                  <span className="font-sans text-[8px] text-amber-700 font-bold block">M-Sand</span>
                  <span className="font-bold text-amber-900">{d.sand}</span> <span className="text-[8px] text-amber-400">kg</span>
                </div>
                <div className="bg-blue-50/60 p-1.5 rounded-lg border border-blue-200/80">
                  <span className="font-sans text-[8px] text-blue-700 font-bold block">Water</span>
                  <span className="font-bold text-blue-900">{d.water}</span> <span className="text-[8px] text-blue-400">L</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Effective: {d.effectiveDate || '2026-01-01'}</span>
              <span>Approved: {d.approvedBy || 'QC Head'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT CONCRETE MIX DESIGN                     */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto text-slate-800">
            <div className="px-4 py-3 bg-[#123B6D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs">
                  {editingDesign ? `Edit Mix Design (${editingDesign.grade})` : 'Create New Concrete Mix Design'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDesign} className="p-4 space-y-3 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Grade *</label>
                  <input
                    type="text"
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: e.target.value.toUpperCase() })}
                    placeholder="e.g. M25, M30"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Mix Design ID *</label>
                  <input
                    type="text"
                    value={form.id}
                    onChange={e => setForm({ ...form, id: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Revision # *</label>
                  <input
                    type="text"
                    value={form.revision}
                    onChange={e => setForm({ ...form, revision: e.target.value })}
                    placeholder="v1.0"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Application Name & Description</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Commercial Heavy Foundation / Pavement"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                  required
                />
              </div>

              {/* Recipe Ingredients per 1 m³ */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider block">
                  Material Quantities per 1.0 m³ Concrete
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Cement (kg)</label>
                    <input
                      type="number"
                      value={form.cement}
                      onChange={e => setForm({ ...form, cement: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Fly Ash (kg)</label>
                    <input
                      type="number"
                      value={form.flyash}
                      onChange={e => setForm({ ...form, flyash: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">20mm Agg (kg)</label>
                    <input
                      type="number"
                      value={form.agg20}
                      onChange={e => setForm({ ...form, agg20: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">10mm Agg (kg)</label>
                    <input
                      type="number"
                      value={form.agg10}
                      onChange={e => setForm({ ...form, agg10: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Crushed Sand (kg)</label>
                    <input
                      type="number"
                      value={form.sand}
                      onChange={e => setForm({ ...form, sand: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Water (Litres)</label>
                    <input
                      type="number"
                      value={form.water}
                      onChange={e => setForm({ ...form, water: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Admixture (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.admixture}
                      onChange={e => setForm({ ...form, admixture: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">W/C Ratio</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.wcRatio}
                      onChange={e => setForm({ ...form, wcRatio: Number(e.target.value) || 0.42 })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Target Slump</label>
                    <input
                      type="text"
                      value={form.slump}
                      onChange={e => setForm({ ...form, slump: e.target.value })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Design Reference Ref</label>
                  <input
                    type="text"
                    value={form.designRef}
                    onChange={e => setForm({ ...form, designRef: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Approval Authority</label>
                  <input
                    type="text"
                    value={form.approvedBy}
                    onChange={e => setForm({ ...form, approvedBy: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingDesign ? 'Update Mix Design' : 'Save & Approve Recipe'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
