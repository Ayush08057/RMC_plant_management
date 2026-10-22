import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  Eye,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  User,
  FileText,
  X,
  Radio,
  Zap,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';
import { useLanguage } from '../../context/LanguageContext';
import { STORAGE_KEYS, INITIAL_SILO_STOCK } from '../../services/plantOperationsService';

const WEIGHBRIDGE_STORAGE_KEY = 'rmc_weighbridge_v2';
const INITIAL_WEIGHBRIDGE = [];

const COMMON_MATERIALS = {
  inward: [
    '20mm Coarse Aggregate',
    '10mm Coarse Aggregate',
    'Crushed M-Sand (Fine Sand)',
    'Natural River Sand',
    'Cement (OPC 53 Grade)',
    'Fly Ash (Pozzocrete)',
    'Chemical Admixture (PCE)',
    'Micro-silica / Silica Fume',
  ],
  outward: [
    'M20 RMC (Pavement Grade)',
    'M25 RMC (Standard Slab)',
    'M30 RMC (Beams & Columns)',
    'M35 RMC (Structural Heavy)',
    'M40 Self-Compacting Concrete',
    'M50 High Strength Concrete',
    'Dry Lean Concrete (DLC)',
  ],
};

const COMMON_PARTIES = [
  'UltraTech Cement Limited',
  'Ambuja Cements Ltd',
  'Shree Ram Stone Quarry & Crushers',
  'Krishna Valley Sand Suppliers',
  'Dirk Pozzocrete India',
  'Metro Line 3 Construction JV',
  'Tata Projects Ltd - Pier #44',
  'Godrej Properties - Green Acres Site',
  'Highway Authority NH-48 Package B',
];

export default function WeighbridgeView() {
  const { language } = useLanguage();
  const isMarathi = language === 'mr';

  const [slips, setSlips] = useState(() => {
    try {
      const saved = localStorage.getItem(WEIGHBRIDGE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_WEIGHBRIDGE;
  });

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, INWARD, OUTWARD, PENDING
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSecondWeightModalOpen, setIsSecondWeightModalOpen] = useState(false);
  const [selectedSlipForSecondWeight, setSelectedSlipForSecondWeight] = useState(null);
  const [activePrintSlip, setActivePrintSlip] = useState(null);

  // Form State for New Weighment
  const [formType, setFormType] = useState('Inward'); // 'Inward' or 'Outward'
  const [weightMode, setWeightMode] = useState('gross_tare'); // 'gross_tare' or 'direct_net'
  const [vehicleNo, setVehicleNo] = useState('');
  const [partyName, setPartyName] = useState('');
  const [material, setMaterial] = useState(COMMON_MATERIALS.inward[0]);
  const [driverName, setDriverName] = useState('');
  const [grossKg, setGrossKg] = useState('');
  const [tareKg, setTareKg] = useState('');
  const [directNetKg, setDirectNetKg] = useState('');
  const [isPendingTare, setIsPendingTare] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [scaleSimulationActive, setScaleSimulationActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 2nd Tare Weight entry state
  const [secondTareKg, setSecondTareKg] = useState('');

  // Cloud Sync
  useEffect(() => {
    const unsub = subscribeCloudStore('cloud_weighbridge', WEIGHBRIDGE_STORAGE_KEY, INITIAL_WEIGHBRIDGE, (cloudSlips) => {
      if (Array.isArray(cloudSlips)) {
        setSlips(cloudSlips);
      }
    });
    return () => unsub();
  }, []);

  const saveSlips = (newSlips) => {
    setSlips(newSlips);
    try {
      localStorage.setItem(WEIGHBRIDGE_STORAGE_KEY, JSON.stringify(newSlips));
      pushCloudStore('cloud_weighbridge', WEIGHBRIDGE_STORAGE_KEY, newSlips);
    } catch (e) {
      console.warn('Failed to save weighbridge slips:', e);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Live Calculated Net Weight for the New Modal
  const calculatedNetKg = useMemo(() => {
    if (weightMode === 'direct_net') {
      return Number(directNetKg) || 0;
    }
    const g = Number(grossKg) || 0;
    const t = Number(tareKg) || 0;
    if (isPendingTare) return 0;
    return Math.max(0, g - t);
  }, [weightMode, directNetKg, grossKg, tareKg, isPendingTare]);

  const calculatedNetTons = useMemo(() => {
    return (calculatedNetKg / 1000).toFixed(2);
  }, [calculatedNetKg]);

  // Read scale indicator simulation
  const handleReadScale = (targetField) => {
    setScaleSimulationActive(true);
    setTimeout(() => {
      // Realistic simulated weight between 12,000 kg and 38,000 kg with 20kg increments
      const base = targetField === 'tare' ? 11000 + Math.floor(Math.random() * 30) * 50 : 32000 + Math.floor(Math.random() * 40) * 50;
      if (targetField === 'gross') {
        setGrossKg(base.toString());
      } else if (targetField === 'tare') {
        setTareKg(base.toString());
      } else if (targetField === 'secondTare') {
        setSecondTareKg(base.toString());
      } else {
        setDirectNetKg((base - 12000).toString());
      }
      setScaleSimulationActive(false);
      showToast(`Scale captured: ${base.toLocaleString('en-IN')} kg from digital load cells.`);
    }, 450);
  };

  // Switch type and reset default material
  const handleTypeChange = (type) => {
    setFormType(type);
    if (type === 'Inward') {
      setMaterial(COMMON_MATERIALS.inward[0]);
    } else {
      setMaterial(COMMON_MATERIALS.outward[0]);
    }
  };

  const handleOpenNewModal = () => {
    setFormType('Inward');
    setWeightMode('gross_tare');
    setVehicleNo('');
    setPartyName('');
    setMaterial(COMMON_MATERIALS.inward[0]);
    setDriverName('');
    setGrossKg('');
    setTareKg('');
    setDirectNetKg('');
    setIsPendingTare(false);
    setRemarks('');
    setIsNewModalOpen(true);
  };

  const handleSubmitNewWeighment = (e, shouldPrint = false) => {
    e.preventDefault();
    if (!vehicleNo.trim()) {
      showToast('Please enter a vehicle registration number.');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const slipNumber = String(Math.floor(1000 + Math.random() * 9000));

    let finalGross = Number(grossKg) || 0;
    let finalTare = Number(tareKg) || 0;
    let finalNet = calculatedNetKg;
    let slipStatus = 'Completed';

    if (weightMode === 'direct_net') {
      finalNet = Number(directNetKg) || 0;
      finalGross = finalNet;
      finalTare = 0;
    } else if (isPendingTare) {
      slipStatus = 'Pending Tare';
      finalTare = 0;
      finalNet = 0;
    }

    const isCompletedInward = formType === 'Inward' && slipStatus === 'Completed';

    const newSlip = {
      id: `WB-${Date.now()}`,
      slipNo: slipNumber,
      type: formType,
      date: dateStr,
      time: timeStr,
      vehicleNo: vehicleNo.trim().toUpperCase(),
      partyName: partyName.trim() || 'General Party / Counter Sale',
      material,
      driverName: driverName.trim() || 'Plant Driver',
      grossKg: finalGross,
      tareKg: finalTare,
      netKg: finalNet,
      unit: 'Tons',
      status: slipStatus,
      remarks: remarks.trim() || 'Standard weighment recorded',
      inventoryUpdated: isCompletedInward,
    };

    const updated = [newSlip, ...slips];
    saveSlips(updated);

    // Sync inventory if completed inward
    if (isCompletedInward) {
      updateSiloInventoryForWeighment(material, finalNet, slipNumber, newSlip.vehicleNo, newSlip.partyName, false);
    }

    setIsNewModalOpen(false);
    showToast(`Weighbridge Slip #${slipNumber} successfully recorded!`);

    if (shouldPrint) {
      setActivePrintSlip(newSlip);
    }
  };

  // Helper to sync Weighbridge inward weighments with Silo Inventory
  const updateSiloInventoryForWeighment = (materialName, netKg, slipNo, vehNo, party, isReversal = false) => {
    try {
      const netTons = Number(((netKg || 0) / 1000).toFixed(2));
      if (netTons <= 0) return;
      const factor = isReversal ? -1 : 1;

      let targetKey = 'agg20';
      const matLower = (materialName || '').toLowerCase();
      if (matLower.includes('cement')) targetKey = 'cement';
      else if (matLower.includes('fly ash') || matLower.includes('pozzocrete')) targetKey = 'flyash';
      else if (matLower.includes('10mm')) targetKey = 'agg10';
      else if (matLower.includes('20mm')) targetKey = 'agg20';
      else if (matLower.includes('m-sand') || matLower.includes('fine sand')) targetKey = 'sand';
      else if (matLower.includes('river sand')) targetKey = 'riverSand';

      const rawSilo = localStorage.getItem(STORAGE_KEYS.SILO_INVENTORY);
      const siloData = rawSilo ? JSON.parse(rawSilo) : { ...INITIAL_SILO_STOCK };
      if (siloData[targetKey]) {
        const cur = Number(siloData[targetKey].stockTons) || 0;
        siloData[targetKey].stockTons = Math.max(0, Number((cur + factor * netTons).toFixed(2)));
        localStorage.setItem(STORAGE_KEYS.SILO_INVENTORY, JSON.stringify(siloData));
        pushCloudStore('cloud_silo_inventory', STORAGE_KEYS.SILO_INVENTORY, siloData);
      }

      // Sync with Inward slips
      const rawInward = localStorage.getItem(STORAGE_KEYS.INWARD);
      let inwardData = rawInward ? JSON.parse(rawInward) : [];
      if (isReversal) {
        inwardData = inwardData.filter((r) => r.slipNo !== `#${slipNo}` && r.slipNo !== slipNo);
      } else {
        const newInward = {
          id: `INW-WB-${Date.now()}`,
          slipNo: `#${slipNo}`,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          material: materialName,
          supplier: party,
          vehicleNo: vehNo,
          netTons,
          unit: 'Tons',
          status: 'Finalized',
          targetSilo: siloData[targetKey]?.siloName || 'Storage Silo',
          createdAt: new Date().toISOString(),
        };
        inwardData = [newInward, ...inwardData];
      }
      localStorage.setItem(STORAGE_KEYS.INWARD, JSON.stringify(inwardData));
      pushCloudStore('cloud_material_inward', STORAGE_KEYS.INWARD, inwardData);
    } catch (err) {
      console.warn('Inventory sync notice for weighbridge:', err.message);
    }
  };

  // Open 2nd weight modal for pending slips
  const handleOpenSecondWeight = (slip) => {
    setSelectedSlipForSecondWeight(slip);
    setSecondTareKg('');
    setIsSecondWeightModalOpen(true);
  };

  // Submit 2nd tare weight to complete ticket
  const handleSubmitSecondWeight = (e) => {
    e.preventDefault();
    if (!selectedSlipForSecondWeight) return;
    const tKg = Number(secondTareKg) || 0;
    if (tKg <= 0) {
      showToast('Please enter a valid tare weight in kg.');
      return;
    }

    const net = Math.max(0, (selectedSlipForSecondWeight.grossKg || 0) - tKg);

    const updated = slips.map((s) => {
      if (s.id === selectedSlipForSecondWeight.id) {
        return {
          ...s,
          tareKg: tKg,
          netKg: net,
          status: 'Completed',
          completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inventoryUpdated: true,
        };
      }
      return s;
    });

    saveSlips(updated);

    // If inward, update inventory now that entry is finalized!
    if (selectedSlipForSecondWeight.type === 'Inward' || !selectedSlipForSecondWeight.type) {
      updateSiloInventoryForWeighment(
        selectedSlipForSecondWeight.material,
        net,
        selectedSlipForSecondWeight.slipNo,
        selectedSlipForSecondWeight.vehicleNo,
        selectedSlipForSecondWeight.partyName,
        false
      );
    }

    setIsSecondWeightModalOpen(false);
    showToast(`Vehicle ${selectedSlipForSecondWeight.vehicleNo} tare completed! Net: ${(net / 1000).toFixed(2)} MT.`);
  };

  const handleDeleteSlip = (id, slipNo) => {
    const targetSlip = slips.find((s) => s.id === id);
    if (window.confirm(`Are you sure you want to void weighbridge slip #${slipNo}?`)) {
      if (targetSlip?.type === 'Inward' && targetSlip?.inventoryUpdated) {
        updateSiloInventoryForWeighment(
          targetSlip.material,
          targetSlip.netKg,
          targetSlip.slipNo,
          targetSlip.vehicleNo,
          targetSlip.partyName,
          true
        );
      }
      const updated = slips.filter((s) => s.id !== id);
      saveSlips(updated);
      showToast(`Slip #${slipNo} deleted and inventory adjusted.`);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    let totalInwardKg = 0;
    let totalOutwardKg = 0;
    let pendingCount = 0;

    slips.forEach((s) => {
      if (s.status === 'Pending Tare') {
        pendingCount += 1;
      }
      if (s.type === 'Inward' || !s.type) {
        totalInwardKg += Number(s.netKg) || 0;
      } else {
        totalOutwardKg += Number(s.netKg) || 0;
      }
    });

    return {
      totalSlips: slips.length,
      inwardTons: (totalInwardKg / 1000).toFixed(2),
      outwardTons: (totalOutwardKg / 1000).toFixed(2),
      pendingCount,
    };
  }, [slips]);

  // Filtering
  const filtered = useMemo(() => {
    return slips.filter((s) => {
      const matchSearch =
        (s.slipNo || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.vehicleNo || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.partyName || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.material || '').toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === 'INWARD') return s.type === 'Inward' || !s.type;
      if (filterType === 'OUTWARD') return s.type === 'Outward';
      if (filterType === 'PENDING') return s.status === 'Pending Tare';
      return true;
    });
  }, [slips, search, filterType]);

  return (
    <div className="w-full space-y-3.5 text-xs text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[99999] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Top Weighbridge Scale Indicator & Status Ribbon - Clean, Simple & Highly Visible */}
      <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-slate-900">
                {isMarathi ? 'डिजिटल वजन काटा नियंत्रण केंद्र' : 'Digital Weighbridge System'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                SCALE ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isMarathi
                ? 'कच्चा माल आवक व काँक्रीट ट्रान्झिट मिक्सर वाहनांच्या अचूक वजनाची नोंदवही'
                : 'Automated gross, tare, and net weighment records for raw materials & RMC transit mixers'}
            </p>
          </div>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4 text-left">
          <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Today's Slips</span>
            <span className="text-sm sm:text-base font-black text-slate-900 font-mono">{metrics.totalSlips}</span>
          </div>
          <div className="bg-amber-50/70 px-3 py-2 rounded-xl border border-amber-200/80">
            <span className="text-[10px] text-amber-700 uppercase font-mono font-bold block">Inward Material</span>
            <span className="text-sm sm:text-base font-black text-amber-900 font-mono">{metrics.inwardTons} MT</span>
          </div>
          <div className="bg-blue-50/70 px-3 py-2 rounded-xl border border-blue-200/80">
            <span className="text-[10px] text-blue-700 uppercase font-mono font-bold block">Outward RMC</span>
            <span className="text-sm sm:text-base font-black text-blue-900 font-mono">{metrics.outwardTons} MT</span>
          </div>
          <div className="bg-rose-50/70 px-3 py-2 rounded-xl border border-rose-200/80">
            <span className="text-[10px] text-rose-700 uppercase font-mono font-bold block">Pending Tare</span>
            <span className="text-sm sm:text-base font-black text-rose-900 font-mono">{metrics.pendingCount}</span>
          </div>
        </div>
      </div>

      {/* Main Table Toolbar & Primary Action */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isMarathi ? `सर्व पावत्या (${slips.length})` : `All Slips (${slips.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('INWARD')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                filterType === 'INWARD'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'कच्चा माल आवक' : 'Inward Materials'}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('OUTWARD')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                filterType === 'OUTWARD'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>{isMarathi ? 'काँक्रीट जावक' : 'Outward RMC'}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PENDING')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                filterType === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isMarathi ? `रिकामे वजन बाकी (${metrics.pendingCount})` : `Pending Tare (${metrics.pendingCount})`}</span>
            </button>
          </div>

          {/* Search & Main Add Weighment CTA */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isMarathi ? 'पावती, गाडी, ग्राहक शोधा...' : 'Search slip, truck, party...'}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            {/* THE PROMINENT ADD WEIGHT BUTTON */}
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isMarathi ? 'नवीन वजन पावती' : 'New Weighment Slip'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Weighbridge Slips Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
              <tr>
                <th className="py-3 px-3.5 text-white border-r border-white/20">Slip # & Date</th>
                <th className="py-3 px-3.5 text-white border-r border-white/20">Type</th>
                <th className="py-3 px-3.5 text-white border-r border-white/20">Vehicle Number</th>
                <th className="py-3 px-3.5 text-white border-r border-white/20">Party / Customer</th>
                <th className="py-3 px-3.5 text-white border-r border-white/20">Material</th>
                <th className="py-3 px-3 text-right text-white border-r border-white/20">Gross (kg)</th>
                <th className="py-3 px-3 text-right text-white border-r border-white/20">Tare (kg)</th>
                <th className="py-3 px-3 text-right text-white border-r border-white/20">Net Weight</th>
                <th className="py-3 px-3.5 text-center text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-inner">
                        <Scale className="w-7 h-7 stroke-[1.8]" />
                      </div>
                      <h3 className="text-sm font-black text-slate-800 mb-1 font-sans">
                        {isMarathi ? 'कोणतीही वजन नोंद उपलब्ध नाही' : 'No Weighbridge Tickets Recorded'}
                      </h3>
                      <p className="text-[11px] text-slate-500 mb-4 font-sans leading-relaxed text-center">
                        {isMarathi
                          ? 'कच्चा माल (खडी, वाळू, सिमेंट) किंवा काँक्रीट मिक्सरचे वजन मोजण्यासाठी खालील बटणावर क्लिक करा.'
                          : 'Click the button below to add your first weighment ticket with automatic gross, tare, and net weight calculation.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenNewModal}
                        className="px-4 py-2 rounded-xl bg-[#1D5FA7] hover:bg-[#123B6D] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer font-sans"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Record First Weighment</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const isInward = s.type === 'Inward' || !s.type;
                  const isPending = s.status === 'Pending Tare';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5">
                        <span className="font-bold text-blue-600 block">#{s.slipNo}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {s.date} {s.time}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isInward
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {isInward ? (
                            <ArrowDownToLine className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowUpFromLine className="w-3 h-3 text-indigo-600" />
                          )}
                          <span>{s.type || 'Inward'}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5">
                        <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                          {s.vehicleNo}
                        </span>
                        {s.driverName && (
                          <span className="block text-[10px] text-slate-400 font-sans mt-0.5 font-normal">
                            Dr: {s.driverName}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 font-sans font-medium text-slate-800 max-w-[160px] truncate" title={s.partyName}>
                        {s.partyName}
                      </td>

                      <td className="py-2.5 px-3.5 font-sans font-semibold text-blue-800 max-w-[160px] truncate" title={s.material}>
                        {s.material}
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                        {Number(s.grossKg || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                        {isPending ? (
                          <span className="text-amber-600 font-sans text-[10px] font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Pending
                          </span>
                        ) : (
                          Number(s.tareKg || 0).toLocaleString('en-IN')
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSecondWeight(s)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-sans text-[10px] font-bold shadow-2xs transition-all cursor-pointer"
                          >
                            + Weigh Tare
                          </button>
                        ) : (
                          <div>
                            <span className="font-black text-emerald-700 text-xs block">
                              {((s.netKg || 0) / 1000).toFixed(2)} MT
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {Number(s.netKg || 0).toLocaleString('en-IN')} kg
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActivePrintSlip(s)}
                            title="Print / View Weighment Slip"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlip(s.id, s.slipNo)}
                            title="Delete / Void Ticket"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NEW WEIGHMENT ENTRY MODAL (SUPER SIMPLE & INTUITIVE)             */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-fadeIn text-slate-800">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#1D5FA7] via-[#164b85] to-[#123B6D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 text-white">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide">
                    {isMarathi ? 'नवीन वजन पावती तयार करा' : 'New Weighbridge Ticket'}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    {isMarathi ? 'वाहनाचे एकूण, रिकामी गाडी व निव्वळ वजन नोंदवा' : 'Record Gross, Tare & Net Weight for Inbound or Outbound vehicles'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={(e) => handleSubmitNewWeighment(e, false)} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Option 1: Select Inward or Outward */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Movement Direction (वाहनाची दिशा) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('Inward')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      formType === 'Inward'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300 text-emerald-950 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${formType === 'Inward' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <ArrowDownToLine className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">📥 Inward Material</span>
                      <span className="text-[10px] text-slate-500">Raw materials (Sand, Cement, Stone)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('Outward')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      formType === 'Outward'
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300 text-indigo-950 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${formType === 'Outward' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <ArrowUpFromLine className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">📤 Outward Concrete</span>
                      <span className="text-[10px] text-slate-500">Transit mixers carrying RMC to site</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Vehicle & Party */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vehicle Number (गाडी नंबर) *
                  </label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    placeholder="e.g. MH-12-RN-4401"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Party / Supplier / Customer *
                  </label>
                  <input
                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder="Enter or select party name"
                    list="weighbridge-party-list"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <datalist id="weighbridge-party-list">
                    {COMMON_PARTIES.map((p, idx) => (
                      <option key={idx} value={p} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Material Selector with Quick Pills */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Material Name (मालाचे नाव) *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(formType === 'Inward' ? COMMON_MATERIALS.inward : COMMON_MATERIALS.outward).map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMaterial(m)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        material === m
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* ========================================================= */}
              {/* WEIGHT ENTRY SECTION: SIMPLE OPTIONS TO ADD WEIGHT       */}
              {/* ========================================================= */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-700" />
                    <span className="font-black text-xs text-blue-950 uppercase tracking-wider">
                      Weight Entry Options (वजन पर्याय)
                    </span>
                  </div>

                  {/* Mode switcher tabs */}
                  <div className="flex items-center p-0.5 rounded-lg bg-blue-100 border border-blue-200 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setWeightMode('gross_tare')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        weightMode === 'gross_tare' ? 'bg-white text-blue-900 shadow-2xs' : 'text-blue-700 hover:text-blue-900'
                      }`}
                    >
                      Gross & Tare (Auto Net)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightMode('direct_net')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        weightMode === 'direct_net' ? 'bg-white text-blue-900 shadow-2xs' : 'text-blue-700 hover:text-blue-900'
                      }`}
                    >
                      Direct Net (निव्वळ वजन)
                    </button>
                  </div>
                </div>

                {weightMode === 'gross_tare' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Gross Weight */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            Gross Weight (एकूण वजन - भरलेली गाडी) *
                          </label>
                          <button
                            type="button"
                            onClick={() => handleReadScale('gross')}
                            disabled={scaleSimulationActive}
                            className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                            title="Auto-read digital scale indicator"
                          >
                            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>Capture Scale</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            value={grossKg}
                            onChange={(e) => setGrossKg(e.target.value)}
                            placeholder="e.g. 34500"
                            className="w-full pr-12 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-300 font-mono text-sm font-black text-slate-900 focus:border-blue-600 focus:outline-none"
                            required
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                            KG
                          </span>
                        </div>
                      </div>

                      {/* Tare Weight */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            Tare Weight (रिकामी गाडीचे वजन) {isPendingTare ? '(Pending)' : '*'}
                          </label>
                          {!isPendingTare && (
                            <button
                              type="button"
                              onClick={() => handleReadScale('tare')}
                              disabled={scaleSimulationActive}
                              className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                              title="Auto-read digital scale indicator"
                            >
                              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span>Capture Scale</span>
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            value={isPendingTare ? '' : tareKg}
                            onChange={(e) => setTareKg(e.target.value)}
                            placeholder={isPendingTare ? 'Tare weight will be recorded later' : 'e.g. 11200'}
                            disabled={isPendingTare}
                            className={`w-full pr-12 pl-3.5 py-2.5 rounded-xl border font-mono text-sm font-black text-slate-900 focus:outline-none ${
                              isPendingTare
                                ? 'bg-slate-100 border-dashed border-slate-300 text-slate-400'
                                : 'bg-white border-slate-300 focus:border-blue-600'
                            }`}
                            required={!isPendingTare}
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                            KG
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Tare Checkbox (Useful for trucks just entering plant) */}
                    <div className="pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isPendingTare}
                          onChange={(e) => setIsPendingTare(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 font-semibold">
                          First Weighment Only (Truck is unloading now — Tare will be weighed upon exit)
                        </span>
                      </label>
                    </div>
                  </>
                ) : (
                  <div>
                    {/* Direct Net Weight */}
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Direct Net Weight (एकूण निव्वळ वजन) *
                      </label>
                      <button
                        type="button"
                        onClick={() => handleReadScale('net')}
                        disabled={scaleSimulationActive}
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>Capture Scale</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={directNetKg}
                        onChange={(e) => setDirectNetKg(e.target.value)}
                        placeholder="e.g. 23300"
                        className="w-full pr-12 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-300 font-mono text-sm font-black text-slate-900 focus:border-blue-600 focus:outline-none"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                        KG
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Gross and Net will be set directly to this value.
                    </p>
                  </div>
                )}

                {/* REAL-TIME CALCULATED NET WEIGHT BANNER */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 block">
                      Calculated Net Weight (निव्वळ माल वजन)
                    </span>
                    <div className="text-lg font-black font-mono tracking-tight">
                      {isPendingTare ? 'PENDING TARE WEIGHMENT' : `${calculatedNetKg.toLocaleString('en-IN')} KG`}
                    </div>
                  </div>
                  {!isPendingTare && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-200 block">Metric Tons</span>
                      <span className="text-xl font-black font-mono text-amber-300">{calculatedNetTons} MT</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Driver Name (चालक) - Optional
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Ramesh Pawar"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Remarks / Slip Notes - Optional
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Clean aggregate, approved"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSubmitNewWeighment(e, true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Save & Print Slip</span>
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-black bg-[#1D5FA7] hover:bg-[#123B6D] text-white shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Weighment Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SECOND WEIGHT (TARE) WEIGHMENT POPUP                             */}
      {/* ========================================================================= */}
      {isSecondWeightModalOpen && selectedSlipForSecondWeight && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-fadeIn text-slate-800">
            <div className="px-5 py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                <h3 className="font-black text-sm">
                  Complete 2nd Tare Weighment (#{selectedSlipForSecondWeight.slipNo})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSecondWeightModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSecondWeight} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 font-sans">
                <div>
                  Vehicle: <strong className="font-mono text-slate-900">{selectedSlipForSecondWeight.vehicleNo}</strong>
                </div>
                <div>
                  Material: <strong className="text-blue-700">{selectedSlipForSecondWeight.material}</strong>
                </div>
                <div>
                  1st Gross Weight:{' '}
                  <strong className="font-mono text-slate-900">
                    {Number(selectedSlipForSecondWeight.grossKg).toLocaleString('en-IN')} KG
                  </strong>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Empty Truck Tare Weight (रिकामी गाडीचे वजन) *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleReadScale('secondTare')}
                    disabled={scaleSimulationActive}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Capture Scale</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={secondTareKg}
                    onChange={(e) => setSecondTareKg(e.target.value)}
                    placeholder="e.g. 11200"
                    className="w-full pr-12 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-300 font-mono text-sm font-black text-slate-900 focus:border-amber-600 focus:outline-none"
                    required
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                    KG
                  </span>
                </div>
              </div>

              {secondTareKg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between font-sans">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Final Net Weight</span>
                    <span className="text-base font-black font-mono text-emerald-800">
                      {Math.max(0, (selectedSlipForSecondWeight.grossKg || 0) - Number(secondTareKg)).toLocaleString('en-IN')} KG
                    </span>
                  </div>
                  <span className="text-base font-black font-mono text-emerald-700">
                    {(Math.max(0, (selectedSlipForSecondWeight.grossKg || 0) - Number(secondTareKg)) / 1000).toFixed(2)} MT
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSecondWeightModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
                >
                  Complete Weighment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRINTABLE DIGITAL WEIGHBRIDGE SLIP TICKET                        */}
      {/* ========================================================================= */}
      {activePrintSlip && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto text-slate-800 animate-fadeIn">
            {/* Action Bar (Top) */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold font-mono">Weighbridge Receipt Preview</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePrintSlip(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="p-6 bg-[#fffdf9] font-mono text-xs space-y-4 border-b border-dashed border-slate-300">
              {/* Slip Header */}
              <div className="text-center pb-3 border-b-2 border-slate-900">
                <div className="text-base font-black tracking-wider text-slate-900 uppercase">
                  SM CONCRETECH RMC PLANT
                </div>
                <div className="text-[10px] text-slate-600">
                  Govt Approved Electronic Heavy Weighbridge (100 MT Capacity)
                </div>
                <div className="text-[10px] text-slate-600">
                  Plant Unit #01, Industrial Area, Maharashtra • Ph: +91 98220 00000
                </div>
                <div className="mt-2 inline-block px-3 py-0.5 rounded border border-slate-900 font-bold uppercase text-[11px] bg-slate-100">
                  CERTIFIED WEIGHMENT TICKET
                </div>
              </div>

              {/* Slip Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-slate-300">
                <div>
                  <span className="text-slate-500 block">Slip Number:</span>
                  <strong className="text-slate-900 text-sm">#{activePrintSlip.slipNo}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Date & Time:</span>
                  <strong className="text-slate-900">
                    {activePrintSlip.date} {activePrintSlip.time}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Vehicle Number:</span>
                  <strong className="text-slate-900 text-sm bg-slate-100 px-1.5 py-0.5 rounded border">
                    {activePrintSlip.vehicleNo}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Transaction Type:</span>
                  <strong className="text-blue-700">{activePrintSlip.type || 'Inward'}</strong>
                </div>
              </div>

              {/* Material & Party */}
              <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Party / Customer:</span>
                  <strong className="text-slate-900">{activePrintSlip.partyName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Material Name:</span>
                  <strong className="text-blue-900">{activePrintSlip.material}</strong>
                </div>
                {activePrintSlip.driverName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Driver:</span>
                    <span>{activePrintSlip.driverName}</span>
                  </div>
                )}
              </div>

              {/* The Certified Weight Breakdown Box */}
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">1. GROSS WEIGHT (भरलेली गाडी):</span>
                  <span className="font-bold text-slate-900">
                    {Number(activePrintSlip.grossKg).toLocaleString('en-IN')} KG
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">2. TARE WEIGHT (रिकामी गाडी):</span>
                  <span className="font-bold text-slate-900">
                    {activePrintSlip.status === 'Pending Tare'
                      ? 'PENDING'
                      : `${Number(activePrintSlip.tareKg).toLocaleString('en-IN')} KG`}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm">
                  <span className="font-black text-slate-900 uppercase">3. NET WEIGHT (निव्वळ वजन):</span>
                  <span className="font-black text-emerald-800 text-base">
                    {activePrintSlip.status === 'Pending Tare'
                      ? 'PENDING'
                      : `${Number(activePrintSlip.netKg).toLocaleString('en-IN')} KG`}
                  </span>
                </div>
                {activePrintSlip.status !== 'Pending Tare' && (
                  <div className="text-right text-xs font-bold text-emerald-700">
                    = {((activePrintSlip.netKg || 0) / 1000).toFixed(2)} METRIC TONS
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-600">
                <div>
                  <div className="border-t border-slate-400 pt-1">Driver / Customer Signature</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1">Weighbridge Operator Seal & Sign</div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Close */}
            <div className="p-3 bg-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActivePrintSlip(null)}
                className="px-4 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
