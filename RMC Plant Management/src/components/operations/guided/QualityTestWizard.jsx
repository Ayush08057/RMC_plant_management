import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FlaskConical,
  CheckCircle2,
  X,
  Check,
  HelpCircle,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import HelpModal from './HelpModal';

const QC_STORAGE_KEY = 'rmc_qc_tests_v2';
const GRADES = ['M15', 'M20', 'M25', 'M30', 'M35', 'M40'];

export default function QualityTestWizard({ isOpen, onClose, onComplete }) {
  const { language, t } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State
  const [grade, setGrade] = useState('M25');
  const [slumpValue, setSlumpValue] = useState(130);
  const [sampleId, setSampleId] = useState(`CUBE-${Math.floor(100 + Math.random() * 900)}`);
  const [remarks, setRemarks] = useState('Workability verified ok. Approved for dispatch.');

  // Tolerance check
  const targetSlump = 130;
  const isPass = Math.abs(Number(slumpValue) - targetSlump) <= 25;

  const handleSave = () => {
    const testRecord = {
      id: `QC-${Date.now()}`,
      sampleId,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      grade,
      slumpValue: Number(slumpValue),
      result: isPass ? 'PASS' : 'OUT_OF_SPEC',
      remarks,
      testedBy: 'QA/QC Lab Technician',
      createdAt: new Date().toISOString()
    };

    try {
      const existingRaw = localStorage.getItem(QC_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [testRecord, ...existing];
      localStorage.setItem(QC_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('QC save error:', e);
    }

    setSavedSuccess(true);
    if (onComplete) onComplete(testRecord);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-fadeIn text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-teal-900 to-cyan-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                {language === 'mr' ? 'काँक्रीट क्वालिटी टेस्ट नोंदवा' : 'Record Quality Test'}
              </h3>
              <p className="text-[11px] text-teal-200">
                {language === 'mr' ? 'स्लम्प व क्युब टेस्टिंगचे मोजमाप' : 'Slump workability & cube sampling'}
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
              className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Short Instruction Banner */}
        <div className="bg-teal-50 px-5 py-2 border-b border-teal-200 text-xs text-teal-950 font-semibold">
          {t('instructionQualityTest')}
        </div>

        {/* Success View */}
        {savedSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {t('qualityTestSavedSuccess')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'mr'
                  ? `${grade} काँक्रीटचा स्लम्प (${slumpValue} mm) यशस्वीपणे सेव्ह झाला.`
                  : `${grade} concrete slump (${slumpValue} mm) test report registered.`}
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
          /* QC Test Form */
          <div className="p-5 space-y-4">
            {/* Grade Select */}
            <div>
              <label className="text-xs font-black text-slate-900 block mb-1">
                {language === 'mr' ? 'काँक्रीटचा ग्रेड निवडा:' : 'Select Concrete Mix Grade:'}
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {GRADES.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${
                      grade === g
                        ? 'bg-teal-700 text-white shadow-xs ring-2 ring-teal-300'
                        : 'bg-slate-100 text-slate-700 border hover:bg-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Slump Value */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-900">
                  {language === 'mr' ? 'स्लम्प कोन टेस्ट मोजमाप (Slump in mm):' : 'Measured Slump Test (mm):'}
                </label>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                  isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isPass ? '✓ PASS (120-150 mm)' : '⚠ OUT OF SPEC'}
                </span>
              </div>

              <div className="flex gap-1.5 mb-2">
                {[110, 120, 130, 140, 150].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlumpValue(s)}
                    className={`flex-1 py-1.5 rounded-lg font-mono font-black text-xs transition-all cursor-pointer ${
                      Number(slumpValue) === s
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 border hover:bg-slate-200'
                    }`}
                  >
                    {s} mm
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">{language === 'mr' ? 'अचूक व्हॅल्यू:' : 'Exact Slump:'}</span>
                <input
                  type="number"
                  value={slumpValue}
                  onChange={e => setSlumpValue(Number(e.target.value))}
                  className="w-28 px-3 py-1.5 border rounded-lg font-mono font-bold text-sm bg-white focus:outline-teal-500"
                />
                <span className="font-bold text-xs">mm</span>
              </div>
            </div>

            {/* Cube Sample ID & Remarks */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                  {language === 'mr' ? 'क्युब सॅम्पल नंबर:' : 'Cube Sample ID:'}
                </label>
                <input
                  type="text"
                  value={sampleId}
                  onChange={e => setSampleId(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-xs font-mono font-bold bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                  {language === 'mr' ? 'शेरा (Remarks):' : 'QC Remarks:'}
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{language === 'mr' ? 'टेस्ट रिझल्ट सेव्ह करा' : 'Save Test Result'}</span>
              </button>
            </div>
          </div>
        )}

        <HelpModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          topic="general"
        />
      </div>
    </div>,
    document.body
  );
}
