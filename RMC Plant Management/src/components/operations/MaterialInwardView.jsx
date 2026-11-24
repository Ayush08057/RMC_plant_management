import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Search, 
  Truck, 
  Scale, 
  CheckCircle2, 
  Building2, 
  Droplet, 
  Calendar, 
  FileText, 
  X, 
  Clock, 
  AlertCircle,
  Database,
  ArrowDownToLine,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';
import { useLanguage } from '../../context/LanguageContext';
import { 
  calculateNetWeight, 
  calculateChemicalBarrelVolume, 
  STORAGE_KEYS, 
  INITIAL_SILO_STOCK 
} from '../../services/plantOperationsService';
import HelpModal from './guided/HelpModal';
import ReceiveMaterialsWizard from './guided/ReceiveMaterialsWizard';

const INWARD_STORAGE_KEY = STORAGE_KEYS.INWARD;
const CHEMICAL_STORAGE_KEY = STORAGE_KEYS.CHEMICAL_BARRELS;
const SILO_STORAGE_KEY = STORAGE_KEYS.SILO_INVENTORY;

const INITIAL_INWARD = [];
const INITIAL_CHEMICALS = [];

const COMMON_RAW_MATERIALS = [
  { name: '20mm Coarse Aggregate', key: 'agg20', unit: 'Tons', defaultSilo: '20mm Agg Bin #01' },
  { name: '10mm Coarse Aggregate', key: 'agg10', unit: 'Tons', defaultSilo: '10mm Agg Bin #02' },
  { name: 'Crushed M-Sand (Fine Sand)', key: 'sand', unit: 'Tons', defaultSilo: 'Crushed M-Sand Bin' },
  { name: 'Natural River Sand', key: 'riverSand', unit: 'Tons', defaultSilo: 'Natural Sand Yard' },
  { name: 'Cement (OPC 53 Grade)', key: 'cement', unit: 'Tons', defaultSilo: 'Cement Silo #01' },
  { name: 'Fly Ash (Pozzocrete)', key: 'flyash', unit: 'Tons', defaultSilo: 'Fly Ash Silo #02' },
];

const COMMON_CHEMICAL_PRODUCTS = [
  { name: 'PCE Polycarboxylate Superplasticizer', key: 'admixturePce', defaultCapacity: 220 },
  { name: 'Retarder Admixture (Set Delay)', key: 'retarder', defaultCapacity: 220 },
  { name: 'Accelerating Admixture (Early Strength)', key: 'retarder', defaultCapacity: 220 },
  { name: 'Integral Waterproofing Compound', key: 'admixturePce', defaultCapacity: 220 },
  { name: 'Silica Fume Slurry', key: 'admixturePce', defaultCapacity: 250 },
];

const SUPPLIERS_LIST = [
  'UltraTech Cement Ltd',
  'Ambuja Cements Ltd',
  'Dirk Pozzocrete India',
  'Krishna Valley Stone Quarry',
  'Sangli Sand Suppliers',
  'Fosroc Chemicals India',
  'Sika Chemicals India',
  'BASF Master Builders Solutions',
  'Chryso India Pvt Ltd'
];

export default function MaterialInwardView() {
  const { language, t } = useLanguage();
  const isMarathi = language === 'mr';

  const [activeSubTab, setActiveSubTab] = useState('inward_slips'); // 'inward_slips' | 'chemical_barrels' | 'silo_inventory'
  const [helpOpen, setHelpOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showChemicalModal, setShowChemicalModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 1. Inward Records State
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(INWARD_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse inward records:', e);
    }
    return INITIAL_INWARD;
  });

  // 2. Chemical Barrel Intake State
  const [chemicalRecords, setChemicalRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(CHEMICAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse chemical records:', e);
    }
    return INITIAL_CHEMICALS;
  });

  // 3. Silo & Yard Inventory State
  const [siloInventory, setSiloInventory] = useState(() => {
    try {
      const saved = localStorage.getItem(SILO_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse silo inventory:', e);
    }
    return INITIAL_SILO_STOCK;
  });

  const [search, setSearch] = useState('');

  // Cloud Subscriptions
  useEffect(() => {
    const unsubInward = subscribeCloudStore('cloud_material_inward', INWARD_STORAGE_KEY, INITIAL_INWARD, (cloudRecords) => {
      if (Array.isArray(cloudRecords)) setRecords(cloudRecords);
    });
    const unsubChem = subscribeCloudStore('cloud_chemical_barrels', CHEMICAL_STORAGE_KEY, INITIAL_CHEMICALS, (cloudChems) => {
      if (Array.isArray(cloudChems)) setChemicalRecords(cloudChems);
    });
    const unsubSilo = subscribeCloudStore('cloud_silo_inventory', SILO_STORAGE_KEY, INITIAL_SILO_STOCK, (cloudSilos) => {
      if (cloudSilos && typeof cloudSilos === 'object') setSiloInventory(cloudSilos);
    });

    return () => {
      unsubInward();
      unsubChem();
      unsubSilo();
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // New Inward Form State
  const [inwardForm, setInwardForm] = useState({
    entryNo: `INW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    material: COMMON_RAW_MATERIALS[0].name,
    targetSilo: COMMON_RAW_MATERIALS[0].defaultSilo,
    supplier: SUPPLIERS_LIST[0],
    vehicleNo: '',
    grossWeight: '',
    tareWeight: '',
    unit: 'Tons',
    challanNo: '',
    supplierInvoiceNo: '',
    recordedBy: 'Plant Weighbridge Operator',
    remarks: '',
    supportingDoc: null
  });

  // New Chemical Barrel Form State
  const [chemicalForm, setChemicalForm] = useState({
    entryNo: `CHEM-INW-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    chemicalName: COMMON_CHEMICAL_PRODUCTS[0].name,
    barrelCapacity: 220, // default 220 Litres
    fullBarrels: 5,
    partialLiters: 0,
    supplier: SUPPLIERS_LIST[5],
    invoiceNo: '',
    recordedBy: 'Quality Control Incharge',
    remarks: 'Tested for specific gravity and viscosity upon arrival.'
  });

  // Calculated Net Weight for Inward Form
  const calculatedInwardNet = React.useMemo(() => {
    const g = Number(inwardForm.grossWeight) || 0;
    const t = Number(inwardForm.tareWeight) || 0;
    return g >= t && g > 0 ? Number((g - t).toFixed(2)) : 0;
  }, [inwardForm.grossWeight, inwardForm.tareWeight]);

  // Calculated Chemical Volume
  const calculatedChemVolume = React.useMemo(() => {
    return calculateChemicalBarrelVolume({
      fullBarrels: chemicalForm.fullBarrels,
      barrelCapacity: chemicalForm.barrelCapacity,
      partialLiters: chemicalForm.partialLiters
    });
  }, [chemicalForm.fullBarrels, chemicalForm.barrelCapacity, chemicalForm.partialLiters]);

  // Handle Save Inward Entry
  const handleSaveInward = (e) => {
    e.preventDefault();
    if (!inwardForm.vehicleNo.trim()) {
      showToast('Please enter incoming vehicle number.');
      return;
    }
    const g = Number(inwardForm.grossWeight) || 0;
    const t = Number(inwardForm.tareWeight) || 0;
    if (g <= 0) {
      showToast('Please enter valid gross weight.');
      return;
    }
    if (g < t) {
      showToast(`Gross weight (${g} Tons) cannot be less than tare weight (${t} Tons).`);
      return;
    }

    const net = Number((g - t).toFixed(2));
    const newEntry = {
      id: `INW-${Date.now()}`,
      slipNo: inwardForm.entryNo,
      date: inwardForm.date,
      time: inwardForm.time,
      material: inwardForm.material,
      supplier: inwardForm.supplier,
      vehicleNo: inwardForm.vehicleNo.toUpperCase(),
      grossWeight: g,
      tareWeight: t,
      netTons: net,
      unit: inwardForm.unit,
      challanNo: inwardForm.challanNo || 'CH-INW',
      supplierInvoiceNo: inwardForm.supplierInvoiceNo || 'INV-SUPP',
      targetSilo: inwardForm.targetSilo,
      destination: inwardForm.targetSilo,
      recordedBy: inwardForm.recordedBy,
      remarks: inwardForm.remarks || 'Standard verified delivery',
      status: 'Finalized',
      createdAt: new Date().toISOString()
    };

    // Update Inward Records
    const updatedRecords = [newEntry, ...records];
    setRecords(updatedRecords);
    pushCloudStore('cloud_material_inward', INWARD_STORAGE_KEY, updatedRecords);

    // Update Silo Inventory Stock (Safe increment)
    const matConfig = COMMON_RAW_MATERIALS.find(m => m.name === inwardForm.material);
    if (matConfig && matConfig.key && siloInventory[matConfig.key]) {
      const updatedSilo = {
        ...siloInventory,
        [matConfig.key]: {
          ...siloInventory[matConfig.key],
          stockTons: Number((Number(siloInventory[matConfig.key].stockTons || 0) + net).toFixed(2))
        }
      };
      setSiloInventory(updatedSilo);
      pushCloudStore('cloud_silo_inventory', SILO_STORAGE_KEY, updatedSilo);
    }

    setShowInwardModal(false);
    showToast(`✓ Inward Entry #${newEntry.slipNo} saved! Credited ${net} MT to ${newEntry.targetSilo}.`);
  };

  // Handle Save Chemical Barrel Entry
  const handleSaveChemical = (e) => {
    e.preventDefault();
    const { fullBarrels, barrelCapacity, partialLiters, totalVolumeLiters } = calculatedChemVolume;

    if (totalVolumeLiters <= 0) {
      showToast('Please enter valid number of barrels or litres.');
      return;
    }

    const newChemEntry = {
      id: `CHEM-${Date.now()}`,
      entryNo: chemicalForm.entryNo,
      date: chemicalForm.date,
      time: chemicalForm.time,
      chemicalName: chemicalForm.chemicalName,
      barrelCapacity,
      fullBarrels,
      partialLiters,
      totalVolumeLiters,
      supplier: chemicalForm.supplier,
      invoiceNo: chemicalForm.invoiceNo || 'INV-CHEM',
      recordedBy: chemicalForm.recordedBy,
      remarks: chemicalForm.remarks,
      remainingStockLiters: totalVolumeLiters,
      status: 'Received & Approved',
      createdAt: new Date().toISOString()
    };

    const updatedChem = [newChemEntry, ...chemicalRecords];
    setChemicalRecords(updatedChem);
    pushCloudStore('cloud_chemical_barrels', CHEMICAL_STORAGE_KEY, updatedChem);

    // Update Chemical Inventory Stock
    const chemConfig = COMMON_CHEMICAL_PRODUCTS.find(c => c.name === chemicalForm.chemicalName);
    const stockKey = chemConfig?.key || 'admixturePce';
    if (siloInventory[stockKey]) {
      const updatedSilo = {
        ...siloInventory,
        [stockKey]: {
          ...siloInventory[stockKey],
          stockLiters: Number((Number(siloInventory[stockKey].stockLiters || 0) + totalVolumeLiters).toFixed(2))
        }
      };
      setSiloInventory(updatedSilo);
      pushCloudStore('cloud_silo_inventory', SILO_STORAGE_KEY, updatedSilo);
    }

    setShowChemicalModal(false);
    showToast(`✓ Received ${fullBarrels} barrels (${totalVolumeLiters} Litres) of ${chemicalForm.chemicalName}!`);
  };

  const handleDeleteInward = (id) => {
    if (window.confirm('Delete this material inward slip?')) {
      const target = records.find(r => r.id === id);
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      try {
        localStorage.setItem(INWARD_STORAGE_KEY, JSON.stringify(updated));
        pushCloudStore('cloud_material_inward', INWARD_STORAGE_KEY, updated);
      } catch {}
      if (target && target.material && (target.netTons || target.quantity)) {
        const netQty = Number(target.netTons || target.quantity || 0);
        const matConfig = COMMON_RAW_MATERIALS.find(m => m.name === target.material);
        if (matConfig && matConfig.key && siloInventory[matConfig.key]) {
          const updatedSilo = {
            ...siloInventory,
            [matConfig.key]: {
              ...siloInventory[matConfig.key],
              stockTons: Math.max(0, Number((Number(siloInventory[matConfig.key].stockTons || 0) - netQty).toFixed(2)))
            }
          };
          setSiloInventory(updatedSilo);
          try {
            localStorage.setItem(SILO_STORAGE_KEY, JSON.stringify(updatedSilo));
            pushCloudStore('cloud_silo_inventory', SILO_STORAGE_KEY, updatedSilo);
          } catch {}
        }
      }
      showToast('Material inward record deleted.');
    }
  };

  const handleDeleteChemical = (id) => {
    if (window.confirm('Delete this chemical barrel delivery record?')) {
      const target = chemicalRecords.find(c => c.id === id);
      const updated = chemicalRecords.filter(c => c.id !== id);
      setChemicalRecords(updated);
      try {
        localStorage.setItem(CHEMICAL_STORAGE_KEY, JSON.stringify(updated));
        pushCloudStore('cloud_chemical_barrels', CHEMICAL_STORAGE_KEY, updated);
      } catch {}
      if (target && target.chemicalName && target.totalVolumeLiters) {
        const chemConfig = COMMON_CHEMICAL_PRODUCTS.find(c => c.name === target.chemicalName);
        const stockKey = chemConfig?.key || 'admixturePce';
        if (siloInventory[stockKey]) {
          const updatedSilo = {
            ...siloInventory,
            [stockKey]: {
              ...siloInventory[stockKey],
              stockLiters: Math.max(0, Number((Number(siloInventory[stockKey].stockLiters || 0) - Number(target.totalVolumeLiters)).toFixed(2)))
            }
          };
          setSiloInventory(updatedSilo);
          try {
            localStorage.setItem(SILO_STORAGE_KEY, JSON.stringify(updatedSilo));
            pushCloudStore('cloud_silo_inventory', SILO_STORAGE_KEY, updatedSilo);
          } catch {}
        }
      }
      showToast('Chemical intake record deleted.');
    }
  };

  const filteredInward = records.filter(r => 
    (r.material || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.supplier || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.vehicleNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.slipNo || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.challanNo || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredChem = chemicalRecords.filter(c =>
    (c.chemicalName || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.supplier || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.entryNo || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-3 text-xs text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage('')} className="p-1 hover:bg-emerald-700 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Silo & Storage Capacity Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>{isMarathi ? 'सिमेंट सायलो #०१' : 'Cement Silo #01'}</span>
            <span className="text-blue-600 font-mono">OPC 53</span>
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
            {siloInventory.cement?.stockTons || 85.4} Tons
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all" 
              style={{ width: `${Math.min(100, Math.round(((siloInventory.cement?.stockTons || 85.4) / 100) * 100))}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>{isMarathi ? '२० मिमी खडी बिन #०१' : '20mm Agg Bin #01'}</span>
            <span className="text-emerald-700 font-mono">Coarse</span>
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
            {siloInventory.agg20?.stockTons || 148.0} Tons
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all" 
              style={{ width: `${Math.min(100, Math.round(((siloInventory.agg20?.stockTons || 148.0) / 200) * 100))}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>{isMarathi ? 'क्रश सॅन्ड (वाळू) बिन' : 'Crushed M-Sand Bin'}</span>
            <span className="text-indigo-700 font-mono">Zone II</span>
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
            {siloInventory.sand?.stockTons || 180.5} Tons
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all" 
              style={{ width: `${Math.min(100, Math.round(((siloInventory.sand?.stockTons || 180.5) / 200) * 100))}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-between">
            <span>{isMarathi ? 'केमिकल / ॲडमिक्सचर यार्ड' : 'Chemical Barrels & PCE'}</span>
            <span className="text-purple-700 font-mono">Admixture</span>
          </div>
          <div className="text-sm sm:text-base font-black text-purple-900 mt-0.5">
            {(Number(siloInventory.admixturePce?.stockLiters || 3200) + Number(siloInventory.retarder?.stockLiters || 1100)).toLocaleString('en-IN')} Litres
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-purple-600 h-full rounded-full transition-all" 
              style={{ width: `${Math.min(100, Math.round(((siloInventory.admixturePce?.stockLiters || 3200) / 5000) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Subtab Navigation Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('inward_slips')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'inward_slips'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>{isMarathi ? 'कच्चा माल आवक नोंद' : 'Material Inward Slips'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {records.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('chemical_barrels')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'chemical_barrels'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Droplet className="w-3.5 h-3.5 text-purple-600" />
            <span>{isMarathi ? 'केमिकल बॅरल्स नोंद' : 'Chemical Barrels'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-mono font-bold">
              {chemicalRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('silo_inventory')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'silo_inventory'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>{isMarathi ? 'सायलो स्टॉक स्थिती' : 'Silo & Yard Stock'}</span>
          </button>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search receipts, party..."
              className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>

          {activeSubTab === 'chemical_barrels' ? (
            <button
              type="button"
              onClick={() => setShowChemicalModal(true)}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Receive Chemical Barrels</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowInwardModal(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inward Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: RAW MATERIAL INWARD SLIPS */}
      {activeSubTab === 'inward_slips' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
              <tr>
                <th className="py-2.5 px-3 text-white border-r border-white/20">Slip # & Date</th>
                <th className="py-2.5 px-3 text-white border-r border-white/20">Material Name</th>
                <th className="py-2.5 px-3 text-white border-r border-white/20">Supplier / Quarry</th>
                <th className="py-2.5 px-3 text-white border-r border-white/20">Vehicle #</th>
                <th className="py-2.5 px-3 text-right text-white border-r border-white/20">Gross (MT)</th>
                <th className="py-2.5 px-3 text-right text-white border-r border-white/20">Tare (MT)</th>
                <th className="py-2.5 px-3 text-right text-white border-r border-white/20">Net Qty</th>
                <th className="py-2.5 px-3 text-white border-r border-white/20">Destination Silo</th>
                <th className="py-2.5 px-3 text-center text-white">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredInward.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-400 font-sans">
                    <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No raw material inward slips recorded yet. Click "Inward Entry" to register deliveries.
                  </td>
                </tr>
              ) : (
                filteredInward.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3">
                      <span className="font-bold text-blue-700 block">{r.slipNo || 'INW-ENTRY'}</span>
                      <span className="text-[10px] text-slate-500 font-normal">{r.date} {r.time}</span>
                    </td>
                    <td className="py-2 px-3 font-sans font-bold text-slate-900">{r.material}</td>
                    <td className="py-2 px-3 font-sans text-slate-700">{r.supplier}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{r.vehicleNo}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{r.grossWeight || '--'}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{r.tareWeight || '--'}</td>
                    <td className="py-2 px-3 text-right font-black text-emerald-700">
                      {r.netTons || r.quantity || 0} {r.unit || 'MT'}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">{r.targetSilo || r.destination || 'Storage Bin'}</td>
                    <td className="py-2 px-3 text-center font-sans">
                      <button
                        type="button"
                        onClick={() => handleDeleteInward(r.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Slip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: CHEMICAL BARREL INTAKE & MANAGEMENT (Section 2C) */}
      {activeSubTab === 'chemical_barrels' && (
        <div className="space-y-3">
          {/* Chemical Info Banner */}
          <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 text-purple-950 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Chemical Barrel Rule:</strong> Full 220L barrels calculate volume as <code className="font-mono bg-purple-100 px-1.5 py-0.5 rounded font-bold">Total = Barrels × 220 Litres</code>. Custom capacities (e.g. 250L, 1000L IBCs) are fully supported.
              </span>
            </div>
            <div className="font-mono font-bold text-purple-800">
              Total Recorded Intakes: {chemicalRecords.length}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="table-header-main bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-purple-950">
                <tr>
                  <th className="py-2.5 px-3 text-white border-r border-white/20">Ref # & Date</th>
                  <th className="py-2.5 px-3 text-white border-r border-white/20">Chemical Product</th>
                  <th className="py-2.5 px-3 text-white border-r border-white/20">Supplier</th>
                  <th className="py-2.5 px-3 text-center text-white border-r border-white/20">Barrel Size</th>
                  <th className="py-2.5 px-3 text-center text-white border-r border-white/20">Full Barrels</th>
                  <th className="py-2.5 px-3 text-right text-white border-r border-white/20">Total Volume</th>
                  <th className="py-2.5 px-3 text-white border-r border-white/20">Recorded By</th>
                  <th className="py-2.5 px-3 text-center text-white border-r border-white/20">Status</th>
                  <th className="py-2.5 px-3 text-center text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredChem.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-10 text-center text-slate-400 font-sans">
                      <Droplet className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                      No chemical barrel deliveries registered. Click "Receive Chemical Barrels" above.
                    </td>
                  </tr>
                ) : (
                  filteredChem.map(c => (
                    <tr key={c.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="py-2 px-3">
                        <span className="font-bold text-purple-800 block">{c.entryNo}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{c.date}</span>
                      </td>
                      <td className="py-2 px-3 font-sans font-bold text-slate-900">{c.chemicalName}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">{c.supplier}</td>
                      <td className="py-2 px-3 text-center text-purple-700 font-bold">{c.barrelCapacity} L</td>
                      <td className="py-2 px-3 text-center font-black text-slate-900">
                        {c.fullBarrels} {c.fullBarrels === 1 ? 'barrel' : 'barrels'}
                        {c.partialLiters > 0 && <span className="text-[10px] text-purple-600 block">+ {c.partialLiters} L</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-purple-900 text-xs">
                        {Number(c.totalVolumeLiters || 0).toLocaleString('en-IN')} Litres
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-600">{c.recordedBy}</td>
                      <td className="py-2 px-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-sans">
                        <button
                          type="button"
                          onClick={() => handleDeleteChemical(c.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: SILO & YARD INVENTORY LEVELS */}
      {activeSubTab === 'silo_inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(siloInventory).map(([key, item]) => {
            const isLiquid = item.unit === 'Litres';
            const current = isLiquid ? item.stockLiters : item.stockTons;
            const capacity = isLiquid ? item.capacityLiters : item.capacityTons;
            const pct = Math.min(100, Math.round(((current || 0) / (capacity || 100)) * 100));

            return (
              <div key={key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{item.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.siloName}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    pct < 25 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {pct}% Capacity
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-lg font-black font-mono text-slate-900">
                    {Number(current || 0).toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Max: {Number(capacity || 0).toLocaleString('en-IN')} {item.unit}
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      pct < 25 ? 'bg-rose-500' : pct < 60 ? 'bg-amber-500' : isLiquid ? 'bg-purple-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: MATERIAL INWARD ENTRY FORM                      */}
      {/* ========================================================= */}
      {showInwardModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto text-slate-800">
            <div className="px-4 py-3 bg-[#123B6D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs">Record Raw Material Inward Entry</h3>
              </div>
              <button type="button" onClick={() => setShowInwardModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInward} className="p-4 space-y-3 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Inward Entry #</label>
                  <input
                    type="text"
                    value={inwardForm.entryNo}
                    onChange={e => setInwardForm({ ...inwardForm, entryNo: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Date & Time</label>
                  <input
                    type="date"
                    value={inwardForm.date}
                    onChange={e => setInwardForm({ ...inwardForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Material Type *</label>
                  <select
                    value={inwardForm.material}
                    onChange={e => {
                      const m = COMMON_RAW_MATERIALS.find(item => item.name === e.target.value);
                      setInwardForm({ 
                        ...inwardForm, 
                        material: e.target.value,
                        targetSilo: m?.defaultSilo || inwardForm.targetSilo 
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                  >
                    {COMMON_RAW_MATERIALS.map((m, idx) => (
                      <option key={idx} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier / Quarry *</label>
                  <input
                    type="text"
                    value={inwardForm.supplier}
                    onChange={e => setInwardForm({ ...inwardForm, supplier: e.target.value })}
                    list="inward-suppliers-list"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                    required
                  />
                  <datalist id="inward-suppliers-list">
                    {SUPPLIERS_LIST.map((s, idx) => <option key={idx} value={s} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Incoming Vehicle # *</label>
                  <input
                    type="text"
                    value={inwardForm.vehicleNo}
                    onChange={e => setInwardForm({ ...inwardForm, vehicleNo: e.target.value.toUpperCase() })}
                    placeholder="e.g. MH-12-RN-8822"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Silo / Bin</label>
                  <input
                    type="text"
                    value={inwardForm.targetSilo}
                    onChange={e => setInwardForm({ ...inwardForm, targetSilo: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Weight Calculations */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                  Weight Telemetry (Metric Tons)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Gross (MT) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={inwardForm.grossWeight}
                      onChange={e => setInwardForm({ ...inwardForm, grossWeight: e.target.value })}
                      placeholder="e.g. 38.45"
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tare (MT) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={inwardForm.tareWeight}
                      onChange={e => setInwardForm({ ...inwardForm, tareWeight: e.target.value })}
                      placeholder="e.g. 14.20"
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Net Material</label>
                    <div className="w-full px-2 py-1.5 rounded bg-emerald-50 border border-emerald-300 font-mono text-xs font-black text-emerald-800 text-right">
                      {calculatedInwardNet.toFixed(2)} MT
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Challan Number</label>
                  <input
                    type="text"
                    value={inwardForm.challanNo}
                    onChange={e => setInwardForm({ ...inwardForm, challanNo: e.target.value })}
                    placeholder="e.g. CH-9901"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier Invoice #</label>
                  <input
                    type="text"
                    value={inwardForm.supplierInvoiceNo}
                    onChange={e => setInwardForm({ ...inwardForm, supplierInvoiceNo: e.target.value })}
                    placeholder="e.g. INV-2026-441"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Remarks & Driver Notes</label>
                <input
                  type="text"
                  value={inwardForm.remarks}
                  onChange={e => setInwardForm({ ...inwardForm, remarks: e.target.value })}
                  placeholder="Material quality verified, visual inspection passed"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finalize & Update Silo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CHEMICAL BARREL INTAKE FORM (Section 2C)         */}
      {/* ========================================================= */}
      {showChemicalModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto text-slate-800">
            <div className="px-4 py-3 bg-purple-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-purple-300" />
                <h3 className="font-bold text-xs">Receive Chemical Barrels (220L Standard / Custom)</h3>
              </div>
              <button type="button" onClick={() => setShowChemicalModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChemical} className="p-4 space-y-3 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Receipt Entry #</label>
                  <input
                    type="text"
                    value={chemicalForm.entryNo}
                    onChange={e => setChemicalForm({ ...chemicalForm, entryNo: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={chemicalForm.date}
                    onChange={e => setChemicalForm({ ...chemicalForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Chemical Product Name *</label>
                <select
                  value={chemicalForm.chemicalName}
                  onChange={e => setChemicalForm({ ...chemicalForm, chemicalName: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                >
                  {COMMON_CHEMICAL_PRODUCTS.map((c, idx) => (
                    <option key={idx} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier *</label>
                  <input
                    type="text"
                    value={chemicalForm.supplier}
                    onChange={e => setChemicalForm({ ...chemicalForm, supplier: e.target.value })}
                    list="chem-suppliers"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                    required
                  />
                  <datalist id="chem-suppliers">
                    {SUPPLIERS_LIST.map((s, idx) => <option key={idx} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Invoice / Delivery Ref</label>
                  <input
                    type="text"
                    value={chemicalForm.invoiceNo}
                    onChange={e => setChemicalForm({ ...chemicalForm, invoiceNo: e.target.value })}
                    placeholder="e.g. INV-FOS-882"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Barrel Telemetry & Formula Card */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                  Barrel Volume Math: (Full Barrels × Capacity) + Partial
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Capacity / Barrel</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={chemicalForm.barrelCapacity}
                        onChange={e => setChemicalForm({ ...chemicalForm, barrelCapacity: Number(e.target.value) || 220 })}
                        className="w-full pr-7 pl-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                        required
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">L</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Full Barrels *</label>
                    <input
                      type="number"
                      min="0"
                      value={chemicalForm.fullBarrels}
                      onChange={e => setChemicalForm({ ...chemicalForm, fullBarrels: Number(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Partial (L)</label>
                    <input
                      type="number"
                      min="0"
                      value={chemicalForm.partialLiters}
                      onChange={e => setChemicalForm({ ...chemicalForm, partialLiters: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Auto Calculated Banner */}
                <div className="p-2.5 rounded-lg bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-purple-200 block">Total Volume Received</span>
                    <span className="text-base font-black font-mono">
                      {calculatedChemVolume.totalVolumeLiters.toLocaleString('en-IN')} Litres
                    </span>
                  </div>
                  <div className="text-right text-[10px] text-purple-200">
                    {calculatedChemVolume.fullBarrels} full @ {calculatedChemVolume.barrelCapacity}L
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Quality Inspection & Notes</label>
                <input
                  type="text"
                  value={chemicalForm.remarks}
                  onChange={e => setChemicalForm({ ...chemicalForm, remarks: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowChemicalModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Receive & Credit Stock</span>
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
        topic="receiveMaterials" 
      />

      {/* Guided Receive Materials Wizard */}
      <ReceiveMaterialsWizard 
        isOpen={wizardOpen} 
        onClose={() => setWizardOpen(false)} 
        onComplete={(newRec) => {
          setRecords(prev => [newRec, ...prev]);
        }} 
      />
    </div>
  );
}
