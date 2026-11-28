import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import KPICard from '../../components/dashboard/KPICard';
import StatusBadge from '../../components/dashboard/StatusBadge';
import QuickAction from '../../components/dashboard/QuickAction';
import Toast from '../../components/dashboard/Toast';
import {
  Gauge,
  Layers,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  StopCircle,
  Wrench,
  Plus,
  RefreshCw,
  Search,
  FileText,
  Printer,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatToIndian12Hr, getLocalIstDateStr } from '../../utils/shiftUtils';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';

// Operational Views
import DeliveryChallansView from '../../components/operations/DeliveryChallansView';
import BatchingSheetsView from '../../components/operations/BatchingSheetsView';
import RolePersonalAttendanceView from '../../components/workforce/RolePersonalAttendanceView';

const BATCHING_STORAGE_KEY = 'rmc_batching_sheets_v2';
const CHALLAN_STORAGE_KEY = 'rmc_delivery_challans_v2';
const PLANT_STATUS_KEY = 'rmc_plant_status';

export default function PlantOperatorDashboardPage() {
  const { user } = useAuth();
  const { attendance } = useWorkforce();
  const { t } = useLanguage();

  const [activeTab, setActiveTabState] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab');
      if (urlTab) return urlTab;
      const saved = sessionStorage.getItem('rmc_operator_active_tab');
      if (saved) return saved;
    } catch {}
    return 'dashboard';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('rmc_operator_active_tab', tab);
      const url = new URL(window.location.href);
      if (tab === 'dashboard') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = urlParams.get('tab') || 'dashboard';
        setActiveTabState(urlTab);
        sessionStorage.setItem('rmc_operator_active_tab', urlTab);
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [toastMessage, setToastMessage] = useState(null);

  // Plant Status: Running / Stopped / Maintenance
  const [plantStatus, setPlantStatusState] = useState(() => {
    try {
      return localStorage.getItem(PLANT_STATUS_KEY) || 'Running';
    } catch {
      return 'Running';
    }
  });

  const setPlantStatus = (status) => {
    setPlantStatusState(status);
    try {
      localStorage.setItem(PLANT_STATUS_KEY, status);
      pushCloudStore('cloud_plant_status', PLANT_STATUS_KEY, { status, updatedAt: new Date().toISOString() });
    } catch {}
    setToastMessage(`Plant operational status changed to ${status}`);
  };

  // Real-time Batching Sheets Store
  const [batchSheets, setBatchSheets] = useState(() => {
    try {
      const raw = localStorage.getItem(BATCHING_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Real-time Delivery Challans Store
  const [challans, setChallans] = useState(() => {
    try {
      const raw = localStorage.getItem(CHALLAN_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Cross-device cloud sync subscriptions
  useEffect(() => {
    const unsubChallans = subscribeCloudStore('cloud_delivery_challans', CHALLAN_STORAGE_KEY, (latest) => {
      if (Array.isArray(latest)) setChallans(latest);
    });
    const unsubBatches = subscribeCloudStore('cloud_batching_sheets', BATCHING_STORAGE_KEY, (latest) => {
      if (Array.isArray(latest)) setBatchSheets(latest);
    });
    const unsubStatus = subscribeCloudStore('cloud_plant_status', PLANT_STATUS_KEY, (latest) => {
      if (latest && latest.status) setPlantStatusState(latest.status);
    });

    const handleStorage = (e) => {
      if (e.key === CHALLAN_STORAGE_KEY && e.newValue) {
        try { setChallans(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === BATCHING_STORAGE_KEY && e.newValue) {
        try { setBatchSheets(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === PLANT_STATUS_KEY && e.newValue) {
        setPlantStatusState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (unsubChallans) unsubChallans();
      if (unsubBatches) unsubBatches();
      if (unsubStatus) unsubStatus();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const todayStr = getLocalIstDateStr();

  // Metrics Calculations
  const metrics = useMemo(() => {
    // 1. Today's Batches (matching date or createdAt)
    const todayBatches = batchSheets.filter((b) => {
      if (!b) return false;
      const bDate = b.date || (b.createdAt ? b.createdAt.split('T')[0] : '');
      return bDate === todayStr || (!bDate && b.status === 'Running');
    });

    // Today's Production (m³)
    const todayProdVolume = todayBatches.reduce((acc, b) => acc + (Number(b.quantity || b.totalQuantity || b.batchSize) || 0), 0);

    // Active, Completed, Pending Batches
    const activeBatchesCount = batchSheets.filter((b) => b && (b.status === 'Running' || b.status === 'Active' || b.status === 'In Progress')).length;
    const completedBatchesCount = batchSheets.filter((b) => b && (b.status === 'Completed' || b.status === 'Done')).length;
    const pendingBatchesCount = batchSheets.filter((b) => b && (b.status === 'Pending' || b.status === 'Queued' || b.status === 'Scheduled')).length;

    // 2. Today's Dispatch (m³)
    const todayChallans = challans.filter((c) => {
      if (!c) return false;
      const cDate = c.date || (c.createdAt ? c.createdAt.split('T')[0] : '');
      return cDate === todayStr || (!cDate && c.status === 'In Transit');
    });
    const todayDispatchVolume = todayChallans.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0);

    return {
      todayProduction: Number(todayProdVolume).toFixed(1),
      activeBatches: activeBatchesCount,
      completedBatches: completedBatchesCount,
      pendingBatches: pendingBatchesCount,
      todayDispatch: Number(todayDispatchVolume).toFixed(1),
    };
  }, [batchSheets, challans, todayStr]);

  // Attendance resolution for Operator
  const operatorTodayAttendance = useMemo(() => {
    return (attendance || []).find(
      (a) => a.date === todayStr &&
        ((a.employeeId && a.employeeId.toUpperCase() === 'OP-001') ||
         (a.employeeId && user?.employeeId && a.employeeId.toUpperCase() === user.employeeId.toUpperCase()) ||
         (a.employeeId && user?.id && a.employeeId.toUpperCase() === user.id.toUpperCase()))
    );
  }, [attendance, todayStr, user]);

  const isOperatorClockedIn = Boolean(operatorTodayAttendance?.punchIn);
  const isOperatorShiftEnded = Boolean(operatorTodayAttendance?.punchOut);

  // Update Challan Status (Immediately synced across devices, Plant Manager, and Accountant)
  const handleUpdateChallanStatus = (challanId, newStatus) => {
    const updated = challans.map((c) => {
      if (c.id === challanId || c.challanNo === challanId) {
        return {
          ...c,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.name || 'Plant Operator',
        };
      }
      return c;
    });

    setChallans(updated);
    try {
      localStorage.setItem(CHALLAN_STORAGE_KEY, JSON.stringify(updated));
      pushCloudStore('cloud_delivery_challans', CHALLAN_STORAGE_KEY, updated);
      setToastMessage(`Challan ${challanId} updated to ${newStatus} — synced across Plant Manager & Accounts`);
    } catch (e) {
      console.error('Failed to sync challan status:', e);
    }
  };

  const [searchChallanQuery, setSearchChallanQuery] = useState('');

  const filteredChallans = useMemo(() => {
    if (!searchChallanQuery.trim()) return challans.slice(0, 10);
    const q = searchChallanQuery.toLowerCase();
    return challans.filter(
      (c) =>
        (c.challanNo && c.challanNo.toLowerCase().includes(q)) ||
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.vehicleNo && c.vehicleNo.toLowerCase().includes(q)) ||
        (c.site && c.site.toLowerCase().includes(q)) ||
        (c.grade && c.grade.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [challans, searchChallanQuery]);

  return (
    <AppLayout
      title={activeTab === 'dashboard' ? 'Plant Operator Console' : null}
      badge={activeTab === 'dashboard' ? 'BATCHING & DISPATCH' : null}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        activeTab === 'dashboard' ? (
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                isOperatorClockedIn && !isOperatorShiftEnded
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#1D5FA7]" />
              <span>{isOperatorClockedIn && !isOperatorShiftEnded ? 'On Duty' : 'Daily Attendance'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delivery-challans')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Challans Desk</span>
            </button>
          </div>
        ) : null
      }
    >
      {/* Tab: Dedicated Daily Attendance */}
      {activeTab === 'attendance' && (
        <RolePersonalAttendanceView
          defaultRole="Operator"
          defaultEmpId="OP-001"
          defaultDepartment="Plant Batching Operations"
          onPunched={() => setToastMessage('Operator daily attendance verified and synced!')}
        />
      )}

      {/* Tab: Full Delivery Challans View */}
      {activeTab === 'delivery-challans' && <DeliveryChallansView />}

      {/* Tab: Full Batching Sheets View */}
      {activeTab === 'batching-sheets' && <BatchingSheetsView />}

      {/* Main Operator Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="w-full flex-1 flex flex-col space-y-4 pb-6 min-w-0">
          
          {/* Plant Operational Status & Attendance Ribbon */}
          <section className="p-3 sm:p-4 rounded-2xl bg-white border border-[#D4E4F7] shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Operator Attendance Telemetry */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] border border-[#D4E4F7] text-[#1D5FA7] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    Plant Operator Attendance
                  </h3>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EAF3FF] text-[#1D5FA7] border border-[#D4E4F7]">
                    OP-001
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  {isOperatorClockedIn && !isOperatorShiftEnded
                    ? `Shift active since ${formatToIndian12Hr(operatorTodayAttendance?.punchIn)} • 📍 ${operatorTodayAttendance?.geofenceStatus || 'Plant Batching Control'}`
                    : isOperatorShiftEnded
                    ? `Shift completed at ${formatToIndian12Hr(operatorTodayAttendance?.punchOut)} (${operatorTodayAttendance?.workingHours || 8} hrs logged)`
                    : 'Awaiting shift punch-in • Duty: Plant Batching & Dispatch Control'}
                </p>
              </div>
            </div>

            {/* Plant Status Selector (Running / Stopped / Maintenance) */}
            <div className="flex items-center flex-wrap gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider hidden sm:inline">
                Plant State:
              </span>
              <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => setPlantStatus('Running')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    plantStatus === 'Running'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Running</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlantStatus('Stopped')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    plantStatus === 'Stopped'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Stopped</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlantStatus('Maintenance')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    plantStatus === 'Maintenance'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Maintenance</span>
                </button>
              </div>

              {/* Attendance Quick Button */}
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  isOperatorClockedIn && !isOperatorShiftEnded
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                    : 'bg-[#1D5FA7] hover:bg-[#123B6D] text-white shadow-2xs'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isOperatorClockedIn && !isOperatorShiftEnded ? 'End Shift' : 'Punch In'}</span>
              </button>
            </div>
          </section>

          {/* 6 Mandatory Operational KPI Cards */}
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* 1. Today's Production */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold tracking-tight uppercase">Today's Production</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900">
                {metrics.todayProduction} <span className="text-xs font-normal text-slate-500">m³</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Total concrete produced</span>
            </div>

            {/* 2. Active Batches */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold tracking-tight uppercase">Active Batches</span>
                <PlayCircle className="w-4 h-4 text-emerald-600 animate-pulse" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700">
                {metrics.activeBatches}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Currently running</span>
            </div>

            {/* 3. Completed Batches */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold tracking-tight uppercase">Completed Batches</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900">
                {metrics.completedBatches}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Successfully completed</span>
            </div>

            {/* 4. Pending Batches */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold tracking-tight uppercase">Pending Batches</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-amber-700">
                {metrics.pendingBatches}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Waiting for production</span>
            </div>

            {/* 5. Today's Dispatch */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold tracking-tight uppercase">Today's Dispatch</span>
                <Truck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900">
                {metrics.todayDispatch} <span className="text-xs font-normal text-slate-500">m³</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Dispatched in mixers</span>
            </div>

            {/* 6. Plant Status */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold tracking-tight uppercase">Plant Status</span>
                <Gauge className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-sm sm:text-base font-bold font-mono">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold inline-block ${
                  plantStatus === 'Running'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : plantStatus === 'Stopped'
                    ? 'bg-rose-50 text-rose-800 border border-rose-300'
                    : 'bg-amber-50 text-amber-800 border border-amber-300'
                }`}>
                  {plantStatus}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Current plant state</span>
            </div>
          </section>

          {/* Quick Production & Dispatch Actions */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <QuickAction
              icon={Truck}
              title="New Delivery Challan"
              desc="Dispatch concrete mixer"
              color="indigo"
              onClick={() => setActiveTab('delivery-challans')}
            />
            <QuickAction
              icon={ClipboardList}
              title="Batching Sheets"
              desc="Create or inspect batch mix"
              color="blue"
              onClick={() => setActiveTab('batching-sheets')}
            />
            <QuickAction
              icon={Layers}
              title="Material Inward"
              desc="Aggregate & cement stock"
              color="amber"
              onClick={() => setActiveTab('material-inward')}
            />
            <QuickAction
              icon={Clock}
              title="Daily Attendance"
              desc="Selfie GPS punch record"
              color="emerald"
              onClick={() => setActiveTab('attendance')}
            />
          </section>

          {/* Live Delivery Challan Management Strip (Operator Updates Directly Sync to Plant Manager & Accountant) */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#1D5FA7]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Live Delivery Challans (Operator Desk)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Auto-Synced to Manager & Accounts
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update dispatch status, confirm deliveries, and generate official transit challans.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchChallanQuery}
                    onChange={(e) => setSearchChallanQuery(e.target.value)}
                    placeholder="Search challan, mixer, client..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('delivery-challans')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Challan</span>
                </button>
              </div>
            </div>

            {/* Challans Table / Mobile Cards */}
            {filteredChallans.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Truck className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No delivery challans recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "New Challan" to generate and dispatch concrete.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3">Challan No</th>
                      <th className="py-2.5 px-3">Customer & Site</th>
                      <th className="py-2.5 px-3">Mixer & Driver</th>
                      <th className="py-2.5 px-3">Grade & Qty</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Operator Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredChallans.map((c) => (
                      <tr key={c.id || c.challanNo} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          {c.challanNo}
                          <span className="block text-[10px] font-normal text-slate-400 font-sans">
                            {c.date || todayStr} {c.departureTime ? `• ${c.departureTime}` : ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                            {c.customerName || 'Standard Client'}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                            {c.site || 'Site Location'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-slate-800 block">
                            {c.vehicleNo || 'Mixer'}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {c.driverName || 'Assigned Driver'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className="font-bold text-slate-900 block">
                            {c.quantity || 6.0} m³
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans block">
                            {c.grade || 'M25'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold inline-block ${
                            c.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : 'bg-blue-50 text-blue-800 border border-blue-300'
                          }`}>
                            {c.status || 'In Transit'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status !== 'Delivered' ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateChallanStatus(c.id || c.challanNo, 'Delivered')}
                                className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Mark as Delivered at Site"
                              >
                                Mark Delivered
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateChallanStatus(c.id || c.challanNo, 'In Transit')}
                                className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Set back to In Transit"
                              >
                                Set Transit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveTab('delivery-challans')}
                              className="px-2 py-1 rounded-md text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </AppLayout>
  );
}
