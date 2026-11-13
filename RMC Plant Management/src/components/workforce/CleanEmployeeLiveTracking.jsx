import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Clock, 
  Calendar, 
  User, 
  ExternalLink, 
  Crosshair, 
  Search, 
  AlertCircle,
  GitCommit,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  Radio
} from 'lucide-react';
import { useWorkforce, resolveCanonicalEmployeeId, attendanceMatchesEmployee } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { getLocalIstDateStr } from '../../utils/shiftUtils';
import { isAdminPerson, OFFICIAL_ROLE_ACCOUNTS, isDummyEmployee } from '../../data/mockUsers';
import { getEmployeeRouteDetails } from '../../services/routeTrackingService';
import LiveInteractiveMap from './LiveInteractiveMap';

/**
 * Safely extracts cached workforce records from localStorage to ensure zero missing staff
 */
function getCachedStaffFallback() {
  if (typeof window === 'undefined') return [];
  const list = [];
  try {
    const rawUsers = localStorage.getItem('rmc_users_db_v2');
    if (rawUsers) {
      const parsed = JSON.parse(rawUsers);
      if (Array.isArray(parsed)) list.push(...parsed);
    }
  } catch {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rmc_workforce_state_')) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed?.employees)) list.push(...parsed.employees);
        }
      }
    }
  } catch {}
  return list.filter((p) => !isDummyEmployee(p) && !isAdminPerson(p));
}

export default function CleanEmployeeLiveTracking() {
  const { user, allUsers } = useAuth();
  const { attendance, employees, trips, activeCompanyId } = useWorkforce();

  // 1. Date Filter (Defaults to today YYYY-MM-DD in IST)
  const [selectedDate, setSelectedDate] = useState(() => getLocalIstDateStr());

  // 2. Searchable Employee Dropdown State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // 3. Map View Options
  const [mapSatellite, setMapSatellite] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);

  // Build authorized workforce list with live duty status & smart sorting
  const staffList = useMemo(() => {
    const map = new Map();

    const addPerson = (person) => {
      if (!person || isAdminPerson(person) || isDummyEmployee(person)) return;
      const rawId = (person.employeeId || person.id || '').toString().trim().toUpperCase();
      if (!rawId) return;
      const canonicalKey = resolveCanonicalEmployeeId(rawId);
      if (!canonicalKey) return;

      const existing = map.get(canonicalKey);
      if (!existing) {
        map.set(canonicalKey, {
          id: canonicalKey,
          employeeId: canonicalKey,
          name: person.name || person.employeeName || person.displayName || 'Staff Member',
          role: person.role || person.designation || 'Staff',
          department: person.department || 'Operations',
          phone: person.phone || person.registeredMobile || ''
        });
      } else {
        if ((!existing.name || existing.name === 'Staff Member') && (person.name || person.employeeName)) {
          existing.name = person.name || person.employeeName;
        }
        if ((!existing.role || existing.role === 'Staff') && person.role) {
          existing.role = person.role;
        }
      }
    };

    // 1. Employees from Workforce Context
    (employees || []).forEach(addPerson);
    // 2. All Users from Auth Context
    (allUsers || []).forEach(addPerson);
    // 3. Current User if operational
    if (user) addPerson(user);
    // 4. Any personnel from attendance records
    (attendance || []).forEach((att) => {
      if (att && (att.employeeId || att.id)) {
        addPerson({
          employeeId: att.employeeId || att.id,
          name: att.employeeName || att.name,
          role: att.role,
          department: att.department
        });
      }
    });
    // 5. Any drivers from active/completed trips
    (trips || []).forEach((tr) => {
      if (tr && tr.driverId) {
        addPerson({
          employeeId: tr.driverId,
          name: tr.driverName || 'Driver',
          role: 'Driver',
          department: 'Fleet Operations'
        });
      }
    });
    // 6. LocalStorage fallback caches
    getCachedStaffFallback().forEach(addPerson);
    // 7. Official Role Accounts fallback
    (OFFICIAL_ROLE_ACCOUNTS || []).forEach(addPerson);

    // Compute real-time duty status for selectedDate
    const compactDate = selectedDate.replace(/-/g, '');
    const staffArray = Array.from(map.values()).map((emp) => {
      const cleanId = resolveCanonicalEmployeeId(emp.employeeId);
      const cleanName = (emp.name || '').toLowerCase().trim();

      const record = (attendance || []).find((a) => {
        const aDate = a.date || (a.createdAt ? getLocalIstDateStr(a.createdAt) : '');
        const aName = (a.employeeName || '').toString().trim().toLowerCase();
        const isDateMatch = aDate === selectedDate || (a.id && a.id.startsWith(`ATT-${compactDate}-`));
        if (!isDateMatch) return false;
        if (attendanceMatchesEmployee(a, cleanId)) return true;
        return Boolean(!a.employeeId && aName && cleanName && aName === cleanName);
      });

      const hasGps = Boolean(record?.lastKnownLocation?.lat || record?.gpsLocation?.lat);
      const isPunchIn = Boolean(record?.punchIn);
      const isPunchOut = Boolean(record?.punchOut);

      let statusPriority = 4;
      let statusText = 'Offline';
      let statusEmoji = '⚪';
      let isLiveOnDuty = false;

      if (isPunchIn && !isPunchOut) {
        isLiveOnDuty = true;
        if (hasGps) {
          statusPriority = 1;
          statusText = 'On Duty • Live GPS';
          statusEmoji = '🟢';
        } else {
          statusPriority = 2;
          statusText = 'On Duty • Clocked In';
          statusEmoji = '🟢';
        }
      } else if (isPunchIn && isPunchOut) {
        statusPriority = 3;
        statusText = 'Shift Concluded';
        statusEmoji = '🏁';
      }

      return {
        ...emp,
        statusPriority,
        statusText,
        statusEmoji,
        isLiveOnDuty,
        hasAttendanceToday: Boolean(record),
        recordToday: record || null
      };
    });

    // Prioritized Sort:
    // 1. Live GPS tracking
    // 2. Clocked In
    // 3. Shift Concluded
    // 4. Offline (alphabetical by name)
    staffArray.sort((a, b) => {
      if (a.statusPriority !== b.statusPriority) {
        return a.statusPriority - b.statusPriority;
      }
      return a.name.localeCompare(b.name);
    });

    return staffArray;
  }, [employees, allUsers, user, attendance, trips, selectedDate, activeCompanyId]);

  // 4. Filtered dropdown list based on search
  const filteredStaffList = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLowerCase().trim();
    return staffList.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        (e.department && e.department.toLowerCase().includes(q)) ||
        (e.statusText && e.statusText.toLowerCase().includes(q))
    );
  }, [staffList, searchQuery]);

  // 5. Effective Selected Employee ID (strictly prevents blank select box in all conditions)
  const effectiveSelectedEmpId = useMemo(() => {
    const list = filteredStaffList.length > 0 ? filteredStaffList : staffList;
    if (selectedEmpId && list.some((e) => e.employeeId === selectedEmpId || e.id === selectedEmpId)) {
      return selectedEmpId;
    }
    // If none explicitly selected or filtered out, pick first live on-duty staff, else the first staff member in list
    const liveEmp = list.find((e) => e.isLiveOnDuty);
    if (liveEmp) return liveEmp.employeeId;
    return list[0]?.employeeId || '';
  }, [selectedEmpId, filteredStaffList, staffList]);

  // Auto-sync selectedEmpId once effectiveSelectedEmpId is resolved
  useEffect(() => {
    if (effectiveSelectedEmpId && selectedEmpId !== effectiveSelectedEmpId) {
      setSelectedEmpId(effectiveSelectedEmpId);
    }
  }, [selectedEmpId, effectiveSelectedEmpId]);

  // Active selected employee object
  const activeEmployee = useMemo(() => {
    const targetId = effectiveSelectedEmpId;
    return staffList.find((e) => e.employeeId === targetId || e.id === targetId) || staffList[0] || null;
  }, [staffList, effectiveSelectedEmpId]);

  // Attendance record for active employee on the selected date (strict ID matching, zero substring collision)
  const dayRecord = useMemo(() => {
    if (!activeEmployee) return null;
    if (activeEmployee.recordToday) return activeEmployee.recordToday;

    const cleanId = resolveCanonicalEmployeeId(activeEmployee.employeeId || activeEmployee.id || '');
    const cleanName = (activeEmployee.name || '').toLowerCase().trim();
    const compactDate = selectedDate.replace(/-/g, '');

    return (attendance || []).find((a) => {
      const aDate = a.date || (a.createdAt ? getLocalIstDateStr(a.createdAt) : '');
      const aName = (a.employeeName || '').toString().trim().toLowerCase();
      const isDateMatch = aDate === selectedDate ||
        (a.id && a.id.startsWith(`ATT-${compactDate}-`));
      if (!isDateMatch) return false;
      if (attendanceMatchesEmployee(a, cleanId)) return true;
      return Boolean(!a.employeeId && aName && cleanName && aName === cleanName);
    }) || null;
  }, [attendance, activeEmployee, selectedDate]);

  // Tracking status evaluation
  const trackingStatus = useMemo(() => {
    if (!dayRecord || !dayRecord.punchIn) {
      return { label: 'Not Started', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (dayRecord.punchOut) {
      return { label: 'Completed', color: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
    if (dayRecord.lastKnownLocation?.lat || dayRecord.gpsLocation?.lat) {
      return { label: 'Tracking', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    return { label: 'Location Unavailable', color: 'bg-rose-50 text-rose-800 border-rose-200' };
  }, [dayRecord]);

  // Construct target object with real location telemetry for map
  const isPunchedOut = Boolean(dayRecord?.punchOut);

  const mapTarget = useMemo(() => {
    if (!activeEmployee) return null;

    const lat = dayRecord?.lastKnownLocation?.lat 
      ? Number(dayRecord.lastKnownLocation.lat) 
      : (dayRecord?.gpsLocation?.lat ? Number(dayRecord.gpsLocation.lat) : null);

    const lng = dayRecord?.lastKnownLocation?.lng 
      ? Number(dayRecord.lastKnownLocation.lng) 
      : (dayRecord?.gpsLocation?.lng ? Number(dayRecord.gpsLocation.lng) : null);

    const geofence = dayRecord?.geofenceStatus || dayRecord?.lastKnownLocation?.landmarkName || dayRecord?.gpsLocation?.landmarkName || 'Base Location';

    return {
      id: activeEmployee.employeeId || activeEmployee.id,
      employeeId: activeEmployee.employeeId || activeEmployee.id,
      name: activeEmployee.name,
      role: activeEmployee.role,
      status: trackingStatus.label,
      punchIn: dayRecord?.punchIn || null,
      punchOut: dayRecord?.punchOut || null,
      workingHours: dayRecord?.workingHours || null,
      lat,
      lng,
      gpsLocation: dayRecord?.gpsLocation || null,
      exitGpsLocation: dayRecord?.exitGpsLocation || null,
      geofenceStatus: geofence,
      stationName: geofence,
      accuracy: dayRecord?.lastKnownLocation?.accuracy || dayRecord?.gpsLocation?.accuracy || 15,
      routeTrail: dayRecord?.routeTrail || []
    };
  }, [activeEmployee, dayRecord, trackingStatus, isPunchedOut]);

  // Route details
  const routeDetails = useMemo(() => {
    if (!mapTarget || !mapTarget.lat || !mapTarget.lng) return null;
    return getEmployeeRouteDetails(mapTarget);
  }, [mapTarget]);

  const hasTrackingData = Boolean(mapTarget && mapTarget.lat && mapTarget.lng);

  return (
    <div className="w-full space-y-4">
      {/* SECTION A: Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Employee Live Tracking
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {isPunchedOut
                ? 'Shift concluded — displaying Punch-In, Punch-Out, and travelled route.'
                : 'On duty — showing Punch-In point and real-time live position (route reveals after Punch-Out).'}
            </p>
          </div>

          {/* SECTION E: Shift Mode Indicator & Date Filter */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                isPunchedOut
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title={isPunchedOut ? 'Completed shift route visible' : 'Route hidden until employee punches out'}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>{isPunchedOut ? 'Shift Concluded • Clean Route' : 'Live Mode • Route After Punch-Out'}</span>
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
                title="Select tracking date"
              />
            </div>
          </div>
        </div>

        {/* SECTION B: Employee Selection Dropdown */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>Select Employee:</span>
            </label>

            <div className="relative flex-1 max-w-lg">
              <select
                value={effectiveSelectedEmpId || ''}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-xs"
              >
                {staffList.length === 0 ? (
                  <option value="" disabled>Loading workforce directory...</option>
                ) : filteredStaffList.length === 0 ? (
                  <option value="" disabled>No employees matching &ldquo;{searchQuery}&rdquo;</option>
                ) : (
                  <>
                    <option value="" disabled>
                      -- Select Employee ({filteredStaffList.length} Available) --
                    </option>
                    {filteredStaffList.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.statusEmoji} {emp.name} ({emp.employeeId}) — {emp.role} [{emp.statusText}]
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Quick Search Filter */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID or role..."
                className="w-full pl-8 pr-8 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Select Row for Live On-Duty Personnel */}
          {staffList.some((e) => e.isLiveOnDuty) && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span>Live On Duty:</span>
              </span>
              {staffList
                .filter((e) => e.isLiveOnDuty)
                .slice(0, 8)
                .map((emp) => {
                  const isSelected = (effectiveSelectedEmpId === emp.employeeId);
                  return (
                    <button
                      key={emp.employeeId}
                      type="button"
                      onClick={() => setSelectedEmpId(emp.employeeId)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{emp.name}</span>
                      <span className="text-[10px] opacity-80">({emp.employeeId})</span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout: Compact Details + Main Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* SECTION D: Compact Tracking Information */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3.5">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tracking Summary
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${trackingStatus.color}`}>
              {trackingStatus.label}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-400 font-medium block text-[11px]">Employee</span>
              <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                {activeEmployee?.name || 'Not Selected'}
              </span>
              <span className="text-[11px] font-mono text-blue-700 font-semibold">
                {activeEmployee?.employeeId} • {activeEmployee?.role}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Punch In</span>
                <span className="text-xs font-bold font-mono text-emerald-700 mt-0.5 block">
                  {dayRecord?.punchIn || '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Punch Out</span>
                <span className="text-xs font-bold font-mono text-slate-700 mt-0.5 block">
                  {dayRecord?.punchOut || '--'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Distance Travelled</span>
              <span className="text-lg font-black font-mono text-blue-900 mt-0.5 block">
                {routeDetails?.totalDistanceKm || dayRecord?.totalDistanceKm || 0.0} KM
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Route Display</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                  isPunchedOut
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  <span>{isPunchedOut ? '✓ Punch-In → Punch-Out Route' : '● Punch-In & Live Pin Only'}</span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Last Updated</span>
              <span className="text-xs font-semibold font-mono text-slate-800 mt-0.5 block truncate">
                {dayRecord?.updatedAt 
                  ? new Date(dayRecord.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                  : (dayRecord?.punchIn || '--')}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Current Location</span>
              <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                📍 {mapTarget?.geofenceStatus || 'Location Verified'}
              </span>
              {mapTarget?.lat && mapTarget?.lng && (
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                  {Number(mapTarget.lat).toFixed(4)}°N, {Number(mapTarget.lng).toFixed(4)}°E
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Date</span>
              <span className="text-xs font-bold font-mono text-slate-800 mt-0.5 block">
                {selectedDate}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION C: Main Interactive Map */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
          {hasTrackingData ? (
            <LiveInteractiveMap
              telemetryList={staffList}
              activeTarget={mapTarget}
              activeRouteDetails={routeDetails}
              selectedStop={selectedStop}
              onSelectStop={(stop) => setSelectedStop(stop)}
              onSelectTarget={(emp) => setSelectedEmpId(emp.employeeId || emp.id)}
              mapSatellite={mapSatellite}
              onToggleSatellite={() => setMapSatellite((prev) => !prev)}
              mapRouteMode={isPunchedOut}
              isFullWidth={isFullWidth}
              onToggleFullWidth={() => setIsFullWidth((prev) => !prev)}
            />
          ) : (
            <div className="h-[460px] rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-200/70 text-slate-500 flex items-center justify-center mb-3">
                <MapPin className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No tracking data available for this employee on the selected date.
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {activeEmployee?.name} has not recorded an active punch-in or location breadcrumbs for {selectedDate}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
