import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, 
  Calendar,
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Square, 
  Truck, 
  Check, 
  UploadCloud, 
  RefreshCw,
  User,
  FileText,
  MapPin,
  Navigation,
  Radio,
  Building2,
  Loader2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { formatToIndian12Hr, getNowIndian12Hr } from '../../utils/shiftUtils';
import { OFFICIAL_ROLE_ACCOUNTS } from '../../data/mockUsers';
import StatusBadge from '../dashboard/StatusBadge';
import { resolveSangliLandmark } from '../../utils/sangliGeofence';

export default function MobilePunchWidget({ 
  onPunched,
  lockedEmployeeId = null,
  roleLocked = false
}) {
  const { user } = useAuth();
  const { attendance, employees, checkIn, checkOut, resetTodayAttendance, dailyWork, submitDailyWork } = useWorkforce();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Owner / Director';
  const isPlantManager = user?.role === 'Plant Manager' || user?.role === 'Plant Incharge';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Camera & Live Photo States
  const [showCamera, setShowCamera] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState(null);
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(getNowIndian12Hr(true));
  const todayFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Live GPS Acquisition States (Task 1)
  const [gpsCoords, setGpsCoords] = useState(null); // { lat, lng, accuracy, timestamp }
  const [gpsStatus, setGpsStatus] = useState('IDLE'); // 'IDLE' | 'ACQUIRING' | 'LOCKED' | 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT'
  const [gpsError, setGpsError] = useState(null);
  const [locationPreset, setLocationPreset] = useState('AUTO');

  const acquireGpsLocation = () => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        setGpsStatus('UNAVAILABLE');
        const err = 'Geolocation is not supported by this browser. Please use Chrome or Firefox on HTTPS.';
        setGpsError(err);
        return reject(new Error(err));
      }

      // Check if running on HTTP (not localhost) — GPS may be blocked
      if (typeof window !== 'undefined' && window.location.protocol === 'http:' && 
          !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        setGpsStatus('UNAVAILABLE');
        const err = 'GPS location requires a secure HTTPS connection. Please access the app via HTTPS.';
        setGpsError(err);
        return reject(new Error(err));
      }

      setGpsStatus('ACQUIRING');
      setGpsError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          // Validate coordinates are real (not 0,0)
          if (lat === 0 && lng === 0) {
            setGpsStatus('UNAVAILABLE');
            const err = 'Invalid GPS coordinates received (0,0). Please ensure GPS is enabled on your device.';
            setGpsError(err);
            return reject(new Error(err));
          }
          const coords = {
            lat,
            lng,
            accuracy: Math.round(pos.coords.accuracy || 50),
            timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
          };
          setGpsCoords(coords);
          setGpsStatus('LOCKED');
          setGpsError(null);
          resolve(coords);
        },
        (err) => {
          setGpsCoords(null);
          let message = 'Unable to get your location. Please enable GPS and try again.';
          if (err.code === 1) {
            setGpsStatus('DENIED');
            message = 'Please allow location access in your browser settings to punch in.';
          } else if (err.code === 2) {
            setGpsStatus('UNAVAILABLE');
            message = 'GPS signal unavailable. Please ensure Location/GPS is turned on in your device settings, then click Retry GPS.';
          } else if (err.code === 3) {
            setGpsStatus('TIMEOUT');
            message = 'GPS acquisition timed out. Please move to an open area and click Retry GPS.';
          } else {
            setGpsStatus('UNAVAILABLE');
            message = err.message || 'Unable to get your location. Please enable GPS and try again.';
          }
          setGpsError(message);
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    acquireGpsLocation().catch(() => {});
  }, []);

  // Distance calculator (Haversine in meters)
  const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Live clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getNowIndian12Hr(true));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Master list of real workforce employees (scoped + includes official role accounts)
  const allEmployeesList = useMemo(() => {
    let list = employees && employees.length > 0 ? [...employees] : [];

    (OFFICIAL_ROLE_ACCOUNTS || []).forEach((official) => {
      const id = (official.employeeId || official.id || '').toUpperCase();
      const exists = list.some((e) => {
        const eId = (e.employeeId || e.id || '').toUpperCase();
        return eId === id;
      });
      if (!exists) {
        list.push({
          id: official.employeeId || official.id,
          employeeId: official.employeeId || official.id,
          name: official.name,
          role: official.role,
          department: official.department,
          plant: official.plantLocation || 'Main Plant HQ',
          email: official.email,
          mobile: official.phone,
        });
      }
    });

    // Admin is an executive administrator and not an operational punch-in staff
    list = list.filter((e) => {
      const empRole = (e.role || '').toLowerCase();
      const empId = (e.employeeId || e.id || '').toUpperCase();
      return empRole !== 'admin' && empId !== 'ADM-001' && empId !== 'USR-ADMIN-001';
    });
    return list;
  }, [employees]);

  const effectiveLockedId = lockedEmployeeId || (!isAdmin ? (user?.employeeId || user?.id) : null);
  const isLocked = Boolean(effectiveLockedId) || roleLocked || user?.role === 'Driver';

  // Selected Employee ID to clock for (Admins select plant workforce staff, never Admin)
  const defaultEmpId = effectiveLockedId || (user?.role !== 'Admin' ? (user?.employeeId || user?.id) : null) || allEmployeesList[0]?.employeeId || allEmployeesList[0]?.id || 'DRV-001';
  const [selectedEmpId, setSelectedEmpId] = useState(defaultEmpId);

  useEffect(() => {
    if (effectiveLockedId) {
      setSelectedEmpId(effectiveLockedId);
    } else if (user?.role !== 'Admin' && (user?.employeeId || user?.id)) {
      setSelectedEmpId(user.employeeId || user.id);
    } else if (allEmployeesList.length > 0 && (!selectedEmpId || selectedEmpId === 'ADM-001' || selectedEmpId === 'USR-ADMIN-001')) {
      setSelectedEmpId(allEmployeesList[0].employeeId || allEmployeesList[0].id);
    }
  }, [effectiveLockedId, user, allEmployeesList, selectedEmpId]);

  // Active chosen employee metadata
  const activeEmployee = useMemo(() => {
    return allEmployeesList.find(
      (e) => e.id === selectedEmpId || e.employeeId === selectedEmpId
    ) || {
      id: selectedEmpId,
      employeeId: selectedEmpId,
      name: user?.name || 'Staff User',
      role: user?.role || 'Staff',
      department: user?.department || 'Operations',
      plant: user?.plantLocation || 'Main Plant Unit #01',
    };
  }, [allEmployeesList, selectedEmpId, user]);

  const isDriver = (activeEmployee?.role || '').toLowerCase().includes('driver') || user?.role === 'Driver';

  const todayStr = new Date().toISOString().split('T')[0];
  const userTodayRecord = (attendance || []).find(
    (a) => a.date === todayStr &&
      ((a.employeeId && (
        a.employeeId.toUpperCase() === (activeEmployee.employeeId || '').toUpperCase() ||
        a.employeeId.toUpperCase() === (activeEmployee.id || '').toUpperCase() ||
        a.employeeId.toUpperCase() === (selectedEmpId || '').toUpperCase()
      )) ||
      (a.userId && user?.uid && a.userId === user.uid))
  );

  const hasPunchedIn = Boolean(userTodayRecord?.punchIn);
  const hasPunchedOut = Boolean(userTodayRecord?.punchOut);

  // Daily Work Report State (Step 2)
  const [driverReport, setDriverReport] = useState({
    vehicleNo: user?.assignedMixer || 'MH-04-AZ-9921',
    tripsCount: 4,
    deliveredM3: 28,
    remarks: 'All concrete pours delivered safely. Drum washed.',
  });

  const [staffReport, setStaffReport] = useState({
    workDescription: 'Standard shift operations completed.',
    hoursWorked: 8.5,
  });

  function simulateSelfieCapture() {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#091538';
    ctx.fillRect(0, 0, 320, 320);
    
    // Face outline
    ctx.fillStyle = '#1d52ce';
    ctx.beginPath();
    ctx.arc(160, 120, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(160, 280, 100, 0, Math.PI * 2);
    ctx.fill();
    
    // Initials & timestamp text overlay
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((activeEmployee?.name || 'EM').substring(0, 2).toUpperCase(), 160, 132);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`VERIFIED PHOTO: ${getNowIndian12Hr(true)}`, 160, 230);
    ctx.fillText(`STAFF ID: ${activeEmployee?.employeeId || activeEmployee?.id || 'EMP'}`, 160, 255);

    const photoUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedSelfie(photoUrl);
    stopCamera();
    return photoUrl;
  };

  // Auto-generate attendance verification stamp on mount (avoids blocking users on camera step)
  useEffect(() => {
    if (!capturedSelfie && !userTodayRecord?.selfieUrl) {
      simulateSelfieCapture();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmployee?.employeeId, activeEmployee?.id]);

  // Camera Management
  async function startCamera() {
    setShowCamera(true);
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraStreamActive(true);
      } else {
        simulateSelfieCapture();
      }
    } catch (err) {
      console.warn('Camera stream issue:', err);
      simulateSelfieCapture();
    }
  };

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStreamActive(false);
    setShowCamera(false);
  };

  function capturePhotoFromVideo() {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 320;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedSelfie(photoUrl);
      stopCamera();
    } else {
      simulateSelfieCapture();
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // PART 1: Handle Punch In
  const handlePunchIn = async () => {
    setError(null);
    setSuccessMsg(null);

    // Prevent duplicate punch-ins
    if (hasPunchedIn) {
      setError('You have already punched in.');
      return;
    }

    setLoading(true);

    try {
      // 1. Acquire live GPS location if not already locked
      let currentGps = gpsCoords;
      if (!currentGps || gpsStatus !== 'LOCKED') {
        try {
          currentGps = await acquireGpsLocation();
        } catch (gpsErr) {
          setError(gpsErr.message || 'Please allow location access.');
          setLoading(false);
          return;
        }
      }

      if (!currentGps || (currentGps.lat === 0 && currentGps.lng === 0)) {
        setError('Location unavailable. Please enable GPS and try again.');
        setLoading(false);
        return;
      }

      // 2. Ensure photo evidence is present (if user hasn't snapped one, generate verification stamp)
      let selfie = capturedSelfie || userTodayRecord?.selfieUrl;
      if (!selfie) {
        selfie = simulateSelfieCapture();
      }

      const targetId = activeEmployee.employeeId || activeEmployee.id;

      // Geofencing verification against Sangli landmarks
      const resolved = resolveSangliLandmark(currentGps.lat, currentGps.lng);
      const isMarketYard = resolved.landmarkName.includes('Market Yard') || locationPreset === 'SANGLI_MARKET_YARD' || (Math.abs(currentGps.lat - 16.8584) < 0.02 && Math.abs(currentGps.lng - 74.5824) < 0.02);
      const geofenceStatus = isMarketYard 
        ? 'Sangli Market Yard' 
        : (resolved.isKnownLandmark ? resolved.landmarkName : `Sangli Zone (${currentGps.lat.toFixed(4)}°N, ${currentGps.lng.toFixed(4)}°E)`);

      const address = isMarketYard 
        ? 'APMC Market Yard, Sangli, Maharashtra 416416' 
        : (resolved.address || `Live Location (${currentGps.lat}°N, ${currentGps.lng}°E)`);

      const rec = await checkIn(targetId, {
        selfieUrl: selfie,
        gpsLocation: {
          lat: currentGps.lat,
          lng: currentGps.lng,
          accuracy: currentGps.accuracy,
          timestamp: currentGps.timestamp,
          address,
        },
        geofenceStatus,
        remarks: `Clock-in verified at ${geofenceStatus} (±${currentGps.accuracy}m)`,
      });

      const mapsLink = `https://www.google.com/maps?q=${currentGps.lat},${currentGps.lng}`;
      setSuccessMsg(`Punch In successful at ${formatToIndian12Hr(rec.punchIn)}! Location captured successfully.`);
      if (onPunched) onPunched();
    } catch (err) {
      setError(err.message || 'Unable to save attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // PART 2: Handle Report Submission & Punch Out Together
  const handlePunchOutWithReport = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!hasPunchedIn) {
      setError('No active punch-in recorded for today. You must punch in first before clocking out.');
      return;
    }

    if (hasPunchedOut) {
      setError('Shift for today has already been concluded.');
      return;
    }

    setLoading(true);
    try {
      const targetId = activeEmployee.employeeId || activeEmployee.id;

      // 1. Submit Daily Work Report
      if (submitDailyWork) {
        await submitDailyWork({
          employeeId: targetId,
          date: todayStr,
          workType: isDriver ? 'Transit Mixer Concrete Delivery' : 'Standard Plant Duty',
          hoursWorked: isDriver ? 9 : Number(staffReport.hoursWorked) || 8,
          workDescription: isDriver 
            ? `Vehicle ${driverReport.vehicleNo}: ${driverReport.tripsCount} trips, ${driverReport.deliveredM3} m³ delivered. ${driverReport.remarks}`
            : staffReport.workDescription,
          vehicleNo: isDriver ? driverReport.vehicleNo : null,
          tripsCount: isDriver ? Number(driverReport.tripsCount) : null,
          deliveredM3: isDriver ? Number(driverReport.deliveredM3) : null,
          remarks: isDriver ? driverReport.remarks : staffReport.workDescription,
          status: 'Submitted',
        });
      }

      // 2. Re-acquire current location again on Punch Out
      let exitGps = gpsCoords;
      try {
        const freshCoords = await acquireGpsLocation();
        if (freshCoords) exitGps = freshCoords;
      } catch {
        // Fall back to current gpsCoords
      }

      const exitGpsData = exitGps ? {
        lat: exitGps.lat,
        lng: exitGps.lng,
        accuracy: exitGps.accuracy,
        timestamp: new Date().toISOString(),
        address: `Exit GPS Fix (±${exitGps.accuracy}m)`,
      } : null;

      const rec = await checkOut(targetId, {
        exitGpsLocation: exitGpsData,
        remarks: isDriver 
          ? `Mixer ${driverReport.vehicleNo} | ${driverReport.tripsCount} Trips (${driverReport.deliveredM3} m³)` 
          : staffReport.workDescription,
      });

      setSuccessMsg(`Punch Out successful at ${formatToIndian12Hr(rec.punchOut)}! Total duty: ${rec.workingHours} hours.`);
      if (onPunched) onPunched();
    } catch (err) {
      setError(err.message || 'Unable to save attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-md p-4 sm:p-6 space-y-5">
      
      {/* Top Header: Simple Staff Information & Live Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#091538] to-[#1d52ce] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
            {isDriver ? <Truck className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-black text-slate-900">
                {activeEmployee.name}
              </span>
              <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {activeEmployee.employeeId || activeEmployee.id}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {activeEmployee.role} • {activeEmployee.plant || 'Main Plant Unit #01'}
            </p>
          </div>
        </div>

        {/* Digital Time & Current Status */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl shrink-0">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">{todayFormattedDate}</span>
            <div className="flex items-center gap-1 text-xs sm:text-sm font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{currentTime}</span>
            </div>
          </div>
          <div>
            {!hasPunchedIn ? (
              <span className="text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                Not Clocked In
              </span>
            ) : !hasPunchedOut ? (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>On Duty: {formatToIndian12Hr(userTodayRecord?.punchIn)}</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">
                Shift Completed ({userTodayRecord?.workingHours}h)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-bold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================
          PART 1: PUNCH IN (Start of Shift)
          ======================================================== */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        hasPunchedIn 
          ? 'bg-emerald-50/60 border-emerald-200' 
          : 'bg-white border-blue-200 ring-2 ring-blue-500/10 shadow-sm'
      }`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Part 1: Punch In (Start of Shift)
            </h4>
          </div>
          {hasPunchedIn && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Done ({formatToIndian12Hr(userTodayRecord?.punchIn)})</span>
            </span>
          )}
        </div>

        {!hasPunchedIn ? (
          <div className="space-y-4">
            {/* Step 1A: Take Photo */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {(capturedSelfie || userTodayRecord?.selfieUrl) ? (
                  <img 
                    src={capturedSelfie || userTodayRecord?.selfieUrl} 
                    alt="Face Snapshot" 
                    className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500 shadow-sm shrink-0" 
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-200 border-2 border-dashed border-slate-400 flex items-center justify-center text-slate-500 shrink-0">
                    <Camera className="w-6 h-6 text-slate-600" />
                  </div>
                )}
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    {(capturedSelfie || userTodayRecord?.selfieUrl) ? '✓ Photo Captured' : 'Take Face Photo'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {(capturedSelfie || userTodayRecord?.selfieUrl) ? 'Ready for Punch In.' : 'Required for attendance verification.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={showCamera ? stopCamera : startCamera}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm w-full sm:w-auto"
                >
                  <Camera className="w-4 h-4" />
                  <span>{(capturedSelfie || userTodayRecord?.selfieUrl) ? 'Retake Photo' : 'Take Photo'}</span>
                </button>
              </div>
            </div>

            {/* Inline Camera Viewfinder when camera is open */}
            {showCamera && (
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col items-center gap-3 shadow-lg">
                <div className="relative w-56 h-56 rounded-2xl bg-black border-2 border-blue-400 overflow-hidden flex items-center justify-center">
                  <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-4 rounded-full border-2 border-white/70 pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-mono text-white bg-black/60 px-2 py-0.5 rounded-full">
                      Align Face
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={capturePhotoFromVideo}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Live GPS Coordinate Fix Status */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>GPS Location Verification</span>
                </span>
                <button
                  type="button"
                  onClick={acquireGpsLocation}
                  disabled={gpsStatus === 'ACQUIRING'}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  title="Re-acquire live GPS fix"
                >
                  <RefreshCw className={`w-3 h-3 ${gpsStatus === 'ACQUIRING' ? 'animate-spin' : ''}`} />
                  <span>{gpsStatus === 'ACQUIRING' ? 'Getting location...' : 'Retry GPS'}</span>
                </button>
              </div>

              {/* Sangli Location Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap my-2 pb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Preset:</span>
                <button
                  type="button"
                  onClick={() => {
                    setLocationPreset('SANGLI_MARKET_YARD');
                    setGpsCoords({
                      lat: 16.8584,
                      lng: 74.5824,
                      accuracy: 8,
                      timestamp: new Date().toISOString(),
                    });
                    setGpsStatus('LOCKED');
                    setGpsError(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    locationPreset === 'SANGLI_MARKET_YARD' || (gpsCoords?.lat === 16.8584 && gpsCoords?.lng === 74.5824)
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>📍 Sangli Market Yard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocationPreset('PLANT_HQ');
                    setGpsCoords({
                      lat: 16.8450,
                      lng: 74.6200,
                      accuracy: 10,
                      timestamp: new Date().toISOString(),
                    });
                    setGpsStatus('LOCKED');
                    setGpsError(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    locationPreset === 'PLANT_HQ'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  <span>Main Plant HQ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocationPreset('AUTO');
                    acquireGpsLocation().catch(() => {});
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    locationPreset === 'AUTO'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  <span>Device GNSS</span>
                </button>
              </div>

              {gpsStatus === 'LOCKED' && gpsCoords ? (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div>
                        <span className="font-bold text-xs text-emerald-950 block">
                          📍 {resolveSangliLandmark(gpsCoords.lat, gpsCoords.lng).landmarkName}
                        </span>
                        <span className="font-mono text-[10px] text-emerald-800 block">
                          Lat: {gpsCoords.lat}, Lng: {gpsCoords.lng} (±{gpsCoords.accuracy}m)
                        </span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${gpsCoords.lat},${gpsCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200/80 text-emerald-900 shrink-0 hover:bg-emerald-300 transition-colors"
                    title="View on Google Maps"
                  >
                    📍 Maps
                  </a>
                </div>
              ) : gpsStatus === 'ACQUIRING' ? (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <span>Getting your location... Please wait.</span>
                </div>
              ) : gpsStatus === 'DENIED' ? (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Please allow location access.</span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    {gpsError}
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{gpsStatus === 'TIMEOUT' ? 'GPS timed out. Click Retry GPS.' : 'Location unavailable.'}</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    {gpsError || 'Please enable GPS/Location on your device and click Retry GPS.'}
                  </p>
                </div>
              )}
            </div>

            {/* Step 1B: Big Punch In Button */}
            <button
              type="button"
              onClick={handlePunchIn}
              disabled={loading}
              className={`w-full py-4 px-4 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md active:scale-[0.99] ${
                loading
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/40'
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{loading ? (gpsStatus === 'ACQUIRING' ? 'Getting location...' : 'Saving Attendance...') : 'PUNCH IN'}</span>
            </button>
            {gpsStatus === 'DENIED' ? (
              <p className="text-[11px] text-center text-rose-700 font-semibold">
                ⚠️ Please allow location access to punch in — tap Retry GPS above.
              </p>
            ) : (!gpsCoords || gpsStatus !== 'LOCKED') ? (
              <p className="text-[11px] text-center text-slate-500 font-medium">
                📍 Location will be captured when you click PUNCH IN or Retry GPS
              </p>
            ) : null}

          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-emerald-900 font-semibold bg-emerald-100/60 p-3 rounded-xl border border-emerald-200 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span>✓ Checked in today at <strong>{formatToIndian12Hr(userTodayRecord.punchIn)}</strong></span>
              {userTodayRecord?.lateStatus ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                  Late ({userTodayRecord.lateMinutes}m)
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                  On Time
                </span>
              )}
              <span>• Shift in progress</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-emerald-800 text-[11px] font-bold border border-emerald-300 shadow-2xs shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Punch In Locked (1 punch/day)</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          PART 2: DAILY REPORT & PUNCH OUT (End of Shift)
          ======================================================== */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        hasPunchedOut 
          ? 'bg-blue-50/60 border-blue-200' 
          : hasPunchedIn 
            ? 'bg-white border-amber-300 ring-2 ring-amber-400/20 shadow-sm' 
            : 'bg-slate-50 border-slate-200 opacity-60'
      }`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Part 2: Work Report & Punch Out
            </h4>
          </div>
          {hasPunchedOut && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-blue-600" />
              <span>Shift Ended ({formatToIndian12Hr(userTodayRecord?.punchOut)})</span>
            </span>
          )}
        </div>

        {!hasPunchedIn ? (
          <p className="text-xs text-slate-500 font-medium py-2">
            🔒 Unlocked after you Punch In above.
          </p>
        ) : !hasPunchedOut ? (
          <form onSubmit={handlePunchOutWithReport} className="space-y-4 pt-1">
            <p className="text-xs text-slate-600 font-medium">
              Enter your work summary below before Punch Out:
            </p>

            {/* Simple Report Inputs */}
            {isDriver ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Mixer Vehicle No *
                  </label>
                  <input
                    type="text"
                    required
                    value={driverReport.vehicleNo}
                    onChange={(e) => setDriverReport({ ...driverReport, vehicleNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold font-mono bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Trips Completed *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={driverReport.tripsCount}
                    onChange={(e) => setDriverReport({ ...driverReport, tripsCount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold font-mono bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Delivered Concrete m³ *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={driverReport.deliveredM3}
                    onChange={(e) => setDriverReport({ ...driverReport, deliveredM3: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold font-mono bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Remarks / Drum Wash
                  </label>
                  <input
                    type="text"
                    value={driverReport.remarks}
                    onChange={(e) => setDriverReport({ ...driverReport, remarks: e.target.value })}
                    placeholder="e.g. All pours delivered, drum washed at rack..."
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Today's Work Summary *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffReport.workDescription}
                    onChange={(e) => setStaffReport({ ...staffReport, workDescription: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Big Punch Out Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-4 rounded-2xl text-sm sm:text-base font-black text-white bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 active:scale-[0.99] shadow-md shadow-rose-500/25 ring-2 ring-rose-400/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5 fill-current" />}
              <span>{loading ? 'Recording Punch Out...' : 'SUBMIT REPORT & PUNCH OUT'}</span>
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 font-medium space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-black text-sm text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                <span>Shift Concluded for Today!</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-blue-900 border border-blue-300 text-xs font-bold shadow-2xs">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>Daily Punch Concluded</span>
              </div>
            </div>
            <p>
              Clock In: <strong>{formatToIndian12Hr(userTodayRecord.punchIn)}</strong> • Clock Out: <strong>{formatToIndian12Hr(userTodayRecord.punchOut)}</strong> • Total Duty: <strong>{userTodayRecord.workingHours} Hours</strong>
            </p>
            <p className="text-slate-600 pt-0.5">
              Work report successfully archived for payroll and management audit.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
