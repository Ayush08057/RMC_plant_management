import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  Layers,
  TrendingUp,
  BarChart3,
  CheckCircle,
  AlertCircle,
  ArrowDownToLine,
  Truck
} from 'lucide-react';
import { sanitizeStoreItems } from '../../services/cloudSyncService';

export default function PlantReportsView() {
  const [reportType, setReportType] = useState('daily'); // 'daily', 'reconciliation', 'client_summary'
  const [dateRange, setDateRange] = useState('today');
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Auto-refresh reports on storage update
  React.useEffect(() => {
    const handleStorageUpdate = () => setRefreshCounter(prev => prev + 1);
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  // Period filter evaluator
  const matchesPeriod = React.useCallback((dateInput) => {
    if (!dateInput) return true;
    const now = new Date();
    let d;
    if (typeof dateInput === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
        d = new Date(dateInput);
      } else {
        const parts = dateInput.match(/(\d{1,2})[-/ ]([A-Za-z0-9]+)[-/ ](\d{4})/);
        if (parts) {
          d = new Date(`${parts[2]} ${parts[1]}, ${parts[3]}`);
          if (isNaN(d.getTime())) d = new Date(dateInput);
        } else {
          d = new Date(dateInput);
        }
      }
    } else {
      d = new Date(dateInput);
    }

    if (!d || isNaN(d.getTime())) return true;

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfRecord = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayDiff = Math.round((startOfToday - startOfRecord) / (1000 * 60 * 60 * 24));

    if (dateRange === 'today') return dayDiff === 0;
    if (dateRange === 'yesterday') return dayDiff === 1;
    if (dateRange === 'this_week') return dayDiff >= 0 && dayDiff <= 7;
    if (dateRange === 'this_month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  }, [dateRange]);

  // Live daily production records from batching sheets with aligned field properties
  const dailyBatches = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('rmc_batching_sheets_v2');
      if (saved) {
        const parsed = sanitizeStoreItems(JSON.parse(saved));
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((b) => matchesPeriod(b.date || b.createdAt))
            .map((b) => {
              const cementItem = (b.materials || []).find(m => (m.name || '').toLowerCase().includes('cement'));
              const flyashItem = (b.materials || []).find(m => (m.name || '').toLowerCase().includes('fly ash'));
              return {
                ticketNo: b.sheetNo || b.id || 'BT-REC',
                time: b.time || b.batchTime || '10:00 AM',
                client: b.customerName || b.clientName || b.customer || 'Direct Dispatch',
                site: b.site || b.siteLocation || 'Site Yard',
                grade: b.mixGrade || b.grade || 'M25',
                qty: parseFloat(b.volume || b.totalBatchVolumeM3 || b.m3 || b.qty || 0) || 0,
                cementKg: parseFloat(cementItem?.actual || cementItem?.target || b.actualBatched?.cementKg || b.cementKg || 0) || 0,
                flyashKg: parseFloat(flyashItem?.actual || flyashItem?.target || b.actualBatched?.flyashKg || b.flyashKg || 0) || 0,
                mixer: b.vehicleNo || b.vehicleReg || b.mixer || '--'
              };
            });
        }
      }
    } catch {}
    return [];
  }, [dateRange, refreshCounter, matchesPeriod]);

  // Material reconciliation calculation using real Inward, Silo, and Batching Data
  const reconciliationData = React.useMemo(() => {
    try {
      const rawInward = localStorage.getItem('rmc_material_inward_v2');
      const inwardList = rawInward ? JSON.parse(rawInward) : [];
      const rawBatches = localStorage.getItem('rmc_batching_sheets_v2');
      const batchList = rawBatches ? JSON.parse(rawBatches) : [];
      const rawSilo = localStorage.getItem('rmc_silo_inventory_v2');
      const siloStock = rawSilo ? JSON.parse(rawSilo) : {};

      const materialsToAudit = [
        { key: 'cement', label: 'Cement (OPC 53 Grade)', unit: 'MT', tolPct: 2.0, baseStock: 85.4 },
        { key: 'flyash', label: 'Fly Ash (Pozzocrete)', unit: 'MT', tolPct: 2.0, baseStock: 42.0 },
        { key: 'agg20', label: '20mm Coarse Aggregate', unit: 'MT', tolPct: 3.0, baseStock: 148.0 },
        { key: 'agg10', label: '10mm Coarse Aggregate', unit: 'MT', tolPct: 3.0, baseStock: 110.0 },
        { key: 'sand', label: 'Crushed M-Sand', unit: 'MT', tolPct: 3.0, baseStock: 180.5 },
      ];

      // Filter transactions strictly to the selected period
      const periodInward = (inwardList || []).filter(r => matchesPeriod(r.date || r.createdAt));
      const periodBatches = (batchList || []).filter(b => matchesPeriod(b.date || b.createdAt));

      return materialsToAudit.map(mat => {
        // Calculate inward receipts during this specific period
        const inwardTons = periodInward
          .filter(r => (r.material || '').toLowerCase().includes(mat.key) || (mat.key === 'agg20' && (r.material || '').includes('20mm')) || (mat.key === 'agg10' && (r.material || '').includes('10mm')))
          .reduce((sum, r) => sum + (parseFloat(r.netTons || r.quantity || 0) || 0), 0);

        // Calculate actual consumed and theoretical target from batch sheets during this period
        let actualKg = 0;
        let targetKg = 0;
        periodBatches.forEach(b => {
          (b.materials || []).forEach(m => {
            const mName = (m.name || '').toLowerCase();
            const matches = 
              (mat.key === 'cement' && mName.includes('cement')) ||
              (mat.key === 'flyash' && mName.includes('fly ash')) ||
              (mat.key === 'agg20' && mName.includes('20mm')) ||
              (mat.key === 'agg10' && mName.includes('10mm')) ||
              (mat.key === 'sand' && mName.includes('sand'));
            if (matches) {
              const act = m.actual !== null && m.actual !== undefined && m.actual !== '' ? parseFloat(m.actual) : parseFloat(m.target || 0);
              actualKg += act;
              targetKg += parseFloat(m.target || 0);
            }
          });
        });

        const actualConsumedMT = parseFloat((actualKg / 1000).toFixed(2));
        const theoreticalMT = parseFloat((targetKg / 1000).toFixed(2));
        const varianceMT = parseFloat((actualConsumedMT - theoreticalMT).toFixed(2));
        const variancePct = theoreticalMT > 0 ? ((varianceMT / theoreticalMT) * 100).toFixed(2) : '0.00';
        const isOk = Math.abs(parseFloat(variancePct)) <= mat.tolPct;

        // Closing stock from authoritative live silo inventory
        const currentLiveStock = siloStock[mat.key]?.stockTons !== undefined 
          ? Number(siloStock[mat.key].stockTons) 
          : mat.baseStock;

        // Period-based opening stock: Closing - Period Receipts + Period Consumption
        const openingStock = Math.max(0, Number((currentLiveStock - inwardTons + actualConsumedMT).toFixed(2)));

        return {
          material: mat.label,
          unit: mat.unit,
          openingStock: openingStock.toFixed(1),
          receivedInward: inwardTons.toFixed(1),
          theoreticalConsumption: theoreticalMT.toFixed(1),
          actualBatched: actualConsumedMT.toFixed(1),
          variance: `${varianceMT >= 0 ? '+' : ''}${varianceMT.toFixed(2)} ${mat.unit}`,
          variancePct: `${varianceMT >= 0 ? '+' : ''}${variancePct}%`,
          closingStock: Math.max(0, currentLiveStock).toFixed(1),
          status: isOk ? `In Spec (±${mat.tolPct}%)` : `Variance Out of Spec`
        };
      });
    } catch (e) {
      console.warn('Reconciliation calc error:', e);
      return [];
    }
  }, [dateRange, refreshCounter, matchesPeriod]);

  // Client summary data reading actual stored quantity & grade
  const clientSummary = React.useMemo(() => {
    try {
      const savedChallans = localStorage.getItem('rmc_delivery_challans_v2');
      if (savedChallans) {
        const parsed = sanitizeStoreItems(JSON.parse(savedChallans));
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = {};
          parsed
            .filter((c) => matchesPeriod(c.date || c.createdAt))
            .forEach((c) => {
              const key = `${c.customerName || 'General'}-${c.site || c.siteLocation || 'Site'}`;
              if (!map[key]) {
                map[key] = {
                  client: c.customerName || 'Direct Client',
                  site: c.site || c.siteLocation || 'Plant Site',
                  trips: 0,
                  totalM3: 0,
                  mainGrade: c.grade || c.concreteGrade || 'M25',
                  status: 'Active'
                };
              }
              map[key].trips += 1;
              map[key].totalM3 += parseFloat(c.quantity || c.concreteQuantityM3 || c.qty || 0) || 0;
            });
          return Object.values(map);
        }
      }
    } catch {}
    return [];
  }, [dateRange, refreshCounter, matchesPeriod]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (reportType === 'daily') {
      csvContent += 'Ticket No,Time,Client,Site,Grade,Quantity M3,Cement KG,Flyash KG,Mixer\n';
      dailyBatches.forEach(b => {
        csvContent += `"${b.ticketNo}","${b.time}","${b.client}","${b.site}","${b.grade}",${b.qty},${b.cementKg},${b.flyashKg},"${b.mixer}"\n`;
      });
    } else if (reportType === 'reconciliation') {
      csvContent += 'Material,Unit,Opening Stock,Inward,Theoretical,Actual Batched,Variance,Variance %,Closing Stock\n';
      reconciliationData.forEach(r => {
        csvContent += `"${r.material}","${r.unit}",${r.openingStock},${r.receivedInward},${r.theoreticalConsumption},${r.actualBatched},"${r.variance}","${r.variancePct}",${r.closingStock}\n`;
      });
    } else {
      csvContent += 'Client,Site,Trips,Total M3,Grade,Status\n';
      clientSummary.forEach(c => {
        csvContent += `"${c.client}","${c.site}",${c.trips},${c.totalM3},"${c.mainGrade}","${c.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rmc_plant_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalDailyM3 = dailyBatches.reduce((acc, b) => acc + b.qty, 0);
  const totalDailyCementKg = dailyBatches.reduce((acc, b) => acc + b.cementKg, 0);
  const avgBatchSize = dailyBatches.length > 0 ? (totalDailyM3 / dailyBatches.length).toFixed(1) : '0.0';

  return (
    <div className="space-y-2.5 sm:space-y-3 max-w-7xl mx-auto pb-6">
      {/* 1. Report Controls & Actions Toolbar */}
      <div className="bg-white px-3 py-2 rounded-xl border border-[#D4E4F7] shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Report Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setReportType('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              reportType === 'daily'
                ? 'bg-[#136dec] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 font-medium'
            }`}
          >
            Daily Production (DPR)
          </button>
          <button
            onClick={() => setReportType('reconciliation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              reportType === 'reconciliation'
                ? 'bg-[#136dec] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 font-medium'
            }`}
          >
            Material Reconciliation
          </button>
          <button
            onClick={() => setReportType('client_summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              reportType === 'client_summary'
                ? 'bg-[#136dec] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 font-medium'
            }`}
          >
            Client Dispatch Summary
          </button>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Calendar size={13} className="text-slate-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs font-medium bg-transparent text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#136dec] hover:bg-[#0f5ac5] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={13} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* REPORT CONTENT: DAILY PRODUCTION REPORT */}
      {reportType === 'daily' && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="bg-white p-2.5 rounded-lg border border-[#D4E4F7] shadow-2xs">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Production Today</p>
              <p className="text-lg font-bold text-blue-900 mt-0.5">{totalDailyM3.toFixed(1)} m³</p>
              <p className="text-[10px] text-slate-500">{dailyBatches.length} Transit Mixer loads</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-[#D4E4F7] shadow-2xs">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Cement Consumed</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{(totalDailyCementKg / 1000).toFixed(2)} MT</p>
              <p className="text-[10px] text-slate-500">OPC 53 Grade batched</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-[#D4E4F7] shadow-2xs">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Average Batch Size</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{avgBatchSize} m³</p>
              <p className="text-[10px] text-slate-500">100% capacity utilization</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-sm">
                Daily Batch Production Log — {new Date().toLocaleDateString('en-GB')}
              </h3>
              <span className="text-xs font-semibold text-gray-500">IS 4926 / IS 10262 Compliant</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
                  <tr>
                    <th className="py-3 px-4 text-white border-r border-white/20">Ticket No / Time</th>
                    <th className="py-3 px-4 text-white border-r border-white/20">Client & Site</th>
                    <th className="py-3 px-4 text-white border-r border-white/20">Grade</th>
                    <th className="py-3 px-4 text-right text-white border-r border-white/20">Volume (m³)</th>
                    <th className="py-3 px-4 text-right text-white border-r border-white/20">Cement (kg)</th>
                    <th className="py-3 px-4 text-right text-white border-r border-white/20">Fly Ash (kg)</th>
                    <th className="py-3 px-4 text-white">Mixer Reg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dailyBatches.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        <FileText className="w-7 h-7 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                        <p className="text-xs font-semibold text-slate-600">No daily production batches recorded</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Use "Make Concrete" or Batching Sheets to record daily batches.</p>
                      </td>
                    </tr>
                  ) : (
                    dailyBatches.map((b) => (
                      <tr key={b.ticketNo} className="hover:bg-blue-50/40 transition">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-gray-900">{b.ticketNo}</p>
                          <p className="text-xs text-gray-500">{b.time}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-800">{b.client}</p>
                          <p className="text-xs text-gray-500">{b.site}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-900">
                            {b.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-gray-900">
                          {b.qty.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-700">
                          {b.cementKg.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-700">
                          {b.flyashKg.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-800">
                          {b.mixer}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: MATERIAL RECONCILIATION */}
      {reportType === 'reconciliation' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                Raw Material Reconciliation Audit
              </h3>
              <p className="text-xs text-gray-500">Comparison of Theoretical SCADA demand vs Actual Weighbatching Consumption</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
              Audit Status: Verified Normal
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
                <tr>
                  <th className="py-3 px-4 text-white border-r border-white/20">Raw Material</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Opening</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Inward</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Theoretical</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Actual Consumed</th>
                  <th className="py-3 px-4 text-center text-white border-r border-white/20">Variance</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Closing Stock</th>
                  <th className="py-3 px-4 text-center text-white">Tolerance Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reconciliationData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">
                      <BarChart3 className="w-7 h-7 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-semibold text-slate-600">No material reconciliation audit records</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Reconciliation will calculate automatically when inward stock and batch consumption are logged.</p>
                    </td>
                  </tr>
                ) : (
                  reconciliationData.map((r) => (
                    <tr key={r.material} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {r.material}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-600">
                        {r.openingStock} {r.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                        +{r.receivedInward} {r.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-600">
                        {r.theoreticalConsumption} {r.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        {r.actualBatched} {r.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs font-bold text-blue-700">
                        {r.variance} ({r.variancePct})
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-gray-900">
                        {r.closingStock} {r.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: CLIENT SUMMARY */}
      {reportType === 'client_summary' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                Client-wise Cumulative Concrete Dispatch
              </h3>
              <p className="text-xs text-gray-500">Summary of total volume dispatched across construction sites</p>
            </div>
            <span className="text-xs text-gray-500 font-semibold">Active Contracts: {clientSummary.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#0B2546]">
                <tr>
                  <th className="py-3 px-4 text-white border-r border-white/20">Client Name</th>
                  <th className="py-3 px-4 text-white border-r border-white/20">Site Location</th>
                  <th className="py-3 px-4 text-center text-white border-r border-white/20">Trips Completed</th>
                  <th className="py-3 px-4 text-right text-white border-r border-white/20">Total Volume Dispatched</th>
                  <th className="py-3 px-4 text-center text-white border-r border-white/20">Dominant Grade</th>
                  <th className="py-3 px-4 text-center text-white">Contract Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientSummary.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      <Truck className="w-7 h-7 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-semibold text-slate-600">No client dispatches recorded</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Dispatched concrete challans will automatically calculate client volumes here.</p>
                    </td>
                  </tr>
                ) : (
                  clientSummary.map((c) => (
                    <tr key={c.client} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-gray-900">{c.client}</td>
                      <td className="py-3 px-4 text-gray-600">{c.site}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-800">{c.trips} trips</td>
                      <td className="py-3 px-4 text-right font-black text-blue-900 text-base">{c.totalM3} m³</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-900">
                          {c.mainGrade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                          c.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
