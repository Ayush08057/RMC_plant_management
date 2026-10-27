import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Truck, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  User, 
  X, 
  FileText,
  ShieldCheck,
  Calendar,
  Check,
  AlertCircle,
  Trash2,
  Gauge,
  Layers,
  ArrowRight
} from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';
import { useWorkforce } from '../../context/WorkforceContext';
import HelpModal from './guided/HelpModal';
import SendVehicleWizard from './guided/SendVehicleWizard';
import { useLanguage } from '../../context/LanguageContext';

const CHALLAN_STORAGE_KEY = 'rmc_delivery_challans_v2';
const BILLING_STORAGE_KEY = 'rmc_billing_records_v3';

const INITIAL_CHALLANS = [];

const VEHICLE_STORAGE_KEY = 'rmc_plant_vehicles_v2';

const FLEET_MIXERS = [];

function getFleetVehicles() {
  try {
    const raw = localStorage.getItem(VEHICLE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(v => ({
          vehicleNo: v.vehicleNo,
          driverName: v.driverName || v.defaultDriver || v.driver || 'Driver',
          capacity: v.capacity || 6.0
        }));
      }
    }
  } catch {}
  return [];
}

const CONCRETE_GRADES = [
  'M15 Concrete',
  'M20 Concrete',
  'M25 Concrete',
  'M30 Concrete',
  'M35 Concrete',
  'M40 Concrete',
];

const VOLUME_PRESETS = [3.0, 4.5, 6.0, 7.0, 8.0];
const SLUMP_PRESETS = ['100 ± 25 mm', '125 ± 25 mm', '140 ± 25 mm', '160 ± 25 mm'];

const DEFAULT_CUSTOMERS = [];

export default function DeliveryChallansView() {
  const { language, t } = useLanguage();
  const { employees } = useWorkforce();
  const [helpOpen, setHelpOpen] = useState(false);
  const [guidedWizardOpen, setGuidedWizardOpen] = useState(false);

  const registeredDrivers = useMemo(() => {
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

  const [challans, setChallans] = useState(() => {
    try {
      const saved = localStorage.getItem(CHALLAN_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse challans:', e);
    }
    return INITIAL_CHALLANS;
  });

  // Subscribe to real-time Cloud Sync for cross-device updates
  useEffect(() => {
    const unsub = subscribeCloudStore('cloud_delivery_challans', CHALLAN_STORAGE_KEY, INITIAL_CHALLANS, (cloudChallans) => {
      if (Array.isArray(cloudChallans)) {
        setChallans(cloudChallans);
      }
    });
    return () => unsub();
  }, []);

  // Save changes to localStorage & Cloud Firestore
  useEffect(() => {
    pushCloudStore('cloud_delivery_challans', CHALLAN_STORAGE_KEY, challans);
  }, [challans]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'In Transit', 'Delivered', 'Non-Bill'
  const [printingChallan, setPrintingChallan] = useState(null);
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' | 'thermal'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Extract known customers from both billing records & previous challans
  const customerSuggestions = useMemo(() => {
    const list = [...DEFAULT_CUSTOMERS];
    try {
      const savedBills = localStorage.getItem(BILLING_STORAGE_KEY);
      if (savedBills) {
        const parsed = JSON.parse(savedBills);
        if (Array.isArray(parsed)) {
          parsed.forEach(b => {
            const name = (b.customerName || b.partyName || '').trim();
            const site = (b.site || b.place || '').trim();
            if (name && !list.some(c => c.name.toLowerCase() === name.toLowerCase())) {
              list.push({ name, defaultSite: site || 'Site Address' });
            }
          });
        }
      }
    } catch (e) {
      // ignore
    }
    challans.forEach(c => {
      const name = (c.customerName || '').trim();
      const site = (c.site || '').trim();
      if (name && !list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        list.push({ name, defaultSite: site });
      }
    });
    return list;
  }, [challans]);

  const [fleetList, setFleetList] = useState(getFleetVehicles);

  const [form, setForm] = useState(() => {
    const initialFleet = getFleetVehicles();
    return {
      challanNo: 'DC-25-26/1421',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      departureTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      customerName: '',
      site: '',
      vehicleNo: initialFleet[0]?.vehicleNo || '',
      driverName: initialFleet[0]?.driverName || '',
      grade: 'M25 Concrete',
      quantity: initialFleet[0]?.capacity || 6.0,
      slump: '125 ± 25 mm',
      receiverName: '',
    };
  });

  useEffect(() => {
    const refreshFleet = () => setFleetList(getFleetVehicles());
    window.addEventListener('storage', refreshFleet);
    return () => window.removeEventListener('storage', refreshFleet);
  }, []);

  // Listen for batch sheet pre-fill triggers
  useEffect(() => {
    try {
      const rawPrefill = sessionStorage.getItem('rmc_pending_challan_prefill');
      if (rawPrefill) {
        const p = JSON.parse(rawPrefill);
        if (p && (Date.now() - (p.timestamp || 0) < 60000)) {
          const nextNumber = challans.length + 1421;
          const isNb = p.billingType === 'Non-Bill';
          const prefix = isNb ? 'NBC' : 'DC';
          setForm(prev => ({
            ...prev,
            challanNo: `${prefix}-25-26/${nextNumber}`,
            customerName: p.customerName || prev.customerName,
            site: p.site || prev.site,
            vehicleNo: p.vehicleNo || prev.vehicleNo,
            driverName: p.driverName || prev.driverName,
            grade: p.grade || prev.grade,
            quantity: p.quantity || prev.quantity,
            slump: p.slump || prev.slump,
            batchSheetNo: p.batchSheetNo || '',
            billingType: isNb ? 'Non-Bill' : 'Billable',
            isNonBill: isNb
          }));
          setShowCreateModal(true);
        }
        sessionStorage.removeItem('rmc_pending_challan_prefill');
      }
    } catch {}
  }, [challans.length]);

  const handleBillingTypeChange = (newType) => {
    const isNb = newType === 'Non-Bill';
    const nextNumber = challans.length + 1421;
    const prefix = isNb ? 'NBC' : 'DC';
    setForm(prev => ({
      ...prev,
      billingType: newType,
      isNonBill: isNb,
      challanNo: `${prefix}-25-26/${nextNumber}`
    }));
  };

  const openNewChallanModal = () => {
    const nextNumber = challans.length + 1421;
    const now = new Date();
    const currentFleet = getFleetVehicles();
    setForm({
      challanNo: `DC-25-26/${nextNumber}`,
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      departureTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      customerName: '',
      site: '',
      vehicleNo: currentFleet[0]?.vehicleNo || '',
      driverName: currentFleet[0]?.driverName || '',
      grade: 'M25 Concrete',
      quantity: currentFleet[0]?.capacity || 6.0,
      slump: '125 ± 25 mm',
      receiverName: '',
      billingType: 'Billable',
      isNonBill: false,
      poNumber: '',
    });
    setValidationError('');
    setShowCreateModal(true);
  };

  const handleSelectCustomerPreset = (preset) => {
    setForm(prev => ({
      ...prev,
      customerName: preset.name,
      site: preset.defaultSite && !prev.site ? preset.defaultSite : prev.site
    }));
    setValidationError('');
  };

  const handleSelectVehicle = (vehicleNo) => {
    const found = fleetList.find(v => v.vehicleNo === vehicleNo) || FLEET_MIXERS.find(v => v.vehicleNo === vehicleNo);
    if (found) {
      setForm(prev => ({
        ...prev,
        vehicleNo: found.vehicleNo,
        driverName: found.driverName,
        quantity: prev.quantity || found.capacity
      }));
    } else {
      setForm(prev => ({ ...prev, vehicleNo }));
    }
  };

  const handleSave = (e, autoPrint = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.customerName.trim()) {
      setValidationError('Please select or enter a Customer / Project Name.');
      return;
    }
    setValidationError('');

    const isNonBill = form.billingType === 'Non-Bill';

    const newChallan = {
      id: `DC-${Date.now()}`,
      ...form,
      customerName: form.customerName.trim(),
      site: form.site.trim() || 'Site Location Not Specified',
      driverName: form.driverName.trim() || 'Driver Assumed',
      billingType: form.billingType || 'Billable',
      isNonBill,
      status: 'In Transit',
      createdAt: new Date().toISOString()
    };

    const updated = [newChallan, ...challans];
    setChallans(updated);
    setShowCreateModal(false);

    // Sync corresponding driver trip record so fleet and driver tracking are immediately updated
    try {
      const tripKey = 'rmc_driver_trips_v2';
      const rawTrips = localStorage.getItem(tripKey);
      const tripList = rawTrips ? JSON.parse(rawTrips) : [];
      const existingTrip = tripList.find(t => t.challanNo === newChallan.challanNo);
      if (!existingTrip) {
        const newTrip = {
          id: `TRP-${Date.now()}`,
          challanNo: newChallan.challanNo,
          vehicleNo: newChallan.vehicleNo || 'Mixer',
          driverName: newChallan.driverName || 'Driver',
          clientName: newChallan.customerName,
          siteName: newChallan.site,
          grade: newChallan.grade,
          quantityM3: Number(newChallan.quantity) || 6.0,
          departureTime: newChallan.departureTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          status: 'Departed',
          isNonBill,
          createdAt: new Date().toISOString()
        };
        const updatedTrips = [newTrip, ...tripList];
        localStorage.setItem(tripKey, JSON.stringify(updatedTrips));
        pushCloudStore('cloud_driver_trips', tripKey, updatedTrips);
      }
    } catch (err) {
      console.warn('Trip sync from challan notice:', err);
    }

    if (autoPrint) {
      setPrintingChallan(newChallan);
    }
  };

  const toggleStatus = (id) => {
    setChallans(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'Delivered' ? 'In Transit' : 'Delivered' };
      }
      return c;
    }));
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this delivery challan?')) {
      setChallans(prev => prev.filter(c => c.id !== id));
    }
  };

  // KPI Calculations
  const totalVolume = challans.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  const inTransitCount = challans.filter(c => c.status === 'In Transit').length;
  const deliveredCount = challans.filter(c => c.status === 'Delivered').length;

  const filtered = challans.filter(c => {
    const matchesSearch = 
      c.challanNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.driverName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.grade.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'All' ? true :
      statusFilter === 'In Transit' ? c.status === 'In Transit' :
      statusFilter === 'Delivered' ? c.status === 'Delivered' :
      statusFilter === 'Non-Bill' ? (c.isNonBill || c.billingType === 'Non-Bill') : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 text-xs text-slate-800">

      {/* Top Header & Compact Summary Pill-Bar (Utilises space without bulky cards) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex">
              <Truck className="w-4 h-4" />
            </span>
            <span>{t('Transit Mixer Delivery Challans & Gate Passes')}</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {t('Automated concrete dispatch documentation, real-time fleet delivery, and gate passes')}
          </p>
        </div>

        {/* Ultra-compact inline KPI badges saving screen space */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
            {t('Total')}: <span className="font-mono text-slate-900 font-black">{challans.length}</span> {t('Challans')}
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
            {t('Dispatched')}: <span className="font-mono font-black">{totalVolume.toFixed(1)}</span> m³
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
            {t('In Transit')}: <span className="font-mono font-black">{inTransitCount}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
            {t('Delivered')}: <span className="font-mono font-black">{deliveredCount}</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Action Button */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search by vehicle, challan, customer...')}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-emerald-500 transition-all"
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {['All', 'In Transit', 'Delivered', 'Non-Bill'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  statusFilter === tab 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(tab)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setGuidedWizardOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="5-Step Guided Dispatch Wizard"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('5-Step Guided')}</span>
          </button>

          <button
            type="button"
            onClick={openNewChallanModal}
            className="w-full sm:w-auto px-4 py-1.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0 transition-all active:scale-95 text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('Issue Delivery Challan')}</span>
          </button>
        </div>
      </div>

      {/* Challans Table - Maximized Screen Space */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
            <tr>
              <th className="py-3 px-3 text-white border-r border-white/20">{t('Challan # & Time')}</th>
              <th className="py-3 px-3 text-white border-r border-white/20">{t('Customer & Site Location')}</th>
              <th className="py-3 px-3 text-white border-r border-white/20">{t('Mixer Fleet & Driver')}</th>
              <th className="py-3 px-3 text-white border-r border-white/20">{t('Mix Grade')}</th>
              <th className="py-3 px-3 text-right text-white border-r border-white/20">{t('Quantity')}</th>
              <th className="py-3 px-3 text-center text-white border-r border-white/20">{t('Delivery Status')}</th>
              <th className="py-3 px-3 text-right text-white">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                  <p className="font-semibold text-xs">{t('No delivery challans found matching your query.')}</p>
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-mono font-black text-slate-900 flex items-center gap-1.5">
                      <span>{c.challanNo}</span>
                      {c.isNonBill && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          NB
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      <span>{c.date} • {c.departureTime}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{c.customerName}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 max-w-xs truncate" title={c.site}>
                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.site || 'Site not stated'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{c.vehicleNo}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <User className="w-2.5 h-2.5 text-slate-400" />
                      <span>{c.driverName || 'Driver Assumed'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                      {c.grade}
                    </span>
                    {c.slump && (
                      <span className="block text-[10px] text-slate-500 mt-0.5">{t('Slump')}: {c.slump}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className="font-mono font-black text-sm text-slate-900">{Number(c.quantity).toFixed(1)}</span>
                    <span className="text-[10px] font-bold text-slate-500 ml-1">m³</span>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleStatus(c.id)}
                      title="Click to toggle delivery status"
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-transform active:scale-95 cursor-pointer ${
                        c.status === 'Delivered' 
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                          : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                      }`}
                    >
                      {c.status === 'Delivered' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>{t('Delivered')}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                          <span>{t('In Transit')}</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPrintingChallan(c)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95 text-[11px]"
                        title="Print Computerized Delivery Challan & Gate Pass"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t('Print')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Challan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 1000x IQ UPGRADED "ISSUE DELIVERY CHALLAN" MODAL */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide">Issue Delivery Challan & Gate Pass</h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-0.5">
                    <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-bold">{form.challanNo}</span>
                    <span>•</span>
                    <span>{form.date} {form.departureTime}</span>
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="mx-5 mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={(e) => handleSave(e, false)} noValidate className="p-5 space-y-4">
              
              {/* Challan Classification: Billable vs Non-Bill */}
              <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Classification & Billing Sequence:
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {form.billingType === 'Non-Bill' ? 'NBC sequence (Excluded from Invoicing)' : 'Standard DC Commercial Delivery'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBillingTypeChange('Billable')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      form.billingType !== 'Non-Bill'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Commercial (DC)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBillingTypeChange('Non-Bill')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      form.billingType === 'Non-Bill'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Non-Bill (NBC)
                  </button>
                </div>
              </div>

              {/* SECTION 1: CUSTOMER & DESTINATION SITE */}
              <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Customer / Project Name <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[10px] text-slate-500">1-Tap Quick Select:</span>
                </div>

                {/* Quick Customer Select Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {customerSuggestions.slice(0, 5).map((cust) => (
                    <button
                      key={cust.name}
                      type="button"
                      onClick={() => handleSelectCustomerPreset(cust)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        form.customerName.toLowerCase() === cust.name.toLowerCase()
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      {cust.name}
                    </button>
                  ))}
                </div>

                {/* Customer Input with Datalist */}
                <div>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={e => {
                      setForm({ ...form, customerName: e.target.value });
                      if (validationError) setValidationError('');
                    }}
                    placeholder="Type or select customer name..."
                    list="customer-suggestions-list"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <datalist id="customer-suggestions-list">
                    {customerSuggestions.map(c => (
                      <option key={c.name} value={c.name} />
                    ))}
                  </datalist>
                </div>

                {/* Site Location Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Site Location / Delivery Address</span>
                  </label>
                  <input
                    type="text"
                    value={form.site}
                    onChange={e => setForm({ ...form, site: e.target.value })}
                    placeholder="e.g. Tanang Highway Pier Zone #4, Sangli"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION 2: CONCRETE GRADE & VOLUME SPECIFICATION */}
              <div className="space-y-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                {/* Concrete Grade with 1-Click Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      <span>Concrete Grade</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 font-mono">{form.grade}</span>
                  </div>

                  {/* 1-Tap Grade Buttons */}
                  <div className="grid grid-cols-6 gap-1 mb-1.5">
                    {['M15', 'M20', 'M25', 'M30', 'M35', 'M40'].map(gradeStr => {
                      const fullGrade = `${gradeStr} Concrete`;
                      const isSelected = form.grade.startsWith(gradeStr);
                      return (
                        <button
                          key={gradeStr}
                          type="button"
                          onClick={() => setForm({ ...form, grade: fullGrade })}
                          className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-2xs scale-102 ring-2 ring-blue-300'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-blue-50'
                          }`}
                        >
                          {gradeStr}
                        </button>
                      );
                    })}
                  </div>

                  <select
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                  >
                    {CONCRETE_GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="M10 Concrete (PCC)">M10 Concrete (PCC)</option>
                    <option value="M45 Concrete (Special)">M45 Concrete (Special)</option>
                    <option value="M50 High Early Strength">M50 High Early Strength</option>
                  </select>
                </div>

                {/* Volume (m³) & Slump */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Volume (m³)</span>
                    </label>

                    {/* Quick Volume Selection Buttons */}
                    <div className="flex gap-1 mb-1.5">
                      {VOLUME_PRESETS.map(vol => (
                        <button
                          key={vol}
                          type="button"
                          onClick={() => setForm({ ...form, quantity: vol })}
                          className={`flex-1 py-1 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                            Number(form.quantity) === vol
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {vol}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="15.0"
                      value={form.quantity}
                      onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-black focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Target Slump</span>
                    </label>

                    {/* Quick Slump Selection */}
                    <div className="flex gap-1 mb-1.5">
                      {['100mm', '125mm', '140mm', '160mm'].map(s => {
                        const slumpVal = `${s.replace('mm', '')} ± 25 mm`;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setForm({ ...form, slump: slumpVal })}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              form.slump.includes(s.replace('mm', ''))
                                ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={form.slump}
                      onChange={e => setForm({ ...form, slump: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: TRANSIT MIXER FLEET & DRIVER */}
              <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Transit Mixer Fleet & Designated Driver</span>
                </label>

                {/* Fleet Presets Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {fleetList.map(mixer => {
                    const isSelected = form.vehicleNo === mixer.vehicleNo;
                    return (
                      <button
                        key={mixer.vehicleNo}
                        type="button"
                        onClick={() => handleSelectVehicle(mixer.vehicleNo)}
                        className={`p-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-1 ring-indigo-400'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-mono text-[11px] font-black">{mixer.vehicleNo}</div>
                        <div className="text-[10px] text-slate-500 truncate">{mixer.driverName}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Vehicle Reg #</label>
                    <input
                      type="text"
                      value={form.vehicleNo}
                      onChange={e => setForm({ ...form, vehicleNo: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Driver Name</label>
                    <input
                      type="text"
                      value={form.driverName}
                      onChange={e => setForm({ ...form, driverName: e.target.value })}
                      placeholder="Enter or select driver"
                      list="challan-driver-list"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:border-emerald-500 focus:outline-none"
                    />
                    <datalist id="challan-driver-list">
                      {registeredDrivers.map((d, idx) => (
                        <option key={d?.id || d?.name || idx} value={d?.name || ''}>
                          {d?.name || 'Driver'} ({d?.id || 'DRV'})
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Site Receiver / Contact Incharge (Optional)</label>
                  <input
                    type="text"
                    value={form.receiverName}
                    onChange={e => setForm({ ...form, receiverName: e.target.value })}
                    placeholder="e.g. Amit Patil (Site Incharge) - 98XXXXXXXX"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Billing Classification: Billable vs Non-Bill */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Billing Classification</span>
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${form.billingType === 'Non-Bill' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
                    {form.billingType === 'Non-Bill' ? 'NB: Non-Tax / Sample / Trial' : 'Commercial Billable'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, billingType: 'Billable', isNonBill: false }))}
                    className={`p-2 rounded-lg text-left text-xs font-bold border transition-all cursor-pointer ${
                      form.billingType !== 'Non-Bill'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500 shadow-2xs'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-slate-900">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Billable (Standard GST)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-normal">Customer will be billed via GST Invoice / Cash Memo</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, billingType: 'Non-Bill', isNonBill: true }))}
                    className={`p-2 rounded-lg text-left text-xs font-bold border transition-all cursor-pointer ${
                      form.billingType === 'Non-Bill'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500 shadow-2xs'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-amber-900">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Non-Bill (NB / Sample / Internal)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-normal">Strictly marked NB. Cannot generate tax invoice or cash memo.</p>
                  </button>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    type="button"
                    onClick={(e) => handleSave(e, true)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 text-xs"
                    title="Save challan and immediately open the printable gate pass"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Save & Print Ticket</span>
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 sm:flex-initial px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 text-xs"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save & Issue</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Printable Challan Modal (A4 & 80mm Thermal Dual Format) */}
      {printingChallan && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto print:p-0 print:bg-white print:static print:block">
          <div className={`bg-white text-black rounded-2xl p-5 border border-slate-300 shadow-2xl transition-all print:border-none print:shadow-none print:p-0 print:max-w-none ${
            printFormat === 'thermal' ? 'max-w-sm w-full font-mono text-xs' : 'max-w-3xl w-full font-sans text-xs'
          }`}>
            {/* Header controls (No print) */}
            <div className="flex flex-wrap justify-between items-center no-print border-b border-slate-200 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-700" />
                <span className="font-bold text-slate-800 text-sm">Print Delivery Challan</span>
              </div>
              
              {/* Dual Format Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setPrintFormat('a4')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    printFormat === 'a4' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-black'
                  }`}
                >
                  📄 A4 Official Gate Pass
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('thermal')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    printFormat === 'thermal' ? 'bg-white text-indigo-800 shadow-2xs' : 'text-slate-600 hover:text-black'
                  }`}
                >
                  🧾 80mm Thermal Slip
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()} 
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
                <button 
                  onClick={() => setPrintingChallan(null)} 
                  className="p-1.5 text-slate-500 hover:text-black rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* FORMAT 1: 80mm THERMAL SLIP */}
            {printFormat === 'thermal' && (
              <div className="p-3 border border-black space-y-2 font-mono text-[11px] leading-snug print:border-none">
                <div className="text-center border-b border-dashed border-black pb-2">
                  <h2 className="text-sm font-black tracking-wider">SM CONCRETE TECH</h2>
                  <p className="text-[9px]">A/P Tanang, Sangli - 416410</p>
                  <p className="text-[9px]">Ph: +91 9421858683</p>
                  <div className="font-bold border border-black py-0.5 mt-1 uppercase text-[9px] bg-slate-100">
                    {printingChallan.isNonBill || printingChallan.billingType === 'Non-Bill' ? 'NON-BILL GATE PASS' : 'DELIVERY CHALLAN & GATE PASS'}
                  </div>
                </div>

                {(printingChallan.isNonBill || printingChallan.billingType === 'Non-Bill') && (
                  <div className="border border-black p-1 text-center font-black text-[9px] bg-black text-white">
                    *** NON-BILL / SAMPLE / INTERNAL USE ***
                  </div>
                )}

                <div className="space-y-1 border-b border-dashed border-black pb-2 text-[10px]">
                  <div><strong>Challan #: </strong>{printingChallan.challanNo}</div>
                  <div><strong>Date/Time: </strong>{printingChallan.date} {printingChallan.departureTime}</div>
                  <div><strong>Customer: </strong>{printingChallan.customerName}</div>
                  <div><strong>Site: </strong>{printingChallan.site}</div>
                  <div><strong>Mix Grade: </strong><span className="font-black">{printingChallan.grade}</span></div>
                  <div><strong>Qty: </strong><span className="font-black text-xs">{printingChallan.quantity} m³</span></div>
                  <div><strong>Transit Mixer: </strong>{printingChallan.vehicleNo}</div>
                  <div><strong>Driver: </strong>{printingChallan.driverName}</div>
                  <div><strong>Slump: </strong>{printingChallan.slump || '125 ± 25 mm'}</div>
                </div>

                <div className="text-[8px] leading-tight text-gray-700">
                  Notice: No water to be added on site. Adding water voids concrete strength warranty.
                </div>

                <div className="grid grid-cols-2 pt-6 text-center text-[9px]">
                  <div className="border-t border-dotted border-black pt-1">
                    Driver Sign
                  </div>
                  <div className="border-t border-dotted border-black pt-1">
                    Receiver Sign
                  </div>
                </div>

                <div className="text-center text-[8px] text-gray-500 pt-1 border-t border-dashed border-gray-300">
                  *** SM CONCRETE TECH ERP ***
                </div>
              </div>
            )}

            {/* FORMAT 2: A4 OFFICIAL DOCUMENT */}
            {printFormat === 'a4' && (
              <div className="p-6 border border-slate-300 rounded-xl space-y-4 print:border-none print:p-0">
                {/* Official Company Header */}
                <div className="border-b-2 border-emerald-800 pb-3 flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black text-emerald-950 tracking-wider">SM CONCRETE TECH</h1>
                    <p className="text-xs text-slate-600 font-medium">Ready Mix Concrete Manufacturing & Pumping Solutions</p>
                    <p className="text-[11px] text-slate-600">A/P Tanang, Tal. Miraj, Dist. Sangli, Maharashtra - 416410</p>
                    <p className="text-[11px] text-slate-600">Email: smconcretetech@gmail.com | Helpline: +91 9421858683</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded border border-slate-300 inline-block mb-1">
                      GSTIN: 27AAFFS1234F1Z5
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">State Code: 27 (Maharashtra)</div>
                    <div className="text-[10px] text-slate-500 font-mono">PAN: AAFFS1234F</div>
                  </div>
                </div>

                {/* Document Title Banner */}
                <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-1.5 rounded-lg">
                  <span className="font-black text-xs uppercase tracking-widest">
                    {printingChallan.isNonBill || printingChallan.billingType === 'Non-Bill' ? 'Delivery Challan & Gate Pass (Non-Bill Delivery)' : 'Official Delivery Challan & Dispatch Gate Pass'}
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    Challan No: {printingChallan.challanNo}
                  </span>
                </div>

                {/* Non-Bill Prominent Banner */}
                {(printingChallan.isNonBill || printingChallan.billingType === 'Non-Bill') && (
                  <div className="bg-amber-100 border-2 border-amber-500 text-amber-950 px-3 py-1.5 rounded-lg font-black text-xs text-center uppercase tracking-wide">
                    ⚠️ NON-BILL DELIVERY / SAMPLE / TRIAL RUN — STRICTLY NOT FOR TAX INVOICE GENERATION
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="space-y-1">
                    <div><span className="text-slate-500">Customer / Client: </span><strong className="text-slate-900 font-bold">{printingChallan.customerName}</strong></div>
                    <div><span className="text-slate-500">Unloading Site: </span><strong className="text-slate-800">{printingChallan.site}</strong></div>
                    <div><span className="text-slate-500">Site Receiver Contact: </span><span>{printingChallan.receiverName || 'Site Engineer / Incharge'}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div><span className="text-slate-500">Dispatch Date & Time: </span><strong>{printingChallan.date} at {printingChallan.departureTime}</strong></div>
                    <div><span className="text-slate-500">Transit Mixer Reg #: </span><strong className="font-mono text-indigo-900">{printingChallan.vehicleNo}</strong></div>
                    <div><span className="text-slate-500">Designated Driver: </span><strong>{printingChallan.driverName}</strong></div>
                  </div>
                </div>

                {/* Dispatched Material Details Table */}
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold text-left border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 w-12 text-center">#</th>
                      <th className="p-2 border-r border-slate-300">Concrete Mix Specification</th>
                      <th className="p-2 border-r border-slate-300">Target Slump</th>
                      <th className="p-2 border-r border-slate-300 text-center">Billing Classification</th>
                      <th className="p-2 text-right">Dispatched Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 border-r border-slate-300 text-center font-mono">1</td>
                      <td className="p-2.5 border-r border-slate-300">
                        <div className="font-bold text-slate-900">{printingChallan.grade}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Standard Ready Mix Concrete (IS 456 / IS 10262)</div>
                      </td>
                      <td className="p-2.5 border-r border-slate-300 font-mono">{printingChallan.slump || '125 ± 25 mm'}</td>
                      <td className="p-2.5 border-r border-slate-300 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          printingChallan.isNonBill || printingChallan.billingType === 'Non-Bill' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {printingChallan.isNonBill || printingChallan.billingType === 'Non-Bill' ? 'Non-Bill (NB)' : 'Commercial Billable'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-sm text-slate-900">
                        {Number(printingChallan.quantity).toFixed(2)} m³
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan="4" className="p-2 text-right border-r border-slate-300">Total Dispatched Concrete Volume:</td>
                      <td className="p-2 text-right font-mono font-black text-sm text-emerald-900">{Number(printingChallan.quantity).toFixed(2)} m³</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Technical Quality & Handling Terms */}
                <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-[10px] text-amber-950 leading-relaxed">
                  <strong>Quality & Handling Disclaimer:</strong>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                    <li>Concrete must be completely unloaded and placed within 120 minutes from the batching time indicated on this challan.</li>
                    <li>Strictly <strong>NO WATER</strong> should be added to the mixer drum at site without written authorization from our QA/QC Engineer. Any additional water reduces characteristic compressive strength and voids structural concrete quality warranties.</li>
                    <li>Test cubes must be cast strictly in accordance with IS 516 standards by certified site personnel.</li>
                  </ul>
                </div>

                {/* 3-Signature Verification Block */}
                <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs">
                  <div className="border-t border-slate-400 pt-2">
                    <div className="font-bold text-slate-800">Batching Plant Incharge</div>
                    <div className="text-[10px] text-slate-500">SM Concrete Tech</div>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <div className="font-bold text-slate-800">Transit Mixer Driver</div>
                    <div className="text-[10px] text-slate-500">({printingChallan.driverName})</div>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <div className="font-bold text-slate-800">Customer Receiver / Engineer</div>
                    <div className="text-[10px] text-slate-500">Name & Contact Signature</div>
                  </div>
                </div>

                <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200">
                  This is a computer-generated delivery document registered in SM Concrete Tech Cloud Operations System.
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Universal Help Popover Modal */}
      <HelpModal 
        isOpen={helpOpen} 
        onClose={() => setHelpOpen(false)} 
        topic="sendVehicle" 
      />

      {/* Guided 5-Step Send Vehicle Wizard */}
      <SendVehicleWizard 
        isOpen={guidedWizardOpen} 
        onClose={() => setGuidedWizardOpen(false)} 
        onSuccess={() => {
          setGuidedWizardOpen(false);
        }} 
      />
    </div>
  );
}
