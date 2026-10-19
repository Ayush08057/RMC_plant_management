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

export default function PlantReportsView() {
  const [reportType, setReportType] = useState('daily'); // 'daily', 'reconciliation', 'client_summary'
  const [dateRange, setDateRange] = useState('today');

  // Daily production records
  const dailyBatches = [
    { ticketNo: 'BT-2026-1041', time: '08:30 AM', client: 'Godrej Properties Ltd', site: 'Baner Ph-2', grade: 'M30', qty: 6.0, cementKg: 2040, flyashKg: 480, mixer: 'MH-12-RN-4401' },
    { ticketNo: 'BT-2026-1042', time: '09:15 AM', client: 'Rohan Builders', site: 'Wagholi', grade: 'M25', qty: 6.0, cementKg: 1920, flyashKg: 420, mixer: 'MH-12-RN-8822' },
    { ticketNo: 'BT-2026-1043', time: '10:00 AM', client: 'Kolte Patil Developers', site: 'Hinjewadi', grade: 'M35', qty: 7.0, cementKg: 2590, flyashKg: 560, mixer: 'MH-14-BT-1920' },
    { ticketNo: 'BT-2026-1044', time: '11:10 AM', client: 'VTP Realty', site: 'Kharadi', grade: 'M25', qty: 6.0, cementKg: 1920, flyashKg: 420, mixer: 'MH-12-PQ-9003' },
    { ticketNo: 'BT-2026-1045', time: '12:20 PM', client: 'Godrej Properties Ltd', site: 'Baner Ph-2', grade: 'M30', qty: 6.0, cementKg: 2040, flyashKg: 480, mixer: 'MH-12-RN-4401' },
    { ticketNo: 'BT-2026-1046', time: '01:45 PM', client: 'Khandge Heights', site: 'Talegaon', grade: 'M20', qty: 5.5, cementKg: 1540, flyashKg: 330, mixer: 'MH-14-GH-7788' },
  ];

  // Material reconciliation data
  const reconciliationData = [
    { material: 'Cement OPC 53 Grade', unit: 'MT', openingStock: 65.4, receivedInward: 35.2, theoreticalConsumption: 28.1, actualBatched: 28.25, variance: '+0.15 MT', variancePct: '+0.53%', closingStock: 72.35, status: 'Within Tolerance (±1%)' },
    { material: 'Fly Ash (Dirk Pozzocrete)', unit: 'MT', openingStock: 42.0, receivedInward: 25.0, theoreticalConsumption: 18.2, actualBatched: 18.10, variance: '-0.10 MT', variancePct: '-0.55%', closingStock: 48.90, status: 'Within Tolerance (±1%)' },
    { material: '20mm Basalt Aggregate', unit: 'MT', openingStock: 120.0, receivedInward: 60.0, theoreticalConsumption: 52.4, actualBatched: 52.80, variance: '+0.40 MT', variancePct: '+0.76%', closingStock: 127.20, status: 'Within Tolerance (±2%)' },
    { material: '10mm Basalt Aggregate', unit: 'MT', openingStock: 85.0, receivedInward: 40.0, theoreticalConsumption: 34.6, actualBatched: 34.90, variance: '+0.30 MT', variancePct: '+0.87%', closingStock: 90.10, status: 'Within Tolerance (±2%)' },
    { material: 'Crush Sand (VSI M-Sand)', unit: 'MT', openingStock: 160.0, receivedInward: 80.0, theoreticalConsumption: 68.2, actualBatched: 68.70, variance: '+0.50 MT', variancePct: '+0.73%', closingStock: 171.30, status: 'Within Tolerance (±2%)' },
    { material: 'Superplasticizer Admixture', unit: 'KG', openingStock: 850, receivedInward: 500, theoreticalConsumption: 340, actualBatched: 342, variance: '+2 KG', variancePct: '+0.59%', closingStock: 1008, status: 'Within Tolerance (±1%)' },
  ];

  // Client summary data
  const clientSummary = [
    { client: 'Godrej Properties Ltd', site: 'Baner Ph-2', trips: 14, totalM3: 84.0, mainGrade: 'M30', status: 'Active' },
    { client: 'Kolte Patil Developers', site: 'Life Republic Hinjewadi', trips: 10, totalM3: 70.0, mainGrade: 'M35', status: 'Active' },
    { client: 'Rohan Builders', site: 'Rohan Abhilasha Wagholi', trips: 8, totalM3: 48.0, mainGrade: 'M25', status: 'Active' },
    { client: 'VTP Realty', site: 'VTP Pegasus Kharadi', trips: 6, totalM3: 36.0, mainGrade: 'M25', status: 'Active' },
    { client: 'Khandge Heights', site: 'Talegaon Dabhade', trips: 3, totalM3: 16.5, mainGrade: 'M20', status: 'Completed' },
  ];

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Management Information System (MIS)
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Plant Production & Audit Reports (प्लॅन्ट अहवाल)</h1>
          <p className="text-sm text-indigo-200/80 mt-1">
            Daily Production Reports (DPR), monthly concrete output, material reconciliation & client dispatch logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg border border-white/20 transition"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow transition active:scale-95"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setReportType('daily')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              reportType === 'daily'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Daily Production Report (DPR)
          </button>
          <button
            onClick={() => setReportType('reconciliation')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              reportType === 'reconciliation'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Material Reconciliation Audit
          </button>
          <button
            onClick={() => setReportType('client_summary')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              reportType === 'client_summary'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Client Dispatch Summary
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Calendar size={15} className="text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg p-1.5 text-xs font-medium bg-gray-50"
          >
            <option value="today">Today (19-Oct-2026)</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Current Week</option>
            <option value="month">Current Month (Oct 2026)</option>
          </select>
        </div>
      </div>

      {/* REPORT CONTENT: DAILY PRODUCTION REPORT */}
      {reportType === 'daily' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Production Today</p>
              <p className="text-2xl font-black text-blue-900 mt-1">{totalDailyM3.toFixed(1)} m³</p>
              <p className="text-xs text-gray-500 mt-1">{dailyBatches.length} Transit Mixer loads</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Cement Consumed</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{(totalDailyCementKg / 1000).toFixed(2)} MT</p>
              <p className="text-xs text-gray-500 mt-1">OPC 53 Grade batched</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 font-semibold uppercase">Average Batch Size</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{(totalDailyM3 / dailyBatches.length).toFixed(1)} m³</p>
              <p className="text-xs text-gray-500 mt-1">100% capacity utilization</p>
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
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ticket No / Time</th>
                    <th className="py-3 px-4">Client & Site</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4 text-right">Volume (m³)</th>
                    <th className="py-3 px-4 text-right">Cement (kg)</th>
                    <th className="py-3 px-4 text-right">Fly Ash (kg)</th>
                    <th className="py-3 px-4">Mixer Reg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dailyBatches.map((b) => (
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
                  ))}
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
                Raw Material Reconciliation Audit (कच्चा माल ऑडिट)
              </h3>
              <p className="text-xs text-gray-500">Comparison of Theoretical SCADA demand vs Actual Weighbatching Consumption</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
              Audit Status: Verified Normal
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Raw Material</th>
                  <th className="py-3 px-4 text-right">Opening</th>
                  <th className="py-3 px-4 text-right">Inward</th>
                  <th className="py-3 px-4 text-right">Theoretical</th>
                  <th className="py-3 px-4 text-right">Actual Consumed</th>
                  <th className="py-3 px-4 text-center">Variance</th>
                  <th className="py-3 px-4 text-right">Closing Stock</th>
                  <th className="py-3 px-4 text-center">Tolerance Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reconciliationData.map((r) => (
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
                ))}
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
              <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Site Location</th>
                  <th className="py-3 px-4 text-center">Trips Completed</th>
                  <th className="py-3 px-4 text-right">Total Volume Dispatched</th>
                  <th className="py-3 px-4 text-center">Dominant Grade</th>
                  <th className="py-3 px-4 text-center">Contract Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientSummary.map((c) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
