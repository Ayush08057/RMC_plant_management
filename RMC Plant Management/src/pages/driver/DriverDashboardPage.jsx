import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import StatusBadge from '../../components/dashboard/StatusBadge';
import Modal from '../../components/dashboard/Modal';
import Toast from '../../components/dashboard/Toast';
import {
  Truck,
  MapPin,
  Navigation,
  RotateCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PhoneCall,
  Compass,
  Layers,
  ArrowRight,
  ShieldAlert,
  User,
  Building2,
  Calendar,
  CheckCircle,
  Camera,
  Gauge,
  Upload,
  Check,
  X
} from 'lucide-react';
import { MOCK_DRIVER_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';
import { formatToIndian12Hr } from '../../utils/shiftUtils';
import { useAuth } from '../../context/AuthContext';
import { pushCloudStore } from '../../services/cloudSyncService';
import { calculateTripDistance, STORAGE_KEYS } from '../../services/plantOperationsService';
import { uploadTripPhoto, validateTripPhotoFile } from '../../services/storageService';

// Workforce Views
import MobilePunchWidget from '../../components/workforce/MobilePunchWidget';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import ShiftManagementView from '../../components/workforce/ShiftManagementView';
import DailyWorkView from '../../components/workforce/DailyWorkView';
import LeaveManagementView from '../../components/workforce/LeaveManagementView';
import AdvanceManagementView from '../../components/workforce/AdvanceManagementView';
import EmployeeDocumentsView from '../../components/workforce/EmployeeDocumentsView';

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const currentDriverId = user?.employeeId || user?.id || 'DRV001';
  const currentDriverName = user?.name || 'Driver';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [problemReason, setProblemReason] = useState('');

  const { getDriverTrips, updateTripMilestone, notifications, attendance } = useWorkforce();

  // Task-level filtered trips for authenticated driver
  const myAssignedTrips = getDriverTrips ? getDriverTrips(currentDriverId) : [];
  const activeTrip = myAssignedTrips.find((t) => t.status !== 'Delivered') || MOCK_DRIVER_DATA.currentTrip;
  const completedTrips = myAssignedTrips.filter((t) => t.status === 'Delivered');

  // Personal attendance history records strictly for logged in driver
  const myAttendanceRecords = (attendance || []).filter(
    (a) => a.employeeId === currentDriverId || a.employeeId === user?.id || a.employeeId === user?.employeeId
  );

  // 4-Step Mobile Workflow State & Persistence
  const [persistedTrips, setPersistedTrips] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRIPS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const effectiveActiveTrip = React.useMemo(() => {
    const fromStorage = (persistedTrips || []).find(
      (t) => t.status !== 'Completed' && (
        t.driverId === currentDriverId ||
        (t.driverName && currentDriverName && t.driverName.toLowerCase().includes(currentDriverName.toLowerCase())) ||
        !t.driverId
      )
    );
    return fromStorage || activeTrip;
  }, [persistedTrips, currentDriverId, currentDriverName, activeTrip]);

  // Determine which of the 4 steps is active
  const currentWorkflowStep = React.useMemo(() => {
    if (!effectiveActiveTrip) return 1;
    if (effectiveActiveTrip.status === 'Completed') return 5; // All done
    if (!effectiveActiveTrip.startOdometer) return 1; // Step 1: Start Trip
    if (!effectiveActiveTrip.arrivedAtSite) return 2; // Step 2: Arrived at Site
    if (!effectiveActiveTrip.siteWorkDone) return 3; // Step 3: Complete Site Work
    return 4; // Step 4: Return to Plant
  }, [effectiveActiveTrip]);

  // Step modal state
  const [showStepModal, setShowStepModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [stepForm, setStepForm] = useState({
    startOdometer: '',
    startOdoPhoto: null,
    startGps: '',
    siteArrivalPhoto: null,
    siteArrivalGps: '',
    siteDeparturePhoto: null,
    siteDepartureGps: '',
    finalOdometer: '',
    finalOdoPhoto: null,
    finalGps: '',
  });
  const [stepError, setStepError] = useState('');
  const [gpsStatus, setGpsStatus] = useState('');

  // 4-Step Definition
  const workflowStages = [
    { step: 1, title: 'Start Trip', desc: 'Starting Odo + Photo + GPS', badge: 'DEPART' },
    { step: 2, title: 'Arrived at Site', desc: 'Site Photo + GPS Coords', badge: 'SITE' },
    { step: 3, title: 'Complete Site Work', desc: 'Departure Photo + GPS', badge: 'UNLOAD' },
    { step: 4, title: 'Return to Plant', desc: 'Final Odo + Auto Distance', badge: 'RETURN' },
  ];

  const openWorkflowStep = (stepNumber) => {
    setModalStep(stepNumber);
    setStepError('');
    setGpsStatus('');
    setStepForm({
      startOdometer: effectiveActiveTrip?.startOdometer || '',
      startOdoPhoto: effectiveActiveTrip?.startOdoPhoto || null,
      startGps: effectiveActiveTrip?.startGps || '',
      siteArrivalPhoto: effectiveActiveTrip?.siteArrivalPhoto || null,
      siteArrivalGps: effectiveActiveTrip?.siteArrivalGps || '',
      siteDeparturePhoto: effectiveActiveTrip?.siteDeparturePhoto || null,
      siteDepartureGps: effectiveActiveTrip?.siteDepartureGps || '',
      finalOdometer: effectiveActiveTrip?.finalOdometer || '',
      finalOdoPhoto: effectiveActiveTrip?.finalOdoPhoto || null,
      finalGps: effectiveActiveTrip?.finalGps || '',
    });
    setShowStepModal(true);
  };

  const captureGpsForField = (field) => {
    setGpsStatus('Detecting device GPS coordinates...');
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = `${pos.coords.latitude.toFixed(6)}° N, ${pos.coords.longitude.toFixed(6)}° E`;
          setStepForm(prev => ({ ...prev, [field]: coords }));
          setGpsStatus(`✓ GPS Locked: ${coords}`);
        },
        () => {
          const fallback = '16.8524° N, 74.5815° E (Sangli Plant)';
          setStepForm(prev => ({ ...prev, [field]: fallback }));
          setGpsStatus(`⚠️ GPS permission denied. Set to Plant base: ${fallback}`);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      const fallback = '16.8524° N, 74.5815° E (Sangli Plant)';
      setStepForm(prev => ({ ...prev, [field]: fallback }));
      setGpsStatus(`GPS not supported. Set to: ${fallback}`);
    }
  };

  const [uploadingField, setUploadingField] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const extractCleanPhotoMeta = (photo) => {
    if (!photo) return null;
    if (typeof photo === 'object' && (photo.storagePath || photo.downloadUrl)) {
      return {
        storagePath: photo.storagePath || null,
        downloadUrl: photo.downloadUrl || null,
        fileName: photo.fileName || 'trip_photo.jpg',
        timestamp: photo.timestamp || Date.now(),
        photoType: photo.photoType || 'photo',
        uploadedBy: photo.uploadedBy || currentDriverId,
        fileSizeFormatted: photo.fileSizeFormatted || ''
      };
    }
    if (typeof photo === 'string') {
      return photo;
    }
    return null;
  };

  const handlePhotoSelect = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStepError('');

    const validation = validateTripPhotoFile(file);
    if (!validation.valid) {
      setStepError(validation.error);
      return;
    }

    // Ephemeral object URL for immediate user visual feedback without persisting Base64
    const previewUrl = URL.createObjectURL(file);
    setStepForm(prev => ({ ...prev, [field]: { previewUrl, uploading: true } }));
    setUploadingField(field);
    setUploadProgress(10);

    try {
      const tripId = effectiveActiveTrip?.dispatchId || effectiveActiveTrip?.id || `TRIP-${Date.now()}`;
      const companyId = user?.companyId || 'sm-concretech';

      const photoMeta = await uploadTripPhoto(file, {
        companyId,
        tripId,
        photoType: field,
        userId: currentDriverId
      }, (pct) => {
        setUploadProgress(pct);
      });

      setStepForm(prev => ({
        ...prev,
        [field]: {
          ...photoMeta,
          previewUrl
        }
      }));
      setToastMessage(`✓ ${file.name} uploaded securely to Cloud Storage!`);
    } catch (err) {
      console.warn('Storage upload notice:', err.message);
      setStepError(`Upload Notice: ${err.message}. Retrying or proceeding with local snapshot.`);
      setStepForm(prev => ({
        ...prev,
        [field]: {
          storagePath: null,
          downloadUrl: null,
          previewUrl,
          fileName: file.name,
          error: err.message
        }
      }));
    } finally {
      setUploadingField(null);
      setUploadProgress(0);
    }
  };

  const handleSaveStep = () => {
    setStepError('');
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    let updatedTrip = { ...effectiveActiveTrip };

    if (modalStep === 1) {
      const startOdo = Number(stepForm.startOdometer);
      if (!startOdo || startOdo <= 0) {
        setStepError('Please enter a valid positive starting odometer reading.');
        return;
      }
      updatedTrip = {
        ...updatedTrip,
        startOdometer: startOdo,
        startOdoPhoto: extractCleanPhotoMeta(stepForm.startOdoPhoto),
        startGps: stepForm.startGps || '16.8524° N, 74.5815° E',
        departureTime: nowTime,
        status: 'In Transit',
      };
      setToastMessage('Step 1 Complete: Starting odometer and GPS logged!');
    } else if (modalStep === 2) {
      updatedTrip = {
        ...updatedTrip,
        arrivedAtSite: true,
        siteArrivalPhoto: extractCleanPhotoMeta(stepForm.siteArrivalPhoto),
        siteArrivalGps: stepForm.siteArrivalGps || '16.8524° N, 74.5815° E',
        siteArrivalTime: nowTime,
        status: 'Arrived',
      };
      setToastMessage('Step 2 Complete: Arrived at pouring site!');
    } else if (modalStep === 3) {
      updatedTrip = {
        ...updatedTrip,
        siteWorkDone: true,
        siteDeparturePhoto: extractCleanPhotoMeta(stepForm.siteDeparturePhoto),
        siteDepartureGps: stepForm.siteDepartureGps || '16.8524° N, 74.5815° E',
        siteDepartureTime: nowTime,
        status: 'Returning',
      };
      setToastMessage('Step 3 Complete: Site pouring completed. Transit mixer returning.');
    } else if (modalStep === 4) {
      const finalOdo = Number(stepForm.finalOdometer);
      const startOdo = Number(updatedTrip.startOdometer) || Number(stepForm.startOdometer) || 0;
      if (!finalOdo || finalOdo <= 0) {
        setStepError('Please enter a valid positive final odometer reading.');
        return;
      }
      try {
        const tripDistance = calculateTripDistance(startOdo, finalOdo);
        updatedTrip = {
          ...updatedTrip,
          finalOdometer: finalOdo,
          finalOdoPhoto: extractCleanPhotoMeta(stepForm.finalOdoPhoto),
          finalGps: stepForm.finalGps || '16.8524° N, 74.5815° E',
          plantReturnTime: nowTime,
          distanceKm: tripDistance,
          tripDistanceKm: tripDistance,
          status: 'Completed',
        };
        setToastMessage(`Step 4 Complete: Trip finalized! Distance calculated: ${tripDistance} km`);
      } catch (err) {
        setStepError(err.message);
        return;
      }
    }

    // Persist trip to storage & cloud
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRIPS);
      let list = raw ? JSON.parse(raw) : [];
      let found = false;
      list = list.map(t => {
        if (t.id === updatedTrip.id || (updatedTrip.dispatchId && t.dispatchId === updatedTrip.dispatchId)) {
          found = true;
          return updatedTrip;
        }
        return t;
      });
      if (!found) {
        list.unshift(updatedTrip);
      }
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(list));
      pushCloudStore('cloud_driver_trips', STORAGE_KEYS.TRIPS, list);
      setPersistedTrips(list);

      // If Step 4 is completed, mark matching Delivery Challan as Delivered
      if (modalStep === 4 && updatedTrip.challanNo) {
        try {
          const chRaw = localStorage.getItem(STORAGE_KEYS.CHALLANS);
          if (chRaw) {
            const chList = JSON.parse(chRaw).map(c => {
              if (c.challanNo === updatedTrip.challanNo || c.id === updatedTrip.challanId) {
                return { ...c, status: 'Delivered' };
              }
              return c;
            });
            localStorage.setItem(STORAGE_KEYS.CHALLANS, JSON.stringify(chList));
            pushCloudStore('cloud_delivery_challans', STORAGE_KEYS.CHALLANS, chList);
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Storage sync error:', e);
    }

    setShowStepModal(false);
  };

  const handleReportProblem = (e) => {
    e.preventDefault();
    if (!problemReason) return;
    setToastMessage(`Alert broadcasted: "${problemReason}". Dispatcher notified!`);
    setShowProblemModal(false);
    setProblemReason('');
  };

  return (
    <AppLayout
      title="Driver Personal Portal"
      badge={`ID: ${currentDriverId}`}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setToastMessage('Connecting to Plant Dispatcher Hotline...')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5 text-white" />
            <span className="hidden xs:inline">Call Dispatch</span>
          </button>
        </div>
      }
    >
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <MobilePunchWidget
            lockedEmployeeId={currentDriverId}
            roleLocked={true}
            onPunched={() => setToastMessage('Driver attendance verified and synced!')}
          />

          {/* Personal Punch Log History */}
          <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
                  <Clock className="w-3 h-3" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    My Attendance & Punch-In History
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Showing verified duty logs strictly for {currentDriverName} ({currentDriverId})
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                AUTHENTICATED DRIVER ONLY
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] text-xs text-left">
                <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono uppercase text-[11px] font-bold tracking-wider border-b-2 border-[#0B2546]">
                  <tr>
                    <th className="py-3 px-3 text-white border-r border-white/20">Date</th>
                    <th className="py-3 px-3 text-white border-r border-white/20">Punch In</th>
                    <th className="py-3 px-3 text-white border-r border-white/20">Punch Out</th>
                    <th className="py-3 px-3 text-white border-r border-white/20">Total Hours</th>
                    <th className="py-3 px-3 text-white border-r border-white/20">Face Recognition Photo</th>
                    <th className="py-3 px-3 text-white">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {myAttendanceRecords.length > 0 ? (
                    myAttendanceRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono text-slate-900 font-bold">{rec.date}</td>
                        <td className="py-3 px-3 font-mono text-emerald-700 font-bold">{formatToIndian12Hr(rec.punchIn) || '--:--'}</td>
                        <td className="py-3 px-3 font-mono text-rose-700 font-bold">{formatToIndian12Hr(rec.punchOut) || '--:--'}</td>
                        <td className="py-3 px-3 font-mono text-slate-700">{rec.workingHours ? `${rec.workingHours}h` : '--'}</td>
                        <td className="py-3 px-3">
                          {rec.selfieUrl ? (
                            <div className="flex items-center gap-2">
                              <img src={rec.selfieUrl} alt="Face" className="w-7 h-7 rounded-lg object-cover border border-emerald-300" />
                              <span className="text-[11px] font-semibold text-emerald-700">Verified</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">--</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={rec.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                        No previous attendance records logged yet for {currentDriverName}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'shifts' && <ShiftManagementView employeeFilter={currentDriverId} isEmployeeView={true} />}
      {activeTab === 'daily-work' && <DailyWorkView employeeFilter={currentDriverId} />}
      {activeTab === 'leaves' && <LeaveManagementView employeeFilter={currentDriverId} />}
      {activeTab === 'advances' && <AdvanceManagementView employeeFilter={currentDriverId} />}
      {activeTab === 'documents' && <EmployeeDocumentsView employeeFilter={currentDriverId} />}

      {/* Profile / Details Tab */}
      {activeTab === 'profile' && (
        <section className="p-5 sm:p-7 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {currentDriverName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{currentDriverName}</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 font-mono">
                {currentDriverId} • Transit Mixer Driver
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Email Address</span>
              <span className="font-semibold text-slate-800">{user?.email || 'driver@smconcretech.com'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Assigned Mixer Unit</span>
              <span className="font-mono font-bold text-amber-700">{activeTrip?.vehicleNo || 'Not Assigned'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Plant Base</span>
              <span className="font-semibold text-slate-800">{user?.plantLocation || 'Main Plant Unit #01'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Account Clearance</span>
              <span className="font-semibold text-emerald-600 font-mono">ACTIVE (DRIVER PORTAL)</span>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Mobile Attendance Punch Terminal */}
          <section>
            <MobilePunchWidget
              lockedEmployeeId={currentDriverId}
              roleLocked={true}
              onPunched={() => setToastMessage('Attendance verified and synced!')}
            />
          </section>

          {/* DRIVER PRIORITY SECTION 1: ACTIVE ASSIGNED TRIP */}
          {activeTrip ? (
            <section className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3.5 w-full max-w-full overflow-hidden">
              {/* Top Badges & Delivery ID */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white font-mono tracking-wider">
                      MY ASSIGNED TRIP
                    </span>
                    <span className="text-xs text-amber-700 font-mono font-bold">
                      {activeTrip.dispatchId || activeTrip.id}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {activeTrip.customer}
                  </h2>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 font-mono">
                    Vehicle: {activeTrip.vehicleNo}
                  </span>
                </div>
              </div>

              {/* Destination Site Block */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold block">Destination Site:</span>
                    <div className="text-base sm:text-lg font-bold text-slate-900">{activeTrip.site}</div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{activeTrip.siteAddress}</p>
                  </div>
                </div>
              </div>

              {/* Concrete Load Vital Signs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Mix Grade</span>
                  <span className="text-base sm:text-lg font-black text-amber-700 font-mono block mt-0.5">
                    {activeTrip.concreteGrade}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Load Volume</span>
                  <span className="text-base sm:text-lg font-black text-slate-800 font-mono block mt-0.5">
                    {activeTrip.quantity}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Target ETA</span>
                  <span className="text-base sm:text-lg font-black text-emerald-600 font-mono block mt-0.5">
                    {activeTrip.expectedDeliveryTime}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Drum Agitation</span>
                  <span className="text-base sm:text-lg font-black text-cyan-700 font-mono block mt-0.5">
                    3.5 RPM (OK)
                  </span>
                </div>
              </div>

              {/* 4-Step Smartphone Delivery Progress Track */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-amber-600" />
                    <span>Driver 4-Step Trip Workflow</span>
                  </span>
                  <span className="font-mono text-amber-700 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {currentWorkflowStep <= 4 ? `Step ${currentWorkflowStep}/4: ${workflowStages[currentWorkflowStep - 1]?.title}` : '✓ Trip Completed'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {workflowStages.map((st) => {
                    const isDone = st.step < currentWorkflowStep;
                    const isCurrent = st.step === currentWorkflowStep;
                    return (
                      <button
                        key={st.step}
                        type="button"
                        onClick={() => openWorkflowStep(st.step)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isDone 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                            : isCurrent
                              ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-400 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isDone ? 'bg-emerald-200 text-emerald-800' : isCurrent ? 'bg-amber-200 text-amber-900 font-bold' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {st.badge}
                          </span>
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400 font-bold">#{st.step}</span>
                          )}
                        </div>
                        <div className="font-bold text-xs truncate">{st.title}</div>
                        <div className="text-[9px] text-slate-500 truncate mt-0.5">{st.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Smartphone Action Buttons */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                {currentWorkflowStep <= 4 ? (
                  <button
                    type="button"
                    onClick={() => openWorkflowStep(currentWorkflowStep)}
                    className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span className="truncate">
                      {currentWorkflowStep === 1 && 'STEP 1: START TRIP (LOG ODO & GPS)'}
                      {currentWorkflowStep === 2 && 'STEP 2: ARRIVED AT SITE (SNAP PHOTO)'}
                      {currentWorkflowStep === 3 && 'STEP 3: COMPLETE SITE WORK (DEPART)'}
                      {currentWorkflowStep === 4 && 'STEP 4: RETURN TO PLANT & CLOSE TRIP'}
                    </span>
                    <ArrowRight className="w-5 h-5 shrink-0" />
                  </button>
                ) : (
                  <div className="w-full py-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-center flex items-center justify-center gap-2 text-sm shadow-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>TRIP COMPLETED • RETURNED TO PLANT FACILITY ({effectiveActiveTrip.distanceKm || 0} KM)</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setToastMessage(`Navigation launched to: ${activeTrip.site}`)}
                    className="py-3 px-4 rounded-xl font-bold text-xs bg-cyan-700 hover:bg-cyan-800 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <Compass className="w-4 h-4 shrink-0" />
                    <span>OPEN GPS ROUTE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowProblemModal(true)}
                    className="py-3 px-4 rounded-xl font-bold text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>REPORT DELAY / ISSUE</span>
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="p-8 sm:p-12 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                No Active Delivery Trips Assigned
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Driver <span className="font-mono font-bold text-amber-700">{currentDriverId}</span> is currently on standby. Trips assigned to your employee ID by plant dispatchers will appear here.
              </p>
            </section>
          )}

          {/* DRIVER SECTION 2: Mixer Drum Telemetry */}
          <section className="p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-cyan-600" />
                <span>Transit Mixer Drum Status</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">
                {activeTrip ? 'AGITATION SAFE' : 'STANDBY'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Drum Speed Sensor:</span>
                <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
                  {activeTrip ? '3.5 RPM (Agitation Mode)' : '0.0 RPM (Stationary)'}
                </span>
                <span className="text-[10px] text-emerald-600">Prevents concrete flash setting</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Batch Freshness Timer:</span>
                <span className="text-base font-bold text-amber-700 font-mono mt-0.5 block">
                  {activeTrip ? 'Active Pour Window' : 'No Active Batch'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeTrip ? '90-minute maximum limit' : 'Ready for batch allocation'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">On-Site Water Added:</span>
                <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">0.0 Litres (Zero)</span>
                <span className="text-[10px] text-slate-500">Preserves mix strength</span>
              </div>
            </div>
          </section>

          {/* DRIVER SECTION 3: Completed Trips */}
          <section className="p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>My Completed Trips Today ({completedTrips.length} Delivered)</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">{completedTrips.length} SHIPPED</span>
            </div>

            <div className="space-y-2">
              {completedTrips.length > 0 ? (
                completedTrips.map((tr) => (
                  <div key={tr.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 font-mono">{tr.dispatchId || tr.id} • {tr.site}</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">Delivered to {tr.customer}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 font-mono text-sm">{tr.quantity}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-mono">
                  No completed delivery trips logged for today yet
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Problem Report Modal */}
      <Modal
        isOpen={showProblemModal}
        onClose={() => setShowProblemModal(false)}
        title="Report Transit Delay / Problem"
        subtitle="Broadcast alert directly to plant dispatch hotline."
        icon={AlertTriangle}
      >
        <form onSubmit={handleReportProblem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Problem Category *
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['Traffic Jam (>30m)', 'Flat Tyre / Breakdown', 'Site Access Blocked', 'Pump Broken at Site'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setProblemReason(cat)}
                  className={`p-2.5 rounded-xl border text-left font-medium transition-colors cursor-pointer ${problemReason === cat
                      ? 'bg-rose-50 border-rose-400 text-rose-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowProblemModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!problemReason}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
            >
              Send Alert to Dispatch
            </button>
          </div>
        </form>
      </Modal>

      {/* Driver 4-Step Workflow Modal */}
      <Modal
        isOpen={showStepModal}
        onClose={() => setShowStepModal(false)}
        title={
          modalStep === 1 ? 'Step 1: Start Trip (Depart Plant)' :
          modalStep === 2 ? 'Step 2: Arrived at Pouring Site' :
          modalStep === 3 ? 'Step 3: Complete Site Work & Depart' :
          'Step 4: Return to Plant & Finalize Trip'
        }
      >
        <div className="space-y-4 text-xs font-sans">
          {/* Step Error Banner */}
          {stepError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{stepError}</span>
            </div>
          )}

          {/* Active Trip Header */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900">{effectiveActiveTrip?.customer || 'Customer Site'}</span>
              <span className="font-mono font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                TM: {effectiveActiveTrip?.vehicleNo || 'TM Unit'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{effectiveActiveTrip?.site || 'Site Location'}</span>
            </div>
          </div>

          {/* STEP 1: START TRIP */}
          {modalStep === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  <span>Starting Odometer Reading (km) *</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 14250"
                  value={stepForm.startOdometer}
                  onChange={(e) => setStepForm(prev => ({ ...prev, startOdometer: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Start Odometer Photo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>Odometer Photo (Dashboard)</span>
                  </label>
                  {stepForm.startOdoPhoto?.storagePath && (
                    <span className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      ✓ Cloud Stored
                    </span>
                  )}
                </div>
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl cursor-pointer bg-slate-50/50 transition-colors">
                  <Camera className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-slate-700">
                    {uploadingField === 'startOdoPhoto'
                      ? `Uploading to Cloud Storage... ${uploadProgress}%`
                      : stepForm.startOdoPhoto
                        ? '✓ Photo Selected (Tap to retake)'
                        : 'Take Photo or Choose File'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={uploadingField === 'startOdoPhoto'}
                    onChange={(e) => handlePhotoSelect(e, 'startOdoPhoto')}
                    className="hidden"
                  />
                </label>
                {uploadingField === 'startOdoPhoto' && (
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                    <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
                {(stepForm.startOdoPhoto?.downloadUrl || stepForm.startOdoPhoto?.previewUrl || typeof stepForm.startOdoPhoto === 'string') && (
                  <div className="mt-2 text-center">
                    <img
                      src={stepForm.startOdoPhoto?.downloadUrl || stepForm.startOdoPhoto?.previewUrl || (typeof stepForm.startOdoPhoto === 'string' ? stepForm.startOdoPhoto : '')}
                      alt="Odo"
                      className="h-20 mx-auto rounded-lg border object-cover shadow-2xs"
                    />
                    {stepForm.startOdoPhoto?.storagePath && (
                      <p className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">{stepForm.startOdoPhoto.storagePath}</p>
                    )}
                  </div>
                )}
              </div>

              {/* GPS Capture */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-cyan-600" />
                    <span>GPS Telemetry</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => captureGpsForField('startGps')}
                    className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Capture Plant GPS</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  {stepForm.startGps || 'GPS not yet captured (Will use Sangli Plant coords)'}
                </div>
                {gpsStatus && <div className="text-[10px] text-emerald-700 font-medium">{gpsStatus}</div>}
              </div>
            </div>
          )}

          {/* STEP 2: ARRIVED AT SITE */}
          {modalStep === 2 && (
            <div className="space-y-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-medium">
                Confirm your arrival at customer delivery site: <strong>{effectiveActiveTrip?.site}</strong>.
              </div>

              {/* Site Arrival Photo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Site Arrival Photo (Truck at Site)</span>
                  </label>
                  {stepForm.siteArrivalPhoto?.storagePath && (
                    <span className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      ✓ Cloud Stored
                    </span>
                  )}
                </div>
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-50/50 transition-colors">
                  <Camera className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-slate-700">
                    {uploadingField === 'siteArrivalPhoto'
                      ? `Uploading to Cloud Storage... ${uploadProgress}%`
                      : stepForm.siteArrivalPhoto
                        ? '✓ Arrival Photo Captured (Tap to retake)'
                        : 'Take Site Photo or Choose File'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={uploadingField === 'siteArrivalPhoto'}
                    onChange={(e) => handlePhotoSelect(e, 'siteArrivalPhoto')}
                    className="hidden"
                  />
                </label>
                {uploadingField === 'siteArrivalPhoto' && (
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
                {(stepForm.siteArrivalPhoto?.downloadUrl || stepForm.siteArrivalPhoto?.previewUrl || typeof stepForm.siteArrivalPhoto === 'string') && (
                  <div className="mt-2 text-center">
                    <img
                      src={stepForm.siteArrivalPhoto?.downloadUrl || stepForm.siteArrivalPhoto?.previewUrl || (typeof stepForm.siteArrivalPhoto === 'string' ? stepForm.siteArrivalPhoto : '')}
                      alt="Site Arrival"
                      className="h-20 mx-auto rounded-lg border object-cover shadow-2xs"
                    />
                    {stepForm.siteArrivalPhoto?.storagePath && (
                      <p className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">{stepForm.siteArrivalPhoto.storagePath}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Site GPS Capture */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Site Location Coordinates</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => captureGpsForField('siteArrivalGps')}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Capture Site GPS</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  {stepForm.siteArrivalGps || 'GPS not yet captured'}
                </div>
                {gpsStatus && <div className="text-[10px] text-emerald-700 font-medium">{gpsStatus}</div>}
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETE SITE WORK */}
          {modalStep === 3 && (
            <div className="space-y-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 font-medium">
                Concrete pouring finished. Capture departure photo / signed Challan before driving back.
              </div>

              {/* Site Departure Photo */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Site Departure / Signed Slip Photo</span>
                </label>
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-50/50 transition-colors">
                  <Camera className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-slate-700">
                    {stepForm.siteDeparturePhoto ? '✓ Departure Photo Captured' : 'Take Slip Photo or Choose File'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoSelect(e, 'siteDeparturePhoto')}
                    className="hidden"
                  />
                </label>
                {stepForm.siteDeparturePhoto && (
                  <div className="mt-2 text-center">
                    <img src={stepForm.siteDeparturePhoto} alt="Site Departure" className="h-20 mx-auto rounded-lg border object-cover" />
                  </div>
                )}
              </div>

              {/* Site Departure GPS */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Departure GPS</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => captureGpsForField('siteDepartureGps')}
                    className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Capture GPS</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  {stepForm.siteDepartureGps || 'GPS not yet captured'}
                </div>
                {gpsStatus && <div className="text-[10px] text-indigo-700 font-medium">{gpsStatus}</div>}
              </div>
            </div>
          )}

          {/* STEP 4: RETURN TO PLANT */}
          {modalStep === 4 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Start Odometer</span>
                  <span className="font-mono font-black text-slate-800 text-sm">
                    {effectiveActiveTrip?.startOdometer || stepForm.startOdometer || 0} km
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Calculated Trip Distance</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {Number(stepForm.finalOdometer) && Number(effectiveActiveTrip?.startOdometer || stepForm.startOdometer)
                      ? `${Math.max(0, (Number(stepForm.finalOdometer) - Number(effectiveActiveTrip?.startOdometer || stepForm.startOdometer)).toFixed(1))} km`
                      : '-- km'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  <span>Final Return Odometer Reading (km) *</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 14285"
                  value={stepForm.finalOdometer}
                  onChange={(e) => setStepForm(prev => ({ ...prev, finalOdometer: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Final Return Odo Photo */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Return Odometer Photo</span>
                </label>
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-50/50 transition-colors">
                  <Camera className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-slate-700">
                    {stepForm.finalOdoPhoto ? '✓ Return Photo Captured' : 'Take Photo or Choose File'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoSelect(e, 'finalOdoPhoto')}
                    className="hidden"
                  />
                </label>
                {stepForm.finalOdoPhoto && (
                  <div className="mt-2 text-center">
                    <img src={stepForm.finalOdoPhoto} alt="Final Odo" className="h-20 mx-auto rounded-lg border object-cover" />
                  </div>
                )}
              </div>

              {/* Plant Return GPS */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Plant Gate GPS</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => captureGpsForField('finalGps')}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Capture Plant GPS</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  {stepForm.finalGps || 'GPS not yet captured'}
                </div>
                {gpsStatus && <div className="text-[10px] text-emerald-700 font-medium">{gpsStatus}</div>}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowStepModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveStep}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirm & Save Step</span>
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </AppLayout>
  );
}
