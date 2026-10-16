import React from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Construction, 
  ShieldAlert, 
  Layers, 
  Scale, 
  FlaskConical, 
  ClipboardList, 
  Truck, 
  Navigation, 
  Fuel, 
  FileBarChart, 
  Gauge,
  Factory
} from 'lucide-react';

export const PLANT_OPERATIONS_TABS = {
  'plant-dashboard': { 
    id: 'plant-dashboard', 
    label: 'Plant Dashboard', 
    icon: Gauge, 
    description: 'Centralized batching telemetry, aggregate silo levels, mixer truck status and live concrete production rate.' 
  },
  'material-inward': { 
    id: 'material-inward', 
    label: 'Material Inward', 
    icon: Layers, 
    description: 'Raw material procurement, aggregate deliveries, cement tanker intake and automated silo stock replenishment.' 
  },
  'weighbridge': { 
    id: 'weighbridge', 
    label: 'Weighbridge', 
    icon: Scale, 
    description: 'Automated gross-tare-net weighing for aggregate tippers, sand trailers and cement bulkers.' 
  },
  'mix-design': { 
    id: 'mix-design', 
    label: 'Mix Design', 
    icon: FlaskConical, 
    description: 'IS:456 & IS:10262 concrete mix proportions (M10 - M60), water-cement ratio calibration and admixture dosages.' 
  },
  'batching-sheets': { 
    id: 'batching-sheets', 
    label: 'Batching Sheets', 
    icon: ClipboardList, 
    description: 'Batch-by-batch production reports, SCADA actual-vs-target variance logs and moisture compensation records.' 
  },
  'delivery-challans': { 
    id: 'delivery-challans', 
    label: 'Delivery Challans', 
    icon: Truck, 
    description: 'Transit mixer computerized delivery challans, site dispatch tickets and client digital gate passes.' 
  },
  'vehicle-management': { 
    id: 'vehicle-management', 
    label: 'Vehicle Management', 
    icon: Truck, 
    description: 'Transit mixer fleet tracking, concrete pump maintenance, fitness certificates and vehicle RTO compliance.' 
  },
  'driver-trips': { 
    id: 'driver-trips', 
    label: 'Driver Trips', 
    icon: Navigation, 
    description: 'Transit mixer driver trip logging, turnaround cycle timing, pouring hold time and route monitoring.' 
  },
  'diesel-management': { 
    id: 'diesel-management', 
    label: 'Diesel Management', 
    icon: Fuel, 
    description: 'HSD fuel dispensation, DG set consumption, transit mixer mileage logs and plant fuel tank dipping records.' 
  },
  'plant-reports': { 
    id: 'plant-reports', 
    label: 'Plant Reports', 
    icon: FileBarChart, 
    description: 'Historical production summaries, material consumption audits, plant uptime analysis and monthly concrete yields.' 
  },
};

export default function NotImplementedView({ module, onBack }) {
  const Icon = module?.icon || Construction;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 sm:py-10 px-4 space-y-6">
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#D4E4F7] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EAF3FF] border border-[#D4E4F7] text-[#136dec] flex items-center justify-center shrink-0 shadow-xs">
              <Icon className="w-7 h-7 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#136dec] bg-[#EAF3FF] px-2 py-0.5 rounded-md border border-[#D4E4F7]">
                  Plant Operations • Phase 2
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Not Implemented
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {module?.label || 'Operational Module'}
              </h2>
            </div>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          )}
        </div>

        {/* Informative Notice Alert Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-amber-950 flex items-start gap-3.5 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-amber-900 text-sm">
              Module Scheduled for Phase 2 Deployment
            </div>
            <p className="text-amber-800 leading-relaxed">
              This screen is part of the <strong>Plant Operations</strong> expansion. To maintain enterprise audit compliance and data integrity, no fake or synthetic operational figures are displayed.
            </p>
            {module?.description && (
              <p className="text-amber-900 font-medium pt-1">
                Planned Functional Scope: {module.description}
              </p>
            )}
          </div>
        </div>

        {/* Technical Architecture Status Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Development Roadmap</div>
            <div className="text-sm font-bold text-slate-900">Phase 2 Release</div>
            <div className="text-[11px] text-slate-500">Scheduled in upcoming plant sprint</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Backend Telemetry</div>
            <div className="text-sm font-bold text-slate-900">Hardware Integration</div>
            <div className="text-[11px] text-slate-500">Awaiting PLC/SCADA field connectors</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Data Governance</div>
            <div className="text-sm font-bold text-emerald-700">Strictly Enforced</div>
            <div className="text-[11px] text-slate-500">Zero artificial or dummy telemetry</div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-[#136dec]" />
            <span>SM CONCRETECH • Ready Mix Concrete ERP</span>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-[#136dec] font-semibold hover:underline cursor-pointer"
            >
              ← Back to Active Phase 1 Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
