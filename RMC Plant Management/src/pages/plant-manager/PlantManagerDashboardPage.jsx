import React, { useState } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import KPICard from '../../components/dashboard/KPICard';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import Modal from '../../components/dashboard/Modal';
import Toast from '../../components/dashboard/Toast';
import { 
  Gauge, 
  Truck, 
  Building2, 
  Activity, 
  Layers, 
  FileText, 
  CheckCircle2
} from 'lucide-react';
import { MOCK_PLANT_MANAGER_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';
import { formatToIndian12Hr } from '../../utils/shiftUtils';

// Phase 1 Workforce Views
import EmployeeManagementView from '../../components/workforce/EmployeeManagementView';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import ShiftManagementView from '../../components/workforce/ShiftManagementView';
import DailyWorkView from '../../components/workforce/DailyWorkView';
import LeaveManagementView from '../../components/workforce/LeaveManagementView';
import HrReportsView from '../../components/workforce/HrReportsView';

export default function PlantManagerDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  const { kpis, productionSummary, vehicleStatusCounts, siloStock, pendingOrders } = MOCK_PLANT_MANAGER_DATA;

  const orderColumns = [
    { 
      header: 'Order ID', 
      accessor: 'orderId', 
      render: (row) => <span className="font-mono text-blue-600 font-bold">{row.orderId}</span> 
    },
    { 
      header: 'Client / Project', 
      accessor: 'client', 
      render: (row) => <span className="font-bold text-slate-900">{row.client}</span> 
    },
    { 
      header: 'Concrete Grade', 
      accessor: 'grade', 
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-bold">
          {row.grade}
        </span>
      ) 
    },
    { 
      header: 'Volume', 
      accessor: 'qty', 
      className: 'font-bold text-slate-900 font-mono' 
    },
    { 
      header: 'Pour Location', 
      accessor: 'site',
      className: 'text-slate-600'
    },
    { 
      header: 'Time Window', 
      accessor: 'timeSlot', 
      className: 'font-mono text-slate-500',
      render: (row) => <span>{formatToIndian12Hr(row.timeSlot)}</span>
    },
    { 
      header: 'Priority', 
      accessor: 'priority', 
      render: (row) => <StatusBadge status={row.priority === 'High' ? 'danger' : 'warning'} text={row.priority} /> 
    },
  ];

  return (
    <AppLayout
      title="Plant Manager Dashboard"
      subtitle="Today's concrete batching, material inventory & dispatch schedule"
      badge="MAIN PLANT #01 • ONLINE"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPlanModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-blue-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <Gauge className="w-4 h-4 text-blue-600" />
            <span>Shift Plan</span>
          </button>
          <button
            type="button"
            onClick={() => setShowInventoryModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Layers className="w-4 h-4 text-blue-200" />
            <span>Silo Stock</span>
          </button>
        </div>
      }
    >
      {activeTab === 'employees' && <EmployeeManagementView defaultPlant="Main Plant Unit #01" />}
      {activeTab === 'attendance' && <AttendanceManagementView defaultPlant="Main Plant Unit #01" />}
      {activeTab === 'shifts' && <ShiftManagementView />}
      {activeTab === 'daily-work' && <DailyWorkView />}
      {activeTab === 'leaves' && <LeaveManagementView />}
      {activeTab === 'reports' && <HrReportsView />}

      {activeTab === 'dashboard' && (
        <div className="space-y-4 sm:space-y-5">
          {/* 4 Primary Operational KPI Cards - Compact & Professional Typography */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            <KPICard
              title="Today's Production"
              value={kpis.todayProduction}
              subtext={`Target: ${productionSummary.target} m³`}
              trend={`${productionSummary.percentage}% Completed`}
              trendType="up"
              color="blue"
              icon={Gauge}
            />
            <KPICard
              title="Mixer Dispatches"
              value={kpis.todayDispatches}
              subtext="Batched & Dispatched"
              trend="On Schedule"
              trendType="up"
              color="emerald"
              icon={Truck}
            />
            <KPICard
              title="Active Mixer Trucks"
              value={kpis.activeVehicles}
              subtext={`${vehicleStatusCounts.onRoute} Transit • ${vehicleStatusCounts.atSite} Site`}
              trend="Fleet Active"
              trendType="neutral"
              color="amber"
              icon={Activity}
            />
            <KPICard
              title="Batching Plant Status"
              value="Online"
              subtext="Cap: 90 m³/hr"
              trend="Running Smoothly"
              trendType="up"
              color="cyan"
              icon={Building2}
            />
          </section>

          {/* PRIORITY 1: Scheduled Concrete Orders Queue Table (Placed Directly After Cards) */}
          <section>
            <DataTable
              title="Today's Scheduled Concrete Orders"
              subtitle="Orders queued for batching and site delivery"
              icon={FileText}
              columns={orderColumns}
              data={pendingOrders}
              searchPlaceholder="Search order, customer, mix grade..."
              renderMobileCard={(ord) => (
                <div className="w-full max-w-full overflow-hidden min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-blue-600 truncate block">{ord.orderId}</span>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">{ord.client}</div>
                      <div className="text-xs text-slate-500 truncate">{ord.site}</div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={ord.priority === 'High' ? 'danger' : 'warning'} text={ord.priority} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Concrete Grade:</span>
                      <span className="font-semibold text-blue-700 font-mono">{ord.grade}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Quantity:</span>
                      <span className="font-bold text-slate-900 font-mono">{ord.qty}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Window:</span>
                      <span className="font-mono text-slate-700">{ord.timeSlot}</span>
                    </div>
                  </div>
                </div>
              )}
            />
          </section>

          {/* Core Operations: Production Target & Mixer Fleet Snapshot */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-5">
            {/* Shift Production Progress */}
            <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-600" />
                    <span>Today's Production Progress</span>
                  </h3>
                  <span className="text-[11px] font-bold text-blue-700 font-mono px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                    {productionSummary.percentage}% OF GOAL
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${productionSummary.percentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium block">Target Volume</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">{productionSummary.target} m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-medium block">Produced</span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono">{productionSummary.produced} m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] text-blue-800 font-medium block">Remaining</span>
                    <span className="text-xs sm:text-sm font-bold text-blue-700 font-mono">{productionSummary.remaining} m³</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Peak Dispatch: {productionSummary.produced > 0 ? '10:00 AM' : 'None'}</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>0 Delays Recorded</span>
                </span>
              </div>
            </div>

            {/* Transit Mixer Fleet Status */}
            <div className="p-4 sm:p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Mixer Trucks in Operation</span>
                  </h3>
                  <span className="text-[11px] font-mono font-bold text-slate-700 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                    {vehicleStatusCounts.available + vehicleStatusCounts.loading + vehicleStatusCounts.onRoute + vehicleStatusCounts.atSite + (vehicleStatusCounts.maintenance || 0)} ACTIVE FLEET
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Ready in Yard</span>
                    <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono">{vehicleStatusCounts.available} Mixers</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Available for loading</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Under Batch Chute</span>
                    <span className="text-base sm:text-lg font-bold text-amber-700 font-mono">{vehicleStatusCounts.loading} Mixers</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Loading concrete</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">In Transit (On Road)</span>
                    <span className="text-base sm:text-lg font-bold text-blue-700 font-mono">{vehicleStatusCounts.onRoute} Mixers</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Heading to site</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Pouring at Site</span>
                    <span className="text-base sm:text-lg font-bold text-purple-700 font-mono">{vehicleStatusCounts.atSite} Mixers</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Unloading concrete</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Fleet Available: {vehicleStatusCounts.available}</span>
                <span className="text-slate-700 font-medium">In Maintenance: {vehicleStatusCounts.maintenance || 0}</span>
              </div>
            </div>
          </section>

          {/* Raw Material Silo Inventory */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Raw Material Silo Stock</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Live storage levels of cement, fly ash & raw materials</p>
              </div>
              <span className="text-[11px] font-bold text-slate-600 font-mono px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 self-start sm:self-auto">
                {siloStock.length > 0 ? '● SILO MONITORS ACTIVE' : 'NO SILOS CONFIGURED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {siloStock.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No active silo inventory records. Silos will appear once raw materials are added.
                </div>
              ) : (
                siloStock.map((silo, idx) => {
                  const currentLevel = silo.level ?? 75;
                  const currentTons = Math.round((currentLevel / 100) * (silo.capacity || 100));
                  return (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                          <span className="truncate">{silo.material}</span>
                          <span className="font-mono text-blue-700">{currentLevel}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              currentLevel > 70 ? 'bg-emerald-500' : currentLevel > 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${currentLevel}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                        <span>{currentTons} / {silo.capacity} {silo.unit || 'Tons'}</span>
                        <span className="text-emerald-700 font-bold">{silo.status || 'Good'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title="Shift Production Schedule"
        subtitle="Batching plan for current operations window."
        icon={Gauge}
      >
        <div className="space-y-3 text-xs text-slate-800">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Total Target Volume:</span>
            <span className="text-lg font-bold text-blue-700 font-mono">
              {productionSummary.target > 0 ? `${productionSummary.target} m³` : '0.0 m³'}
            </span>
          </div>
          <p className="leading-relaxed text-slate-600">
            {productionSummary.target > 0 
              ? 'Shift production plan configured for active batch orders.' 
              : 'No active batch mix allocations queued for this shift. Shift production logs will update when batch orders are scheduled.'}
          </p>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setShowPlanModal(false);
                setToastMessage('Production plan status updated.');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Confirm Plan
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        title="Raw Material Storage Status"
        subtitle="Current silo capacities and material levels."
        icon={Layers}
      >
        <div className="space-y-3 text-xs text-slate-800">
          <p className="text-slate-600">
            Material silo telemetry monitors active storage bins and raw aggregate levels in real time.
          </p>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600">
            No inbound raw material bulk tankers scheduled for today.
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowInventoryModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Feedback */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </AppLayout>
  );
}
