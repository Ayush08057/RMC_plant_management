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

const FLEET_MIXERS = [
  { vehicleNo: 'MH-10-CR-1212', driverName: 'Sachin Shinde', capacity: 6.0 },
  { vehicleNo: 'MH-10-CR-1313', driverName: 'Vikas Jadhav', capacity: 6.0 },
  { vehicleNo: 'MH-10-CR-1414', driverName: 'Sunil Kadam', capacity: 6.0 },
  { vehicleNo: 'MH-12-RN-4401', driverName: 'Ramesh Pawar', capacity: 7.0 },
  { vehicleNo: 'MH-12-RN-8822', driverName: 'Sanjay Yadav', capacity: 8.0 },
];

function getFleetVehicles() {
  try {
    const raw = localStorage.getItem(VEHICLE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(v => ({
          vehicleNo: v.vehicleNo,
          driverName: v.driverName || v.defaultDriver || v.driver || 'Driver',
          capacity: v.capacity || 6.0
        }));
      }
    }
  } catch {}
  return FLEET_MIXERS;
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

const DEFAULT_CUSTOMERS = [
  { name: 'Cash Customer', defaultSite: 'Plant Counter Delivery' },
  { name: 'Shree Construction & Infra', defaultSite: 'Tanang Highway Pier Zone #4' },
  { name: 'Kulkarni Builders & Developers', defaultSite: 'Sangli Bypass Bridge Slab #2' },
  { name: 'Sai Samarth Infrastructure', defaultSite: 'Kupwad MIDC Phase 2' },
  { name: 'Patil Developers & Contracts', defaultSite: 'Miraj Ring Road Junction' },
];

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
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'In Transit', 'Delivered'
  const [printingChallan, setPrintingChallan] = useState(null);
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

  useEffect(() => {
    const refreshFleet = () => setFleetList(getFleetVehicles());
    window.addEventListener('storage', refreshFleet);
    return () => window.removeEventListener('storage', refreshFleet);
  }, []);

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

    const newChallan = {
      id: `DC-${Date.now()}`,
      ...form,
      customerName: form.customerName.trim(),
      site: form.site.trim() || 'Site Location Not Specified',
      driverName: form.driverName.trim() || 'Driver Assumed',
      status: 'In Transit',
      createdAt: new Date().toISOString()
    };

    const updated = [newChallan, ...challans];
    setChallans(updated);
    setShowCreateModal(false);

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
      statusFilter === 'Delivered' ? c.status === 'Delivered' : true;

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
            {['All', 'In Transit', 'Delivered'].map((tab) => (
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
          <thead>
            <tr className="bg-slate-100/90 text-slate-900 font-black uppercase text-[10px] border-b border-slate-200">
              <th className="py-2.5 px-3">{t('Challan # & Time')}</th>
              <th className="py-2.5 px-3">{t('Customer & Site Location')}</th>
              <th className="py-2.5 px-3">{t('Mixer Fleet & Driver')}</th>
              <th className="py-2.5 px-3">{t('Mix Grade')}</th>
              <th className="py-2.5 px-3 text-right">{t('Quantity')}</th>
              <th className="py-2.5 px-3 text-center">{t('Delivery Status')}</th>
              <th className="py-2.5 px-3 text-right">{t('Actions')}</th>
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
                    <div className="font-mono font-black text-slate-900">{c.challanNo}</div>
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

      {/* Printable Challan Modal */}
      {printingChallan && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 print:p-0 print:bg-white print:static print:block">
          <div className="bg-white text-black max-w-lg w-full rounded-2xl p-5 border border-black space-y-3 font-mono text-[11px] print:border-none print:shadow-none print:p-0 print:max-w-none">
            <div className="flex justify-between items-center no-print border-b pb-2">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <Truck className="w-4 h-4" />
                <span>Delivery Challan & Gate Pass Ticket</span>
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()} 
                  className="px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>
                <button 
                  onClick={() => setPrintingChallan(null)} 
                  className="px-2 py-1 text-slate-600 hover:text-black rounded"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="text-center border-b border-black pb-2">
              <h2 className="text-base font-black tracking-wider">SM CONCRETECH</h2>
              <p className="text-[10px] text-gray-700">A/P Tanang, Sangli - 416410 • Mobile: +91 9421858683</p>
              <div className="font-bold border border-black py-0.5 mt-1 uppercase text-[10px] bg-slate-50">
                Computerized Delivery Challan & Gate Pass
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 border-b border-black pb-2 text-[10px]">
              <div><strong>Challan #: </strong><span className="font-black">{printingChallan.challanNo}</span></div>
              <div><strong>Date: </strong>{printingChallan.date} {printingChallan.departureTime}</div>
              <div><strong>Customer: </strong><span className="font-bold">{printingChallan.customerName}</span></div>
              <div><strong>Concrete Grade: </strong><span className="font-bold">{printingChallan.grade}</span></div>
              <div><strong>Delivery Site: </strong>{printingChallan.site}</div>
              <div><strong>Transit Mixer: </strong><span className="font-bold">{printingChallan.vehicleNo}</span></div>
              <div><strong>Dispatched Qty: </strong><span className="font-black text-xs">{printingChallan.quantity} m³</span></div>
              <div><strong>Driver: </strong>{printingChallan.driverName}</div>
              <div><strong>Target Slump: </strong>{printingChallan.slump || '125 ± 25 mm'}</div>
              <div><strong>Site Contact: </strong>{printingChallan.receiverName || 'Site Incharge'}</div>
            </div>

            <div className="p-2 border border-black text-[9px] leading-tight bg-slate-50">
              <strong>Notice to Customer:</strong> Do not add water to the transit mixer drum at the site without written authorisation from the QA/QC engineer. Adding excess water reduces compressive strength and voids concrete structural warranty.
            </div>

            <div className="grid grid-cols-2 pt-8 text-center text-[10px]">
              <div className="border-t border-dotted border-black pt-1">
                <div className="font-bold">Driver Signature</div>
                <div className="text-[9px] text-gray-600">({printingChallan.driverName})</div>
              </div>
              <div className="border-t border-dotted border-black pt-1">
                <div className="font-bold">Customer Site Receiver</div>
                <div className="text-[9px] text-gray-600">(Name & Mobile)</div>
              </div>
            </div>

            <div className="text-center text-[8px] text-gray-500 pt-1 border-t border-gray-300">
              Generated by SM CONCRETECH Cloud Dispatch System • Official Gate Pass
            </div>
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
