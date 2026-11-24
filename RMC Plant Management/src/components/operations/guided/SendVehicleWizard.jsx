import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Truck,
  User,
  MapPin,
  Layers,
  Gauge,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Printer,
  HelpCircle,
  AlertCircle,
  ShieldCheck,
  Check,
  Plus,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useWorkforce } from '../../../context/WorkforceContext';
import { subscribeCloudStore, pushCloudStore } from '../../../services/cloudSyncService';
import HelpModal from './HelpModal';

const VEHICLE_STORAGE_KEY = 'rmc_plant_vehicles_v2';
const CHALLAN_STORAGE_KEY = 'rmc_delivery_challans_v2';
const TRIPS_STORAGE_KEY = 'rmc_driver_trips_v2';
const BILLING_STORAGE_KEY = 'rmc_billing_records_v3';

const DEFAULT_FLEET = [];

const DEFAULT_CUSTOMERS = [];

const CONCRETE_GRADES = ['M15', 'M20', 'M25', 'M30', 'M35', 'M40'];
const VOLUME_PRESETS = [3.0, 4.5, 6.0, 7.0, 8.0];

export default function SendVehicleWizard({ isOpen, onClose, onComplete }) {
  const { language, t } = useLanguage();
  const { employees } = useWorkforce();
  const [step, setStep] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [createdChallan, setCreatedChallan] = useState(null);

  // Dynamic fleet vehicles loaded from persistent local + cloud store
  const [vehicles, setVehicles] = useState(() => {
    try {
      const raw = localStorage.getItem(VEHICLE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Add New Vehicle Modal States
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicleNo, setNewVehicleNo] = useState('');
  const [newCapacity, setNewCapacity] = useState(6.0);
  const [newDriver, setNewDriver] = useState('');
  const [addError, setAddError] = useState('');

  // Subscribe to real-time vehicle updates
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VEHICLE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
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
  }, [isOpen]);

  // Dynamic driver list from real registered workforce
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

  // Form State
  const [selectedVehicle, setSelectedVehicle] = useState(() => vehicles[0]?.vehicleNo || '');
  const [selectedDriver, setSelectedDriver] = useState(() => vehicles[0]?.defaultDriver || '');
  const [customerName, setCustomerName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [mixGrade, setMixGrade] = useState('M25');
  const [quantity, setQuantity] = useState(() => vehicles[0]?.capacity || 6.0);
  const [slump, setSlump] = useState('125 ± 25 mm');
  const [validationError, setValidationError] = useState('');

  // Auto-fill driver & capacity when vehicle is selected
  const handleVehicleSelect = (veh) => {
    setSelectedVehicle(veh.vehicleNo);
    const driverName = veh.defaultDriver || veh.driver || '';
    if (driverName && !selectedDriver) {
      setSelectedDriver(driverName);
    }
    if (veh.capacity) setQuantity(Number(veh.capacity));
    setValidationError('');
  };

  // Add new vehicle handler
  const handleSaveNewVehicle = () => {
    const trimmedNo = newVehicleNo.trim().toUpperCase();
    if (!trimmedNo) {
      setAddError(language === 'mr' ? 'कृपया गाडी नंबर टाका.' : 'Please enter vehicle registration number.');
      return;
    }
    const capNum = parseFloat(newCapacity);
    if (!capNum || capNum <= 0) {
      setAddError(language === 'mr' ? 'कृपया योग्य ड्रम क्षमता टाका.' : 'Please enter valid drum capacity.');
      return;
    }

    // Check duplicate
    if (vehicles.some(v => (v.vehicleNo || '').toLowerCase() === trimmedNo.toLowerCase())) {
      setAddError(language === 'mr' ? 'हा गाडी नंबर आधीच यादीत उपलब्ध आहे.' : 'This vehicle number is already in the list.');
      return;
    }

    const newVeh = {
      id: `VEH-${Date.now()}`,
      vehicleNo: trimmedNo,
      type: 'Transit Mixer (TM)',
      capacity: capNum,
      defaultDriver: newDriver.trim() || '',
      driver: newDriver.trim() || '',
      status: 'Ready',
      createdAt: new Date().toISOString()
    };

    const updated = [newVeh, ...vehicles];
    setVehicles(updated);
    try {
      localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(updated));
      pushCloudStore('cloud_plant_vehicles', VEHICLE_STORAGE_KEY, updated);
    } catch {}

    // Auto-select the newly created vehicle immediately
    handleVehicleSelect(newVeh);
    setShowAddVehicle(false);
    setNewVehicleNo('');
    setNewDriver('');
    setAddError('');
  };

  // Delete vehicle handler (allows removing dummy or decommissioned vehicles)
  const handleDeleteVehicle = (vehNo) => {
    const confirmMsg = language === 'mr'
      ? `तुम्हाला ${vehNo} ही गाडी यादीतून काढायची आहे का?`
      : `Are you sure you want to remove vehicle ${vehNo} from the fleet list?`;
    if (window.confirm(confirmMsg)) {
      const updated = vehicles.filter(v => v.vehicleNo !== vehNo);
      setVehicles(updated);
      try {
        localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(updated));
        pushCloudStore('cloud_plant_vehicles', VEHICLE_STORAGE_KEY, updated);
      } catch {}
      if (selectedVehicle === vehNo) {
        if (updated.length > 0) {
          handleVehicleSelect(updated[0]);
        } else {
          setSelectedVehicle('');
          setSelectedDriver('');
        }
      }
    }
  };

  const handleCustomerSelect = (cust) => {
    setCustomerName(cust.name);
    setSiteLocation(cust.site);
    setValidationError('');
  };

  const validateCurrentStep = () => {
    setValidationError('');
    if (step === 1 && !selectedVehicle) {
      setValidationError(language === 'mr' ? 'कृपया एक गाडी निवडा.' : 'Please select a vehicle.');
      return false;
    }
    if (step === 2 && !selectedDriver) {
      setValidationError(language === 'mr' ? 'कृपया ड्रायव्हरचे नाव निवडा.' : 'Please select a driver.');
      return false;
    }
    if (step === 3 && !customerName.trim()) {
      setValidationError(language === 'mr' ? 'कृपया ग्राहक किंवा साइट निवडा.' : 'Please select or enter customer name.');
      return false;
    }
    if (step === 4 && (!quantity || Number(quantity) <= 0)) {
      setValidationError(language === 'mr' ? 'कृपया काँक्रीटचे योग्य प्रमाण (m³) टाका.' : 'Please enter a valid concrete quantity.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep(prev => Math.min(5, prev + 1));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
    setValidationError('');
  };

  const handleConfirmAndSave = (shouldPrint = false) => {
    const challanNumber = `DC-25-26/${Date.now().toString().slice(-4)}`;
    const departureTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const todayDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newChallan = {
      id: `DC-${Date.now()}`,
      challanNo: challanNumber,
      date: todayDate,
      departureTime,
      customerName: customerName.trim(),
      site: siteLocation.trim() || 'Site Address Assumed',
      vehicleNo: selectedVehicle,
      driverName: selectedDriver,
      grade: `${mixGrade} Concrete`,
      quantity: Number(quantity),
      slump,
      status: 'In Transit',
      createdAt: new Date().toISOString()
    };

    // Save into rmc_delivery_challans_v2
    try {
      const existingRaw = localStorage.getItem(CHALLAN_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedChallans = [newChallan, ...existing];
      localStorage.setItem(CHALLAN_STORAGE_KEY, JSON.stringify(updatedChallans));
      pushCloudStore('cloud_delivery_challans', CHALLAN_STORAGE_KEY, updatedChallans);
    } catch (e) {
      console.warn('Error saving challan:', e);
    }

    // Save into rmc_driver_trips_v2
    try {
      const existingTripsRaw = localStorage.getItem(TRIPS_STORAGE_KEY);
      const existingTrips = existingTripsRaw ? JSON.parse(existingTripsRaw) : [];
      const newTrip = {
        id: `TRP-${Date.now()}`,
        challanNo: challanNumber,
        vehicleNo: selectedVehicle,
        driverName: selectedDriver,
        clientName: customerName.trim(),
        siteName: siteLocation.trim() || 'Site Address Assumed',
        grade: mixGrade,
        quantityM3: Number(quantity),
        departureTime,
        status: 'Departed',
        createdAt: new Date().toISOString()
      };
      const updatedTrips = [newTrip, ...existingTrips];
      localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updatedTrips));
      pushCloudStore('cloud_driver_trips', TRIPS_STORAGE_KEY, updatedTrips);
    } catch (e) {
      console.warn('Error saving trip:', e);
    }

    setCreatedChallan(newChallan);
    setSavedSuccess(true);
    if (onComplete) onComplete(newChallan);
    if (shouldPrint) {
      setTimeout(() => window.print(), 300);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-fadeIn text-slate-800">
        
        {/* Top Header with Simple Guidance */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                {language === 'mr' ? 'गाडी साइटवर पाठवा (चालान)' : 'Send Vehicle to Site (Challan)'}
              </h3>
              <p className="text-[11px] text-blue-200">
                {language === 'mr' ? 'पायरी ' + step + ' / ५' : 'Step ' + step + ' of 5'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('help', 'Help')}</span>
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Short top instruction banner */}
        <div className="bg-blue-50 px-5 py-2 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900 font-semibold">
          <span>{t('instructionSendVehicle')}</span>
          <span className="font-mono font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-blue-200">
            {language === 'mr' ? 'सोपी पायरी' : 'Simple Guided'}
          </span>
        </div>

        {/* Step Progress Tracker */}
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
            <span className={step >= 1 ? 'text-blue-700 font-black' : ''}>{language === 'mr' ? '१. गाडी' : '1. Vehicle'}</span>
            <span className={step >= 2 ? 'text-blue-700 font-black' : ''}>{language === 'mr' ? '२. ड्रायव्हर' : '2. Driver'}</span>
            <span className={step >= 3 ? 'text-blue-700 font-black' : ''}>{language === 'mr' ? '३. ग्राहक' : '3. Customer'}</span>
            <span className={step >= 4 ? 'text-blue-700 font-black' : ''}>{language === 'mr' ? '४. प्रमाण' : '4. Quantity'}</span>
            <span className={step >= 5 ? 'text-emerald-700 font-black' : ''}>{language === 'mr' ? '५. खात्री' : '5. Confirm'}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Post-Save Success View */}
        {savedSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {t('tripStartedSuccess')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'mr' 
                  ? `चालान #${createdChallan?.challanNo} तयार झाले. गाडी साइटकडे रवाना झाली.` 
                  : `Challan #${createdChallan?.challanNo} issued. Mixer truck is in transit.`}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1 font-mono">
              <div><strong>Vehicle:</strong> {createdChallan?.vehicleNo}</div>
              <div><strong>Driver:</strong> {createdChallan?.driverName}</div>
              <div><strong>Customer:</strong> {createdChallan?.customerName}</div>
              <div><strong>Quantity:</strong> {createdChallan?.quantity} m³ ({createdChallan?.grade})</div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'mr' ? 'चालान प्रिंट करा' : 'Print Challan Ticket'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
              >
                {t('done', 'Done')}
              </button>
            </div>
          </div>
        ) : (
          /* STEP CONTENTS */
          <div className="p-5 min-h-[260px] flex flex-col justify-between">
            {/* STEP 1: SELECT VEHICLE */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{t('qWhichVehicle')}</h4>
                    <p className="text-xs text-slate-500">
                      {language === 'mr' ? 'प्लॅन्टमध्ये उपलब्ध असलेल्या गाड्यांपैकी एक निवडा:' : 'Select an available truck ready for loading:'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewVehicleNo('');
                      setNewCapacity(6.0);
                      setNewDriver('');
                      setAddError('');
                      setShowAddVehicle(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'नवीन गाडी जोडा' : 'Add Vehicle'}</span>
                  </button>
                </div>

                {vehicles.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                    <Truck className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">
                        {language === 'mr' ? 'एकही गाडी नोंदवलेली नाही' : 'No Vehicles Registered Yet'}
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {language === 'mr' ? 'काँक्रीट पाठवण्यासाठी आधी तुमच्या प्लॅन्टची गाडी जोडा.' : 'Add your plant transit mixer to start sending concrete.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewVehicleNo('');
                        setNewCapacity(6.0);
                        setNewDriver('');
                        setAddError('');
                        setShowAddVehicle(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{language === 'mr' ? 'पहिली गाडी जोडा' : 'Add First Vehicle'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {vehicles.map((v) => {
                      const isSelected = selectedVehicle === v.vehicleNo;
                      return (
                        <div
                          key={v.vehicleNo}
                          onClick={() => handleVehicleSelect(v)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                              <Truck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-mono font-black text-xs text-slate-900 truncate">{v.vehicleNo}</div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {v.capacity || 6} m³ • {v.defaultDriver || v.driver || (language === 'mr' ? 'ड्रायव्हर नेमलेला नाही' : 'No driver assigned')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVehicle(v.vehicleNo);
                              }}
                              className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-70 group-hover:opacity-100"
                              title={language === 'mr' ? 'गाडी यादीतून काढा' : 'Delete Vehicle'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: SELECT DRIVER */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{t('qWhoIsDriving')}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'गाडी चालवणाऱ्या ड्रायव्हरची निवड करा:' : 'Select the confirmed driver for this trip:'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {registeredDrivers.length > 0 ? (
                    registeredDrivers.map((d, idx) => {
                      const isSelected = selectedDriver === d?.name;
                      return (
                        <button
                          key={d?.id || d?.name || idx}
                          type="button"
                          onClick={() => { setSelectedDriver(d?.name || ''); setValidationError(''); }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900">{d?.name || 'Driver'} <span className="font-mono text-[10px] text-slate-500 font-normal">({d?.id || 'DRV'})</span></div>
                              <div className="text-[10px] text-slate-500 font-mono">{d?.mobile || d?.phone || 'Fleet Driver'}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <User className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      <p className="font-semibold text-slate-600">No Drivers Registered in Workforce Directory</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Drivers registered by Admin in Workforce will appear here automatically.</p>
                    </div>
                  )}
                </div>

                {/* Direct Driver Name Input Option */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'किंवा इतर ड्रायव्हरचे नाव टाका:' : 'Or enter custom/contract driver name:'}
                  </label>
                  <input
                    type="text"
                    value={selectedDriver}
                    onChange={(e) => { setSelectedDriver(e.target.value); setValidationError(''); }}
                    placeholder="Enter driver name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: SELECT CUSTOMER & SITE */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{t('qWhereIsGoing')}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'काँक्रीट कोणत्या ग्राहकाच्या साइटवर पाठवायचे आहे?' : 'Select from recent customer project sites or type new:'}</p>
                </div>

                {/* 1-Tap Customer Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600">{language === 'mr' ? '१-क्लिकने निवडा:' : '1-Click Select:'}</span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {DEFAULT_CUSTOMERS.map((c) => {
                      const isSelected = customerName.toLowerCase() === c.name.toLowerCase();
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleCustomerSelect(c)}
                          className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div>
                            <span className="block font-bold">{c.name}</span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" /> {c.site}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Or Custom Typing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-0.5 block">{language === 'mr' ? 'ग्राहकाचे नाव:' : 'Customer Name:'}</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. Shree Construction"
                      className="w-full px-3 py-1.5 border rounded-lg text-xs font-semibold focus:outline-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-0.5 block">{language === 'mr' ? 'साइटचा पत्ता:' : 'Site Location:'}</label>
                    <input
                      type="text"
                      value={siteLocation}
                      onChange={e => setSiteLocation(e.target.value)}
                      placeholder="e.g. Tanang Pier Slab #4"
                      className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CONCRETE QUANTITY & GRADE */}
            {step === 4 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{t('qHowMuchConcrete')}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'काँक्रीटचा ग्रेड आणि घनमीटर (m³) प्रमाण निवडा:' : 'Select concrete grade and mixer drum volume in m³:'}</p>
                </div>

                {/* Quick Grade Select */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {language === 'mr' ? 'काँक्रीटचा ग्रेड (Concrete Mix Grade):' : 'Concrete Mix Grade:'}
                  </label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {CONCRETE_GRADES.map((g) => {
                      const isSelected = mixGrade === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setMixGrade(g)}
                          className={`py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs scale-102 ring-2 ring-blue-300'
                              : 'bg-slate-50 border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Quantity Select */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {language === 'mr' ? 'काँक्रीटचे प्रमाण (m³):' : 'Volume in Cubic Metres (m³):'}
                  </label>
                  <div className="flex gap-1.5 mb-2">
                    {VOLUME_PRESETS.map((vol) => {
                      const isSelected = Number(quantity) === vol;
                      return (
                        <button
                          key={vol}
                          type="button"
                          onClick={() => setQuantity(vol)}
                          className={`flex-1 py-1.5 rounded-lg font-mono font-black text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-50 border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {vol} m³
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{language === 'mr' ? 'किंवा अचूक आकडे टाका:' : 'Or custom m³:'}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="15.0"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 border rounded-lg font-mono font-black text-sm focus:outline-blue-500"
                    />
                    <span className="font-bold text-xs">m³</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: SUMMARY & CONFIRM */}
            {step === 5 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{t('qCheckSummary')}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'माहिती बरोबर असल्याची खात्री करा आणि गाडी रवाना करा:' : 'Please double check all fields before issuing gate pass:'}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500 font-bold">{language === 'mr' ? 'गाडी नंबर:' : 'Vehicle No:'}</span>
                    <span className="font-mono font-black text-blue-900 text-sm">{selectedVehicle}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500 font-bold">{language === 'mr' ? 'चालवणारा ड्रायव्हर:' : 'Driver Name:'}</span>
                    <span className="font-bold text-slate-900">{selectedDriver}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500 font-bold">{language === 'mr' ? 'ग्राहक व साइट:' : 'Customer & Site:'}</span>
                    <span className="font-bold text-slate-900 text-right">{customerName} <br /><span className="text-[10px] text-slate-500 font-normal">{siteLocation}</span></span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-bold">{language === 'mr' ? 'काँक्रीट ग्रेड व प्रमाण:' : 'Mix Grade & Qty:'}</span>
                    <span className="font-mono font-black text-emerald-700 text-sm">{quantity} m³ ({mixGrade})</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Step Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2 mt-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('back', 'Go Back')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                >
                  <span>{t('next', 'Next Step')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmAndSave(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Save and automatically print delivery challan ticket"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'सेव्ह व प्रिंट' : 'Save & Print'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmAndSave(false)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{language === 'mr' ? 'गाडी रवाना करा' : 'Confirm & Start Trip'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Add Vehicle Modal */}
        {showAddVehicle && (
          <div className="fixed inset-0 z-[11000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/20 text-white">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-wide">
                      {language === 'mr' ? 'नवीन गाडी जोडा' : 'Add New Fleet Vehicle'}
                    </h3>
                    <p className="text-[11px] text-blue-200">
                      {language === 'mr' ? 'गाडी नंबर आणि ड्रम क्षमता नोंदवा' : 'Register a new mixer truck to your plant fleet'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs text-slate-800">
                {addError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{addError}</span>
                  </div>
                )}

                {/* Vehicle Number */}
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    {language === 'mr' ? 'गाडी नोंदणी क्रमांक (Vehicle Number) *' : 'Vehicle Registration Number *'}
                  </label>
                  <input
                    type="text"
                    value={newVehicleNo}
                    onChange={(e) => {
                      setNewVehicleNo(e.target.value.toUpperCase());
                      setAddError('');
                    }}
                    placeholder="e.g. MH-10-CR-2020"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-black text-sm text-slate-900 bg-slate-50 focus:bg-white focus:border-blue-600 uppercase tracking-wide shadow-2xs"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">Format: State-RTO-Series-Number (e.g. MH-10-CR-1212)</p>
                </div>

                {/* Drum Capacity */}
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    {language === 'mr' ? 'ड्रम मिक्सिंग क्षमता (Drum Capacity - m³) *' : 'Mixing Drum Capacity (m³) *'}
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[6.0, 7.0, 8.0, 10.0].map((cap) => (
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
                    <span className="text-[11px] text-slate-500">{language === 'mr' ? 'किंवा इतर क्षमता:' : 'Or custom capacity:'}</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="20"
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(parseFloat(e.target.value) || '')}
                      className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-xs"
                    />
                    <span className="text-xs font-bold text-slate-600">m³</span>
                  </div>
                </div>

                {/* Assigned Default Driver */}
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    {language === 'mr' ? 'नेमलेला ड्रायव्हर (Assigned Driver - पर्यायी)' : 'Default Driver (Optional)'}
                  </label>
                  {registeredDrivers.length > 0 ? (
                    <select
                      value={newDriver}
                      onChange={(e) => setNewDriver(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs text-slate-800 bg-slate-50 focus:bg-white"
                    >
                      <option value="">{language === 'mr' ? '-- ड्रायव्हर निवडा किंवा खाली लिहा --' : '-- Select registered driver or type below --'}</option>
                      {registeredDrivers.map((d, idx) => (
                        <option key={d?.id || d?.name || idx} value={d?.name || ''}>{d?.name || 'Driver'} ({d?.id || 'DRV'})</option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    type="text"
                    value={newDriver}
                    onChange={(e) => setNewDriver(e.target.value)}
                    placeholder="e.g. Sachin Shinde"
                    className="w-full mt-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddVehicle(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewVehicle}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{language === 'mr' ? 'गाडी सेव्ह करा आणि निवडा' : 'Save & Select Vehicle'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Universal Help Modal */}
        <HelpModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          topic="sendVehicle"
        />
      </div>
    </div>,
    document.body
  );
}
