import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Droplet,
  Zap,
  Truck,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  FileSpreadsheet
} from 'lucide-react';

const STORAGE_KEY = 'rmc_diesel_management_v2';

const INITIAL_LOGS = [
  {
    id: 'DSL-2026-061',
    date: '2026-10-19',
    time: '07:30 AM',
    equipmentType: 'Transit Mixer',
    vehicleNo: 'MH-12-RN-4401 (TM-01)',
    liters: 65,
    ratePerLiter: 92.5,
    totalCost: 6012.5,
    currentOdo: 84320,
    previousOdo: 84080,
    kmDriven: 240,
    mileageKmPerL: 3.69,
    operator: 'Ramesh Pawar',
    dispensedBy: 'Bapu Patil (Plant Tech)'
  },
  {
    id: 'DSL-2026-062',
    date: '2026-10-19',
    time: '08:15 AM',
    equipmentType: 'Transit Mixer',
    vehicleNo: 'MH-12-RN-8822 (TM-02)',
    liters: 70,
    ratePerLiter: 92.5,
    totalCost: 6475.0,
    currentOdo: 62110,
    previousOdo: 61860,
    kmDriven: 250,
    mileageKmPerL: 3.57,
    operator: 'Sanjay Kumar Yadav',
    dispensedBy: 'Bapu Patil (Plant Tech)'
  },
  {
    id: 'DSL-2026-063',
    date: '2026-10-19',
    time: '09:00 AM',
    equipmentType: 'Wheel Loader',
    vehicleNo: 'CAT 930K Loader',
    liters: 50,
    ratePerLiter: 92.5,
    totalCost: 4625.0,
    currentOdo: 4890,
    previousOdo: 4850,
    kmDriven: 40, // hours
    mileageKmPerL: 1.25, // L/hr
    operator: 'Vikram Salve',
    dispensedBy: 'Bapu Patil (Plant Tech)'
  },
  {
    id: 'DSL-2026-064',
    date: '2026-10-18',
    time: '06:00 PM',
    equipmentType: 'DG Set Generator',
    vehicleNo: 'Cummins 250 kVA DG',
    liters: 80,
    ratePerLiter: 92.5,
    totalCost: 7400.0,
    currentOdo: 1240,
    previousOdo: 1210,
    kmDriven: 30, // hours run
    mileageKmPerL: 2.67, // L/hr
    operator: 'Ganesh (Electrician)',
    dispensedBy: 'Bapu Patil (Plant Tech)'
  }
];

export default function DieselManagementView() {
  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  const [tankCapacity] = useState(10000); // 10,000 Litres underground HSD tank
  const [currentTankStock, setCurrentTankStock] = useState(6450); // Litres in stock
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    equipmentType: 'Transit Mixer',
    vehicleNo: 'MH-12-RN-4401 (TM-01)',
    liters: 60,
    ratePerLiter: 92.5,
    currentOdo: 84500,
    previousOdo: 84320,
    operator: 'Ramesh Pawar',
    dispensedBy: 'Bapu Patil (Plant Tech)'
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (err) {
      console.error('Failed to save diesel logs:', err);
    }
  }, [logs]);

  const handleCreateEntry = (e) => {
    e.preventDefault();
    const l = Number(newEntry.liters) || 0;
    const rate = Number(newEntry.ratePerLiter) || 92.5;
    const total = l * rate;
    const cur = Number(newEntry.currentOdo) || 0;
    const prev = Number(newEntry.previousOdo) || 0;
    const diff = Math.max(0, cur - prev);
    const mileage = l > 0 && diff > 0 ? Number((diff / l).toFixed(2)) : 0;

    const entry = {
      id: `DSL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      ...newEntry,
      liters: l,
      ratePerLiter: rate,
      totalCost: total,
      currentOdo: cur,
      previousOdo: prev,
      kmDriven: diff,
      mileageKmPerL: mileage
    };

    setLogs([entry, ...logs]);
    setCurrentTankStock(prev => Math.max(0, prev - l));
    setIsModalOpen(false);
  };

  const filteredLogs = logs.filter(item => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.operator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || item.equipmentType === filterType;
    return matchesSearch && matchesType;
  });

  const totalFuelDispensed = logs.reduce((acc, item) => acc + Number(item.liters || 0), 0);
  const totalCostDispensed = logs.reduce((acc, item) => acc + Number(item.totalCost || 0), 0);
  const tankPercentage = Math.round((currentTankStock / tankCapacity) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-orange-900 to-slate-900 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-600/60 text-amber-200 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Fuel & Energy Management
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Diesel & Fuel Dispensation (डिझेल व्यवस्थापन)</h1>
          <p className="text-sm text-amber-200/80 mt-1">
            Track underground HSD storage tank, pump dispensing, mixer mileage, and DG set power generator consumption.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-lg shadow transition active:scale-95"
        >
          <Plus size={18} />
          <span>Record Fuel Dispense</span>
        </button>
      </div>

      {/* Fuel Tank Stock Gauge & KPI summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Tank Level Visualizer */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                <Fuel size={16} className="text-amber-600" />
                HSD Main Storage Tank (10 KL)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Safe Level
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-gray-900">{currentTankStock.toLocaleString()} L</span>
              <span className="text-sm text-gray-500">/ {tankCapacity.toLocaleString()} L</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Underground Diesel Storage Tank (PESO Compliant)</p>
          </div>

          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  tankPercentage > 30 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${tankPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 mt-2 font-semibold">
              <span>{tankPercentage}% Remaining</span>
              <span>Reorder Alert: &lt; 2,000 L</span>
            </div>
          </div>
        </div>

        {/* Total Cost Dispensed */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
              <Droplet size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Fuel Dispensed</p>
              <p className="text-2xl font-black text-gray-900">{totalFuelDispensed.toLocaleString()} <span className="text-sm font-normal text-gray-500">Liters</span></p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t flex justify-between items-center text-sm">
            <span className="text-gray-500 font-medium">Total Cost Value:</span>
            <span className="font-black text-emerald-700 text-lg">₹{totalCostDispensed.toLocaleString()}</span>
          </div>
        </div>

        {/* Average Fleet Economy */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Transit Mixer Mileage</p>
              <p className="text-2xl font-black text-gray-900">3.65 <span className="text-sm font-normal text-gray-500">km / Liter</span></p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t flex justify-between items-center text-sm">
            <span className="text-gray-500 font-medium">DG Set Fuel Consumption:</span>
            <span className="font-bold text-amber-700">~2.7 L / hr (Avg)</span>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search Slip ID, Vehicle No, Driver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'Transit Mixer', 'Wheel Loader', 'DG Set Generator'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterType === type
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'ALL' ? 'All Equipment' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Fuel Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Activity size={16} className="text-amber-600" />
            Diesel Dispensation Register (डिझेल वितरण नोंदवही)
          </h3>
          <span className="text-xs text-gray-500 font-medium">{filteredLogs.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Slip ID / Date</th>
                <th className="py-3 px-4">Equipment & Vehicle</th>
                <th className="py-3 px-4 text-right">Liters Dispensed</th>
                <th className="py-3 px-4 text-right">Rate / Total (₹)</th>
                <th className="py-3 px-4 text-center">Odo / Run</th>
                <th className="py-3 px-4 text-center">Mileage / Economy</th>
                <th className="py-3 px-4">Operator & Issued By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No diesel records found matching your query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-amber-50/40 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 font-mono">{log.id}</p>
                      <p className="text-xs text-gray-500">{log.date} • {log.time}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-800">{log.vehicleNo}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {log.equipmentType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-amber-800 text-base">
                      {log.liters} L
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-gray-900">₹{log.totalCost.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">@ ₹{log.ratePerLiter}/L</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <p className="font-bold text-gray-800">{log.currentOdo.toLocaleString()} km</p>
                      <p className="text-xs text-gray-500">+{log.kmDriven} km run</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        log.mileageKmPerL >= 3.5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {log.mileageKmPerL} {log.equipmentType === 'DG Set Generator' || log.equipmentType === 'Wheel Loader' ? 'L/hr' : 'km/L'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <p className="font-semibold text-gray-800">{log.operator}</p>
                      <p className="text-gray-500">By: {log.dispensedBy}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Fuel Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Fuel className="text-amber-600" size={20} />
                Record Diesel Dispensing (डिझेल वितरण नोंद)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Equipment Type</label>
                  <select
                    value={newEntry.equipmentType}
                    onChange={(e) => {
                      const type = e.target.value;
                      let veh = 'MH-12-RN-4401 (TM-01)';
                      let op = 'Ramesh Pawar';
                      if (type === 'Wheel Loader') { veh = 'CAT 930K Loader'; op = 'Vikram Salve'; }
                      if (type === 'DG Set Generator') { veh = 'Cummins 250 kVA DG'; op = 'Ganesh (Electrician)'; }
                      setNewEntry({ ...newEntry, equipmentType: type, vehicleNo: veh, operator: op });
                    }}
                    className="w-full border rounded-lg p-2 bg-gray-50"
                  >
                    <option value="Transit Mixer">Transit Mixer</option>
                    <option value="Wheel Loader">Wheel Loader</option>
                    <option value="DG Set Generator">DG Set Generator</option>
                    <option value="Concrete Boom Pump">Concrete Boom Pump</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle / Asset Name</label>
                  <input
                    type="text"
                    value={newEntry.vehicleNo}
                    onChange={(e) => setNewEntry({ ...newEntry, vehicleNo: e.target.value })}
                    className="w-full border rounded-lg p-2 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fuel Dispensed (Liters) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={newEntry.liters}
                    onChange={(e) => setNewEntry({ ...newEntry, liters: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 font-bold text-amber-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Diesel Rate (₹ / Liter)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newEntry.ratePerLiter}
                    onChange={(e) => setNewEntry({ ...newEntry, ratePerLiter: parseFloat(e.target.value) || 92.5 })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Previous Odo / Hour Reading</label>
                  <input
                    type="number"
                    value={newEntry.previousOdo}
                    onChange={(e) => setNewEntry({ ...newEntry, previousOdo: parseInt(e.target.value, 10) || 0 })}
                    className="w-full border rounded-lg p-2 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Current Odo / Hour Reading</label>
                  <input
                    type="number"
                    value={newEntry.currentOdo}
                    onChange={(e) => setNewEntry({ ...newEntry, currentOdo: parseInt(e.target.value, 10) || 0 })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Driver / Operator Name</label>
                  <input
                    type="text"
                    value={newEntry.operator}
                    onChange={(e) => setNewEntry({ ...newEntry, operator: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dispensed By (Tech / Security)</label>
                  <input
                    type="text"
                    value={newEntry.dispensedBy}
                    onChange={(e) => setNewEntry({ ...newEntry, dispensedBy: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs flex justify-between items-center">
                <span className="text-amber-900 font-semibold">Total Cost:</span>
                <span className="text-base font-black text-amber-900">
                  ₹{((Number(newEntry.liters) || 0) * (Number(newEntry.ratePerLiter) || 92.5)).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow"
                >
                  Save Dispense Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
