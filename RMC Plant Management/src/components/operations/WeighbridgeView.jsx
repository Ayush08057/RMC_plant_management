import React, { useState } from 'react';
import { Scale, Plus, Search, Printer, CheckCircle2 } from 'lucide-react';

const INITIAL_WEIGHBRIDGE = [
  { id: 'WB-7822', slipNo: 'WB-7822', date: '19-Oct-2026', time: '10:10 AM', vehicleNo: 'MH-10-AQ-9911', partyName: 'Mahalaxmi Stone Crushers', material: '20mm Aggregate', grossKg: 38000, tareKg: 12000, netKg: 26000, operator: 'Prakash K.' },
  { id: 'WB-7821', slipNo: 'WB-7821', date: '19-Oct-2026', time: '09:20 AM', vehicleNo: 'MH-12-RN-4545', partyName: 'UltraTech Cement Ltd', material: 'OPC 53 Cement', grossKg: 42500, tareKg: 14200, netKg: 28300, operator: 'Prakash K.' },
  { id: 'WB-7820', slipNo: 'WB-7820', date: '19-Oct-2026', time: '08:40 AM', vehicleNo: 'MH-10-CR-1212', partyName: 'SM CONCRETECH Mixer #01', material: 'Transit Mixer Tare', grossKg: 28400, tareKg: 14000, netKg: 14400, operator: 'Prakash K.' },
];

export default function WeighbridgeView() {
  const [slips, setSlips] = useState(INITIAL_WEIGHBRIDGE);
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
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-bold text-slate-900">#{s.slipNo}<div className="text-[10px] text-slate-500 font-normal">{s.date} {s.time}</div></td>
                <td className="py-2.5 px-3 font-bold">{s.vehicleNo}</td>
                <td className="py-2.5 px-3 font-sans font-medium">{s.partyName}</td>
                <td className="py-2.5 px-3 font-sans text-blue-700">{s.material}</td>
                <td className="py-2.5 px-3 text-right text-slate-600">{s.grossKg.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-right text-slate-600">{s.tareKg.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-right font-black text-emerald-700">{(s.netKg / 1000).toFixed(2)} Tons</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
