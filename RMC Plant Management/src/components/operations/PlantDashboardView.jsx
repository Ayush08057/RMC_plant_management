import React from 'react';
import {
  Activity,
  Layers,
  Truck,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  PackageCheck,
  Scale,
  FileText,
  Fuel,
  Settings,
  Flame
} from 'lucide-react';

export default function PlantDashboardView({ onNavigateTab }) {
  // Mock live operational stats
  const todayProductionM3 = 186.5;
  const monthProductionM3 = 4280.0;
  const activeTripsCount = 4;
  const idleMixersCount = 3;
  const totalMixers = 8;
  const totalBatchesToday = 31;

  const hourlyBatches = [
    { time: '08:00 AM', m3: 18.0, batches: 3 },
    { time: '09:00 AM', m3: 24.5, batches: 4 },
    { time: '10:00 AM', m3: 36.0, batches: 6 },
    { time: '11:00 AM', m3: 42.0, batches: 7 },
    { time: '12:00 PM', m3: 30.0, batches: 5 },
    { time: '01:00 PM', m3: 18.0, batches: 3 },
    { time: '02:00 PM', m3: 18.0, batches: 3 },
  ];

  const fleetStatus = [
    { id: 'TM-01', reg: 'MH-12-RN-4401', driver: 'Ramesh Pawar', status: 'En Route', grade: 'M30', dest: 'Godrej Woods' },
    { id: 'TM-02', reg: 'MH-12-RN-8822', driver: 'Sanjay Yadav', status: 'Pouring', grade: 'M25', dest: 'Rohan Abhilasha' },
    { id: 'TM-03', reg: 'MH-14-BT-1920', driver: 'Mahesh Shinde', status: 'En Route', grade: 'M35', dest: 'Life Republic' },
    { id: 'TM-04', reg: 'MH-12-PQ-9003', driver: 'Deepak Gaikwad', status: 'Returning', grade: 'M25', dest: 'VTP Pegasus' },
    { id: 'TM-05', reg: 'MH-12-WE-3310', driver: 'Santosh Jadhav', status: 'Available', grade: '--', dest: 'Plant Yard' },
    { id: 'TM-06', reg: 'MH-12-KA-5509', driver: 'Anil Kadam', status: 'Available', grade: '--', dest: 'Plant Yard' },
    { id: 'TM-07', reg: 'MH-14-GH-7788', driver: 'Pravin More', status: 'Loading', grade: 'M20', dest: 'Khandge Heights' },
    { id: 'TM-08', reg: 'MH-12-TY-1122', driver: 'Sunil Bhosale', status: 'Maintenance', grade: '--', dest: 'Workshop' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live SCADA Batching Plant Active
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-2">Plant Operations Control Centre (प्लॅन्ट डॅशबोर्ड)</h1>
          <p className="text-sm text-slate-300 mt-1">
            Real-time batching status, transit mixer fleet telematics, aggregate storage bins & cement silos.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab && onNavigateTab('batching-sheets')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
          >
            <Layers size={15} />
            <span>+ Batching Sheet</span>
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('delivery-challans')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
          >
            <FileText size={15} />
            <span>+ Delivery Challan</span>
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('material-inward')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
          >
            <PackageCheck size={15} />
            <span>+ Material Inward</span>
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Concrete Output</p>
            <p className="text-3xl font-black text-blue-900 mt-1">{todayProductionM3} <span className="text-sm font-semibold text-gray-600">m³</span></p>
            <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp size={13} /> {totalBatchesToday} total batches mixed
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers size={28} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Concrete Yield</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{monthProductionM3.toLocaleString()} <span className="text-sm font-semibold text-gray-600">m³</span></p>
            <p className="text-xs text-gray-500 font-semibold mt-1">Target: 5,000 m³ (85.6%)</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={28} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transit Mixers Active</p>
            <p className="text-3xl font-black text-indigo-900 mt-1">{activeTripsCount} <span className="text-sm font-semibold text-gray-600">/ {totalMixers}</span></p>
            <p className="text-xs text-indigo-600 font-bold mt-1">
              {idleMixersCount} idle in plant yard
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Truck size={28} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plant Operational Health</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">99.2%</p>
            <p className="text-xs text-gray-500 font-semibold mt-1">SCADA Online • Zero trips halted</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity size={28} />
          </div>
        </div>
      </div>

      {/* Hourly Output Bar Overview & Silo Stocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Production */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                Hourly Concrete Production (आजचे तासनिहाय उत्पादन)
              </h3>
              <p className="text-xs text-gray-500">Hourly m³ batched through Pan Mixer</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Shift A (08:00 AM - 04:00 PM)
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {hourlyBatches.map((slot) => {
              const maxM3 = 50;
              const pct = Math.min(100, Math.round((slot.m3 / maxM3) * 100));
              return (
                <div key={slot.time} className="flex items-center gap-3 text-xs">
                  <span className="w-20 font-mono font-semibold text-gray-600">{slot.time}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2 text-white font-bold text-[10px]"
                      style={{ width: `${pct}%` }}
                    >
                      {slot.m3 > 15 ? `${slot.m3} m³` : ''}
                    </div>
                  </div>
                  <span className="w-24 font-bold text-gray-800 text-right">
                    {slot.m3} m³ <span className="font-normal text-gray-500">({slot.batches} b)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Silos & Bin Levels Quick Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <PackageCheck size={16} className="text-amber-600" />
                Raw Material Stocks
              </h3>
              <button
                onClick={() => onNavigateTab && onNavigateTab('material-inward')}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                View Silos →
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">Cement Silo 1 (OPC 53)</span>
                  <span className="text-blue-800">72.5 / 100 MT (72%)</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">Fly Ash Silo 2 (Dirk Pozzocrete)</span>
                  <span className="text-purple-800">48.0 / 80 MT (60%)</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">20mm Aggregates (Bin A)</span>
                  <span className="text-emerald-800">145 / 200 MT (72%)</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700">Crush Sand (Bin C)</span>
                  <span className="text-amber-800">190 / 250 MT (76%)</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-amber-600 h-full rounded-full" style={{ width: '76%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 font-semibold mt-4">
            ✓ All raw material levels sufficient for next 48 hours of scheduled continuous production.
          </div>
        </div>
      </div>

      {/* Transit Mixer Fleet Live Board */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Truck size={17} className="text-blue-600" />
              Live Mixer Fleet Tracking (ट्रान्झिट मिक्सर लाईव्ह ट्रॅकिंग)
            </h3>
            <p className="text-xs text-gray-500">Real-time status of all transit mixers assigned to this plant</p>
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('driver-trips')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-gray-300 px-3 py-1.5 rounded-lg shadow-sm"
          >
            Manage Driver Trips →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Mixer ID</th>
                <th className="py-3 px-4">Vehicle Reg No</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Destination Site</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fleetStatus.map((mixer) => {
                let badgeClass = 'bg-gray-100 text-gray-700';
                if (mixer.status === 'En Route') badgeClass = 'bg-blue-100 text-blue-800 border border-blue-200';
                if (mixer.status === 'Pouring') badgeClass = 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse';
                if (mixer.status === 'Returning') badgeClass = 'bg-purple-100 text-purple-800 border border-purple-200';
                if (mixer.status === 'Available') badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                if (mixer.status === 'Maintenance') badgeClass = 'bg-rose-100 text-rose-800 border border-rose-200';

                return (
                  <tr key={mixer.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{mixer.id}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{mixer.reg}</td>
                    <td className="py-3 px-4 text-gray-700">{mixer.driver}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${badgeClass}`}>
                        {mixer.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-800">{mixer.grade}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{mixer.dest}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
