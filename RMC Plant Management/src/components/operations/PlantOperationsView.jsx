import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Gauge,
  Layers,
  Scale,
  FlaskConical,
  ClipboardList,
  Truck,
  Navigation,
  Fuel,
  FileBarChart,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

import BatchingSheetsView from './BatchingSheetsView';
import DeliveryChallansView from './DeliveryChallansView';
import MixDesignView from './MixDesignView';
import MaterialInwardView from './MaterialInwardView';
import WeighbridgeView from './WeighbridgeView';
import VehicleManagementView from './VehicleManagementView';
import DriverTripsView from './DriverTripsView';
import DieselManagementView from './DieselManagementView';
import PlantDashboardView from './PlantDashboardView';
import PlantReportsView from './PlantReportsView';
import QcCubeTestingView from './QcCubeTestingView';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/mockUsers';

export const OPERATIONS_MODULES = [
  { 
    id: 'plant-dashboard', 
    label: 'Plant Dashboard', 
    shortLabel: 'Dashboard', 
    shortLabelMr: 'डॅशबोर्ड', 
    labelMr: 'प्लॅन्ट डॅशबोर्ड', 
    icon: Gauge, 
    color: 'text-blue-700',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.DISPATCHER, ROLES.QC_ENGINEER, ROLES.SITE_SUPERVISOR]
  },
  { 
    id: 'material-inward', 
    label: 'Material Inward', 
    shortLabel: 'Inward', 
    shortLabelMr: 'कच्चा माल', 
    labelMr: 'आलेला कच्चा माल', 
    icon: Layers, 
    color: 'text-amber-600',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.ACCOUNTANT]
  },
  { 
    id: 'weighbridge', 
    label: 'Weighbridge', 
    shortLabel: 'Weighbridge', 
    shortLabelMr: 'वजन काटा', 
    labelMr: 'वेब्रिज वजन काटा', 
    icon: Scale, 
    color: 'text-cyan-600',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.ACCOUNTANT]
  },
  { 
    id: 'mix-design', 
    label: 'Mix Design', 
    shortLabel: 'Mix Design', 
    shortLabelMr: 'मिक्स डिझाईन', 
    labelMr: 'काँक्रीट रेसिपी', 
    icon: FlaskConical, 
    color: 'text-purple-600',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.QC_ENGINEER]
  },
  { 
    id: 'batching-sheets', 
    label: 'Batching Sheets', 
    shortLabel: 'Batching', 
    shortLabelMr: 'बॅचिंग', 
    labelMr: 'काँक्रीट बॅचिंग', 
    icon: ClipboardList, 
    color: 'text-blue-600',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.QC_ENGINEER]
  },
  { 
    id: 'qc-cubes', 
    label: 'QC Cube Testing', 
    shortLabel: 'QC Cubes', 
    shortLabelMr: 'क्युब टेस्ट', 
    labelMr: 'क्युब टेस्टिंग व लॅब सर्टिफिकेट', 
    icon: FlaskConical, 
    color: 'text-cyan-600',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.QC_ENGINEER]
  },
  { 
    id: 'delivery-challans', 
    label: 'Delivery Challans', 
    shortLabel: 'Challans', 
    shortLabelMr: 'चालान', 
    labelMr: 'डिलिव्हरी चालान', 
    icon: Truck, 
    color: 'text-emerald-600',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.DISPATCHER, ROLES.ACCOUNTANT, ROLES.SITE_SUPERVISOR]
  },
  { 
    id: 'vehicle-management', 
    label: 'Vehicle Fleet', 
    shortLabel: 'Vehicles', 
    shortLabelMr: 'गाड्या', 
    labelMr: 'प्लॅन्ट वाहने', 
    icon: Truck, 
    color: 'text-indigo-600',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.DISPATCHER, ROLES.DRIVER]
  },
  { 
    id: 'driver-trips', 
    label: 'Driver Trips', 
    shortLabel: 'Trips', 
    shortLabelMr: 'ट्रिप्स', 
    labelMr: 'गाडी फेऱ्या (ट्रिप्स)', 
    icon: Navigation, 
    color: 'text-rose-600',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.DISPATCHER, ROLES.DRIVER, ROLES.SITE_SUPERVISOR]
  },
  { 
    id: 'diesel-management', 
    label: 'Diesel & Fuel', 
    shortLabel: 'Diesel', 
    shortLabelMr: 'डिझेल', 
    labelMr: 'डिझेल व इंधन', 
    icon: Fuel, 
    color: 'text-orange-600',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.ACCOUNTANT]
  },
  { 
    id: 'plant-reports', 
    label: 'Plant Reports', 
    shortLabel: 'Reports', 
    shortLabelMr: 'रिपोर्ट्स', 
    labelMr: 'प्लॅन्ट अहवाल', 
    icon: FileBarChart, 
    color: 'text-slate-700',
    roles: [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR, ROLES.OWNER_DIRECTOR, ROLES.ACCOUNTANT, ROLES.QC_ENGINEER]
  },
];

export default function PlantOperationsView({ activeTab = 'plant-dashboard', onSelectTab = () => {}, onBack = () => {} }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();

  // Determine current effective role (check pathname e.g. /accountant, or user?.role)
  const effectiveRole = useMemo(() => {
    if (location?.pathname?.startsWith('/accountant')) return ROLES.ACCOUNTANT;
    if (location?.pathname?.startsWith('/dispatcher')) return ROLES.DISPATCHER;
    if (location?.pathname?.startsWith('/qc')) return ROLES.QC_ENGINEER;
    if (location?.pathname?.startsWith('/site-supervisor')) return ROLES.SITE_SUPERVISOR;
    if (location?.pathname?.startsWith('/driver')) return ROLES.DRIVER;
    return user?.role || ROLES.PLANT_MANAGER;
  }, [location?.pathname, user?.role]);

  // Restrict displayed plant operation tabs strictly to the user's role permissions (Accountant sees 5 operations)
  const allowedModules = useMemo(() => {
    if (
      effectiveRole === ROLES.ADMIN ||
      effectiveRole === ROLES.PLANT_MANAGER ||
      effectiveRole === ROLES.PLANT_INCHARGE ||
      effectiveRole === ROLES.OWNER_DIRECTOR
    ) {
      return OPERATIONS_MODULES;
    }
    return OPERATIONS_MODULES.filter((mod) => !mod.roles || mod.roles.includes(effectiveRole));
  }, [effectiveRole]);

  const defaultTab = allowedModules[0]?.id || 'material-inward';
  const effectiveTab = (!activeTab || activeTab === 'plant-operations')
    ? defaultTab
    : (allowedModules.some(m => m.id === activeTab) ? activeTab : defaultTab);

  const currentModule = allowedModules.find(m => m.id === effectiveTab) || allowedModules[0] || OPERATIONS_MODULES[0];

  const renderModuleContent = () => {
    switch (effectiveTab) {
      case 'plant-dashboard':
        return <PlantDashboardView onNavigateTab={onSelectTab} />;
      case 'batching-sheets':
        return <BatchingSheetsView onNavigateTab={onSelectTab} />;
      case 'qc-cubes':
        return <QcCubeTestingView onNavigateTab={onSelectTab} />;
      case 'delivery-challans':
        return <DeliveryChallansView onNavigateTab={onSelectTab} />;
      case 'mix-design':
        return <MixDesignView onNavigateTab={onSelectTab} />;
      case 'material-inward':
        return <MaterialInwardView onNavigateTab={onSelectTab} />;
      case 'weighbridge':
        return <WeighbridgeView onNavigateTab={onSelectTab} />;
      case 'vehicle-management':
        return <VehicleManagementView onNavigateTab={onSelectTab} />;
      case 'driver-trips':
        return <DriverTripsView onNavigateTab={onSelectTab} />;
      case 'diesel-management':
        return <DieselManagementView onNavigateTab={onSelectTab} />;
      case 'plant-reports':
        return <PlantReportsView onNavigateTab={onSelectTab} />;
      default:
        return <PlantDashboardView onNavigateTab={onSelectTab} />;
    }
  };

  return (
    <div className="w-full flex flex-col space-y-2.5 sm:space-y-3">
      {/* Top Operations Sub-Navigation Bar - Omitted on Plant Reports to eliminate duplicate navigation */}
      {effectiveTab !== 'plant-reports' && (
        <div className="bg-white border border-[#D4E4F7] rounded-xl p-1.5 sm:p-2 shadow-2xs flex items-center justify-between gap-2 sm:gap-3 overflow-hidden">
          {/* Back button */}
          <button
            onClick={onBack}
            className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition shrink-0 flex items-center gap-1 text-xs font-semibold cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Operations Tabs - Fits to page, non-scrollable */}
          <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
            {allowedModules.map((mod) => {
              const Icon = mod.icon;
              const isActive = effectiveTab === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => onSelectTab(mod.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] sm:text-xs transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#136dec] text-white font-semibold shadow-2xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70 font-medium'
                  }`}
                  title={language === 'mr' ? (mod.labelMr || mod.label) : mod.label}
                >
                  <Icon size={12} className={isActive ? 'text-white' : mod.color} />
                  <span>{language === 'mr' ? (mod.shortLabelMr || mod.shortLabel || mod.label) : (mod.shortLabel || mod.label)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Operational View */}
      <div className="w-full">
        {renderModuleContent()}
      </div>
    </div>
  );
}
