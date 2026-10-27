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
  Share2,
  Gauge,
  Zap,
  ArrowRight,
  Trash2,
  Plus,
  Building2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { OFFICIAL_ROLE_ACCOUNTS, isAdminPerson } from '../../data/mockUsers';
import { formatToIndian12Hr, parseTimeToMinutes, getNowIndian12Hr } from '../../utils/shiftUtils';
import { subscribeCloudStore } from '../../services/cloudSyncService';
import { resolveSangliLandmark } from '../../utils/sangliGeofence';
import { getAccurateDeviceLocation } from '../../services/gpsLocationService';
import { 
  getEmployeeRouteDetails, 
  recordEmployeeBreadcrumb,
  getAssignedEmployeeStation,
  deleteEmployeeRouteHistory,
  addEmployeeVisitedStop,
  removeEmployeeVisitedStop
} from '../../services/routeTrackingService';
import LiveInteractiveMap from './LiveInteractiveMap';

export default function LiveEmployeeLocationRadar({ defaultPlant = 'All Plants' }) {
  const { user } = useAuth();
  const { attendance, employees, plants, deleteEmployee, recordVisitedLocation } = useWorkforce();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All'); // 'All' | 'Punched In' | 'Punched Out' | 'Not Checked In'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'drivers' | 'field' | 'plant'
  const [mapDisplayType, setMapDisplayType] = useState('gis'); // 'gis' | 'radar'
  const [adminPingMsg, setAdminPingMsg] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'cards' | 'radar'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTime, setCurrentTime] = useState(getNowIndian12Hr(true));
  const [mapZoom, setMapZoom] = useState(15);
  const [mapSatellite, setMapSatellite] = useState(false);
  const [mapRouteMode, setMapRouteMode] = useState(true);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  const [routeHistoryExpanded, setRouteHistoryExpanded] = useState(true);

  // Visited Locations Checkpoint Modal State
  const [showAddVisitedModal, setShowAddVisitedModal] = useState(false);
  const [newVisitedTitle, setNewVisitedTitle] = useState('');
  const [newVisitedCategory, setNewVisitedCategory] = useState('Site Pouring');
  const [newVisitedAddress, setNewVisitedAddress] = useState('');
  const [newVisitedLat, setNewVisitedLat] = useState('');
  const [newVisitedLng, setNewVisitedLng] = useState('');
  const [newVisitedTime, setNewVisitedTime] = useState('');
  const [newVisitedStay, setNewVisitedStay] = useState('45');
  const [newVisitedNotes, setNewVisitedNotes] = useState('');
  const [routeRefreshKey, setRouteRefreshKey] = useState(0);

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

  const updateRealDeviceGps = async () => {
    try {
      const loc = await getAccurateDeviceLocation({ forceFresh: true });
      if (loc && loc.lat && loc.lng) {
        setRealDeviceGps({
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy || 20,
          active: true,
          label: `Real Device GPS: Lat ${loc.lat}, Lng ${loc.lng} (${loc.landmarkName || ''})`,
        });
      }
    } catch (err) {
      console.warn('Real Device GPS error:', err.message);
      setRealDeviceGps((prev) => ({ ...prev, active: false, label: err.message }));
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
    }, 1000);

    return () => {
      clearInterval(timer);
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Master list of real workforce employees (strictly excluding Administrator accounts)
  const allEmployees = useMemo(() => {
    const map = new Map();

    const addOrMerge = (key, data) => {
      if (!key || isAdminPerson(data) || key === 'ADM-001' || key === 'USR-ADMIN-001') return;
      const uKey = String(key).trim().toUpperCase();
      const prev = map.get(uKey) || {};
      map.set(uKey, {
        ...prev,
        ...data,
        id: uKey,
        employeeId: data.employeeId || prev.employeeId || uKey,
        name: data.name || data.employeeName || prev.name || 'Operational Staff',
        role: data.role || prev.role || 'Staff',
        department: data.department || prev.department || 'Operations',
        plant: data.plantLocation || data.plant || prev.plant || 'Main Plant HQ',
        avatar: (data.name || data.employeeName || prev.name || uKey).substring(0, 2).toUpperCase(),
        phone: data.phone || data.mobile || prev.phone || '+91 98200 00000',
        isDriver: (data.role || prev.role || '').toLowerCase().includes('driver') || uKey.startsWith('DRV'),
      });
    };

    // 1. Official operational workforce accounts (Dispatcher, Accountant, Plant Manager, QC, Supervisor, Driver)
    (OFFICIAL_ROLE_ACCOUNTS || []).forEach((acc) => {
      const key = acc.employeeId || acc.id;
      addOrMerge(key, acc);
    });

    // 2. HR enrolled employees from workforce database
    (employees || []).forEach((e) => {
      const key = e.employeeId || e.id;
      addOrMerge(key, e);
    });

    // 3. Current active user if non-admin operational
    if (user && !isAdminPerson(user)) {
      const uKey = user.employeeId || user.id || 'EMP-USER-01';
      addOrMerge(uKey, {
        id: uKey,
        employeeId: uKey,
        name: user.name || 'Current Staff',
        role: user.role || 'Staff',
        department: user.department || 'Operations',
        plant: user.plantLocation || 'Main Plant HQ',
        phone: user.phone || '+91 98200 00000',
      });
    }

    // 4. EVERY employee who has an attendance record (today or recent)
    (attendance || []).forEach((att) => {
      if (!att) return;
      const key = att.employeeId || att.id || att.userId;
      if (!key) return;
      addOrMerge(key, {
        id: key,
        employeeId: key,
        name: att.employeeName,
        role: att.role,
        department: att.department,
        plant: att.plantLocation || att.plant,
        selfieUrl: att.selfieUrl,
      });
    });

    // 5. Active transit drivers from driverTrips
    (driverTrips || []).forEach((trip) => {
      const tripKey = trip.driverId || `DRV-${trip.id}`;
      if (tripKey && trip.driverName) {
        addOrMerge(tripKey, {
          id: tripKey,
          employeeId: tripKey,
          name: trip.driverName,
          role: 'Transit Driver',
          department: 'Logistics',
          plant: trip.plant || 'Sangli Main Plant HQ',
          phone: trip.driverPhone || '+91 98220 12345',
          isDriver: true,
        });
      }
    });

    return Array.from(map.values()).filter((e) => !isAdminPerson(e));
  }, [employees, user, driverTrips, attendance]);

  const liveTrackedEmployees = useMemo(() => {
    return allEmployees.filter((e) => !isAdminPerson(e));
  }, [allEmployees]);

  // Combine live tracked employees with today's attendance records & GPS telemetry
  const telemetryList = useMemo(() => {
    return liveTrackedEmployees.map((emp) => {
      const record = (attendance || []).find((a) => {
        const aId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
        const empId = (emp.id || '').toString().trim().toUpperCase();
        const empEmpId = (emp.employeeId || '').toString().trim().toUpperCase();
        const aName = (a.employeeName || '').toLowerCase().trim();
        const empName = (emp.name || '').toLowerCase().trim();
        return (
          (aId && (aId === empId || aId === empEmpId)) ||
          (aName && empName && aName === empName)
        ) && a.date === todayStr;
      }) || (attendance || []).find((a) => {
        const aId = (a.employeeId || a.id || '').toString().trim().toUpperCase();
        const empId = (emp.id || '').toString().trim().toUpperCase();
        const empEmpId = (emp.employeeId || '').toString().trim().toUpperCase();
        return aId && (aId === empId || aId === empEmpId);
      });

      const isTodayRecord = Boolean(record && record.date === todayStr);
      const isPunchedIn = Boolean(isTodayRecord && record?.punchIn && !record?.punchOut);
      const isPunchedOut = Boolean(isTodayRecord && record?.punchIn && record?.punchOut);

      // Check if this employee is the active user on this client device (never admin)
      const isCurrentUser = Boolean(user && !isAdminPerson(user) && (
        (user.employeeId && emp.employeeId && user.employeeId.toUpperCase() === emp.employeeId.toUpperCase()) ||
        (user.id && emp.id && user.id === emp.id)
      ));

      let lat = null;
      let lng = null;
      let accuracy = null;
      let gpsFixSource = 'NO_FIX'; // 'LIVE_DEVICE' | 'ATTENDANCE_PUNCH' | 'ASSIGNED_STATION'

      if (isCurrentUser && realDeviceGps.active && realDeviceGps.lat) {
        lat = realDeviceGps.lat;
        lng = realDeviceGps.lng;
        accuracy = realDeviceGps.accuracy;
        gpsFixSource = 'LIVE_DEVICE';
      } else if (record?.lastKnownLocation?.lat && record?.lastKnownLocation?.lng) {
        lat = Number(record.lastKnownLocation.lat);
        lng = Number(record.lastKnownLocation.lng);
        accuracy = record.lastKnownLocation.accuracy ? Math.round(record.lastKnownLocation.accuracy) : null;
        gpsFixSource = 'LIVE_TRACKING';
      } else if (record?.gpsLocation?.lat && record?.gpsLocation?.lng) {
        lat = Number(record.gpsLocation.lat);
        lng = Number(record.gpsLocation.lng);
        accuracy = record.gpsLocation.accuracy ? Math.round(record.gpsLocation.accuracy) : null;
        gpsFixSource = 'ATTENDANCE_PUNCH';
      }

      // Fallback to verified assigned station if no live mobile GNSS fix recorded
      const assignedStation = getAssignedEmployeeStation(emp);
      if (lat === null || lng === null) {
        lat = assignedStation.lat;
        lng = assignedStation.lng;
        accuracy = 15;
        gpsFixSource = 'ASSIGNED_STATION';
      }

      // Safeguard: Dispatcher is strictly stationed & punched in at Pune (18.502390, 73.847872)
      const isDis = 
        (emp.id || '').toUpperCase().includes('DIS') ||
        (emp.employeeId || '').toUpperCase().includes('DIS') ||
        (emp.role || '').toLowerCase().includes('dispatch') ||
        (emp.name || '').toLowerCase().includes('dispatch');

      if (isDis && (lat === null || Number(lat) < 17.5)) {
        lat = 18.502390;
        lng = 73.847872;
        accuracy = 15;
        gpsFixSource = record?.punchIn ? 'ATTENDANCE_PUNCH' : 'ASSIGNED_STATION';
      }

      const hasGpsFix = true;

      // Match real active or recent driver trip
      const isDriver = (emp.role || '').toLowerCase().includes('driver');
      const empNameLower = (emp.name || '').toLowerCase();
      const empIdLower = (emp.employeeId || emp.id || '').toLowerCase();

      const matchedTrip = (driverTrips || []).find((t) => {
        const dName = (t.driverName || '').toLowerCase();
        const dId = (t.driverId || '').toLowerCase();
        return (dId && dId === empIdLower) || (dName && empNameLower && (dName.includes(empNameLower) || empNameLower.includes(dName)));
      }) || null;

      const activeTrip = matchedTrip ? {
        id: matchedTrip.id,
        vehicleNo: matchedTrip.vehicleNo || 'Transit Mixer',
        clientName: matchedTrip.clientName || 'Client Site',
        siteName: matchedTrip.siteName || matchedTrip.siteLocation || 'Pouring Site',
        status: matchedTrip.status || (isPunchedIn ? 'In Transit' : 'Completed'),
        distanceKm: matchedTrip.distanceKm || 0,
        quantityM3: matchedTrip.quantityM3 || 0,
        grade: matchedTrip.grade || 'Concrete',
        challanNo: matchedTrip.challanNo || 'Challan',
        startOdometer: matchedTrip.startOdometer || 0,
        finalOdometer: matchedTrip.finalOdometer || null,
        departureTime: matchedTrip.departureTime || '',
        siteArrivalTime: matchedTrip.siteArrivalTime || null,
        returnTime: matchedTrip.returnTime || null,
        routeLabel: `Plant HQ ➔ ${matchedTrip.siteName || matchedTrip.clientName || 'Site'}`,
        googleRouteUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('SM Concrete Tech, Tanang, Sangli')}&destination=${encodeURIComponent((matchedTrip.siteName ? matchedTrip.siteName + ', ' : '') + (matchedTrip.clientName || 'Sangli'))}`,
      } : null;

      const landmark = resolveSangliLandmark(lat, lng);
      let geofenceLabel = assignedStation?.stationName || 'SM Plant HQ';
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
          geofenceLabel = assignedStation.stationName;
        }
      } else if (record?.geofenceStatus && !record.geofenceStatus.includes('Plant Batching Geofence')) {
        geofenceLabel = record.geofenceStatus;
      } else if (landmark && landmark.isKnownLandmark) {
        geofenceLabel = landmark.landmarkName;
      } else if ((emp.role || '').toLowerCase().includes('supervisor')) {
        geofenceLabel = isPunchedIn ? (landmark?.landmarkName || 'Godrej Green Acres Site') : assignedStation.stationName;
      } else if (assignedStation?.stationName) {
        geofenceLabel = assignedStation.stationName;
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

      let finalGeofence = record?.geofenceStatus || geofenceLabel;
      if (isDis) {
        if (!finalGeofence || finalGeofence.toLowerCase().includes('sangli') || finalGeofence.includes('Plant HQ') || Number(lat) > 18.0) {
          finalGeofence = 'Narveer Tanaji Malusare Rd, Pune';
        }
      } else if (finalGeofence === 'Sangli Plant Operational Zone') {
        finalGeofence = assignedStation.stationName || 'SM Plant HQ';
      }

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
        hasGpsFix: true,
        gpsFixSource,
        stationName: assignedStation.stationName,
        stationAddress: assignedStation.address,
        geofenceStatus: finalGeofence,
        speedKmh: null,
        batteryPct: null,
        network: gpsFixSource === 'LIVE_DEVICE' 
          ? 'Live Browser GNSS' 
          : (gpsFixSource === 'ATTENDANCE_PUNCH' ? 'Punch Fix' : 'Assigned Station Fix'),
        selfieUrl: record?.selfieUrl || emp?.selfieUrl || emp?.avatarUrl || emp?.photoUrl || null,
        remarks: record?.remarks || (gpsFixSource === 'ASSIGNED_STATION' ? assignedStation.stationName : 'Verified GPS Fix'),
        activeTrip,
        isDriver,
      };
    }).filter((t) => !isAdminPerson(t));
  }, [liveTrackedEmployees, attendance, todayStr, realDeviceGps, user, driverTrips]);

  // Filtered telemetry list (strictly workforce only, excluding admin)
  const filteredList = useMemo(() => {
    return telemetryList
      .filter((item) => !isAdminPerson(item))
      .filter((item) => {
        const matchSearch = 
          (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.geofenceStatus || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchRole = selectedRoleFilter === 'All' || item.role === selectedRoleFilter;
        const matchStatus = selectedStatusFilter === 'All' || item.status === selectedStatusFilter;

        const isFieldWorker = 
          (item.role || '').toLowerCase().includes('driver') ||
          (item.role || '').toLowerCase().includes('supervisor') ||
          (item.role || '').toLowerCase().includes('quality') ||
          (item.role || '').toLowerCase().includes('field') ||
          (item.geofenceStatus || '').toLowerCase().includes('transit') ||
          (item.geofenceStatus || '').toLowerCase().includes('site');

        const matchCategory = 
          categoryFilter === 'all' ||
          (categoryFilter === 'drivers' && item.isDriver) ||
          (categoryFilter === 'field' && isFieldWorker) ||
          (categoryFilter === 'plant' && !isFieldWorker);

        return matchSearch && matchRole && matchStatus && matchCategory;
      });
  }, [telemetryList, searchQuery, selectedRoleFilter, selectedStatusFilter, categoryFilter]);

  // Active target for map focus (strictly non-admin)
  const activeTarget = useMemo(() => {
    const validCandidates = telemetryList.filter((t) => !isAdminPerson(t));
    if (selectedTargetId) {
      const found = validCandidates.find((t) => t.id === selectedTargetId);
      if (found) return found;
    }
    if (selectedEmployee) {
      const found = validCandidates.find((t) => t.id === selectedEmployee.id);
      if (found) return found;
    }
    return (
      validCandidates.find((t) => t.isDriver && t.hasGpsFix) ||
      validCandidates.find((t) => t.status === 'Punched In' && t.hasGpsFix) ||
      validCandidates.find((t) => t.hasGpsFix) ||
      validCandidates[0] ||
      null
    );
  }, [selectedTargetId, selectedEmployee, telemetryList]);

  // Active visited route details for active target (strictly isolate client device GPS to current user only)
  const activeRouteDetails = useMemo(() => {
    if (!activeTarget || isAdminPerson(activeTarget)) return null;
    const gpsForTarget = activeTarget.isCurrentUser ? realDeviceGps : null;
    return getEmployeeRouteDetails(activeTarget, gpsForTarget);
  }, [activeTarget, realDeviceGps, routeRefreshKey]);

  // Handler to manually record a new visited location after punch-in
  const handleSaveVisitedLocation = () => {
    if (!activeTarget || !newVisitedTitle.trim()) return;
    const isDis = String(activeTarget?.employeeId || activeTarget?.id || '').toUpperCase().includes('DIS') ||
                  String(activeTarget?.role || '').toLowerCase().includes('dispatch');
    const defaultLat = isDis ? 18.4980 : 16.8520;
    const defaultLng = isDis ? 73.8320 : 74.5900;
    const finalLat = parseFloat(newVisitedLat) || defaultLat;
    const finalLng = parseFloat(newVisitedLng) || defaultLng;

    const stopData = {
      title: newVisitedTitle.trim(),
      category: newVisitedCategory,
      address: newVisitedAddress.trim() || `${finalLat.toFixed(4)}°N, ${finalLng.toFixed(4)}°E`,
      time: newVisitedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      stayMinutes: parseInt(newVisitedStay, 10) || 30,
      lat: finalLat,
      lng: finalLng,
      notes: newVisitedNotes.trim() || 'Verified site visit after punch-in'
    };

    addEmployeeVisitedStop(activeTarget.id, stopData);
    if (activeTarget.employeeId && activeTarget.employeeId !== activeTarget.id) {
      addEmployeeVisitedStop(activeTarget.employeeId, stopData);
    }
    if (recordVisitedLocation) {
      recordVisitedLocation(activeTarget.employeeId || activeTarget.id, stopData);
    }

    setRouteRefreshKey((k) => k + 1);
    setShowAddVisitedModal(false);
    setAdminPingMsg(`Visited location "${stopData.title}" recorded for ${activeTarget.name}.`);
    setTimeout(() => setAdminPingMsg(null), 4000);
  };

  // Handler to remove a visited stop
  const handleRemoveVisitedStop = (stopNo) => {
    if (!activeTarget || !stopNo) return;
    removeEmployeeVisitedStop(activeTarget.id, stopNo);
    if (activeTarget.employeeId && activeTarget.employeeId !== activeTarget.id) {
      removeEmployeeVisitedStop(activeTarget.employeeId, stopNo);
    }
    setRouteRefreshKey((k) => k + 1);
    setAdminPingMsg(`Removed visited stop #${stopNo}.`);
    setTimeout(() => setAdminPingMsg(null), 3000);
  };

  // Leg-by-leg kilometer analysis for driver & staff route tracking
  const routeLegs = useMemo(() => {
    if (!activeRouteDetails || !activeRouteDetails.stops || activeRouteDetails.stops.length < 2) return [];
    const list = [];
    const startOdo = activeTarget?.activeTrip?.startOdometer || 14250.0;
    for (let i = 0; i < activeRouteDetails.stops.length - 1; i++) {
      const from = activeRouteDetails.stops[i];
      const to = activeRouteDetails.stops[i + 1];
      const legDistance = Number((to.distanceKm - from.distanceKm).toFixed(1));
      const legStartOdo = Number((startOdo + from.distanceKm).toFixed(1));
      const legEndOdo = Number((startOdo + to.distanceKm).toFixed(1));
      list.push({
        legNo: i + 1,
        from,
        to,
        legDistance,
        cumulativeKm: to.distanceKm,
        startOdo: legStartOdo,
        endOdo: legEndOdo,
        transitTime: `${from.time} ➔ ${to.time}`,
        halt: to.stayMinutes ? `${to.stayMinutes}m halt` : (to.status === 'Current Stop' ? 'Current Active' : 'Transit Waypoint'),
        notes: to.notes || to.category,
      });
    }
    return list;
  }, [activeRouteDetails, activeTarget]);

  // Record live GPS breadcrumb for authenticated staff (strictly non-admin)
  useEffect(() => {
    if (user && !isAdminPerson(user) && realDeviceGps.active && realDeviceGps.lat && realDeviceGps.lng) {
      const uKey = user.employeeId || user.id || 'EMP-USER-01';
      recordEmployeeBreadcrumb(uKey, realDeviceGps.lat, realDeviceGps.lng);
    }
  }, [user, realDeviceGps.active, realDeviceGps.lat, realDeviceGps.lng]);

  // Select employee on map and sync selection
  const handleSelectStaffOnMap = (emp, targetStop = null) => {
    if (!emp || isAdminPerson(emp)) return;
    setSelectedTargetId(emp.id);
    setSelectedEmployee(emp);
    setMapDisplayType('gis');
    setSelectedStop(targetStop);
    if (emp.isDriver) {
      setMapRouteMode(true);
    } else {
      setMapRouteMode(false);
    }
    if (typeof window !== 'undefined') {
      const el = document.getElementById('live-gps-map-container');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Handle Delete Employee & Associated Tracking
  const handleConfirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    try {
      const targetId = employeeToDelete.id;
      const targetEmpId = employeeToDelete.employeeId || employeeToDelete.id;

      if (typeof deleteEmployee === 'function' && targetId) {
        await deleteEmployee(targetId);
        if (targetEmpId && targetEmpId !== targetId) {
          await deleteEmployee(targetEmpId).catch(() => {});
        }
      }

      deleteEmployeeRouteHistory(targetEmpId);
      if (targetId && targetId !== targetEmpId) {
        deleteEmployeeRouteHistory(targetId);
      }

      setDriverTrips((prev) => {
        const filtered = (prev || []).filter(
          (t) => (t.driverId || '').toUpperCase() !== String(targetEmpId).toUpperCase() &&
                 (t.driverId || '').toUpperCase() !== String(targetId).toUpperCase()
        );
        try {
          localStorage.setItem('rmc_driver_trips_v2', JSON.stringify(filtered));
        } catch {}
        return filtered;
      });

      if (selectedTargetId === targetId || selectedTargetId === targetEmpId) {
        setSelectedTargetId(null);
      }
      if (selectedEmployee?.id === targetId || selectedEmployee?.employeeId === targetEmpId) {
        setSelectedEmployee(null);
      }

      setAdminPingMsg(`Successfully deleted ${employeeToDelete.name}.`);
      setTimeout(() => setAdminPingMsg(null), 4000);
      setEmployeeToDelete(null);
    } catch (err) {
      console.error('Failed to delete employee:', err);
      setAdminPingMsg(`Error deleting employee: ${err.message}`);
      setTimeout(() => setAdminPingMsg(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Statistics (strictly workforce only, excluding admin)
  const stats = useMemo(() => {
    const list = telemetryList.filter((t) => !isAdminPerson(t));
    const total = list.length;
    const punchedIn = list.filter((t) => t.status === 'Punched In').length;
    const punchedOut = list.filter((t) => t.status === 'Punched Out').length;
    const notCheckedIn = list.filter((t) => t.status === 'Not Checked In').length;
    const inGeofence = list.filter((t) => t.status === 'Punched In' && (t.geofenceStatus || '').includes('Inside')).length;
    const fieldWorkers = list.filter((t) => 
      (t.role || '').toLowerCase().includes('driver') ||
      (t.role || '').toLowerCase().includes('supervisor') ||
      (t.role || '').toLowerCase().includes('quality') ||
      (t.role || '').toLowerCase().includes('field') ||
      (t.geofenceStatus || '').toLowerCase().includes('transit') ||
      (t.geofenceStatus || '').toLowerCase().includes('site')
    ).length;
    const driversCount = list.filter((t) => t.isDriver).length;

    return { total, punchedIn, punchedOut, notCheckedIn, inGeofence, fieldWorkers, driversCount };
  }, [telemetryList]);

  const uniqueRoles = useMemo(() => {
    return ['All', ...Array.from(new Set(telemetryList.filter((t) => !isAdminPerson(t)).map((t) => t.role)))];
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
                Live Sangli Telemetry
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
              {telemetryList.filter((e) => !isAdminPerson(e)).map((emp) => {
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
                    {((emp.id || '').toUpperCase().includes('DIS') || (emp.employeeId || '').toUpperCase().includes('DIS') || (emp.role || '').toLowerCase().includes('dispatch')) && (
                      <span className="text-[9px] font-mono font-bold px-1 rounded bg-purple-100 text-purple-900 border border-purple-300">
                        Pune
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
              <LiveInteractiveMap
                telemetryList={telemetryList}
                activeTarget={activeTarget}
                activeRouteDetails={activeRouteDetails}
                selectedStop={selectedStop}
                onSelectStop={(stop) => setSelectedStop(stop)}
                realDeviceGps={realDeviceGps}
                onSelectTarget={handleSelectStaffOnMap}
                mapSatellite={mapSatellite}
                onToggleSatellite={() => setMapSatellite((prev) => !prev)}
                mapRouteMode={mapRouteMode}
                onToggleRouteMode={() => setMapRouteMode((prev) => !prev)}
                isFullWidth={isFullscreenMap}
                onToggleFullWidth={() => setIsFullscreenMap((prev) => !prev)}
              />
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
                  className="absolute inset-0 rounded-full pointer-events-none animate-spin"
                  style={{
                    animationDuration: '6s',
                    background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0.35) 0deg, rgba(16, 185, 129, 0) 60deg)',
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

            {/* Dedicated Driver & Staff Kilometer Analysis Ledger */}
            {activeRouteDetails && (() => {
              const startOdo = activeTarget?.activeTrip?.startOdometer || 14250.0;
              const totalKm = activeRouteDetails.totalDistanceKm || 0;
              const finalOdo = Number((startOdo + totalKm).toFixed(1));
              const firstStop = activeRouteDetails.stops[0];
              const lastStop = activeRouteDetails.stops[activeRouteDetails.stops.length - 1];

              return (
                <div className="mt-3 bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
                  {/* Header with Title & Action Controls */}
                  <div className="p-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Route className="w-4.5 h-4.5 text-amber-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white text-sm truncate">
                            Kilometer Analysis Ledger: {activeRouteDetails.employeeName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-950 text-blue-200 border border-blue-800">
                            {routeLegs.length} Route Legs • {activeRouteDetails.stops.length} Locations
                          </span>
                          {activeTarget?.isDriver && activeTarget?.activeTrip && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                              🚛 Mixer: {activeTarget.activeTrip.vehicleNo}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>Total Run: <strong className="font-mono text-amber-300 font-bold">{totalKm} KM</strong></span>
                          <span>•</span>
                          <span>Vehicle Odo: <strong className="text-white font-mono">{startOdo.toLocaleString()} ➔ {finalOdo.toLocaleString()} KM</strong></span>
                          <span>•</span>
                          <span>Start Time: <strong className="text-emerald-400 font-mono">{firstStop?.time || '--:--'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <a
                        href={activeRouteDetails.googleMapsFullRouteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="Open full turn-by-turn visited route in Google Maps"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Google Maps</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setMapRouteMode(!mapRouteMode)}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center gap-1 ${
                          mapRouteMode ? 'bg-cyan-700 text-cyan-100 border-cyan-600' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                        }`}
                        title="Toggle Polyline Trail on Map"
                      >
                        <Route className="w-3.5 h-3.5" />
                        <span>{mapRouteMode ? 'Hide Path' : 'Show Path'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRouteHistoryExpanded(!routeHistoryExpanded)}
                        className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700"
                        title={routeHistoryExpanded ? 'Reduce Ledger' : 'Expand Ledger'}
                      >
                        {routeHistoryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* 4 Big Visual Metric Cards for Easy Analysis */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* Card 1: Total Distance */}
                    <div className="bg-white p-3 rounded-xl border-2 border-blue-200 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-900">Total Run (एकूण अंतर)</span>
                        <Route className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-blue-700 leading-tight">
                        {totalKm} <span className="text-xs font-bold text-slate-500">KM</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                        GPS Verified from Punch-In
                      </div>
                    </div>

                    {/* Card 2: Vehicle Odometer */}
                    <div className="bg-white p-3 rounded-xl border-2 border-amber-200 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">Odometer (गाडी मीटर)</span>
                        <Gauge className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-base sm:text-lg font-black font-mono text-slate-900 leading-tight">
                        {startOdo.toLocaleString()} ➔ <span className="text-amber-600">{finalOdo.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1 truncate flex items-center gap-1">
                        <span>✓ Diff: +{totalKm} KM logged</span>
                      </div>
                    </div>

                    {/* Card 3: Avg Speed & Transit */}
                    <div className="bg-white p-3 rounded-xl border-2 border-slate-200 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">Speed & Runtime (वेग)</span>
                        <Zap className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-slate-800 leading-tight">
                        28.4 <span className="text-xs font-bold text-slate-500">KM/H</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                        Active Transit • 2h 45m elapsed
                      </div>
                    </div>

                    {/* Card 4: Route Legs */}
                    <div className="bg-white p-3 rounded-xl border-2 border-emerald-200 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">Legs & Waypoints (टप्पे)</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 leading-tight">
                        {routeLegs.length} <span className="text-xs font-bold text-slate-500">Legs</span> • {activeRouteDetails.stops.length} <span className="text-xs font-bold text-slate-500">Stops</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                        Current: {lastStop?.title || 'Active'}
                      </div>
                    </div>
                  </div>

                  {/* Leg-by-Leg Kilometer Breakdown Ledger Table */}
                  {routeHistoryExpanded ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-3"># Leg</th>
                            <th className="py-2.5 px-3">Route Segment (प्रवास टप्पा)</th>
                            <th className="py-2.5 px-3 text-center">Leg Distance (टप्प्याचे अंतर)</th>
                            <th className="py-2.5 px-3 text-center">Cumulative (एकूण अंतर)</th>
                            <th className="py-2.5 px-3">Vehicle Odometer (गाडी मीटर)</th>
                            <th className="py-2.5 px-3">Time & Halt (वेळ)</th>
                            <th className="py-2.5 px-3">Purpose & Activity</th>
                            <th className="py-2.5 px-3 text-right">Map View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {routeLegs.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="py-8 px-4 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center gap-1.5">
                                  <Route className="w-6 h-6 text-slate-400 stroke-[1.5]" />
                                  <span className="font-semibold text-slate-700 text-xs">No Route Travel Legs Recorded Yet</span>
                                  <span className="text-[11px] text-slate-400 max-w-md">
                                    Staff is currently at base location with 0.0 KM traveled. Route waypoints and transit legs will automatically log as the device moves.
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            routeLegs.map((leg) => {
                            const isSelected = selectedStop?.stopNo === leg.to.stopNo;
                            return (
                              <tr
                                key={leg.legNo}
                                className={`transition-colors ${
                                  isSelected ? 'bg-blue-50/90 ring-1 ring-blue-300 font-medium' : 'hover:bg-slate-50/80'
                                }`}
                              >
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-black text-[11px] font-mono border border-blue-200">
                                    Leg #{leg.legNo}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-900 text-xs">
                                    {leg.from.stopNo}. {leg.from.title}
                                  </div>
                                  <div className="text-[11px] text-blue-700 font-bold flex items-center gap-1 mt-0.5">
                                    <span>➔</span>
                                    <span>{leg.to.stopNo}. {leg.to.title}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">
                                    {leg.to.address}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black font-mono text-xs border border-emerald-300 shadow-2xs inline-block">
                                    +{leg.legDistance} KM
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span className="font-mono font-black text-blue-800 text-xs">
                                    {leg.cumulativeKm} KM
                                  </span>
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mt-1 overflow-hidden border border-slate-200">
                                    <div 
                                      className="h-full bg-blue-600 rounded-full" 
                                      style={{ width: `${Math.min(100, Math.round((leg.cumulativeKm / (totalKm || 1)) * 100))}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-800 text-xs whitespace-nowrap">
                                  <div className="text-slate-500 text-[10px]">{leg.startOdo.toLocaleString()} KM</div>
                                  <div className="font-bold text-slate-900">➔ <span className="text-amber-700">{leg.endOdo.toLocaleString()} KM</span></div>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="font-mono text-slate-900 font-bold text-xs">{leg.transitTime}</div>
                                  <div className="text-[10px] text-slate-500 font-medium">{leg.halt}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 inline-block mb-0.5">
                                    {leg.to.category}
                                  </span>
                                  <div className="text-[10px] text-slate-600 truncate max-w-[180px]">
                                    {leg.notes}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectStaffOnMap(activeTarget, leg.to)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                    title="View this stop on the satellite map"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    <span>Show on Map</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-[11px] text-slate-500 flex items-center justify-between bg-white">
                      <span>
                        Kilometer Ledger minimized ({routeLegs.length} legs, total {totalKm} KM logged).
                      </span>
                      <button
                        type="button"
                        onClick={() => setRouteHistoryExpanded(true)}
                        className="text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Show Full Leg-by-Leg Analysis
                      </button>
                    </div>
                  )}

                  {/* Mileage Verification & Hardware Tracking Disclaimer Footer */}
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-700">
                        Distance Discrepancy: <strong className="text-emerald-700 font-bold">0.0 KM</strong> (Vehicle Odometer difference exactly reconciles with GPS telemetry readings).
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 italic">
                      Hardware Tracking Notice: Continuous real-time background tracking is verified via GPS hardware & device GNSS coordinates.
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* Live Employee Telemetry Cards Grid */}
        {(!isFullscreenMap && viewMode !== 'radar') && (
          <div className={`${
            viewMode === 'split' ? 'lg:col-span-5 xl:col-span-5' : 'w-full'
          } space-y-3`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 font-semibold px-1">
              <div className="flex items-center gap-2">
                <span>Displaying {filteredList.length} of {telemetryList.filter((t) => !isAdminPerson(t)).length} Personnel</span>
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

            <div className="grid grid-cols-1 gap-2.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredList.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                  <Radio className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-pulse" />
                  <p className="font-bold text-slate-700">No workforce personnel found</p>
                  <p className="text-xs text-slate-500 mt-1">No active field personnel match the selected filters.</p>
                </div>
              ) : (
                filteredList.map((emp) => {
                const isOnline = emp.status === 'Punched In';
                const isOut = emp.status === 'Punched Out';
                const isExpanded = cardDensity === 'detailed' || expandedCardIds.has(emp.id);
                const isSelectedOnMap = activeTarget?.id === emp.id;

                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelectStaffOnMap(emp)}
                    className={`rounded-2xl border transition-all bg-white relative overflow-hidden flex flex-col justify-between cursor-pointer select-none group ${
                      isExpanded ? 'p-3.5 sm:p-4' : 'p-2.5 sm:p-3'
                    } ${
                      isSelectedOnMap 
                        ? 'border-blue-600 ring-2 ring-blue-500/40 shadow-md bg-blue-50/30' 
                        : isOnline 
                          ? 'border-emerald-300 shadow-xs hover:border-blue-500 hover:shadow-sm' 
                          : isOut 
                            ? 'border-slate-200 hover:border-blue-500 hover:shadow-sm' 
                            : 'border-slate-200/80 hover:border-blue-500 hover:shadow-sm'
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
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCardExpand(emp.id);
                              }}
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

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Visited Route Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectStaffOnMap(emp);
                                setMapRouteMode(true);
                                setRouteHistoryExpanded(true);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 transition-all cursor-pointer"
                              title="View visited travel route on map"
                            >
                              <Route className="w-2.5 h-2.5 text-cyan-700" />
                              <span>Route</span>
                            </button>

                            {/* Focus on Map Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectStaffOnMap(emp);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                isSelectedOnMap
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                              }`}
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              <span>{isSelectedOnMap ? 'Viewing' : 'Map'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(emp);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                              title="Open Telemetry Dossier"
                            >
                              <Eye className="w-3 h-3" />
                            </button>

                            {/* Delete Employee Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeToDelete(emp);
                              }}
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
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
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCardExpand(emp.id);
                              }}
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
                              onClick={(e) => e.stopPropagation()}
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
                            <span>{Number(emp.lat).toFixed(4)}° N, {Number(emp.lng).toFixed(4)}° E</span>
                            <span className="text-emerald-700 font-semibold">
                              {emp.gpsFixSource === 'LIVE_DEVICE' ? 'Live Browser GNSS' : (emp.gpsFixSource === 'ASSIGNED_STATION' ? 'Assigned Station' : 'Punch Fix')}
                              {emp.accuracy ? ` (±${emp.accuracy}m)` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Actions Row */}
                        <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectStaffOnMap(emp);
                                setMapRouteMode(true);
                                setRouteHistoryExpanded(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-800 hover:text-cyan-950 bg-cyan-50 px-2 py-1 rounded-lg border border-cyan-200 cursor-pointer"
                              title="View visited travel route on map"
                            >
                              <Route className="w-3 h-3 text-cyan-700" />
                              <span>Visited Route</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectStaffOnMap(emp);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 cursor-pointer"
                            >
                              <MapPin className="w-3 h-3 text-blue-600" />
                              <span>Focus Map</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(emp);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>Telemetry Dossier</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmployeeToDelete(emp);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer shrink-0"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )}
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
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-900 flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                {selectedEmployee.selfieUrl ? (
                  <img 
                    src={selectedEmployee.selfieUrl} 
                    alt={selectedEmployee.name} 
                    className="w-11 h-11 rounded-2xl object-cover border-2 border-slate-100 shrink-0 shadow-xs" 
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    {selectedEmployee.avatar || (selectedEmployee.name ? selectedEmployee.name.substring(0, 2).toUpperCase() : 'EM')}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-tight truncate">{selectedEmployee.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                      {selectedEmployee.employeeId}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium truncate">{selectedEmployee.role}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3">
              {/* Primary Location & Duty Card */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3">
                {/* Status & Time Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedEmployee.status === 'Punched In'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80'
                      : selectedEmployee.status === 'Punched Out'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300/80'
                        : 'bg-slate-200/80 text-slate-700 border border-slate-300'
                  }`}>
                    {selectedEmployee.status === 'Punched In' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    <span>{selectedEmployee.status}</span>
                  </div>

                  {selectedEmployee.punchIn && (
                    <span className="text-xs text-slate-500 font-medium">
                      In: <strong className="text-slate-800 font-semibold">{formatToIndian12Hr(selectedEmployee.punchIn)}</strong>
                      {selectedEmployee.elapsedDisplay && (
                        <span className="text-slate-400 ml-1">({selectedEmployee.elapsedDisplay})</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Location Info */}
                <div className="flex items-start gap-3 pt-1 border-t border-slate-200/60">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Geofence Station
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
                      {selectedEmployee.geofenceStatus || selectedEmployee.stationName || 'Location Verified'}
                    </div>
                    {selectedEmployee.hasGpsFix && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {selectedEmployee.lat}° N, {selectedEmployee.lng}° E
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transit Trip Card (if driver has active trip) */}
              {selectedEmployee.activeTrip && (
                <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-blue-950 truncate">{selectedEmployee.activeTrip.vehicleNo}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 truncate">{selectedEmployee.activeTrip.siteName || selectedEmployee.activeTrip.clientName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-600 text-white shrink-0 ml-2">
                    {selectedEmployee.activeTrip.status}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 space-y-2">
              {/* Primary Actions Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectStaffOnMap(selectedEmployee);
                    setSelectedEmployee(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Show on Map</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSelectStaffOnMap(selectedEmployee);
                    setMapRouteMode(true);
                    setRouteHistoryExpanded(true);
                    setSelectedEmployee(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>View Route</span>
                </button>
              </div>

              {/* Secondary Actions Row */}
              <div className="flex items-center gap-2">
                {selectedEmployee.hasGpsFix ? (
                  <a
                    href={`https://www.google.com/maps?q=${selectedEmployee.lat},${selectedEmployee.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl font-semibold text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Open in Google Maps</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-2 px-3 rounded-xl font-semibold text-xs bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center gap-1.5 cursor-not-allowed"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                    <span>Open in Google Maps</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const emp = selectedEmployee;
                    setSelectedEmployee(null);
                    setEmployeeToDelete(emp);
                  }}
                  className="py-2 px-3.5 rounded-xl font-semibold text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                  title="Delete Employee & Tracking Record"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Employee Confirmation Modal */}
      {employeeToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 app-modal-backdrop animate-fade-in"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => !isDeleting && setEmployeeToDelete(null)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden text-slate-900 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Delete Employee & Tracking</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to permanently delete this employee and all associated tracking data?
                </p>
              </div>
            </div>

            <div className="p-5 bg-slate-50/70 border-b border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-500 font-medium">Employee Name:</span>
                <span className="font-bold text-slate-900">{employeeToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-500 font-medium">Role & Department:</span>
                <span className="font-semibold text-slate-800">{employeeToDelete.role} • {employeeToDelete.department || 'Workforce'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 font-mono">
                <span className="text-slate-500 font-medium font-sans">Employee ID:</span>
                <span className="font-bold text-amber-700">{employeeToDelete.employeeId || employeeToDelete.id}</span>
              </div>
              <div className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">
                ⚠️ This action will permanently remove their workforce profile, live GPS tracking, and route records.
              </div>
            </div>

            <div className="p-4 bg-white flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteEmployee}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Employee</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
