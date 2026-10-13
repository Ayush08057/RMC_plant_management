import React, { useState } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import StatusBadge from '../../components/dashboard/StatusBadge';
import Modal from '../../components/dashboard/Modal';
import Toast from '../../components/dashboard/Toast';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  RotateCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  PhoneCall, 
  Compass, 
  Layers, 
  ArrowRight, 
  ShieldAlert,
  User,
  Building2,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { MOCK_DRIVER_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';
import { formatToIndian12Hr } from '../../utils/shiftUtils';
import { useAuth } from '../../context/AuthContext';

// Workforce Views
import MobilePunchWidget from '../../components/workforce/MobilePunchWidget';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import ShiftManagementView from '../../components/workforce/ShiftManagementView';
import DailyWorkView from '../../components/workforce/DailyWorkView';
import LeaveManagementView from '../../components/workforce/LeaveManagementView';
import AdvanceManagementView from '../../components/workforce/AdvanceManagementView';
import EmployeeDocumentsView from '../../components/workforce/EmployeeDocumentsView';

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const currentDriverId = user?.employeeId || user?.id || 'DRV001';
  const currentDriverName = user?.name || 'Driver';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [problemReason, setProblemReason] = useState('');

  const { getDriverTrips, updateTripMilestone, notifications, attendance } = useWorkforce();

  // Task-level filtered trips for authenticated driver
  const myAssignedTrips = getDriverTrips ? getDriverTrips(currentDriverId) : [];
  const activeTrip = myAssignedTrips.find((t) => t.status !== 'Delivered') || MOCK_DRIVER_DATA.currentTrip;
  const completedTrips = myAssignedTrips.filter((t) => t.status === 'Delivered');

  // Personal attendance history records strictly for logged in driver
  const myAttendanceRecords = (attendance || []).filter(
    (a) => a.employeeId === currentDriverId || a.employeeId === user?.id || a.employeeId === user?.employeeId
  );

  // Milestone Steps
  const steps = [
    { step: 1, label: 'ASSIGNED', short: 'ASG', desc: 'Gate Order Received' },
    { step: 2, label: 'LOADING', short: 'LOAD', desc: 'At Batching Chute' },
    { step: 3, label: 'DISPATCHED', short: 'DSP', desc: 'Gate Pass Signed' },
    { step: 4, label: 'ON ROUTE', short: 'ROUTE', desc: 'In Highway Transit' },
    { step: 5, label: 'ARRIVED', short: 'ARR', desc: 'At Pouring Site' },
    { step: 6, label: 'UNLOADING', short: 'UNLD', desc: 'Hooked to Pump' },
    { step: 7, label: 'DELIVERED', short: 'DONE', desc: 'Challan Signed' },
  ];

  const currentStep = activeTrip?.currentStep || 4;

  const handleNextStep = () => {
    if (!activeTrip) return;
    if (currentStep < 7) {
      const next = currentStep + 1;
      if (updateTripMilestone && activeTrip.id) {
        updateTripMilestone(activeTrip.id, next);
      }
      setToastMessage(`Milestone updated to: ${steps[next - 1].label}`);
    } else {
      if (updateTripMilestone && activeTrip.id) {
        updateTripMilestone(activeTrip.id, 7);
      }
      setToastMessage('Delivery trip is fully completed! Return to plant.');
    }
  };

  const handleReportProblem = (e) => {
    e.preventDefault();
    if (!problemReason) return;
    setToastMessage(`Alert broadcasted: "${problemReason}". Dispatcher notified!`);
    setShowProblemModal(false);
    setProblemReason('');
  };

  return (
    <AppLayout
      title="Driver Personal Portal"
      subtitle={`Dedicated transit mixer console for ${currentDriverName} (${currentDriverId}). Shows assigned trips and delivery milestones.`}
      badge={`DRIVER ID: ${currentDriverId}`}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setToastMessage('Connecting to Plant Dispatcher Hotline...')}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 text-white" />
            <span className="hidden xs:inline">Call Dispatch</span>
          </button>
        </div>
      }
    >
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <MobilePunchWidget 
            lockedEmployeeId={currentDriverId} 
            roleLocked={true} 
            onPunched={() => setToastMessage('Driver attendance verified and synced!')} 
          />

          {/* Personal Punch Log History */}
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    My Attendance & Punch-In History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Showing verified duty logs strictly for {currentDriverName} ({currentDriverId})
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                AUTHENTICATED DRIVER ONLY
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Punch In</th>
                    <th className="py-2.5 px-3">Punch Out</th>
                    <th className="py-2.5 px-3">Total Hours</th>
                    <th className="py-2.5 px-3">Face Recognition Photo</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {myAttendanceRecords.length > 0 ? (
                    myAttendanceRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono text-slate-900 font-bold">{rec.date}</td>
                        <td className="py-3 px-3 font-mono text-emerald-700 font-bold">{formatToIndian12Hr(rec.punchIn) || '--:--'}</td>
                        <td className="py-3 px-3 font-mono text-rose-700 font-bold">{formatToIndian12Hr(rec.punchOut) || '--:--'}</td>
                        <td className="py-3 px-3 font-mono text-slate-700">{rec.workingHours ? `${rec.workingHours}h` : '--'}</td>
                        <td className="py-3 px-3">
                          {rec.selfieUrl ? (
                            <div className="flex items-center gap-2">
                              <img src={rec.selfieUrl} alt="Face" className="w-7 h-7 rounded-lg object-cover border border-emerald-300" />
                              <span className="text-[11px] font-semibold text-emerald-700">Verified</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">--</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={rec.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                        No previous attendance records logged yet for {currentDriverName}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'shifts' && <ShiftManagementView employeeFilter={currentDriverId} isEmployeeView={true} />}
      {activeTab === 'daily-work' && <DailyWorkView employeeFilter={currentDriverId} />}
      {activeTab === 'leaves' && <LeaveManagementView employeeFilter={currentDriverId} />}
      {activeTab === 'advances' && <AdvanceManagementView employeeFilter={currentDriverId} />}
      {activeTab === 'documents' && <EmployeeDocumentsView employeeFilter={currentDriverId} />}

      {/* Profile / Details Tab */}
      {activeTab === 'profile' && (
        <section className="p-5 sm:p-7 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {currentDriverName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{currentDriverName}</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 font-mono">
                {currentDriverId} • Transit Mixer Driver
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Email Address</span>
              <span className="font-semibold text-slate-800">{user?.email || 'driver@smconcretech.com'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Assigned Mixer Unit</span>
              <span className="font-mono font-bold text-amber-700">{activeTrip?.vehicleNo || 'Not Assigned'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Plant Base</span>
              <span className="font-semibold text-slate-800">{user?.plantLocation || 'Main Plant Unit #01'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Account Clearance</span>
              <span className="font-semibold text-emerald-600 font-mono">ACTIVE (DRIVER PORTAL)</span>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Mobile Attendance Punch Terminal */}
          <section>
            <MobilePunchWidget 
              lockedEmployeeId={currentDriverId} 
              roleLocked={true} 
              onPunched={() => setToastMessage('Attendance verified and synced!')} 
            />
          </section>

          {/* DRIVER PRIORITY SECTION 1: ACTIVE ASSIGNED TRIP */}
          {activeTrip ? (
            <section className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-md border border-amber-300 shadow-xl space-y-5 w-full max-w-full overflow-hidden">
              {/* Top Badges & Delivery ID */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white font-mono tracking-wider">
                      MY ASSIGNED TRIP
                    </span>
                    <span className="text-xs text-amber-700 font-mono font-bold">
                      {activeTrip.dispatchId || activeTrip.id}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {activeTrip.customer}
                  </h2>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 font-mono">
                    Vehicle: {activeTrip.vehicleNo}
                  </span>
                </div>
              </div>

              {/* Destination Site Block */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold block">Destination Site:</span>
                    <div className="text-base sm:text-lg font-bold text-slate-900">{activeTrip.site}</div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{activeTrip.siteAddress}</p>
                  </div>
                </div>
              </div>

              {/* Concrete Load Vital Signs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Mix Grade</span>
                  <span className="text-base sm:text-lg font-black text-amber-700 font-mono block mt-0.5">
                    {activeTrip.concreteGrade}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Load Volume</span>
                  <span className="text-base sm:text-lg font-black text-slate-800 font-mono block mt-0.5">
                    {activeTrip.quantity}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Target ETA</span>
                  <span className="text-base sm:text-lg font-black text-emerald-600 font-mono block mt-0.5">
                    {activeTrip.expectedDeliveryTime}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Drum Agitation</span>
                  <span className="text-base sm:text-lg font-black text-cyan-700 font-mono block mt-0.5">
                    3.5 RPM (OK)
                  </span>
                </div>
              </div>

              {/* 7-Step Delivery Progress Track */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Journey Milestone</span>
                  <span className="font-mono text-amber-700 font-bold text-xs">
                    {currentStep}/7: {steps[currentStep - 1]?.label}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {steps.map((st) => (
                    <div key={st.step} className="space-y-1 text-center min-w-0">
                      <div
                        className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                          st.step < currentStep
                            ? 'bg-emerald-500'
                            : st.step === currentStep
                              ? 'bg-amber-500 shadow-md shadow-amber-500/50'
                              : 'bg-slate-200'
                        }`}
                      />
                      <span className={`text-[8px] sm:text-[10px] font-mono block truncate ${
                        st.step === currentStep ? 'text-amber-700 font-bold' : 'text-slate-400'
                      }`}>
                        <span className="hidden sm:inline">{st.label}</span>
                        <span className="inline sm:hidden">{st.short}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Action Buttons */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                {currentStep < 7 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span className="truncate">
                      {currentStep === 1 
                        ? 'START TRIP (LEAVE PLANT)' 
                        : currentStep === 4 
                          ? 'ARRIVED AT POURING SITE' 
                          : currentStep === 5 
                            ? 'START UNLOADING / HOOK PUMP' 
                            : currentStep === 6 
                              ? 'COMPLETE DELIVERY & SIGN CHALLAN' 
                              : `ADVANCE: ${steps[currentStep]?.label}`}
                    </span>
                    <ArrowRight className="w-5 h-5 shrink-0" />
                  </button>
                ) : (
                  <div className="w-full py-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-center flex items-center justify-center gap-2 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>TRIP COMPLETED • RETURN TO PLANT FACILITY</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setToastMessage(`Navigation launched to: ${activeTrip.site}`)}
                    className="py-3 px-4 rounded-xl font-bold text-xs bg-cyan-700 hover:bg-cyan-800 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <Compass className="w-4 h-4 shrink-0" />
                    <span>OPEN GPS ROUTE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowProblemModal(true)}
                    className="py-3 px-4 rounded-xl font-bold text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>REPORT DELAY / ISSUE</span>
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="p-8 sm:p-12 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                No Active Delivery Trips Assigned
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Driver <span className="font-mono font-bold text-amber-700">{currentDriverId}</span> is currently on standby. Trips assigned to your employee ID by plant dispatchers will appear here.
              </p>
            </section>
          )}

          {/* DRIVER SECTION 2: Mixer Drum Telemetry */}
          <section className="p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-cyan-600" />
                <span>Transit Mixer Drum Status</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">
                {activeTrip ? 'AGITATION SAFE' : 'STANDBY'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Drum Speed Sensor:</span>
                <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
                  {activeTrip ? '3.5 RPM (Agitation Mode)' : '0.0 RPM (Stationary)'}
                </span>
                <span className="text-[10px] text-emerald-600">Prevents concrete flash setting</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Batch Freshness Timer:</span>
                <span className="text-base font-bold text-amber-700 font-mono mt-0.5 block">
                  {activeTrip ? 'Active Pour Window' : 'No Active Batch'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeTrip ? '90-minute maximum limit' : 'Ready for batch allocation'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">On-Site Water Added:</span>
                <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">0.0 Litres (Zero)</span>
                <span className="text-[10px] text-slate-500">Preserves mix strength</span>
              </div>
            </div>
          </section>

          {/* DRIVER SECTION 3: Completed Trips */}
          <section className="p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>My Completed Trips Today ({completedTrips.length} Delivered)</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">{completedTrips.length} SHIPPED</span>
            </div>

            <div className="space-y-2">
              {completedTrips.length > 0 ? (
                completedTrips.map((tr) => (
                  <div key={tr.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 font-mono">{tr.dispatchId || tr.id} • {tr.site}</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">Delivered to {tr.customer}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 font-mono text-sm">{tr.quantity}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-mono">
                  No completed delivery trips logged for today yet
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Problem Report Modal */}
      <Modal
        isOpen={showProblemModal}
        onClose={() => setShowProblemModal(false)}
        title="Report Transit Delay / Problem"
        subtitle="Broadcast alert directly to plant dispatch hotline."
        icon={AlertTriangle}
      >
        <form onSubmit={handleReportProblem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Problem Category *
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['Traffic Jam (>30m)', 'Flat Tyre / Breakdown', 'Site Access Blocked', 'Pump Broken at Site'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setProblemReason(cat)}
                  className={`p-2.5 rounded-xl border text-left font-medium transition-colors cursor-pointer ${
                    problemReason === cat
                      ? 'bg-rose-50 border-rose-400 text-rose-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowProblemModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!problemReason}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
            >
              Send Alert to Dispatch
            </button>
          </div>
        </form>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </AppLayout>
  );
}
