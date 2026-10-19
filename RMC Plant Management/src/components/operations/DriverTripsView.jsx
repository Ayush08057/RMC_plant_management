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

const STORAGE_KEY = 'rmc_driver_trips_v2';

const INITIAL_TRIPS = [
  {
    id: 'TRP-1042',
    challanNo: 'DC-2026-084',
    vehicleNo: 'MH-12-RN-4401',
    driverName: 'Ramesh Pawar',
    driverPhone: '+91 98221 44012',
    clientName: 'Godrej Properties Ltd',
    siteName: 'Godrej Woods, Sector 4, Baner',
    distanceKm: 14.5,
    grade: 'M30',
    quantityM3: 6.0,
    departureTime: '10:30 AM',
    siteArrivalTime: '11:15 AM',
    pourStartTime: '11:25 AM',
    pourEndTime: '12:05 PM',
    plantReturnTime: '12:45 PM',
    status: 'Completed', // 'Departed', 'At Site', 'Pouring', 'Returning', 'Completed'
    turnaroundMins: 135,
    remarks: 'Smooth pour via Boom Pump. Slump ok at 135mm.'
  },
  {
    id: 'TRP-1043',
    challanNo: 'DC-2026-085',
    vehicleNo: 'MH-12-RN-8822',
    driverName: 'Sanjay Kumar Yadav',
    driverPhone: '+91 97110 55432',
    clientName: 'Rohan Builders',
    siteName: 'Rohan Abhilasha, Wagholi',
    distanceKm: 22.0,
    grade: 'M25',
    quantityM3: 6.0,
    departureTime: '11:15 AM',
    siteArrivalTime: '12:10 PM',
    pourStartTime: '12:20 PM',
    pourEndTime: null,
    plantReturnTime: null,
    status: 'Pouring',
    turnaroundMins: null,
    remarks: 'Discharging in Tower B footing.'
  },
  {
    id: 'TRP-1044',
    challanNo: 'DC-2026-086',
    vehicleNo: 'MH-14-BT-1920',
    driverName: 'Mahesh Shinde',
    driverPhone: '+91 94220 89110',
    clientName: 'Kolte Patil Developers',
    siteName: 'Life Republic, Hinjewadi Ph 2',
    distanceKm: 18.2,
    grade: 'M35',
    quantityM3: 7.0,
    departureTime: '11:45 AM',
    siteArrivalTime: null,
    pourStartTime: null,
    pourEndTime: null,
    plantReturnTime: null,
    status: 'Departed',
    turnaroundMins: null,
    remarks: 'In transit via Highway bypass.'
  },
  {
    id: 'TRP-1045',
    challanNo: 'DC-2026-087',
    vehicleNo: 'MH-12-PQ-9003',
    driverName: 'Deepak Gaikwad',
    driverPhone: '+91 98812 77091',
    clientName: 'VTP Realty',
    siteName: 'VTP Pegasus, Kharadi',
    distanceKm: 16.0,
    grade: 'M25',
    quantityM3: 6.0,
    departureTime: '10:00 AM',
    siteArrivalTime: '10:40 AM',
    pourStartTime: '10:50 AM',
    pourEndTime: '11:35 AM',
    plantReturnTime: null,
    status: 'Returning',
    turnaroundMins: null,
    remarks: 'Drum washed at site, returning to plant.'
  }
];

export default function DriverTripsView() {
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch (err) {
      console.error('Failed to save trips:', err);
    }
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
      t.siteName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Departed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">🚀 En Route to Site</span>;
      case 'At Site':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">📍 At Site</span>;
      case 'Pouring':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">⚡ Pouring / Discharging</span>;
      case 'Returning':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">🔄 Returning to Plant</span>;
      case 'Completed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">✅ Trip Completed</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getNextStageLabel = (status) => {
    switch (status) {
      case 'Departed': return 'Mark Reached Site 📍';
      case 'At Site': return 'Start Concrete Pour ⚡';
      case 'Pouring': return 'Finish Pour & Return 🔄';
      case 'Returning': return 'Mark Plant Return ✅';
      default: return null;
    }
  };

  const activeTripsCount = trips.filter(t => t.status !== 'Completed').length;
  const completedToday = trips.filter(t => t.status === 'Completed').length;
  const totalVolumeDelivered = trips.reduce((acc, t) => acc + (t.status === 'Completed' ? Number(t.quantityM3 || 0) : 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600/60 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Transit Mixer Fleet Dispatch
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Driver & Transit Mixer Trips (चालक आणि ट्रिप ट्रॅकिंग)</h1>
          <p className="text-sm text-blue-200/80 mt-1">
            Real-time live trip turnaround tracker: Departure → Site Arrival → Concrete Pouring → Return Cycle.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-lg shadow transition active:scale-95"
        >
          <Plus size={18} />
          <span>Dispatch New Trip</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Active In-Transit</p>
            <p className="text-2xl font-black text-gray-900">{activeTripsCount} <span className="text-xs font-normal text-gray-500">mixers</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Completed Trips</p>
            <p className="text-2xl font-black text-gray-900">{completedToday} <span className="text-xs font-normal text-gray-500">trips</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
            <Gauge size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Delivered Volume</p>
            <p className="text-2xl font-black text-gray-900">{totalVolumeDelivered.toFixed(1)} <span className="text-xs font-normal text-gray-500">m³</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Avg Turnaround</p>
            <p className="text-2xl font-black text-gray-900">125 <span className="text-xs font-normal text-gray-500">mins / trip</span></p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search trip ID, mixer, driver, site..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'Departed', 'At Site', 'Pouring', 'Returning', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'ALL' ? 'All Trips' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Card List */}
      <div className="space-y-4">
        {filteredTrips.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200 text-gray-500">
            <Truck size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="font-bold text-gray-700">No transit mixer trips found</p>
            <p className="text-sm text-gray-500 mt-1">Try resetting your search or filter.</p>
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const nextAction = getNextStageLabel(trip.status);
            return (
              <div
                key={trip.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Left: Info */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-gray-900 text-base">{trip.id}</span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                      {trip.challanNo}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-900">
                      {trip.grade} • {trip.quantityM3} m³
                    </span>
                    {getStatusBadge(trip.status)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                        <Truck size={13} className="text-blue-600" /> Transit Mixer & Driver
                      </p>
                      <p className="font-bold text-gray-800">{trip.vehicleNo}</p>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <User size={11} /> {trip.driverName} ({trip.driverPhone})
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                        <MapPin size={13} className="text-rose-600" /> Destination Site
                      </p>
                      <p className="font-bold text-gray-800">{trip.clientName}</p>
                      <p className="text-xs text-gray-600 truncate max-w-xs">{trip.siteName} ({trip.distanceKm} km)</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                        <Clock size={13} className="text-indigo-600" /> Cycle Timestamps
                      </p>
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">Depart:</span> {trip.departureTime || '--'} | <span className="font-medium">Site:</span> {trip.siteArrivalTime || '--'}
                      </p>
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">Pour:</span> {trip.pourStartTime || '--'} - {trip.pourEndTime || '--'} | <span className="font-medium">Return:</span> {trip.plantReturnTime || '--'}
                      </p>
                    </div>
                  </div>

                  {trip.remarks && (
                    <p className="text-xs text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100">
                      Note: {trip.remarks}
                    </p>
                  )}
                </div>

                {/* Right: Quick Action Button */}
                <div className="flex flex-col sm:flex-row items-center gap-3 border-t lg:border-t-0 pt-3 lg:pt-0">
                  {nextAction && (
                    <button
                      onClick={() => advanceTripStage(trip.id)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                    >
                      <span>{nextAction}</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                  {trip.status === 'Completed' && (
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                      <CheckCircle size={15} />
                      <span>Turnaround: {trip.turnaroundMins || 120} mins</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Truck className="text-blue-600" size={20} />
                Dispatch Transit Mixer (ट्रिप नोंदणी)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle / Mixer No</label>
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
                    className="w-full border rounded-lg p-2 font-medium bg-gray-50"
                  >
                    <option value="MH-12-RN-4401">MH-12-RN-4401 (TM-01, 7m³)</option>
                    <option value="MH-12-RN-8822">MH-12-RN-8822 (TM-02, 6m³)</option>
                    <option value="MH-14-BT-1920">MH-14-BT-1920 (TM-03, 8m³)</option>
                    <option value="MH-12-PQ-9003">MH-12-PQ-9003 (TM-04, 6m³)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={newTrip.driverName}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Godrej Properties Ltd"
                  value={newTrip.clientName}
                  onChange={(e) => setNewTrip({ ...newTrip, clientName: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Site Destination & Address *</label>
                <input
                  type="text"
                  placeholder="e.g. Godrej Woods, Baner Ph-2"
                  value={newTrip.siteName}
                  onChange={(e) => setNewTrip({ ...newTrip, siteName: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Grade</label>
                  <select
                    value={newTrip.grade}
                    onChange={(e) => setNewTrip({ ...newTrip, grade: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-gray-50"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantity (m³)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={newTrip.quantityM3}
                    onChange={(e) => setNewTrip({ ...newTrip, quantityM3: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={newTrip.distanceKm}
                    onChange={(e) => setNewTrip({ ...newTrip, distanceKm: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Slump 140mm, Pump mix"
                  value={newTrip.remarks}
                  onChange={(e) => setNewTrip({ ...newTrip, remarks: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow"
                >
                  Confirm & Dispatch 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
