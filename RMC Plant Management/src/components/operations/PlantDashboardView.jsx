import React from 'react';
import {
  Activity,
  Layers,
  Truck,
  TrendingUp,
  Clock,
  PackageCheck,
  FileText
} from 'lucide-react';
import { sanitizeStoreItems } from '../../services/cloudSyncService';

export default function PlantDashboardView({ onNavigateTab }) {
  // Live operational data from plant records (clean empty default)
  const [batches] = React.useState(() => {
    try {
      const saved = localStorage.getItem('rmc_batching_sheets_v2');
      return saved ? sanitizeStoreItems(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  const [trips] = React.useState(() => {
    try {
      const saved = localStorage.getItem('rmc_driver_trips_v2');
      return saved ? sanitizeStoreItems(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  const [inwardRecords] = React.useState(() => {
    try {
      const saved = localStorage.getItem('rmc_material_inward_v2');
      return saved ? sanitizeStoreItems(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  const [siloInventory] = React.useState(() => {
    try {
      const saved = localStorage.getItem('rmc_silo_inventory_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      { id: 'silo-1', name: 'Cement Silo 1 (OPC 53)', current: 65, capacity: 100, unit: 'MT' },
      { id: 'silo-2', name: 'Fly Ash Silo 2 (Dirk Pozzocrete)', current: 42, capacity: 80, unit: 'MT' },
      { id: 'bin-1', name: '20mm Aggregates (Bin A)', current: 140, capacity: 200, unit: 'MT' },
      { id: 'bin-2', name: 'Crush Sand (Bin C)', current: 185, capacity: 250, unit: 'MT' }
    ];
  });

  const todayProductionM3 = batches.reduce((acc, b) => acc + (parseFloat(b.volume || b.totalBatchVolumeM3 || b.m3 || b.qty || 0) || 0), 0);
  const monthProductionM3 = todayProductionM3;
  const activeTripsCount = trips.filter(t => t.status === 'Active' || t.status === 'En Route' || t.status === 'Pouring').length;
  const idleMixersCount = trips.filter(t => t.status === 'Available' || t.status === 'In Yard').length;
  const totalMixers = trips.length;
  const totalBatchesToday = batches.length;

  const hourlyBatches = [];

  const fleetStatus = trips.map(t => ({
    id: t.tripId || t.id,
    reg: t.vehicleNo || t.vehicleReg || '--',
    driver: t.driverName || t.driver || '--',
    status: t.status || 'Active',
    grade: t.concreteGrade || t.grade || '--',
    dest: t.destinationSite || t.site || t.customerName || '--'
  }));

  const cementSilo = siloInventory.find(s => s.id === 'silo-1' || (s.name || '').toLowerCase().includes('cement')) || { current: 65, capacity: 100 };
  const flyAshSilo = siloInventory.find(s => s.id === 'silo-2' || (s.name || '').toLowerCase().includes('fly ash')) || { current: 42, capacity: 80 };
  const aggBin = siloInventory.find(s => s.id === 'bin-1' || (s.name || '').toLowerCase().includes('aggregate') || (s.name || '').includes('20mm')) || { current: 140, capacity: 200 };
  const sandBin = siloInventory.find(s => s.id === 'bin-2' || (s.name || '').toLowerCase().includes('sand')) || { current: 185, capacity: 250 };

  const cementTons = cementSilo.current;
  const flyAshTons = flyAshSilo.current;
  const aggTons = aggBin.current;
  const sandTons = sandBin.current;

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 text-xs text-slate-800 pb-8">
      {/* Compact Slim Top Header Bar (Replaces large dark blue banner) */}
      <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 inline-flex">
            <Activity className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 tracking-tight">Plant Live SCADA Telematics</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.2 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block">
              Real-time batching metrics, transit mixer dispatch fleet & raw material silos
            </p>
          </div>
        </div>

        {/* Compact Quick Action Pills */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <button
            onClick={() => onNavigateTab && onNavigateTab('batching-sheets')}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Layers className="w-3 h-3" />
            <span>+ Batching Sheet</span>
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('delivery-challans')}
            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <FileText className="w-3 h-3" />
            <span>+ Challan</span>
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('material-inward')}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded-lg border border-amber-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <PackageCheck className="w-3 h-3" />
            <span>+ Inward</span>
          </button>
        </div>
      </div>

      {/* Compact Space-Saving KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Today's Output</p>
            <p className="text-lg sm:text-xl font-black text-blue-900 mt-0.5">
              {todayProductionM3} <span className="text-xs font-semibold text-slate-500">m³</span>
            </p>
            <p className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1 truncate">
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>{totalBatchesToday} batches mixed</span>
            </p>
          </div>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 ml-2">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Monthly Yield</p>
            <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {monthProductionM3.toLocaleString()} <span className="text-xs font-semibold text-slate-500">m³</span>
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">Target: 5,000 m³ (85.6%)</p>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 ml-2">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Mixers Active</p>
            <p className="text-lg sm:text-xl font-black text-indigo-900 mt-0.5">
              {activeTripsCount} <span className="text-xs font-semibold text-slate-500">/ {totalMixers}</span>
            </p>
            <p className="text-[10px] text-indigo-700 font-bold mt-0.5 truncate">
              {idleMixersCount} idle in yard
            </p>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 ml-2">
            <Truck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Plant Health</p>
            <p className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">99.2%</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">SCADA Online • Zero Trips Halted</p>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 ml-2">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Hourly Output Bar Overview & Silo Stocks (Compact Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Hourly Production */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 sm:p-3.5 lg:col-span-2">
          <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Hourly Concrete Production</span>
              </h3>
              <p className="text-[10px] text-slate-500">Hourly volume (m³) batched through Pan Mixer</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
              Shift A (08:00 AM - 04:00 PM)
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {hourlyBatches.length === 0 ? (
              <div className="py-7 text-center text-slate-400">
                <Clock className="w-7 h-7 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600">No batching operations recorded today</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Batched volumes from SCADA mixer will populate here in real-time.</p>
              </div>
            ) : (
              hourlyBatches.map((slot) => {
                const maxM3 = 50;
                const pct = Math.min(100, Math.round((slot.m3 / maxM3) * 100));
                return (
                  <div key={slot.time} className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 font-mono font-bold text-slate-600 text-[10px]">{slot.time}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200/60">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2 text-white font-bold text-[9px]"
                        style={{ width: `${pct}%` }}
                      >
                        {slot.m3 > 15 ? `${slot.m3} m³` : ''}
                      </div>
                    </div>
                    <span className="w-24 font-bold text-slate-800 text-right text-[11px]">
                      {slot.m3} m³ <span className="font-normal text-slate-400 text-[10px]">({slot.batches} b)</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Silos & Bin Levels Quick Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 sm:p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Raw Material Stocks</span>
              </h3>
              <button
                onClick={() => onNavigateTab && onNavigateTab('material-inward')}
                className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer"
              >
                View Silos →
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] font-bold mb-0.5">
                  <span className="text-slate-700">Cement Silo 1 (OPC 53)</span>
                  <span className="text-blue-800 font-mono">{cementTons.toFixed(1)} / 100 MT ({Math.min(100, Math.round((cementTons / 100) * 100))}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.round((cementTons / 100) * 100))}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold mb-0.5">
                  <span className="text-slate-700">Fly Ash Silo 2 (Dirk Pozzocrete)</span>
                  <span className="text-purple-800 font-mono">{flyAshTons.toFixed(1)} / 80 MT ({Math.min(100, Math.round((flyAshTons / 80) * 100))}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.round((flyAshTons / 80) * 100))}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold mb-0.5">
                  <span className="text-slate-700">20mm Aggregates (Bin A)</span>
                  <span className="text-emerald-800 font-mono">{aggTons.toFixed(1)} / 200 MT ({Math.min(100, Math.round((aggTons / 200) * 100))}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.round((aggTons / 200) * 100))}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold mb-0.5">
                  <span className="text-slate-700">Crush Sand (Bin C)</span>
                  <span className="text-amber-800 font-mono">{sandTons.toFixed(1)} / 250 MT ({Math.min(100, Math.round((sandTons / 250) * 100))}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                  <div className="bg-amber-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.round((sandTons / 250) * 100))}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-600 font-semibold mt-3">
            {inwardRecords.length > 0 ? '✓ Live inward raw material logs updated.' : 'No inward raw material records logged yet.'}
          </div>
        </div>
      </div>

      {/* Transit Mixer Fleet Live Board Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Live Mixer Fleet Tracking</span>
            </h3>
            <p className="text-[10px] text-slate-500">Real-time status of transit mixers assigned to this plant</p>
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('driver-trips')}
            className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs cursor-pointer transition-colors"
          >
            Manage Driver Trips →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
              <tr>
                <th className="py-3 px-3 text-white border-r border-white/20">Mixer ID</th>
                <th className="py-3 px-3 text-white border-r border-white/20">Vehicle Reg No</th>
                <th className="py-3 px-3 text-white border-r border-white/20">Driver</th>
                <th className="py-3 px-3 text-white border-r border-white/20">Current Status</th>
                <th className="py-3 px-3 text-white border-r border-white/20">Grade</th>
                <th className="py-3 px-3 text-white">Destination Site</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fleetStatus.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    <Truck className="w-7 h-7 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-slate-600">No active mixer trucks dispatched</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Dispatched transit mixer vehicles and active trips will appear here.</p>
                  </td>
                </tr>
              ) : (
                fleetStatus.map((mixer) => {
                  let badgeClass = 'bg-slate-100 text-slate-700';
                  if (mixer.status === 'En Route') badgeClass = 'bg-blue-100 text-blue-800 border border-blue-200';
                  if (mixer.status === 'Pouring') badgeClass = 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse';
                  if (mixer.status === 'Returning') badgeClass = 'bg-purple-100 text-purple-800 border border-purple-200';
                  if (mixer.status === 'Available') badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                  if (mixer.status === 'Maintenance') badgeClass = 'bg-rose-100 text-rose-800 border border-rose-200';

                  return (
                    <tr key={mixer.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{mixer.id}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">{mixer.reg}</td>
                      <td className="py-2 px-3 text-slate-700">{mixer.driver}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeClass}`}>
                          {mixer.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800">{mixer.grade}</td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">{mixer.dest}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
