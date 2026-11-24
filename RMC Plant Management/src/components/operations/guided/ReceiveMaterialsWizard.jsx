import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PackageCheck,
  Building2,
  Scale,
  Truck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  HelpCircle,
  AlertCircle,
  Check,
  Layers
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { pushCloudStore } from '../../../services/cloudSyncService';
import { STORAGE_KEYS, INITIAL_SILO_STOCK } from '../../../services/plantOperationsService';
import HelpModal from './HelpModal';

const INWARD_STORAGE_KEY = STORAGE_KEYS?.INWARD || 'rmc_material_inward_v2';

const MATERIALS_LIST = [
  { id: 'cement', name: 'Cement (OPC 53)', unit: 'MT', defaultSilo: 'Cement Silo 1' },
  { id: 'flyash', name: 'Fly Ash (Pozzocrete)', unit: 'MT', defaultSilo: 'Fly Ash Silo 2' },
  { id: '20mm', name: '20mm Coarse Aggregate', unit: 'MT', defaultSilo: 'Aggregate Bin A' },
  { id: '10mm', name: '10mm Coarse Aggregate', unit: 'MT', defaultSilo: 'Aggregate Bin B' },
  { id: 'sand', name: 'Crushed M-Sand', unit: 'MT', defaultSilo: 'Sand Bin C' },
  { id: 'admixture', name: 'Admixture (PCE)', unit: 'KG', defaultSilo: 'Chemical Tank 1' },
];

const SUPPLIERS_LIST = [
  'UltraTech Cement Ltd',
  'Ambuja Cements Ltd',
  'Dirk Pozzocrete India',
  'Krishna Valley Stone Quarry',
  'Sangli Sand Suppliers',
  'Sika Chemicals India',
];

export default function ReceiveMaterialsWizard({ isOpen, onClose, onComplete }) {
  const { language, t } = useLanguage();
  const [step, setStep] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State
  const [selectedMaterial, setSelectedMaterial] = useState(MATERIALS_LIST[0]);
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateStep = () => {
    setValidationError('');
    if (step === 1 && !selectedMaterial) {
      setValidationError(language === 'mr' ? 'कृपया कच्चा माल निवडा.' : 'Please select a material.');
      return false;
    }
    if (step === 2 && !supplierName) {
      setValidationError(language === 'mr' ? 'कृपया सप्लायरचे नाव निवडा.' : 'Please select a supplier.');
      return false;
    }
    if (step === 3 && (!quantity || Number(quantity) <= 0)) {
      setValidationError(language === 'mr' ? 'कृपया वजन (टन) टाका.' : 'Please enter valid quantity in MT.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => Math.min(4, prev + 1));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
    setValidationError('');
  };

  const handleSave = () => {
    const finalGross = Number(grossWeight) > 0 
      ? Number(grossWeight) 
      : Number(((Number(quantity) || 0) + (Number(tareWeight) || 0)).toFixed(2));
    const finalTare = Number(tareWeight) > 0 
      ? Number(tareWeight) 
      : (finalGross > Number(quantity) ? Number((finalGross - Number(quantity)).toFixed(2)) : 0);
    const finalNet = Number(grossWeight) > 0 && Number(tareWeight) > 0
      ? Number(Math.max(0, Number(grossWeight) - Number(tareWeight)).toFixed(2))
      : Number((Number(quantity) || 0).toFixed(2));

    const slipNumber = `WB-${Math.floor(1000 + Math.random() * 9000)}`;
    const challanNumber = challanNo || `CH-${Math.floor(1000 + Math.random() * 9000)}`;
    const todayDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const todayTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const inwardRecord = {
      id: `INW-${Date.now()}`,
      slipNo: slipNumber,
      challanNo: challanNumber,
      date: todayDate,
      time: todayTime,
      material: selectedMaterial.name,
      supplier: supplierName,
      grossWeight: finalGross,
      tareWeight: finalTare,
      quantity: finalNet,
      netTons: finalNet,
      unit: selectedMaterial.unit,
      vehicleNo: vehicleNo || 'MH-10-AQ-9080',
      targetSilo: selectedMaterial.defaultSilo,
      destination: selectedMaterial.defaultSilo,
      createdAt: new Date().toISOString()
    };

    try {
      const existingRaw = localStorage.getItem(INWARD_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [inwardRecord, ...existing];
      localStorage.setItem(INWARD_STORAGE_KEY, JSON.stringify(updated));
      pushCloudStore('cloud_material_inward', INWARD_STORAGE_KEY, updated);

      // Create corresponding Weighbridge receipt with real measured weights
      const wbKey = STORAGE_KEYS?.WEIGHBRIDGE || 'rmc_weighbridge_v2';
      const existingWbRaw = localStorage.getItem(wbKey);
      const existingWb = existingWbRaw ? JSON.parse(existingWbRaw) : [];
      const newWb = {
        id: `WB-${Date.now()}`,
        slipNo: slipNumber,
        date: todayDate,
        time: todayTime,
        vehicleNo: inwardRecord.vehicleNo,
        material: inwardRecord.material,
        party: inwardRecord.supplier,
        gross: finalGross,
        tare: finalTare,
        net: finalNet,
        unit: 'Tons',
        status: 'Completed',
        inventoryUpdated: true,
        createdAt: new Date().toISOString()
      };
      const updatedWb = [newWb, ...existingWb];
      localStorage.setItem(wbKey, JSON.stringify(updatedWb));
      pushCloudStore('cloud_weighbridge', wbKey, updatedWb);

      // Update Silo stock ledger with net intake
      let targetKey = 'agg20';
      const matLower = (selectedMaterial.name || '').toLowerCase();
      if (matLower.includes('cement')) targetKey = 'cement';
      else if (matLower.includes('fly ash') || matLower.includes('pozzocrete')) targetKey = 'flyash';
      else if (matLower.includes('10mm')) targetKey = 'agg10';
      else if (matLower.includes('20mm')) targetKey = 'agg20';
      else if (matLower.includes('m-sand') || matLower.includes('fine sand')) targetKey = 'sand';
      else if (matLower.includes('river sand')) targetKey = 'riverSand';

      const siloKey = STORAGE_KEYS?.SILO_INVENTORY || 'rmc_silo_inventory_v2';
      const rawSilo = localStorage.getItem(siloKey);
      const siloData = rawSilo ? JSON.parse(rawSilo) : { ...INITIAL_SILO_STOCK };
      if (siloData[targetKey]) {
        const cur = Number(siloData[targetKey].stockTons) || 0;
        siloData[targetKey].stockTons = Math.max(0, Number((cur + finalNet).toFixed(2)));
        localStorage.setItem(siloKey, JSON.stringify(siloData));
        pushCloudStore('cloud_silo_inventory', siloKey, siloData);
      }
    } catch (e) {
      console.warn('Error saving material inward:', e);
    }

    setSavedSuccess(true);
    if (onComplete) onComplete(inwardRecord);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-fadeIn text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                {language === 'mr' ? 'आलेला कच्चा माल नोंदवा' : 'Receive Raw Materials'}
              </h3>
              <p className="text-[11px] text-amber-200">
                {language === 'mr' ? 'पायरी ' + step + ' / ४' : 'Step ' + step + ' of 4'}
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
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Short Instruction Banner */}
        <div className="bg-amber-50 px-5 py-2 border-b border-amber-200 text-xs text-amber-950 font-semibold">
          {t('instructionReceiveMaterials')}
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Success View */}
        {savedSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {t('materialReceivedSuccess')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'mr'
                  ? `${selectedMaterial.name} (${quantity} ${selectedMaterial.unit}) साठ्यामध्ये यशस्वीपणे जमा झाले.`
                  : `${quantity} ${selectedMaterial.unit} of ${selectedMaterial.name} added to ${selectedMaterial.defaultSilo}.`}
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
              >
                {t('done', 'Done')}
              </button>
            </div>
          </div>
        ) : (
          /* Steps Form */
          <div className="p-5 min-h-[250px] flex flex-col justify-between">
            {/* Step 1: Select Material */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{t('qWhatMaterialArrived')}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'प्लॅन्टवर आलेल्या मालाचा प्रकार निवडा:' : 'Select the material delivered by tanker/truck:'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {MATERIALS_LIST.map((m) => {
                    const isSelected = selectedMaterial.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMaterial(m)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300 font-bold shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{m.name}</div>
                          <div className="text-[10px] text-slate-500">{m.defaultSilo}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-700 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Select Supplier */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{t('qWhoIsSupplier')}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'माल पाठवणाऱ्या सप्लायरचे नाव निवडा:' : 'Select the approved vendor/supplier:'}</p>
                </div>

                <div className="space-y-1.5">
                  {SUPPLIERS_LIST.map((s) => {
                    const isSelected = supplierName === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSupplierName(s)}
                        className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300 text-amber-950'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-600" />
                          <span>{s}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-700 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Quantity & Vehicle No */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{t('qHowMuchMaterial')}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'वजन काट्यावरील (Weighbridge) निव्वळ वजन टाका:' : 'Enter net weight measured at weighbridge:'}</p>
                </div>

                {/* Gross, Tare & Net Weighbridge Entries */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        {language === 'mr' ? 'एकूण वजन (Gross MT):' : 'Gross Weight (MT):'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 38.50"
                        value={grossWeight}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGrossWeight(val);
                          const g = parseFloat(val) || 0;
                          const t = parseFloat(tareWeight) || 0;
                          if (g > 0 && t > 0) {
                            setQuantity(Math.max(0, parseFloat((g - t).toFixed(2))));
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-xs bg-white focus:outline-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        {language === 'mr' ? 'रिकामे वजन (Tare MT):' : 'Tare Weight (MT):'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 14.20"
                        value={tareWeight}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTareWeight(val);
                          const g = parseFloat(grossWeight) || 0;
                          const t = parseFloat(val) || 0;
                          if (g > 0 && t > 0) {
                            setQuantity(Math.max(0, parseFloat((g - t).toFixed(2))));
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-xs bg-white focus:outline-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-[11px] font-bold text-slate-900 block">
                        {language === 'mr' ? 'निव्वळ वजन (Net = Gross - Tare):' : 'Net Quantity (Gross - Tare):'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {language === 'mr' ? 'किंवा खालील बटनांवरून निवडा' : 'or enter direct net weight below'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-24 px-2 py-1 border rounded-lg font-mono font-black text-sm text-right text-emerald-800 bg-white focus:outline-emerald-500"
                      />
                      <span className="font-bold text-xs text-slate-700">{selectedMaterial.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Quick weight pills */}
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">
                    {language === 'mr' ? '१-क्लिकने वजन निवडा (टन):' : 'Quick Presets (Net MT):'}
                  </span>
                  <div className="flex gap-1.5 mb-2">
                    {[20, 25, 30, 35, 40].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setQuantity(w);
                          if (tareWeight && !grossWeight) {
                            setGrossWeight(parseFloat((w + parseFloat(tareWeight)).toFixed(2)));
                          }
                        }}
                        className={`flex-1 py-1 rounded-lg font-mono font-black text-xs transition-all cursor-pointer ${
                          Number(quantity) === w
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 border text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {w} MT
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">{language === 'mr' ? 'गाडी नंबर:' : 'Vehicle Reg #:'}</label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={e => setVehicleNo(e.target.value)}
                      placeholder="MH-10-AQ-9080"
                      className="w-full px-3 py-1.5 border rounded-lg text-xs font-mono uppercase focus:outline-amber-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">{language === 'mr' ? 'सप्लायर चालान नंबर:' : 'Supplier Challan #:'}</label>
                    <input
                      type="text"
                      value={challanNo}
                      onChange={e => setChallanNo(e.target.value)}
                      placeholder="CH-88219"
                      className="w-full px-3 py-1.5 border rounded-lg text-xs font-mono focus:outline-amber-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Summary & Confirm */}
            {step === 4 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{language === 'mr' ? 'माहिती तपासा आणि खात्री करा' : 'Verify & Confirm Inward'}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'खालील माहिती बरोबर असल्यास सेव्ह करा:' : 'Review details before updating stock levels:'}</p>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-amber-200/80">
                    <span className="text-slate-600 font-bold">{language === 'mr' ? 'कच्चा माल:' : 'Material:'}</span>
                    <span className="font-bold text-amber-950 text-sm">{selectedMaterial.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-amber-200/80">
                    <span className="text-slate-600 font-bold">{language === 'mr' ? 'सप्लायर:' : 'Supplier:'}</span>
                    <span className="font-bold text-slate-900">{supplierName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-amber-200/80">
                    <span className="text-slate-600 font-bold">{language === 'mr' ? 'वजन (Quantity):' : 'Net Quantity:'}</span>
                    <span className="font-mono font-black text-amber-900 text-sm">{quantity} {selectedMaterial.unit}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600 font-bold">{language === 'mr' ? 'सायलो / साठवणूक:' : 'Storage Silo:'}</span>
                    <span className="font-bold text-emerald-800">{selectedMaterial.defaultSilo}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Buttons */}
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

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                >
                  <span>{t('next', 'Next Step')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{language === 'mr' ? 'माल नोंदवा (Save)' : 'Save Inward Material'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <HelpModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          topic="receiveMaterials"
        />
      </div>
    </div>,
    document.body
  );
}
