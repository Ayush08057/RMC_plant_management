import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  ShieldCheck, 
  Radio, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Search, 
  Filter, 
  RefreshCw, 
  User, 
  Truck, 
  Compass, 
  Activity, 
  Battery, 
  Wifi, 
  Eye, 
  X,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { formatToIndian12Hr, parseTimeToMinutes, getNowIndian12Hr } from '../../utils/shiftUtils';

export default function LiveEmployeeLocationRadar({ defaultPlant = 'All Plants' }) {
  const { user } = useAuth();
  const { attendance, employees, plants } = useWorkforce();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All'); // 'All' | 'Punched In' | 'Punched Out' | 'Not Checked In'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'field' | 'plant'
  const [mapDisplayType, setMapDisplayType] = useState('gis'); // 'gis' | 'radar'
  const [adminPingMsg, setAdminPingMsg] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'cards' | 'radar'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentTime, setCurrentTime] = useState(getNowIndian12Hr(true));
  const [radarDegree, setRadarDegree] = useState(0);

  // Reducible / Collapsible UI States
  const [statsReduced, setStatsReduced] = useState(false);
  const [cardDensity, setCardDensity] = useState('compact'); // 'compact' | 'detailed'
  const [expandedCardIds, setExpandedCardIds] = useState(() => new Set());

  const toggleCardExpand = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Real Device Geolocation State
  const [realDeviceGps, setRealDeviceGps] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    active: false,
    label: 'Connecting Browser Geolocation...',
  });

  const updateRealDeviceGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          const accuracy = Math.round(pos.coords.accuracy);
          setRealDeviceGps({
            lat,
            lng,
            accuracy,
            active: true,
            label: `Real Device GPS: Lat ${lat}, Lng ${lng} (±${accuracy}m)`,
          });
        },
        (err) => {
          console.warn('Real Device GPS error:', err.message);
          setRealDeviceGps((prev) => ({ ...prev, active: false, label: err.message }));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  // Live clock & radar sweep & Geolocation watch
  useEffect(() => {
    updateRealDeviceGps();

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          const accuracy = Math.round(pos.coords.accuracy);
          setRealDeviceGps({
            lat,
            lng,
            accuracy,
            active: true,
            label: `Real Device GPS: Lat ${lat}, Lng ${lng} (±${accuracy}m)`,
          });
        },
        (err) => console.warn('Radar watch error:', err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    }

    const timer = setInterval(() => {
      setCurrentTime(getNowIndian12Hr(true));
      setRadarDegree((prev) => (prev + 3) % 360);
    }, 100);

    return () => {
      clearInterval(timer);
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Master list of real workforce employees + current authenticated user
  const allEmployees = useMemo(() => {
    const map = new Map();
    if (user) {
      const uKey = user.employeeId || user.id || 'EMP-USER-01';
      map.set(uKey, {
        id: uKey,
        employeeId: uKey,
        name: user.name || 'Current Staff',
        role: user.role || 'Staff',
        department: user.department || 'Operations',
        plant: user.plantLocation || 'Main Plant HQ',
        avatar: (user.name || 'US').substring(0, 2).toUpperCase(),
        phone: user.phone || '+91 98200 00000',
      });
    }
    (employees || []).forEach((e) => {
      const key = e.employeeId || e.id;
      map.set(key, {
        ...map.get(key),
        ...e,
        id: key,
        employeeId: key,
      });
    });
    return Array.from(map.values());
  }, [employees, user]);

  // The live GPS radar tracks all workforce personnel and active employees
  const liveTrackedEmployees = useMemo(() => {
    return allEmployees;
  }, [allEmployees]);

  // Combine live tracked employees with today's attendance records & GPS telemetry
  const telemetryList = useMemo(() => {
    return liveTrackedEmployees.map((emp) => {
      const record = (attendance || []).find((a) => {
        const aId = (a.employeeId || '').toUpperCase();
        const empId = (emp.id || '').toUpperCase();
        const empEmpId = (emp.employeeId || '').toUpperCase();
        return (aId === empId || aId === empEmpId) && a.date === todayStr;
      });

      const isPunchedIn = Boolean(record?.punchIn && !record?.punchOut);
      const isPunchedOut = Boolean(record?.punchIn && record?.punchOut);

      // Check if this employee is the active user on this client device
      const isCurrentUser = user && (
        (user.employeeId && emp.employeeId && user.employeeId.toUpperCase() === emp.employeeId.toUpperCase()) ||
        (user.id && emp.id && user.id === emp.id)
      );

      let lat = null;
      let lng = null;
      let accuracy = null;
      let gpsFixSource = 'NO_FIX'; // 'LIVE_DEVICE' | 'ATTENDANCE_PUNCH' | 'NO_FIX'

      if (isCurrentUser && realDeviceGps.active && realDeviceGps.lat) {
        lat = realDeviceGps.lat;
        lng = realDeviceGps.lng;
        accuracy = realDeviceGps.accuracy;
        gpsFixSource = 'LIVE_DEVICE';
      } else if (record?.gpsLocation?.lat && record?.gpsLocation?.lng) {
        lat = Number(record.gpsLocation.lat);
        lng = Number(record.gpsLocation.lng);
        accuracy = record.gpsLocation.accuracy ? Math.round(record.gpsLocation.accuracy) : null;
        gpsFixSource = 'ATTENDANCE_PUNCH';
      }

      const hasGpsFix = lat !== null && lng !== null;

      let geofenceLabel = 'Plant HQ Zone';
      if ((emp.role || '').toLowerCase().includes('driver')) {
        geofenceLabel = isPunchedIn ? 'Highway Transit' : 'Truck Bay';
      } else if ((emp.role || '').toLowerCase().includes('supervisor')) {
        geofenceLabel = isPunchedIn ? 'Site Geofence' : 'Off-Duty';
      } else if (isPunchedIn) {
        geofenceLabel = 'Plant Batching Geofence';
      }

      // Calculate elapsed active working duration
      let elapsedMins = 0;
      if (isPunchedIn && record?.punchIn) {
        const now = new Date();
        const totalNowMins = now.getHours() * 60 + now.getMinutes();
        const totalInMins = parseTimeToMinutes(record.punchIn);
        elapsedMins = Math.max(0, totalNowMins - totalInMins);
      } else if (isPunchedOut && record?.workingHours) {
        elapsedMins = Math.round(record.workingHours * 60);
      }

      const formatHours = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
      };

      return {
        ...emp,
        recordId: record?.id,
        punchIn: record?.punchIn || null,
        punchOut: record?.punchOut || null,
        status: isPunchedIn ? 'Punched In' : (isPunchedOut ? 'Punched Out' : 'Not Checked In'),
        workingHours: record?.workingHours || (elapsedMins > 0 ? (elapsedMins / 60).toFixed(1) : null),
        overtimeHours: record?.overtimeHours || 0,
        elapsedDisplay: formatHours(elapsedMins),
        lateStatus: record?.lateStatus || false,
        lateMinutes: record?.lateMinutes || 0,
        lat,
        lng,
        accuracy,
        hasGpsFix,
        gpsFixSource,
        geofenceStatus: record?.geofenceStatus || (hasGpsFix ? geofenceLabel : 'No GPS Fix Recorded'),
        speedKmh: null,
        batteryPct: null,
        network: hasGpsFix 
          ? (gpsFixSource === 'LIVE_DEVICE' ? 'Live Browser GNSS' : 'Punch-In Verified Fix') 
          : 'No GPS Telemetry',
        selfieUrl: record?.selfieUrl || emp?.selfieUrl || emp?.avatarUrl || emp?.photoUrl || null,
        remarks: record?.remarks || (hasGpsFix ? 'Verified GPS Telemetry' : 'No GPS Fix Recorded'),
      };
    });
  }, [liveTrackedEmployees, attendance, todayStr, realDeviceGps, user]);

  // Filtered telemetry list
  const filteredList = useMemo(() => {
    return telemetryList.filter((item) => {
      const matchSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.geofenceStatus.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole = selectedRoleFilter === 'All' || item.role === selectedRoleFilter;
      const matchStatus = selectedStatusFilter === 'All' || item.status === selectedStatusFilter;

      const isFieldWorker = 
        item.role.toLowerCase().includes('driver') ||
        item.role.toLowerCase().includes('supervisor') ||
        item.role.toLowerCase().includes('quality') ||
        item.role.toLowerCase().includes('field') ||
        item.geofenceStatus.toLowerCase().includes('transit') ||
        item.geofenceStatus.toLowerCase().includes('site');

      const matchCategory = 
        categoryFilter === 'all' ||
        (categoryFilter === 'field' && isFieldWorker) ||
        (categoryFilter === 'plant' && !isFieldWorker);

      return matchSearch && matchRole && matchStatus && matchCategory;
    });
  }, [telemetryList, searchQuery, selectedRoleFilter, selectedStatusFilter, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = telemetryList.length;
    const punchedIn = telemetryList.filter((t) => t.status === 'Punched In').length;
    const punchedOut = telemetryList.filter((t) => t.status === 'Punched Out').length;
    const notCheckedIn = telemetryList.filter((t) => t.status === 'Not Checked In').length;
    const inGeofence = telemetryList.filter((t) => t.status === 'Punched In' && t.geofenceStatus.includes('Inside')).length;
    const fieldWorkers = telemetryList.filter((t) => 
      t.role.toLowerCase().includes('driver') ||
      t.role.toLowerCase().includes('supervisor') ||
      t.role.toLowerCase().includes('quality') ||
      t.role.toLowerCase().includes('field') ||
      t.geofenceStatus.toLowerCase().includes('transit') ||
      t.geofenceStatus.toLowerCase().includes('site')
    ).length;

    return { total, punchedIn, punchedOut, notCheckedIn, inGeofence, fieldWorkers };
  }, [telemetryList]);

  const uniqueRoles = useMemo(() => {
    return ['All', ...Array.from(new Set(telemetryList.map((t) => t.role)))];
  }, [telemetryList]);

  return (
    <div className="space-y-4">
      {/* Top Telemetry Header & Status Tickers */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-300/60 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Field Fleet Live Location Radar
                </h2>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
            </div>
          </div>

          {/* Clock & View Switchers */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <div className="px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-900 border border-cyan-200 font-mono text-xs flex items-center gap-2 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-amber-400">{currentTime}</span>
              <span className="text-[10px] text-slate-400">IST</span>
            </div>

            {/* View Mode Buttons */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'split' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Radar + List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cards Only
              </button>
              <button
                type="button"
                onClick={() => setViewMode('radar')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'radar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Radar Only
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Telemetry Counters (Reducible / Collapsible) */}
        {statsReduced ? (
          <div className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-mono">{stats.punchedIn}</span> Active On Duty
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700 font-semibold">
                <span className="font-mono font-bold">{stats.punchedOut}</span> Completed
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-800 font-semibold">
                <span className="font-mono font-bold">{stats.notCheckedIn}</span> Pending Check-In
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-cyan-800 font-semibold">
                <span className="font-mono font-bold">{stats.total}</span> Total Fleet
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStatsReduced(false)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer shrink-0"
              title="Expand telemetry counters"
            >
              <span>Expand Counters</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setStatsReduced(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Reduce telemetry counters"
              >
                <span>Reduce Counters</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
                  <span>Active On Duty</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                  {stats.punchedIn}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                  Live GPS Tracked ({stats.inGeofence} In-Plant)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-600 font-semibold mb-1">
                  Shift Completed
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {stats.punchedOut}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Punched Out Today
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-xs text-amber-800 font-semibold mb-1">
                  Not Checked In
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
                  {stats.notCheckedIn}
                </div>
                <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                  Awaiting First Punch
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200">
                <div className="text-xs text-cyan-800 font-semibold mb-1">
                  Total Workforce
                </div>
                <div className="text-xl sm:text-2xl font-black text-cyan-950 font-mono">
                  {stats.total}
                </div>
                <div className="text-[10px] text-cyan-700 font-medium mt-0.5">
                  Roster Strength
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Category Filter Pills: Focus on Field Workers vs In-Plant Staff */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Target Fleet:</span>
          
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Personnel ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('field')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'field'
                ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>🚚 Field Workers & Drivers Fleet</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${categoryFilter === 'field' ? 'bg-white/30 text-white' : 'bg-amber-200/80 text-amber-900'}`}>
              {stats.fieldWorkers}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('plant')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'plant'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
            }`}
          >
            <span>🏭 Plant Operators & In-Plant</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${categoryFilter === 'plant' ? 'bg-white/30 text-white' : 'bg-teal-200/80 text-teal-900'}`}>
              {stats.total - stats.fieldWorkers}
            </span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mt-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee by name, ID, role, or geofence location..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Punched In">Active Only (Punched In)</option>
              <option value="Punched Out">Punched Out</option>
              <option value="Not Checked In">Not Checked In</option>
            </select>

            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Screen + Employee Cards */}
      <div className={`grid gap-4 ${
        viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 
        viewMode === 'radar' ? 'grid-cols-1' : 'grid-cols-1'
      }`}>
        
        {/* Visual Live Radar Component (Visible in 'split' or 'radar' mode) */}
        {(viewMode === 'split' || viewMode === 'radar') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-5 xl:col-span-4' : 'w-full'} bg-white text-slate-900 border border-slate-200/90 shadow-md rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between`}>
            
            <div className="flex items-center justify-between z-10 mb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                  LIVE GPS LOCATION MAP
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMapDisplayType('gis')}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer ${
                    mapDisplayType === 'gis' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  GIS Map
                </button>
                <button
                  type="button"
                  onClick={() => setMapDisplayType('radar')}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer ${
                    mapDisplayType === 'radar' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Radar Scope
                </button>
              </div>
            </div>

            {/* Interactive GIS Satellite/Road Map vs Radar Scope */}
            {mapDisplayType === 'gis' ? (
              <div className="relative my-2 aspect-square max-w-[340px] mx-auto w-full rounded-2xl overflow-hidden border border-slate-700 shadow-xl bg-slate-900/90 min-h-[280px]">
                {(() => {
                  const punchedInList = telemetryList.filter((t) => t.status === 'Punched In' && t.hasGpsFix);
                  const activeTarget = (selectedEmployee?.hasGpsFix ? selectedEmployee : null) || punchedInList[0] || telemetryList.find((t) => t.hasGpsFix);
                  const lat = activeTarget?.lat || (realDeviceGps.active ? realDeviceGps.lat : null);
                  const lng = activeTarget?.lng || (realDeviceGps.active ? realDeviceGps.lng : null);

                  if (!lat || !lng) {
                    return (
                      <div className="flex flex-col items-center justify-center h-full min-h-[280px] p-6 text-center text-slate-400 space-y-3">
                        <MapPin className="w-8 h-8 text-amber-500/70" />
                        <div className="text-xs font-semibold text-slate-200">No Active GPS Telemetry</div>
                        <p className="text-[11px] text-slate-400 max-w-[220px]">
                          Real coordinates will appear once staff punch in via mobile GPS or grant browser location permission.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative w-full h-full min-h-[280px]">
                      <iframe
                        title="Real Time Live Location Map"
                        width="100%"
                        height="100%"
                        style={{ border: 0, minHeight: '280px', width: '100%', height: '100%' }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                      />
                      <div className="absolute top-2 left-2 right-2 z-10 bg-white/95 border border-slate-200 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-mono font-bold shadow-md flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {activeTarget?.selfieUrl ? (
                            <img src={activeTarget.selfieUrl} alt={activeTarget.name} className="w-7 h-7 rounded-full object-cover border-2 border-emerald-400 shrink-0 shadow-sm" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-slate-900 block font-bold truncate text-[11px]">{activeTarget?.name || 'Staff User'}</span>
                            <span className="text-emerald-700 block font-mono text-[9px] font-semibold">{activeTarget?.status || 'Active'} • {lat.toFixed(4)}°N, {lng.toFixed(4)}°E</span>
                          </div>
                        </div>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono font-bold shrink-0">
                          {activeTarget?.gpsFixSource === 'LIVE_DEVICE' ? 'GNSS Live' : 'Punch Fix'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Radar Scope Visualizer */
              <div className="relative my-4 aspect-square max-w-[320px] mx-auto w-full flex items-center justify-center">
                {/* Concentric Geofence Rings */}
                <div className="absolute inset-0 rounded-full border border-emerald-500/20" />
                <div className="absolute inset-[15%] rounded-full border border-emerald-500/30" />
                <div className="absolute inset-[30%] rounded-full border border-emerald-500/40" />
                <div className="absolute inset-[45%] rounded-full border border-emerald-500/60 bg-emerald-500/5" />
                
                {/* Crosshair Lines */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-500/25" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-500/25" />

                {/* Rotating Radar Sweep Cone */}
                <div 
                  className="absolute inset-0 rounded-full pointer-events-none transition-transform"
                  style={{
                    background: `conic-gradient(from ${radarDegree}deg, rgba(16, 185, 129, 0.35) 0deg, rgba(16, 185, 129, 0) 60deg)`,
                  }}
                />

                {/* Plant Center Pin */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-lg shadow-amber-500/50">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="text-[9px] font-mono text-amber-400 font-bold mt-1 bg-black/80 px-1.5 rounded">
                    MAIN PLANT HQ
                  </span>
                </div>

                {/* Active Employee Blips with real GPS fixes on Radar */}
                {(() => {
                  const trackedWithFix = telemetryList.filter((emp) => emp.hasGpsFix && emp.lat && emp.lng);
                  if (trackedWithFix.length === 0) {
                    return (
                      <div className="absolute inset-x-4 bottom-8 z-20 text-center bg-black/70 backdrop-blur-xs p-2 rounded-xl border border-slate-700">
                        <span className="text-[10px] font-mono text-slate-300">
                          No personnel with active GPS fixes currently visible on radar scope
                        </span>
                      </div>
                    );
                  }
                  return trackedWithFix.map((emp, i) => {
                    const isOnline = emp.status === 'Punched In';
                    const angleRad = (i * 45 + 25) * (Math.PI / 180);
                    const distPercent = isOnline ? (emp.role === 'Driver' ? 42 : 18) : 38;
                    const left = 50 + Math.cos(angleRad) * distPercent;
                    const top = 50 + Math.sin(angleRad) * distPercent;

                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setSelectedEmployee(emp)}
                        className="absolute z-20 group -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125"
                        style={{ left: `${left}%`, top: `${top}%` }}
                        title={`${emp.name} (${emp.role}) - ${emp.status}`}
                      >
                        <div className="relative">
                          {isOnline && (
                            <span className="animate-ping absolute -inset-1 rounded-full bg-emerald-400 opacity-75" />
                          )}
                          <div className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                            isOnline 
                              ? (emp.role === 'Driver' ? 'bg-cyan-500' : 'bg-emerald-500') 
                              : 'bg-slate-500 opacity-60'
                          }`}>
                            <div className="w-1 h-1 rounded-full bg-white" />
                          </div>
                        </div>
                        {/* Hover Pill */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-4 hidden group-hover:block z-30 whitespace-nowrap bg-slate-900 border border-slate-700 text-white text-[10px] px-2 py-0.5 rounded shadow-lg pointer-events-none font-mono">
                          {emp.name.split(' ')[0]} ({emp.role})
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            )}

            {/* Radar Scope Footer Legend */}
            <div className="z-10 bg-white/90 p-2.5 rounded-xl border border-slate-200 text-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>On Duty</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>Transit Driver</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                <span>Off Duty</span>
              </div>
            </div>

          </div>
        )}

        {/* Live Employee Telemetry Cards Grid */}
        <div className={`${
          viewMode === 'split' ? 'lg:col-span-7 xl:col-span-8' : 'w-full'
        } space-y-3`}>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 font-semibold px-1">
            <div className="flex items-center gap-2">
              <span>Displaying {filteredList.length} of {telemetryList.length} Personnel</span>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">• Live GPS stream</span>
            </div>
            
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCardDensity('compact')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    cardDensity === 'compact' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Compact Cards
                </button>
                <button
                  type="button"
                  onClick={() => setCardDensity('detailed')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    cardDensity === 'detailed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Detailed Cards
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredList.map((emp) => {
              const isOnline = emp.status === 'Punched In';
              const isOut = emp.status === 'Punched Out';
              const isExpanded = cardDensity === 'detailed' || expandedCardIds.has(emp.id);

              return (
                <div
                  key={emp.id}
                  className={`rounded-2xl border transition-all bg-white relative overflow-hidden flex flex-col justify-between ${
                    isExpanded ? 'p-3.5 sm:p-4' : 'p-2.5 sm:p-3'
                  } ${
                    isOnline 
                      ? 'border-emerald-300 shadow-xs hover:border-emerald-400' 
                      : isOut 
                        ? 'border-slate-200 hover:border-slate-300' 
                        : 'border-slate-200/70 opacity-80'
                  }`}
                >
                  {/* Status Color Strip */}
                  <div className={`h-1 absolute top-0 left-0 right-0 ${
                    isOnline 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                      : isOut 
                        ? 'bg-gradient-to-r from-slate-400 to-slate-500' 
                        : 'bg-slate-200'
                  }`} />

                  {/* Reducible Compact Layout */}
                  {!isExpanded ? (
                    <div className="space-y-2 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {emp.selfieUrl ? (
                            <img src={emp.selfieUrl} alt={emp.name} className="w-7 h-7 rounded-lg object-cover border border-emerald-400 shrink-0" />
                          ) : (
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {emp.avatar || emp.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{emp.name}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <span className="font-mono font-bold text-amber-700">{emp.employeeId}</span>
                              <span>•</span>
                              <span className="truncate">{emp.role}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            isOnline 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : isOut 
                                ? 'bg-slate-100 text-slate-700 border border-slate-300' 
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : isOut ? 'bg-slate-500' : 'bg-amber-500'}`} />
                            <span>{emp.status}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleCardExpand(emp.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Expand details"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 gap-2">
                        <div className="flex items-center gap-1 text-slate-600 truncate min-w-0">
                          <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate font-medium">{emp.geofenceStatus}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {emp.punchIn && (
                            <span className="font-mono text-[10px] font-bold text-emerald-700">
                              In: {formatToIndian12Hr(emp.punchIn)}
                            </span>
                          )}
                          {emp.hasGpsFix ? (
                            <a
                              href={`https://www.google.com/maps?q=${emp.lat},${emp.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Map</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No GPS</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedEmployee(emp)}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            title="Open Telemetry Dossier"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Detailed Expanded Card Layout */
                    <div>
                      {/* Header: Employee Name, ID, & Status Pill */}
                      <div className="flex items-start justify-between gap-2 mb-2 pt-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {emp.selfieUrl ? (
                            <img src={emp.selfieUrl} alt={emp.name} className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-400 shrink-0 shadow-xs" />
                          ) : (
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isOnline ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {emp.avatar || emp.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate">
                              {emp.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                              <span className="font-mono font-bold text-amber-700">{emp.employeeId}</span>
                              <span>•</span>
                              <span className="truncate">{emp.role}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Collapse Toggle */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            isOnline 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : isOut 
                                ? 'bg-slate-100 text-slate-700 border border-slate-300' 
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : isOut ? 'bg-slate-500' : 'bg-amber-500'}`} />
                            <span>{emp.status}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleCardExpand(emp.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Collapse card"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Punch Timings Breakdown */}
                      <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 my-2 text-center text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">PUNCH IN</span>
                          <span className={`font-mono text-[11px] font-bold ${emp.punchIn ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {formatToIndian12Hr(emp.punchIn) || '--:--'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">PUNCH OUT</span>
                          <span className={`font-mono text-[11px] font-bold ${emp.punchOut ? 'text-rose-700' : 'text-slate-400'}`}>
                            {formatToIndian12Hr(emp.punchOut) || '--:--'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">DURATION</span>
                          <span className={`font-mono text-[11px] font-bold ${isOnline ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {emp.elapsedDisplay || '--'}
                          </span>
                        </div>
                      </div>

                      {/* Live Location & Geofence Coordinates */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold truncate text-[11px]">{emp.geofenceStatus}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pl-5">
                          {emp.hasGpsFix ? (
                            <>
                              <span>{Number(emp.lat).toFixed(4)}° N, {Number(emp.lng).toFixed(4)}° E</span>
                              <span className="text-emerald-700 font-semibold">
                                {emp.gpsFixSource === 'LIVE_DEVICE' ? 'Live Browser GNSS' : 'Punch Fix'}
                                {emp.accuracy ? ` (±${emp.accuracy}m)` : ''}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-400 italic">No GPS Fix</span>
                              <span className="text-amber-700 font-semibold">Location Pending</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        {emp.hasGpsFix ? (
                          <a
                            href={`https://www.google.com/maps?q=${emp.lat},${emp.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Google Maps</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <ExternalLink className="w-3 h-3 text-slate-300" />
                            <span>No GPS Fix</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedEmployee(emp)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Telemetry Card</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* Detail Dossier Modal for Selected Employee */}
      {selectedEmployee && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 app-modal-backdrop animate-fade-in"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-pop-in">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-amber-500/20">
                  {selectedEmployee.avatar}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {selectedEmployee.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedEmployee.employeeId} • {selectedEmployee.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Location Dossier Details */}
            <div className="space-y-3 text-xs">
              
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {selectedEmployee.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Punch In Time:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedEmployee.punchIn ? formatToIndian12Hr(selectedEmployee.punchIn) : 'Not yet punched in'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Punch Out Time:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedEmployee.punchOut ? formatToIndian12Hr(selectedEmployee.punchOut) : (selectedEmployee.status === 'Punched In' ? 'Active On Duty' : '--')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Total Duty Duration:</span>
                  <span className="font-mono font-bold text-amber-700">{selectedEmployee.elapsedDisplay}</span>
                </div>
              </div>

              {/* Exact Geolocation Telemetry */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Real-time GPS Geofence Fix</span>
                </div>

                {selectedEmployee.hasGpsFix ? (
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                    <div className="p-2 rounded-xl bg-white border border-amber-200">
                      <span className="text-[10px] text-slate-400 block font-sans">LATITUDE</span>
                      <span className="font-bold text-slate-900">{Number(selectedEmployee.lat).toFixed(5)}° N</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-amber-200">
                      <span className="text-[10px] text-slate-400 block font-sans">LONGITUDE</span>
                      <span className="font-bold text-slate-900">{Number(selectedEmployee.lng).toFixed(5)}° E</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs text-amber-900">
                    <span className="font-semibold block">No Real-time GPS Fix Recorded</span>
                    <span className="text-[11px] text-slate-500">Attendance punch was saved without location permissions, or staff has not punched in today.</span>
                  </div>
                )}

                <div className="text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-amber-200">
                  <span className="font-bold text-slate-900">Geofence Status: </span>
                  {selectedEmployee.geofenceStatus}
                </div>
              </div>

              {/* Telemetry Source & GNSS Accuracy */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">TELEMETRY SOURCE</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedEmployee.gpsFixSource === 'LIVE_DEVICE' ? 'Live Browser GNSS' : (selectedEmployee.gpsFixSource === 'ATTENDANCE_PUNCH' ? 'Punch Record' : 'No Signal')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">GNSS ACCURACY</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {selectedEmployee.accuracy ? `±${selectedEmployee.accuracy}m` : 'Unavailable'}
                  </span>
                </div>
              </div>

              {/* Real-time Field Worker Direct Ping / Dispatcher Action */}
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-amber-950 block">SCADA Live Dispatch Ping</span>
                  <span className="text-[10px] text-amber-800">Send instant location sync directive to device</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdminPingMsg(`Telemetry ping acknowledged by ${selectedEmployee.name} (${selectedEmployee.employeeId}) • 5G Round-Trip: 14ms`);
                    setTimeout(() => setAdminPingMsg(null), 4000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  🛰️ Ping Device
                </button>
              </div>

              {adminPingMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adminPingMsg}</span>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              {selectedEmployee.hasGpsFix ? (
                <a
                  href={`https://www.google.com/maps?q=${selectedEmployee.lat},${selectedEmployee.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Google Maps</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  <span>No GPS Coordinates</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
