import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';

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
      colorClass: 'bg-amber-50 text-amber-700 border-amber-200 group-hover:border-amber-400',
      badgeBg: 'bg-amber-100 text-amber-900',
      stepCount: t('4 Steps'),
      action: () => setActiveWizard('receiveMaterials'),
    },
    {
      id: 'makeConcrete',
      title: t('makeConcreteTitle'),
      desc: t('makeConcreteDesc'),
      icon: ClipboardList,
      colorClass: 'bg-purple-50 text-purple-700 border-purple-200 group-hover:border-purple-400',
      badgeBg: 'bg-purple-100 text-purple-900',
      stepCount: t('3 Steps'),
      action: () => setActiveWizard('makeConcrete'),
    },
    {
      id: 'sendVehicle',
      title: t('sendVehicleTitle'),
      desc: t('sendVehicleDesc'),
      icon: Truck,
      colorClass: 'bg-blue-50 text-blue-700 border-blue-200 group-hover:border-blue-400',
      badgeBg: 'bg-blue-100 text-blue-900',
      stepCount: t('5 Steps'),
      action: () => setActiveWizard('sendVehicle'),
      highlight: true,
    },
    {
      id: 'recordReturn',
      title: t('recordReturnTitle'),
      desc: t('recordReturnDesc'),
      icon: CheckCircle2,
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:border-emerald-400',
      badgeBg: 'bg-emerald-100 text-emerald-900',
      stepCount: t('1-Click'),
      action: () => setActiveWizard('recordReturn'),
    },
    {
      id: 'driverAttendance',
      title: t('driverAttendanceTitle'),
      desc: t('driverAttendanceDesc'),
      icon: Clock,
      colorClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 group-hover:border-cyan-400',
      badgeBg: 'bg-cyan-100 text-cyan-900',
      stepCount: t('Roll Call'),
      action: () => setActiveWizard('driverAttendance'),
    },
    {
      id: 'checkVehicle',
      title: t('checkVehicleTitle'),
      desc: t('checkVehicleDesc'),
      icon: Navigation,
      colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 group-hover:border-indigo-400',
      badgeBg: 'bg-indigo-100 text-indigo-900',
      stepCount: t('Live Status'),
      action: () => onNavigateTab ? onNavigateTab('driver-trips') : setActiveWizard('todaysWork'),
    },
    {
      id: 'recordQualityTest',
      title: t('recordQualityTestTitle'),
      desc: t('recordQualityTestDesc'),
      icon: FlaskConical,
      colorClass: 'bg-teal-50 text-teal-700 border-teal-200 group-hover:border-teal-400',
      badgeBg: 'bg-teal-100 text-teal-900',
      stepCount: t('QC Slump'),
      action: () => setActiveWizard('qualityTest'),
    },
    {
      id: 'viewTodaysWork',
      title: t('viewTodaysWorkTitle'),
      desc: t('viewTodaysWorkDesc'),
      icon: Calendar,
      colorClass: 'bg-slate-50 text-slate-800 border-slate-200 group-hover:border-slate-400',
      badgeBg: 'bg-slate-200 text-slate-800',
      stepCount: t('Summary'),
      action: () => setActiveWizard('todaysWork'),
    },
  ];

  return (
    <div className="space-y-3 max-w-6xl mx-auto pb-12 text-slate-800">
      
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

      {/* The 8 Primary Action Buttons Grid */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            {language === 'mr' ? 'दैनंदिन मुख्य कामे:' : 'Primary Plant Actions:'}
          </h2>
          <span className="text-[10px] text-slate-400 font-semibold">
            {language === 'mr' ? 'कामावर दाबा' : 'Click any action to start'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRIMARY_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className={`group relative text-left p-2.5 rounded-xl bg-white border transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs hover:border-blue-500 flex items-center gap-2.5 ${
                  item.highlight 
                    ? 'border-blue-400 bg-blue-50/20 ring-1 ring-blue-300/40' 
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${item.colorClass}`}>
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate leading-tight">
                      {item.title}
                    </h3>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 ${item.badgeBg}`}>
                      {item.stepCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Embedded Today's Work Overview Section */}
      <div className="pt-2">
        <TodaysWorkView
          onOpenWizard={(wiz) => setActiveWizard(wiz)}
          onNavigateModule={onNavigateTab}
        />
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

      {/* General Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        topic="general"
      />
    </div>
  );
}
