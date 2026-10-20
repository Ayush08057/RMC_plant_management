import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, Truck, Scale, CheckCircle2, Building2 } from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';
import { useLanguage } from '../../context/LanguageContext';
import HelpModal from './guided/HelpModal';
import ReceiveMaterialsWizard from './guided/ReceiveMaterialsWizard';

const INWARD_STORAGE_KEY = 'rmc_material_inward_v2';

const INITIAL_INWARD = [];

export default function MaterialInwardView() {
  const { language } = useLanguage();
  const [helpOpen, setHelpOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(INWARD_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse inward records:', e);
    }
    return INITIAL_INWARD;
  });

  const [search, setSearch] = useState('');

  // Subscribe to cloud sync
  useEffect(() => {
    const unsub = subscribeCloudStore('cloud_material_inward', INWARD_STORAGE_KEY, INITIAL_INWARD, (cloudRecords) => {
      if (Array.isArray(cloudRecords) && cloudRecords.length > 0) {
        setRecords(cloudRecords);
      }
    });
    return () => unsub();
  }, []);

  const filtered = records.filter(r => 
    (r.material || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.supplier || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.vehicleNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.slipNo || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 text-xs text-slate-800">

      {/* Silo Levels Monitor */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-500 uppercase font-bold">
            {language === 'mr' ? 'सिमेंट सायलो #०१' : 'Cement Silo #01'}
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">85.4 Tons</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-blue-600 h-full w-[85%]"></div>
          </div>
        </div>
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-500 uppercase font-bold">
            {language === 'mr' ? 'फ्लाय ॲश सायलो #०२' : 'Fly Ash Silo #02'}
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">42.0 Tons</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full w-[70%]"></div>
          </div>
        </div>
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-500 uppercase font-bold">
            {language === 'mr' ? '२० मिमी खडी बिन #०१' : '20mm Agg Bin #01'}
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">148.0 Tons</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-600 h-full w-[74%]"></div>
          </div>
        </div>
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-500 uppercase font-bold">
            {language === 'mr' ? 'क्रश सॅन्ड (वाळू) बिन' : 'Crushed M-Sand Bin'}
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">180.5 Tons</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-600 h-full w-[90%]"></div>
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>{language === 'mr' ? 'कच्चा माल आवक नोंदवही' : 'Raw Material Inward & Stock Receipts'}</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            {language === 'mr' ? 'प्लॅन्टवर आलेल्या वाहनांच्या वजनासह नोंदी' : 'Intake logs for aggregate deliveries, cement bulkers, and sand trailers'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={language === 'mr' ? 'माल, सप्लायर, गाडी नंबर शोधा...' : 'Search material, supplier, truck...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-amber-500 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95"
            title="Receive Raw Material Inward Entry"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Inward Entry</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900 font-bold text-[10px] uppercase border-b">
              <th className="py-2.5 px-3">{language === 'mr' ? 'तारीख व पावती #' : 'Date & Slip #'}</th>
              <th className="py-2.5 px-3">{language === 'mr' ? 'मालाचे नाव' : 'Material Name'}</th>
              <th className="py-2.5 px-3">{language === 'mr' ? 'सप्लायर / खाण' : 'Supplier / Quarry'}</th>
              <th className="py-2.5 px-3">{language === 'mr' ? 'गाडी नंबर' : 'Truck #'}</th>
              <th className="py-2.5 px-3 text-right">{language === 'mr' ? 'निव्वळ वजन' : 'Net Weight'}</th>
              <th className="py-2.5 px-3">{language === 'mr' ? 'सायलो / बिन' : 'Silo / Storage Bin'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-slate-400">
                  {language === 'mr' ? 'कोणतीही नोंद सापडली नाही' : 'No material inward records found.'}
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold">
                    {r.slipNo}
                    <div className="text-[10px] text-slate-500 font-normal">{r.date}</div>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{r.material}</td>
                  <td className="py-2.5 px-3">{r.supplier}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold">{r.vehicleNo}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">{r.netTons} Tons</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.destination}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Universal Help Popover Modal */}
      <HelpModal 
        isOpen={helpOpen} 
        onClose={() => setHelpOpen(false)} 
        topic="receiveMaterials" 
      />

      {/* Guided Receive Materials Wizard */}
      <ReceiveMaterialsWizard 
        isOpen={wizardOpen} 
        onClose={() => setWizardOpen(false)} 
        onComplete={(newRec) => {
          setRecords(prev => [newRec, ...prev]);
        }} 
      />
    </div>
  );
}
