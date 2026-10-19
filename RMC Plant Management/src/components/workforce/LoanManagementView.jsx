import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Calendar, 
  IndianRupee, 
  Percent,
  Layers,
  Edit3,
  Trash2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function LoanManagementView({ employeeFilter = null }) {
  const { user } = useAuth();
  const { loans, employees, requestLoan, reviewLoan, updateLoan, deleteLoan } = useWorkforce();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [form, setForm] = useState({
    employeeId: user?.employeeId || employees[0]?.id || '',
    loanAmount: 60000,
    totalEmis: 12,
    reason: '',
  });

  const canApprove = user?.role === 'Admin' || user?.role === 'Owner / Director' || user?.role === 'Accountant';

  const filteredLoans = loans.filter((l) => {
    if (employeeFilter) return l.employeeId === employeeFilter;
    return true;
  });

  const calculatedEmi = Math.round(Number(form.loanAmount) / Number(form.totalEmis || 1));

  const handleApply = (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      alert('Please specify reason for company loan.');
      return;
    }

    try {
      requestLoan({
        employeeId: form.employeeId,
        loanAmount: Number(form.loanAmount),
        totalEmis: Number(form.totalEmis),
        emiAmount: calculatedEmi,
        reason: form.reason,
      });

      setShowApplyModal(false);
      setToastMessage(`Loan application for ₹ ${Number(form.loanAmount).toLocaleString('en-IN')} submitted.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApprove = (loanId) => {
    reviewLoan(loanId, 'Approved', user);
    setToastMessage('Loan approved and active. Monthly EMI scheduled in payroll ledger.');
  };

  // Metrics
  const activeLoans = loans.filter((l) => l.status === 'Active');
  const totalPrincipal = activeLoans.reduce((sum, l) => sum + (Number(l.loanAmount) || 0), 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (Number(l.outstandingBalance) || 0), 0);
  const monthlyEmiRunRate = activeLoans.reduce((sum, l) => sum + (Number(l.emiAmount) || 0), 0);

  const columns = [
    {
      header: 'Loan ID',
      accessor: 'id',
      render: (row) => <span className="font-mono text-amber-400 font-bold">{row.id}</span>,
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{row.employeeName}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.employeeId}</span>
        </div>
      ),
    },
    {
      header: 'Sanctioned Loan',
      accessor: 'loanAmount',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">
          ₹ {row.loanAmount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Monthly EMI',
      accessor: 'emiAmount',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-700">
          ₹ {row.emiAmount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Tenure Progress',
      accessor: 'emis',
      render: (row) => (
        <div>
          <span className="font-mono text-xs text-slate-700 font-semibold">
            {row.paidEmis} / {row.totalEmis} Paid
          </span>
          <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.min(100, (row.paidEmis / row.totalEmis) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Outstanding Balance',
      accessor: 'outstandingBalance',
      render: (row) => (
        <span className="font-mono font-bold text-amber-700">
          ₹ {row.outstandingBalance.toLocaleString('en-IN')}
        </span>
      ),
    },
    { header: 'Status', accessor: 'status', type: 'status' },
    {
      header: 'Schedule',
      accessor: 'action',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedLoan(row);
              setShowScheduleModal(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs text-[11px] font-semibold cursor-pointer"
          >
            Amortization
          </button>
          {canApprove && row.status === 'Pending' && (
            <button
              type="button"
              onClick={() => handleApprove(row.id)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-colors"
            >
              Sanction
            </button>
          )}
          {canApprove && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingLoan({ ...row });
                  setShowEditModal(true);
                }}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-700 border border-slate-200 transition-colors"
                title="Edit Loan"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Delete loan record for ${row.employeeName}?`)) {
                    try {
                      await deleteLoan(row.id);
                      setToastMessage(`Loan record ${row.id} deleted.`);
                    } catch (err) {
                      console.error('Failed to delete loan record:', err);
                      setToastMessage(`Failed to delete loan record: ${err.message}`);
                    }
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors"
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
    <div className="space-y-5">
      {/* Metrics Banner: Clean Light Theme Cards with Generous Spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Active Loans */}
        <div className="p-4.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all relative overflow-hidden flex flex-col justify-between group">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600 absolute top-0 left-0 right-0" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-blue-700 uppercase font-bold tracking-wider">Active Loans</span>
            <div className="w-8.5 h-8.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight block">
              {activeLoans.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 pt-1 border-t border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Company assisted</span>
          </div>
        </div>

        {/* Card 2: Total Principal */}
        <div className="p-4.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all relative overflow-hidden flex flex-col justify-between group">
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500 absolute top-0 left-0 right-0" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-700 uppercase font-bold tracking-wider">Total Principal</span>
            <div className="w-8.5 h-8.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono tracking-tight block">
              ₹ {totalPrincipal.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 pt-1 border-t border-emerald-50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Disbursed funds</span>
          </div>
        </div>

        {/* Card 3: Outstanding Loan Book */}
        <div className="p-4.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all relative overflow-hidden flex flex-col justify-between group">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500 absolute top-0 left-0 right-0" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-700 uppercase font-bold tracking-wider">Outstanding Loan Book</span>
            <div className="w-8.5 h-8.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-800 font-mono tracking-tight block">
              ₹ {totalOutstanding.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 pt-1 border-t border-amber-50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Principal to recover</span>
          </div>
        </div>

        {/* Card 4: Monthly EMI Recovery */}
        <div className="p-4.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all relative overflow-hidden flex flex-col justify-between group">
          <div className="h-1 bg-gradient-to-r from-teal-400 to-cyan-500 absolute top-0 left-0 right-0" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-teal-700 uppercase font-bold tracking-wider">Monthly EMI Recovery</span>
            <div className="w-8.5 h-8.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-black text-teal-800 font-mono tracking-tight block">
              ₹ {monthlyEmiRunRate.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-teal-700 pt-1 border-t border-teal-50">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <span>Automated payroll run</span>
          </div>
        </div>
      </div>

      {/* Action Bar: Light, Clean & Spatially Balanced */}
      <div className="p-4.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <CreditCard className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Employee Loan Portfolio & EMI Schedules</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-mono">
                Company Assisted
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Interest-free company loans with automatic monthly salary deductions and tenure tracking.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Loan</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        title="Employee Loan Ledger & Amortization Table"
        subtitle="Tracking sanctioned loans, monthly EMI deductions, and tenure fulfillment"
        icon={CreditCard}
        columns={columns}
        data={filteredLoans}
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">{row.employeeName}</div>
                <div className="text-xs font-mono text-cyan-700 font-bold">{row.id} • {row.loanDate}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Sanctioned:</span>
                <span className="text-slate-900 font-bold">₹ {row.loanAmount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly EMI:</span>
                <span className="text-emerald-700 font-bold">₹ {row.emiAmount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">EMIs Paid:</span>
                <span className="text-slate-700 font-semibold">{row.paidEmis} of {row.totalEmis}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance:</span>
                <span className="text-amber-700 font-bold">₹ {row.outstandingBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedLoan(row);
                  setShowScheduleModal(true);
                }}
                className="w-full py-1.5 rounded-lg bg-white text-slate-800 border border-slate-200 text-xs font-semibold"
              >
                View EMI Schedule
              </button>
            </div>
          </div>
        )}
      />

      {/* Apply Loan Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Apply for Company Loan"
        subtitle="Apply for staff loan assistance with structured EMI salary deduction."
        icon={CreditCard}
      >
        <form onSubmit={handleApply} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Employee</label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white focus:border-emerald-500"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Loan Amount (₹) *</label>
              <input
                type="number"
                required
                min={10000}
                max={200000}
                value={form.loanAmount}
                onChange={(e) => setForm({ ...form, loanAmount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Tenure (Number of EMIs)</label>
              <select
                value={form.totalEmis}
                onChange={(e) => setForm({ ...form, totalEmis: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white focus:border-emerald-500"
              >
                <option value={6}>6 Months</option>
                <option value={10}>10 Months</option>
                <option value={12}>12 Months</option>
                <option value={18}>18 Months</option>
                <option value={24}>24 Months</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Calculated Monthly EMI</label>
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-emerald-400 font-mono font-bold">
                ₹ {calculatedEmi.toLocaleString('en-IN')} / mo
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Reason for Loan *</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Home tin roof repair or sibling wedding support."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white placeholder-slate-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950"
            >
              Submit Loan Application
            </button>
          </div>
        </form>
      </Modal>

      {/* EMI Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={selectedLoan ? `EMI Amortization Schedule (${selectedLoan.id})` : 'Schedule'}
        subtitle="Deductions mapped directly to monthly payroll preparation cycle."
        icon={Calendar}
      >
        {selectedLoan && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-between font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Principal</span>
                <span className="text-white font-bold text-sm">₹ {selectedLoan.loanAmount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Monthly EMI</span>
                <span className="text-emerald-400 font-bold text-sm">₹ {selectedLoan.emiAmount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Remaining EMIs</span>
                <span className="text-amber-400 font-bold text-sm">{selectedLoan.remainingEmis} of {selectedLoan.totalEmis}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800 font-semibold text-slate-400 text-[11px]">
                <span>Cycle</span>
                <span>Deduction Type</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {Array.from({ length: Math.min(6, selectedLoan.totalEmis) }).map((_, idx) => {
                const isPaid = idx < selectedLoan.paidEmis;
                return (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono text-[11px]">
                    <span className="text-slate-300">Month #{idx + 1}</span>
                    <span className="text-slate-400">Payroll Direct Debit</span>
                    <span className="text-emerald-400 font-bold">₹ {selectedLoan.emiAmount.toLocaleString('en-IN')}</span>
                    <span className={isPaid ? 'text-emerald-400' : 'text-amber-400'}>
                      {isPaid ? 'Paid ✓' : 'Scheduled'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
              >
                Close Schedule
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Loan Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Staff Company Loan"
        subtitle="Modify loan amount, EMI schedule, recovered installments, or status."
        icon={Edit3}
      >
        {editingLoan && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const loanAmt = Number(editingLoan.loanAmount);
              const totalEmis = Number(editingLoan.totalEmis);
              const emiAmt = Math.round(loanAmt / (totalEmis || 1));
              const paidEmis = Number(editingLoan.paidEmis || 0);
              const balance = Math.max(0, loanAmt - (paidEmis * emiAmt));

              updateLoan(editingLoan.id, {
                loanAmount: loanAmt,
                totalEmis: totalEmis,
                emiAmount: emiAmt,
                paidEmis: paidEmis,
                balance: balance,
                status: editingLoan.status,
                reason: editingLoan.reason,
              });
              setShowEditModal(false);
              setToastMessage('Loan record updated.');
            }}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Employee</label>
              <input
                type="text"
                disabled
                value={`${editingLoan.employeeName || ''} (${editingLoan.employeeId || ''})`}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-300 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Loan Principal (₹)</label>
                <input
                  type="number"
                  value={editingLoan.loanAmount}
                  onChange={(e) => setEditingLoan({ ...editingLoan, loanAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Total EMIs</label>
                <input
                  type="number"
                  value={editingLoan.totalEmis}
                  onChange={(e) => setEditingLoan({ ...editingLoan, totalEmis: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Paid EMIs</label>
                <input
                  type="number"
                  value={editingLoan.paidEmis ?? 0}
                  onChange={(e) => setEditingLoan({ ...editingLoan, paidEmis: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Status</label>
                <select
                  value={editingLoan.status}
                  onChange={(e) => setEditingLoan({ ...editingLoan, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Reason / Notes</label>
              <textarea
                rows={2}
                value={editingLoan.reason || ''}
                onChange={(e) => setEditingLoan({ ...editingLoan, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl font-semibold bg-slate-100 text-slate-700 border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl font-bold bg-amber-400 text-slate-950 hover:bg-amber-300"
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
