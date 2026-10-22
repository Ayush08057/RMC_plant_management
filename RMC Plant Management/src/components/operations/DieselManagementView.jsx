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
  FileSpreadsheet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldAlert,
  Gauge,
  X,
  Check,
  Building2
} from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';
import { calculateDieselMileage, calculateEquipmentHourlyConsumption } from '../../services/plantOperationsService';

const STORAGE_KEY = 'rmc_diesel_management_v2';
const INWARD_STORAGE_KEY = 'rmc_diesel_inward_v2';
const TANK_STOCK_STORAGE_KEY = 'rmc_diesel_tank_stock_v2';

const INITIAL_LOGS = [];
const INITIAL_INWARD_LOGS = [];

export default function DieselManagementView() {
  const [subTab, setSubTab] = useState('dispense'); // 'dispense' | 'inward'

  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  const [inwardLogs, setInwardLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(INWARD_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_INWARD_LOGS;
    } catch {
      return INITIAL_INWARD_LOGS;
    }
  });

  const tankCapacity = 10000; // 10,000 Litres underground HSD tank
  const [currentTankStock, setCurrentTankStock] = useState(() => {
    try {
      const saved = localStorage.getItem(TANK_STOCK_STORAGE_KEY);
      return saved !== null ? Number(saved) : 6450;
    } catch {
      return 6450;
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState('');

  // Dispense Form State
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    equipmentType: 'Transit Mixer',
    vehicleNo: 'MH-10-CR-1212',
    liters: 60,
    ratePerLiter: 92.5,
    currentOdo: 14280,
    previousOdo: 14050,
    operator: 'Sachin Shinde',
    dispensedBy: 'Plant Supervisor'
  });

  // Inward Tanker Form State
  const [newInward, setNewInward] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    supplierName: 'Bharat Petroleum (Miraj Depot)',
    invoiceNo: `BPCL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    tankerVehicleNo: 'MH-10-AQ-9911',
    litersReceived: 3000,
    ratePerLiter: 91.2,
    receivedBy: 'Plant Incharge',
    remarks: 'Standard commercial HSD replenishment'
  });

  // Subscribe to real-time Cloud Sync for cross-device updates
  useEffect(() => {
    const unsubDispense = subscribeCloudStore('cloud_diesel_management', STORAGE_KEY, INITIAL_LOGS, (cloudLogs) => {
      if (Array.isArray(cloudLogs)) setLogs(cloudLogs);
    });
    const unsubInward = subscribeCloudStore('cloud_diesel_inward', INWARD_STORAGE_KEY, INITIAL_INWARD_LOGS, (cloudInward) => {
      if (Array.isArray(cloudInward)) setInwardLogs(cloudInward);
    });
    const unsubTank = subscribeCloudStore('cloud_diesel_tank_stock', TANK_STOCK_STORAGE_KEY, { stock: 6450 }, (cloudTank) => {
      if (cloudTank && typeof cloudTank === 'object' && cloudTank.stock !== undefined) {
        const val = Number(cloudTank.stock);
        if (!isNaN(val)) setCurrentTankStock(val);
      }
    });
    return () => {
      unsubDispense();
      unsubInward();
      unsubTank();
    };
  }, []);

  // Save changes to localStorage & Cloud Firestore
  useEffect(() => {
    pushCloudStore('cloud_diesel_management', STORAGE_KEY, logs);
  }, [logs]);

  useEffect(() => {
    pushCloudStore('cloud_diesel_inward', INWARD_STORAGE_KEY, inwardLogs);
  }, [inwardLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(TANK_STOCK_STORAGE_KEY, currentTankStock.toString());
      pushCloudStore('cloud_diesel_tank_stock', TANK_STOCK_STORAGE_KEY, { stock: currentTankStock });
    } catch {}
  }, [currentTankStock]);

  // Handle Dispense
  const handleCreateEntry = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const l = Number(newEntry.liters) || 0;
    if (l <= 0) {
      setErrorMessage('Please enter a valid volume greater than 0 Litres.');
      return;
    }

    // STRICT CHECK: Cannot dispense more than current stock in tank
    if (l > currentTankStock) {
      setErrorMessage(`Insufficient Fuel Stock! Requested ${l} L, but only ${currentTankStock.toLocaleString()} L remains in the underground tank.`);
      return;
    }

    const rate = Number(newEntry.ratePerLiter) || 92.5;
    const total = l * rate;
    const cur = Number(newEntry.currentOdo) || 0;
    const prev = Number(newEntry.previousOdo) || 0;
    const diff = Math.max(0, cur - prev);

    let mileage = null;
    let hourlyConsumption = null;

    if (newEntry.equipmentType === 'Transit Mixer') {
      mileage = calculateDieselMileage(diff, l);
    } else {
      hourlyConsumption = calculateEquipmentHourlyConsumption(l, diff);
    }

    const entry = {
      id: `DSL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      ...newEntry,
      liters: l,
      ratePerLiter: rate,
      totalCost: total,
      currentOdo: cur,
      previousOdo: prev,
      kmDriven: diff,
      mileageKmPerL: mileage,
      consumptionLPerHr: hourlyConsumption,
      tankLevelAfter: currentTankStock - l
    };

    setLogs([entry, ...logs]);
    setCurrentTankStock(prev => Math.max(0, prev - l));

    // Update vehicle fleet odometer & mileage without overwriting unrelated data
    try {
      const vehKey = 'rmc_plant_vehicles_v2';
      const vehRaw = localStorage.getItem(vehKey);
      if (vehRaw) {
        const vehList = JSON.parse(vehRaw);
        const updatedVehs = vehList.map(v => {
          if (v.vehicleNo === newEntry.vehicleNo) {
            return {
              ...v,
              currentOdometer: cur > 0 ? cur : v.currentOdometer,
              lastMileageKmPerL: mileage !== null ? mileage : v.lastMileageKmPerL,
              lastRefuelDate: newEntry.date
            };
          }
          return v;
        });
        localStorage.setItem(vehKey, JSON.stringify(updatedVehs));
        pushCloudStore('cloud_plant_vehicles', vehKey, updatedVehs);
      }
    } catch (e) {
      console.warn('Vehicle sync error:', e);
    }

    setIsModalOpen(false);
  };

  // Handle Inward Tanker Refill
  const handleCreateInwardEntry = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const recLiters = Number(newInward.litersReceived) || 0;
    if (recLiters <= 0) {
      setErrorMessage('Please enter a valid received volume greater than 0 Litres.');
      return;
    }

    const rate = Number(newInward.ratePerLiter) || 91.2;
    const total = recLiters * rate;
    const newStock = Math.min(tankCapacity, currentTankStock + recLiters);

    const inwardEntry = {
      id: `DSL-IN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      ...newInward,
      litersReceived: recLiters,
      ratePerLiter: rate,
      totalAmount: total,
      tankLevelAfter: newStock
    };

    setInwardLogs([inwardEntry, ...inwardLogs]);
    setCurrentTankStock(newStock);
    setIsInwardModalOpen(false);
  };

  const filteredLogs = logs.filter(item => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.operator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || item.equipmentType === filterType;
    return matchesSearch && matchesType;
  });

  const filteredInward = inwardLogs.filter(item => {
    return (
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tankerVehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalFuelDispensed = logs.reduce((acc, item) => acc + Number(item.liters || 0), 0);
  const totalCostDispensed = logs.reduce((acc, item) => acc + Number(item.totalCost || 0), 0);
  const totalFuelReceived = inwardLogs.reduce((acc, item) => acc + Number(item.litersReceived || 0), 0);
  const tankPercentage = Math.round((currentTankStock / tankCapacity) * 100);
  const isLowStock = currentTankStock < 2000;

  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-8">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold shrink-0">
            <Fuel size={16} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-tight">Diesel Management & HSD Telemetry</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Underground 10 KL storage tank, dispenser pump issues, tanker inward, and equipment consumption
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setErrorMessage('');
              setIsInwardModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowDownToLine size={14} />
            <span>Receive Diesel Tanker</span>
          </button>
          <button
            onClick={() => {
              setErrorMessage('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowUpFromLine size={14} />
            <span>Issue / Dispense Fuel</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {isLowStock && (
        <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 flex items-center justify-between text-xs font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              CRITICAL LOW DIESEL LEVEL: Current tank stock is {currentTankStock.toLocaleString()} L (Below 2,000 L safety reorder threshold).
            </span>
          </div>
          <button
            onClick={() => setIsInwardModalOpen(true)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-black cursor-pointer shadow-2xs shrink-0"
          >
            Order Refill Tanker Now
          </button>
        </div>
      )}

      {/* Fuel Tank Stock Gauge & KPI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Main Tank Level Visualizer */}
        <div className="bg-gradient-to-b from-amber-50/35 via-white to-white rounded-xl p-3.5 sm:p-4 pt-4 border-2 border-amber-400 hover:border-amber-500 shadow-xs hover:shadow-amber-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500 transition-all group-hover:h-[4px]" />
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                <Fuel size={14} className="text-amber-600" />
                HSD Underground Tank (10 KL)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLowStock ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {isLowStock ? 'Reorder Warning' : 'Safe Operating Level'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-gray-900">{currentTankStock.toLocaleString()} L</span>
              <span className="text-xs text-gray-500">/ {tankCapacity.toLocaleString()} L capacity</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Heavy Speed Diesel Storage Tank (PESO Compliant)</p>
          </div>

          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  tankPercentage > 30 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, tankPercentage))}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1.5 font-semibold">
              <span>{tankPercentage}% Available</span>
              <span>Reorder Alert: &lt; 2,000 L</span>
            </div>
          </div>
        </div>

        {/* Total Cost Dispensed */}
        <div className="bg-gradient-to-b from-emerald-50/35 via-white to-white rounded-xl p-3.5 sm:p-4 pt-4 border-2 border-emerald-400 hover:border-emerald-500 shadow-xs hover:shadow-emerald-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500 transition-all group-hover:h-[4px]" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100/90 text-emerald-700 border border-emerald-300 rounded-lg shadow-2xs">
              <Droplet size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-semibold uppercase">Total Fuel Dispensed</p>
              <p className="text-xl font-black text-gray-900">{totalFuelDispensed.toLocaleString()} <span className="text-xs font-normal text-gray-500">L</span></p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-emerald-100 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Total Cost Value:</span>
            <span className="font-black text-emerald-700 text-sm">₹{totalCostDispensed.toLocaleString()}</span>
          </div>
        </div>

        {/* Inward Fuel Stock Received */}
        <div className="bg-gradient-to-b from-blue-50/35 via-white to-white rounded-xl p-3.5 sm:p-4 pt-4 border-2 border-blue-400 hover:border-blue-500 shadow-xs hover:shadow-blue-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#136dec] transition-all group-hover:h-[4px]" />
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100/90 text-[#136dec] border border-blue-300 rounded-lg shadow-2xs">
              <ArrowDownToLine size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-semibold uppercase">Total Fuel Received (Inward)</p>
              <p className="text-xl font-black text-blue-900">{totalFuelReceived.toLocaleString()} <span className="text-xs font-normal text-gray-500">L</span></p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Inward Tanker Refills:</span>
            <span className="font-bold text-blue-700">{inwardLogs.length} Deliveries</span>
          </div>
        </div>
      </div>

      {/* Subtab Navigation Pills */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setSubTab('dispense')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'dispense'
              ? 'bg-amber-500 text-slate-950 shadow-2xs ring-1 ring-amber-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ArrowUpFromLine size={14} />
          <span>Diesel Issues & Dispensation ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('inward')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'inward'
              ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-700'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ArrowDownToLine size={14} />
          <span>Diesel Inward & Tank Refills ({inwardLogs.length})</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row gap-2.5 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder={subTab === 'dispense' ? "Search Slip ID, Vehicle No, Driver..." : "Search Inward ID, Supplier, Tanker No..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {subTab === 'dispense' && (
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['ALL', 'Transit Mixer', 'Wheel Loader', 'DG Set Generator', 'Concrete Boom Pump'].map((type) => (
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
        )}
      </div>

      {/* TAB 1: DIESEL DISPENSATION REGISTER */}
      {subTab === 'dispense' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Activity size={16} className="text-amber-600" />
              Diesel Dispensation Register
            </h3>
            <span className="text-xs text-gray-500 font-medium">{filteredLogs.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
                <tr>
                  <th className="py-3 px-4 text-white border-r border-white/20">Slip ID / Date</th>
                  <th className="py-3 px-4 text-white border-r border-white/20">Equipment & Vehicle</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Liters Dispensed</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Rate / Total (₹)</th>
                  <th className="py-3 px-4 text-center text-white border-r border-white/20">Odo / Hours Run</th>
                  <th className="py-3 px-4 text-center text-white border-r border-white/20">Mileage / Economy</th>
                  <th className="py-3 px-4 text-white">Operator & Issued By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      No diesel records found matching your query. Click "Issue / Dispense Fuel" to record an entry.
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
                        <p className="font-bold text-gray-800 font-mono">{log.currentOdo.toLocaleString()} {log.equipmentType === 'Transit Mixer' ? 'km' : 'hrs'}</p>
                        <p className="text-xs text-gray-500">+{log.kmDriven} {log.equipmentType === 'Transit Mixer' ? 'km run' : 'hrs run'}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {log.equipmentType === 'Transit Mixer' ? (
                          log.mileageKmPerL ? (
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              log.mileageKmPerL >= 3.5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {log.mileageKmPerL} km/L
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-500">
                              Mileage Not Available
                            </span>
                          )
                        ) : (
                          log.consumptionLPerHr ? (
                            <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                              {log.consumptionLPerHr} L/hr
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-500">
                              Rate Not Available
                            </span>
                          )
                        )}
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
      )}

      {/* TAB 2: DIESEL INWARD & TANK REFILLS */}
      {subTab === 'inward' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <ArrowDownToLine size={16} className="text-blue-600" />
              Diesel Inward & Bulk Tank Replenishment Register
            </h3>
            <span className="text-xs text-gray-500 font-medium">{filteredInward.length} Deliveries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
                <tr>
                  <th className="py-3 px-4 text-white border-r border-white/20">Inward Entry # / Date</th>
                  <th className="py-3 px-4 text-white border-r border-white/20">Petroleum Supplier & Tanker No</th>
                  <th className="py-3 px-4 text-white border-r border-white/20">Invoice / Challan #</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Litres Received</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Rate / Total (₹)</th>
                  <th className="py-3 px-4 text-center text-white border-r border-white/20">Tank Level After</th>
                  <th className="py-3 px-4 text-white">Received By & Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInward.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      No bulk tanker inward entries recorded yet. Click "Receive Diesel Tanker" to record a delivery.
                    </td>
                  </tr>
                ) : (
                  filteredInward.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900 font-mono">{item.id}</p>
                        <p className="text-xs text-gray-500">{item.date} • {item.time}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900">{item.supplierName}</p>
                        <p className="text-xs font-mono font-bold text-blue-700">Tanker: {item.tankerVehicleNo}</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {item.invoiceNo || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-blue-900 text-base">
                        +{Number(item.litersReceived).toLocaleString()} L
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-bold text-gray-900">₹{Number(item.totalAmount).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">@ ₹{item.ratePerLiter}/L</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {Number(item.tankLevelAfter).toLocaleString()} L
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <p className="font-semibold text-gray-800">{item.receivedBy}</p>
                        <p className="text-gray-500 truncate max-w-xs">{item.remarks || '--'}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD FUEL DISPENSING */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 border border-slate-300">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Fuel className="text-amber-600" size={18} />
                Issue & Dispense Fuel
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateEntry} className="space-y-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                <span className="text-slate-600 font-bold">Current Underground Tank Stock:</span>
                <span className="font-mono font-black text-amber-700 text-sm">{currentTankStock.toLocaleString()} Litres</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Equipment Type</label>
                  <select
                    value={newEntry.equipmentType}
                    onChange={(e) => {
                      const type = e.target.value;
                      let veh = 'MH-10-CR-1212';
                      let op = 'Sachin Shinde';
                      let prev = 14050;
                      let cur = 14280;
                      if (type === 'Wheel Loader') { veh = 'CAT 930K Loader'; op = 'Vikram Salve'; prev = 1200; cur = 1208; }
                      if (type === 'DG Set Generator') { veh = 'Cummins 250 kVA DG'; op = 'Ganesh (Electrician)'; prev = 450; cur = 462; }
                      if (type === 'Concrete Boom Pump') { veh = 'Schwing Stetter 36M'; op = 'Anil Deshmukh'; prev = 850; cur = 860; }
                      setNewEntry({ ...newEntry, equipmentType: type, vehicleNo: veh, operator: op, previousOdo: prev, currentOdo: cur });
                    }}
                    className="w-full border rounded-lg p-2 bg-gray-50 text-xs font-semibold"
                  >
                    <option value="Transit Mixer">Transit Mixer</option>
                    <option value="Wheel Loader">Wheel Loader</option>
                    <option value="DG Set Generator">DG Set Generator</option>
                    <option value="Concrete Boom Pump">Concrete Boom Pump</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle / Asset Reg #</label>
                  <input
                    type="text"
                    value={newEntry.vehicleNo}
                    onChange={(e) => setNewEntry({ ...newEntry, vehicleNo: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fuel Dispensed (Litres) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max={currentTankStock}
                    value={newEntry.liters}
                    onChange={(e) => setNewEntry({ ...newEntry, liters: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 font-black text-amber-800 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Diesel Rate (₹ / Litre)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newEntry.ratePerLiter}
                    onChange={(e) => setNewEntry({ ...newEntry, ratePerLiter: parseFloat(e.target.value) || 92.5 })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {newEntry.equipmentType === 'Transit Mixer' ? 'Previous Odo (km)' : 'Previous Hour Meter'}
                  </label>
                  <input
                    type="number"
                    value={newEntry.previousOdo}
                    onChange={(e) => setNewEntry({ ...newEntry, previousOdo: parseInt(e.target.value, 10) || 0 })}
                    className="w-full border rounded-lg p-2 bg-gray-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {newEntry.equipmentType === 'Transit Mixer' ? 'Current Odo (km)' : 'Current Hour Meter'}
                  </label>
                  <input
                    type="number"
                    value={newEntry.currentOdo}
                    onChange={(e) => setNewEntry({ ...newEntry, currentOdo: parseInt(e.target.value, 10) || 0 })}
                    className="w-full border rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Driver / Equipment Operator</label>
                  <input
                    type="text"
                    value={newEntry.operator}
                    onChange={(e) => setNewEntry({ ...newEntry, operator: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dispensed By (Supervisor)</label>
                  <input
                    type="text"
                    value={newEntry.dispensedBy}
                    onChange={(e) => setNewEntry({ ...newEntry, dispensedBy: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex justify-between items-center">
                <div>
                  <span className="text-amber-900 font-bold block">Total Fuel Cost:</span>
                  <span className="text-[10px] text-amber-700 font-mono">{newEntry.liters} L × ₹{newEntry.ratePerLiter}/L</span>
                </div>
                <span className="text-base font-black text-amber-900">
                  ₹{((Number(newEntry.liters) || 0) * (Number(newEntry.ratePerLiter) || 92.5)).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-gray-700 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow cursor-pointer"
                >
                  Save Dispense Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEIVE DIESEL BULK TANKER (INWARD) */}
      {isInwardModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 border border-slate-300">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-base font-black text-blue-900 flex items-center gap-2">
                <ArrowDownToLine className="text-blue-600" size={18} />
                Receive Diesel Tanker (Bulk Refill)
              </h3>
              <button
                onClick={() => setIsInwardModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateInwardEntry} className="space-y-3.5 text-xs">
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex justify-between items-center">
                <span className="text-blue-900 font-bold">Available Tank Capacity:</span>
                <span className="font-mono font-black text-blue-900 text-sm">
                  {(tankCapacity - currentTankStock).toLocaleString()} Litres Space Available
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Petroleum Supplier / Depot *</label>
                <input
                  type="text"
                  value={newInward.supplierName}
                  onChange={(e) => setNewInward({ ...newInward, supplierName: e.target.value })}
                  placeholder="e.g. Bharat Petroleum Corporation Ltd (Miraj Depot)"
                  className="w-full border rounded-lg p-2 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Supplier Invoice / Challan #</label>
                  <input
                    type="text"
                    value={newInward.invoiceNo}
                    onChange={(e) => setNewInward({ ...newInward, invoiceNo: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tanker Reg #</label>
                  <input
                    type="text"
                    value={newInward.tankerVehicleNo}
                    onChange={(e) => setNewInward({ ...newInward, tankerVehicleNo: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono font-bold uppercase"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Litres Received *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={newInward.litersReceived}
                    onChange={(e) => setNewInward({ ...newInward, litersReceived: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 font-black text-blue-900 text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Purchase Rate (₹ / Litre)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newInward.ratePerLiter}
                    onChange={(e) => setNewInward({ ...newInward, ratePerLiter: parseFloat(e.target.value) || 91.2 })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Received By (Plant Incharge)</label>
                  <input
                    type="text"
                    value={newInward.receivedBy}
                    onChange={(e) => setNewInward({ ...newInward, receivedBy: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Density Check</label>
                  <input
                    type="text"
                    value={newInward.remarks}
                    onChange={(e) => setNewInward({ ...newInward, remarks: e.target.value })}
                    placeholder="e.g. Density 828 kg/m³, Dip check ok"
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs flex justify-between items-center">
                <div>
                  <span className="text-blue-900 font-bold block">Total Inward Bill Amount:</span>
                  <span className="text-[10px] text-blue-700 font-mono">
                    {newInward.litersReceived} L × ₹{newInward.ratePerLiter}/L
                  </span>
                </div>
                <span className="text-base font-black text-blue-900">
                  ₹{((Number(newInward.litersReceived) || 0) * (Number(newInward.ratePerLiter) || 91.2)).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-gray-700 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow cursor-pointer"
                >
                  Save Inward Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
