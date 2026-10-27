import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Boxes,
  Wrench,
  Droplet,
  Zap,
  Filter,
  X,
  Calendar,
  User,
  Truck
} from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';

export const STORE_INVENTORY_KEY = 'rmc_store_inventory_v1';
export const STORE_LOGS_KEY = 'rmc_store_logs_v1';

const CATEGORIES = [
  { id: 'Mechanical', label: 'Mechanical Spares', icon: Wrench, color: 'text-blue-600' },
  { id: 'Oils & Lubricants', label: 'Oils & Grease', icon: Droplet, color: 'text-amber-600' },
  { id: 'Electrical', label: 'Electrical & Motors', icon: Zap, color: 'text-yellow-600' },
  { id: 'Wear Parts', label: 'Mixer Blades & Liners', icon: Boxes, color: 'text-purple-600' },
  { id: 'General Consumables', label: 'Consumables & Hardware', icon: Package, color: 'text-slate-600' },
];

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return isoStr;
  }
}

function getTodayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function StoreInventoryView() {
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Modals
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [preselectedItem, setPreselectedItem] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const today = getTodayIso();

  // Subscribe to Cloud / Local Storage
  useEffect(() => {
    const unsubInv = subscribeCloudStore(STORE_INVENTORY_KEY, (data) => {
      if (Array.isArray(data)) setInventory(data);
    });
    const unsubLogs = subscribeCloudStore(STORE_LOGS_KEY, (data) => {
      if (Array.isArray(data)) setLogs(data);
    });
    return () => {
      unsubInv();
      unsubLogs();
    };
  }, []);

  const saveInventory = (updated) => {
    setInventory(updated);
    pushCloudStore(STORE_INVENTORY_KEY, updated);
  };

  const saveLogs = (updated) => {
    setLogs(updated);
    pushCloudStore(STORE_LOGS_KEY, updated);
  };

  // Inward Form State
  const [inwardForm, setInwardForm] = useState({
    itemName: '',
    category: 'Mechanical',
    qty: '',
    unit: 'Pcs',
    minLevel: '2',
    supplier: '',
    invoiceNo: '',
    date: today,
    remarks: ''
  });

  // Issue Form State
  const [issueForm, setIssueForm] = useState({
    itemId: '',
    qty: '',
    usedFor: '',
    issuedTo: '',
    date: today,
    remarks: ''
  });

  // Handle Inward (Add / Restock)
  const handleInwardSubmit = (e) => {
    e.preventDefault();
    const qtyNum = parseFloat(inwardForm.qty);
    if (!inwardForm.itemName.trim() || isNaN(qtyNum) || qtyNum <= 0) {
      alert('Please enter valid item name and inward quantity.');
      return;
    }

    const trimmedName = inwardForm.itemName.trim();
    const existingIndex = inventory.findIndex(
      i => i.name.toLowerCase() === trimmedName.toLowerCase()
    );

    let updatedInventory = [...inventory];
    let itemId = '';

    if (existingIndex >= 0) {
      // Update existing item stock
      const existing = updatedInventory[existingIndex];
      itemId = existing.id;
      updatedInventory[existingIndex] = {
        ...existing,
        stock: Number((existing.stock + qtyNum).toFixed(2)),
        category: inwardForm.category || existing.category,
        unit: inwardForm.unit || existing.unit,
        minLevel: parseFloat(inwardForm.minLevel) || existing.minLevel || 2,
        lastUpdated: new Date().toISOString()
      };
    } else {
      // Create new inventory item
      itemId = `SP-${Date.now().toString().slice(-5)}`;
      const newItem = {
        id: itemId,
        name: trimmedName,
        category: inwardForm.category,
        stock: qtyNum,
        unit: inwardForm.unit || 'Pcs',
        minLevel: parseFloat(inwardForm.minLevel) || 2,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      updatedInventory = [newItem, ...updatedInventory];
    }

    // Create log entry
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      type: 'INWARD',
      itemId,
      itemName: trimmedName,
      qty: qtyNum,
      unit: inwardForm.unit,
      sourceTarget: inwardForm.supplier ? `Supplier: ${inwardForm.supplier}` : 'Stock Purchase',
      reference: inwardForm.invoiceNo || '-',
      date: inwardForm.date,
      timestamp: new Date().toISOString(),
      remarks: inwardForm.remarks
    };

    saveInventory(updatedInventory);
    saveLogs([newLog, ...logs]);
    setShowInwardModal(false);
    setToastMessage(`Stock received: +${qtyNum} ${inwardForm.unit} of ${trimmedName}`);
    setInwardForm({
      itemName: '',
      category: 'Mechanical',
      qty: '',
      unit: 'Pcs',
      minLevel: '2',
      supplier: '',
      invoiceNo: '',
      date: today,
      remarks: ''
    });
  };

  // Open Issue Modal for specific item
  const handleOpenIssue = (item) => {
    setPreselectedItem(item);
    setIssueForm({
      itemId: item.id,
      qty: '',
      usedFor: '',
      issuedTo: '',
      date: today,
      remarks: ''
    });
    setShowIssueModal(true);
  };

  // Handle Issue (Outward / Consumption)
  const handleIssueSubmit = (e) => {
    e.preventDefault();
    const qtyNum = parseFloat(issueForm.qty);
    if (!issueForm.itemId || isNaN(qtyNum) || qtyNum <= 0) {
      alert('Please select an item and enter valid quantity.');
      return;
    }

    const item = inventory.find(i => i.id === issueForm.itemId);
    if (!item) {
      alert('Item not found in inventory.');
      return;
    }

    if (qtyNum > item.stock) {
      alert(`Insufficient stock! Available: ${item.stock} ${item.unit}. You requested: ${qtyNum}`);
      return;
    }

    const updatedInventory = inventory.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          stock: Number((i.stock - qtyNum).toFixed(2)),
          lastUpdated: new Date().toISOString()
        };
      }
      return i;
    });

    const newLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      type: 'OUTWARD',
      itemId: item.id,
      itemName: item.name,
      qty: qtyNum,
      unit: item.unit,
      sourceTarget: issueForm.usedFor ? `Used For: ${issueForm.usedFor}` : 'Plant Maintenance',
      reference: issueForm.issuedTo ? `To: ${issueForm.issuedTo}` : '-',
      date: issueForm.date,
      timestamp: new Date().toISOString(),
      remarks: issueForm.remarks
    };

    saveInventory(updatedInventory);
    saveLogs([newLog, ...logs]);
    setShowIssueModal(false);
    setToastMessage(`Issued: -${qtyNum} ${item.unit} of ${item.name} for ${issueForm.usedFor || 'Maintenance'}`);
  };

  // Delete Item
  const handleDeleteItem = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name} from inventory?`)) {
      const updated = inventory.filter(i => i.id !== id);
      saveInventory(updated);
      setToastMessage(`${name} removed from inventory.`);
    }
  };

  // Delete Log
  const handleDeleteLog = (id) => {
    if (window.confirm('Delete this transaction log?')) {
      const updated = logs.filter(l => l.id !== id);
      saveLogs(updated);
      setToastMessage('Transaction log deleted.');
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const lowStockCount = inventory.filter(i => i.stock <= (i.minLevel || 2)).length;
    const todayLogsCount = logs.filter(l => l.date === today).length;
    return { totalItems, lowStockCount, todayLogsCount };
  }, [inventory, logs, today]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (filterLowStockOnly && item.stock > (item.minLevel || 2)) return false;

      return true;
    });
  }, [inventory, searchTerm, selectedCategory, filterLowStockOnly]);

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 uppercase tracking-wider">
              <Boxes className="w-4 h-4 text-cyan-400" />
              <span>Plant Store & Spare Parts Management</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              स्टोअर व स्पेअर पार्ट्स इन्व्हेंटरी (Store & Spares Register)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              मिक्सर ब्लेड्स, ऑइल ड्रम्स, बेअरिंग्स व मेंटेनन्स साहित्याची आवक-जावक आणि कमी साठा (Low Stock) अलर्ट्स.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setInwardForm({
                  itemName: '',
                  category: 'Mechanical',
                  qty: '',
                  unit: 'Pcs',
                  minLevel: '2',
                  supplier: '',
                  invoiceNo: '',
                  date: today,
                  remarks: ''
                });
                setShowInwardModal(true);
              }}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs shadow flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Inward Stock (सामान आले)</span>
            </button>
            <button
              onClick={() => {
                if (inventory.length === 0) {
                  alert('No items in inventory. Please inward stock first.');
                  return;
                }
                setIssueForm({
                  itemId: inventory[0]?.id || '',
                  qty: '',
                  usedFor: '',
                  issuedTo: '',
                  date: today,
                  remarks: ''
                });
                setShowIssueModal(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Minus className="w-4 h-4" />
              <span>- Issue Spare (सामान वापरले)</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800">
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Items in Store</div>
            <div className="text-xl font-black text-white mt-0.5">{stats.totalItems}</div>
            <div className="text-[10px] text-slate-400">एकूण नोंदवलेले सुटे भाग</div>
          </div>

          <div 
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`p-2 rounded-lg cursor-pointer transition-all ${
              stats.lowStockCount > 0 ? 'bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30' : 'bg-slate-900/60 border border-slate-800'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-rose-300 flex items-center justify-between">
              <span>Low Stock Alert</span>
              {stats.lowStockCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
            </div>
            <div className="text-xl font-black text-white mt-0.5">{stats.lowStockCount}</div>
            <div className="text-[10px] text-slate-300">
              {filterLowStockOnly ? 'Filtered: Low Stock (Click to show all)' : 'कमी साठा असणारे आयटम्स'}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('history')}
            className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900/80 transition-all"
          >
            <div className="text-[10px] uppercase font-bold text-cyan-300">Today's Transactions</div>
            <div className="text-xl font-black text-white mt-0.5">{stats.todayLogsCount}</div>
            <div className="text-[10px] text-slate-400">आजचे आवक / जावक व्यवहार</div>
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation: Stock vs History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setActiveTab('stock'); setFilterLowStockOnly(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>शिल्लक साठा (Current Stock)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>आवक-जावक नोंदवही (Transaction Logs)</span>
          </button>
        </div>

        {activeTab === 'stock' && (
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search part name, category..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Category Pills (Only on Stock view) */}
      {activeTab === 'stock' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Categories ({inventory.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = inventory.filter(i => i.category === cat.id).length;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label} ({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* VIEW 1: CURRENT STOCK TABLE */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          {filteredInventory.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-600">No spare parts in store.</p>
              <p className="text-xs text-slate-400 mt-0.5">Click '+ Inward Stock' to add your first spare part, lubricant or blade.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Item Code & Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Available Stock</th>
                    <th className="py-2.5 px-3 text-right">Min Safe Level</th>
                    <th className="py-2.5 px-3">Stock Status</th>
                    <th className="py-2.5 px-3">Last Activity</th>
                    <th className="py-2.5 px-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map(item => {
                    const isLow = item.stock <= (item.minLevel || 2);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.id}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 font-semibold text-slate-700 rounded text-[10px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-mono font-bold text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                            {item.stock}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1 font-medium">{item.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {item.minLevel || 2} {item.unit}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isLow
                              ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          }`}>
                            <span>{isLow ? '⚠️ Low Stock (ऑर्डर करा)' : '✅ In Stock'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                          {formatDate(item.lastUpdated || item.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenIssue(item)}
                              disabled={item.stock <= 0}
                              className="px-2 py-1 rounded text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Issue this part for maintenance"
                            >
                              <Minus className="w-3 h-3" />
                              <span>Issue</span>
                            </button>
                            <button
                              onClick={() => {
                                setInwardForm({
                                  itemName: item.name,
                                  category: item.category,
                                  qty: '',
                                  unit: item.unit,
                                  minLevel: String(item.minLevel || 2),
                                  supplier: '',
                                  invoiceNo: '',
                                  date: today,
                                  remarks: ''
                                });
                                setShowInwardModal(true);
                              }}
                              className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Add more stock for this part"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Restock</span>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TRANSACTION HISTORY LOGS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-600">No inward or outward transaction logs yet.</p>
              <p className="text-xs text-slate-400 mt-0.5">Transactions will appear automatically when you inward or issue items.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3">Supplier / Destination</th>
                    <th className="py-2.5 px-3">Reference / Remarks</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => {
                    const isInward = log.type === 'INWARD';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">
                          {formatDate(log.date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isInward
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {isInward ? <ArrowDownRight className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-amber-600" />}
                            <span>{isInward ? 'INWARD (आवक)' : 'ISSUE (वापर)'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {log.itemName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={isInward ? 'text-emerald-700' : 'text-amber-700'}>
                            {isInward ? `+${log.qty}` : `-${log.qty}`}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1 font-normal">{log.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          {log.sourceTarget || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          <div>{log.reference || '-'}</div>
                          {log.remarks && <div className="text-[10px] text-slate-400 italic">{log.remarks}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: INWARD STOCK (सामान आले) */}
      {showInwardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Inward Store Stock (साहित्य आवक नोंद)</span>
                </h3>
                <p className="text-[11px] text-slate-500">प्लांटसाठी खरेदी केलेले स्पेअर पार्ट्स किंवा ऑइल नोंदवा.</p>
              </div>
              <button onClick={() => setShowInwardModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Item / Spare Part Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pan Mixer Blade Set, Hydraulic Oil VG 68..."
                  value={inwardForm.itemName}
                  onChange={(e) => setInwardForm({ ...inwardForm, itemName: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={inwardForm.category}
                    onChange={(e) => setInwardForm({ ...inwardForm, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={inwardForm.unit}
                    onChange={(e) => setInwardForm({ ...inwardForm, unit: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="Pcs">Pcs (नग)</option>
                    <option value="Liters">Liters (लिटर)</option>
                    <option value="Sets">Sets (संच)</option>
                    <option value="Kg">Kg (किलो)</option>
                    <option value="Barrels">Barrels (ड्रम)</option>
                    <option value="Meters">Meters (मीटर)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Inward Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5"
                    value={inwardForm.qty}
                    onChange={(e) => setInwardForm({ ...inwardForm, qty: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Min Alert Level</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 2"
                    value={inwardForm.minLevel}
                    onChange={(e) => setInwardForm({ ...inwardForm, minLevel: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Spares Pune"
                    value={inwardForm.supplier}
                    onChange={(e) => setInwardForm({ ...inwardForm, supplier: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Inward Date</label>
                  <input
                    type="date"
                    required
                    value={inwardForm.date}
                    onChange={(e) => setInwardForm({ ...inwardForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice / PO / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Bill #4812, PO #2026-90"
                  value={inwardForm.remarks}
                  onChange={(e) => setInwardForm({ ...inwardForm, remarks: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow cursor-pointer"
                >
                  Confirm Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE SPARE (सामान वापरले) */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Minus className="w-4 h-4 text-amber-600" />
                  <span>Issue Spare Part (साहित्य वापर नोंद)</span>
                </h3>
                <p className="text-[11px] text-slate-500">कोणत्या कामासाठी किंवा वाहनासाठी सुटे भाग वापरले ते नोंदवा.</p>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Item *</label>
                <select
                  value={issueForm.itemId}
                  onChange={(e) => setIssueForm({ ...issueForm, itemId: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                >
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Stock: {item.stock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity to Issue *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1"
                    value={issueForm.qty}
                    onChange={(e) => setIssueForm({ ...issueForm, qty: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={issueForm.date}
                    onChange={(e) => setIssueForm({ ...issueForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Used For / Equipment *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TM-04 Maintenance, Batching Mixer, Wheel Loader Service..."
                  value={issueForm.usedFor}
                  onChange={(e) => setIssueForm({ ...issueForm, usedFor: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Issued To (Person)</label>
                  <input
                    type="text"
                    placeholder="e.g. Plant Mechanic Rajesh"
                    value={issueForm.issuedTo}
                    onChange={(e) => setIssueForm({ ...issueForm, issuedTo: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Routine replacement"
                    value={issueForm.remarks}
                    onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow cursor-pointer"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
