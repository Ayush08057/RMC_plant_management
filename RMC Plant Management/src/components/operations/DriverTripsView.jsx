import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  ArrowRight,
  User,
  Phone,
  Navigation,
  Calendar,
  RefreshCw,
  Gauge,
  Camera,
  X
} from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';
import { useWorkforce } from '../../context/WorkforceContext';
import HelpModal from './guided/HelpModal';
import RecordVehicleReturnWizard from './guided/RecordVehicleReturnWizard';
import { useLanguage } from '../../context/LanguageContext';
import { uploadTripPhoto, validateTripPhotoFile } from '../../services/storageService';

const STORAGE_KEY = 'rmc_driver_trips_v2';

const INITIAL_TRIPS = [];

export default function DriverTripsView() {
  const { language, t } = useLanguage();
  const { employees } = useWorkforce();
  const [helpOpen, setHelpOpen] = useState(false);
  const [returnWizardOpen, setReturnWizardOpen] = useState(false);

  // Dynamic driver list from real registered workforce
  const registeredDrivers = React.useMemo(() => {
    return (employees || []).filter((e) => {
      if (!e) return false;
      const roleLower = (e.role || '').toLowerCase();
      const deptLower = (e.department || '').toLowerCase();
      return (
        roleLower.includes('driver') ||
        deptLower.includes('transport') ||
        deptLower.includes('logistics') ||
        deptLower.includes('fleet')
      );
    });
  }, [employees]);

  const [trips, setTrips] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_TRIPS;
    } catch {
      return INITIAL_TRIPS;
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhotoTrip, setSelectedPhotoTrip] = useState(null);

  // New Trip form state
  const [newTrip, setNewTrip] = useState({
    vehicleNo: '',
    driverName: '',
    driverPhone: '',
    clientName: '',
    siteName: '',
    distanceKm: 15,
    grade: 'M25',
    quantityM3: 6.0,
    challanNo: `DC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    remarks: ''
  });

  // Subscribe to real-time Cloud Sync for cross-device updates
  useEffect(() => {
    const unsub = subscribeCloudStore('cloud_driver_trips', STORAGE_KEY, INITIAL_TRIPS, (cloudTrips) => {
      if (Array.isArray(cloudTrips)) {
        setTrips(cloudTrips);
      }
    });
    return () => unsub();
  }, []);

  // Save changes to localStorage & Cloud Firestore
  useEffect(() => {
    pushCloudStore('cloud_driver_trips', STORAGE_KEY, trips);
  }, [trips]);

  // Helper to calculate turnaround minutes from actual departure and return times
  const calculateTurnaroundMinutes = (departureTimeStr, returnTimeStr) => {
    try {
      if (!departureTimeStr) return 0;
      const now = new Date();
      const depParts = departureTimeStr.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
      if (!depParts) return 0;
      let depHour = parseInt(depParts[1], 10);
      const depMin = parseInt(depParts[2], 10);
      const depAmPm = depParts[3];
      if (depAmPm && depAmPm.toUpperCase() === 'PM' && depHour < 12) depHour += 12;
      if (depAmPm && depAmPm.toUpperCase() === 'AM' && depHour === 12) depHour = 0;

      const depDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), depHour, depMin);
      const diffMs = Math.max(0, now.getTime() - depDate.getTime());
      const diffMins = Math.round(diffMs / (1000 * 60));
      return diffMins > 0 ? diffMins : 15;
    } catch {
      return 45;
    }
  };

  // Stage advancement
  const advanceTripStage = (tripId) => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;

      if (t.status === 'Departed') {
        return { ...t, status: 'At Site', siteArrivalTime: nowStr };
      }
      if (t.status === 'At Site') {
        return { ...t, status: 'Pouring', pourStartTime: nowStr };
      }
      if (t.status === 'Pouring') {
        return { ...t, status: 'Returning', pourEndTime: nowStr };
      }
      if (t.status === 'Returning') {
        const actualTurnaround = calculateTurnaroundMinutes(t.departureTime, nowStr);
        const finalOdo = t.finalOdometer;
        const diffKm = (t.startOdometer && finalOdo && Number(finalOdo) >= Number(t.startOdometer))
          ? Number((Number(finalOdo) - Number(t.startOdometer)).toFixed(1))
          : (t.distanceKm || null);
        return { 
          ...t, 
          status: 'Completed', 
          plantReturnTime: nowStr, 
          turnaroundMins: actualTurnaround,
          finalOdometer: finalOdo,
          distanceKm: diffKm,
          tripDistanceKm: diffKm
        };
      }
      return t;
    }));
  };

  const handleCreateTrip = (e) => {
    e.preventDefault();
    if (!newTrip.clientName || !newTrip.siteName) {
      alert('Please fill client name and site address');
      return;
    }

    const sOdo = Number(newTrip.startOdometer);
    if (!sOdo || sOdo <= 0) {
      alert('Please enter a valid starting odometer reading from the vehicle dashboard.');
      return;
    }

    // Prevent duplicate active trips for the same vehicle
    const vehicleTrimmed = (newTrip.vehicleNo || '').trim().toUpperCase();
    if (vehicleTrimmed) {
      const activeForVehicle = trips.find(t => 
        t.status !== 'Completed' && 
        (t.vehicleNo || '').trim().toUpperCase() === vehicleTrimmed
      );
      if (activeForVehicle) {
        alert(`Vehicle ${vehicleTrimmed} is already on an active trip (#${activeForVehicle.id || activeForVehicle.tripId})! Return or complete that trip before dispatching again.`);
        return;
      }
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const createdTrip = {
      id: `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
      ...newTrip,
      vehicleNo: vehicleTrimmed,
      startOdometer: sOdo,
      startOdometer: sOdo,
      finalOdometer: null,
      departureTime: nowStr,
      siteArrivalTime: null,
      pourStartTime: null,
      pourEndTime: null,
      plantReturnTime: null,
      status: 'Departed',
      turnaroundMins: null,
      createdAt: new Date().toISOString()
    };

    setTrips([createdTrip, ...trips]);
    setIsModalOpen(false);
    setNewTrip({
      vehicleNo: 'MH-12-RN-4401',
      driverName: 'Ramesh Pawar',
      driverPhone: '+91 98221 44012',
      clientName: '',
      siteName: '',
      startOdometer: '',
      distanceKm: 15,
      grade: 'M25',
      quantityM3: 6.0,
      challanNo: `DC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      remarks: '',
      sitePhoto: null
    });
  };

  const filteredTrips = trips.filter(t => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.status && t.status.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'ALL' || statusFilter === 'All') {
      matchesStatus = true;
    } else if (statusFilter === 'Active' || statusFilter === 'ACTIVE') {
      matchesStatus = t.status !== 'Completed';
    } else if (statusFilter === 'Completed' || statusFilter === 'COMPLETED') {
      matchesStatus = t.status === 'Completed';
    } else {
      matchesStatus = t.status === statusFilter;
    }
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Departed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            En Route
          </span>
        );
      case 'At Site':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            At Site
          </span>
        );
      case 'Pouring':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
            Pouring
          </span>
        );
      case 'Returning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            Returning
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <CheckCircle size={11} className="text-emerald-600" />
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getNextStageLabel = (status) => {
    switch (status) {
      case 'Departed': return 'Reached Site 📍';
      case 'At Site': return 'Start Pour ⚡';
      case 'Pouring': return 'Finish & Return 🔄';
      case 'Returning': return 'Mark Returned ✅';
      default: return null;
    }
  };

  const activeTripsCount = trips.filter(t => t.status !== 'Completed').length;
  const completedToday = trips.filter(t => t.status === 'Completed').length;
  const totalVolumeDelivered = trips.reduce((acc, t) => acc + (t.status === 'Completed' ? Number(t.quantityM3 || 0) : 0), 0);
  const completedWithTurnaround = trips.filter(t => t.status === 'Completed' && t.turnaroundMins);
  const avgTurnaround = completedWithTurnaround.length > 0
    ? Math.round(completedWithTurnaround.reduce((acc, t) => acc + Number(t.turnaroundMins), 0) / completedWithTurnaround.length)
    : 125;

  return (
    <div className="space-y-1.5 sm:space-y-2 max-w-7xl mx-auto pb-4">
      {/* 1. Compact 1-Row Summary Stats Strip: In-Transit: Completed: Delivered: Turnaround: */}

      <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#D4E4F7] shadow-2xs flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Truck size={13} className="text-blue-600" />
          <span className="text-slate-500 text-[11px]">{t('In-Transit')}:</span>
          <span className="font-bold text-slate-900 text-xs">{activeTripsCount} <span className="font-normal text-slate-500 text-[10px]">{language === 'mr' ? 'गाड्या' : 'mixers'}</span></span>
        </div>
        <div className="h-3 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <CheckCircle size={13} className="text-emerald-600" />
          <span className="text-slate-500 text-[11px]">{t('Completed')}:</span>
          <span className="font-bold text-slate-900 text-xs">{completedToday} <span className="font-normal text-slate-500 text-[10px]">{language === 'mr' ? 'फेऱ्या' : 'trips'}</span></span>
        </div>
        <div className="h-3 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <Gauge size={13} className="text-amber-600" />
          <span className="text-slate-500 text-[11px]">{t('Delivered')}:</span>
          <span className="font-bold text-slate-900 text-xs">{totalVolumeDelivered.toFixed(1)} <span className="font-normal text-slate-500 text-[10px]">m³</span></span>
        </div>
        <div className="h-3 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-purple-600" />
          <span className="text-slate-500 text-[11px]">{language === 'mr' ? 'सरासरी वेळ:' : 'Turnaround:'}</span>
          <span className="font-bold text-slate-900 text-xs">{avgTurnaround} <span className="font-normal text-slate-500 text-[10px]">{language === 'mr' ? 'मि/फेरी' : 'min/trip'}</span></span>
        </div>
      </div>

      {/* 2. Compact Search, Filter & Dispatch Toolbar */}
      <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#D4E4F7] shadow-2xs flex flex-wrap items-center justify-between gap-1.5">
        {/* Search Field */}
        <div className="relative w-full sm:w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('Search trip, mixer, driver, site...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2 py-1 h-7 bg-slate-50/70 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#136dec] focus:bg-white text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Status Filters - Simplified Options */}
        <div className="flex items-center gap-1">
          {[
            { key: 'ALL', label: 'All' },
            { key: 'Active', label: 'Active' },
            { key: 'Completed', label: 'Completed' }
          ].map(({ key, label }) => {
            const isSelected = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`h-7 px-3 rounded text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#136dec] text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 font-medium'
                }`}
              >
                {t(label)}
              </button>
            );
          })}
        </div>

        {/* Actions: Record Return & Dispatch Trip */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setReturnWizardOpen(true)}
            className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            title={language === 'mr' ? 'गाडी परत आल्याची नोंद' : 'Record Vehicle Return'}
          >
            <CheckCircle size={13} />
            <span>{language === 'mr' ? 'गाडी परत आली' : 'Record Return'}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-7 px-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>{language === 'mr' ? 'गाडी रवाना करा' : 'Dispatch Trip'}</span>
          </button>
        </div>
      </div>

      {/* 3. Trips List - Compact, Space-Optimized Rows */}
      <div className="space-y-1.5">
        {filteredTrips.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center border border-[#D4E4F7] text-slate-500 shadow-2xs">
            <Truck size={24} className="mx-auto text-slate-400 mb-1.5" />
            <p className="font-semibold text-slate-700 text-xs">No transit mixer trips found</p>
            <p className="text-[11px] text-slate-500">Try resetting search or filter.</p>
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const nextAction = getNextStageLabel(trip.status);
            return (
              <div
                key={trip.id}
                className="bg-white rounded-lg border border-[#D4E4F7] hover:border-[#136dec]/40 transition-all px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-2xs flex flex-wrap md:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 text-xs"
              >
                {/* 1. Trip ID, Challan & Grade */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono font-bold text-slate-900 text-xs">{trip.id}</span>
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-medium">
                    {trip.challanNo}
                  </span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    {trip.grade} • {trip.quantityM3}m³
                  </span>
                </div>

                {/* 2. Vehicle & Driver */}
                <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                  <Truck size={12} className="text-slate-500 shrink-0" />
                  <span className="font-bold text-slate-800">{trip.vehicleNo}</span>
                  <span className="text-slate-500">({trip.driverName})</span>
                </div>

                {/* 3. Destination Site */}
                <div className="flex items-center gap-1 min-w-0 flex-1 text-[11px] truncate">
                  <MapPin size={12} className="text-rose-500 shrink-0" />
                  <span className="font-medium text-slate-800 truncate" title={`${trip.clientName} - ${trip.siteName}`}>
                    {trip.clientName} - {trip.siteName}
                  </span>
                  {trip.distanceKm ? (
                    <span className="text-slate-400 font-mono shrink-0">({trip.distanceKm}km)</span>
                  ) : null}
                </div>

                {/* 4. Timestamp & Status */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-600">
                    <Clock size={11} className="text-slate-400" />
                    <span>{trip.status === 'Completed' ? trip.plantReturnTime : (trip.pourStartTime || trip.departureTime || '--')}</span>
                  </div>
                  {getStatusBadge(trip.status)}
                  {(trip.startOdoPhoto || trip.siteArrivalPhoto || trip.siteDeparturePhoto || trip.finalOdoPhoto) && (
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoTrip(trip)}
                      className="p-1 rounded text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                      title="View Trip Photographs"
                    >
                      <Camera size={12} />
                      <span className="hidden sm:inline">Photos</span>
                    </button>
                  )}
                </div>

                {/* 5. Action / Turnaround */}
                <div className="shrink-0">
                  {nextAction ? (
                    <button
                      onClick={() => advanceTripStage(trip.id)}
                      className="h-6 px-2.5 bg-[#136dec] hover:bg-[#0f5ac5] text-white font-semibold text-[11px] rounded shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <span>{nextAction}</span>
                      <ArrowRight size={10} />
                    </button>
                  ) : trip.status === 'Completed' ? (
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {trip.turnaroundMins || 120}m turnaround
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-4 sm:p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3.5">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="text-[#136dec]" size={18} />
                <span>Dispatch Transit Mixer</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Vehicle / Mixer No *</label>
                  <input
                    type="text"
                    value={newTrip.vehicleNo}
                    onChange={(e) => setNewTrip({ ...newTrip, vehicleNo: e.target.value.toUpperCase() })}
                    placeholder="e.g. MH-10-CR-1212"
                    list="trip-vehicle-suggestions"
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-2 font-mono uppercase bg-slate-50 text-slate-800 text-xs focus:ring-1 focus:ring-[#136dec]"
                    required
                  />
                  <datalist id="trip-vehicle-suggestions">
                    <option value="MH-10-CR-1212">TM-01 (6 m³)</option>
                    <option value="MH-10-CR-1313">TM-02 (6 m³)</option>
                    <option value="MH-10-CR-1414">TM-03 (6 m³)</option>
                    <option value="MH-10-CR-1515">TM-04 (7 m³)</option>
                    <option value="MH-10-CR-1616">TM-05 (8 m³)</option>
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Driver Name *</label>
                  {registeredDrivers.length > 0 ? (
                    <select
                      value={newTrip.driverName}
                      onChange={(e) => {
                        const selDriver = registeredDrivers.find((d) => d.name === e.target.value);
                        setNewTrip({
                          ...newTrip,
                          driverName: e.target.value,
                          driverPhone: selDriver?.mobile || newTrip.driverPhone,
                        });
                      }}
                      className="w-full border border-slate-200 rounded-lg py-1.5 px-2 bg-slate-50 text-slate-800 font-semibold text-xs focus:ring-1 focus:ring-[#136dec]"
                      required
                    >
                      <option value="">Select Registered Driver</option>
                      {registeredDrivers.map((d, idx) => (
                        <option key={d?.id || d?.name || idx} value={d?.name || ''}>
                          {d?.name || 'Driver'} ({d?.id || 'DRV'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newTrip.driverName}
                      onChange={(e) => setNewTrip({ ...newTrip, driverName: e.target.value })}
                      placeholder="Enter driver name"
                      className="w-full border border-slate-200 rounded-lg py-1.5 px-2 bg-slate-50 text-slate-800 font-semibold text-xs focus:ring-1 focus:ring-[#136dec]"
                      required
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Godrej Properties Ltd"
                  value={newTrip.clientName}
                  onChange={(e) => setNewTrip({ ...newTrip, clientName: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#136dec]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Site Destination & Address *</label>
                <input
                  type="text"
                  placeholder="e.g. Godrej Woods, Baner Ph-2"
                  value={newTrip.siteName}
                  onChange={(e) => setNewTrip({ ...newTrip, siteName: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#136dec]"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Grade</label>
                  <select
                    value={newTrip.grade}
                    onChange={(e) => setNewTrip({ ...newTrip, grade: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-2 bg-slate-50 text-slate-800 text-xs focus:ring-1 focus:ring-[#136dec]"
                  >
                    <option value="M15">M15</option>
                    <option value="M20">M20</option>
                    <option value="M25">M25</option>
                    <option value="M30">M30</option>
                    <option value="M35">M35</option>
                    <option value="M40">M40</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quantity (m³)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={newTrip.quantityM3}
                    onChange={(e) => setNewTrip({ ...newTrip, quantityM3: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-800 focus:ring-1 focus:ring-[#136dec]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={newTrip.distanceKm}
                    onChange={(e) => setNewTrip({ ...newTrip, distanceKm: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-800 focus:ring-1 focus:ring-[#136dec]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Starting Odometer (km)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. 12450"
                    value={newTrip.startOdometer || ''}
                    onChange={(e) => setNewTrip({ ...newTrip, startOdometer: parseFloat(e.target.value) || '' })}
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-800 focus:ring-1 focus:ring-[#136dec]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Site Challan / Pour Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const val = validateTripPhotoFile(file);
                        if (!val.valid) {
                          alert(val.error);
                          return;
                        }
                        const previewUrl = URL.createObjectURL(file);
                        setNewTrip(prev => ({ ...prev, sitePhoto: { previewUrl, uploading: true } }));
                        uploadTripPhoto(file, {
                          companyId: 'sm-concretech',
                          tripId: `TRP-${Date.now()}`,
                          photoType: 'site_photo',
                          userId: 'DISPATCHER'
                        }).then(photoMeta => {
                          setNewTrip(prev => ({
                            ...prev,
                            sitePhoto: photoMeta,
                            siteArrivalPhoto: photoMeta
                          }));
                        }).catch(err => {
                          console.warn('Upload error:', err.message);
                          setNewTrip(prev => ({
                            ...prev,
                            sitePhoto: { storagePath: null, downloadUrl: null, previewUrl, error: err.message },
                            siteArrivalPhoto: { storagePath: null, downloadUrl: null, previewUrl, error: err.message }
                          }));
                        });
                      }
                    }}
                    className="w-full border border-slate-200 rounded-lg py-1 px-2 text-[10px] bg-slate-50 text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Slump 140mm, Pump mix"
                  value={newTrip.remarks}
                  onChange={(e) => setNewTrip({ ...newTrip, remarks: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:ring-1 focus:ring-[#136dec]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#136dec] hover:bg-[#0f5ac5] text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>Confirm & Dispatch</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trip Photo Viewer Modal */}
      {selectedPhotoTrip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-4 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Camera className="text-[#136dec]" size={18} />
                <h3 className="text-sm font-bold text-slate-900">
                  Trip Photographs — {selectedPhotoTrip.vehicleNo} ({selectedPhotoTrip.challanNo || selectedPhotoTrip.id})
                </h3>
              </div>
              <button
                onClick={() => setSelectedPhotoTrip(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { title: '1. Start Odometer', photo: selectedPhotoTrip.startOdoPhoto, odo: selectedPhotoTrip.startOdometer, gps: selectedPhotoTrip.startGps },
                { title: '2. Site Arrival', photo: selectedPhotoTrip.siteArrivalPhoto, time: selectedPhotoTrip.siteArrivalTime, gps: selectedPhotoTrip.siteArrivalGps },
                { title: '3. Site Departure', photo: selectedPhotoTrip.siteDeparturePhoto, time: selectedPhotoTrip.siteDepartureTime, gps: selectedPhotoTrip.siteDepartureGps },
                { title: '4. Plant Return Odometer', photo: selectedPhotoTrip.finalOdoPhoto, odo: selectedPhotoTrip.finalOdometer, gps: selectedPhotoTrip.finalGps }
              ].map((item, idx) => {
                const src = item.photo?.downloadUrl || item.photo?.previewUrl || (typeof item.photo === 'string' ? item.photo : null);
                return (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{item.title}</span>
                      {item.photo?.storagePath ? (
                        <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Cloud Storage
                        </span>
                      ) : src ? (
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-200 px-1 rounded">Local Photo</span>
                      ) : (
                        <span className="text-[9px] font-mono text-slate-400">No Photo</span>
                      )}
                    </div>
                    {src ? (
                      <div className="relative group">
                        <img src={src} alt={item.title} className="w-full h-32 object-cover rounded border border-slate-300" />
                        {item.photo?.downloadUrl && (
                          <a
                            href={item.photo.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-1 right-1 bg-black/70 hover:bg-black text-white text-[9px] px-2 py-0.5 rounded font-mono"
                          >
                            Open Full
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="h-24 bg-slate-100 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px]">
                        Photograph not captured
                      </div>
                    )}
                    <div className="text-[10px] text-slate-600 font-mono space-y-0.5">
                      {item.odo && <div>Odo: <strong className="text-slate-900">{item.odo} km</strong></div>}
                      {item.time && <div>Time: <strong>{item.time}</strong></div>}
                      {item.gps && <div className="truncate" title={item.gps}>GPS: {item.gps}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPhotoTrip(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Help Popover Modal */}
      <HelpModal 
        isOpen={helpOpen} 
        onClose={() => setHelpOpen(false)} 
        topic="recordReturn" 
      />

      {/* Guided Record Vehicle Return Wizard */}
      <RecordVehicleReturnWizard 
        isOpen={returnWizardOpen} 
        onClose={() => setReturnWizardOpen(false)} 
        onSuccess={() => {
          setReturnWizardOpen(false);
        }} 
      />
    </div>
  );
}
