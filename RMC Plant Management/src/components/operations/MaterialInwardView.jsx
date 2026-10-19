import React, { useState } from 'react';
import { Layers, Plus, Search, Truck, Scale, CheckCircle2, Building2 } from 'lucide-react';

const INITIAL_INWARD = [
  { id: 'INW-01', date: '19-Oct-2026', slipNo: 'WB-7821', material: 'OPC 53 Grade Cement', supplier: 'UltraTech Cement Ltd', vehicleNo: 'MH-12-RN-4545', grossTons: 42.5, tareTons: 14.2, netTons: 28.3, destination: 'Silo #01 (Main Plant)' },
  { id: 'INW-02', date: '19-Oct-2026', slipNo: 'WB-7822', material: '20mm Coarse Aggregate', supplier: 'Mahalaxmi Stone Crushers', vehicleNo: 'MH-10-AQ-9911', grossTons: 38.0, tareTons: 12.0, netTons: 26.0, destination: 'Bin #01 (20mm Aggregate)' },
  { id: 'INW-03', date: '18-Oct-2026', slipNo: 'WB-7819', material: 'Crushed M-Sand', supplier: 'Sangli Sand Suppliers', vehicleNo: 'MH-10-CR-8822', grossTons: 35.5, tareTons: 11.5, netTons: 24.0, destination: 'Bin #03 (Crush Sand)' },
];

export default function MaterialInwardView() {
  const [records, setRecords] = useState(INITIAL_INWARD);
  const [search, setSearch] = useState('');

  const filtered = records.filter(r => 
    r.material.toLowerCase().includes(search.toLowerCase()) ||
    r.supplier.toLowerCase().includes(search.toLowerCase()) ||
    r.vehicleNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      {/* Silo Levels Monitor */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-bold">Cement Silo #01</div>
          <div className="text-base font-black text-slate-900 mt-0.5">85.4 Tons</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-blue-600 h-full w-[85%]"></div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-bold">Fly Ash Silo #02</div>
          <div className="text-base font-black text-slate-900 mt-0.5">42.0 Tons</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full w-[70%]"></div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-bold">20mm Agg Bin #01</div>
          <div className="text-base font-black text-slate-900 mt-0.5">148.0 Tons</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-600 h-full w-[74%]"></div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-bold">Crushed M-Sand Bin</div>
          <div className="text-base font-black text-slate-900 mt-0.5">180.5 Tons</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-600 h-full w-[90%]"></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Raw Material Inward & Stock Receipts</span>
          </h2>
          <p className="text-[11px] text-slate-500">Intake logs for aggregate deliveries, cement bulkers, and sand trailers</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search material, supplier..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900 font-bold text-[10px] uppercase border-b">
              <th className="py-2.5 px-3">Date & Slip #</th>
              <th className="py-2.5 px-3">Material Name</th>
              <th className="py-2.5 px-3">Supplier / Quarry</th>
              <th className="py-2.5 px-3">Truck #</th>
              <th className="py-2.5 px-3 text-right">Net Weight</th>
              <th className="py-2.5 px-3">Silo / Storage Bin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-mono font-bold">{r.slipNo}<div className="text-[10px] text-slate-500 font-normal">{r.date}</div></td>
                <td className="py-2.5 px-3 font-bold text-slate-900">{r.material}</td>
                <td className="py-2.5 px-3">{r.supplier}</td>
                <td className="py-2.5 px-3 font-mono">{r.vehicleNo}</td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">{r.netTons} Tons</td>
                <td className="py-2.5 px-3 text-slate-600">{r.destination}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
