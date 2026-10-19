import React, { useState } from 'react';
import { Truck, CheckCircle2, AlertCircle, Wrench, ShieldCheck, Search } from 'lucide-react';

const INITIAL_VEHICLES = [
  { id: 'TM-01', vehicleNo: 'MH-10-CR-1212', type: 'Transit Mixer (6 m³)', model: 'Tata Signa 2823.K RMC', driver: 'Sachin Shinde', status: 'On Delivery', fitnessValidTill: '15-Dec-2026', insuranceValidTill: '20-Nov-2026' },
  { id: 'TM-02', vehicleNo: 'MH-10-CR-1313', type: 'Transit Mixer (6 m³)', model: 'Ashok Leyland 2820 RMC', driver: 'Vikas Jadhav', status: 'Available / Plant', fitnessValidTill: '28-Jan-2027', insuranceValidTill: '10-Dec-2026' },
  { id: 'TM-03', vehicleNo: 'MH-10-CR-1414', type: 'Transit Mixer (7 m³)', model: 'BharatBenz 2828C RMC', driver: 'Mahesh Mane', status: 'Loading', fitnessValidTill: '05-Mar-2027', insuranceValidTill: '18-Feb-2027' },
  { id: 'PUMP-01', vehicleNo: 'MH-10-CR-9090', type: 'Concrete Boom Pump (36m)', model: 'Schwing Stetter S36X', driver: 'Raju Salunkhe', status: 'Site Deployed', fitnessValidTill: '10-Aug-2027', insuranceValidTill: '14-Jul-2027' },
  { id: 'PUMP-02', vehicleNo: 'MH-10-CR-9091', type: 'Stationary Line Pump', model: 'Putzmeister BSA 1407 D', driver: 'Anand Patil', status: 'Available / Plant', fitnessValidTill: '22-Sep-2027', insuranceValidTill: '30-Aug-2027' },
];

export default function VehicleManagementView() {
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES);
  const [search, setSearch] = useState('');

  const filtered = vehicles.filter(v => 
    v.vehicleNo.toLowerCase().includes(search.toLowerCase()) ||
    v.type.toLowerCase().includes(search.toLowerCase()) ||
    v.driver.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-4 text-xs text-slate-800">
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
    </div>
  );
}
