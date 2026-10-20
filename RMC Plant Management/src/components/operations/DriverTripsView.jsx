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
  Gauge
} from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';
import HelpModal from './guided/HelpModal';
import RecordVehicleReturnWizard from './guided/RecordVehicleReturnWizard';
import { useLanguage } from '../../context/LanguageContext';

const STORAGE_KEY = 'rmc_driver_trips_v2';

const INITIAL_TRIPS = [];

export default function DriverTripsView() {
  const { language } = useLanguage();
  const [helpOpen, setHelpOpen] = useState(false);
  const [returnWizardOpen, setReturnWizardOpen] = useState(false);

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

  // New Trip form state
  const [newTrip, setNewTrip] = useState({
    vehicleNo: 'MH-12-RN-4401',
    driverName: 'Ramesh Pawar',
    driverPhone: '+91 98221 44012',
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
      if (Array.isArray(cloudTrips) && cloudTrips.length > 0) {
        setTrips(cloudTrips);
      }
    });
    return () => unsub();
  }, []);

  // Save changes to localStorage & Cloud Firestore
  useEffect(() => {
    pushCloudStore('cloud_driver_trips', STORAGE_KEY, trips);
  }, [trips]);

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
        return { ...t, status: 'Completed', plantReturnTime: nowStr, turnaroundMins: 120 };
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

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const createdTrip = {
      id: `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
      ...newTrip,
      departureTime: nowStr,
      siteArrivalTime: null,
      pourStartTime: null,
      pourEndTime: null,
      plantReturnTime: null,
      status: 'Departed',
      turnaroundMins: null
    };

    setTrips([createdTrip, ...trips]);
    setIsModalOpen(false);
    setNewTrip({
      vehicleNo: 'MH-12-RN-4401',
      driverName: 'Ramesh Pawar',
      driverPhone: '+91 98221 44012',
      clientName: '',
      siteName: '',
      distanceKm: 15,
      grade: 'M25',
      quantityM3: 6.0,
      challanNo: `DC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      remarks: ''
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
      {/* 1. Compact 1-Row Summary Stats Strip */}

      <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#D4E4F7] shadow-2xs flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Truck size={13} className="text-blue-600" />
          <span className="text-slate-500 text-[11px]">In-Transit:</span>
          <span className="font-bold text-slate-900 text-xs">{activeTripsCount} <span className="font-normal text-slate-500 text-[10px]">mixers</span></span>
        </div>
        <div className="h-3 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <CheckCircle size={13} className="text-emerald-600" />
          <span className="text-slate-500 text-[11px]">Completed:</span>
          <span className="font-bold text-slate-900 text-xs">{completedToday} <span className="font-normal text-slate-500 text-[10px]">trips</span></span>
        </div>
        <div className="h-3 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <Gauge size={13} className="text-amber-600" />
          <span className="text-slate-500 text-[11px]">Delivered:</span>
          <span className="font-bold text-slate-900 text-xs">{totalVolumeDelivered.toFixed(1)} <span className="font-normal text-slate-500 text-[10px]">m³</span></span>
        </div>
        <div className="h-3 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-purple-600" />
          <span className="text-slate-500 text-[11px]">Turnaround:</span>
          <span className="font-bold text-slate-900 text-xs">{avgTurnaround} <span className="font-normal text-slate-500 text-[10px]">min/trip</span></span>
        </div>
      </div>

      {/* 2. Compact Search, Filter & Dispatch Toolbar */}
      <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#D4E4F7] shadow-2xs flex flex-wrap items-center justify-between gap-1.5">
        {/* Search Field */}
        <div className="relative w-full sm:w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search trip, mixer, driver, site..."
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
                {label}
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
            title="Record Vehicle Return"
          >
            <CheckCircle size={13} />
            <span>Record Return</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-7 px-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Dispatch Trip</span>
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
                  <span className="text-slate-400 font-mono shrink-0">({trip.distanceKm}km)</span>
                </div>

                {/* 4. Timestamp & Status */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-600">
                    <Clock size={11} className="text-slate-400" />
                    <span>{trip.status === 'Completed' ? trip.plantReturnTime : (trip.pourStartTime || trip.departureTime || '--')}</span>
                  </div>
                  {getStatusBadge(trip.status)}
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
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Vehicle / Mixer No</label>
                  <select
                    value={newTrip.vehicleNo}
                    onChange={(e) => {
                      const v = e.target.value;
                      let dName = 'Ramesh Pawar';
                      let dPhone = '+91 98221 44012';
                      if (v === 'MH-12-RN-8822') { dName = 'Sanjay Kumar Yadav'; dPhone = '+91 97110 55432'; }
                      if (v === 'MH-14-BT-1920') { dName = 'Mahesh Shinde'; dPhone = '+91 94220 89110'; }
                      if (v === 'MH-12-PQ-9003') { dName = 'Deepak Gaikwad'; dPhone = '+91 98812 77091'; }
                      setNewTrip({ ...newTrip, vehicleNo: v, driverName: dName, driverPhone: dPhone });
                    }}
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-2 font-medium bg-slate-50 text-slate-800 text-xs focus:ring-1 focus:ring-[#136dec]"
                  >
                    <option value="MH-12-RN-4401">MH-12-RN-4401 (TM-01, 7m³)</option>
                    <option value="MH-12-RN-8822">MH-12-RN-8822 (TM-02, 6m³)</option>
                    <option value="MH-14-BT-1920">MH-14-BT-1920 (TM-03, 8m³)</option>
                    <option value="MH-12-PQ-9003">MH-12-PQ-9003 (TM-04, 6m³)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={newTrip.driverName}
                    readOnly
                    className="w-full border border-slate-200 rounded-lg py-1.5 px-2 bg-slate-100 text-slate-700 font-semibold text-xs cursor-not-allowed"
                  />
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
