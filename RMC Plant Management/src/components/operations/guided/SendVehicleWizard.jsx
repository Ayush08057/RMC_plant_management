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
  Check
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { subscribeCloudStore, pushCloudStore } from '../../../services/cloudSyncService';
import HelpModal from './HelpModal';

const CHALLAN_STORAGE_KEY = 'rmc_delivery_challans_v2';
const TRIPS_STORAGE_KEY = 'rmc_driver_trips_v2';
const BILLING_STORAGE_KEY = 'rmc_billing_records_v3';

const FLEET_VEHICLES = [
  { vehicleNo: 'MH-10-CR-1212', defaultDriver: 'Sachin Shinde', capacity: 6.0, status: 'Ready' },
  { vehicleNo: 'MH-10-CR-1313', defaultDriver: 'Vikas Jadhav', capacity: 6.0, status: 'Ready' },
  { vehicleNo: 'MH-10-CR-1414', defaultDriver: 'Sunil Kadam', capacity: 6.0, status: 'Ready' },
  { vehicleNo: 'MH-12-RN-4401', defaultDriver: 'Ramesh Pawar', capacity: 7.0, status: 'Ready' },
  { vehicleNo: 'MH-12-RN-8822', defaultDriver: 'Sanjay Yadav', capacity: 8.0, status: 'Ready' },
];

const DRIVERS_LIST = [
  { name: 'Sachin Shinde', phone: '+91 94218 58681', experience: '5 yrs' },
  { name: 'Vikas Jadhav', phone: '+91 98221 44012', experience: '7 yrs' },
  { name: 'Sunil Kadam', phone: '+91 97654 32109', experience: '4 yrs' },
  { name: 'Ramesh Pawar', phone: '+91 98221 44012', experience: '8 yrs' },
  { name: 'Sanjay Yadav', phone: '+91 97110 55432', experience: '6 yrs' },
];

const DEFAULT_CUSTOMERS = [
  { name: 'Shree Construction & Infra', site: 'Tanang Highway Pier Zone #4' },
  { name: 'Kulkarni Builders & Developers', site: 'Sangli Bypass Bridge Slab #2' },
  { name: 'Sai Samarth Infrastructure', site: 'Kupwad MIDC Phase 2' },
  { name: 'Patil Developers & Contracts', site: 'Miraj Ring Road Junction' },
  { name: 'Cash Customer', site: 'Plant Counter Delivery' },
];

const CONCRETE_GRADES = ['M15', 'M20', 'M25', 'M30', 'M35', 'M40'];
const VOLUME_PRESETS = [3.0, 4.5, 6.0, 7.0, 8.0];

export default function SendVehicleWizard({ isOpen, onClose, onComplete }) {
  const { language, t } = useLanguage();
  const [step, setStep] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [createdChallan, setCreatedChallan] = useState(null);

  // Form State
  const [selectedVehicle, setSelectedVehicle] = useState(FLEET_VEHICLES[0].vehicleNo);
  const [selectedDriver, setSelectedDriver] = useState(FLEET_VEHICLES[0].defaultDriver);
  const [customerName, setCustomerName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [mixGrade, setMixGrade] = useState('M25');
  const [quantity, setQuantity] = useState(6.0);
  const [slump, setSlump] = useState('125 ± 25 mm');
  const [validationError, setValidationError] = useState('');

  // Auto-fill driver when vehicle is selected
  const handleVehicleSelect = (veh) => {
    setSelectedVehicle(veh.vehicleNo);
    setSelectedDriver(veh.defaultDriver);
    if (veh.capacity) setQuantity(veh.capacity);
    setValidationError('');
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
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{t('qWhichVehicle')}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'प्लॅन्टमध्ये उपलब्ध असलेल्या गाड्यांपैकी एक निवडा:' : 'Select an available truck ready for loading:'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FLEET_VEHICLES.map((v) => {
                    const isSelected = selectedVehicle === v.vehicleNo;
                    return (
                      <button
                        key={v.vehicleNo}
                        type="button"
                        onClick={() => handleVehicleSelect(v)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-mono font-black text-xs text-slate-900">{v.vehicleNo}</div>
                            <div className="text-[10px] text-slate-500">{v.capacity} m³ • {v.defaultDriver}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
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
                  {DRIVERS_LIST.map((d) => {
                    const isSelected = selectedDriver === d.name;
                    return (
                      <button
                        key={d.name}
                        type="button"
                        onClick={() => { setSelectedDriver(d.name); setValidationError(''); }}
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
                            <div className="font-bold text-xs text-slate-900">{d.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{d.phone}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                      </button>
                    );
                  })}
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
