import React, { useState } from 'react';
import { 
  IndianRupee, 
  Plus, 
  CheckCircle2, 
  Clock,
  History,
  TrendingDown,
  UserCheck,
  Edit3,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function AdvanceManagementView({ employeeFilter = null }) {
  const { user } = useAuth();
  const { advances, employees, recordAdvance, reviewAdvance, updateAdvance, deleteAdvance } = useWorkforce();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    employeeId: employees[0]?.id || '',
    advanceAmount: 10000,
    date: todayStr,
    reason: '',
    monthlyDeduction: '',
  });

  const [approvedAmount, setApprovedAmount] = useState(10000);

  // Authorized roles: Admin, Accountant, Plant Manager, Owner/Director
  const isAuthorized = 
    user?.role === 'Admin' || 
    user?.role === 'Accountant' || 
    user?.role === 'Plant Manager' || 
    user?.role === 'Owner / Director' ||
    user?.email === 'smconcretech@gmail.com';

  const filteredAdvances = advances.filter((a) => {
    if (employeeFilter) return a.employeeId === employeeFilter;
    return true;
  });

  const handleOpenAdd = () => {
    setForm({
      employeeId: employeeFilter || employees[0]?.id || '',
      advanceAmount: 10000,
      date: new Date().toISOString().split('T')[0],
      reason: '',
      monthlyDeduction: '',
    });
    setShowAddModal(true);
  };

  const handleSaveAdvance = (e) => {
    e.preventDefault();
    if (!form.employeeId) {
      alert('Please select an employee.');
      return;
    }
    const amount = Number(form.advanceAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid positive advance amount.');
      return;
    }
    if (!form.reason.trim()) {
      alert('Please provide a reason/description for the advance.');
      return;
    }

    try {
      const selectedEmp = employees.find((emp) => emp.id === form.employeeId);
      recordAdvance({
        employeeId: form.employeeId,
        employeeName: selectedEmp?.name,
        role: selectedEmp?.role,
        plant: selectedEmp?.plant,
        advanceAmount: amount,
        date: form.date || todayStr,
        reason: form.reason.trim(),
        monthlyDeduction: Number(form.monthlyDeduction) > 0 ? Number(form.monthlyDeduction) : amount,
        status: isAuthorized ? 'Approved' : 'Pending',
      });

      setShowAddModal(false);
      setToastMessage(`Salary advance of ₹ ${amount.toLocaleString('en-IN')} recorded for ${selectedEmp?.name || form.employeeId}.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenReview = (adv) => {
    setSelectedAdvance(adv);
    setApprovedAmount(adv.advanceAmount);
    setShowReviewModal(true);
  };

  const handleExecuteReview = (status) => {
    if (!selectedAdvance) return;
    reviewAdvance(selectedAdvance.id, status, Number(approvedAmount), user);
    setShowReviewModal(false);
    setToastMessage(`Salary advance ${status.toLowerCase()}! Eligible for payroll deduction.`);
  };

  const handleOpenHistory = (adv) => {
    const empId = adv.employeeId;
    const emp = employees.find((e) => e.id === empId) || { name: adv.employeeName, id: empId, role: adv.role };
    const empAdvances = advances.filter((a) => a.employeeId === empId);
    setHistoryEmployee({
      ...emp,
      advances: empAdvances,
    });
    setShowHistoryModal(true);
  };

  // Metrics calculation
  const totalDisbursed = advances
    .filter((a) => a.status === 'Approved' || a.status === 'Partially Recovered' || a.status === 'Fully Recovered')
    .reduce((sum, a) => sum + (Number(a.approvedAmount || a.advanceAmount) || 0), 0);

  const totalRecovered = advances.reduce((sum, a) => sum + (Number(a.recoveredAmount) || 0), 0);
  const totalOutstanding = advances.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const activeCount = advances.filter((a) => Number(a.balance) > 0).length;

  const columns = [
    {
      header: 'Ref ID',
      accessor: 'id',
      width: '11%',
      render: (row) => {
        const displayId = row.id?.startsWith('ADV-') && row.id.length > 10 
          ? `ADV-${row.id.replace('ADV-', '').slice(-6)}` 
          : row.id;
        return (
          <span 
            className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/90 font-mono font-bold text-[11px] inline-block whitespace-nowrap shadow-2xs cursor-default" 
            title={`Full Reference: ${row.id}`}
          >
            {displayId}
          </span>
        );
      },
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
      width: '21%',
      render: (row) => {
        const initials = row.employeeName 
          ? row.employeeName.trim().split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) 
          : 'EM';
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#123B6D] to-[#1D5FA7] text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-slate-900 text-xs block leading-tight truncate capitalize" title={row.employeeName}>
                {row.employeeName}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">
                {row.employeeId || 'EMP'} • {row.role || 'Staff'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Date',
      accessor: 'date',
      width: '10%',
      render: (row) => (
        <span className="font-mono text-xs text-slate-700 whitespace-nowrap">
          {row.date || row.requestDate || '—'}
        </span>
      ),
    },
    {
      header: 'Advance',
      accessor: 'totalAdvance',
      align: 'right',
      width: '13%',
      render: (row) => (
        <div className="text-right whitespace-nowrap">
          <span className="font-mono font-bold text-slate-900 text-xs block">
            ₹ {(Number(row.approvedAmount || row.advanceAmount) || 0).toLocaleString('en-IN')}
          </span>
          {row.status === 'Pending' && (
            <span className="text-[10px] text-amber-600 block">Pending approval</span>
          )}
        </div>
      ),
    },
    {
      header: 'Deducted',
      accessor: 'recoveredAmount',
      align: 'right',
      width: '12%',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
          ₹ {(Number(row.recoveredAmount) || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Balance',
      accessor: 'balance',
      align: 'right',
      width: '12%',
      render: (row) => {
        const bal = Number(row.balance) || 0;
        return (
          <span className={`font-mono text-xs font-bold whitespace-nowrap ${bal > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
            ₹ {bal.toLocaleString('en-IN')}
          </span>
        );
      },
    },
    { 
      header: 'Status', 
      accessor: 'status', 
      type: 'status',
      align: 'center',
      width: '10%',
      render: (row) => <StatusBadge status={row.status} size="xs" />
    },
    {
      header: 'Actions',
      accessor: 'action',
      align: 'right',
      width: '11%',
      render: (row) => (
        <div className="flex items-center justify-end gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenHistory(row)}
            className="p-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100 text-[#1D5FA7] border border-blue-200/80 transition-colors cursor-pointer shadow-2xs"
            title="View History & Repayment Ledger"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          
          {isAuthorized && row.status === 'Pending' && (
            <button
              type="button"
              onClick={() => handleOpenReview(row)}
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              title="Review & Approve Advance"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}

          {isAuthorized && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingAdvance({ ...row });
                  setShowEditModal(true);
                }}
                className="p-1.5 rounded-lg bg-amber-50/80 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-colors cursor-pointer shadow-2xs"
                title="Edit Advance"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Permanently delete advance record ${row.id} for ${row.employeeName}?`)) {
                    try {
                      await deleteAdvance(row.id);
                      setToastMessage(`Advance record ${row.id} deleted.`);
                    } catch (err) {
                      console.error('Failed to delete advance record:', err);
                      setToastMessage(`Failed to delete advance record: ${err.message}`);
                    }
                  }
                }}
                className="p-1.5 rounded-lg bg-rose-50/80 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-colors cursor-pointer shadow-2xs"
                title="Delete Advance"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-blue-50/35 via-white to-white border-2 border-blue-400 hover:border-blue-500 shadow-xs hover:shadow-blue-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#136dec] transition-all group-hover:h-[4px]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Disbursed</span>
            <div className="w-6 h-6 rounded-lg bg-blue-100/90 border border-blue-300 flex items-center justify-center text-[#136dec] shadow-2xs">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-slate-900 font-mono tracking-tight block">
              ₹ {totalDisbursed.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Approved advances</span>
        </div>

        <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-blue-50/35 via-white to-white border-2 border-blue-400 hover:border-blue-500 shadow-xs hover:shadow-blue-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#136dec] transition-all group-hover:h-[4px]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Amount Deducted</span>
            <div className="w-6 h-6 rounded-lg bg-blue-100/90 border border-blue-300 flex items-center justify-center text-[#136dec] shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-slate-900 font-mono tracking-tight block">
              ₹ {totalRecovered.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Payroll recoveries</span>
        </div>

        <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-blue-50/35 via-white to-white border-2 border-blue-400 hover:border-blue-500 shadow-xs hover:shadow-blue-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#136dec] transition-all group-hover:h-[4px]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Remaining Balance</span>
            <div className="w-6 h-6 rounded-lg bg-blue-100/90 border border-blue-300 flex items-center justify-center text-[#136dec] shadow-2xs">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-slate-900 font-mono tracking-tight block">
              ₹ {totalOutstanding.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">{activeCount} active balance(s)</span>
        </div>

        <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-blue-50/35 via-white to-white border-2 border-blue-400 hover:border-blue-500 shadow-xs hover:shadow-blue-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#136dec] transition-all group-hover:h-[4px]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Active Ledgers</span>
            <div className="w-6 h-6 rounded-lg bg-blue-100/90 border border-blue-300 flex items-center justify-center text-[#136dec] shadow-2xs">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-slate-900 font-mono tracking-tight block">
              {activeCount} Employees
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Ongoing recovery cycles</span>
        </div>
      </div>

      {/* Action Header */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Employee Salary Advance Management</span>
            </h2>
            <p className="text-xs text-slate-500">
              Record salary advances, track recoveries, and review deduction history.
            </p>
          </div>
        </div>

        {isAuthorized && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Advance</span>
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        title="Employee Salary Advance Ledger"
        subtitle="Tracking advance records, amount deducted via payroll, and remaining balances"
        icon={IndianRupee}
        columns={columns}
        data={filteredAdvances}
        emptyMessage="No salary advances recorded yet. Click 'Add Advance' to record a new salary advance."
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">{row.employeeName}</div>
                <div className="text-xs font-mono text-amber-700 font-bold">{row.id} • {row.date || row.requestDate}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1.5 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Advance:</span>
                <span className="text-slate-900 font-bold">₹ {(Number(row.approvedAmount || row.advanceAmount) || 0).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Deducted:</span>
                <span className="text-blue-700 font-semibold">₹ {(Number(row.recoveredAmount) || 0).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Remaining:</span>
                <span className="text-amber-800 font-bold">₹ {(Number(row.balance) || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleOpenHistory(row)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span>View History</span>
              </button>
              {isAuthorized && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAdvance({ ...row });
                      setShowEditModal(true);
                    }}
                    className="p-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 text-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Delete advance record ${row.id} for ${row.employeeName}?`)) {
                        await deleteAdvance(row.id);
                        setToastMessage(`Advance record ${row.id} deleted.`);
                      }
                    }}
                    className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      />

      {/* Modal: Add Advance */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Employee Advance"
        subtitle="Issue a salary advance to an employee for scheduled payroll deduction."
        icon={Plus}
      >
        <form onSubmit={handleSaveAdvance} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-700 font-semibold block mb-1">Employee Name *</label>
            <select
              required
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="">-- Select Employee --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.id}) - {e.role}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Advance Amount (₹) *</label>
              <input
                type="number"
                required
                min={500}
                max={500000}
                value={form.advanceAmount}
                onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Description / Reason *</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Festival advance, emergency family medical expenses..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1">
            <span className="font-bold block text-[11px]">Automatic Payroll Integration</span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              This advance will be scheduled for recovery in the monthly payroll cycle. Outstanding balance will be deducted before net pay calculation.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              Record Advance
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Employee Advance History */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Employee Advance & Deduction History"
        subtitle={`Historical advances and payroll deduction records for ${historyEmployee?.name || 'Staff'}`}
        icon={History}
        maxWidth="max-w-2xl"
      >
        {historyEmployee && (
          <div className="space-y-4 text-xs">
            {/* Employee Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{historyEmployee.name}</h4>
                <span className="text-slate-500 font-mono text-[11px]">
                  {historyEmployee.id} • {historyEmployee.role || 'Staff'} • {historyEmployee.department || 'Operations'}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[9px] text-slate-400 uppercase block">Total Disbursed</span>
                  <span className="text-xs font-bold text-slate-900">
                    ₹ {(historyEmployee.advances || []).reduce((sum, a) => sum + (Number(a.approvedAmount || a.advanceAmount) || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[9px] text-slate-400 uppercase block">Total Deducted</span>
                  <span className="text-xs font-bold text-blue-700">
                    ₹ {(historyEmployee.advances || []).reduce((sum, a) => sum + (Number(a.recoveredAmount) || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-[9px] text-slate-400 uppercase block">Remaining Balance</span>
                  <span className="text-xs font-bold text-amber-700">
                    ₹ {(historyEmployee.advances || []).reduce((sum, a) => sum + (Number(a.balance) || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* List of Advances */}
            <div className="space-y-3">
              <h5 className="font-bold text-slate-800 text-xs">Recorded Advances:</h5>
              {(historyEmployee.advances || []).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 text-slate-500 text-center">
                  No advances on record for this employee.
                </div>
              ) : (
                historyEmployee.advances.map((adv) => (
                  <div key={adv.id} className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className="font-mono font-bold text-amber-700 text-xs">{adv.id}</span>
                        <span className="text-slate-400 text-[11px] ml-2 font-mono">Date: {adv.date || adv.requestDate}</span>
                      </div>
                      <StatusBadge status={adv.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Advance Amount:</span>
                        <span className="font-bold text-slate-900">₹ {(Number(adv.approvedAmount || adv.advanceAmount) || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Amount Deducted:</span>
                        <span className="font-semibold text-blue-700">₹ {(Number(adv.recoveredAmount) || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Remaining Balance:</span>
                        <span className="font-bold text-amber-800">₹ {(Number(adv.balance) || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {adv.reason && (
                      <div className="pt-1 text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-700">Reason: </span>{adv.reason}
                      </div>
                    )}

                    {/* Repayment History Ledger for this advance */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Monthly Payroll Deduction History:
                      </span>
                      {Array.isArray(adv.repaymentHistory) && adv.repaymentHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] font-mono">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-100 text-left">
                                <th className="pb-1 font-semibold">Date</th>
                                <th className="pb-1 font-semibold">Cycle / Ref</th>
                                <th className="pb-1 font-semibold">Deduction Amount</th>
                                <th className="pb-1 font-semibold">Balance After</th>
                                <th className="pb-1 font-semibold text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {adv.repaymentHistory.map((rep, idx) => (
                                <tr key={idx} className="text-slate-700">
                                  <td className="py-1 text-slate-500">{rep.date}</td>
                                  <td className="py-1 font-semibold text-slate-800">{rep.monthYear || rep.payrollId}</td>
                                  <td className="py-1 font-bold text-rose-600">- ₹ {Number(rep.amount).toLocaleString('en-IN')}</td>
                                  <td className="py-1 text-slate-900 font-bold">₹ {Number(rep.balanceAfter).toLocaleString('en-IN')}</td>
                                  <td className="py-1 text-right text-emerald-700 font-semibold">Deducted ✓</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block">
                          No deductions recorded yet. Deductions will appear here once monthly payroll is finalized.
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Edit Advance */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Salary Advance Record"
        subtitle="Modify advance amounts, deductions, date, or description."
        icon={Edit3}
      >
        {editingAdvance && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const advAmt = Number(editingAdvance.advanceAmount);
              const appAmt = editingAdvance.approvedAmount !== undefined && editingAdvance.approvedAmount !== '' 
                ? Number(editingAdvance.approvedAmount) 
                : advAmt;
              const recAmt = Number(editingAdvance.recoveredAmount || 0);
              const newBal = Math.max(0, appAmt - recAmt);

              updateAdvance(editingAdvance.id, {
                advanceAmount: advAmt,
                approvedAmount: appAmt,
                recoveredAmount: recAmt,
                balance: newBal,
                date: editingAdvance.date || editingAdvance.requestDate,
                reason: editingAdvance.reason,
                status: editingAdvance.status,
              });
              setShowEditModal(false);
              setToastMessage('Salary advance record updated.');
            }}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Employee</label>
              <input
                type="text"
                disabled
                value={`${editingAdvance.employeeName || ''} (${editingAdvance.employeeId || ''})`}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Advance Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingAdvance.advanceAmount}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, advanceAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Date</label>
                <input
                  type="date"
                  value={editingAdvance.date || editingAdvance.requestDate || ''}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, date: e.target.value, requestDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Amount Deducted So Far (₹)</label>
                <input
                  type="number"
                  value={editingAdvance.recoveredAmount ?? 0}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, recoveredAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Status</label>
                <select
                  value={editingAdvance.status}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Partially Recovered">Partially Recovered</option>
                  <option value="Fully Recovered">Fully Recovered</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">Reason / Description</label>
              <textarea
                rows={2}
                value={editingAdvance.reason || ''}
                onChange={(e) => setEditingAdvance({ ...editingAdvance, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Approve Salary Advance"
        subtitle="Sanction advance amount and authorize payroll deduction."
        icon={UserCheck}
      >
        {selectedAdvance && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-1">
              <div className="text-slate-900 font-bold text-sm">{selectedAdvance.employeeName} ({selectedAdvance.employeeId})</div>
              <div className="text-slate-600 font-mono">Requested: ₹ {(Number(selectedAdvance.advanceAmount) || 0).toLocaleString('en-IN')}</div>
              <p className="text-slate-700 pt-1 text-xs">Reason: {selectedAdvance.reason}</p>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Approved Sanction Amount (₹)</label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleExecuteReview('Rejected')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleExecuteReview('Approved')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
              >
                Approve Advance
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
