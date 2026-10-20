import React, { useState } from 'react';
import { Truck, CheckCircle2, AlertCircle, Wrench, ShieldCheck, Search } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import HelpModal from './guided/HelpModal';

const INITIAL_VEHICLES = [];

export default function VehicleManagementView() {
  const { language } = useLanguage();
  const [helpOpen, setHelpOpen] = useState(false);
  const [vehicles, setVehicles] = useState(() => {
    try {
      const saved = localStorage.getItem('rmc_plant_vehicles_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_VEHICLES;
  });
  const [search, setSearch] = useState('');

  const filtered = vehicles.filter(v => 
    (v.vehicleNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.type || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.driver || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 text-xs text-slate-800">

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <span>Transit Mixer & Concrete Pump Fleet</span>
          </h2>
          <p className="text-[11px] text-slate-500">Fleet compliance, assigned drivers, and live operational status</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vehicle, driver..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
          <p className="text-sm font-semibold text-slate-700">No Fleet Vehicles Registered</p>
          <p className="text-xs text-slate-400 mt-1">Dispatched mixer trucks and concrete pump vehicles will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-base font-mono font-black text-slate-900 block">{v.vehicleNo}</span>
                  <span className="text-xs font-bold text-blue-700 block mt-0.5">{v.type}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  v.status === 'Available / Plant' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {v.status}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                <div>Chassis/Model: <strong className="text-slate-800">{v.model}</strong></div>
                <div>Assigned Driver: <strong className="text-slate-800">{v.driver}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] border-t pt-2 text-slate-500 font-mono">
                <div>Fitness Valid: <strong className="text-slate-800">{v.fitnessValidTill}</strong></div>
                <div>Insurance Valid: <strong className="text-slate-800">{v.insuranceValidTill}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Universal Help Popover Modal */}
      <HelpModal 
        isOpen={helpOpen} 
        onClose={() => setHelpOpen(false)} 
        topic="general" 
      />
    </div>
  );
}
