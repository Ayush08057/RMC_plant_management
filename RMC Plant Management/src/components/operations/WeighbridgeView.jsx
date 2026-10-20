import React, { useState, useEffect } from 'react';
import { Scale, Plus, Search, Printer, CheckCircle2 } from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';

const INITIAL_WEIGHBRIDGE = [];

export default function WeighbridgeView() {
  const [slips, setSlips] = useState(() => {
    try {
      const saved = localStorage.getItem('rmc_weighbridge_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_WEIGHBRIDGE;
  });

  useEffect(() => {
    const unsub = subscribeCloudStore('cloud_weighbridge', 'rmc_weighbridge_v2', INITIAL_WEIGHBRIDGE, (cloudSlips) => {
      if (Array.isArray(cloudSlips) && cloudSlips.length > 0) {
        setSlips(cloudSlips);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    pushCloudStore('cloud_weighbridge', 'rmc_weighbridge_v2', slips);
  }, [slips]);
  const [search, setSearch] = useState('');

  const filtered = slips.filter(s => 
    s.slipNo.toLowerCase().includes(search.toLowerCase()) ||
    s.vehicleNo.toLowerCase().includes(search.toLowerCase()) ||
    s.partyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" />
            <span>Digital Weighbridge Operations</span>
          </h2>
          <p className="text-[11px] text-slate-500">Gross, tare, and net automated weight measurement register</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search slip, truck, party..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900 font-bold text-[10px] uppercase border-b">
              <th className="py-2.5 px-3">Slip # & Time</th>
              <th className="py-2.5 px-3">Vehicle #</th>
              <th className="py-2.5 px-3">Party Name</th>
              <th className="py-2.5 px-3">Material</th>
              <th className="py-2.5 px-3 text-right">Gross (kg)</th>
              <th className="py-2.5 px-3 text-right">Tare (kg)</th>
              <th className="py-2.5 px-3 text-right">Net Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400 font-sans">
                  No weighbridge tickets recorded. Use "+ New Weighment" to log material gross/tare weight.
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">#{s.slipNo}<div className="text-[10px] text-slate-500 font-normal">{s.date} {s.time}</div></td>
                  <td className="py-2.5 px-3 font-bold">{s.vehicleNo}</td>
                  <td className="py-2.5 px-3 font-sans font-medium">{s.partyName}</td>
                  <td className="py-2.5 px-3 font-sans text-blue-700">{s.material}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{Number(s.grossKg || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{Number(s.tareKg || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-700">{((s.netKg || 0) / 1000).toFixed(2)} Tons</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
