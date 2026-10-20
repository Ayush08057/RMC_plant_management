import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Layers,
  Scale,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  HelpCircle,
  AlertCircle,
  Check,
  ClipboardList
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { pushCloudStore } from '../../../services/cloudSyncService';
import HelpModal from './HelpModal';

const BATCHING_STORAGE_KEY = 'rmc_batching_sheets_v2';

const MIX_DESIGNS = [
  { grade: 'M15', cement: 240, flyash: 40, agg20: 740, agg10: 480, sand: 820, water: 175, admixture: 2.0 },
  { grade: 'M20', cement: 300, flyash: 50, agg20: 730, agg10: 490, sand: 800, water: 170, admixture: 2.5 },
  { grade: 'M25', cement: 360, flyash: 60, agg20: 750, agg10: 500, sand: 800, water: 165, admixture: 3.0 },
  { grade: 'M30', cement: 390, flyash: 70, agg20: 740, agg10: 490, sand: 790, water: 160, admixture: 3.5 },
  { grade: 'M35', cement: 420, flyash: 80, agg20: 730, agg10: 480, sand: 780, water: 155, admixture: 4.0 },
  { grade: 'M40', cement: 450, flyash: 90, agg20: 720, agg10: 470, sand: 770, water: 150, admixture: 4.5 },
];

export default function MakeConcreteWizard({ isOpen, onClose, onComplete }) {
  const { language, t } = useLanguage();
  const [step, setStep] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // State
  const [selectedMix, setSelectedMix] = useState(MIX_DESIGNS[2]); // Default M25
  const [volumeM3, setVolumeM3] = useState(6.0);
  const [operatorName, setOperatorName] = useState('Rajesh Mane');
  const [validationError, setValidationError] = useState('');

  const handleNext = () => {
    setValidationError('');
    if (step === 2 && (!volumeM3 || Number(volumeM3) <= 0)) {
      setValidationError(language === 'mr' ? 'कृपया योग्य उत्पादन प्रमाण (m³) टाका.' : 'Please enter valid volume in m³.');
      return;
    }
    setStep(prev => Math.min(3, prev + 1));
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
    setValidationError('');
  };

  // Calculated ingredients for this volume
  const cementKg = Math.round(selectedMix.cement * volumeM3);
  const flyashKg = Math.round(selectedMix.flyash * volumeM3);
  const agg20Kg = Math.round(selectedMix.agg20 * volumeM3);
  const agg10Kg = Math.round(selectedMix.agg10 * volumeM3);
  const sandKg = Math.round(selectedMix.sand * volumeM3);
  const waterL = Math.round(selectedMix.water * volumeM3);
  const admixKg = Number((selectedMix.admixture * volumeM3).toFixed(1));

  const handleSave = () => {
    const sheetNo = `25-26/${Math.floor(1000 + Math.random() * 9000)}`;
    const batchRecord = {
      id: `BS-${Date.now()}`,
      sheetNo,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      mixGrade: selectedMix.grade,
      volume: Number(volumeM3),
      totalBatchVolumeM3: Number(volumeM3),
      customerName: 'Commercial Concrete Pour',
      site: 'Site Foundation Slab',
      vehicleNo: 'Plant Mixer #01',
      driverName: operatorName || 'Plant Operator',
      batchesCount: Math.ceil(volumeM3 / 1.0),
      operatorName: operatorName || 'Plant Operator',
      qcStatus: 'Approved',
      actualSlump: '130 mm',
      targetSlump: selectedMix.slump || '120 ± 25 mm',
      materials: [
        { name: 'Cement (OPC 53)', target: cementKg, actual: cementKg, unit: 'kg' },
        { name: 'Fly Ash (Pozzocrete)', target: flyashKg, actual: flyashKg, unit: 'kg' },
        { name: '20mm Aggregate', target: agg20Kg, actual: agg20Kg, unit: 'kg' },
        { name: '10mm Aggregate', target: agg10Kg, actual: agg10Kg, unit: 'kg' },
        { name: 'Crushed M-Sand', target: sandKg, actual: sandKg, unit: 'kg' },
        { name: 'Water', target: waterL, actual: waterL, unit: 'L' },
        { name: 'Admixture (PCE)', target: admixKg, actual: admixKg, unit: 'kg' },
      ],
      actualBatched: {
        cementKg,
        flyashKg,
        agg20Kg,
        agg10Kg,
        sandKg,
        waterL,
        admixKg
      },
      createdAt: new Date().toISOString()
    };

    try {
      const existingRaw = localStorage.getItem(BATCHING_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [batchRecord, ...existing];
      localStorage.setItem(BATCHING_STORAGE_KEY, JSON.stringify(updated));
      pushCloudStore('cloud_batching_sheets', BATCHING_STORAGE_KEY, updated);
    } catch (e) {
      console.warn('Error saving batching sheet:', e);
    }

    setSavedSuccess(true);
    if (onComplete) onComplete(batchRecord);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-fadeIn text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                {language === 'mr' ? 'काँक्रीट तयार करा (बॅचिंग शीट)' : 'Make Concrete (Batch Production)'}
              </h3>
              <p className="text-[11px] text-purple-200">
                {language === 'mr' ? 'पायरी ' + step + ' / ३' : 'Step ' + step + ' of 3'}
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
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Short Instruction Banner */}
        <div className="bg-purple-50 px-5 py-2 border-b border-purple-200 text-xs text-purple-950 font-semibold">
          {t('instructionMakeConcrete')}
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
                {t('concreteMadeSuccess')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'mr'
                  ? `${selectedMix.grade} काँक्रीट (${volumeM3} m³) बॅचिंग शीट रेकॉर्ड झाली.`
                  : `${volumeM3} m³ of ${selectedMix.grade} concrete recorded successfully.`}
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
            {/* Step 1: Select Approved Mix Grade */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{language === 'mr' ? 'कोणत्या ग्रेडचे काँक्रीट बनवायचे आहे?' : 'Select Approved Concrete Mix Grade:'}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'लॅबने ठरवून दिलेल्या ग्रेडपैकी एक निवडा:' : 'Select mix formula approved by QA/QC engineer:'}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {MIX_DESIGNS.map((mix) => {
                    const isSelected = selectedMix.grade === mix.grade;
                    return (
                      <button
                        key={mix.grade}
                        type="button"
                        onClick={() => setSelectedMix(mix)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-50 border-purple-600 text-purple-950 ring-2 ring-purple-300 font-black shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-sm font-black">{mix.grade}</div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Concrete</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Volume (m³) */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{language === 'mr' ? 'किती घनमीटर (m³) उत्पादन करायचे आहे?' : 'Enter Production Volume in m³:'}</h4>
                  <p className="text-xs text-slate-500">{language === 'mr' ? 'निवडलेला ग्रेड:' : 'Selected Mix:'} <strong className="text-purple-900">{selectedMix.grade} Concrete</strong></p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">{language === 'mr' ? '१-क्लिकने निवडा:' : '1-Click Volume Buttons:'}</span>
                  <div className="flex gap-1.5 mb-2">
                    {[3.0, 4.5, 6.0, 7.0, 8.0].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVolumeM3(v)}
                        className={`flex-1 py-1.5 rounded-lg font-mono font-black text-xs transition-all cursor-pointer ${
                          Number(volumeM3) === v
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 border text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {v} m³
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">{language === 'mr' ? 'अचूक प्रमाण:' : 'Exact Volume:'}</span>
                    <input
                      type="number"
                      step="0.5"
                      value={volumeM3}
                      onChange={e => setVolumeM3(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 border rounded-lg font-mono font-black text-sm focus:outline-purple-500 bg-white"
                    />
                    <span className="font-bold text-xs">m³</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Ingredient Verification & Confirm */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <h4 className="text-sm font-black text-slate-900">{language === 'mr' ? 'कच्चा माल तपासा आणि बॅचिंग सेव्ह करा' : 'Ingredient Summary & Confirm'}</h4>
                  <p className="text-xs text-slate-500">{selectedMix.grade} Concrete • <strong>{volumeM3} m³</strong></p>
                </div>

                <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-600">Cement (OPC 53):</span>
                    <span className="font-bold text-slate-900">{cementKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-600">Fly Ash:</span>
                    <span className="font-bold text-slate-900">{flyashKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-600">20mm Aggregates:</span>
                    <span className="font-bold text-slate-900">{agg20Kg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-600">10mm Aggregates:</span>
                    <span className="font-bold text-slate-900">{agg10Kg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-600">Crushed M-Sand:</span>
                    <span className="font-bold text-slate-900">{sandKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-600">Water:</span>
                    <span className="font-bold text-blue-800">{waterL.toLocaleString()} Litres</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-t border-purple-200 pt-1 font-bold">
                    <span className="text-slate-700">Admixture (PCE):</span>
                    <span className="text-purple-900">{admixKg} kg</span>
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

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
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
                  <span>{language === 'mr' ? 'बॅचिंग नोंदवा (Save)' : 'Save Batching Run'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <HelpModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          topic="makeConcrete"
        />
      </div>
    </div>,
    document.body
  );
}
