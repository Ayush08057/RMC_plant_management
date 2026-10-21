import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  ClipboardList,
  Truck,
  CheckCircle2,
  Clock,
  Navigation,
  FlaskConical,
  Calendar,
  Layers,
  ArrowRight,
  HelpCircle,
  TrendingUp,
  Settings,
  Sparkles,
  X,
  Plus
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { subscribeCloudStore, sanitizeStoreItems } from '../../../services/cloudSyncService';

// Wizards
import SendVehicleWizard from './SendVehicleWizard';
import ReceiveMaterialsWizard from './ReceiveMaterialsWizard';
import MakeConcreteWizard from './MakeConcreteWizard';
import RecordVehicleReturnWizard from './RecordVehicleReturnWizard';
import DriverAttendanceWizard from './DriverAttendanceWizard';
import QualityTestWizard from './QualityTestWizard';
import TodaysWorkView from './TodaysWorkView';
import HelpModal from './HelpModal';

export default function SimplePlantManagerHome({ onNavigateTab, onSwitchToAdvanced }) {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  // Active Wizard Modals
  const [activeWizard, setActiveWizard] = useState(null); // 'sendVehicle', 'receiveMaterials', 'makeConcrete', 'recordReturn', 'driverAttendance', 'qualityTest', 'todaysWork'
  const [showHelp, setShowHelp] = useState(false);

  // Live operational data for space utilization
  const [trips, setTrips] = useState([]);
  const [inward, setInward] = useState([]);

  useEffect(() => {
    try {
      const tr = localStorage.getItem('rmc_driver_trips_v2');
      if (tr) setTrips(sanitizeStoreItems(JSON.parse(tr)));
      const inw = localStorage.getItem('rmc_material_inward_v2');
      if (inw) setInward(sanitizeStoreItems(JSON.parse(inw)));
    } catch {}

    const unsubTrips = subscribeCloudStore('cloud_driver_trips', 'rmc_driver_trips_v2', [], (items) => {
      if (Array.isArray(items)) setTrips(items);
    });
    const unsubInward = subscribeCloudStore('cloud_material_inward', 'rmc_material_inward_v2', [], (items) => {
      if (Array.isArray(items)) setInward(items);
    });

    return () => {
      if (typeof unsubTrips === 'function') unsubTrips();
      if (typeof unsubInward === 'function') unsubInward();
    };
  }, []);

  const activeMixersOnRoad = trips.filter(t => t.status === 'Departed' || t.status === 'In Transit' || t.status === 'En Route' || t.status === 'Pouring').length;
  const totalConcreteM3 = trips.reduce((sum, t) => sum + (Number(t.quantityM3 || t.quantity) || 0), 0);
  const totalInwardMT = inward.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  // Time greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 
    ? t('goodMorning', 'Good Morning') 
    : currentHour < 17 
      ? t('goodAfternoon', 'Good Afternoon') 
      : t('goodEvening', 'Good Evening');

  // The 8 Primary Action Cards
  const PRIMARY_ACTIONS = [
    {
      id: 'receiveMaterials',
      title: t('receiveMaterialsTitle'),
      desc: t('receiveMaterialsDesc'),
      icon: PackageCheck,
      colorClass: 'bg-amber-50 text-amber-700 border-amber-200 group-hover:border-amber-400 group-hover:bg-amber-100/60',
      badgeBg: 'bg-amber-100 text-amber-900 border border-amber-200',
      stepCount: t('4 Steps'),
      action: () => setActiveWizard('receiveMaterials'),
    },
    {
      id: 'makeConcrete',
      title: t('makeConcreteTitle'),
      desc: t('makeConcreteDesc'),
      icon: ClipboardList,
      colorClass: 'bg-purple-50 text-purple-700 border-purple-200 group-hover:border-purple-400 group-hover:bg-purple-100/60',
      badgeBg: 'bg-purple-100 text-purple-900 border border-purple-200',
      stepCount: t('3 Steps'),
      action: () => setActiveWizard('makeConcrete'),
    },
    {
      id: 'sendVehicle',
      title: t('sendVehicleTitle'),
      desc: t('sendVehicleDesc'),
      icon: Truck,
      colorClass: 'bg-blue-50 text-blue-700 border-blue-200 group-hover:border-blue-400 group-hover:bg-blue-100/60',
      badgeBg: 'bg-blue-100 text-blue-900 border border-blue-200',
      stepCount: t('5 Steps'),
      action: () => setActiveWizard('sendVehicle'),
    },
    {
      id: 'recordReturn',
      title: t('recordReturnTitle'),
      desc: t('recordReturnDesc'),
      icon: CheckCircle2,
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:border-emerald-400 group-hover:bg-emerald-100/60',
      badgeBg: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
      stepCount: t('1-Click'),
      action: () => setActiveWizard('recordReturn'),
    },
    {
      id: 'driverAttendance',
      title: t('driverAttendanceTitle'),
      desc: t('driverAttendanceDesc'),
      icon: Clock,
      colorClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 group-hover:border-cyan-400 group-hover:bg-cyan-100/60',
      badgeBg: 'bg-cyan-100 text-cyan-900 border border-cyan-200',
      stepCount: t('Roll Call'),
      action: () => setActiveWizard('driverAttendance'),
    },
    {
      id: 'checkVehicle',
      title: t('checkVehicleTitle'),
      desc: t('checkVehicleDesc'),
      icon: Navigation,
      colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 group-hover:border-indigo-400 group-hover:bg-indigo-100/60',
      badgeBg: 'bg-indigo-100 text-indigo-900 border border-indigo-200',
      stepCount: t('Live Status'),
      action: () => onNavigateTab ? onNavigateTab('driver-trips') : setActiveWizard('todaysWork'),
    },
    {
      id: 'recordQualityTest',
      title: t('recordQualityTestTitle'),
      desc: t('recordQualityTestDesc'),
      icon: FlaskConical,
      colorClass: 'bg-teal-50 text-teal-700 border-teal-200 group-hover:border-teal-400 group-hover:bg-teal-100/60',
      badgeBg: 'bg-teal-100 text-teal-900 border border-teal-200',
      stepCount: t('QC Slump'),
      action: () => setActiveWizard('qualityTest'),
    },
    {
      id: 'viewTodaysWork',
      title: t('viewTodaysWorkTitle'),
      desc: t('viewTodaysWorkDesc'),
      icon: Calendar,
      colorClass: 'bg-slate-50 text-slate-800 border-slate-200 group-hover:border-slate-400 group-hover:bg-slate-100/80',
      badgeBg: 'bg-slate-100 text-slate-800 border border-slate-200',
      stepCount: t('Summary'),
      action: () => setActiveWizard('todaysWork'),
    },
  ];

  return (
    <div className="space-y-3.5 max-w-6xl mx-auto text-slate-800">
      
      {/* Compact Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
            {t('whatToDoToday', 'What would you like to do today?')}
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            {t('whatToDoSubtitle', 'Click any action below to complete your work step by step.')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('help', 'Help')}</span>
          </button>

          {onSwitchToAdvanced && (
            <button
              type="button"
              onClick={onSwitchToAdvanced}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              title="View full charts, SCADA telemetry, and batching matrices"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>{t('switchToAdvanced', 'Advanced View')}</span>
            </button>
          )}
        </div>
      </div>

      {/* The 8 Primary Action Buttons Grid - Sleek, Compact & Space-Efficient */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            {language === 'mr' ? 'दैनंदिन मुख्य कामे:' : 'Primary Plant Actions:'}
          </h2>
          <span className="text-[10px] text-slate-400 font-semibold">
            {language === 'mr' ? 'कामावर दाबा' : 'Click any action to start'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {PRIMARY_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className="group relative text-left p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 hover:border-blue-500 hover:shadow-xs transition-all duration-150 cursor-pointer shadow-2xs flex items-start gap-2.5 active:scale-[0.99] min-h-[64px]"
              >
                {/* Left: Compact Icon */}
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item.colorClass}`}>
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>

                {/* Right: Title, Badge, Description */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs sm:text-[12.5px] font-bold text-slate-900 group-hover:text-blue-700 leading-tight truncate">
                      {item.title}
                    </h3>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 ${item.badgeBg}`}>
                      {item.stepCount}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Space Utilization: Today's Live Operational Snapshot */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
              {language === 'mr' ? 'आजचे लाईव्ह कामकाज:' : "Today's Live Plant Activity:"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveWizard('todaysWork')}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>{language === 'mr' ? 'पूर्ण तपशील पहा' : 'View Full Summary'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* 4 Compact Live KPI Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 font-medium truncate">{language === 'mr' ? 'रस्त्यावरील गाड्या' : 'Active Mixers'}</div>
              <div className="text-xs font-black text-slate-900 font-mono">{activeMixersOnRoad} {language === 'mr' ? 'रस्त्यावर' : 'On Road'}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 font-medium truncate">{language === 'mr' ? 'काँक्रीट पाठवले' : 'Concrete Dispatched'}</div>
              <div className="text-xs font-black text-slate-900 font-mono">{totalConcreteM3.toFixed(1)} m³</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 font-medium truncate">{language === 'mr' ? 'कच्चा माल आला' : 'Materials Inward'}</div>
              <div className="text-xs font-black text-slate-900 font-mono">{totalInwardMT.toFixed(1)} MT</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 font-medium truncate">{language === 'mr' ? 'ट्रिप्स पूर्ण' : 'Trips Done'}</div>
              <div className="text-xs font-black text-slate-900 font-mono">{trips.filter(t => t.status === 'Completed').length} / {trips.length}</div>
            </div>
          </div>
        </div>

        {/* 2-Column Split Live Activity Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Column 1: Live Transit Mixers */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === 'mr' ? 'गाड्यांची ताजी स्थिती (Dispatches)' : 'Live Mixer Dispatches'}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{trips.length} {language === 'mr' ? 'ट्रिप्स' : 'trips'}</span>
              </div>

              {trips.length === 0 ? (
                <div className="py-3 text-center text-slate-400 text-xs">
                  <p>{language === 'mr' ? 'आज अजून कोणतीही गाडी रवाना झालेली नाही.' : 'No vehicle trips recorded yet today.'}</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {trips.slice(0, 3).map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-slate-900 text-[11px]">{t.vehicleNo}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{t.clientName || 'Customer Site'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                        <span className="font-bold text-blue-700">{t.quantityM3 || 6} m³</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {t.status === 'Completed' ? (language === 'mr' ? 'पूर्ण' : 'Done') : (language === 'mr' ? 'रस्त्यावर' : 'Transit')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveWizard('sendVehicle')}
              className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 cursor-pointer w-full transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>{language === 'mr' ? 'नवीन गाडी साइटवर पाठवा' : 'Dispatch Mixer Vehicle'}</span>
            </button>
          </div>

          {/* Column 2: Raw Materials Received */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>{language === 'mr' ? 'आज आलेला कच्चा माल (Inward)' : 'Raw Materials Arrived Today'}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{inward.length} {language === 'mr' ? 'नोंदी' : 'loads'}</span>
              </div>

              {inward.length === 0 ? (
                <div className="py-3 text-center text-slate-400 text-xs">
                  <p>{language === 'mr' ? 'आज नवीन कच्चा माल आलेला नाही.' : 'No raw materials inward recorded today yet.'}</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {inward.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-amber-50/60 border border-amber-100 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 block truncate text-[11px]">{item.material}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{item.supplier || 'Supplier'}</span>
                      </div>
                      <span className="font-mono font-black text-amber-950 text-xs shrink-0 ml-2">
                        {item.quantity} {item.unit || 'MT'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveWizard('receiveMaterials')}
              className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center justify-center gap-1 cursor-pointer w-full transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>{language === 'mr' ? 'आलेला कच्चा माल नोंदवा' : 'Record Material Inward'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guided Step-by-Step Wizards */}
      <SendVehicleWizard
        isOpen={activeWizard === 'sendVehicle'}
        onClose={() => setActiveWizard(null)}
      />

      <ReceiveMaterialsWizard
        isOpen={activeWizard === 'receiveMaterials'}
        onClose={() => setActiveWizard(null)}
      />

      <MakeConcreteWizard
        isOpen={activeWizard === 'makeConcrete'}
        onClose={() => setActiveWizard(null)}
      />

      <RecordVehicleReturnWizard
        isOpen={activeWizard === 'recordReturn'}
        onClose={() => setActiveWizard(null)}
      />

      <DriverAttendanceWizard
        isOpen={activeWizard === 'driverAttendance'}
        onClose={() => setActiveWizard(null)}
      />

      <QualityTestWizard
        isOpen={activeWizard === 'qualityTest'}
        onClose={() => setActiveWizard(null)}
      />

      {/* Today's Work Summary Modal */}
      {activeWizard === 'todaysWork' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-200 text-slate-800 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {t('viewTodaysWorkTitle', "Today's Work Summary")}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('viewTodaysWorkDesc', "Summary of all concrete dispatched and materials received today.")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveWizard(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <TodaysWorkView
                onOpenWizard={(wiz) => setActiveWizard(wiz)}
                onNavigateModule={(tab) => {
                  setActiveWizard(null);
                  if (onNavigateTab) onNavigateTab(tab);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* General Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        topic="general"
      />
    </div>
  );
}
