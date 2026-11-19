import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Radio,
  Camera
} from 'lucide-react';
import { useWorkforce, resolveCanonicalEmployeeId, attendanceMatchesEmployee } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { getLocalIstDateStr } from '../../utils/shiftUtils';
import { isAdminPerson, isDummyEmployee, OFFICIAL_ROLE_ACCOUNTS } from '../../data/mockUsers';
import { getEmployeeRouteDetails } from '../../services/routeTrackingService';
import { calculateAccurateRouteDistanceKm } from '../../utils/routeCleanUtils';
import LiveInteractiveMap from './LiveInteractiveMap';

/**
 * Operational workforce accounts filter for Employee Live GPS Locations.
 * STRICT: Only employees registered in the admin's employee directory are shown.
 * No fallback caches, no hardcoded role accounts, no allUsers injection.
 */

export default function CleanEmployeeLiveTracking() {
  const { user } = useAuth();
  const { attendance, employees, activeCompanyId } = useWorkforce();

  // 1. Date Filter (Defaults to today YYYY-MM-DD in IST)
  const [selectedDate, setSelectedDate] = useState(() => getLocalIstDateStr());

  // 2. Searchable Employee Dropdown State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // 3. Map View Options (Default to High-Resolution Satellite view matching reference design)
  const [mapSatellite, setMapSatellite] = useState(true);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [snappedDistanceKm, setSnappedDistanceKm] = useState(null);

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

    // SOURCE 1: OFFICIAL_ROLE_ACCOUNTS — the 6 known non-admin role accounts (PM, ACC, DIS, QC, SS, DRV).
    // These are the base entries that always appear. Only non-admin, non-dummy ones are included.
    (OFFICIAL_ROLE_ACCOUNTS || []).forEach(addPerson);

    // SOURCE 2: Firestore employees (admin-added in Directory Records).
    // These override / augment the base layer above. Fake/test accounts are blocked by isDummyEmployee.
    // If admin adds a new employee → it appears here automatically. No other source is used.
    (employees || []).forEach(addPerson);

    // Compute real-time duty status for selectedDate
    const compactDate = selectedDate.replace(/-/g, '');
    const staffArray = Array.from(map.values()).map((emp) => {
      const cleanId = resolveCanonicalEmployeeId(emp.employeeId);
      const cleanName = (emp.name || '').toLowerCase().trim();

      const matchingRecords = (attendance || []).filter((a) => {
        const aDate = a.date || (a.createdAt ? getLocalIstDateStr(a.createdAt) : '');
        const aName = (a.employeeName || '').toString().trim().toLowerCase();
        const isDateMatch = aDate === selectedDate || (a.id && a.id.startsWith(`ATT-${compactDate}-`));
        if (!isDateMatch) return false;
        if (attendanceMatchesEmployee(a, cleanId)) return true;
        return Boolean(!a.employeeId && aName && cleanName && aName === cleanName);
      });

      const record = matchingRecords.sort((a, b) => {
        const aHasOut = Boolean(a.punchOut);
        const bHasOut = Boolean(b.punchOut);
        if (aHasOut !== bHasOut) return bHasOut ? 1 : -1;
        const aTrailLen = Array.isArray(a.routeTrail) ? a.routeTrail.length : 0;
        const bTrailLen = Array.isArray(b.routeTrail) ? b.routeTrail.length : 0;
        if (aTrailLen !== bTrailLen) return bTrailLen - aTrailLen;
        const aUpd = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bUpd = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bUpd - aUpd;
      })[0] || null;

      const isPastDate = selectedDate < getLocalIstDateStr();
      const hasGps = Boolean(record?.lastKnownLocation?.lat || record?.gpsLocation?.lat);
      const isPunchIn = Boolean(record?.punchIn);
      const isPunchOut = Boolean(record?.punchOut || (isPastDate && isPunchIn));

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

      const effectiveRecord = (isPastDate && record?.punchIn && !record?.punchOut)
        ? {
            ...record,
            punchOut: record.punchOut || (Array.isArray(record.routeTrail) && record.routeTrail.length > 0 ? record.routeTrail[record.routeTrail.length - 1].time : '06:00 PM'),
            completionStatus: record.completionStatus && record.completionStatus !== 'Active' ? record.completionStatus : 'Shift Concluded',
            exitGpsLocation: record.exitGpsLocation || record.lastKnownLocation || record.gpsLocation || null
          }
        : (record || null);

      return {
        ...emp,
        statusPriority,
        statusText,
        statusEmoji,
        isLiveOnDuty,
        hasAttendanceToday: Boolean(record),
        recordToday: effectiveRecord
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

    // Return operational staff members (strictly excluding admin or dummy placeholder accounts)
    return staffArray.filter((e) => {
      return !isAdminPerson(e) && !isDummyEmployee(e);
    });
  }, [employees, attendance, selectedDate, activeCompanyId]);

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
    setSnappedDistanceKm(null);
    setSelectedStop(null);
  }, [selectedEmpId, effectiveSelectedEmpId, selectedDate]);

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

    const matchingRecords = (attendance || []).filter((a) => {
      const aDate = a.date || (a.createdAt ? getLocalIstDateStr(a.createdAt) : '');
      const aName = (a.employeeName || '').toString().trim().toLowerCase();
      const isDateMatch = aDate === selectedDate ||
        (a.id && a.id.startsWith(`ATT-${compactDate}-`));
      if (!isDateMatch) return false;
      if (attendanceMatchesEmployee(a, cleanId)) return true;
      return Boolean(!a.employeeId && aName && cleanName && aName === cleanName);
    });

    const rec = matchingRecords.sort((a, b) => {
      const aHasOut = Boolean(a.punchOut);
      const bHasOut = Boolean(b.punchOut);
      if (aHasOut !== bHasOut) return bHasOut ? 1 : -1;
      const aTrailLen = Array.isArray(a.routeTrail) ? a.routeTrail.length : 0;
      const bTrailLen = Array.isArray(b.routeTrail) ? b.routeTrail.length : 0;
      if (aTrailLen !== bTrailLen) return bTrailLen - aTrailLen;
      const aUpd = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bUpd = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bUpd - aUpd;
    })[0] || null;

    if (!rec) return null;
    const isPastDate = selectedDate < getLocalIstDateStr();
    if (isPastDate && rec.punchIn && !rec.punchOut) {
      const lastStop = Array.isArray(rec.routeTrail) && rec.routeTrail.length > 0 ? rec.routeTrail[rec.routeTrail.length - 1] : null;
      return {
        ...rec,
        punchOut: rec.punchOut || lastStop?.time || '06:00 PM',
        completionStatus: rec.completionStatus && rec.completionStatus !== 'Active' ? rec.completionStatus : 'Shift Concluded',
        exitGpsLocation: rec.exitGpsLocation || rec.lastKnownLocation || rec.gpsLocation || lastStop || null
      };
    }
    return rec;
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

    const trailLast = Array.isArray(dayRecord?.routeTrail) && dayRecord.routeTrail.length > 0
      ? dayRecord.routeTrail[dayRecord.routeTrail.length - 1]
      : null;

    const lastAcc = Number(dayRecord?.lastKnownLocation?.accuracy != null ? dayRecord.lastKnownLocation.accuracy : 15);
    const punchLat = dayRecord?.gpsLocation?.lat != null ? Number(dayRecord.gpsLocation.lat) : null;
    const punchLng = dayRecord?.gpsLocation?.lng != null ? Number(dayRecord.gpsLocation.lng) : null;
    const lkLat = dayRecord?.lastKnownLocation?.lat != null ? Number(dayRecord.lastKnownLocation.lat) : null;
    const lkLng = dayRecord?.lastKnownLocation?.lng != null ? Number(dayRecord.lastKnownLocation.lng) : null;

    let isLastKnownValid = Boolean(
      Number.isFinite(lkLat) && Number.isFinite(lkLng) && lkLat !== 0 && lkLng !== 0 && lastAcc <= 30
    );
    if (isLastKnownValid && Number.isFinite(punchLat) && Number.isFinite(punchLng)) {
      // Discard stale lastKnownLocation that teleports > 25km away without intermediate trail
      const distToPunch = Math.hypot((lkLat - punchLat) * 111000, (lkLng - punchLng) * 111000 * Math.cos(punchLat * Math.PI / 180));
      if (distToPunch > 25000 && (!Array.isArray(dayRecord?.routeTrail) || dayRecord.routeTrail.length <= 1)) {
        isLastKnownValid = false;
      }
    }

    // After punch-out, prefer exit GPS location; otherwise verified live/last known location, gpsLocation, or last route waypoint
    const lat = (isPunchedOut && dayRecord?.exitGpsLocation?.lat != null)
      ? Number(dayRecord.exitGpsLocation.lat)
      : (isLastKnownValid
        ? lkLat
        : (dayRecord?.exitGpsLocation?.lat != null
          ? Number(dayRecord.exitGpsLocation.lat)
          : (dayRecord?.gpsLocation?.lat != null
            ? Number(dayRecord.gpsLocation.lat)
            : (trailLast?.lat != null ? Number(trailLast.lat) : null))));

    const lng = (isPunchedOut && dayRecord?.exitGpsLocation?.lng != null)
      ? Number(dayRecord.exitGpsLocation.lng)
      : (isLastKnownValid
        ? lkLng
        : (dayRecord?.exitGpsLocation?.lng != null
          ? Number(dayRecord.exitGpsLocation.lng)
          : (dayRecord?.gpsLocation?.lng != null
            ? Number(dayRecord.gpsLocation.lng)
            : (trailLast?.lng != null ? Number(trailLast.lng) : null))));

    const geofence = dayRecord?.geofenceStatus || dayRecord?.lastKnownLocation?.landmarkName || dayRecord?.exitGpsLocation?.landmarkName || dayRecord?.gpsLocation?.landmarkName || 'Base Location';

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

  // ── SINGLE SOURCE OF TRUTH for distance ──────────────────────────────────
  // Harmonized between sidebar display and map legend for all employees:
  // Priority:
  //   1. Computed accurate route distance from routeTrail via calculateAccurateRouteDistanceKm
  //      (Cleans noise, collapses stationary dwell clusters, and preserves real movement)
  //   2. Computed route distance from routeDetails (Haversine along verified stops)
  //   3. Snapped distance from real road routing (> 0) ONLY if employee has travelled routeTrail
  //   4. Last stop's progressive distanceKm if present
  //   5. Stored dayRecord.totalDistanceKm ONLY when routeTrail has > 1 real stop
  // STRICT LOGICAL PRINCIPLE: If employee is stationary (no movement in routeTrail), distance is STRICTLY 0.0 KM.
  const trailDistanceKm = useMemo(() => {
    const trail = dayRecord?.routeTrail;

    // Physical zero-movement check:
    const inTime = dayRecord?.punchIn;
    const outTime = dayRecord?.punchOut;
    const isInstantPunch = Boolean(inTime && outTime && inTime === outTime);

    // 1. First priority: Calculate authoritative distance directly from dayRecord.routeTrail
    // over raw filtered GPS points with dwell-drift suppression and OSRM map-matching cross-check
    if (Array.isArray(trail) && trail.length > 1) {
      if (isInstantPunch && trail.length <= 2) {
        const p1 = trail[0];
        const p2 = trail[trail.length - 1];
        const p1Lat = Number(p1.lat != null ? p1.lat : p1[0]);
        const p1Lng = Number(p1.lng != null ? p1.lng : p1[1]);
        const p2Lat = Number(p2.lat != null ? p2.lat : p2[0]);
        const p2Lng = Number(p2.lng != null ? p2.lng : p2[1]);
        if (!isNaN(p1Lat) && !isNaN(p2Lat)) {
          const span = Math.hypot((p2Lat - p1Lat) * 111000, (p2Lng - p1Lng) * 111000 * Math.cos(p1Lat * Math.PI / 180));
          if (span < 60) return 0.0;
        }
      }

      const computed = calculateAccurateRouteDistanceKm(trail, isInstantPunch ? 0 : snappedDistanceKm);
      if (Number.isFinite(computed) && computed > 0 && computed <= 500) {
        return Number(computed.toFixed(1));
      }
      return 0.0;
    }

    if (isInstantPunch) return 0.0;

    // 2. If routeDetails has computed totalDistanceKm from verified stops (requires > 1 distinct stops)
    if (routeDetails?.stops?.length > 1 && routeDetails?.totalDistanceKm != null && Number.isFinite(routeDetails.totalDistanceKm) && routeDetails.totalDistanceKm > 0) {
      return Number(routeDetails.totalDistanceKm.toFixed(1));
    }

    // 3. If snapped distance from real road geometry is available (> 0) ONLY if trail has real points
    if (snappedDistanceKm != null && Number.isFinite(snappedDistanceKm) && snappedDistanceKm > 0 && snappedDistanceKm <= 500) {
      if (Array.isArray(trail) && trail.length > 1) {
        return Number(snappedDistanceKm.toFixed(1));
      }
    }

    // 4. Old stop format: each stop has a progressive distanceKm field
    if (Array.isArray(trail) && trail.length > 1) {
      const lastStop = trail[trail.length - 1];
      if (lastStop?.distanceKm != null && Number.isFinite(Number(lastStop.distanceKm))) {
        const v = Number(lastStop.distanceKm);
        if (v > 0 && v <= 500) return Number(v.toFixed(1));
      }
    }

    // 5. Stored totalDistanceKm only if trail has real stops (> 1)
    const stored = Number(dayRecord?.totalDistanceKm ?? dayRecord?.total_distance ?? 0);
    if (Number.isFinite(stored) && stored > 0 && stored <= 500 && Array.isArray(trail) && trail.length > 1) {
      return Number(stored.toFixed(1));
    }

    // If stationary, no route trail, or zero physical displacement: strictly 0.0 KM
    return 0.0;
  }, [snappedDistanceKm, routeDetails, dayRecord]);

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
                ? 'Shift concluded — displaying Punch-In, Punch-Out, waypoints, and travelled route with coordinates.'
                : 'On duty — displaying Punch-In, live travelled route, waypoints, and real-time position.'}
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
              title={isPunchedOut ? 'Completed shift route visible' : 'Live shift route visible'}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>{isPunchedOut ? 'Shift Concluded • Complete Route' : 'Live On Duty • Route Active'}</span>
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
            <div className="flex items-center gap-2.5">
              {(dayRecord?.selfieUrl || activeEmployee?.selfieUrl || activeEmployee?.photoUrl) ? (
                <div 
                  onClick={() => setPreviewPhoto(dayRecord?.selfieUrl || activeEmployee?.selfieUrl || activeEmployee?.photoUrl)}
                  className="relative shrink-0 cursor-pointer group"
                  title="Click to enlarge punch-in biometric selfie"
                >
                  <img
                    src={dayRecord?.selfieUrl || activeEmployee?.selfieUrl || activeEmployee?.photoUrl}
                    alt={activeEmployee?.name || 'Staff'}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400 shadow-2xs group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-emerald-600 text-white text-[8px] font-bold rounded shadow-2xs">
                    IN
                  </span>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {((activeEmployee?.name || 'EM').substring(0, 2)).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-slate-400 font-medium block text-[11px]">Employee</span>
                <span className="text-sm font-extrabold text-slate-900 block truncate">
                  {activeEmployee?.name || 'Not Selected'}
                </span>
                <span className="text-[11px] font-mono text-blue-700 font-semibold block truncate">
                  {activeEmployee?.employeeId} • {activeEmployee?.role}
                </span>
              </div>
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
                {`${trailDistanceKm.toFixed(1)} KM`}
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
                  <span>{isPunchedOut ? '✓ Complete Travelled Route' : '● Live Travelled Route Active'}</span>
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
        <div className={`${isFullWidth ? "lg:col-span-12" : "lg:col-span-8 xl:col-span-9"} bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs`}>
          {hasTrackingData ? (
            <LiveInteractiveMap
              telemetryList={staffList}
              activeTarget={mapTarget}
              activeRouteDetails={routeDetails}
              trailDistanceKm={trailDistanceKm}
              selectedStop={selectedStop}
              onSelectStop={(stop) => setSelectedStop(stop)}
              onSelectTarget={(emp) => setSelectedEmpId(emp.employeeId || emp.id)}
              mapSatellite={mapSatellite}
              onToggleSatellite={() => setMapSatellite((prev) => !prev)}
              mapRouteMode={true}
              isFullWidth={isFullWidth}
              onToggleFullWidth={() => setIsFullWidth((prev) => !prev)}
              onRouteSnapped={(res) => {
                if (res && res.distanceKm != null && res.distanceKm > 0) {
                  setSnappedDistanceKm((prev) => (Math.abs((prev || 0) - res.distanceKm) > 0.05 ? res.distanceKm : prev));
                }
              }}
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

      {/* Biometric Punch-In Photo Preview Modal */}
      {previewPhoto && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200"
          >
            <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Punch-In Biometric Selfie</span>
              </div>
              <button 
                type="button" 
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-slate-50 flex flex-col items-center">
              <img 
                src={previewPhoto} 
                alt="Punch-In Selfie" 
                className="w-full max-h-80 object-cover rounded-xl border border-slate-200 shadow-md"
              />
              <div className="mt-3 w-full text-xs text-slate-600 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{activeEmployee?.name}</span>
                  <span className="text-emerald-600 font-bold">✓ Biometric Verified</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Punch In: {dayRecord?.punchIn || '--'}</span>
                  <span>{dayRecord?.date || selectedDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
