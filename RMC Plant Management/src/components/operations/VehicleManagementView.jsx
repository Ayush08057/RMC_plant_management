import React, { useState, useEffect } from 'react';
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  X,
  Check,
  Gauge,
  User
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkforce } from '../../context/WorkforceContext';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';
import HelpModal from './guided/HelpModal';

const VEHICLE_STORAGE_KEY = 'rmc_plant_vehicles_v2';

const DEFAULT_FLEET = [];

export default function VehicleManagementView() {
  const { language, t } = useLanguage();
  const { employees } = useWorkforce();
  const [helpOpen, setHelpOpen] = useState(false);
  const [vehicles, setVehicles] = useState(() => {
    try {
      const saved = localStorage.getItem(VEHICLE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [search, setSearch] = useState('');

  // Add Vehicle Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicleNo, setNewVehicleNo] = useState('');
  const [newType, setNewType] = useState('Transit Mixer (TM)');
  const [newCapacity, setNewCapacity] = useState(6.0);
  const [newModel, setNewModel] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [formError, setFormError] = useState('');

  // Real-time synchronization
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VEHICLE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setVehicles(parsed);
        }
      }
    } catch {}

    const unsub = subscribeCloudStore('cloud_plant_vehicles', VEHICLE_STORAGE_KEY, [], (items) => {
      if (Array.isArray(items)) {
        setVehicles(items);
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const registeredDrivers = React.useMemo(() => {
    return (employees || []).filter((e) => {
      if (!e) return false;
      const roleLower = (e.role || '').toLowerCase();
      const deptLower = (e.department || '').toLowerCase();
      return (
        roleLower.includes('driver') ||
        deptLower.includes('transport') ||
        deptLower.includes('logistics') ||
        deptLower.includes('fleet')
      );
    });
  }, [employees]);

  // Handle Save New Vehicle
  const handleSaveVehicle = () => {
    const trimmedNo = newVehicleNo.trim().toUpperCase();
    if (!trimmedNo) {
      setFormError(language === 'mr' ? 'कृपया गाडी नंबर टाका.' : 'Please enter vehicle registration number.');
      return;
    }
    const capNum = parseFloat(newCapacity);
    if (!capNum || capNum <= 0) {
      setFormError(language === 'mr' ? 'कृपया योग्य ड्रम क्षमता टाका.' : 'Please enter valid drum capacity.');
      return;
    }

    if (vehicles.some(v => (v.vehicleNo || '').toLowerCase() === trimmedNo.toLowerCase())) {
      setFormError(language === 'mr' ? 'हा गाडी नंबर आधीच यादीत उपलब्ध आहे.' : 'This vehicle number is already registered.');
      return;
    }

    const newVeh = {
      id: `VEH-${Date.now()}`,
      vehicleNo: trimmedNo,
      type: newType,
      capacity: capNum,
      model: newModel.trim() || 'Standard RMC Carrier',
      driver: newDriver.trim() || '',
      defaultDriver: newDriver.trim() || '',
      status: 'Available / Plant',
      fitnessValidTill: '2027-12-31',
      insuranceValidTill: '2027-12-31',
      createdAt: new Date().toISOString()
    };

    const updated = [newVeh, ...vehicles];
    setVehicles(updated);
    try {
      localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(updated));
      pushCloudStore('cloud_plant_vehicles', VEHICLE_STORAGE_KEY, updated);
    } catch {}

    setShowAddModal(false);
    setNewVehicleNo('');
    setNewModel('');
    setNewDriver('');
    setFormError('');
  };

  // Handle Delete Vehicle
  const handleDeleteVehicle = (vehNo) => {
    const confirmMsg = language === 'mr'
      ? `तुम्हाला ${vehNo} ही गाडी कायमची काढून टाकायची आहे का?`
      : `Are you sure you want to permanently delete vehicle ${vehNo}?`;
    if (window.confirm(confirmMsg)) {
      const updated = vehicles.filter(v => v.vehicleNo !== vehNo);
      setVehicles(updated);
      try {
        localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(updated));
        pushCloudStore('cloud_plant_vehicles', VEHICLE_STORAGE_KEY, updated);
      } catch {}
    }
  };

  const filtered = vehicles.filter(v => 
    (v.vehicleNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.type || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.driver || v.defaultDriver || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-3 text-xs text-slate-800">

      {/* Top Header & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <span>{language === 'mr' ? 'प्लॅन्ट ट्रान्झिट मिक्सर व वाहने' : 'Transit Mixer & Concrete Pump Fleet'}</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            {language === 'mr' ? 'गाड्यांची नोंदणी, ड्रम क्षमता, चालक आणि स्थिती' : 'Fleet management, drum capacity, assigned drivers, and live status'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={language === 'mr' ? 'गाडी, ड्रायव्हर शोधा...' : 'Search vehicle, driver...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setNewVehicleNo('');
              setNewCapacity(6.0);
              setNewDriver('');
              setNewModel('');
              setFormError('');
              setShowAddModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'mr' ? 'नवीन गाडी जोडा' : 'Add Vehicle'}</span>
          </button>
        </div>
      </div>

      {/* Fleet Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center space-y-3">
          <Truck className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
          <div>
            <p className="text-sm font-bold text-slate-800">
              {language === 'mr' ? 'कोणतीही गाडी सापडली नाही' : 'No Fleet Vehicles Found'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'mr' ? 'नवीन ट्रान्झिट मिक्सर गाडी जोडण्यासाठी खालील बटनावर दाबा.' : 'Register your plant transit mixer trucks to dispatch concrete.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewVehicleNo('');
              setNewCapacity(6.0);
              setNewDriver('');
              setNewModel('');
              setFormError('');
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'mr' ? 'नवीन गाडी जोडा' : 'Register First Vehicle'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(v => (
            <div key={v.id || v.vehicleNo} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 group hover:border-blue-400 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-base font-mono font-black text-slate-900 block">{v.vehicleNo}</span>
                  <span className="text-xs font-bold text-blue-700 block mt-0.5">{v.type || 'Transit Mixer'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {v.status || 'Available'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteVehicle(v.vehicleNo)}
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title={language === 'mr' ? 'गाडी हटवा' : 'Delete Vehicle'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                <div className="flex justify-between items-center">
                  <span>{language === 'mr' ? 'ड्रम क्षमता:' : 'Drum Capacity:'}</span>
                  <strong className="text-slate-900 font-mono font-black">{v.capacity || 6.0} m³</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>{language === 'mr' ? 'नेमलेला चालक:' : 'Assigned Driver:'}</span>
                  <strong className="text-slate-900">{v.driver || v.defaultDriver || (language === 'mr' ? 'असाइन नाही' : 'Unassigned')}</strong>
                </div>
                {v.model && (
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>{language === 'mr' ? 'मॉडेल:' : 'Make/Model:'}</span>
                    <span className="truncate">{v.model}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 text-white">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide">
                    {language === 'mr' ? 'नवीन गाडी नोंदवा' : 'Register New Vehicle'}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    {language === 'mr' ? 'प्लॅन्टच्या ताफ्यात नवीन गाडी जोडा' : 'Add a new transit mixer to plant fleet'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-800">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Vehicle Number */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  {language === 'mr' ? 'गाडी क्रमांक (Vehicle Number) *' : 'Vehicle Number (RTO) *'}
                </label>
                <input
                  type="text"
                  value={newVehicleNo}
                  onChange={e => {
                    setNewVehicleNo(e.target.value.toUpperCase());
                    setFormError('');
                  }}
                  placeholder="e.g. MH-10-CR-2020"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-black text-sm text-slate-900 bg-slate-50 focus:bg-white focus:border-blue-600 uppercase tracking-wide"
                  autoFocus
                />
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  {language === 'mr' ? 'वाहनाचा प्रकार:' : 'Vehicle Type:'}
                </label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs text-slate-800 bg-slate-50 focus:bg-white"
                >
                  <option value="Transit Mixer (TM)">Transit Mixer (TM)</option>
                  <option value="Concrete Pump (CP)">Concrete Pump (CP)</option>
                  <option value="Boom Placer">Boom Placer</option>
                  <option value="Dump Truck / Tipper">Dump Truck / Tipper</option>
                </select>
              </div>

              {/* Drum Capacity */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  {language === 'mr' ? 'ड्रम क्षमता (m³) *' : 'Drum Capacity (m³) *'}
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[6.0, 7.0, 8.0, 10.0].map(cap => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewCapacity(cap)}
                      className={`py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                        Number(newCapacity) === cap
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cap} m³
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">{language === 'mr' ? 'किंवा इतर क्षमता:' : 'Or custom m³:'}</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="20"
                    value={newCapacity}
                    onChange={e => setNewCapacity(parseFloat(e.target.value) || '')}
                    className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-xs"
                  />
                  <span className="text-xs font-bold text-slate-600">m³</span>
                </div>
              </div>

              {/* Driver */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  {language === 'mr' ? 'चालक (Assigned Driver):' : 'Assigned Driver:'}
                </label>
                {registeredDrivers.length > 0 && (
                  <select
                    value={newDriver}
                    onChange={e => setNewDriver(e.target.value)}
                    className="w-full mb-1.5 px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs text-slate-800 bg-slate-50 focus:bg-white"
                  >
                    <option value="">{language === 'mr' ? '-- ड्रायव्हर निवडा --' : '-- Select from workforce --'}</option>
                    {registeredDrivers.map((d, idx) => (
                      <option key={d?.id || d?.name || idx} value={d?.name || ''}>{d?.name || 'Driver'} ({d?.id || 'DRV'})</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={newDriver}
                  onChange={e => setNewDriver(e.target.value)}
                  placeholder="e.g. Sachin Shinde"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  {language === 'mr' ? 'चेसिस / मॉडेल (पर्यायी):' : 'Chassis / Model (Optional):'}
                </label>
                <input
                  type="text"
                  value={newModel}
                  onChange={e => setNewModel(e.target.value)}
                  placeholder="e.g. Tata Signa 2823.TK"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveVehicle}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{language === 'mr' ? 'गाडी सेव्ह करा' : 'Save Vehicle'}</span>
                </button>
              </div>
            </div>
          </div>
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
