import React, { useState, useMemo, useEffect } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import KPICard from '../../components/dashboard/KPICard';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import QuickAction from '../../components/dashboard/QuickAction';
import AlertCard from '../../components/dashboard/AlertCard';
import Modal from '../../components/dashboard/Modal';
import Toast from '../../components/dashboard/Toast';
import {
  Truck,
  Clock,
  Navigation,
  MapPin,
  User,
  CheckCircle2,
  Plus,
  AlertTriangle,
  Send,
  RotateCw,
  Activity,
  Gauge,
  ShieldCheck,
  Radio,
  Layers,
  Sparkles
} from 'lucide-react';
import { MOCK_DISPATCHER_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import DailyWorkView from '../../components/workforce/DailyWorkView';
import LeaveManagementView from '../../components/workforce/LeaveManagementView';
import RolePersonalAttendanceView from '../../components/workforce/RolePersonalAttendanceView';

const DEFAULT_FLEET = [];

export default function DispatcherDashboardPage() {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab');
      if (urlTab) return urlTab;
      const saved = sessionStorage.getItem('rmc_dispatcher_active_tab');
      if (saved) return saved;
    } catch {}
    return 'dashboard';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('rmc_dispatcher_active_tab', tab);
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
        sessionStorage.setItem('rmc_dispatcher_active_tab', urlTab);
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [toastMessage, setToastMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAssignDriverModal, setShowAssignDriverModal] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [selectedTelemetryId, setSelectedTelemetryId] = useState('TM-01');
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  const { createOrder, employees } = useWorkforce();
  const [dispatches, setDispatches] = useState(MOCK_DISPATCHER_DATA.dispatchQueue);
  const { kpis, fleetList } = MOCK_DISPATCHER_DATA;
  const [fleet, setFleet] = useState(
    fleetList && fleetList.length > 0 ? fleetList : DEFAULT_FLEET
  );

  // Driver Assignment Form State
  const [driverForm, setDriverForm] = useState({
    vehicleId: '',
    driverName: '',
    shift: 'General Morning Shift (09:00 - 18:00)',
    site: '',
  });

  // Vehicle Allocation Form State
  const [vehicleAllocForm, setVehicleAllocForm] = useState({
    vehicleId: '',
    bay: 'Loading Bay #01',
    mixGrade: 'M30 RMC',
  });

  // Dynamic driver list from real registered workforce
  const driverOptions = useMemo(() => {
    return (employees || [])
      .filter((e) => {
        const roleLower = (e.role || '').toLowerCase();
        const deptLower = (e.department || '').toLowerCase();
        return (
          roleLower.includes('driver') ||
          deptLower.includes('transport') ||
          deptLower.includes('logistics') ||
          deptLower.includes('fleet')
        );
      })
      .map((e) => `${e.name} (${e.id})`);
  }, [employees]);

  // New dispatch form
  const [newDispatch, setNewDispatch] = useState({
    customer: '',
    site: '',
    grade: '',
    qty: '',
    vehicle: '',
    driver: '',
  });

  const handleCreateDispatch = (e) => {
    e.preventDefault();
    const dspId = `DSP-${Math.floor(8828 + Math.random() * 80)}`;
    const ordId = `ORD-${Math.floor(8828 + Math.random() * 80)}`;
    const created = {
      id: dspId,
      orderId: ordId,
      customer: newDispatch.customer,
      client: newDispatch.customer,
      site: newDispatch.site,
      pourLocation: newDispatch.site,
      grade: newDispatch.grade,
      mixGrade: newDispatch.grade,
      qty: newDispatch.qty.includes('m³') ? newDispatch.qty : `${newDispatch.qty} m³`,
      volume: parseFloat(newDispatch.qty) || 0,
      vehicle: newDispatch.vehicle,
      driver: newDispatch.driver,
      loadTime: 'Just Now',
      eta: '45 mins',
      status: 'Loading',
      timeSlot: '10:00 AM - 12:00 PM',
      timeWindow: '10:00 AM - 12:00 PM',
      priority: 'Normal',
      plant: 'Main Plant Unit #01',
    };

    if (createOrder) {
      createOrder({
        ...created,
        id: ordId,
        orderId: ordId,
      });
    }

    setDispatches([created, ...dispatches]);
    setShowCreateModal(false);
    setToastMessage(`Dispatch ${created.id} initiated for vehicle ${created.vehicle}!`);
  };

  const handleUpdateStatus = (id, newStatus) => {
    setDispatches(dispatches.map(d => d.id === id ? { ...d, status: newStatus } : d));
    setToastMessage(`Dispatch ${id} updated to "${newStatus}"!`);
  };

  const handleAssignDriver = (e) => {
    e.preventDefault();
    setFleet((prev) =>
      prev.map((v) =>
        v.id === driverForm.vehicleId
          ? {
              ...v,
              driver: driverForm.driverName,
              location: driverForm.site,
              status: v.status === 'Available' ? 'Assigned' : v.status,
            }
          : v
      )
    );

    setDispatches((prev) =>
      prev.map((d) =>
        d.vehicle?.includes(driverForm.vehicleId)
          ? { ...d, driver: driverForm.driverName }
          : d
      )
    );

    setShowAssignDriverModal(false);
    setToastMessage(`Driver ${driverForm.driverName} successfully assigned to ${driverForm.vehicleId} on ${driverForm.shift}!`);
  };

  const handleAssignVehicle = (e) => {
    e.preventDefault();
    setFleet((prev) =>
      prev.map((v) =>
        v.id === vehicleAllocForm.vehicleId
          ? {
              ...v,
              status: 'Loading',
              location: vehicleAllocForm.bay,
            }
          : v
      )
    );
    setShowAssignModal(false);
    setToastMessage(`Transit Mixer ${vehicleAllocForm.vehicleId} staged at ${vehicleAllocForm.bay} for ${vehicleAllocForm.mixGrade}!`);
  };

  const currentTelemetry = useMemo(() => {
    return (fleet || []).find((v) => v?.id === selectedTelemetryId) || (fleet || [])[0] || null;
  }, [fleet, selectedTelemetryId]);

  // Filtered dispatches
  const filteredDispatches = statusFilter === 'All'
    ? dispatches
    : dispatches.filter(d => d.status.toLowerCase() === statusFilter.toLowerCase());

  const columns = [
    {
      header: 'Dispatch ID',
      accessor: 'id',
      render: (row) => <span className="font-mono text-blue-400 font-bold">{row.id}</span>
    },
    {
      header: 'Customer & Site',
      accessor: 'customer',
      render: (row) => (
        <div>
          <div className="font-semibold text-white">{row.customer}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span>{row.site}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Grade / Qty',
      accessor: 'grade',
      render: (row) => (
        <div>
          <span className="px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300/80 font-mono text-[10px] font-semibold">{row.grade}</span>
          <span className="font-bold text-white font-mono ml-2 text-xs">{row.qty}</span>
        </div>
      )
    },
    {
      header: 'Assigned Vehicle',
      accessor: 'vehicle',
      render: (row) => (
        <div>
          <div className="font-mono text-xs text-slate-200">{row.vehicle}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-500" />
            <span>{row.driver}</span>
          </div>
        </div>
      )
    },
    { header: 'Loading', accessor: 'loadTime', className: 'font-mono text-slate-400' },
    { header: 'ETA Site', accessor: 'eta', className: 'font-mono text-amber-400 font-semibold' },
    { header: 'Delivery Status', accessor: 'status', type: 'status' },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'Loading' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(row.id, 'On Route')}
              className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[11px] font-semibold flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>Dispatch</span>
            </button>
          )}
          {row.status === 'On Route' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(row.id, 'Delivered')}
              className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Delivered</span>
            </button>
          )}
          {row.status !== 'Loading' && row.status !== 'On Route' && (
            <span className="text-[10px] text-slate-500 font-mono">Logged</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Fleet Dispatch & Logistics"
      badge="DISPATCH"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Mark or View Daily Attendance"
          >
            <Clock className="w-3.5 h-3.5 text-[#1D5FA7]" />
            <span>Daily Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-[#1D5FA7]" />
            <span>Assign Vehicle</span>
          </button>
        </div>
      }
    >
      {activeTab === 'attendance' && (
        <RolePersonalAttendanceView
          defaultRole="Dispatcher"
          defaultEmpId="DIS-001"
          defaultDepartment="Logistics & Dispatch"
          onPunched={() => setToastMessage('Dispatcher daily attendance verified and recorded!')}
        />
      )}
      {activeTab === 'daily-work' && <DailyWorkView />}
      {activeTab === 'leaves' && <LeaveManagementView />}

      {(!['attendance', 'daily-work', 'leaves'].includes(activeTab) || activeTab === 'dashboard') && (
        <div className="w-full flex-1 flex flex-col space-y-5 pb-6 min-w-0">
          {/* 4 Primary KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            <KPICard
              title="Vehicles On Route"
              value={`${kpis.vehiclesOnRoute} Mixers`}
              subtext="In active transit to sites"
              trend="GPS Synced"
              trendType="up"
              color="blue"
              icon={Navigation}
            />
            <KPICard
              title="Yard Free Mixers"
              value={`${kpis.vehiclesAvailable} Free`}
              subtext="Ready in staging yard"
              trend="High Availability"
              trendType="up"
              color="emerald"
              icon={Truck}
            />
            <KPICard
              title="Today's Total Dispatches"
              value={kpis.todayDispatches}
              subtext={kpis.todayDispatches > 0 ? "Volume shipped today" : "No dispatches recorded today"}
              trend="Today"
              trendType="neutral"
              color="amber"
              icon={Clock}
            />
            <KPICard
              title="Delayed Turnarounds"
              value={kpis.delayed}
              subtext={kpis.delayed > 0 ? "Transit delays detected" : "Zero transit delays"}
              trend={kpis.delayed > 0 ? "Action Required" : "Normal"}
              trendType={kpis.delayed > 0 ? "down" : "up"}
              color="rose"
              icon={AlertTriangle}
            />
          </section>

          {/* Primary Operations Table: Main Dispatch Queue Section with Filter Bar */}
          <section className="space-y-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              {['All', 'On Route', 'Loading', 'Assigned', 'Pending', 'Delivered', 'Delayed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${statusFilter === status
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-500/30'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <DataTable
              title="Central Dispatch Queue"
              subtitle="Real-time transit mixer journey milestones from batching gate release to site pour completion"
              icon={Navigation}
              columns={columns}
              data={filteredDispatches}
              searchPlaceholder="Search dispatch ID, customer, site, vehicle, driver..."
              renderMobileCard={(dsp) => (
                <div className="w-full max-w-full overflow-hidden min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-bold text-blue-600 truncate">{dsp.id}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">{dsp.customer}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{dsp.site}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={dsp.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Vehicle:</span>
                      <span className="font-mono text-slate-800 font-medium truncate block">{dsp.vehicle}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Driver:</span>
                      <span className="text-slate-700 font-medium truncate block">{dsp.driver}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Mix & Qty:</span>
                      <span className="font-semibold text-amber-700">{dsp.grade} • {dsp.qty}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Target ETA:</span>
                      <span className="font-mono text-amber-700 font-semibold">{dsp.eta}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">Loaded: {dsp.loadTime}</span>
                    {dsp.status === 'Loading' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(dsp.id, 'On Route')}
                        className="px-3 py-1 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-xs hover:bg-cyan-700"
                      >
                        Release Dispatch
                      </button>
                    )}
                    {dsp.status === 'On Route' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(dsp.id, 'Delivered')}
                        className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              )}
            />
          </section>

          {/* Quick Operational Commands Bar */}
          <section>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Dispatch Operations Commands
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <QuickAction
                icon={Plus}
                title="Create Dispatch"
                desc="Allocate batch to mixer"
                color="blue"
                onClick={() => setShowCreateModal(true)}
              />
              <QuickAction
                icon={Truck}
                title="Assign Vehicle"
                desc="Staging yard bay allocate"
                color="amber"
                onClick={() => setShowAssignModal(true)}
              />
              <QuickAction
                icon={User}
                title="Assign Driver"
                desc="Match roster duty shift"
                color="emerald"
                onClick={() => setShowAssignDriverModal(true)}
              />
              <QuickAction
                icon={RotateCw}
                title="Drum Telemetry"
                desc="Check RPM & slump clock"
                color="purple"
                onClick={() => setShowTelemetryModal(true)}
              />
            </div>
          </section>

          {/* Fleet Live Yard Roster */}
          <section className="p-3 sm:p-4 rounded-2xl bg-white border border-[#D4E4F7] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#1D5FA7]" />
                <span>Transit Mixer Yard & Telematics Roster</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-700 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                GPS CARRIERS ONLINE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {fleet.length > 0 ? (
                fleet.map((tm) => (
                  <div
                    key={tm.id}
                    onClick={() => {
                      setSelectedTelemetryId(tm.id);
                      setShowTelemetryModal(true);
                    }}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-[#1D5FA7] hover:bg-[#F5F9FF] transition-all cursor-pointer shadow-2xs group"
                    title="Click to view live drum telemetry"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs font-mono group-hover:text-[#1D5FA7] transition-colors">{tm.id} • {tm.vehicleNo}</span>
                        <StatusBadge status={tm.status} />
                      </div>
                      <div className="text-xs text-slate-800 mt-1.5 font-bold flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{tm.driver}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{tm.location}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                      <span>Cap: {tm.capacity}</span>
                      <span className="text-[#1D5FA7] font-bold flex items-center gap-1">
                        <RotateCw className="w-3 h-3 text-[#1D5FA7]" />
                        <span>{tm.rpm > 0 ? `${tm.rpm} RPM` : 'Standby'}</span>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-10 px-4 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-2xs">
                    <Truck className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">No Active Transit Mixers in Yard or On Route</h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mb-4">
                    Mixer fleet and telematics telemetry will populate dynamically once transit vehicles and drivers are assigned and dispatched.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1D5FA7] hover:bg-[#174e8a] text-white shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Dispatch</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Delivery Dispatch"
        subtitle="Authorize gate pass and dispatch concrete mixer."
        icon={Plus}
      >
        <form onSubmit={handleCreateDispatch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Customer Account *
            </label>
            <input
              type="text"
              required
              value={newDispatch.customer}
              onChange={(e) => setNewDispatch({ ...newDispatch, customer: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Destination Pour Site *
            </label>
            <input
              type="text"
              required
              value={newDispatch.site}
              onChange={(e) => setNewDispatch({ ...newDispatch, site: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Concrete Grade
              </label>
              <input
                type="text"
                value={newDispatch.grade}
                onChange={(e) => setNewDispatch({ ...newDispatch, grade: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Batch Volume
              </label>
              <input
                type="text"
                value={newDispatch.qty}
                onChange={(e) => setNewDispatch({ ...newDispatch, qty: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Mixer Vehicle
              </label>
              <input
                type="text"
                value={newDispatch.vehicle}
                onChange={(e) => setNewDispatch({ ...newDispatch, vehicle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Driver
              </label>
              <input
                type="text"
                value={newDispatch.driver}
                onChange={(e) => setNewDispatch({ ...newDispatch, driver: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-slate-950"
            >
              Dispatch Mixer
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Mixer Vehicle to Loading Bay Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Stage Transit Mixer Vehicle"
        subtitle="Allocate available yard staging vehicles to loading bays."
        icon={Truck}
      >
        <form onSubmit={handleAssignVehicle} className="space-y-4 text-xs text-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Available Mixer Vehicle *
            </label>
            <select
              value={vehicleAllocForm.vehicleId}
              onChange={(e) => setVehicleAllocForm({ ...vehicleAllocForm, vehicleId: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold cursor-pointer focus:bg-white focus:border-[#1D5FA7]"
            >
              {fleet && fleet.length > 0 ? (
                <>
                  <option value="">Select Transit Mixer</option>
                  {fleet.map((v) => (
                    <option key={v?.id} value={v?.id}>
                      {v?.id} ({v?.vehicleNo}) — Currently {v?.status} [{v?.capacity}]
                    </option>
                  ))}
                </>
              ) : (
                <option value="">No transit mixer vehicles in yard</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Staging Loading Bay *
              </label>
              <select
                value={vehicleAllocForm.bay}
                onChange={(e) => setVehicleAllocForm({ ...vehicleAllocForm, bay: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold cursor-pointer focus:bg-white focus:border-[#1D5FA7]"
              >
                <option value="Loading Bay #01 (Dry Batch)">Loading Bay #01 (Dry Batch)</option>
                <option value="Loading Bay #02 (Wet Batch)">Loading Bay #02 (Wet Batch)</option>
                <option value="Loading Bay #03 (Rapid Discharge)">Loading Bay #03 (Rapid Discharge)</option>
                <option value="Washout & Inspection Bay">Washout & Inspection Bay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Concrete Mix Grade
              </label>
              <select
                value={vehicleAllocForm.mixGrade}
                onChange={(e) => setVehicleAllocForm({ ...vehicleAllocForm, mixGrade: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold cursor-pointer focus:bg-white focus:border-[#1D5FA7]"
              >
                <option value="M25 RMC">M25 RMC (Standard Slab)</option>
                <option value="M30 RMC">M30 RMC (Columns / Beams)</option>
                <option value="M35 RMC">M35 RMC (Heavy Foundation)</option>
                <option value="M40 Self-Compacting">M40 Self-Compacting</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#1D5FA7] shrink-0 animate-pulse" />
            <span>Telemetry beacon will automatically calibrate chute angle and drum rotation when queued at the bay.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white shadow-xs transition-all cursor-pointer"
            >
              Allocate Vehicle to Bay
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Driver to Vehicle & Shift Modal */}
      <Modal
        isOpen={showAssignDriverModal}
        onClose={() => setShowAssignDriverModal(false)}
        title="Assign Driver to Mixer Vehicle"
        subtitle="Match available licensed drivers with active fleet transit mixers and duty shifts."
        icon={User}
      >
        <form onSubmit={handleAssignDriver} className="space-y-4 text-xs text-slate-700">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Mixer Vehicle *
              </label>
              <select
                value={driverForm.vehicleId}
                onChange={(e) => setDriverForm({ ...driverForm, vehicleId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold cursor-pointer focus:bg-white focus:border-[#1D5FA7]"
                required
              >
                {fleet && fleet.length > 0 ? (
                  <>
                    <option value="">Select Transit Mixer</option>
                    {fleet.map((v) => (
                      <option key={v?.id} value={v?.id}>
                        {v?.id} ({v?.vehicleNo}) — Current: {v?.driver}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="">No transit mixer vehicles in yard</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Licensed Driver *
              </label>
              <select
                value={driverForm.driverName}
                onChange={(e) => setDriverForm({ ...driverForm, driverName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold cursor-pointer focus:bg-white focus:border-[#1D5FA7]"
                required
              >
                {driverOptions.length > 0 ? (
                  <>
                    <option value="">Select Enrolled Driver</option>
                    {driverOptions.map((d, idx) => (
                      <option key={idx} value={d}>
                        {d}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="">No registered drivers found (Enroll in Workforce)</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Duty Shift Roster *
              </label>
              <select
                value={driverForm.shift}
                onChange={(e) => setDriverForm({ ...driverForm, shift: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold cursor-pointer focus:bg-white focus:border-[#1D5FA7]"
              >
                <option value="Morning Shift (06:00 - 14:00)">Morning Shift (06:00 - 14:00)</option>
                <option value="General Shift (09:00 - 18:00)">General Shift (09:00 - 18:00)</option>
                <option value="Evening Shift (14:00 - 22:00)">Evening Shift (14:00 - 22:00)</option>
                <option value="Night Pouring Shift (22:00 - 06:00)">Night Pouring Shift (22:00 - 06:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Destination Site Route
              </label>
              <input
                type="text"
                value={driverForm.site}
                onChange={(e) => setDriverForm({ ...driverForm, site: e.target.value })}
                placeholder="e.g. Metro Line 3 - Pier 44"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-[#1D5FA7]"
                required
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Commercial Heavy Vehicle Certification Verified</span>
              <span className="text-[11px] text-emerald-800">
                Driver holds valid HGV endorsement. Pre-trip safety checklist and GPS link confirmed.
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAssignDriverModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white shadow-xs transition-all cursor-pointer"
            >
              Confirm Driver Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* Live Drum Telemetry & Slump Clock Modal */}
      {showTelemetryModal && (
        <Modal
          isOpen={showTelemetryModal}
          onClose={() => setShowTelemetryModal(false)}
          title="Transit Mixer Drum Telemetry & Slump Inspector"
          subtitle="Real-time IoT sensor telemetry monitoring drum rotation (RPM), temperature, and concrete slump life."
          icon={RotateCw}
        >
          <div className="space-y-4 text-xs text-slate-700">
            {/* Vehicle selector pills */}
            <div>
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Fleet Transit Mixer
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {fleet && fleet.length > 0 ? (
                  fleet.map((v) => (
                    <button
                      key={v?.id}
                      type="button"
                      onClick={() => setSelectedTelemetryId(v?.id)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        currentTelemetry?.id === v?.id
                          ? 'bg-[#1D5FA7] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{v?.id} ({v?.vehicleNo})</span>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic">No fleet vehicles currently in roster</div>
                )}
              </div>
            </div>

            {currentTelemetry ? (
              <>
                {/* Telemetry Overview Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-[#D4E4F7] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 font-mono">{currentTelemetry.id} • {currentTelemetry.vehicleNo || 'TM-UNIT'}</div>
                      <div className="text-xs text-slate-600 mt-0.5">Driver: <strong className="text-slate-900">{currentTelemetry.driver || 'Unassigned'}</strong> • Route: {currentTelemetry.location || 'Staging Yard'}</div>
                    </div>
                    <StatusBadge status={currentTelemetry.status || 'Staged'} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">Drum Speed</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <RotateCw className="w-4 h-4 text-[#1D5FA7]" />
                        <span className="text-base font-black font-mono text-slate-900">{currentTelemetry.rpm || 0} <span className="text-xs font-normal text-slate-500">RPM</span></span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">{currentTelemetry.drumStatus || 'Agitating'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">Slump Life Clock</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-base font-black font-mono text-slate-900">{currentTelemetry.elapsedMins || 0} / 90 <span className="text-xs font-normal text-slate-500">m</span></span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Initial setting window</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">Estimated Slump</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Gauge className="w-4 h-4 text-emerald-600" />
                        <span className="text-base font-black font-mono text-slate-900">{currentTelemetry.slump || 135} <span className="text-xs font-normal text-slate-500">mm</span></span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Target M30 range</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">Mix Temperature</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span className="text-base font-black font-mono text-slate-900">{currentTelemetry.temp || '28.2°C'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Hydration stable</span>
                    </div>
                  </div>

                  {/* Progress Bar of Slump Life */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Concrete Freshness & Setting Progress</span>
                      <span className="font-mono font-bold text-slate-900">{Math.round(((currentTelemetry.elapsedMins || 20) / 90) * 100)}% Elapsed</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round(((currentTelemetry.elapsedMins || 20) / 90) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setToastMessage(`IoT telemetry refreshed for ${currentTelemetry.id} (RPM: ${currentTelemetry.rpm || 0} RPM).`)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-[#EAF3FF] text-[#1D5FA7] border border-[#D4E4F7] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Ping On-Board Sensor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTelemetryModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white cursor-pointer shadow-xs"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="py-8 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <Truck className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div className="text-xs font-bold text-slate-700 mb-1">No Active Transit Mixers in Fleet</div>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-4">
                  IoT drum sensor telemetry and slump tracking will activate once vehicles are added or dispatched.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTelemetryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1D5FA7] text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </AppLayout>
  );
}
