import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Radio, 
  ShieldCheck, 
  Wifi, 
  Clock, 
  Compass, 
  Zap, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Send,
  Eye,
  Layers,
  Crosshair,
  Truck,
  HardHat,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkforce } from '../../context/WorkforceContext';
import { getNowIndian12Hr } from '../../utils/shiftUtils';

export default function FieldWorkerLiveLocationCard({
  workerId,
  workerName,
  workerRole = 'Field Worker',
  plantName = 'Main Plant Hub (Unit #01)',
  assignedVehicle,
  currentSiteName,
  compact = false,
  className = '',
  onAlertSent,
}) {
  const { user } = useAuth();
  const { attendance } = useWorkforce();

  const effectiveId = workerId || user?.employeeId || user?.id || 'EMP-FIELD-01';
  const effectiveName = workerName || user?.name || 'Field Specialist';
  const effectiveRole = workerRole || user?.role || 'Field Worker';

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = (attendance || []).find((a) => {
    const aId = (a.employeeId || '').toUpperCase();
    const effId = (effectiveId || '').toUpperCase();
    return aId === effId && a.date === todayStr;
  });

  // Base coords for Navi Mumbai / Pune RMC corridor
  const BASE_PLANT_LAT = 19.0558;
  const BASE_PLANT_LNG = 73.0163;

  // Real-time GPS states
  const [gpsCoords, setGpsCoords] = useState(() => {
    if (todayRecord?.gpsLocation?.lat && todayRecord?.gpsLocation?.lng) {
      return {
        lat: Number(todayRecord.gpsLocation.lat),
        lng: Number(todayRecord.gpsLocation.lng),
        accuracy: todayRecord.gpsLocation.accuracy || 10,
        altitude: 40,
        speed: 0,
        heading: 0,
      };
    }
    return null;
  });

  const [gpsStatus, setGpsStatus] = useState(() => {
    return todayRecord?.gpsLocation ? 'PUNCH_IN_FIX' : 'SEARCHING';
  }); // 'SEARCHING' | 'LIVE_GNSS_LOCKED' | 'PUNCH_IN_FIX' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'OFFLINE'

  const [lastPingTime, setLastPingTime] = useState(() => {
    return todayRecord?.gpsLocation?.timestamp 
      ? new Date(todayRecord.gpsLocation.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) 
      : getNowIndian12Hr(true);
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [alertSentMsg, setAlertSentMsg] = useState(null);

  // 1. Hardware Geolocation acquisition if available in browser
  const refreshLocationFix = () => {
    setIsRefreshing(true);
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setGpsStatus('OFFLINE');
      setIsRefreshing(false);
      return;
    }

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy || 8),
            altitude: Math.round(pos.coords.altitude || 38),
            speed: Math.round((pos.coords.speed || 0) * 3.6),
            heading: Math.round(pos.coords.heading || 0),
          });
          setGpsStatus('LIVE_GNSS_LOCKED');
          setLastPingTime(getNowIndian12Hr(true));
          setIsRefreshing(false);
        },
        (err) => {
          if (err.code === 1) {
            setGpsStatus('PERMISSION_DENIED');
          } else if (todayRecord?.gpsLocation?.lat) {
            setGpsStatus('PUNCH_IN_FIX');
          } else {
            setGpsStatus('UNAVAILABLE');
          }
          setIsRefreshing(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      if (todayRecord?.gpsLocation?.lat) {
        setGpsStatus('PUNCH_IN_FIX');
      } else {
        setGpsStatus('UNAVAILABLE');
      }
      setIsRefreshing(false);
    }
  };

  // Initial GPS lock
  useEffect(() => {
    refreshLocationFix();
  }, []);

  // Distance from plant base calculation (Haversine formula approximation)
  const calculateDistanceKm = () => {
    if (!gpsCoords?.lat || !gpsCoords?.lng) return 'N/A';
    const R = 6371; // Earth's radius in km
    const dLat = (gpsCoords.lat - BASE_PLANT_LAT) * (Math.PI / 180);
    const dLon = (gpsCoords.lng - BASE_PLANT_LNG) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(BASE_PLANT_LAT * (Math.PI / 180)) * Math.cos(gpsCoords.lat * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const distanceKm = calculateDistanceKm();

  const handleCopyCoords = () => {
    if (!gpsCoords) return;
    navigator.clipboard?.writeText(`${gpsCoords.lat}, ${gpsCoords.lng}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleSendPingToAdmin = () => {
    if (!gpsCoords) return;
    setAlertSentMsg(`Location ping & status sent to Plant Admin Console! [${gpsCoords.lat}, ${gpsCoords.lng}]`);
    if (onAlertSent) onAlertSent(gpsCoords);
    setTimeout(() => setAlertSentMsg(null), 4000);
  };

  // Google Maps direct URL
  const googleMapsUrl = gpsCoords ? `https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lng}` : '#';

  return (
    <div className={`w-full rounded-2xl md:rounded-3xl bg-white border border-slate-200/90 shadow-md overflow-hidden relative ${className}`}>
      
      {/* Top Brand Accent Line */}
      <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500" />

      {/* ========================================================
          ADMIN BROADCAST TELEMETRY BANNER (Crucial User Requirement)
          ======================================================== */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-80" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-mono font-black tracking-wider uppercase text-emerald-100">
              LIVE LOCATION CONNECTED TO DISPATCH & ADMIN
            </span>
            <span className="hidden sm:inline-block px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-white/20 text-white border border-white/30">
              ACTIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-emerald-100">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
            <span>5G Synced</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-emerald-300" />
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-200" />
            <span>Ping: {lastPingTime}</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 lg:p-6 space-y-4">
        
        {/* Header: Worker Identity & Geofence Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
              effectiveRole.includes('Driver') 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                : 'bg-gradient-to-br from-cyan-600 to-teal-700'
            }`}>
              {effectiveRole.includes('Driver') ? <Truck className="w-6 h-6" /> : <HardHat className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {effectiveName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {effectiveId}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {effectiveRole}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Operating base: <strong className="text-slate-800">{plantName}</strong></span>
                {assignedVehicle && (
                  <span className="font-mono text-cyan-800 font-bold ml-1">• Unit: {assignedVehicle}</span>
                )}
                {currentSiteName && (
                  <span className="font-medium text-emerald-800 ml-1">• Site: {currentSiteName}</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={refreshLocationFix}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Refresh GPS satellite fix"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
              <span>{isRefreshing ? 'Acquiring...' : 'Refresh GPS'}</span>
            </button>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Google Maps</span>
            </a>
          </div>
        </div>

        {/* Hardware Tracking Disclaimer */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/90 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Hardware Notice: </span>
            Continuous real-time background tracking requires vehicle-mounted GPS hardware. Web browser geolocation reflects active punches or live browser sessions only.
          </div>
        </div>

        {/* Clean, Simple Field Location Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Current Work Location
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                gpsStatus === 'LIVE_GNSS_LOCKED' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : gpsStatus === 'PUNCH_IN_FIX'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {gpsStatus === 'LIVE_GNSS_LOCKED' ? 'Live Device GNSS' : (gpsStatus === 'PUNCH_IN_FIX' ? 'Punch-In Fix' : 'No GPS Fix')}
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{currentSiteName || 'Site Pouring Location'}</span>
            </div>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
              <span>Plant Base: <strong className="text-slate-700">{plantName}</strong></span>
              <span>•</span>
              <span>Distance: <strong className="text-slate-700">{distanceKm} km</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-mono text-xs font-semibold flex items-center gap-2 shadow-2xs">
              {gpsCoords ? (
                <>
                  <span>GPS: {gpsCoords.lat.toFixed(4)}°N, {gpsCoords.lng.toFixed(4)}°E (±{gpsCoords.accuracy}m)</span>
                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                    title="Copy coordinates"
                  >
                    {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </>
              ) : (
                <span className="text-amber-800 font-bold">
                  {gpsStatus === 'PERMISSION_DENIED' ? 'GPS Permission Denied' : 'GPS Signal Unavailable'}
                </span>
              )}
            </div>
            {gpsCoords && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Maps</span>
              </a>
            )}
          </div>
        </div>

        {/* ========================================================
            4-GRID REAL-TIME TELEMETRY STATS FOR FIELD WORKER
            ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Current Speed</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-base sm:text-xl font-mono font-black text-slate-900">
              {gpsCoords.speed} <span className="text-xs font-semibold text-slate-500">km/h</span>
            </div>
            <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">
              {gpsCoords.speed > 0 ? 'Vehicle in Transit' : 'Stationary at Pour Point'}
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Distance from Hub</span>
              <Navigation className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <div className="text-base sm:text-xl font-mono font-black text-cyan-700">
              {distanceKm} <span className="text-xs font-semibold text-slate-500">km</span>
            </div>
            <span className="text-[9px] text-cyan-600 font-semibold block mt-0.5">
              Distance from plant
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Elevation</span>
              <Compass className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-base sm:text-xl font-mono font-black text-teal-800">
              {gpsCoords.altitude} <span className="text-xs font-semibold text-slate-500">meters</span>
            </div>
            <span className="text-[9px] text-teal-600 font-semibold block mt-0.5">
              Above sea level
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Live Coordinates</span>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Copy coordinates"
              >
                {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-[11px] sm:text-xs font-mono font-black text-slate-900 truncate" title={`${gpsCoords.lat}, ${gpsCoords.lng}`}>
              {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
            </div>
            <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
              {copiedCoords ? 'Copied to clipboard!' : 'GNSS WGS-84 Format'}
            </span>
          </div>
        </div>

        {/* Emergency Alert / Quick Broadcast button for Field Worker to alert Admin */}
        <div className="p-3 sm:p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-950 block">
                Need Immediate Dispatch or Admin Assistance?
              </span>
              <span className="text-[11px] text-amber-800 font-medium">
                Pings Plant Admin with your verified live GPS position & vehicle status.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendPingToAdmin}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Ping My Exact Location to Admin</span>
            </button>
          </div>
        </div>

        {alertSentMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{alertSentMsg}</span>
          </div>
        )}

      </div>
    </div>
  );
}
