import React, { useState, useMemo } from 'react';
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
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  Play,
  RotateCw,
  XCircle,
} from 'lucide-react';
import { MOCK_PLANT_MANAGER_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';
import { formatToIndian12Hr, parseTimeToMinutes } from '../../utils/shiftUtils';

// Phase 1 Workforce Views
import EmployeeManagementView from '../../components/workforce/EmployeeManagementView';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import ShiftManagementView from '../../components/workforce/ShiftManagementView';
import DailyWorkView from '../../components/workforce/DailyWorkView';
import LeaveManagementView from '../../components/workforce/LeaveManagementView';
import HrReportsView from '../../components/workforce/HrReportsView';
import RolePersonalAttendanceView from '../../components/workforce/RolePersonalAttendanceView';

const CURRENT_PLANT_NAME = 'Main Plant Unit #01';
const CURRENT_PLANT_ID = 'PLANT-001';
const PLANT_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's ISO date string (YYYY-MM-DD) based on plant's configured timezone (IST).
 */
function getTodayISTDate() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: PLANT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Normalizes any timestamp or date format into YYYY-MM-DD in the plant timezone without timezone shifts.
 */
function normalizeOrderDate(dateVal) {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: PLANT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    }
  } catch {
    // fallback
  }
  return str.slice(0, 10);
}

export default function PlantManagerDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  const { orders = [], plants = [], trips = [], updateOrder, cancelOrder } = useWorkforce();
  const { siloStock } = MOCK_PLANT_MANAGER_DATA;

  const todayIST = getTodayISTDate();

  // Retry handler for table error recovery
  const handleRetryFetch = () => {
    setIsOrdersLoading(true);
    setOrdersError(null);
    setTimeout(() => {
      setIsOrdersLoading(false);
      setToastMessage('Orders refreshed successfully.');
    }, 400);
  };

  // Deduplicate and filter orders scheduled for current plant & current business date
  const todayOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    const orderMap = new Map();

    orders.forEach((order) => {
      if (!order) return;
      const orderId = order.orderId || order.id;
      if (!orderId) return;

      // Business Rule: Exclude explicitly cancelled orders from the active queue
      if (order.status === 'Cancelled') return;

      // Business Rule: Filter by current plant association (or unassigned/fallback)
      const plantMatches =
        !order.plant ||
        order.plant === CURRENT_PLANT_NAME ||
        order.plantId === CURRENT_PLANT_ID ||
        order.plant === 'Plant Unit #01';

      if (!plantMatches) return;

      // Business Rule: Match current business date (in IST)
      const orderDate = normalizeOrderDate(
        order.scheduledDate || order.date || order.deliveryDate || order.createdAt
      );

      if (orderDate === todayIST) {
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, order);
        }
      }
    });

    const list = Array.from(orderMap.values());

    // Business Rule: Sort orders by scheduled delivery time window, then priority
    const priorityWeight = { Urgent: 3, High: 2, Normal: 1, Standard: 1, Low: 0 };

    list.sort((a, b) => {
      const timeA = parseTimeToMinutes(a.timeSlot || a.timeWindow || '09:00');
      const timeB = parseTimeToMinutes(b.timeSlot || b.timeWindow || '09:00');
      if (timeA !== timeB) return timeA - timeB;

      const pA = priorityWeight[a.priority] || 1;
      const pB = priorityWeight[b.priority] || 1;
      if (pB !== pA) return pB - pA;

      return String(a.orderId || a.id).localeCompare(String(b.orderId || b.id));
    });

    return list;
  }, [orders, todayIST]);

  // Operational Metrics derived dynamically from real database records
  const metrics = useMemo(() => {
    let targetVolume = 0;
    let producedVolume = 0;
    let dispatchedCount = 0;
    let batchedCount = 0;

    todayOrders.forEach((ord) => {
      const vol = parseFloat(ord.volume || ord.qty) || 0;
      targetVolume += vol;

      const statusLower = String(ord.status || '').toLowerCase();
      const isBatchedOrBeyond = [
        'batched',
        'loading',
        'in transit',
        'dispatched',
        'at site',
        'pouring',
        'delivered',
        'completed'
      ].includes(statusLower);

      if (isBatchedOrBeyond) {
        producedVolume += vol;
      }

      if (['loading', 'in transit', 'dispatched', 'at site', 'pouring', 'delivered', 'completed'].includes(statusLower)) {
        dispatchedCount += 1;
      }

      if (['batched', 'loading', 'in transit', 'dispatched'].includes(statusLower)) {
        batchedCount += 1;
      }
    });

    // Trips fleet telemetry
    let onRouteCount = 0;
    let atSiteCount = 0;
    let loadingCount = 0;

    const activeTrips = (trips || []).filter((t) => {
      const tripDate = normalizeOrderDate(t.assignedAt || t.date);
      return !tripDate || tripDate === todayIST;
    });

    activeTrips.forEach((t) => {
      const step = Number(t.currentStep) || 1;
      if (step === 1 || t.status === 'Loading') loadingCount += 1;
      else if (step >= 2 && step <= 4) onRouteCount += 1;
      else if (step >= 5 && step <= 6) atSiteCount += 1;
    });

    const activeMixersCount = onRouteCount + atSiteCount + loadingCount;

    // Batching Plant Operational Status
    const plantObj = (plants || []).find(
      (p) => p.name === CURRENT_PLANT_NAME || p.id === CURRENT_PLANT_ID
    );
    const plantStatus = plantObj ? (plantObj.status || 'Online') : 'Online';
    const plantCapacity = plantObj?.capacity || '90 m³/hr';

    const percentage = targetVolume > 0 ? Math.min(100, Math.round((producedVolume / targetVolume) * 100)) : 0;
    const remainingVolume = Math.max(0, targetVolume - producedVolume);

    return {
      todayProduction: `${producedVolume.toFixed(1)} m³`,
      targetVolume: targetVolume.toFixed(1),
      producedVolume: producedVolume.toFixed(1),
      remainingVolume: remainingVolume.toFixed(1),
      percentage,
      todayDispatches: `${dispatchedCount} Loads`,
      batchedCount,
      activeVehicles: `${activeMixersCount} Mixers`,
      onRouteCount,
      atSiteCount,
      loadingCount,
      plantStatus,
      plantCapacity,
    };
  }, [todayOrders, trips, plants, todayIST]);

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    if (!orderId || !updateOrder) return;
    updateOrder(orderId, { status: newStatus });
    if (selectedOrder && (selectedOrder.orderId === orderId || selectedOrder.id === orderId)) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
    }
    setToastMessage(`Order ${orderId} updated to "${newStatus}".`);
  };

  const handleCancelOrder = (orderId) => {
    if (!orderId || !cancelOrder) return;
    cancelOrder(orderId, 'Cancelled from Plant Manager console');
    setSelectedOrder(null);
    setToastMessage(`Order ${orderId} has been cancelled.`);
  };

  const orderColumns = [
    {
      header: 'Order ID',
      accessor: 'orderId',
      render: (row) => <span className="font-mono text-blue-600 font-bold">{row.orderId || row.id}</span>
    },
    {
      header: 'Client / Project',
      accessor: 'client',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block truncate">{row.client || row.customer || 'Standard Client'}</span>
          {(row.project || row.projectName) && (
            <span className="text-[11px] text-slate-500 block truncate font-medium">{row.project || row.projectName}</span>
          )}
        </div>
      )
    },
    {
      header: 'Concrete Grade',
      accessor: 'grade',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-bold">
          {row.grade || row.mixGrade || 'M25'}
        </span>
      )
    },
    {
      header: 'Volume',
      accessor: 'qty',
      className: 'font-bold text-slate-900 font-mono',
      render: (row) => <span>{row.qty || (row.volume ? `${row.volume} m³` : '0 m³')}</span>
    },
    {
      header: 'Pour Location',
      accessor: 'site',
      className: 'text-slate-600',
      render: (row) => <span>{row.site || row.pourLocation || 'Plant Yard'}</span>
    },
    {
      header: 'Time Window',
      accessor: 'timeSlot',
      className: 'font-mono text-slate-500',
      render: (row) => <span>{formatToIndian12Hr(row.timeSlot || row.timeWindow || '09:00 AM - 11:00 AM')}</span>
    },
    {
      header: 'Priority',
      accessor: 'priority',
      render: (row) => {
        const priority = row.priority || 'Normal';
        const isHigh = priority === 'High' || priority === 'Urgent';
        return <StatusBadge status={isHigh ? 'danger' : 'warning'} text={priority} />;
      }
    },
  ];

  return (
    <AppLayout
      title="Plant Manager"
      badge="MAIN PLANT #01"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Mark or View Daily Attendance"
          >
            <Clock className="w-3.5 h-3.5 text-[#1D5FA7]" />
            <span>Daily Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPlanModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Gauge className="w-3.5 h-3.5 text-white" />
            <span>Shift Plan</span>
          </button>
          <button
            type="button"
            onClick={() => setShowInventoryModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#1D5FA7]" />
            <span>Silo Stock</span>
          </button>
        </div>
      }
    >
      {activeTab === 'employees' && <EmployeeManagementView defaultPlant="Main Plant Unit #01" />}
      {activeTab === 'attendance' && (
        <RolePersonalAttendanceView
          defaultRole="Plant Manager"
          defaultEmpId="PM-001"
          defaultDepartment="Operations Management"
          canSwitchToTeamView={true}
          teamViewComponent={<AttendanceManagementView defaultPlant="Main Plant Unit #01" />}
          onPunched={() => setToastMessage('Plant Manager attendance verified and recorded!')}
        />
      )}
      {activeTab === 'shifts' && <ShiftManagementView />}
      {activeTab === 'daily-work' && <DailyWorkView />}
      {activeTab === 'leaves' && <LeaveManagementView />}
      {activeTab === 'reports' && <HrReportsView />}

      {activeTab === 'dashboard' && (
        <div className="space-y-4 sm:space-y-5">
          {/* 4 Primary Operational KPI Cards - Connected to Real Database & Operational Telemetry */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            <KPICard
              title="Today's Production"
              value={metrics.todayProduction}
              subtext={`Target: ${metrics.targetVolume} m³`}
              trend={`${metrics.percentage}% Completed`}
              trendType={metrics.percentage > 0 ? 'up' : 'neutral'}
              color="blue"
              icon={Gauge}
            />
            <KPICard
              title="Mixer Dispatches"
              value={metrics.todayDispatches}
              subtext={`${metrics.batchedCount} Batched & Dispatched`}
              trend="On Schedule"
              trendType="up"
              color="emerald"
              icon={Truck}
            />
            <KPICard
              title="Active Mixer Trucks"
              value={metrics.activeVehicles}
              subtext={`${metrics.onRouteCount} Transit • ${metrics.atSiteCount} Site`}
              trend="Fleet Active"
              trendType="neutral"
              color="amber"
              icon={Activity}
            />
            <KPICard
              title="Batching Plant Status"
              value={metrics.plantStatus}
              subtext={`Cap: ${metrics.plantCapacity}`}
              trend="Running Smoothly"
              trendType="up"
              color="cyan"
              icon={Building2}
            />
          </section>

          {/* PRIORITY 1: Scheduled Concrete Orders Queue Table */}
          <section>
            <DataTable
              title="Today's Scheduled Concrete Orders"
              subtitle="Orders queued for batching and site delivery"
              icon={FileText}
              columns={orderColumns}
              data={todayOrders}
              searchPlaceholder="Search order, customer, mix grade..."
              searchKeys={['orderId', 'id', 'client', 'customer', 'project', 'projectName', 'grade', 'mixGrade', 'concreteGrade', 'site', 'pourLocation', 'priority']}
              isLoading={isOrdersLoading}
              error={ordersError}
              onRetry={handleRetryFetch}
              emptyMessage="No scheduled orders for today."
              noMatchesMessage="No matching orders found."
              onRowClick={(order) => setSelectedOrder(order)}
              renderMobileCard={(ord) => (
                <div className="w-full max-w-full overflow-hidden min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-blue-600 truncate block">{ord.orderId || ord.id}</span>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">{ord.client || ord.customer}</div>
                      <div className="text-xs text-slate-500 truncate">{ord.site || ord.pourLocation}</div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={ord.priority === 'High' || ord.priority === 'Urgent' ? 'danger' : 'warning'} text={ord.priority || 'Normal'} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Concrete Grade:</span>
                      <span className="font-semibold text-blue-700 font-mono">{ord.grade || ord.mixGrade}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Quantity:</span>
                      <span className="font-bold text-slate-900 font-mono">{ord.qty || (ord.volume ? `${ord.volume} m³` : '0 m³')}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Window:</span>
                      <span className="font-mono text-slate-700">{formatToIndian12Hr(ord.timeSlot || ord.timeWindow)}</span>
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
                    {metrics.percentage}% OF GOAL
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${metrics.percentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium block">Target Volume</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">{metrics.targetVolume} m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-medium block">Produced</span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono">{metrics.producedVolume} m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] text-blue-800 font-medium block">Remaining</span>
                    <span className="text-xs sm:text-sm font-bold text-blue-700 font-mono">{metrics.remainingVolume} m³</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Peak Dispatch: {parseFloat(metrics.producedVolume) > 0 ? '10:00 AM' : 'None'}</span>
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
                    {metrics.activeVehicles} ACTIVE FLEET
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Ready in Yard</span>
                    <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono">0 Mixers</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Available for loading</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Under Batch Chute</span>
                    <span className="text-base sm:text-lg font-bold text-amber-700 font-mono">{metrics.loadingCount} Mixers</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Loading concrete</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">In Transit (On Road)</span>
                    <span className="text-base sm:text-lg font-bold text-blue-700 font-mono">{metrics.onRouteCount} Mixers</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Heading to site</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Pouring at Site</span>
                    <span className="text-base sm:text-lg font-bold text-purple-700 font-mono">{metrics.atSiteCount} Mixers</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Unloading concrete</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Fleet Available: 0</span>
                <span className="text-slate-700 font-medium">In Maintenance: 0</span>
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
                            className={`h-full rounded-full transition-all duration-300 ${currentLevel > 70 ? 'bg-emerald-500' : currentLevel > 40 ? 'bg-amber-500' : 'bg-rose-500'
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

      {/* Order Details & Batching Status Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order ${selectedOrder.orderId || selectedOrder.id}`}
          subtitle="Concrete Order Specifications & Batching Status"
          icon={FileText}
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Customer / Client</span>
                <span className="font-bold text-slate-900 text-sm">{selectedOrder.client || selectedOrder.customer}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Project Name</span>
                <span className="font-semibold text-slate-700">{selectedOrder.project || selectedOrder.projectName || 'Site Project'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Mix Grade</span>
                <span className="font-mono font-bold text-blue-700 text-sm">{selectedOrder.grade || selectedOrder.mixGrade}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Order Quantity</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedOrder.qty || `${selectedOrder.volume} m³`}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Pour Location</span>
                <span className="text-slate-700 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{selectedOrder.site || selectedOrder.pourLocation}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Window</span>
                <span className="font-mono text-slate-700 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{formatToIndian12Hr(selectedOrder.timeSlot || selectedOrder.timeWindow)}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-200">
              <div>
                <span className="text-[10px] text-blue-800 font-bold uppercase block">Current Lifecycle Status</span>
                <span className="font-bold text-blue-900 text-sm">{selectedOrder.status || 'Scheduled'}</span>
              </div>
              <StatusBadge status={selectedOrder.priority === 'High' || selectedOrder.priority === 'Urgent' ? 'danger' : 'warning'} text={selectedOrder.priority || 'Normal'} />
            </div>

            {/* Batching & Scheduling Quick Actions for Plant Manager */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleCancelOrder(selectedOrder.orderId || selectedOrder.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center gap-1 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedOrder.status === 'Scheduled' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateOrderStatus(selectedOrder.orderId || selectedOrder.id, 'Batching')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Batching</span>
                  </button>
                )}
                {selectedOrder.status === 'Batching' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateOrderStatus(selectedOrder.orderId || selectedOrder.id, 'Batched')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Batched</span>
                  </button>
                )}
                {selectedOrder.status === 'Batched' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateOrderStatus(selectedOrder.orderId || selectedOrder.id, 'Loading')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Ready for Transit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Shift Plan Modal */}
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
              {parseFloat(metrics.targetVolume) > 0 ? `${metrics.targetVolume} m³` : '0.0 m³'}
            </span>
          </div>
          <p className="leading-relaxed text-slate-600">
            {parseFloat(metrics.targetVolume) > 0
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

      {/* Raw Material Inventory Modal */}
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
