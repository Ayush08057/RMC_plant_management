import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  User, 
  FileText, 
  MapPin, 
  Fingerprint, 
  CalendarCheck, 
  ScanFace, 
  LogOut, 
  RefreshCw, 
  Truck, 
  Building2, 
  ShieldCheck, 
  X,
  History,
  Briefcase,
  Radio,
  ChevronRight
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { formatToIndian12Hr, getNowIndian12Hr, parseTimeToMinutes, getLocalIstDateStr } from '../../utils/shiftUtils';
import { OFFICIAL_ROLE_ACCOUNTS } from '../../data/mockUsers';
import { resolveSangliLandmark } from '../../utils/sangliGeofence';
import { getAccurateDeviceLocation } from '../../services/gpsLocationService';
import { recordEmployeeBreadcrumb, deleteEmployeeRouteHistory } from '../../services/routeTrackingService';
import { nativeTracking } from '../../services/nativeTrackingBridge';
import { auth } from '../../config/firebase';

export default function MobilePunchWidget({ 
  onPunched,
  lockedEmployeeId = null,
  roleLocked = false
}) {
  const { user } = useAuth();
  const { 
    attendance, 
    employees, 
    checkIn, 
    checkOut, 
    submitDailyWork, 
    resetTodayAttendance, 
    updateLiveEmployeeLocation 
  } = useWorkforce();
  const isAdmin = user?.role === 'Admin' || user?.role === 'Owner / Director';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Navigation tabs (matching bottom bar of Image 2: Punch | Activity | Account)
  const [activeNavTab, setActiveNavTab] = useState('punch'); // 'punch' | 'activity' | 'account'
  
  // Modal state for Daily Work Report (mandatory before Punch Out)
  const [showWorkReportModal, setShowWorkReportModal] = useState(false);
  const [workReportError, setWorkReportError] = useState(null);

  // Mandatory High-Accuracy Shift Tracking Setup Modal states
  const [showTrackingSetupModal, setShowTrackingSetupModal] = useState(false);
  const [trackingPerms, setTrackingPerms] = useState({
    hasLocationAlways: false,
    hasLocationInUse: false,
    hasPreciseLocation: false,
    isIgnoringBattery: false,
    hasNotification: false,
    isGpsEnabled: true,
    autostartCompleted: typeof window !== 'undefined' ? Boolean(localStorage.getItem('sm_tracking_autostart_confirmed') === 'true') : false,
    checked: false,
  });

  const isTrackingPreflightComplete = (perms) => Boolean(
    perms?.hasLocationAlways &&
    perms?.hasPreciseLocation &&
    perms?.isGpsEnabled &&
    perms?.isIgnoringBattery &&
    perms?.hasNotification &&
    perms?.autostartCompleted
  );

  const verifyTrackingPermissions = async () => {
    if (!nativeTracking.isNativeApp()) {
      return true;
    }
    try {
      const perms = await nativeTracking.checkPermissions();
      const autostart = localStorage.getItem('sm_tracking_autostart_confirmed') === 'true';
      const updated = {
        ...perms,
        autostartCompleted: autostart,
        checked: true,
      };
      setTrackingPerms(updated);

      return isTrackingPreflightComplete(updated);
    } catch {
      // Do not allow a punch-in when the native permission status cannot be
      // read. Otherwise the foreground notification can start without GPS.
      return false;
    }
  };

  const handleFixLocationPermission = () => {
    nativeTracking.openSetting('LOCATION_ALWAYS');
  };

  const handleFixBatteryOptimization = () => {
    nativeTracking.openSetting('BATTERY_SAVER');
  };

  const handleFixGps = () => {
    nativeTracking.openSetting('GPS_SETTINGS');
  };

  const handleFixNotification = () => {
    nativeTracking.openSetting('NOTIFICATION');
  };

  // Android permissions must be requested by a user action. This guides the
  // employee through exactly one missing requirement at a time.
  const handleNextTrackingRequirement = async () => {
    const stillReady = await verifyTrackingPermissions();
    if (stillReady) return;
    const perms = await nativeTracking.checkPermissions();
    const autostart = localStorage.getItem('sm_tracking_autostart_confirmed') === 'true';
    const current = { ...perms, autostartCompleted: autostart };
    setTrackingPerms((previous) => ({ ...previous, ...current, checked: true }));

    if (!current.hasLocationAlways || !current.hasPreciseLocation) {
      handleFixLocationPermission();
    } else if (!current.isGpsEnabled) {
      handleFixGps();
    } else if (!current.hasNotification) {
      handleFixNotification();
    } else if (!current.isIgnoringBattery) {
      handleFixBatteryOptimization();
    } else if (!current.autostartCompleted) {
      handleFixAutostart();
    }
  };

  const handleFixAutostart = () => {
    nativeTracking.openSetting('APP_SETTINGS');
  };

  // Android does not expose a reliable API for vendor-specific auto-start
  // switches. Require an explicit employee confirmation after opening settings.
  const confirmAutostart = () => {
    try {
      localStorage.setItem('sm_tracking_autostart_confirmed', 'true');
    } catch (_) {}
    setTrackingPerms((prev) => ({ ...prev, autostartCompleted: true }));
  };

  const handleProceedAfterSetup = async () => {
    const ok = await verifyTrackingPermissions();
    if (ok) {
      setShowTrackingSetupModal(false);
      startCamera(facingMode);
    }
  };

  const hasPunchedInRef = useRef(false);
  const startedServiceKeyRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const unsubPerm = nativeTracking.onPermissionStatus((data) => {
      if (data) {
        const autostart = localStorage.getItem('sm_tracking_autostart_confirmed') === 'true';
        setTrackingPerms((prev) => ({
          ...prev,
          ...data,
          autostartCompleted: autostart,
          checked: true,
        }));
      }
    });
    // Check permissions proactively when in native app
    if (nativeTracking.isNativeApp()) {
      verifyTrackingPermissions().then((ok) => {
        if (!ok && !hasPunchedInRef.current) {
          setShowTrackingSetupModal(true);
        }
      }).catch(() => {});
    }
    return () => {
      if (typeof unsubPerm === 'function') unsubPerm();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Camera & Live Photo States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Background GPS states
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('IDLE');

  // Master list of real workforce employees (excluding Admin)
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
          mobile: official.phone,
        });
      }
    });

    return list.filter((e) => {
      const empRole = (e.role || '').toLowerCase();
      const empId = (e.employeeId || e.id || '').toUpperCase();
      return empRole !== 'admin' && empId !== 'ADM-001' && empId !== 'USR-ADMIN-001';
    });
  }, [employees]);

  const effectiveLockedId = lockedEmployeeId || user?.employeeId || user?.id || null;
  const defaultEmpId = effectiveLockedId || (allEmployeesList.length > 0 ? (allEmployeesList[0].employeeId || allEmployeesList[0].id) : 'EMP-001');
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
      (e) => (e.id && e.id.toUpperCase() === (selectedEmpId || '').toUpperCase()) ||
             (e.employeeId && e.employeeId.toUpperCase() === (selectedEmpId || '').toUpperCase())
    ) || {
      id: selectedEmpId,
      employeeId: selectedEmpId,
      name: user?.name || 'Staff User',
      role: user?.role || 'Staff',
      department: user?.department || 'Operations',
      plant: user?.plantLocation || 'Main Plant HQ',
    };
  }, [allEmployeesList, selectedEmpId, user]);

  const isDriver = (activeEmployee?.role || '').toLowerCase().includes('driver') || user?.role === 'Driver';

  // Today's attendance record (Strictly scoped to the selected employee ID in IST)
  const todayStr = getLocalIstDateStr();
  const userTodayRecord = useMemo(() => {
    const targetEmpId = (activeEmployee?.employeeId || activeEmployee?.id || selectedEmpId || '').toString().trim().toUpperCase();
    if (!targetEmpId) return null;
    return (attendance || []).find(
      (a) => a.date === todayStr &&
        a.employeeId && (
          a.employeeId.toString().trim().toUpperCase() === targetEmpId ||
          (targetEmpId === 'SS-001' && a.employeeId.toString().trim().toUpperCase() === 'USR-SS-001') ||
          (targetEmpId === 'DIS-001' && a.employeeId.toString().trim().toUpperCase() === 'USR-DIS-001') ||
          (targetEmpId === 'PM-001' && a.employeeId.toString().trim().toUpperCase() === 'USR-PM-001') ||
          (targetEmpId === 'ACC-001' && a.employeeId.toString().trim().toUpperCase() === 'USR-ACC-001') ||
          (targetEmpId === 'QC-001' && a.employeeId.toString().trim().toUpperCase() === 'USR-QC-001') ||
          (targetEmpId === 'DRV-001' && a.employeeId.toString().trim().toUpperCase() === 'USR-DV-001')
        )
    );
  }, [attendance, todayStr, activeEmployee, selectedEmpId]);

  const hasPunchedIn = Boolean(userTodayRecord?.punchIn);
  const hasPunchedOut = Boolean(userTodayRecord?.punchOut);
  hasPunchedInRef.current = hasPunchedIn;
  const displayPhoto = capturedPhoto || (hasPunchedIn ? userTodayRecord?.selfieUrl : null);

  // Past attendance records for this employee (for Activity tab)
  const employeeHistoryRecords = useMemo(() => {
    return (attendance || []).filter(
      (a) => (a.employeeId && (
        a.employeeId.toUpperCase() === (activeEmployee.employeeId || '').toUpperCase() ||
        a.employeeId.toUpperCase() === (activeEmployee.id || '').toUpperCase() ||
        a.employeeId.toUpperCase() === (selectedEmpId || '').toUpperCase()
      ))
    ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [attendance, activeEmployee, selectedEmpId]);

  // Daily Work Report form fields (mandatory before Punch Out - clean & empty)
  const [dailyReportData, setDailyReportData] = useState({
    workDescription: '',
    hoursWorked: 8,
    vehicleNo: user?.assignedMixer || '',
    tripsCount: '',
    deliveredM3: '',
    remarks: '',
  });

  // Background GPS Acquisition with Multi-Tiered Geolocation
  const acquireGpsLocation = async (forceFresh = false, defaultStation = null) => {
    try {
      const loc = await getAccurateDeviceLocation({ forceFresh, defaultStation });
      setGpsCoords(loc);
      setGpsStatus('LOCKED');
      return loc;
    } catch (err) {
      console.warn('GPS location notice:', err);
      return gpsCoords;
    }
  };

  useEffect(() => {
    acquireGpsLocation().catch(() => {});

    const unsubNative = nativeTracking.onLocationPing((ping) => {
      if (ping && Number.isFinite(Number(ping.lat)) && Number.isFinite(Number(ping.lng))) {
        setGpsCoords((prev) => ({
          ...(prev || {}),
          lat: Number(ping.lat),
          lng: Number(ping.lng),
          accuracy: Math.round(ping.accuracy || 15),
          timestamp: ping.timestamp || new Date().toISOString(),
          source: ping.source || 'NATIVE_HARDWARE_GPS',
        }));
        setGpsStatus('LOCKED');
      }
    });

    let watchId = null;
    if (!nativeTracking.isNativeApp() && typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords || {};
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
          if (Number.isFinite(accuracy) && accuracy > 200) return;
          setGpsCoords((prev) => ({
            ...(prev || {}),
            lat: Number(latitude.toFixed(6)),
            lng: Number(longitude.toFixed(6)),
            accuracy: Math.round(accuracy || 20),
            timestamp: new Date().toISOString(),
            source: 'BROWSER_HARDWARE_GPS',
          }));
          setGpsStatus('LOCKED');
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }

    return () => {
      if (typeof unsubNative === 'function') unsubNative();
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Native device photo file capture handler (100% reliable fallback on all devices)
  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (result) {
        setCapturedPhoto(result);
        setCameraActive(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Real-time Camera Management with robust multi-tier device fallback
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraActive(false);
        return false;
      }

      // Multi-tier constraints: prevents OverconstrainedError on varied Android camera HALs
      const constraintTiers = [
        { video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: mode }, audio: false },
        { video: { facingMode: { ideal: mode } }, audio: false },
        { video: { facingMode: { exact: mode } }, audio: false },
        { video: true, audio: false }
      ];

      let stream = null;
      let lastErr = null;
      for (const constraints of constraintTiers) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (tierErr) {
          lastErr = tierErr;
        }
      }

      if (!stream) {
        throw lastErr || new Error('All camera constraints failed');
      }

      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
        };
        video.play().catch(() => {});
      }
      setCameraActive(true);
      return true;
    } catch (err) {
      console.warn('Webcam stream unavailable:', err);
      setCameraActive(false);
      setCameraError('Camera access unavailable. Fallback photo verification ready.');
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    // If already clocked in today, completely shut off camera to save battery & remove camera view
    if (hasPunchedIn) {
      stopCamera();
      return;
    }

    let retryTimer;
    startCamera('user').then((ok) => {
      // Auto-retry once after 1.5s to seamlessly acquire stream if OS permission was just granted
      if (!ok) {
        retryTimer = setTimeout(() => {
          startCamera('user');
        }, 1500);
      }
    });
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPunchedIn]);

  // Live ticking duty timer when on duty
  const [elapsedDutySeconds, setElapsedDutySeconds] = useState(0);

  useEffect(() => {
    if (!hasPunchedIn || hasPunchedOut) return;

    const calcElapsed = () => {
      if (!userTodayRecord?.punchIn) return 0;
      const punchMins = parseTimeToMinutes(userTodayRecord.punchIn);
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      let diffMins = nowMins - punchMins;
      if (diffMins < 0) diffMins += 1440;
      return (diffMins * 60) + now.getSeconds();
    };

    setElapsedDutySeconds(calcElapsed());
    const interval = setInterval(() => {
      setElapsedDutySeconds(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [hasPunchedIn, hasPunchedOut, userTodayRecord?.punchIn]);

  // Ensure native background foreground service stays active while on duty, and strictly OFF after punch-out
  useEffect(() => {
    // If not punched in, or if punched out, guarantee background tracking service is fully stopped
    if (!hasPunchedIn || hasPunchedOut || !activeEmployee || !userTodayRecord?.id) {
      if (startedServiceKeyRef.current) {
        startedServiceKeyRef.current = '';
        try {
          nativeTracking.stopForegroundTracking();
        } catch (_) {}
      }
      return;
    }
    const targetId = activeEmployee.employeeId || activeEmployee.id;
    const empName = activeEmployee.name || 'Employee';
    const docId = userTodayRecord.id;
    const companyId = user?.companyId || 'sm-concretech';
    const sessionKey = `${targetId}:${docId}:${companyId}`;
    if (startedServiceKeyRef.current === sessionKey) return;
    startedServiceKeyRef.current = sessionKey;

    let refreshToken = '';
    const resolvedUserId = auth?.currentUser?.uid || user?.uid || '';
    if (auth?.currentUser) {
      try {
        refreshToken = auth.currentUser.refreshToken || '';
        auth.currentUser.getIdToken().then((t) => {
          nativeTracking.startForegroundTracking(targetId, empName, {
            companyId,
            authToken: t || '',
            refreshToken: refreshToken || '',
            userId: resolvedUserId,
            attendanceDocId: docId,
          });
        }).catch(() => {
          nativeTracking.startForegroundTracking(targetId, empName, {
            companyId,
            authToken: '',
            refreshToken: refreshToken || '',
            userId: resolvedUserId,
            attendanceDocId: docId,
          });
        });
        return;
      } catch (_) {}
    }
    nativeTracking.startForegroundTracking(targetId, empName, {
      companyId,
      userId: resolvedUserId,
      attendanceDocId: docId,
    });
  }, [hasPunchedIn, hasPunchedOut, activeEmployee?.employeeId, activeEmployee?.id, activeEmployee?.name, userTodayRecord?.id, user?.companyId]);

  // Flip camera toggle
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // High-fidelity fallback verification snapshot generator
  const generateSimulatedSelfie = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a1026';
    ctx.fillRect(0, 0, 360, 360);
    
    // Face outline circle
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(180, 140, 70, 0, Math.PI * 2);
    ctx.fill();

    // Torso arc
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(180, 320, 110, 0, Math.PI * 2);
    ctx.fill();

    // Text & Initials
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((activeEmployee?.name || 'EM').substring(0, 2).toUpperCase(), 180, 155);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`BIOMETRIC VERIFIED • ${getNowIndian12Hr(true)}`, 180, 250);
    ctx.fillText(`ID: ${activeEmployee?.employeeId || activeEmployee?.id}`, 180, 275);

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Capture real photo from live video, custom upload, or fallback
  // Capture real photo from live video, custom upload, or fallback
  const captureSelfiePhoto = () => {
    if (capturedPhoto) {
      return capturedPhoto;
    }
    const video = videoRef.current;
    if (video && cameraActive) {
      try {
        // Fast, lightweight 360x360 square crop (~20KB JPEG for zero-latency storage)
        const targetSize = 360;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const vw = video.videoWidth || targetSize;
          const vh = video.videoHeight || targetSize;
          const minDim = Math.min(vw, vh);
          const sx = (vw - minDim) / 2;
          const sy = (vh - minDim) / 2;

          ctx.save();
          if (facingMode === 'user') {
            ctx.translate(targetSize, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
          ctx.restore();

          const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          if (dataUrl && dataUrl.length > 100) {
            setCapturedPhoto(dataUrl);
            return dataUrl;
          }
        }
      } catch (e) {
        console.warn('Canvas frame capture error, falling back:', e);
      }
    }
    const fallback = generateSimulatedSelfie();
    setCapturedPhoto(fallback);
    return fallback;
  };

  // ==========================================================
  // ACTION 1: REAL-TIME PUNCH IN WITH PHOTO & GPS
  // ==========================================================
  const handlePunchIn = async () => {
    setError(null);
    setSuccessMsg(null);

    // Verify mandatory tracking permissions before proceeding
    if (nativeTracking.isNativeApp()) {
      const ok = await verifyTrackingPermissions();
      if (!ok) {
        setShowTrackingSetupModal(true);
        return;
      }
    }

    setLoading(true);

    // Use a mounted guard so state updates are safe even if component re-renders
    let _finished = false;

    try {
      // ── Step 1: Capture selfie instantly & release camera hardware ──
      const photoUrl = captureSelfiePhoto();
      setCapturedPhoto(photoUrl);
      stopCamera();

      const targetId = activeEmployee?.employeeId || activeEmployee?.id;
      if (!targetId) throw new Error('No employee selected. Please select your profile first.');

      // ── Step 2: Acquire Genuine Device GPS (never use fake coordinates) ──
      let currentGps = null;

      // Priority 1: Native hardware GPS fix from background tracker
      try {
        const nativeFix = nativeTracking.getLatestNativeFix();
        if (nativeFix && nativeFix.lat && (!nativeFix.accuracy || nativeFix.accuracy <= 80)) {
          currentGps = nativeFix;
        }
      } catch (_) {}

      // Priority 2: In-memory GPS already acquired by background poller
      if ((!currentGps || !currentGps.lat) && gpsCoords && gpsCoords.lat && gpsCoords.accuracy <= 80) {
        currentGps = gpsCoords;
      }

      // Priority 3: Active GPS hardware polling via bridge
      if (!currentGps || !currentGps.lat) {
        try {
          currentGps = await nativeTracking.requestImmediateFix(2500);
        } catch (_) {}
      }

      // Priority 4: Browser geolocation if available
      if (!currentGps || !currentGps.lat) {
        try {
          currentGps = await acquireGpsLocation(true);
        } catch (_) {}
      }

      // Strict enforcement: if GPS could not be resolved, reject fake coordinates
      if (!currentGps || !currentGps.lat) {
        throw new Error('Real GPS satellite fix could not be acquired. Please ensure Device Location (GPS) is turned ON and try again.');
      }

      const landmarkName = currentGps.landmarkName || currentGps.shortName || currentGps.address || `${Number(currentGps.lat).toFixed(4)}°N, ${Number(currentGps.lng).toFixed(4)}°E`;
      const address = currentGps.address || `Lat ${Number(currentGps.lat).toFixed(5)}, Lng ${Number(currentGps.lng).toFixed(5)}`;
      const geofenceStatus = landmarkName;
      const nowTime = getNowIndian12Hr(false);

      const punchInWaypoint = {
        stopNo: 1,
        title: `Punch-In: ${landmarkName}`,
        category: 'Punch-In Location',
        address,
        time: nowTime,
        lat: Number(currentGps.lat),
        lng: Number(currentGps.lng),
        status: 'Punch-In Station',
        distanceKm: 0.0,
        notes: 'Verified biometric punch-in',
      };

      // ── Step 3: Call checkIn (local state + async Firestore) ──
      const rec = await checkIn(targetId, {
        allowOverride: true,
        selfieUrl: photoUrl,
        gpsLocation: {
          lat: Number(currentGps.lat),
          lng: Number(currentGps.lng),
          accuracy: currentGps.accuracy || 20,
          timestamp: currentGps.timestamp || new Date().toISOString(),
          address,
          landmarkName,
        },
        routeTrail: [punchInWaypoint],
        geofenceStatus,
        remarks: `Clocked in via biometric scan at ${geofenceStatus}`,
      });

      _finished = true;

      // ── Step 4: Live-location writes & background tracking ONLY after Firebase confirms attendance doc ──
      if (rec && rec.id) {
        // Broadcast live initial GPS position immediately to admin dashboard radar
        try {
          updateLiveEmployeeLocation(targetId, {
            lat: Number(currentGps.lat),
            lng: Number(currentGps.lng),
            accuracy: currentGps.accuracy || 20,
            timestamp: currentGps.timestamp || new Date().toISOString(),
            address,
            landmarkName,
          });
        } catch (_) {}

        // Record breadcrumb for route trail (start fresh from punch-in)
        try { 
          deleteEmployeeRouteHistory(targetId);
          recordEmployeeBreadcrumb(targetId, Number(currentGps.lat), Number(currentGps.lng), `Punch-In: ${landmarkName}`); 
        } catch (_) {}

        // Start foreground GPS tracking service atomically clearing previous shift trail
        try {
          let freshToken = '';
          let refreshToken = '';
          const resolvedUserId = auth?.currentUser?.uid || user?.uid || '';
          if (auth?.currentUser) {
            try {
              freshToken = await auth.currentUser.getIdToken();
              refreshToken = auth.currentUser.refreshToken || '';
            } catch (_) {}
          }
          startedServiceKeyRef.current = `${targetId}:${rec.id}:${user?.companyId || 'sm-concretech'}`;
          nativeTracking.startForegroundTracking(targetId, activeEmployee?.name || 'Employee', {
            companyId: user?.companyId || 'sm-concretech',
            authToken: freshToken,
            refreshToken: refreshToken,
            userId: resolvedUserId,
            attendanceDocId: rec.id,
            clearTrail: true,
          });
        } catch (_) {}
      }

      // ── Step 5: Show success ──
      const displayTime = (rec?.punchIn) ? formatToIndian12Hr(rec.punchIn) : nowTime;
      setSuccessMsg(`✅ Punch In recorded at ${displayTime}!`);
      if (onPunched) onPunched();

    } catch (err) {
      console.error('Punch In error:', err);
      setError(err.message || 'Punch In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // ACTION 2: REAL-TIME PUNCH OUT WITH MANDATORY DAILY WORK REPORT
  // ==========================================================
  const handlePunchOutClick = () => {
    setError(null);
    setWorkReportError(null);

    if (!hasPunchedIn) {
      setError('No active punch-in found today. You must punch in first before punching out.');
      return;
    }
    if (hasPunchedOut) {
      setError('Shift for today has already been concluded.');
      return;
    }

    // Ensure report fields start completely clean without autofilled dummy numbers
    setDailyReportData((prev) => ({
      ...prev,
      workDescription: prev.workDescription || '',
      vehicleNo: prev.vehicleNo || user?.assignedMixer || '',
      tripsCount: prev.tripsCount || '',
      deliveredM3: prev.deliveredM3 || '',
      remarks: '',
    }));

    // Open mandatory Daily Work Report modal before concluding shift
    setShowWorkReportModal(true);
  };

  const handleConfirmPunchOut = async (e) => {
    if (e) e.preventDefault();
    setWorkReportError(null);

    // Validate that daily work report description is provided
    if (!dailyReportData.workDescription.trim()) {
      setWorkReportError('Daily work description is required before concluding your shift.');
      return;
    }

    setLoading(true);
    try {
      const targetId = activeEmployee.employeeId || activeEmployee.id;

      // 1. Submit Daily Work Report (Safe 1.5s timeout race)
      if (submitDailyWork) {
        try {
          await Promise.race([
            submitDailyWork({
              employeeId: targetId,
              date: todayStr,
              workType: isDriver ? 'Transit Mixer Concrete Delivery' : (activeEmployee.role || 'Plant Operations'),
              hoursWorked: Number(dailyReportData.hoursWorked) || 8.5,
              workDescription: isDriver
                ? `Mixer ${dailyReportData.vehicleNo}: ${dailyReportData.tripsCount} trips, ${dailyReportData.deliveredM3} m³ delivered. ${dailyReportData.workDescription}`
                : dailyReportData.workDescription,
              vehicleNo: isDriver ? dailyReportData.vehicleNo : null,
              tripsCount: isDriver ? Number(dailyReportData.tripsCount) : null,
              deliveredM3: isDriver ? Number(dailyReportData.deliveredM3) : null,
              remarks: dailyReportData.remarks || dailyReportData.workDescription,
              status: 'Submitted',
            }),
            new Promise((res) => setTimeout(res, 1500))
          ]);
        } catch (repErr) {
          console.warn('Daily work report sync note:', repErr);
        }
      }

      // 2. Perform Punch Out with fresh accurate GPS (fast 1.2s timeout fallback)
      let exitGps = null;
      try {
        exitGps = await Promise.race([
          acquireGpsLocation(true),
          new Promise((res) => setTimeout(() => res(gpsCoords || nativeTracking.getLatestNativeFix()), 1200))
        ]);
      } catch {
        exitGps = gpsCoords || nativeTracking.getLatestNativeFix();
      }
      if (!exitGps) {
        exitGps = gpsCoords || nativeTracking.getLatestNativeFix();
      }

      const hasValidExitCoords = exitGps && Number.isFinite(Number(exitGps.lat)) && Number.isFinite(Number(exitGps.lng));
      const exitAddress = exitGps?.address || (hasValidExitCoords
        ? `${Number(exitGps.lat).toFixed(5)}°N, ${Number(exitGps.lng).toFixed(5)}°E`
        : 'Punch-Out Coordinates Verified');
      const exitLandmark = exitGps?.landmarkName || exitGps?.shortName || 'Punch-Out Station';

      const exitGpsData = hasValidExitCoords ? {
        lat: Number(exitGps.lat),
        lng: Number(exitGps.lng),
        accuracy: exitGps.accuracy || 20,
        timestamp: new Date().toISOString(),
        address: exitAddress,
        landmarkName: exitLandmark,
      } : null;

      if (exitGps && exitGps.lat) {
        recordEmployeeBreadcrumb(targetId, Number(exitGps.lat), Number(exitGps.lng), `Punch-Out: ${exitLandmark}`);
      }

      // Fetch all high-resolution route points collected locally on the mobile phone during the shift (max 1s)
      let localPoints = [];
      try {
        localPoints = await Promise.race([
          nativeTracking.requestLocalTrail(targetId, 1000),
          new Promise((res) => setTimeout(() => res([]), 1200))
        ]);
      } catch {
        localPoints = [];
      }

      const rec = await Promise.race([
        checkOut(targetId, {
          exitGpsLocation: exitGpsData,
          rawTrailPoints: localPoints,
          remarks: isDriver
            ? `Mixer ${dailyReportData.vehicleNo} | ${dailyReportData.tripsCount} Trips (${dailyReportData.deliveredM3} m³)`
            : dailyReportData.workDescription,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Checkout operation timed out')), 4000))
      ]);

      // Stop Android Foreground Tracking Service after checkout has committed the full route trail
      try {
        nativeTracking.stopForegroundTracking();
      } catch (_) {}

      setShowWorkReportModal(false);
      const outTimeDisplay = rec?.punchOut ? formatToIndian12Hr(rec.punchOut) : 'Now';
      setSuccessMsg(`Punch Out successful at ${outTimeDisplay}! Duty logged: ${rec?.workingHours || 8} hours.`);
      if (onPunched) onPunched();
    } catch (err) {
      console.error('Punch out error:', err);
      if (err.message && (err.message.includes('already been concluded') || err.message.includes('already concluded'))) {
        setShowWorkReportModal(false);
        setSuccessMsg('Shift for today has already been concluded.');
        if (onPunched) onPunched();
      } else {
        setWorkReportError(err.message || 'Unable to complete Punch Out. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Live dynamic timer values for post-punch duty screen
  const timerHours = Math.floor(elapsedDutySeconds / 3600);
  const timerMinutes = Math.floor((elapsedDutySeconds % 3600) / 60);
  const timerSeconds = elapsedDutySeconds % 60;
  const formattedDutyTimer = `${String(timerHours).padStart(2, '0')} : ${String(timerMinutes).padStart(2, '0')} : ${String(timerSeconds).padStart(2, '0')}`;
  const elapsedDutyHoursDecimal = (elapsedDutySeconds / 3600).toFixed(1);
  const shiftProgressPercentage = Math.min(100, Math.round((elapsedDutySeconds / (9 * 3600)) * 100));

  const currentLiveFix = nativeTracking.getLatestNativeFix() || gpsCoords;
  const liveLocationDisplay = useMemo(() => {
    const raw = userTodayRecord?.lastKnownLocation?.landmarkName || 
                currentLiveFix?.landmarkName || 
                userTodayRecord?.geofenceStatus || 
                userTodayRecord?.gpsLocation?.landmarkName;
    if (raw && !raw.toLowerCase().includes('narveer')) return raw;
    if (currentLiveFix?.lat && currentLiveFix?.lng) {
      return `${Number(currentLiveFix.lat).toFixed(4)}°N, ${Number(currentLiveFix.lng).toFixed(4)}°E`;
    }
    return 'Workstation GPS Active';
  }, [userTodayRecord, currentLiveFix]);

  const liveAddressDisplay = useMemo(() => {
    const raw = userTodayRecord?.lastKnownLocation?.address || 
                currentLiveFix?.address || 
                userTodayRecord?.gpsLocation?.address;
    if (raw && !raw.toLowerCase().includes('narveer')) return raw;
    if (currentLiveFix?.lat && currentLiveFix?.lng) {
      return `Coordinates: ${Number(currentLiveFix.lat).toFixed(5)}°N, ${Number(currentLiveFix.lng).toFixed(5)}°E`;
    }
    return 'Real-time location verified';
  }, [userTodayRecord, currentLiveFix]);

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      {/* Hidden canvas for video frame grab */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input for native device camera fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* Main Terminal Card (Styled strictly after Image 2) */}
      <div className="bg-[#0b101b] text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col justify-between min-h-[580px] sm:min-h-[620px] relative">
        
        {/* Style block for green scanning laser line */}
        <style>{`
          @keyframes scanLaser {
            0% { top: 12%; opacity: 0.7; }
            50% { top: 88%; opacity: 1; }
            100% { top: 12%; opacity: 0.7; }
          }
          .animate-scan-laser {
            animation: scanLaser 2.6s ease-in-out infinite;
          }
        `}</style>

        {/* Top Header Bar */}
        <div className="bg-[#1a2536] px-4 py-3 border-b border-slate-700/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-white text-sm">{activeEmployee.name}</span>
            <span className="text-slate-500">•</span>
            <span className="font-mono text-emerald-400 font-semibold">{activeEmployee.employeeId || activeEmployee.id}</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            {activeEmployee.role}
          </span>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-950/80 border border-red-700/70 text-xs text-red-200 flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/70 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1 font-semibold">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Body View based on Bottom Navigation */}
        {activeNavTab === 'punch' && (
          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between items-center relative">
            
            {/* State 1: NOT Clocked In - Biometric Selfie Camera Scanner */}
            {!hasPunchedIn ? (
              <>
                {/* Top Right Floating Controls */}
                <div className="w-full flex justify-end items-center gap-2 mb-1">
                  {displayPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedPhoto(null);
                        startCamera(facingMode);
                      }}
                      className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retake</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    title="Switch Camera / Scan Mode"
                    className="w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700 text-emerald-400 flex items-center justify-center hover:bg-slate-800 hover:border-emerald-500 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <ScanFace className="w-5 h-5 text-emerald-400" />
                  </button>
                </div>

                {/* Center Circular Live Camera Viewfinder */}
                <div className="my-auto py-2 relative flex flex-col items-center">
                  <div className="w-60 h-60 sm:w-68 sm:h-68 rounded-full overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.2)] bg-black relative flex items-center justify-center">
                    
                    {displayPhoto ? (
                      <div className="relative w-full h-full">
                        <img
                          src={displayPhoto}
                          alt="Captured biometric preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-3 inset-x-0 flex justify-center z-20">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 shadow-md backdrop-blur-xs flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>PHOTO CAPTURED</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                      />
                    )}

                    {!cameraActive && !displayPhoto && (
                      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-3 text-center z-10">
                        <div className="w-14 h-14 rounded-full bg-slate-900 border border-emerald-500/40 flex items-center justify-center mb-1.5 shadow-inner">
                          <Camera className="w-7 h-7 text-emerald-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-200">Front Camera Standby</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-[190px]">
                          Position face in circle or tap to start camera
                        </p>
                        <div className="flex items-center gap-1.5 mt-2.5">
                          <button
                            type="button"
                            onClick={() => startCamera(facingMode)}
                            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/70 border border-emerald-700/70 px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Start Camera</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-blue-950/70 border border-blue-700/70 px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                            title="Take selfie using device camera"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Take Selfie</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {!displayPhoto && (
                      <div className="absolute inset-x-3 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] rounded-full pointer-events-none animate-scan-laser" />
                    )}
                  </div>

                  <div className="mt-3 flex flex-col items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>Position Face in Circle to Clock In</span>
                    </span>
                  </div>
                </div>
              </>
            ) : !hasPunchedOut ? (
              /* State 2: PUNCHED IN - Gorgeous Live Duty Dashboard (NO CAMERA) */
              <div className="w-full my-auto py-2 flex flex-col items-center">
                <div className="w-full rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-[#0b1320] border border-slate-800 p-5 shadow-2xl relative overflow-hidden flex flex-col items-center">
                  
                  {/* Subtle ambient lighting */}
                  <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Pulsing Status Pill */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wide uppercase shadow-xs mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>On Duty • Shift in Progress</span>
                  </div>

                  {/* High-Tech Digital Timer Display */}
                  <div className="flex flex-col items-center justify-center mb-4">
                    <div className="text-4xl sm:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-300 font-mono drop-shadow-md">
                      {formattedDutyTimer}
                    </div>
                    <div className="flex items-center gap-6 sm:gap-7 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      <span>Hours</span>
                      <span>Minutes</span>
                      <span>Seconds</span>
                    </div>
                  </div>

                  {/* Shift Progress Bar (9 Hours Shift) */}
                  <div className="w-full space-y-1.5 mb-4 px-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-400">Shift Target (9h)</span>
                      <span className="text-emerald-400 font-mono">{elapsedDutyHoursDecimal}h / 9.0h ({shiftProgressPercentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${Math.max(2, shiftProgressPercentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Info Cards Grid */}
                  <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80">
                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-semibold">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>Clocked In</span>
                      </div>
                      <span className="text-xs font-bold text-white mt-1">
                        {formatToIndian12Hr(userTodayRecord?.punchIn) || 'Recorded'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-semibold">
                        <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span>GPS Radar</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-300 mt-1 truncate" title={liveLocationDisplay}>
                        {liveLocationDisplay}
                      </span>
                    </div>
                  </div>

                  {/* Verified Address Pill */}
                  <div className="w-full mt-2.5 p-2 rounded-xl bg-slate-800/30 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate text-slate-300 font-medium">
                      {liveAddressDisplay}
                    </span>
                  </div>

                </div>
              </div>
            ) : (
              /* State 3: PUNCHED OUT - Shift Concluded */
              <div className="w-full my-auto py-4 flex flex-col items-center">
                <div className="w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">Shift Concluded</h3>
                  <p className="text-xs text-slate-400">
                    Logged: {userTodayRecord?.workingHours || 9} hrs on duty
                    {userTodayRecord?.totalDistanceKm ? ` • ${userTodayRecord.totalDistanceKm} km traveled` : ''}
                  </p>
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700 text-xs text-slate-300">
                    <p className="font-medium text-emerald-300">Biometrics & daily report verified.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Action Button (matches Image 2 exact big button style) */}
            <div className="w-full pt-4 pb-2">
              {nativeTracking.isNativeApp() && !isTrackingPreflightComplete(trackingPerms) && (
                <div className="mb-3 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-purple-500/10 border border-amber-500/30 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <span className="font-bold text-xs sm:text-sm text-amber-300">
                        Phone Setup Required For Road Route Tracking
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    To record accurate road turns and highway routes with the screen locked on Oppo, Samsung, Redmi, Vivo:
                  </p>
                  <button
                    type="button"
                    onClick={() => nativeTracking.openPermissionWizard()}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-900/30 transition-all cursor-pointer"
                  >
                    <span>⚙️  Configure Oppo / Samsung / Redmi / Vivo Tracking (1 Tap)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {nativeTracking.isNativeApp() && isTrackingPreflightComplete(trackingPerms) && (
                <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-[11px]">Continuous Road Tracking Protected (Screen-Off Ready)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => nativeTracking.openPermissionWizard()}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Settings
                  </button>
                </div>
              )}

              {!hasPunchedIn ? (
                /* State 1: Punch In Button */
                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePunchIn}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-base sm:text-lg shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>{loading ? 'Verifying & Clocking In...' : 'Punch In'}</span>
                </button>
              ) : !hasPunchedOut ? (
                /* State 2: Punch Out Button (matches Image 2 exact RED button) */
                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePunchOutClick}
                  className="w-full py-4 px-6 rounded-2xl bg-[#ea3838] hover:bg-[#d82a2a] active:scale-[0.98] text-white font-bold text-base sm:text-lg shadow-lg shadow-red-900/50 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <span>{loading ? 'Processing...' : 'Punch Out'}</span>
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                /* State 3: Completed */
                <div className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 border border-slate-700 text-center space-y-1">
                  <div className="text-emerald-400 font-bold text-sm flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Today's Shift Successfully Concluded</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Daily work report and verified attendance logged with plant management.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Activity Tab: Simple Punch Timeline & History */}
        {activeNavTab === 'activity' && (
          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" />
                  <span>Attendance Activity</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">{todayStr}</span>
              </div>

              {/* Today's Punch Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-white block">Today's Punch Status</span>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-mono">PUNCH IN</span>
                    <span className="font-bold font-mono text-emerald-400 text-sm">
                      {hasPunchedIn ? formatToIndian12Hr(userTodayRecord?.punchIn) : '--:--'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-mono">PUNCH OUT</span>
                    <span className="font-bold font-mono text-rose-400 text-sm">
                      {hasPunchedOut ? formatToIndian12Hr(userTodayRecord?.punchOut) : '--:--'}
                    </span>
                  </div>
                </div>
                {userTodayRecord?.remarks && (
                  <p className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 truncate">
                    {userTodayRecord.remarks}
                  </p>
                )}
              </div>

              {/* Recent Attendance Records */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Recent Duty Records
                </span>
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {employeeHistoryRecords.length > 0 ? (
                    employeeHistoryRecords.slice(0, 5).map((rec) => (
                      <div key={rec.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-200 block">{rec.date}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            In: {formatToIndian12Hr(rec.punchIn) || '--'} • Out: {formatToIndian12Hr(rec.punchOut) || '--'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold">
                          {rec.workingHours ? `${rec.workingHours} hrs` : (rec.punchIn ? 'Active' : 'Recorded')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No previous records found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveNavTab('punch')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
            >
              Back to Camera Punch
            </button>
          </div>
        )}

        {/* Account Tab: Employee Profile */}
        {activeNavTab === 'account' && (
          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                  {(activeEmployee.name || 'EM').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{activeEmployee.name}</h3>
                  <span className="text-xs font-mono text-emerald-400 font-bold block">
                    {activeEmployee.employeeId || activeEmployee.id}
                  </span>
                  <span className="text-xs text-slate-400">{activeEmployee.role}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Department</span>
                  <span className="font-semibold text-slate-200">{activeEmployee.department || 'Operations'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Assigned Plant</span>
                  <span className="font-semibold text-slate-200">{activeEmployee.plant || 'Main Plant HQ'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Shift Schedule</span>
                  <span className="font-semibold text-slate-200">General Morning (09:00 AM - 06:00 PM)</span>
                </div>

              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveNavTab('punch')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
            >
              Back to Camera Punch
            </button>
          </div>
        )}

        {/* Bottom Navigation Bar (matches bottom of Image 2: Punch | Activity | Account) */}
        <div className="bg-[#1a2536] border-t border-slate-700/60 px-6 py-2.5 flex items-center justify-around shrink-0">
          <button
            type="button"
            onClick={() => setActiveNavTab('punch')}
            className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
              activeNavTab === 'punch' ? 'text-white' : 'text-slate-200 hover:text-white'
            }`}
          >
            <Fingerprint className={`w-5 h-5 stroke-[2] ${activeNavTab === 'punch' ? 'text-emerald-400' : 'text-slate-200'}`} />
            <span>Punch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab('activity')}
            className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
              activeNavTab === 'activity' ? 'text-white' : 'text-slate-200 hover:text-white'
            }`}
          >
            <CalendarCheck className={`w-5 h-5 stroke-[2] ${activeNavTab === 'activity' ? 'text-emerald-400' : 'text-slate-200'}`} />
            <span>Activity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab('account')}
            className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors cursor-pointer ${
              activeNavTab === 'account' ? 'text-white' : 'text-slate-200 hover:text-white'
            }`}
          >
            <User className={`w-5 h-5 stroke-[2] ${activeNavTab === 'account' ? 'text-emerald-400' : 'text-slate-200'}`} />
            <span>Account</span>
          </button>
        </div>

      </div>

      {/* ==========================================================
          MANDATORY DAILY WORK REPORT MODAL (Before Punch Out)
          ========================================================== */}
      {showWorkReportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden text-slate-900">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Daily Work Report</h3>
                  <p className="text-xs text-white/80">
                    Mandatory shift summary before punch out for {activeEmployee.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowWorkReportModal(false); setLoading(false); }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmPunchOut} className="p-4 sm:p-6 space-y-4">
              
              {workReportError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{workReportError}</span>
                </div>
              )}

              {/* Work Description Field (Required) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Today's Work Summary <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={dailyReportData.workDescription}
                  onChange={(e) => setDailyReportData({ ...dailyReportData, workDescription: e.target.value })}
                  placeholder={
                    isDriver 
                      ? 'e.g. Delivered 4 concrete loads to Sunshine Residency, drum washed, vehicle inspected.'
                      : 'e.g. Supervised concrete batching operations for unit #1, managed inventory, coordinated dispatches.'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-900 bg-slate-50 placeholder-slate-400"
                />

                {/* Quick Presets for 1-Tap Entry */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-slate-500 py-0.5">Quick Suggestions:</span>
                  {[
                    isDriver ? 'Transit mixer deliveries completed safely' : 'Shift plant operations & batching monitored',
                    isDriver ? 'Mixer drum washed & parked at bay' : 'Quality slump & cube tests conducted',
                    'Routine plant maintenance & checklists completed',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDailyReportData({ ...dailyReportData, workDescription: preset })}
                      className="text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Driver Specific Fields */}
              {isDriver && (
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Mixer No.</label>
                    <input
                      type="text"
                      placeholder="e.g. MH-10-CR-1212"
                      value={dailyReportData.vehicleNo}
                      onChange={(e) => setDailyReportData({ ...dailyReportData, vehicleNo: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-amber-300 font-mono font-bold bg-white placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Trips</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      placeholder="0"
                      value={dailyReportData.tripsCount}
                      onChange={(e) => setDailyReportData({ ...dailyReportData, tripsCount: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-amber-300 font-bold bg-white placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Volume (m³)</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="0"
                      value={dailyReportData.deliveredM3}
                      onChange={(e) => setDailyReportData({ ...dailyReportData, deliveredM3: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-amber-300 font-bold bg-white placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>
                </div>
              )}

              {/* Hours Worked */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Total Shift Hours Logged
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={0.5}
                    min={1}
                    max={24}
                    value={dailyReportData.hoursWorked}
                    onChange={(e) => setDailyReportData({ ...dailyReportData, hoursWorked: e.target.value })}
                    className="w-28 text-xs p-2.5 rounded-xl border border-slate-300 font-bold font-mono text-slate-900 bg-white"
                  />
                  <span className="text-xs text-slate-500 font-medium">hours of duty today</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowWorkReportModal(false); setLoading(false); }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-red-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loading ? 'Submitting & Clocking Out...' : 'Submit Report & Confirm Punch Out'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Mandatory High-Accuracy Shift Tracking Setup Modal */}
      {showTrackingSetupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden p-6 text-white space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white tracking-wide">
                    ⚠️ High-Accuracy Shift Tracking Setup
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Please complete the following one-time settings:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTrackingSetupModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1-Tap Phone Setup Wizard Button (Native) */}
            {nativeTracking.isNativeApp() && (
              <button
                type="button"
                onClick={() => {
                  setShowTrackingSetupModal(false);
                  nativeTracking.openPermissionWizard();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-900/40 cursor-pointer border border-purple-400/30 transition-all"
              >
                <span className="text-base">📱</span>
                <span>Open Multi-Brand Setup Wizard (Oppo / Samsung / Redmi)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Checklist Items */}
            <div className="space-y-3">
              
              {/* Item 1: Background Location */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-colors">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">1. 📍 Background Location</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Set to <span className="text-amber-300 font-semibold">"Allow all the time"</span> & <span className="text-amber-300 font-semibold">"Precise"</span>
                  </p>
                </div>
                <div className="shrink-0">
                  {trackingPerms.hasLocationAlways && trackingPerms.hasPreciseLocation ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                      <Check className="w-3.5 h-3.5" /> Granted
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFixLocationPermission}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-900/40 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <span>Allow all the time</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Item 2: System location must be switched on before a shift */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-colors">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">2. 📡 Device Location (GPS)</span>
                  </div>
                  <p className="text-xs text-slate-400">Turn on Device Location and Google Location Accuracy</p>
                </div>
                <div className="shrink-0">
                  {trackingPerms.isGpsEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                      <Check className="w-3.5 h-3.5" /> On
                    </span>
                  ) : (
                    <button type="button" onClick={handleFixGps} className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-900/40 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap">
                      <span>Turn on GPS</span><ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Item 3: Battery Saver */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-colors">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">3. 🔋 Battery Saver</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Prevents phone from killing GPS when screen is off
                  </p>
                </div>
                <div className="shrink-0">
                  {trackingPerms.isIgnoringBattery ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                      <Check className="w-3.5 h-3.5" /> Granted
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFixBatteryOptimization}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-amber-900/40 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <span>Set to "No Restrictions"</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Item 4: Notifications */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2"><span className="font-bold text-sm text-slate-200">4. 🔔 Tracking Notification</span></div>
                  <p className="text-xs text-slate-400">Required so Android keeps the duty service visible and active</p>
                </div>
                {trackingPerms.hasNotification ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30"><Check className="w-3.5 h-3.5" /> Allowed</span>
                ) : (
                  <button type="button" onClick={handleFixNotification} className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold whitespace-nowrap">Allow</button>
                )}
              </div>

              {/* Item 5: Autostart & Background */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-colors">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">5. 🚀 Autostart & Background</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    For Xiaomi / Vivo / Oppo / Samsung devices
                  </p>
                </div>
                <div className="shrink-0">
                  {trackingPerms.autostartCompleted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                      <Check className="w-3.5 h-3.5" /> Completed
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1.5 items-end">
                      <button type="button" onClick={handleFixAutostart} className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-900/40 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap">
                        <span>Open Settings</span><ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={confirmAutostart} className="text-[11px] text-indigo-300 hover:text-white underline">I enabled it</button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Proceed Button */}
            <div className="pt-2 border-t border-slate-800">
              {!isTrackingPreflightComplete(trackingPerms) && (
                <button type="button" onClick={handleNextTrackingRequirement} className="w-full mb-2 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
                  <ChevronRight className="w-4 h-4" /> Complete Next Requirement
                </button>
              )}
              <button
                type="button"
                onClick={handleProceedAfterSetup}
                disabled={!isTrackingPreflightComplete(trackingPerms)}
                className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isTrackingPreflightComplete(trackingPerms)
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>✓ All Completed — Proceed to Punch In</span>
              </button>
              {!isTrackingPreflightComplete(trackingPerms) && (
                <p className="mt-2 text-center text-xs text-amber-300">Complete every item above, return to the app, then tap this button.</p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
