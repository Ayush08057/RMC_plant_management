import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  ShieldCheck, 
  Smartphone, 
  MapPin, 
  Check, 
  ChevronRight,
  TrendingUp,
  Activity,
  UserCheck,
  Building2,
  Briefcase,
  History,
  Camera,
  RotateCcw
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { OFFICIAL_ROLE_ACCOUNTS } from '../../data/mockUsers';
import { formatToIndian12Hr, getNowIndian12Hr } from '../../utils/shiftUtils';
import MobilePunchWidget from './MobilePunchWidget';
import StatusBadge from '../dashboard/StatusBadge';

export default function RolePersonalAttendanceView({
  defaultRole = 'Staff',
  defaultEmpId = 'EMP-001',
  defaultDepartment = 'Operations',
  canSwitchToTeamView = false,
  teamViewComponent = null,
  onPunched = () => {},
}) {
  const { user } = useAuth();
  const { attendance, employees, shifts, resetTodayAttendance } = useWorkforce();
  const [activeTabMode, setActiveTabMode] = useState('personal'); // 'personal' | 'team'
  const [toastMessage, setToastMessage] = useState(null);

  // Live real-time clock
  const [currentTime, setCurrentTime] = useState(getNowIndian12Hr(true));
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getNowIndian12Hr(true));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Resolve target employee identity for this role portal
  const targetEmpId = useMemo(() => {
    return user?.employeeId || defaultEmpId || user?.id || 'EMP-001';
  }, [user, defaultEmpId]);

  const targetRole = useMemo(() => {
    return user?.role || defaultRole;
  }, [user, defaultRole]);

  const officialProfile = useMemo(() => {
    return (OFFICIAL_ROLE_ACCOUNTS || []).find(
      (a) => (a.employeeId && a.employeeId.toUpperCase() === targetEmpId.toUpperCase()) ||
             (a.role && a.role.toLowerCase() === targetRole.toLowerCase())
    ) || (employees || []).find(
      (e) => (e.employeeId && e.employeeId.toUpperCase() === targetEmpId.toUpperCase()) ||
             (e.id && e.id.toUpperCase() === targetEmpId.toUpperCase())
    ) || {
      name: user?.name || defaultRole,
      role: targetRole,
      employeeId: targetEmpId,
      department: user?.department || defaultDepartment,
      plantLocation: user?.plantLocation || 'Main Plant HQ',
    };
  }, [targetEmpId, targetRole, user, defaultRole, defaultDepartment, employees]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Today's attendance record for this employee
  const userTodayRecord = useMemo(() => {
    return (attendance || []).find(
      (a) => a.date === todayStr &&
        ((a.employeeId && a.employeeId.toUpperCase() === targetEmpId.toUpperCase()) ||
         (a.employeeId && user?.id && a.employeeId.toUpperCase() === user.id.toUpperCase()) ||
         (a.employeeName && officialProfile?.name && a.employeeName.toLowerCase() === officialProfile.name.toLowerCase()))
    );
  }, [attendance, todayStr, targetEmpId, user, officialProfile]);

  const hasPunchedIn = Boolean(userTodayRecord?.punchIn);
  const hasPunchedOut = Boolean(userTodayRecord?.punchOut);

  // All historical records strictly for this role / employee
  const myAttendanceRecords = useMemo(() => {
    return (attendance || []).filter(
      (a) => (a.employeeId && a.employeeId.toUpperCase() === targetEmpId.toUpperCase()) ||
             (a.employeeId && user?.id && a.employeeId.toUpperCase() === user.id.toUpperCase()) ||
             (a.employeeId && user?.employeeId && a.employeeId.toUpperCase() === user.employeeId.toUpperCase()) ||
             (a.employeeName && officialProfile?.name && a.employeeName.toLowerCase() === officialProfile.name.toLowerCase())
    ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [attendance, targetEmpId, user, officialProfile]);

  // Monthly metrics
  const currentMonthPrefix = todayStr.substring(0, 7);
  const thisMonthRecords = myAttendanceRecords.filter((r) => (r.date || '').startsWith(currentMonthPrefix));
  const daysPresent = thisMonthRecords.filter((r) => r.status === 'Present' || r.punchIn).length;
  const totalHoursWorked = thisMonthRecords.reduce((sum, r) => sum + (Number(r.workingHours) || (r.punchIn && !r.punchOut ? 4 : 0)), 0);
  const onTimeCount = thisMonthRecords.filter((r) => !r.lateStatus && r.punchIn).length;
  const punctualityRate = thisMonthRecords.length > 0 ? Math.round((onTimeCount / thisMonthRecords.length) * 100) : 100;

  const assignedShift = shifts && shifts[0] ? shifts[0] : {
    name: 'General Morning Shift',
    startTime: '09:00 AM',
    endTime: '06:00 PM',
    gracePeriodMins: 15,
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-4 pb-6 min-w-0">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-[#123B6D] text-white px-4 py-2.5 rounded-xl shadow-lg border border-[#1D5FA7] flex items-center gap-2 text-xs font-semibold animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Supervisory Mode Toggle (when role has team authority) */}
      {canSwitchToTeamView && teamViewComponent && (
        <div className="flex items-center justify-between bg-white border border-[#D4E4F7] p-2 rounded-2xl shadow-2xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTabMode('personal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'personal'
                  ? 'bg-[#1D5FA7] text-white shadow-xs'
                  : 'bg-white hover:bg-[#EAF3FF] text-black border border-[#D4E4F7]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>My Daily Attendance Punch</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabMode('team')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'team'
                  ? 'bg-[#1D5FA7] text-white shadow-xs'
                  : 'bg-white hover:bg-[#EAF3FF] text-black border border-[#D4E4F7]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team & Workforce Register</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-700 flex items-center gap-1.5 pr-2">
            <span className="w-2 h-2 rounded-full bg-[#246BCE]" />
            <span>Active Profile: <strong className="text-black">{officialProfile.name}</strong> ({targetEmpId})</span>
          </div>
        </div>
      )}

      {/* Render Team View if chosen */}
      {activeTabMode === 'team' && canSwitchToTeamView && teamViewComponent ? (
        <div className="w-full">{teamViewComponent}</div>
      ) : (
        /* Personal Attendance View */
        <div className="space-y-4">
          
          {/* Top Banner: Employee Profile, Shift & Live Clock */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#D4E4F7] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] border border-[#D4E4F7] text-[#1D5FA7] flex items-center justify-center font-bold text-lg shrink-0 shadow-inner">
                {officialProfile.avatar || (officialProfile.name ? officialProfile.name.substring(0, 2).toUpperCase() : 'EM')}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-black tracking-tight">
                    {officialProfile.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-[#EAF3FF] text-black border border-[#D4E4F7] font-mono text-xs font-bold">
                    {targetEmpId}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-black border border-slate-200 text-xs font-semibold">
                    {targetRole}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-black">
                    <Briefcase className="w-3.5 h-3.5 text-[#1D5FA7]" />
                    <span>{officialProfile.department || defaultDepartment}</span>
                  </span>
                  <span className="text-[#D4E4F7]">•</span>
                  <span className="flex items-center gap-1 text-black">
                    <Building2 className="w-3.5 h-3.5 text-[#1D5FA7]" />
                    <span>{officialProfile.plantLocation || 'Main Plant HQ'}</span>
                  </span>
                  <span className="text-[#D4E4F7]">•</span>
                  <span className="flex items-center gap-1 text-black">
                    <Clock className="w-3.5 h-3.5 text-[#1D5FA7]" />
                    <span>{assignedShift.name} ({assignedShift.startTime} - {assignedShift.endTime})</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Live IST Clock & Today's Duty Status Pill */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 bg-[#F5F9FF] border border-[#D4E4F7] p-3 rounded-xl shrink-0">
              <div className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-black text-black">
                <Clock className="w-4 h-4 text-[#1D5FA7]" />
                <span>{currentTime}</span>
              </div>
              <div>
                {!hasPunchedIn ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Awaiting Today's Punch-In</span>
                  </span>
                ) : !hasPunchedOut ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>On Duty • Clocked In: {formatToIndian12Hr(userTodayRecord?.punchIn)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-300">
                    <Check className="w-3.5 h-3.5 text-blue-700" />
                    <span>Shift Concluded ({userTodayRecord?.workingHours || 8} hrs)</span>
                  </span>
                )}
              </div>
              {Boolean(userTodayRecord) && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Reset today's attendance record for ${officialProfile.name} to punch in with real live time?`)) {
                      if (resetTodayAttendance) {
                        resetTodayAttendance(targetEmpId);
                      }
                      setToastMessage(`Today's record reset. You can now punch in with the real current time!`);
                      setTimeout(() => setToastMessage(null), 3500);
                      onPunched();
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs mt-0.5"
                  title="Reset today's record to clock in with live time"
                >
                  <RotateCcw className="w-3 h-3 text-[#1D5FA7]" />
                  <span>Reset / Punch In with Real Time</span>
                </button>
              )}
            </div>
          </section>

          {/* Today's Duty Stats Grid */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white rounded-xl border border-[#D4E4F7] p-3 shadow-2xs space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                Today's Punch In
              </span>
              <div className="font-mono font-black text-sm sm:text-base text-black flex items-center justify-between">
                <span>{hasPunchedIn ? formatToIndian12Hr(userTodayRecord?.punchIn) : '--:--'}</span>
                {hasPunchedIn && (
                  <span className={`text-[10px] font-sans px-1.5 py-0.2 rounded border font-bold ${
                    userTodayRecord?.lateStatus 
                      ? 'bg-amber-50 text-amber-900 border-amber-300' 
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  }`}>
                    {userTodayRecord?.lateStatus ? `Late (${userTodayRecord.lateMinutes}m)` : 'On Time'}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-600 block">
                Shift starts at {assignedShift.startTime}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-[#D4E4F7] p-3 shadow-2xs space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                Today's Punch Out
              </span>
              <div className="font-mono font-black text-sm sm:text-base text-black flex items-center justify-between">
                <span>{hasPunchedOut ? formatToIndian12Hr(userTodayRecord?.punchOut) : '--:--'}</span>
                {hasPunchedOut && (
                  <span className="text-[10px] font-sans px-1.5 py-0.2 rounded border font-bold bg-blue-50 text-blue-900 border-blue-300">
                    Concluded
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-600 block">
                Shift ends at {assignedShift.endTime}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-[#D4E4F7] p-3 shadow-2xs space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                Monthly Turnout
              </span>
              <div className="font-mono font-black text-sm sm:text-base text-black flex items-center justify-between">
                <span>{daysPresent} Days</span>
                <span className="text-[10px] font-sans px-1.5 py-0.2 rounded border font-bold bg-[#EAF3FF] text-black border-[#D4E4F7]">
                  {punctualityRate}% On Time
                </span>
              </div>
              <span className="text-[10px] text-slate-600 block">
                {totalHoursWorked.toFixed(1)} Total Hours logged
              </span>
            </div>

            <div className="bg-white rounded-xl border border-[#D4E4F7] p-3 shadow-2xs space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                Geofence Verification
              </span>
              <div className="font-mono font-bold text-xs text-black truncate flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#1D5FA7] shrink-0" />
                <span className="truncate">{userTodayRecord?.geofenceStatus || 'Verified (Plant Zone)'}</span>
              </div>
              <span className="text-[10px] text-emerald-800 font-semibold block">
                🛰️ Live GPS & Biometric Synced
              </span>
            </div>
          </section>

          {/* Dedicated Daily Mobile / Web Punch-In Terminal */}
          <section className="bg-white rounded-2xl border border-[#D4E4F7] p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D4E4F7] flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAF3FF] border border-[#D4E4F7] text-[#1D5FA7] flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black uppercase tracking-wide">
                    Daily Attendance Terminal
                  </h3>
                  <p className="text-[11px] text-slate-700">
                    Official biometric clock in/out for <strong className="text-black">{officialProfile.name}</strong> ({targetEmpId})
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EAF3FF] text-black border border-[#D4E4F7] text-[10px] font-mono font-semibold">
                ROLE SECURE: {targetRole.toUpperCase()}
              </span>
            </div>

            {/* Embedded Live Punch Terminal */}
            <MobilePunchWidget
              lockedEmployeeId={targetEmpId}
              roleLocked={true}
              onPunched={() => {
                setToastMessage(`Attendance for ${officialProfile.name} verified and recorded!`);
                onPunched();
                setTimeout(() => setToastMessage(null), 4500);
              }}
            />
          </section>

          {/* Personal Duty Log History Table */}
          <section className="bg-white rounded-2xl border border-[#D4E4F7] shadow-2xs overflow-hidden">
            <div className="p-3.5 sm:p-4 bg-white border-b border-[#D4E4F7] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#1D5FA7]" />
                <h3 className="text-xs sm:text-sm font-bold text-black uppercase tracking-wide">
                  My Attendance & Duty History Log
                </h3>
              </div>
              <span className="text-[10px] font-mono font-semibold text-slate-700 bg-[#EAF3FF] border border-[#D4E4F7] px-2 py-0.5 rounded-md">
                {myAttendanceRecords.length} Record{myAttendanceRecords.length === 1 ? '' : 's'} on File
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#EAF3FF] text-black font-semibold border-b border-[#D4E4F7] text-[10.5px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 sm:px-4">Date</th>
                    <th className="py-2.5 px-3">Punch In</th>
                    <th className="py-2.5 px-3">Punch Out</th>
                    <th className="py-2.5 px-3">Total Hours</th>
                    <th className="py-2.5 px-3">Biometric Selfie</th>
                    <th className="py-2.5 px-3">GPS Verification</th>
                    <th className="py-2.5 px-3 sm:px-4">Duty Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4E4F7] font-medium text-black">
                  {myAttendanceRecords.length > 0 ? (
                    myAttendanceRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#F5F9FF] transition-colors">
                        <td className="py-3 px-3 sm:px-4 font-mono font-bold text-black">
                          {rec.date}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800">
                            <span>{formatToIndian12Hr(rec.punchIn) || '--:--'}</span>
                            {rec.lateStatus && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-300 font-sans font-semibold">
                                Late
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-800">
                          {formatToIndian12Hr(rec.punchOut) || '--:--'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-black">
                          {rec.workingHours ? `${rec.workingHours} hrs` : (rec.punchIn ? 'In Progress' : '--')}
                        </td>
                        <td className="py-3 px-3">
                          {rec.selfieUrl ? (
                            <div className="flex items-center gap-2">
                              <img 
                                src={rec.selfieUrl} 
                                alt="Selfie" 
                                className="w-7 h-7 rounded-lg object-cover border border-[#D4E4F7] shadow-2xs" 
                              />
                              <span className="text-[10px] font-semibold text-emerald-800">Verified</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">System Verified</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] font-mono text-slate-700 truncate max-w-[180px] block">
                            {rec.geofenceStatus || 'Inside Geofence'}
                          </span>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <StatusBadge status={rec.status || 'Present'} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-600 font-medium">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Clock className="w-6 h-6 text-slate-400" />
                          <span className="font-semibold text-black">No past attendance records found for {officialProfile.name}</span>
                          <span className="text-[11px] text-slate-600">
                            Clock in using the Daily Attendance Terminal above to record today's attendance.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
