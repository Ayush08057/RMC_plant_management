import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Clock,
  CheckCircle2,
  X,
  Check,
  XCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useWorkforce } from '../../../context/WorkforceContext';
import HelpModal from './HelpModal';

export default function DriverAttendanceWizard({ isOpen, onClose, onComplete }) {
  const { language, t } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const workforce = useWorkforce();

  const staffList = (workforce?.employees || []).filter((e) => {
    const roleLower = (e.role || '').toLowerCase();
    const deptLower = (e.department || '').toLowerCase();
    return (
      roleLower.includes('driver') ||
      roleLower.includes('operator') ||
      roleLower.includes('helper') ||
      deptLower.includes('fleet') ||
      deptLower.includes('production')
    );
  });

  const [attendanceMap, setAttendanceMap] = useState({});

  React.useEffect(() => {
    const init = {};
    staffList.forEach((staff) => {
      init[staff.id] = 'Present';
    });
    setAttendanceMap(init);
  }, [workforce?.employees]);

  const toggleStatus = (id, newStatus) => {
    setAttendanceMap(prev => ({
      ...prev,
      [id]: newStatus
    }));
  };

  const handleSave = () => {
    // Record attendance into localStorage & central workforce ledger
    try {
      const today = new Date().toISOString().split('T')[0];
      const records = DRIVERS_STAFF.map(s => ({
        employeeId: s.id,
        name: s.name,
        role: s.role,
        date: today,
        status: attendanceMap[s.id] || 'Present',
        recordedAt: new Date().toISOString()
      }));
      localStorage.setItem(`rmc_attendance_${today}`, JSON.stringify(records));

      if (workforce && typeof workforce.addAttendanceRecord === 'function') {
        DRIVERS_STAFF.forEach(s => {
          workforce.addAttendanceRecord({
            employeeId: s.id,
            employeeName: s.name,
            role: s.role,
            status: attendanceMap[s.id] || 'Present',
            punchIn: '08:00 AM',
            date: today,
            remarks: 'Guided Plant Daily Roll Call'
          });
        });
      }
    } catch (e) {
      console.warn('Attendance save err:', e);
    }

    setSavedSuccess(true);
    if (onComplete) onComplete(attendanceMap);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-fadeIn text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                {language === 'mr' ? 'ड्रायव्हर / कामगार हजेरी' : 'Driver & Staff Attendance'}
              </h3>
              <p className="text-[11px] text-blue-200">
                {language === 'mr' ? 'आज कामावर कोण हजर आहे ते नोंदवा' : 'Quick daily roll-call check'}
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
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Short Instruction Banner */}
        <div className="bg-blue-50 px-5 py-2 border-b border-blue-200 text-xs text-blue-950 font-semibold">
          {t('instructionDriverAttendance')}
        </div>

        {/* Success View */}
        {savedSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {t('attendanceRecordedSuccess')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'mr'
                  ? 'सर्व ड्रायव्हर व कामगारांची आजची हजेरी सेव्ह झाली.'
                  : 'Daily attendance records successfully verified and updated.'}
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
          /* Attendance Roll List */
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between pb-1 text-xs">
              <span className="font-bold text-slate-700">{language === 'mr' ? 'कर्मचाऱ्याचे नाव:' : 'Driver / Worker Name:'}</span>
              <span className="font-bold text-slate-500">{language === 'mr' ? 'हजेरी स्थिती:' : 'Attendance Status:'}</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {staffList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {language === 'mr' ? 'कोणताही ड्रायव्हर किंवा कामगार नोंदणीकृत नाही.' : 'No drivers or operational personnel enrolled yet in workforce directory.'}
                </div>
              ) : (
                staffList.map((staff) => {
                  const status = attendanceMap[staff.id];
                  return (
                    <div
                      key={staff.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{staff.name}</div>
                        <div className="text-[10px] text-slate-500">{staff.role}</div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleStatus(staff.id, 'Present')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            status === 'Present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {language === 'mr' ? 'हजर (P)' : 'Present'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(staff.id, 'Absent')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            status === 'Absent'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {language === 'mr' ? 'गैरहजर (A)' : 'Absent'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
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
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{language === 'mr' ? 'हजेरी सेव्ह करा' : 'Save Attendance'}</span>
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
