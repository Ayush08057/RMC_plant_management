import React, { useState } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import KPICard from '../../components/dashboard/KPICard';
import ChartCard from '../../components/dashboard/ChartCard';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import QuickAction from '../../components/dashboard/QuickAction';
import AlertCard from '../../components/dashboard/AlertCard';
import ActivityTimeline from '../../components/dashboard/ActivityTimeline';
import Modal from '../../components/dashboard/Modal';
import Toast from '../../components/dashboard/Toast';
import { 
  Gauge, 
  Truck, 
  Building2, 
  Clock, 
  Activity, 
  Layers, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';
import { MOCK_PLANT_MANAGER_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';

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

  const { 
    employees, 
    attendance, 
    leaves 
  } = useWorkforce();

  // Plant-specific workforce metrics
  const plantEmployees = employees;
  const plantAttendance = attendance;
  const presentCount = plantAttendance.filter((a) => a.status === 'Present').length;
  const lateCount = plantAttendance.filter((a) => a.lateStatus).length;
  const pendingLeaves = leaves.filter((l) => l.status === 'Pending').length;
  const overtimeHours = plantAttendance.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);

  const { kpis, productionSummary, hourlyTrend, vehicleStatusCounts, siloStock, pendingOrders, plantAlerts } = MOCK_PLANT_MANAGER_DATA;

  const orderColumns = [
    { header: 'Order ID', accessor: 'orderId', render: (row) => <span className="font-mono text-amber-400 font-bold">{row.orderId}</span> },
    { header: 'Client Project', accessor: 'client', render: (row) => <span className="font-semibold text-white">{row.client}</span> },
    { header: 'Mix Grade', accessor: 'grade', render: (row) => <span className="px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300/80 font-mono text-[10px]">{row.grade}</span> },
    { header: 'Volume', accessor: 'qty', className: 'font-bold text-white font-mono' },
    { header: 'Pour Site', accessor: 'site' },
    { header: 'Time Slot', accessor: 'timeSlot', className: 'font-mono text-slate-400' },
    { header: 'Priority', accessor: 'priority', render: (row) => <StatusBadge status={row.priority === 'High' ? 'danger' : 'warning'} text={row.priority} /> },
  ];

  return (
    <AppLayout
      title="Plant Operations Command Center"
      subtitle="Live batching plant production rates, raw material silo telemetry, mixer allocations, and SCADA monitoring."
      badge="MAIN PLANT UNIT #01"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPlanModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Gauge className="w-4 h-4" />
            <span>Production Plan</span>
          </button>
          <button
            type="button"
            onClick={() => setShowInventoryModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
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
        <>
          {/* Plant Crew & Attendance Live Telemetry Bar */}
          <section className="p-4.5 rounded-3xl bg-gradient-to-r from-amber-50/90 via-white to-cyan-50/90 border border-amber-200/90 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block tracking-wider">
                  LIVE WORKFORCE & BATCHING TELEMETRY
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {plantEmployees.length} Enrolled Plant Staff • <span className="text-emerald-700 font-mono font-black">{presentCount} Present Today</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                Late: <strong className="text-amber-700 font-bold">{lateCount}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                OT Accrued: <strong className="text-purple-700 font-bold">+{overtimeHours} hrs</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                Pending Leave: <strong className="text-cyan-700 font-bold">{pendingLeaves}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold font-sans cursor-pointer shadow-xs transition-all active:scale-[0.98]"
              >
                Crew Roster →
              </button>
            </div>
          </section>

          {/* 4 Important Primary KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Today's Production"
              value={kpis.todayProduction}
              subtext={`Target: ${kpis.productionTarget} (78% Achieved)`}
              trend="+14% vs SLA"
              trendType="up"
              color="amber"
              icon={Gauge}
            />
            <KPICard
              title="Dispatches Released"
              value={kpis.todayDispatches}
              subtext="6 m³ & 7 m³ Transit Mixers"
              trend="Continuous"
              trendType="up"
              color="blue"
              icon={Truck}
            />
            <KPICard
              title="Mixer Fleet Active"
              value={kpis.activeVehicles}
              subtext="8 On Route • 6 Pouring at Site"
              trend="82% Utilization"
              trendType="up"
              color="emerald"
              icon={Activity}
            />
            <KPICard
              title="Batching Tower SCADA"
              value={kpis.plantStatus}
              subtext="Moisture Auto-Compensated"
              trend="Optimal"
              trendType="up"
              color="cyan"
              icon={Building2}
            />
          </section>

      {/* Production Overview & Hourly Trend Visualizer */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Target Meter Card */}
        <div className="p-5 rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-600" />
                <span>Production Progress</span>
              </h3>
              <span className="text-xs font-bold text-amber-700 font-mono px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                {productionSummary.percentage}% OF GOAL
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden mb-5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${productionSummary.percentage}%` }}
              />
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-600 font-medium">Target Shift Volume:</span>
                <span className="font-bold text-slate-900 font-mono">{productionSummary.target} m³</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                <span className="text-emerald-800 font-medium">Batched & Dispatched:</span>
                <span className="font-bold text-emerald-700 font-mono">{productionSummary.produced} m³</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                <span className="text-amber-800 font-medium">Remaining to Target:</span>
                <span className="font-bold text-amber-700 font-mono">{productionSummary.remaining} m³</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Peak hour: 10:00 (68 m³)</span>
            <span className="text-emerald-600 font-bold">• No batch delays</span>
          </div>
        </div>

        {/* Hourly Production Chart */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Hourly Concrete Batching Volume (m³)"
            subtitle="Real-time flow telemetry from central pan mixer load cells"
            icon={Gauge}
            data={hourlyTrend}
            dataKey="volume"
            labelKey="hour"
            unit="m³"
            color="amber"
          />
        </div>
      </section>

      {/* Vehicle Status Breakdown & Quick Operational Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle Fleet Status Section */}
        <div className="p-5 rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Transit Mixer Fleet Status</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500 font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200">24 VEHICLES</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Available in Yard:</span>
              <span className="text-xl font-bold text-emerald-700 font-mono">{vehicleStatusCounts.available}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Ready for loading</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80">
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Under Chute (Loading):</span>
              <span className="text-xl font-bold text-amber-700 font-mono">{vehicleStatusCounts.loading}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Bay #01 & #02</span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80">
              <span className="text-slate-500 block text-[10px] font-bold uppercase">In Transit (On Route):</span>
              <span className="text-xl font-bold text-blue-700 font-mono">{vehicleStatusCounts.onRoute}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">GPS Monitored</span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200/80">
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Pouring at Site:</span>
              <span className="text-xl font-bold text-purple-700 font-mono">{vehicleStatusCounts.atSite}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Concrete pump hooked</span>
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-700 font-medium">Fleet in Maintenance / Inspection:</span>
            <span className="font-bold text-rose-700 font-mono">{vehicleStatusCounts.maintenance} Mixers</span>
          </div>
        </div>

        {/* Quick Plant Actions */}
        <div className="lg:col-span-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Plant Manager Quick Commands
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction
              icon={Gauge}
              title="Production Plan"
              desc="View shift mix allocations"
              color="amber"
              onClick={() => setShowPlanModal(true)}
            />
            <QuickAction
              icon={Layers}
              title="Check Silos"
              desc="Cement & fly ash levels"
              color="blue"
              onClick={() => setShowInventoryModal(true)}
            />
            <QuickAction
              icon={Truck}
              title="Live Dispatches"
              desc="Track outbound mixers"
              color="emerald"
              onClick={() => setToastMessage('Redirecting to live telematics monitor...')}
            />
            <QuickAction
              icon={FileText}
              title="Batch Orders"
              desc="Inspect pending pour slips"
              color="purple"
              onClick={() => setToastMessage('Filtered to 12 pending batch slips.')}
            />
          </div>

          {/* Plant Operational Alerts */}
          <div className="mt-4 space-y-2">
            {plantAlerts.map((alt) => (
              <AlertCard
                key={alt.id}
                title={alt.title}
                desc={alt.desc}
                time={alt.time}
                type={alt.type}
                actionLabel="Inspect"
                onAction={() => setToastMessage(`Checked ${alt.title}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Silo Raw Material Stock Overview */}
      <section className="p-5 rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Silo & Raw Material Bin Inventory</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Live ultrasonic level sensors in storage silos and aggregate bunkers</p>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
            ALL BINS SUFFICIENT
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {siloStock.map((silo, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span className="truncate">{silo.material}</span>
                  <span className="font-mono text-amber-700 font-bold">{silo.percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${
                      silo.percent > 70 ? 'bg-emerald-500' : silo.percent > 40 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${silo.percent}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                <span>{silo.current} / {silo.capacity} {silo.unit}</span>
                <span className="text-emerald-700 font-bold">{silo.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending Batch Orders Queue */}
      <section>
        <DataTable
          title="Scheduled Batch Orders (Pending Production)"
          subtitle="Customer concrete orders queued for upcoming dispatch cycles"
          icon={FileText}
          columns={orderColumns}
          data={pendingOrders}
          searchPlaceholder="Search order, customer, mix grade..."
          renderMobileCard={(ord) => (
            <div className="w-full max-w-full overflow-hidden min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs font-bold text-amber-400 truncate block">{ord.orderId}</span>
                  <div className="text-sm font-bold text-white mt-0.5 truncate">{ord.client}</div>
                  <div className="text-xs text-slate-400 truncate">{ord.site}</div>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={ord.priority === 'High' ? 'danger' : 'warning'} text={ord.priority} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Mix Grade:</span>
                  <span className="font-semibold text-amber-300 font-mono">{ord.grade}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Quantity:</span>
                  <span className="font-bold text-white font-mono">{ord.qty}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 uppercase block">Target Window:</span>
                  <span className="font-mono text-slate-300">{ord.timeSlot}</span>
                </div>
              </div>
            </div>
          )}
        />
      </section>
        </>
      )}

      {/* Modals */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title="Shift Production Schedule"
        subtitle="Batching plan for current 12-hour operations window."
        icon={Gauge}
      >
        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Total Target Volume:</span>
            <span className="text-lg font-bold text-amber-400 font-mono">550.0 m³</span>
          </div>
          <p className="leading-relaxed text-slate-400">
            Mix allocations include 240 m³ M35 Metro Spec, 180 m³ M30 Residential, and 130 m³ M40 Marine Grade. Moisture probes recalibrated every 2 hours.
          </p>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setShowPlanModal(false);
                setToastMessage('Production plan exported to batch console.');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950"
            >
              Confirm Plan
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        title="Raw Material Storage Telemetry"
        subtitle="Live silo capacities and next replenishment schedules."
        icon={Layers}
      >
        <div className="space-y-3 text-xs text-slate-300">
          <p className="text-slate-400">
            All 7 material bins operate well above the 40% reorder minimum. Two bulk cement tankers (OPC 53) are en route from ACC Wadi plant, ETA 17:30.
          </p>
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-[11px] font-mono text-emerald-800">
            Bulk Inbound: 60 Tons OPC Cement scheduled today
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowInventoryModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-900 border border-slate-300"
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
