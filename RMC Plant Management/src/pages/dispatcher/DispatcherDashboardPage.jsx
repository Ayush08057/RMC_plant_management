import React, { useState } from 'react';
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
  RotateCw,
  Send
} from 'lucide-react';
import { MOCK_DISPATCHER_DATA } from '../../data/mockDashboardData';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import DailyWorkView from '../../components/workforce/DailyWorkView';
import LeaveManagementView from '../../components/workforce/LeaveManagementView';

export default function DispatcherDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  const [dispatches, setDispatches] = useState(MOCK_DISPATCHER_DATA.dispatchQueue);
  const { kpis, fleetList } = MOCK_DISPATCHER_DATA;

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
    const created = {
      id: `DSP-${Math.floor(8828 + Math.random() * 80)}`,
      customer: newDispatch.customer,
      site: newDispatch.site,
      grade: newDispatch.grade,
      qty: newDispatch.qty,
      vehicle: newDispatch.vehicle,
      driver: newDispatch.driver,
      loadTime: 'Just Now',
      eta: '45 mins',
      status: 'Loading',
    };
    setDispatches([created, ...dispatches]);
    setShowCreateModal(false);
    setToastMessage(`Dispatch ${created.id} initiated for vehicle ${created.vehicle}!`);
  };

  const handleUpdateStatus = (id, newStatus) => {
    setDispatches(dispatches.map(d => d.id === id ? { ...d, status: newStatus } : d));
    setToastMessage(`Dispatch ${id} updated to "${newStatus}"!`);
  };

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
      title="Fleet Dispatch & Logistics Hub"
      subtitle="Transit mixer scheduling, loading gate queues, live GPS transit milestones, and digital challan distribution."
      badge="CENTRAL DISPATCH CONSOLE"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Assign Vehicle</span>
          </button>
        </div>
      }
    >
      {activeTab === 'attendance' && <AttendanceManagementView />}
      {activeTab === 'daily-work' && <DailyWorkView />}
      {activeTab === 'leaves' && <LeaveManagementView />}

      {activeTab === 'dashboard' && (
        <div className="w-full flex-1 flex flex-col space-y-5 pb-6 min-w-0">
          {/* 4 Primary KPI Cards + Secondary */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Quick Operational Commands Bar */}
          <section>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Dispatch Operations Commands
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                onClick={() => setToastMessage('Driver shift allocation opened.')}
              />
              <QuickAction
                icon={RotateCw}
                title="Drum Telemetry"
                desc="Check RPM & slump clock"
                color="purple"
                onClick={() => setToastMessage('Drum rotation telemetry verified with on-board sensor.')}
              />
            </div>
          </section>

          {/* Main Dispatch Queue Section with Filter Bar */}
          <section className="space-y-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
              {['All', 'On Route', 'Loading', 'Assigned', 'Pending', 'Delivered', 'Delayed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                    statusFilter === status
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

      {/* Fleet Live Yard Roster */}
      <section className="p-5 rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            <span>Transit Mixer Yard & Telematics Roster</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-700 font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
            GPS CARRIERS ONLINE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fleetList.length > 0 ? (
            fleetList.map((tm) => (
              <div key={tm.id} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between hover:border-cyan-300 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs font-mono">{tm.id} • {tm.vehicleNo}</span>
                    <StatusBadge status={tm.status} />
                  </div>
                  <div className="text-xs text-slate-700 mt-1 font-medium">{tm.driver}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">{tm.location}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                  <span>Capacity: {tm.capacity}</span>
                  <span className="text-amber-700 font-bold">Drum Sensor OK</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 font-medium">
              No transit mixers currently logged in the staging yard roster.
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

      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Mixer Vehicle & Driver"
        subtitle="Allocate available yard staging vehicles."
        icon={Truck}
      >
        <div className="space-y-3 text-xs text-slate-700">
          <p className="text-slate-600">
            Select an available mixer vehicle from the active fleet staging roster for loading bay allocation.
          </p>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-600">
            Loading bays are available. Queue an active transit mixer from dispatch roster.
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAssignModal(false);
                setToastMessage('Loading bay queue updated.');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </AppLayout>
  );
}
