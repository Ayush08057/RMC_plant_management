import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import KPICard from '../../components/dashboard/KPICard';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import QuickAction from '../../components/dashboard/QuickAction';
import AlertCard from '../../components/dashboard/AlertCard';
import Modal from '../../components/dashboard/Modal';
import Toast from '../../components/dashboard/Toast';
import {
  HardHat,
  Truck,
  CheckCircle2,
  Clock,
  FileCheck,
  MapPin,
  AlertTriangle,
  Camera,
  Activity,
  Plus
} from 'lucide-react';
import { MOCK_SITE_SUPERVISOR_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';

// Phase 1 Workforce Views
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import DailyWorkView from '../../components/workforce/DailyWorkView';
import LeaveManagementView from '../../components/workforce/LeaveManagementView';
import RolePersonalAttendanceView from '../../components/workforce/RolePersonalAttendanceView';

export default function SiteSupervisorDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab');
      if (urlTab) return urlTab;
      const saved = sessionStorage.getItem('rmc_supervisor_active_tab');
      if (saved) return saved;
    } catch {}
    return 'dashboard';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('rmc_supervisor_active_tab', tab);
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
        sessionStorage.setItem('rmc_supervisor_active_tab', urlTab);
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [toastMessage, setToastMessage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const { attendance, dailyWork, leaves, employees } = useWorkforce();
  const todayStr = new Date().toISOString().split('T')[0];
  const teamAttendance = attendance.filter((a) => a.date === todayStr);
  const presentCount = teamAttendance.filter((a) => a.status === 'Present').length;
  const lateCount = teamAttendance.filter((a) => a.lateStatus).length;
  const teamWorkCount = dailyWork.filter((w) => w.date === todayStr).length;
  const pendingLeaves = leaves.filter((l) => l.status === 'Pending').length;
  const supervisorTodayAttendance = (attendance || []).find(
    (a) => (a.date === todayStr || (a.createdAt && a.createdAt.startsWith(todayStr)) || (a.id && a.id.includes(todayStr.replace(/-/g, '')))) &&
      ((a.employeeId && (a.employeeId.toUpperCase() === 'SS-001' || a.employeeId.toUpperCase() === 'USR-SS-001')) ||
       (a.employeeId && user?.employeeId && a.employeeId.toUpperCase() === user.employeeId.toUpperCase()) ||
       (a.employeeId && user?.id && a.employeeId.toUpperCase() === user.id.toUpperCase()))
  );
  const isSupervisorClockedIn = Boolean(supervisorTodayAttendance?.punchIn);
  const isSupervisorShiftEnded = Boolean(supervisorTodayAttendance?.punchOut);

  const { kpis, currentSite, todayDeliveries, pouringStatus, siteIssues } = MOCK_SITE_SUPERVISOR_DATA;

  const [deliveries, setDeliveries] = useState(todayDeliveries);
  const [issueText, setIssueText] = useState('');

  const handleConfirmDelivery = (dispatchId) => {
    setDeliveries(deliveries.map(d => d.dispatchId === dispatchId ? { ...d, status: 'Unloaded' } : d));
    setToastMessage(`Delivery ${dispatchId} confirmed & e-Challan digitally signed!`);
    setShowConfirmModal(false);
  };

  const handleReportIssue = (e) => {
    e.preventDefault();
    if (!issueText) return;
    setToastMessage(`Safety & site issue logged. Dispatch & plant manager alerted.`);
    setShowIssueModal(false);
    setIssueText('');
  };

  const deliveryColumns = [
    {
      header: 'Dispatch ID',
      accessor: 'dispatchId',
      render: (row) => <span className="font-mono text-orange-400 font-bold">{row.dispatchId}</span>
    },
    {
      header: 'Vehicle & Driver',
      accessor: 'vehicle',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.vehicle}</div>
          <div className="text-[11px] text-slate-400">{row.driver}</div>
        </div>
      )
    },
    {
      header: 'Grade / Volume',
      accessor: 'grade',
      render: (row) => (
        <div>
          <span className="px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300/80 font-mono text-[10px] font-semibold">{row.grade}</span>
          <span className="font-bold text-white font-mono ml-2 text-xs">{row.qty}</span>
        </div>
      )
    },
    { header: 'Arrival Time', accessor: 'arrivalTime', className: 'font-mono text-slate-300' },
    { header: 'Site Status', accessor: 'status', type: 'status' },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div>
          {row.status === 'On Route' ? (
            <button
              type="button"
              onClick={() => handleConfirmDelivery(row.dispatchId)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-400 text-slate-950 transition-colors shadow-sm"
            >
              Sign Challan
            </button>
          ) : (
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Signed</span>
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Site Pouring & Inspection"
      badge={currentSite ? currentSite.name.toUpperCase() : "ACTIVE SITE"}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSupervisorClockedIn && !isSupervisorShiftEnded
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7]'
            }`}
            title="Mark or View Daily Attendance"
          >
            <Clock className={`w-3.5 h-3.5 ${isSupervisorClockedIn && !isSupervisorShiftEnded ? 'text-emerald-600' : 'text-[#1D5FA7]'}`} />
            <span>{isSupervisorClockedIn && !isSupervisorShiftEnded ? 'On Duty (End Shift)' : 'Daily Attendance'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirm Delivery</span>
          </button>
          <button
            type="button"
            onClick={() => setShowIssueModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#1D5FA7]" />
            <span>Report Issue</span>
          </button>
        </div>
      }
    >
      {activeTab === 'attendance' && (
        <RolePersonalAttendanceView
          defaultRole="Site Supervisor"
          defaultEmpId="SS-001"
          defaultDepartment="Site Operations"
          canSwitchToTeamView={true}
          teamViewComponent={<AttendanceManagementView />}
          onPunched={() => setToastMessage('Site Supervisor attendance verified and recorded!')}
        />
      )}
      {activeTab === 'daily-work' && <DailyWorkView />}
      {activeTab === 'leaves' && <LeaveManagementView />}

      {(!['attendance', 'daily-work', 'leaves'].includes(activeTab) || activeTab === 'dashboard') && (
        <div className="w-full flex-1 flex flex-col space-y-5 pb-6 min-w-0">
          {/* Site Team Workforce Telemetry Strip */}
          <section className="p-4.5 rounded-3xl bg-gradient-to-r from-orange-50/90 via-white to-amber-50/90 border border-orange-200/90 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-[10px] font-mono uppercase text-orange-800 font-bold block tracking-wider">
                  SITE TEAM ATTENDANCE & EXECUTION
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {presentCount} Site Personnel Clocked In Today • <span className="text-orange-700 font-mono font-black">{teamWorkCount} Daily Pouring Logs</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                Late: <strong className="text-amber-700 font-bold">{lateCount}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                Pending Leave: <strong className="text-purple-700 font-bold">{pendingLeaves}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans cursor-pointer shadow-xs transition-all flex items-center gap-1.5 ${
                  isSupervisorClockedIn && !isSupervisorShiftEnded
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-[#136dec] hover:bg-[#115ec9] text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isSupervisorClockedIn && !isSupervisorShiftEnded ? 'Shift Active (Clock Out →)' : 'Punch In for Today →'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('daily-work')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold font-sans cursor-pointer shadow-xs transition-all active:scale-[0.98]"
              >
                Log Site Work →
              </button>
            </div>
          </section>

          {/* 4 Primary KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            <KPICard
              title="Deliveries Completed"
              value={`${kpis.completedDeliveries} Mixers`}
              subtext={kpis.completedDeliveries > 0 ? "Continuous pour completed" : "No dispatches recorded today"}
              trend={kpis.completedDeliveries > 0 ? "On Track" : "Standby"}
              trendType="up"
              color="amber"
              icon={HardHat}
            />
            <KPICard
              title="Inbound En Route"
              value={`${kpis.pendingDeliveries} In Transit`}
              subtext={deliveries.length > 0 ? `Next mixer: ${deliveries[0].vehicle}` : "No active inbound transit"}
              trend={kpis.pendingDeliveries > 0 ? "In Transit" : "Clear"}
              trendType="up"
              color="blue"
              icon={Truck}
            />
            <KPICard
              title="Concrete Slump on Site"
              value={pouringStatus.slumpOnSite || "--"}
              subtext="IS 456 Standard Slump"
              trend={pouringStatus.slumpOnSite !== '--' ? "Within Spec" : "Standby"}
              trendType="neutral"
              color="emerald"
              icon={Activity}
            />
            <KPICard
              title="Active Project Sites"
              value={`${kpis.activeSites} ${kpis.activeSites === 1 ? 'Location' : 'Locations'}`}
              subtext={currentSite ? currentSite.name : "No active site assigned"}
              trend={kpis.activeSites > 0 ? "Allocated" : "Standby"}
              trendType="neutral"
              color="purple"
              icon={MapPin}
            />
          </section>

          {/* Primary Operations Table: Today's Concrete Inbound Deliveries */}
          <section>
            <DataTable
              title="Today's Concrete Inbound Deliveries"
              subtitle="Transit mixer consignments dispatched from batching plant to current site"
              icon={Truck}
              columns={deliveryColumns}
              data={deliveries}
              searchPlaceholder="Search dispatch ID, vehicle, driver..."
              renderMobileCard={(d) => (
                <div className="w-full max-w-full overflow-hidden min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-bold text-orange-600 truncate">{d.dispatchId}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">{d.vehicle}</div>
                      <div className="text-xs text-slate-500 truncate">Driver: {d.driver}</div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={d.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Concrete Grade:</span>
                      <span className="font-semibold text-amber-700">{d.grade}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Volume:</span>
                      <span className="font-bold text-slate-900 font-mono">{d.qty}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 uppercase block">Arrival Time:</span>
                      <span className="font-mono text-slate-700">{d.arrivalTime}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex justify-end">
                    {d.status === 'On Route' ? (
                      <button
                        type="button"
                        onClick={() => handleConfirmDelivery(d.dispatchId)}
                        className="w-full py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Reception & Sign Challan</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>e-Challan Signed Successfully</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            />
          </section>

          {/* Secondary Operational Section: Current Site Pouring Progress */}
          {currentSite ? (
            <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50/90 via-white to-amber-50/90 border border-orange-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-mono">
                      CURRENT POUR EXECUTION
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{currentSite.pourType}</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>{currentSite.name}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{currentSite.location}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPhotoModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:border-orange-400 text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-orange-600" />
                    <span>Upload Site Photo</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar & Meter */}
              <div className="space-y-2 mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-bold">Pour Volume Progress:</span>
                  <span className="font-mono font-bold text-orange-700">
                    {currentSite.deliveredQty} m³ / {currentSite.requiredQty} m³ ({currentSite.requiredQty > 0 ? Math.round((currentSite.deliveredQty / currentSite.requiredQty) * 100) : 0}%)
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${currentSite.requiredQty > 0 ? (currentSite.deliveredQty / currentSite.requiredQty) * 100 : 0}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Required:</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">{currentSite.requiredQty} m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block">Delivered:</span>
                    <span className="font-bold text-emerald-700 font-mono text-xs">{currentSite.deliveredQty} m³</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80">
                    <span className="text-[10px] text-amber-800 uppercase font-bold block">Balance:</span>
                    <span className="font-bold text-amber-700 font-mono text-xs">{currentSite.remainingQty} m³</span>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="p-6 sm:p-8 rounded-2xl bg-white/95 border border-slate-200/90 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">No Active Concrete Pouring Site</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No active project pour is currently allocated. Pouring progress and pump statistics will appear here when active deliveries are underway.
              </p>
            </section>
          )}

          {/* Quick Mobile Action Buttons Bar */}
          <section>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Site Supervisor Mobile Commands
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <QuickAction
                icon={CheckCircle2}
                title="Confirm Arrival"
                desc="Sign mixer arrival challan"
                color="amber"
                onClick={() => setShowConfirmModal(true)}
              />
              <QuickAction
                icon={AlertTriangle}
                title="Report Site Issue"
                desc="Pump stall, access blockage"
                color="rose"
                onClick={() => setShowIssueModal(true)}
              />
              <QuickAction
                icon={Activity}
                title="Update Pour"
                desc="Log pump bar pressure"
                color="emerald"
                onClick={() => setToastMessage('Pour pump telemetry recorded.')}
              />
              <QuickAction
                icon={Camera}
                title="Site Photo Log"
                desc="Attach slump cone snap"
                color="blue"
                onClick={() => setShowPhotoModal(true)}
              />
            </div>
          </section>

          {/* Pouring Telemetry & Site Issues Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
            {/* Concrete Pump Telemetry */}
            <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>Concrete Pump & Slump Telemetry</span>
                </h3>
                <span className="text-[9px] font-mono text-emerald-700 font-semibold px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">PUMP OPERATIONAL</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block">Pump Line Pressure:</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">{pouringStatus.pressure}</span>
                </div>
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block">Measured Slump:</span>
                  <span className="text-xs sm:text-sm font-bold text-amber-700 font-mono">{pouringStatus.slumpOnSite}</span>
                </div>
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block">Mix Temperature:</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">{pouringStatus.temperature}</span>
                </div>
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block">Pump Unit:</span>
                  <span className="text-xs font-semibold text-slate-800 truncate block">{pouringStatus.pumpStatus !== 'Standby' ? 'Schwing Stetter CP-60' : 'Standby / Not In Use'}</span>
                </div>
              </div>
            </div>

            {/* Site Issues / Incident Log */}
            <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Site Safety & Incident Log</span>
                </h3>
                <span className="text-[9px] font-mono text-amber-700 font-semibold px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200">{siteIssues.length} RECORDED</span>
              </div>

              <div className="space-y-2">
                {siteIssues.length > 0 ? (
                  siteIssues.map((iss) => (
                    <AlertCard
                      key={iss.id}
                      title={iss.title}
                      desc={iss.desc}
                      time={iss.time}
                      type="warning"
                      actionLabel="Details"
                      onAction={() => setToastMessage(`Inspecting ${iss.title}`)}
                    />
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium">
                    No safety or field incidents recorded today.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Inbound Concrete Delivery"
        subtitle="Sign electronic challan upon physical inspection."
        icon={CheckCircle2}
      >
        <div className="space-y-4 text-xs text-slate-300">
          <p className="text-slate-600">
            Verify that mixer drum agitation is intact, mix grade matches project requisition, and slump cone test is within tolerance.
          </p>
          {deliveries.length > 0 ? (
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 font-mono text-emerald-800">
              Pending Acceptance: Vehicle {deliveries[0].vehicle} (Driver {deliveries[0].driver})
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-600">
              No inbound concrete deliveries waiting for signoff.
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deliveries.length === 0}
              onClick={() => deliveries[0] && handleConfirmDelivery(deliveries[0].dispatchId)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 cursor-pointer transition-colors"
            >
              Confirm & Sign Challan
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title="Report Field Issue to Batching Plant"
        subtitle="Immediately alert plant manager and dispatcher."
        icon={AlertTriangle}
      >
        <form onSubmit={handleReportIssue} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Issue Description *
            </label>
            <textarea
              rows="3"
              required
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="e.g. Concrete pump hydraulic pressure dropped; request dispatch pause for 20 mins."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowIssueModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
            >
              Submit Issue
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        title="Upload Site Execution Photo"
        subtitle="Attach proof of slump test, reinforcement rebar, or pour finishing."
        icon={Camera}
      >
        <div className="space-y-4 text-xs text-slate-300 text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-dashed border-amber-300 flex items-center justify-center mx-auto text-amber-600">
            <Camera className="w-8 h-8" />
          </div>
          <p className="text-slate-400 max-w-xs mx-auto">
            Take live snapshot or choose image from mobile device storage.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowPhotoModal(false);
              setToastMessage('Site photo uploaded & attached to dispatch record!');
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 inline-block"
          >
            Upload Photo
          </button>
        </div>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </AppLayout>
  );
}
