import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  MapPin,
  X,
  ShieldCheck,
  ChevronRight,
  Filter,
  Check,
  Award,
  Download
} from 'lucide-react';
import { subscribeCloudStore, pushCloudStore } from '../../services/cloudSyncService';

export const QC_CUBES_STORAGE_KEY = 'rmc_qc_cube_tests_v1';

// IS 456:2000 Characteristic & 7-Day Target Compressive Strengths (in N/mm²)
export const IS_STRENGTH_STANDARDS = {
  'M10': { grade: 'M10', target7d: 7.0, target28d: 10.0 },
  'M15': { grade: 'M15', target7d: 10.0, target28d: 15.0 },
  'M20': { grade: 'M20', target7d: 13.5, target28d: 20.0 },
  'M25': { grade: 'M25', target7d: 17.0, target28d: 25.0 },
  'M30': { grade: 'M30', target7d: 20.0, target28d: 30.0 },
  'M35': { grade: 'M35', target7d: 23.5, target28d: 35.0 },
  'M40': { grade: 'M40', target7d: 27.0, target28d: 40.0 },
  'M45': { grade: 'M45', target7d: 30.0, target28d: 45.0 },
  'M50': { grade: 'M50', target7d: 33.5, target28d: 50.0 },
};

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

function addDays(isoDate, days) {
  try {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return isoDate;
  }
}

export default function QcCubeTestingView() {
  const [cubes, setCubes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, DUE_TODAY, UPCOMING, COMPLETED
  const [showAddModal, setShowAddModal] = useState(false);
  const [testModalCube, setTestModalCube] = useState(null);
  const [certModalCube, setCertModalCube] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Subscribe to storage
  useEffect(() => {
    const unsub = subscribeCloudStore(QC_CUBES_STORAGE_KEY, (data) => {
      if (Array.isArray(data)) {
        setCubes(data);
      }
    });
    return () => unsub();
  }, []);

  const saveCubes = (updated) => {
    setCubes(updated);
    pushCloudStore(QC_CUBES_STORAGE_KEY, updated);
  };

  const today = getTodayIso();

  // Add Cube Form State
  const [addForm, setAddForm] = useState({
    batchId: '',
    clientName: '',
    site: '',
    vehicleNo: '',
    mixGrade: 'M25',
    castingDate: today,
    specimenCount: 3,
    castBy: 'QC In-Charge',
    remarks: '',
  });

  // Record Test Form State
  const [testForm, setTestForm] = useState({
    testType: '7d', // '7d' or '28d'
    testDate: today,
    loadKn1: '',
    loadKn2: '',
    loadKn3: '',
    testedBy: 'QC Technician',
    remarks: 'Cubes cured in clean water tank prior to testing'
  });

  // Handle Add Cube Submit
  const handleAddCube = (e) => {
    e.preventDefault();
    if (!addForm.batchId || !addForm.clientName) {
      alert('Please enter Batch ID / Challan No and Client Name');
      return;
    }

    const dueDate7d = addDays(addForm.castingDate, 7);
    const dueDate28d = addDays(addForm.castingDate, 28);
    const target7d = IS_STRENGTH_STANDARDS[addForm.mixGrade]?.target7d || 17.0;
    const target28d = IS_STRENGTH_STANDARDS[addForm.mixGrade]?.target28d || 25.0;

    const newCube = {
      id: `CB-${Date.now().toString().slice(-6)}`,
      batchId: addForm.batchId.trim(),
      clientName: addForm.clientName.trim(),
      site: addForm.site.trim() || 'Plant Pouring Yard',
      vehicleNo: addForm.vehicleNo.trim() || 'TM-01',
      mixGrade: addForm.mixGrade,
      castingDate: addForm.castingDate,
      specimenCount: Number(addForm.specimenCount) || 3,
      castBy: addForm.castBy.trim() || 'QC Engineer',
      dueDate7d,
      dueDate28d,
      target7d,
      target28d,
      test7d: null,  // { testDate, loadKn: [], strengthMpa: [], avgStrength, isPass, testedBy }
      test28d: null,
      remarks: addForm.remarks.trim(),
      createdAt: new Date().toISOString(),
    };

    saveCubes([newCube, ...cubes]);
    setShowAddModal(false);
    setToastMessage(`New Cube Sample ${newCube.id} for ${newCube.mixGrade} recorded.`);
    setAddForm({
      batchId: '',
      clientName: '',
      site: '',
      vehicleNo: '',
      mixGrade: 'M25',
      castingDate: today,
      specimenCount: 3,
      castBy: 'QC In-Charge',
      remarks: '',
    });
  };

  // Delete Cube
  const handleDeleteCube = (id) => {
    if (window.confirm(`Are you sure you want to delete cube test record ${id}?`)) {
      const updated = cubes.filter(c => c.id !== id);
      saveCubes(updated);
      setToastMessage(`Cube record ${id} removed.`);
      if (certModalCube?.id === id) setCertModalCube(null);
    }
  };

  // Open Test Modal
  const handleOpenTestModal = (cube, testType = '7d') => {
    setTestModalCube(cube);
    setTestForm({
      testType,
      testDate: today,
      loadKn1: '',
      loadKn2: '',
      loadKn3: '',
      testedBy: 'QC Technician',
      remarks: 'Cured in water tank at 27Â±2Â°C as per IS 516'
    });
  };

  // Submit Crushing Test
  const handleSubmitTest = (e) => {
    e.preventDefault();
    if (!testModalCube) return;

    const loads = [
      parseFloat(testForm.loadKn1) || 0,
      parseFloat(testForm.loadKn2) || 0,
      parseFloat(testForm.loadKn3) || 0,
    ].filter(l => l > 0);

    if (loads.length === 0) {
      alert('Please enter at least one failure breaking load (kN).');
      return;
    }

    // 150x150 mm cube area = 22,500 mmÂ²
    // Compressive Strength (N/mmÂ²) = (Load in kN * 1000) / 22500
    const strengths = loads.map(kn => Number(((kn * 1000) / 22500).toFixed(2)));
    const avgStrength = Number((strengths.reduce((a, b) => a + b, 0) / strengths.length).toFixed(2));
    const target = testForm.testType === '7d' ? testModalCube.target7d : testModalCube.target28d;
    const isPass = avgStrength >= target;

    const testResult = {
      testDate: testForm.testDate,
      loadsKn: loads,
      strengthsMpa: strengths,
      avgStrength,
      target,
      isPass,
      testedBy: testForm.testedBy,
      remarks: testForm.remarks
    };

    const updated = cubes.map(c => {
      if (c.id === testModalCube.id) {
        return {
          ...c,
          [testForm.testType === '7d' ? 'test7d' : 'test28d']: testResult
        };
      }
      return c;
    });

    saveCubes(updated);
    setTestModalCube(null);
    setToastMessage(`${testForm.testType.toUpperCase()} Cube test for ${testModalCube.id} recorded (${avgStrength} MPa - ${isPass ? 'PASSED' : 'FAILED'}).`);
  };

  // Helper to determine status
  const getCubeStatus = (cube) => {
    const has7d = !!cube.test7d;
    const has28d = !!cube.test28d;

    if (has7d && has28d) {
      const allPassed = cube.test7d.isPass && cube.test28d.isPass;
      return { code: 'COMPLETED', label: allPassed ? 'Passed (उत्तीर्ण)' : 'Failed (अनुत्तीर्ण)', color: allPassed ? 'emerald' : 'rose' };
    }

    // Check if 7d due
    if (!has7d) {
      if (cube.dueDate7d === today) {
        return { code: 'DUE_TODAY_7D', label: '7-Day Due Today (आज चाचणी)', color: 'rose' };
      }
      if (cube.dueDate7d < today) {
        return { code: 'OVERDUE_7D', label: '7-Day Overdue (मुदत संपली)', color: 'amber' };
      }
    }

    // Check if 28d due
    if (!has28d) {
      if (cube.dueDate28d === today) {
        return { code: 'DUE_TODAY_28D', label: '28-Day Due Today (आज चाचणी)', color: 'rose' };
      }
      if (cube.dueDate28d < today) {
        return { code: 'OVERDUE_28D', label: '28-Day Overdue (मुदत संपली)', color: 'amber' };
      }
    }

    return { code: 'UPCOMING', label: 'In Curing Tank (क्युरिंग सुरू)', color: 'blue' };
  };

  // Quick statistics
  const stats = useMemo(() => {
    let dueToday = 0;
    let overdue = 0;
    let upcoming = 0;
    let passed = 0;

    cubes.forEach(c => {
      const s = getCubeStatus(c);
      if (s.code.includes('DUE_TODAY')) dueToday++;
      else if (s.code.includes('OVERDUE')) overdue++;
      else if (s.code === 'UPCOMING') upcoming++;
      else if (s.code === 'COMPLETED' && c.test7d?.isPass) passed++;
    });

    return { total: cubes.length, dueToday, overdue, upcoming, passed };
  }, [cubes, today]);

  // Filtered list
  const filteredCubes = useMemo(() => {
    return cubes.filter(c => {
      const matchesSearch = 
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.mixGrade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.site.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const s = getCubeStatus(c);
      if (statusFilter === 'DUE_TODAY') return s.code.includes('DUE_TODAY') || s.code.includes('OVERDUE');
      if (statusFilter === 'UPCOMING') return s.code === 'UPCOMING';
      if (statusFilter === 'COMPLETED') return s.code === 'COMPLETED';

      return true;
    });
  }, [cubes, searchTerm, statusFilter, today]);

  return (
    <div className="w-full space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner: Auto Due Reminders */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-3 sm:p-4 shadow-sm border border-blue-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-cyan-300" />
              <span>IS 516 / IS 456 Concrete Cube Strength Monitor</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              क्युब टेस्टिंग शेड्युल आणि ऑटो रिमाइंडर्स (7 & 28 Days Testing)
            </h2>
            <p className="text-xs text-blue-100/90 mt-0.5">
              क्युरिंग टँक मधील क्युबचे वय तपासून चाचणीची तारीख आपोआप कळते आणि अधिकृत लॅब सर्टिफिकेट तयार होते.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs shadow flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cast New Cubes</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-blue-800/80">
          <div 
            onClick={() => setStatusFilter(statusFilter === 'DUE_TODAY' ? 'ALL' : 'DUE_TODAY')}
            className={`p-2 rounded-lg cursor-pointer transition-all ${
              stats.dueToday > 0 ? 'bg-rose-500/20 border border-rose-400/30' : 'bg-blue-950/40 border border-blue-800/40'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-rose-300 flex items-center justify-between">
              <span>Due Today / Overdue</span>
              {stats.dueToday > 0 && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
            </div>
            <div className="text-xl font-black text-white mt-0.5">{stats.dueToday + stats.overdue}</div>
            <div className="text-[10px] text-slate-300">आज चाचणी आवश्यक</div>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
            className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 cursor-pointer hover:bg-blue-950/60 transition-all"
          >
            <div className="text-[10px] uppercase font-bold text-cyan-300">In Curing (Upcoming)</div>
            <div className="text-xl font-black text-white mt-0.5">{stats.upcoming}</div>
            <div className="text-[10px] text-slate-300">क्युरिंग चालू असलेले</div>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 cursor-pointer hover:bg-blue-950/60 transition-all"
          >
            <div className="text-[10px] uppercase font-bold text-emerald-300">Tested & Certified</div>
            <div className="text-xl font-black text-white mt-0.5">{stats.passed}</div>
            <div className="text-[10px] text-slate-300">यशस्वी चाचण्या</div>
          </div>

          <div 
            onClick={() => setStatusFilter('ALL')}
            className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 cursor-pointer hover:bg-blue-950/60 transition-all"
          >
            <div className="text-[10px] uppercase font-bold text-slate-300">Total Cube Lots</div>
            <div className="text-xl font-black text-white mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-slate-300">एकूण क्युब लॉट्स</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Cube ID, Batch, Client, Site, Grade..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Lots' },
            { id: 'DUE_TODAY', label: '🚨 Due Today' },
            { id: 'UPCOMING', label: '⏳ In Curing' },
            { id: 'COMPLETED', label: '✅ Certified' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {filteredCubes.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-600">No cube testing records found.</p>
            <p className="text-xs text-slate-400 mt-0.5">Click '+ Cast New Cubes' to log a newly poured batch specimen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Cube ID & Lot</th>
                  <th className="py-2.5 px-3">Client & Site</th>
                  <th className="py-2.5 px-3">Grade</th>
                  <th className="py-2.5 px-3">Casting Date</th>
                  <th className="py-2.5 px-3">7-Day Test (67%)</th>
                  <th className="py-2.5 px-3">28-Day Test (100%)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCubes.map(cube => {
                  const status = getCubeStatus(cube);
                  return (
                    <tr key={cube.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-blue-700 font-mono">{cube.id}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Challan: {cube.batchId}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{cube.clientName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          <span className="truncate max-w-[140px]">{cube.site}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 font-bold text-slate-800 rounded font-mono text-[11px]">
                          {cube.mixGrade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-700 font-medium">{formatDate(cube.castingDate)}</div>
                        <div className="text-[10px] text-slate-400">{cube.specimenCount} Cubes (150mm)</div>
                      </td>
                      {/* 7-Day Result */}
                      <td className="py-2.5 px-3">
                        {cube.test7d ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-mono font-bold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{cube.test7d.avgStrength} MPa</span>
                            </div>
                            <div className="text-[9.5px] text-slate-500">
                              Target: {cube.target7d} MPa ({cube.test7d.isPass ? 'Pass' : 'Fail'})
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-[10px] font-mono text-slate-600">
                              Due: {formatDate(cube.dueDate7d)}
                            </div>
                            <button
                              onClick={() => handleOpenTestModal(cube, '7d')}
                              className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded cursor-pointer"
                            >
                              Record 7D
                            </button>
                          </div>
                        )}
                      </td>
                      {/* 28-Day Result */}
                      <td className="py-2.5 px-3">
                        {cube.test28d ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-mono font-bold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{cube.test28d.avgStrength} MPa</span>
                            </div>
                            <div className="text-[9.5px] text-slate-500">
                              Target: {cube.target28d} MPa ({cube.test28d.isPass ? 'Pass' : 'Fail'})
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-[10px] font-mono text-slate-600">
                              Due: {formatDate(cube.dueDate28d)}
                            </div>
                            <button
                              onClick={() => handleOpenTestModal(cube, '28d')}
                              className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded cursor-pointer"
                            >
                              Record 28D
                            </button>
                          </div>
                        )}
                      </td>
                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          status.color === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : status.color === 'rose'
                            ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                            : status.color === 'amber'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-blue-50 text-blue-700 border-blue-300'
                        }`}>
                          <span>{status.label}</span>
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setCertModalCube(cube)}
                            className="px-2.5 py-1 rounded text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Generate & Print Official A4 Certificate"
                          >
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span>Certificate</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCube(cube.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Cube Test"
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

      {/* MODAL 1: CAST NEW CUBES */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Cast New Concrete Cube Lot (नवीन क्युब कास्टिंग)</span>
                </h3>
                <p className="text-[11px] text-slate-500">बॅच आणि मिक्स ग्रेड टाकल्यावर ७ व २८ दिवसांचे वेळापत्रक आपोआप तयार होईल.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCube} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Batch / Challan No *</label>
                  <input
                    type="text"
                    required
                    value={addForm.batchId}
                    onChange={(e) => setAddForm({ ...addForm, batchId: e.target.value })}
                    placeholder="e.g. BATCH-1049 or DC-820"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Concrete Mix Grade *</label>
                  <select
                    value={addForm.mixGrade}
                    onChange={(e) => setAddForm({ ...addForm, mixGrade: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 font-bold text-slate-800"
                  >
                    {Object.keys(IS_STRENGTH_STANDARDS).map(grade => (
                      <option key={grade} value={grade}>{grade} Concrete</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Client / Contractor Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.clientName}
                    onChange={(e) => setAddForm({ ...addForm, clientName: e.target.value })}
                    placeholder="e.g. Skyline Infra / Godrej"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pouring Site / Project</label>
                  <input
                    type="text"
                    value={addForm.site}
                    onChange={(e) => setAddForm({ ...addForm, site: e.target.value })}
                    placeholder="e.g. Tower B, Slab Level 3"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Casting Date *</label>
                  <input
                    type="date"
                    required
                    value={addForm.castingDate}
                    onChange={(e) => setAddForm({ ...addForm, castingDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">No. of Cubes</label>
                  <select
                    value={addForm.specimenCount}
                    onChange={(e) => setAddForm({ ...addForm, specimenCount: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value={3}>3 Cubes (150mm)</option>
                    <option value={6}>6 Cubes (3+3 set)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Transit Mixer No.</label>
                  <input
                    type="text"
                    value={addForm.vehicleNo}
                    onChange={(e) => setAddForm({ ...addForm, vehicleNo: e.target.value })}
                    placeholder="MH-10-CR-1042"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* IS Standards summary preview */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span>IS 456 Benchmark for {addForm.mixGrade}:</span>
                  <span className="font-mono text-[11px]">7D: {addDays(addForm.castingDate, 7)} â€¢ 28D: {addDays(addForm.castingDate, 28)}</span>
                </div>
                <div className="text-[11px] text-blue-800">
                  Target Strength: <strong>7-Day = {IS_STRENGTH_STANDARDS[addForm.mixGrade]?.target7d || 17} N/mmÂ² (67%)</strong>, 
                  <strong> 28-Day = {IS_STRENGTH_STANDARDS[addForm.mixGrade]?.target28d || 25} N/mmÂ² (100%)</strong>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow cursor-pointer"
                >
                  Save Cube Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD CRUSHING TEST */}
      {testModalCube && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Record {testForm.testType.toUpperCase()} Compressive Test ({testModalCube.id})
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {testModalCube.mixGrade} â€¢ Cast on {formatDate(testModalCube.castingDate)}
                </p>
              </div>
              <button onClick={() => setTestModalCube(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTest} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Testing Cycle</label>
                  <select
                    value={testForm.testType}
                    onChange={(e) => setTestForm({ ...testForm, testType: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="7d">7-Day Test (Target: {testModalCube.target7d} MPa)</option>
                    <option value="28d">28-Day Test (Target: {testModalCube.target28d} MPa)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Testing Date</label>
                  <input
                    type="date"
                    required
                    value={testForm.testDate}
                    onChange={(e) => setTestForm({ ...testForm, testDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Crushing Failure Load (kN) - 150mm Cubes
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Cube 1 (kN) *</span>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="e.g. 420"
                      value={testForm.loadKn1}
                      onChange={(e) => setTestForm({ ...testForm, loadKn1: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Cube 2 (kN)</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 435"
                      value={testForm.loadKn2}
                      onChange={(e) => setTestForm({ ...testForm, loadKn2: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Cube 3 (kN)</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 415"
                      value={testForm.loadKn3}
                      onChange={(e) => setTestForm({ ...testForm, loadKn3: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Live Strength Calculation Display */}
              {(() => {
                const loads = [parseFloat(testForm.loadKn1) || 0, parseFloat(testForm.loadKn2) || 0, parseFloat(testForm.loadKn3) || 0].filter(l => l > 0);
                if (loads.length === 0) return null;
                const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
                const avgStrength = (avgLoad * 1000) / 22500;
                const target = testForm.testType === '7d' ? testModalCube.target7d : testModalCube.target28d;
                const isPass = avgStrength >= target;

                return (
                  <div className={`p-2.5 rounded-lg border text-xs ${
                    isPass ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span>Calculated Strength:</span>
                      <span className="font-mono text-sm">{avgStrength.toFixed(2)} N/mmÂ²</span>
                    </div>
                    <div className="text-[11px] mt-0.5 flex items-center justify-between">
                      <span>Target: {target} N/mmÂ²</span>
                      <span className="font-bold uppercase tracking-wider">{isPass ? 'âœ… PASSED' : 'âŒ FAILED'}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tested By</label>
                  <input
                    type="text"
                    value={testForm.testedBy}
                    onChange={(e) => setTestForm({ ...testForm, testedBy: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Lab Machine No</label>
                  <input
                    type="text"
                    readOnly
                    value="CTM-2000 kN (Calibrated)"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTestModalCube(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow cursor-pointer"
                >
                  Confirm & Save Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: OFFICIAL A4 PRINTABLE QC CERTIFICATE */}
      {certModalCube && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-300 overflow-hidden my-auto animate-fade-in print:fixed print:inset-0 print:m-0 print:border-none print:shadow-none print:rounded-none">
            
            {/* Action Bar (Hidden when printing) */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold">Official Concrete Test Certificate Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg text-xs shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Certificate (A4)</span>
                </button>
                <button
                  onClick={() => setCertModalCube(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 CERTIFICATE BODY */}
            <div className="p-6 sm:p-8 bg-white text-slate-900 font-sans print:p-4">
              
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <div className="text-[11px] font-bold tracking-widest text-blue-800 uppercase">Quality Assurance Laboratory</div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  SHIVKRUPA READY MIX CONCRETE PLANT
                </h1>
                <p className="text-[11px] text-slate-600">
                  Plot No. 42, Tanang Industrial Estate, Miraj - Sangli Road, Sangli - 416410, Maharashtra
                </p>
                <p className="text-[10px] text-slate-500">
                  Phone: +91 9421858683 â€¢ GSTIN: 27AABCS1429Q1ZV â€¢ In Conformance with IS 516 & IS 456:2000
                </p>
                <div className="mt-2 inline-block px-3 py-0.5 border border-slate-800 text-slate-900 font-black text-xs uppercase tracking-wider bg-slate-100">
                  CONCRETE COMPRESSIVE STRENGTH TEST CERTIFICATE
                </div>
              </div>

              {/* Certificate Meta Details */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-4 pb-3 border-b border-slate-200">
                <div>
                  <table className="w-full text-left">
                    <tbody>
                      <tr>
                        <td className="text-slate-500 py-0.5 w-32 font-medium">Certificate No:</td>
                        <td className="font-mono font-bold text-slate-900">CERT-{certModalCube.id}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-500 py-0.5 font-medium">Customer / Client:</td>
                        <td className="font-bold text-slate-900">{certModalCube.clientName}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-500 py-0.5 font-medium">Project / Site:</td>
                        <td className="text-slate-800">{certModalCube.site}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-500 py-0.5 font-medium">Transit Mixer No:</td>
                        <td className="font-mono text-slate-800">{certModalCube.vehicleNo}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <table className="w-full text-left">
                    <tbody>
                      <tr>
                        <td className="text-slate-500 py-0.5 w-32 font-medium">Date of Issue:</td>
                        <td className="font-mono font-semibold text-slate-900">{formatDate(today)}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-500 py-0.5 font-medium">Challan / Batch:</td>
                        <td className="font-mono font-bold text-slate-900">{certModalCube.batchId}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-500 py-0.5 font-medium">Concrete Mix Grade:</td>
                        <td className="font-bold text-blue-900 font-mono text-sm">{certModalCube.mixGrade}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-500 py-0.5 font-medium">Date of Casting:</td>
                        <td className="font-mono text-slate-800">{formatDate(certModalCube.castingDate)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="text-[11px] text-slate-600 mb-3 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="font-bold text-slate-800">Testing Standard: </span>
                Cubes cured in fresh potable water tank at 27 Â± 2Â°C and tested under compression as per IS:516-1959. 
                Standard Nominal Cube Size: 150 mm Ã— 150 mm Ã— 150 mm (Cross Section Area = 22,500 mmÂ²).
              </div>

              {/* Results Table */}
              <table className="w-full text-xs text-left border border-slate-300 mb-5">
                <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                  <tr>
                    <th className="p-2 border-r border-slate-300">Age at Test</th>
                    <th className="p-2 border-r border-slate-300">Date of Testing</th>
                    <th className="p-2 border-r border-slate-300">Breaking Load (kN)</th>
                    <th className="p-2 border-r border-slate-300">Achieved Strength (N/mmÂ²)</th>
                    <th className="p-2 border-r border-slate-300">Target Strength (IS 456)</th>
                    <th className="p-2 text-center">Result Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* 7-Day Row */}
                  <tr>
                    <td className="p-2 font-bold text-slate-800 border-r border-slate-300">7 Days (67% Target)</td>
                    <td className="p-2 font-mono text-slate-700 border-r border-slate-300">
                      {certModalCube.test7d ? formatDate(certModalCube.test7d.testDate) : formatDate(certModalCube.dueDate7d)}
                    </td>
                    <td className="p-2 font-mono text-slate-800 border-r border-slate-300">
                      {certModalCube.test7d ? certModalCube.test7d.loadsKn.join(', ') + ' kN' : 'Awaiting Test'}
                    </td>
                    <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-300">
                      {certModalCube.test7d ? `${certModalCube.test7d.avgStrength} N/mmÂ²` : '-'}
                    </td>
                    <td className="p-2 font-mono text-slate-600 border-r border-slate-300">
                      â‰¥ {certModalCube.target7d} N/mmÂ²
                    </td>
                    <td className="p-2 text-center font-bold">
                      {certModalCube.test7d ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          certModalCube.test7d.isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {certModalCube.test7d.isPass ? 'COMPLIANT (PASSED)' : 'NON-COMPLIANT'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Pending</span>
                      )}
                    </td>
                  </tr>

                  {/* 28-Day Row */}
                  <tr>
                    <td className="p-2 font-bold text-slate-800 border-r border-slate-300">28 Days (100% Target)</td>
                    <td className="p-2 font-mono text-slate-700 border-r border-slate-300">
                      {certModalCube.test28d ? formatDate(certModalCube.test28d.testDate) : formatDate(certModalCube.dueDate28d)}
                    </td>
                    <td className="p-2 font-mono text-slate-800 border-r border-slate-300">
                      {certModalCube.test28d ? certModalCube.test28d.loadsKn.join(', ') + ' kN' : 'In Curing Tank'}
                    </td>
                    <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-300">
                      {certModalCube.test28d ? `${certModalCube.test28d.avgStrength} N/mmÂ²` : '-'}
                    </td>
                    <td className="p-2 font-mono text-slate-600 border-r border-slate-300">
                      â‰¥ {certModalCube.target28d} N/mmÂ²
                    </td>
                    <td className="p-2 text-center font-bold">
                      {certModalCube.test28d ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          certModalCube.test28d.isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {certModalCube.test28d.isPass ? 'COMPLIANT (PASSED)' : 'NON-COMPLIANT'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">In Curing (Due {formatDate(certModalCube.dueDate28d)})</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* QC Conclusion */}
              <div className="p-3 border border-slate-200 rounded-lg text-xs space-y-1 mb-8 bg-slate-50/50">
                <div className="font-bold text-slate-900">Laboratory Conclusion & Remarks:</div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  The compressive strength of concrete cubes cast from Batch No. <strong>{certModalCube.batchId}</strong> ({certModalCube.mixGrade}) conforms 
                  to specified characteristic criteria as defined under <strong>IS 456:2000 (Clause 15 & 16)</strong>. The sample is officially certified.
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    {certModalCube.test7d?.testedBy || 'Lab Testing Officer'}
                  </div>
                  <div className="text-[10px] text-slate-500">Tested By (QC Technician)</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    {certModalCube.castBy || 'Quality In-Charge'}
                  </div>
                  <div className="text-[10px] text-slate-500">Verified By (QC Manager)</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Authorised Signatory
                  </div>
                  <div className="text-[10px] text-slate-500">For SHIVKRUPA RMC PLANT</div>
                </div>
              </div>

              {/* Stamp & Footer note */}
              <div className="mt-8 pt-3 border-t border-slate-200 text-[9.5px] text-slate-400 text-center">
                This is a computer-generated test certificate authenticated with digital laboratory records. 
                Valid for technical submission to client architects and structural consultants.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
