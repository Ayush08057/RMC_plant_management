import React from 'react';
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

export const OPERATIONS_MODULES = [
  { id: 'batching-sheets', label: 'Batching Sheets', shortLabel: 'Batching', icon: ClipboardList, color: 'text-blue-600' },
  { id: 'delivery-challans', label: 'Delivery Challans', shortLabel: 'Challans', icon: Truck, color: 'text-emerald-600' },
  { id: 'mix-design', label: 'Mix Design', shortLabel: 'Mix Design', icon: FlaskConical, color: 'text-purple-600' },
  { id: 'material-inward', label: 'Material Inward', shortLabel: 'Inward', icon: Layers, color: 'text-amber-600' },
  { id: 'weighbridge', label: 'Weighbridge', shortLabel: 'Weighbridge', icon: Scale, color: 'text-cyan-600' },
  { id: 'vehicle-management', label: 'Vehicle Fleet', shortLabel: 'Vehicles', icon: Truck, color: 'text-indigo-600' },
  { id: 'driver-trips', label: 'Driver Trips', shortLabel: 'Trips', icon: Navigation, color: 'text-rose-600' },
  { id: 'diesel-management', label: 'Diesel & Fuel', shortLabel: 'Diesel', icon: Fuel, color: 'text-orange-600' },
  { id: 'plant-dashboard', label: 'Plant Dashboard', shortLabel: 'Telemetry', icon: Gauge, color: 'text-blue-700' },
  { id: 'plant-reports', label: 'Plant Reports', shortLabel: 'Reports', icon: FileBarChart, color: 'text-slate-700' },
];

export default function PlantOperationsView({ activeTab = 'batching-sheets', onSelectTab = () => {}, onBack = () => {} }) {
  const currentModule = OPERATIONS_MODULES.find(m => m.id === activeTab) || OPERATIONS_MODULES[0];

  const renderModuleContent = () => {
    switch (activeTab) {
      case 'batching-sheets':
        return <BatchingSheetsView onNavigateTab={onSelectTab} />;
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
      case 'plant-dashboard':
        return <PlantDashboardView onNavigateTab={onSelectTab} />;
      case 'plant-reports':
        return <PlantReportsView onNavigateTab={onSelectTab} />;
      default:
        return <BatchingSheetsView onNavigateTab={onSelectTab} />;
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Operations Sub-Navigation Bar */}
      <div className="bg-white border border-[#D4E4F7] rounded-xl p-2 shadow-xs flex items-center justify-between gap-3 overflow-hidden">
        {/* Back button */}
        <button
          onClick={onBack}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition shrink-0 flex items-center gap-1.5 text-xs font-semibold"
          title="Back to Dashboard"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-200 min-w-0 flex-1">
          {OPERATIONS_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeTab === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => onSelectTab(mod.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#136dec] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : mod.color} />
                <span>{mod.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Operational View */}
      <div className="w-full">
        {renderModuleContent()}
      </div>
    </div>
  );
}
