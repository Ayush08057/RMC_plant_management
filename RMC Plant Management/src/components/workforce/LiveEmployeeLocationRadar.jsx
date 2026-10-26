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
  Minimize2,
  ZoomIn,
  ZoomOut,
  Route,
  Share2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { formatToIndian12Hr, parseTimeToMinutes, getNowIndian12Hr } from '../../utils/shiftUtils';
import { subscribeCloudStore } from '../../services/cloudSyncService';
import { resolveSangliLandmark } from '../../utils/sangliGeofence';

export default function LiveEmployeeLocationRadar({ defaultPlant = 'All Plants' }) {
  const { user } = useAuth();
  const { attendance, employees, plants } = useWorkforce();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All'); // 'All' | 'Punched In' | 'Punched Out' | 'Not Checked In'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'drivers' | 'field' | 'plant'
  const [mapDisplayType, setMapDisplayType] = useState('gis'); // 'gis' | 'radar'
  const [adminPingMsg, setAdminPingMsg] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'cards' | 'radar'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [currentTime, setCurrentTime] = useState(getNowIndian12Hr(true));
  const [mapZoom, setMapZoom] = useState(15);
  const [mapSatellite, setMapSatellite] = useState(false);
  const [mapRouteMode, setMapRouteMode] = useState(false);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  // Real Driver Trips from Local & Cloud Store
  const [driverTrips, setDriverTrips] = useState(() => {
    try {
      const saved = localStorage.getItem('rmc_driver_trips_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const unsub = subscribeCloudStore('cloud_driver_trips', 'rmc_driver_trips_v2', [], (cloudTrips) => {
      if (Array.isArray(cloudTrips)) setDriverTrips(cloudTrips);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);
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
        (err) => {
          console.warn('Geolocation watch error:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }

    const timer = setInterval(() => {
      setCurrentTime(getNowIndian12Hr(true));
      setRadarDegree((prev) => (prev + 3) % 360);
    }, 100);

    return () => {
      clearInterval(timer);
      if (watchId && navigator.geolocation) {
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

      // Match real active or recent driver trip
      const isDriver = (emp.role || '').toLowerCase().includes('driver');
      const empNameLower = (emp.name || '').toLowerCase();
      const empIdLower = (emp.employeeId || emp.id || '').toLowerCase();

      const matchedTrip = (driverTrips || []).find((t) => {
        const dName = (t.driverName || '').toLowerCase();
        const dId = (t.driverId || '').toLowerCase();
        return (dId && dId === empIdLower) || (dName && (dName.includes(empNameLower) || empNameLower.includes(dName)));
      }) || (isDriver && driverTrips && driverTrips.length > 0 ? driverTrips[0] : null);

      const activeTrip = matchedTrip ? {
        id: matchedTrip.id,
        vehicleNo: matchedTrip.vehicleNo || 'MH-10-CR-1212',
        clientName: matchedTrip.clientName || 'Sunshine Residency',
        siteName: matchedTrip.siteName || matchedTrip.siteLocation || 'Site #01',
        status: matchedTrip.status || (isPunchedIn ? 'Departed' : 'Completed'),
        distanceKm: matchedTrip.distanceKm || 15.4,
        quantityM3: matchedTrip.quantityM3 || 6.0,
        grade: matchedTrip.grade || 'M25',
        challanNo: matchedTrip.challanNo || 'DC-2026-101',
        startOdometer: matchedTrip.startOdometer || 14250,
        finalOdometer: matchedTrip.finalOdometer || null,
        departureTime: matchedTrip.departureTime || '10:15 AM',
        siteArrivalTime: matchedTrip.siteArrivalTime || null,
        returnTime: matchedTrip.returnTime || null,
        routeLabel: `Plant HQ ➔ ${matchedTrip.siteName || matchedTrip.clientName || 'Site #01'}`,
        googleRouteUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('SM Concrete Tech, Tanang, Sangli')}&destination=${encodeURIComponent((matchedTrip.siteName ? matchedTrip.siteName + ', ' : '') + (matchedTrip.clientName || 'Sangli'))}`,
      } : null;

      const landmark = hasGpsFix ? resolveSangliLandmark(lat, lng) : null;
      let geofenceLabel = 'Plant HQ Zone';
      if (isDriver) {
        if (activeTrip?.status === 'Departed') {
          geofenceLabel = `Highway Transit (${activeTrip.routeLabel})`;
        } else if (activeTrip?.status === 'At Site') {
          geofenceLabel = `At Site: ${activeTrip.siteName}`;
        } else if (activeTrip?.status === 'Returning') {
          geofenceLabel = 'Returning to Plant HQ';
        } else if (isPunchedIn) {
          geofenceLabel = 'Plant Loading Bay';
        } else {
          geofenceLabel = 'Truck Bay / Off Duty';
        }
      } else if (record?.geofenceStatus && !record.geofenceStatus.includes('Plant Batching Geofence')) {
        geofenceLabel = record.geofenceStatus;
      } else if (landmark && landmark.isKnownLandmark) {
        geofenceLabel = landmark.landmarkName;
      } else if ((emp.role || '').toLowerCase().includes('supervisor')) {
        geofenceLabel = isPunchedIn ? 'Site Geofence' : 'Off-Duty';
      } else if (isPunchedIn) {
        geofenceLabel = landmark ? landmark.landmarkName : 'Sangli Operational Zone';
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
        activeTrip,
        isDriver,
      };
    });
  }, [liveTrackedEmployees, attendance, todayStr, realDeviceGps, user, driverTrips]);

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
        (categoryFilter === 'drivers' && item.isDriver) ||
        (categoryFilter === 'field' && isFieldWorker) ||
        (categoryFilter === 'plant' && !isFieldWorker);

      return matchSearch && matchRole && matchStatus && matchCategory;
    });
  }, [telemetryList, searchQuery, selectedRoleFilter, selectedStatusFilter, categoryFilter]);

  // Active target for map focus
  const activeTarget = useMemo(() => {
    if (selectedTargetId) {
      const found = telemetryList.find((t) => t.id === selectedTargetId);
      if (found) return found;
    }
    if (selectedEmployee) {
      const found = telemetryList.find((t) => t.id === selectedEmployee.id);
      if (found) return found;
    }
    return (
      telemetryList.find((t) => t.isDriver && t.hasGpsFix) ||
      telemetryList.find((t) => t.status === 'Punched In' && t.hasGpsFix) ||
      telemetryList.find((t) => t.hasGpsFix) ||
      telemetryList[0] ||
      null
    );
  }, [selectedTargetId, selectedEmployee, telemetryList]);

  // Select employee on map and sync selection
  const handleSelectStaffOnMap = (emp) => {
    setSelectedTargetId(emp.id);
    setSelectedEmployee(emp);
    setMapDisplayType('gis');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      const el = document.getElementById('live-gps-map-container');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
    const driversCount = telemetryList.filter((t) => t.isDriver).length;

    return { total, punchedIn, punchedOut, notCheckedIn, inGeofence, fieldWorkers, driversCount };
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
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Real-Time Workforce & Fleet GPS Radar
                </h2>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Exact live satellite telemetry, driver transit routes & plant geofence monitoring
              </p>
            </div>
          </div>

          {/* Clock & View Switchers */}
          <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-900 border border-cyan-200 font-mono text-xs flex items-center gap-2 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-bold text-slate-800">{currentTime}</span>
              <span className="text-[10px] text-slate-400 font-bold">IST</span>
            </div>

            {/* View Mode Buttons */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => { setViewMode('split'); setIsFullscreenMap(false); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'split' && !isFullscreenMap ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Map + Fleet
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('cards'); setIsFullscreenMap(false); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cards Only
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('radar'); setIsFullscreenMap(true); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'radar' || isFullscreenMap ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full Map
              </button>
            </div>
          </div>
        </div>

        {/* Hardware Tracking Notice Banner */}
        <div className="p-2.5 mb-3 rounded-xl bg-amber-50/70 border border-amber-200/90 flex items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">
              <strong className="font-bold">Hardware Tracking Notice: </strong>
              Live location updates from mobile attendance punches and active vehicle GPS telemetry.
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
            Active GNSS
          </span>
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
              <span className="text-blue-800 font-semibold">
                <span className="font-mono font-bold">{stats.driversCount}</span> Drivers
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-800 font-semibold">
                <span className="font-mono font-bold">{stats.notCheckedIn}</span> Pending
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700 font-semibold">
                <span className="font-mono font-bold">{stats.total}</span> Total
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStatsReduced(false)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer shrink-0"
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
                  Live GPS Tracked Personnel
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200">
                <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
                  <span>Transit Drivers</span>
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono">
                  {stats.driversCount}
                </div>
                <div className="text-[10px] text-blue-700 font-medium mt-0.5">
                  Transit Mixers on Road
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
                  Total Enrolled Fleet
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Target Fleet:</span>
          
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Personnel ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('drivers')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'drivers'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Drivers on Road</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${categoryFilter === 'drivers' ? 'bg-white/30 text-white' : 'bg-blue-200/80 text-blue-900'}`}>
              {stats.driversCount || 0}
            </span>
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
            <span>🚚 Field Staff</span>
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
            <span>🏭 Plant Operators</span>
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
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Punched In">Active Only (Punched In)</option>
              <option value="Punched Out">Punched Out</option>
              <option value="Not Checked In">Not Checked In</option>
            </select>

            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Prominent High-Definition Live GPS Map + Employee Roster */}
      <div className={`grid gap-4.5 ${
        isFullscreenMap || viewMode === 'radar'
          ? 'grid-cols-1'
          : viewMode === 'split'
            ? 'grid-cols-1 lg:grid-cols-12'
            : 'grid-cols-1'
      }`}>
        
        {/* Prominent High-Definition Live Map Container */}
        {(viewMode === 'split' || viewMode === 'radar' || isFullscreenMap) && (
          <div 
            id="live-gps-map-container"
            className={`${
              isFullscreenMap || viewMode === 'radar'
                ? 'col-span-12 w-full'
                : viewMode === 'split'
                  ? 'lg:col-span-7 xl:col-span-7'
                  : 'w-full'
            } bg-white text-slate-900 border border-slate-200/90 shadow-md rounded-2xl p-3.5 sm:p-4.5 relative overflow-hidden flex flex-col justify-between transition-all`}
          >
            {/* Top Toolbar: Map Mode, Satellite Toggle, Zoom & Fullscreen Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-tight text-slate-900 uppercase">
                    Live GPS Telemetry & Transit Map
                  </h3>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Tracking: <strong className="text-blue-900 font-bold">{activeTarget?.name || 'Staff Member'}</strong> ({activeTarget?.role || 'Operations'})
                  </div>
                </div>
              </div>

              {/* Map View Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setMapDisplayType('gis')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      mapDisplayType === 'gis' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    GIS Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapDisplayType('radar')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      mapDisplayType === 'radar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Radar Scope
                  </button>
                </div>

                {mapDisplayType === 'gis' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMapSatellite(!mapSatellite)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        mapSatellite
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="Toggle Satellite vs Street Map"
                    >
                      {mapSatellite ? '🛰️ Satellite' : '🗺️ Street'}
                    </button>

                    <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
                        className="p-1 text-slate-700 hover:text-slate-900 rounded cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapZoom((z) => Math.max(12, z - 1))}
                        className="p-1 text-slate-700 hover:text-slate-900 rounded cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFullscreenMap(!isFullscreenMap)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs cursor-pointer"
                      title={isFullscreenMap ? 'Exit Full Width' : 'Expand Full Width'}
                    >
                      {isFullscreenMap ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Interactive Fleet Switcher: 1-Tap Focus on Any Personnel */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar border-b border-slate-100">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 shrink-0">Focus:</span>
              {telemetryList.map((emp) => {
                const isSelected = activeTarget?.id === emp.id;
                const isOnline = emp.status === 'Punched In';
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectStaffOnMap(emp)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs scale-102'
                        : isOnline
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                          : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      emp.isDriver ? 'bg-cyan-400' : isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'
                    }`} />
                    <span className="truncate max-w-[120px]">{emp.name}</span>
                    {emp.geofenceStatus && emp.geofenceStatus.includes('Market Yard') && (
                      <span className="text-[9px] font-mono font-bold px-1 rounded bg-amber-200 text-amber-950">
                        Market Yard
                      </span>
                    )}
                    {emp.isDriver && emp.activeTrip && (
                      <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                        isSelected ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {emp.activeTrip.vehicleNo.split('-').slice(-2).join('-')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Interactive GIS Satellite/Road Map vs Radar Scope */}
            {mapDisplayType === 'gis' ? (
              <div className="relative w-full rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-900 h-[460px] sm:h-[500px] xl:h-[540px]">
                {(() => {
                  const lat = activeTarget?.lat || (realDeviceGps.active ? realDeviceGps.lat : null);
                  const lng = activeTarget?.lng || (realDeviceGps.active ? realDeviceGps.lng : null);

                  if (!lat || !lng) {
                    return (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-300 space-y-3 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                          <MapPin className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="text-sm font-bold text-white">
                          Live GPS Beacon Pending for {activeTarget?.name || 'Staff User'}
                        </div>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Attendance punch was recorded without foreground geolocation permissions, or device is currently offline.
                        </p>

                        {/* Quick switch to personnel with active GPS */}
                        <div className="pt-2 border-t border-slate-800 w-full max-w-md">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-2">
                            Switch to Personnel with Active GPS Signal:
                          </span>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {telemetryList.filter((t) => t.hasGpsFix).map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleSelectStaffOnMap(t)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <MapPin className="w-3 h-3 text-emerald-300" />
                                <span>{t.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Determine iframe URL: Route navigation mode or single pin point
                  const mapUrl = (mapRouteMode && activeTarget?.activeTrip)
                    ? `https://maps.google.com/maps?saddr=${encodeURIComponent('SM Concrete Tech, Tanang, Sangli')}&daddr=${lat},${lng}&output=embed`
                    : `https://maps.google.com/maps?q=${lat},${lng}&z=${mapZoom}${mapSatellite ? '&t=k' : ''}&output=embed`;

                  return (
                    <div className="relative w-full h-full">
                      <iframe
                        title="Real Time Live Location Map"
                        width="100%"
                        height="100%"
                        style={{ border: 0, width: '100%', height: '100%' }}
                        loading="lazy"
                        allowFullScreen
                        src={mapUrl}
                      />

                      {/* Top Overlay HUD: Telemetry Badge */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 bg-white/95 backdrop-blur-md border border-slate-300 text-slate-900 p-2.5 px-3 rounded-xl shadow-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {activeTarget?.selfieUrl ? (
                            <img src={activeTarget.selfieUrl} alt={activeTarget.name} className="w-8 h-8 rounded-full object-cover border-2 border-emerald-400 shrink-0 shadow-xs" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white ${
                              activeTarget?.isDriver ? 'bg-cyan-600' : 'bg-blue-600'
                            }`}>
                              {(activeTarget?.name || 'ST').substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 font-bold truncate text-xs">{activeTarget?.name || 'Staff User'}</span>
                              <span className="text-[10px] text-slate-500 font-semibold truncate hidden sm:inline">• {activeTarget?.role}</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                activeTarget?.status === 'Punched In' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {activeTarget?.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono font-medium flex items-center gap-1.5 truncate">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate">{activeTarget?.geofenceStatus}</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">{lat.toFixed(4)}°N, {lng.toFixed(4)}°E</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono font-bold">
                            {activeTarget?.gpsFixSource === 'LIVE_DEVICE' ? 'Live Device GNSS' : 'Punch Fix'}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-2xs cursor-pointer"
                            title="Open in Google Maps"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Radar Scope Visualizer */
              <div className="relative my-4 aspect-square max-w-[380px] mx-auto w-full flex items-center justify-center">
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
                        onClick={() => handleSelectStaffOnMap(emp)}
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

            {/* Bottom Telemetry Dossier Strip: Special Route Box for Drivers */}
            {activeTarget?.isDriver && activeTarget?.activeTrip && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50/90 border border-blue-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-950 text-xs">Transit Mixer: {activeTarget.activeTrip.vehicleNo}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-600 text-white">
                        {activeTarget.activeTrip.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>Route: <strong className="text-slate-900">{activeTarget.activeTrip.routeLabel}</strong></span>
                      <span>•</span>
                      <span>Destination: <strong className="text-slate-900">{activeTarget.activeTrip.clientName}</strong></span>
                      <span>•</span>
                      <span>Distance: <strong className="font-mono text-blue-800">{activeTarget.activeTrip.distanceKm} km</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={activeTarget.activeTrip.googleRouteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Track Live Route in Google Maps</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setMapRouteMode(!mapRouteMode)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                      mapRouteMode 
                        ? 'bg-amber-500 text-slate-950 border-amber-600' 
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>{mapRouteMode ? 'Single Pin' : 'Route Path'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Non-driver active target location info */}
            {activeTarget && !activeTarget.isDriver && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-700 truncate">
                    <strong className="text-slate-900">{activeTarget.name}</strong> • Landmark: {activeTarget.geofenceStatus}
                  </span>
                </div>
                {activeTarget.hasGpsFix && (
                  <a
                    href={`https://www.google.com/maps?q=${activeTarget.lat},${activeTarget.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 self-start sm:self-auto cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Exact Location</span>
                  </a>
                )}
              </div>
            )}

          </div>
        )}

        {/* Live Employee Telemetry Cards Grid */}
        {(!isFullscreenMap && viewMode !== 'radar') && (
          <div className={`${
            viewMode === 'split' ? 'lg:col-span-5 xl:col-span-5' : 'w-full'
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

            <div className="grid grid-cols-1 gap-2.5">
              {filteredList.map((emp) => {
                const isOnline = emp.status === 'Punched In';
                const isOut = emp.status === 'Punched Out';
                const isExpanded = cardDensity === 'detailed' || expandedCardIds.has(emp.id);
                const isSelectedOnMap = activeTarget?.id === emp.id;

                return (
                  <div
                    key={emp.id}
                    className={`rounded-2xl border transition-all bg-white relative overflow-hidden flex flex-col justify-between ${
                      isExpanded ? 'p-3.5 sm:p-4' : 'p-2.5 sm:p-3'
                    } ${
                      isSelectedOnMap 
                        ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-md bg-blue-50/20' 
                        : isOnline 
                          ? 'border-emerald-300 shadow-xs hover:border-emerald-400' 
                          : isOut 
                            ? 'border-slate-200 hover:border-slate-300' 
                            : 'border-slate-200/70 opacity-80'
                    }`}
                  >
                    {/* Status Color Strip */}
                    <div className={`h-1 absolute top-0 left-0 right-0 ${
                      isSelectedOnMap
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                        : isOnline 
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
                              <img src={emp.selfieUrl} alt={emp.name} className="w-8 h-8 rounded-lg object-cover border border-emerald-400 shrink-0" />
                            ) : (
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 text-white ${
                                emp.isDriver ? 'bg-cyan-600' : isOnline ? 'bg-emerald-600' : 'bg-slate-500'
                              }`}>
                                {emp.avatar || emp.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{emp.name}</h4>
                                {isSelectedOnMap && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-mono">
                                    ON MAP
                                  </span>
                                )}
                              </div>
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

                        {/* Driver Active Trip Compact Strip */}
                        {emp.activeTrip && (
                          <div className="flex items-center justify-between text-[10px] bg-blue-50/90 px-2 py-1.5 rounded-lg border border-blue-200/70 font-medium text-blue-900 gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-bold text-blue-950 shrink-0">{emp.activeTrip.vehicleNo}</span>
                              <span className="text-slate-400">•</span>
                              <span className="truncate text-blue-800 font-semibold">{emp.activeTrip.routeLabel}</span>
                            </div>
                            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-blue-200/80 text-blue-900 font-bold shrink-0">
                              {emp.activeTrip.distanceKm} km
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 gap-2">
                          <div className="flex items-center gap-1 text-slate-600 truncate min-w-0">
                            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="truncate font-medium">{emp.geofenceStatus}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Focus on Map Button */}
                            <button
                              type="button"
                              onClick={() => handleSelectStaffOnMap(emp)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                isSelectedOnMap
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                              }`}
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              <span>{isSelectedOnMap ? 'Viewing' : 'View on Map'}</span>
                            </button>

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
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white ${
                                emp.isDriver ? 'bg-cyan-600' : isOnline ? 'bg-emerald-600' : 'bg-slate-500'
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

                        {/* Driver Active Trip & Route Card */}
                        {emp.activeTrip && (
                          <div className="p-2.5 rounded-xl bg-blue-50/90 border border-blue-200/90 space-y-1.5 my-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-blue-950 flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Mixer {emp.activeTrip.vehicleNo}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-blue-600 text-white">
                                {emp.activeTrip.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-700 flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Route:</span>
                              <strong className="text-slate-900">{emp.activeTrip.routeLabel} ({emp.activeTrip.distanceKm} km)</strong>
                            </div>
                            <div className="text-[11px] text-slate-700 flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Destination:</span>
                              <span className="font-semibold text-slate-900">{emp.activeTrip.clientName} ({emp.activeTrip.siteName})</span>
                            </div>
                            <a
                              href={emp.activeTrip.googleRouteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-1.5 px-2 rounded-lg font-bold text-[11px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs mt-1"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Track Route on Google Maps</span>
                            </a>
                          </div>
                        )}

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
                          <button
                            type="button"
                            onClick={() => handleSelectStaffOnMap(emp)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                          >
                            <MapPin className="w-3 h-3 text-blue-600" />
                            <span>Focus Map</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedEmployee(emp)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>Telemetry Dossier</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        )}

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
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEmployee(null);
          }}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 flex flex-col max-h-[90vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {selectedEmployee.avatar || selectedEmployee.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedEmployee.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono text-amber-700 font-bold">{selectedEmployee.employeeId}</span>
                    <span>•</span>
                    <span>{selectedEmployee.role}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              {/* Status Pill */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700">Duty Status</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                  selectedEmployee.status === 'Punched In'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {selectedEmployee.status}
                </span>
              </div>

              {/* Coordinates & Geofence Box */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between text-amber-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-600" />
                    <span>Real-Time Coordinates</span>
                  </span>
                  <span className="font-mono text-[10px] bg-amber-100 px-2 py-0.5 rounded text-amber-800">
                    {selectedEmployee.gpsFixSource === 'LIVE_DEVICE' ? 'Live Browser GNSS' : (selectedEmployee.hasGpsFix ? 'Punch-In Verified' : 'No Signal')}
                  </span>
                </div>

                {selectedEmployee.hasGpsFix ? (
                  <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                    <div className="p-2 rounded-xl bg-white border border-amber-200">
                      <span className="text-[10px] text-slate-400 block font-sans">LATITUDE</span>
                      <span className="font-bold text-slate-900">{selectedEmployee.lat}° N</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-amber-200">
                      <span className="text-[10px] text-slate-400 block font-sans">LONGITUDE</span>
                      <span className="font-bold text-slate-900">{selectedEmployee.lng}° E</span>
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

                {selectedEmployee.activeTrip && (
                  <div className="p-3.5 rounded-2xl bg-blue-50/90 border border-blue-200/90 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span>Transit Mixer: {selectedEmployee.activeTrip.vehicleNo}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-blue-600 text-white">
                        {selectedEmployee.activeTrip.status}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-blue-200 text-xs space-y-1">
                      <div className="text-slate-600 flex items-center justify-between">
                        <span>Route:</span>
                        <strong className="text-slate-900">{selectedEmployee.activeTrip.routeLabel}</strong>
                      </div>
                      <div className="text-slate-600 flex items-center justify-between">
                        <span>Site Client:</span>
                        <strong className="text-slate-900">{selectedEmployee.activeTrip.clientName} ({selectedEmployee.activeTrip.siteName})</strong>
                      </div>
                      <div className="text-slate-600 flex items-center justify-between">
                        <span>Trip Odometer:</span>
                        <strong className="text-blue-800 font-mono">Start: {selectedEmployee.activeTrip.startOdometer} km ({selectedEmployee.activeTrip.distanceKm} km one-way)</strong>
                      </div>
                    </div>

                    <a
                      href={selectedEmployee.activeTrip.googleRouteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Track Driver Route on Google Maps</span>
                    </a>
                  </div>
                )}
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
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 flex items-center gap-2">
              {selectedEmployee.hasGpsFix ? (
                <a
                  href={`https://www.google.com/maps?q=${selectedEmployee.lat},${selectedEmployee.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Google Maps</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  <span>No GPS Coordinates</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  handleSelectStaffOnMap(selectedEmployee);
                  setSelectedEmployee(null);
                }}
                className="py-2 px-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Show on Map</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
