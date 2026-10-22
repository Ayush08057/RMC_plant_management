import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  CheckCircle2, 
  Calendar, 
  IndianRupee, 
  Percent,
  History,
  TrendingDown,
  Edit3,
  Trash2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function LoanManagementView({ employeeFilter = null }) {
  const { user } = useAuth();
  const { loans, employees, recordLoan, reviewLoan, updateLoan, deleteLoan } = useWorkforce();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    employeeId: employees[0]?.id || '',
    loanAmount: 60000,
    monthlyEmi: 5000,
    startDate: todayStr,
    reason: '',
  });

  const isAuthorized = 
    user?.role === 'Admin' || 
    user?.role === 'Owner / Director' || 
    user?.role === 'Accountant' || 
    user?.role === 'Plant Manager' ||
    user?.email === 'smconcretech@gmail.com';

  const filteredLoans = loans.filter((l) => {
    if (employeeFilter) return l.employeeId === employeeFilter;
    return true;
  });

  // Calculate tenure (months) based on loan amount & EMI
  const loanAmtNum = Number(form.loanAmount) || 0;
  const emiAmtNum = Number(form.monthlyEmi) || 0;
  const calculatedTenure = emiAmtNum > 0 ? Math.max(1, Math.ceil(loanAmtNum / emiAmtNum)) : 12;

  const handleOpenAdd = () => {
    setForm({
      employeeId: employeeFilter || employees[0]?.id || '',
      loanAmount: 60000,
      monthlyEmi: 5000,
      startDate: new Date().toISOString().split('T')[0],
      reason: '',
    });
    setShowAddModal(true);
  };

  const handleSaveLoan = (e) => {
    e.preventDefault();
    if (!form.employeeId) {
      alert('Please select an employee.');
      return;
    }
    const loanAmt = Number(form.loanAmount);
    if (!loanAmt || loanAmt <= 0) {
      alert('Please enter a valid loan amount (greater than 0).');
      return;
    }
    let emi = Number(form.monthlyEmi);
    if (!emi || emi <= 0) {
      alert('Please enter a valid monthly EMI amount.');
      return;
    }
    if (emi > loanAmt) {
      emi = loanAmt;
    }
    if (!form.reason.trim()) {
      alert('Please provide a reason/description for the loan.');
      return;
    }

    try {
      const selectedEmp = employees.find((e) => e.id === form.employeeId);
      const tenure = Math.ceil(loanAmt / emi);

      recordLoan({
        employeeId: form.employeeId,
        employeeName: selectedEmp?.name,
        role: selectedEmp?.role,
        plant: selectedEmp?.plant,
        loanAmount: loanAmt,
        emiAmount: emi,
        totalEmis: tenure,
        startDate: form.startDate || todayStr,
        reason: form.reason.trim(),
        status: isAuthorized ? 'Active' : 'Pending',
      });

      setShowAddModal(false);
      setToastMessage(`Company loan of ₹ ${loanAmt.toLocaleString('en-IN')} assigned to ${selectedEmp?.name || form.employeeId}.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApprove = (loanId) => {
    reviewLoan(loanId, 'Approved', user);
    setToastMessage('Loan approved and activated. Monthly EMI scheduled in payroll ledger.');
  };

  const handleOpenHistory = (loan) => {
    setSelectedLoan(loan);
    setShowHistoryModal(true);
  };

  // Metrics
  const activeLoans = loans.filter((l) => l.status === 'Active' || l.status === 'Approved');
  const totalPrincipal = loans.reduce((sum, l) => sum + (Number(l.loanAmount) || 0), 0);
  const totalRepaid = loans.reduce((sum, l) => sum + (Number(l.amountRepaid) || (Number(l.paidEmis) || 0) * (Number(l.emiAmount) || 0)), 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + (Number(l.outstandingBalance) || 0), 0);
  const monthlyEmiRunRate = activeLoans.reduce((sum, l) => sum + (Number(l.emiAmount) || 0), 0);

  const columns = [
    {
      header: 'Loan ID',
      accessor: 'id',
      width: '10%',
      render: (row) => {
        const displayId = row.id?.startsWith('LOAN-') && row.id.length > 11 
          ? `LOAN-${row.id.replace('LOAN-', '').slice(-6)}` 
          : row.id;
        return (
          <span 
            className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/90 font-mono font-bold text-[11px] inline-block whitespace-nowrap shadow-2xs cursor-default" 
            title={`Full Loan Ref: ${row.id}`}
          >
            {displayId}
          </span>
        );
      },
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
      width: '18%',
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
      accessor: 'startDate',
      width: '9%',
      render: (row) => (
        <span className="font-mono text-xs text-slate-700 whitespace-nowrap">
          {row.startDate || row.loanDate || '—'}
        </span>
      ),
    },
    {
      header: 'Total Loan',
      accessor: 'loanAmount',
      align: 'right',
      width: '11%',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
          ₹ {(Number(row.loanAmount) || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'EMI',
      accessor: 'emiAmount',
      align: 'right',
      width: '10%',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-700 text-xs whitespace-nowrap">
          ₹ {(Number(row.emiAmount) || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Repaid',
      accessor: 'amountRepaid',
      align: 'right',
      width: '11%',
      render: (row) => {
        const repaid = Number(row.amountRepaid) || ((Number(row.paidEmis) || 0) * (Number(row.emiAmount) || 0));
        return (
          <span className="font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
            ₹ {repaid.toLocaleString('en-IN')}
          </span>
        );
      },
    },
    {
      header: 'Balance',
      accessor: 'outstandingBalance',
      align: 'right',
      width: '11%',
      render: (row) => {
        const bal = Number(row.outstandingBalance) || 0;
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
      width: '9%',
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
            title="View Monthly Repayment History"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          
          {isAuthorized && row.status === 'Pending' && (
            <button
              type="button"
              onClick={() => handleApprove(row.id)}
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              title="Sanction & Approve Loan"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}

          {isAuthorized && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingLoan({ ...row });
                  setShowEditModal(true);
                }}
                className="p-1.5 rounded-lg bg-amber-50/80 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-colors cursor-pointer shadow-2xs"
                title="Edit Loan"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Permanently delete loan record ${row.id} for ${row.employeeName}?`)) {
                    try {
                      await deleteLoan(row.id);
                      setToastMessage(`Loan record ${row.id} deleted.`);
                    } catch (err) {
                      console.error('Failed to delete loan record:', err);
                      setToastMessage(`Failed to delete loan record: ${err.message}`);
                    }
                  }
                }}
                className="p-1.5 rounded-lg bg-rose-50/80 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-colors cursor-pointer shadow-2xs"
                title="Delete Loan"
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
        <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-indigo-50/35 via-white to-white border-2 border-indigo-400 hover:border-indigo-500 shadow-xs hover:shadow-indigo-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500 transition-all group-hover:h-[4px]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Loan Book</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-100/90 border border-indigo-300 flex items-center justify-center text-indigo-700 shadow-2xs">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-slate-900 font-mono tracking-tight block">
              ₹ {totalPrincipal.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">{loans.length} total loans</span>
        </div>

        <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-emerald-50/35 via-white to-white border-2 border-emerald-400 hover:border-emerald-500 shadow-xs hover:shadow-emerald-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500 transition-all group-hover:h-[4px]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Repaid</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100/90 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-emerald-700 font-mono tracking-tight block">
              ₹ {totalRepaid.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">EMI deductions collected</span>
        </div>

        <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-amber-50/35 via-white to-white border-2 border-amber-400 hover:border-amber-500 shadow-xs hover:shadow-amber-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500 transition-all group-hover:h-[4px]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Remaining Balance</span>
            <div className="w-6 h-6 rounded-lg bg-amber-100/90 border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-amber-800 font-mono tracking-tight block">
              ₹ {totalOutstanding.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Outstanding loan balance</span>
        </div>

        <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-purple-50/35 via-white to-white border-2 border-purple-400 hover:border-purple-500 shadow-xs hover:shadow-purple-500/15 transition-all duration-200 flex flex-col justify-between relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-purple-500 transition-all group-hover:h-[4px]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Monthly Run Rate</span>
            <div className="w-6 h-6 rounded-lg bg-purple-100/90 border border-purple-300 flex items-center justify-center text-purple-700 shadow-2xs">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-purple-800 font-mono tracking-tight block">
              ₹ {monthlyEmiRunRate.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Expected monthly EMI</span>
        </div>
      </div>

      {/* Action Header */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Employee Loan & Monthly EMI Management</span>
            </h2>
            <p className="text-xs text-slate-500">
              Assign company loans with automatic monthly EMI deductions in payroll.
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
            <span>Add Loan</span>
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        title="Employee Loan Ledger & Repayment Status"
        subtitle="Sanctioned loans, configured monthly EMIs, total repaid, and remaining balance"
        icon={CreditCard}
        columns={columns}
        data={filteredLoans}
        emptyMessage="No employee loans registered yet. Click 'Add Loan' to assign a company loan."
        renderMobileCard={(row) => {
          const repaid = Number(row.amountRepaid) || ((Number(row.paidEmis) || 0) * (Number(row.emiAmount) || 0));
          return (
            <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">{row.employeeName}</div>
                  <div className="text-xs font-mono text-amber-700 font-bold">{row.id} • {row.startDate || row.loanDate}</div>
                </div>
                <StatusBadge status={row.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1.5 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Loan:</span>
                  <span className="text-slate-900 font-bold">₹ {(Number(row.loanAmount) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly EMI:</span>
                  <span className="text-emerald-700 font-bold">₹ {(Number(row.emiAmount) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Amount Repaid:</span>
                  <span className="text-blue-700 font-semibold">₹ {repaid.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Remaining Balance:</span>
                  <span className="text-amber-800 font-bold">₹ {(Number(row.outstandingBalance) || 0).toLocaleString('en-IN')}</span>
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
                        setEditingLoan({ ...row });
                        setShowEditModal(true);
                      }}
                      className="p-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 text-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Delete loan record ${row.id} for ${row.employeeName}?`)) {
                          await deleteLoan(row.id);
                          setToastMessage(`Loan record ${row.id} deleted.`);
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
          );
        }}
      />

      {/* Modal: Add Loan */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Employee Loan"
        subtitle="Assign a structured company loan with automatic monthly EMI deductions."
        icon={Plus}
      >
        <form onSubmit={handleSaveLoan} className="space-y-4 text-xs">
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
              <label className="text-slate-700 font-semibold block mb-1">Total Loan Amount (₹) *</label>
              <input
                type="number"
                required
                min={1000}
                max={2000000}
                value={form.loanAmount}
                onChange={(e) => setForm({ ...form, loanAmount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Monthly EMI (₹) *</label>
              <input
                type="number"
                required
                min={100}
                max={form.loanAmount || 2000000}
                value={form.monthlyEmi}
                onChange={(e) => setForm({ ...form, monthlyEmi: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="e.g. 5000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Loan Start Date *</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Calculated Tenure</label>
              <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold flex items-center justify-between">
                <span>{calculatedTenure} Months</span>
                <span className="text-[10px] text-slate-500 font-normal">({calculatedTenure} EMIs)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Description / Reason *</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Housing renovation, family medical assistance, personal vehicle purchase..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 space-y-1">
            <span className="font-bold block text-[11px]">Automatic EMI Payroll Deduction</span>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              The monthly EMI of ₹ {emiAmtNum.toLocaleString('en-IN')} will be automatically deducted each payroll cycle until the loan balance reaches ₹0. Repayments are strictly capped to never exceed the remaining balance.
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
              Record Loan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Monthly Repayment History */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Monthly Loan Repayment History"
        subtitle={`Tracking installments and amortization for ${selectedLoan?.employeeName || 'Staff'} (${selectedLoan?.id})`}
        icon={History}
        maxWidth="max-w-2xl"
      >
        {selectedLoan && (
          <div className="space-y-4 text-xs">
            {/* Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedLoan.employeeName}</h4>
                  <span className="text-slate-500 font-mono text-[11px]">{selectedLoan.employeeId} • {selectedLoan.role || 'Staff'}</span>
                </div>
                <StatusBadge status={selectedLoan.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 uppercase block">Total Loan</span>
                  <span className="font-bold text-slate-900 text-sm">₹ {(Number(selectedLoan.loanAmount) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 uppercase block">Monthly EMI</span>
                  <span className="font-bold text-emerald-700 text-sm">₹ {(Number(selectedLoan.emiAmount) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 uppercase block">Amount Repaid</span>
                  <span className="font-bold text-blue-700 text-sm">
                    ₹ {(Number(selectedLoan.amountRepaid) || ((Number(selectedLoan.paidEmis) || 0) * (Number(selectedLoan.emiAmount) || 0))).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 uppercase block">Remaining Balance</span>
                  <span className="font-bold text-amber-800 text-sm">₹ {(Number(selectedLoan.outstandingBalance) || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                <span>Start Date: <strong className="text-slate-800 font-mono">{selectedLoan.startDate || selectedLoan.loanDate || 'N/A'}</strong></span>
                <span>Tenure: <strong className="text-slate-800 font-mono">{selectedLoan.paidEmis || 0} of {selectedLoan.totalEmis || 1} EMIs Paid</strong></span>
              </div>
            </div>

            {/* Repayment History Table */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 text-xs">Monthly Repayment Ledger:</h5>
              {Array.isArray(selectedLoan.repaymentHistory) && selectedLoan.repaymentHistory.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-[11px] font-mono">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold">#</th>
                        <th className="py-2 px-3 text-left font-semibold">Date</th>
                        <th className="py-2 px-3 text-left font-semibold">Payroll Cycle / Ref</th>
                        <th className="py-2 px-3 text-left font-semibold">EMI Amount Repaid</th>
                        <th className="py-2 px-3 text-left font-semibold">Remaining Loan Balance</th>
                        <th className="py-2 px-3 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedLoan.repaymentHistory.map((rep, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-slate-400">EMI #{rep.emiNumber || (idx + 1)}</td>
                          <td className="py-2 px-3 text-slate-600">{rep.date}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{rep.monthYear || rep.payrollId}</td>
                          <td className="py-2 px-3 font-bold text-emerald-700">₹ {Number(rep.amount).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 font-bold text-amber-800">₹ {Number(rep.balanceAfter).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-semibold">Repaid ✓</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-center space-y-1">
                  <Clock className="w-5 h-5 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700">No repayments recorded yet.</p>
                  <p className="text-[11px]">Monthly EMI of ₹ {(Number(selectedLoan.emiAmount) || 0).toLocaleString('en-IN')} will be deducted automatically when monthly payroll is processed.</p>
                </div>
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

      {/* Modal: Edit Loan */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Staff Company Loan"
        subtitle="Modify loan principal, monthly EMI, repayments, or status."
        icon={Edit3}
      >
        {editingLoan && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const loanAmt = Number(editingLoan.loanAmount);
              const emiAmt = Number(editingLoan.emiAmount);
              const paidEmis = Number(editingLoan.paidEmis || 0);
              const amtRepaid = editingLoan.amountRepaid !== undefined 
                ? Number(editingLoan.amountRepaid) 
                : paidEmis * emiAmt;
              const totalEmis = Number(editingLoan.totalEmis) || Math.max(1, Math.ceil(loanAmt / (emiAmt || 1)));
              const remBal = Math.max(0, loanAmt - amtRepaid);

              updateLoan(editingLoan.id, {
                loanAmount: loanAmt,
                emiAmount: emiAmt,
                totalEmis,
                paidEmis,
                amountRepaid: amtRepaid,
                outstandingBalance: remBal,
                startDate: editingLoan.startDate || editingLoan.loanDate,
                reason: editingLoan.reason,
                status: editingLoan.status,
              });
              setShowEditModal(false);
              setToastMessage('Loan record updated.');
            }}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Employee</label>
              <input
                type="text"
                disabled
                value={`${editingLoan.employeeName || ''} (${editingLoan.employeeId || ''})`}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Loan Principal (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingLoan.loanAmount}
                  onChange={(e) => setEditingLoan({ ...editingLoan, loanAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Monthly EMI (₹) *</label>
                <input
                  type="number"
                  required
                  value={editingLoan.emiAmount}
                  onChange={(e) => setEditingLoan({ ...editingLoan, emiAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Amount Repaid So Far (₹)</label>
                <input
                  type="number"
                  value={editingLoan.amountRepaid ?? (Number(editingLoan.paidEmis || 0) * Number(editingLoan.emiAmount || 0))}
                  onChange={(e) => setEditingLoan({ ...editingLoan, amountRepaid: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Status</label>
                <select
                  value={editingLoan.status}
                  onChange={(e) => setEditingLoan({ ...editingLoan, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Closed">Closed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1">Reason / Description</label>
              <textarea
                rows={2}
                value={editingLoan.reason || ''}
                onChange={(e) => setEditingLoan({ ...editingLoan, reason: e.target.value })}
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

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
