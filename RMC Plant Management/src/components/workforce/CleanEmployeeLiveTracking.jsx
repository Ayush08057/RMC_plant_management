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
  Minimize2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { isAdminPerson } from '../../data/mockUsers';
import { getEmployeeRouteDetails } from '../../services/routeTrackingService';
import LiveInteractiveMap from './LiveInteractiveMap';

export default function CleanEmployeeLiveTracking() {
  const { user } = useAuth();
  const { attendance, employees } = useWorkforce();

  // 1. Date Filter (Defaults to today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // 2. Searchable Employee Dropdown State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // 3. Map View Options
  const [mapSatellite, setMapSatellite] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);

  // Build authorized workforce list (strictly non-admin operational personnel)
  const staffList = useMemo(() => {
    return (employees || [])
      .filter((e) => !isAdminPerson(e))
      .map((e) => ({
        id: (e.id || e.employeeId || '').toString(),
        employeeId: (e.employeeId || e.id || '').toString(),
        name: e.name || 'Unnamed Employee',
        role: e.role || 'Staff',
        department: e.department || 'Operations'
      }));
  }, [employees]);

  // Auto-select first employee if none selected
  useEffect(() => {
    if (!selectedEmpId && staffList.length > 0) {
      setSelectedEmpId(staffList[0].employeeId);
    }
  }, [selectedEmpId, staffList]);

  // Filtered dropdown list
  const filteredStaffList = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLowerCase();
    return staffList.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
    );
  }, [staffList, searchQuery]);

  // Active selected employee object
  const activeEmployee = useMemo(() => {
    return staffList.find((e) => e.employeeId === selectedEmpId || e.id === selectedEmpId) || staffList[0] || null;
  }, [staffList, selectedEmpId]);

  // Attendance record for active employee on the selected date
  const dayRecord = useMemo(() => {
    if (!activeEmployee) return null;
    const cleanId = (activeEmployee.employeeId || activeEmployee.id).toUpperCase();
    const cleanName = (activeEmployee.name || '').toLowerCase().trim();

    return (attendance || []).find((a) => {
      const aDate = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '');
      const aEmpId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
      const aName = (a.employeeName || '').toString().trim().toLowerCase();
      const isDateMatch = aDate === selectedDate;
      const isIdMatch = aEmpId === cleanId || aEmpId.includes(cleanId) || (aName && cleanName && aName === cleanName);
      return isDateMatch && isIdMatch;
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
      geofenceStatus: geofence,
      stationName: geofence,
      accuracy: dayRecord?.lastKnownLocation?.accuracy || dayRecord?.gpsLocation?.accuracy || 15,
      routeTrail: isPunchedOut ? (dayRecord?.routeTrail || []) : []
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
              Monitor employee locations and travelled routes.
            </p>
          </div>

          {/* SECTION E: Date Filter */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
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
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <User className="w-4 h-4 text-blue-600" />
            <span>Select Employee:</span>
          </label>

          <div className="relative flex-1 max-w-md">
            <select
              value={selectedEmpId || ''}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-xs"
            >
              {staffList.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.name} ({emp.employeeId}) — {emp.role}
                </option>
              ))}
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
              className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
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
              <span className="text-slate-400 font-medium block text-[11px]">Road Snap Mode</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                  <span>🛣️</span>
                  <span>OSRM Road Match: Active</span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium block text-[11px]">Last Updated</span>
              <span className="text-xs font-semibold text-slate-800 mt-0.5 block truncate">
                {dayRecord?.updatedAt 
                  ? new Date(dayRecord.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
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
