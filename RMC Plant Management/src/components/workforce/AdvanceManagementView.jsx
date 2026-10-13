import React, { useState } from 'react';
import { 
  IndianRupee, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  DollarSign, 
  CreditCard, 
  TrendingDown,
  UserCheck,
  Edit3,
  Trash2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function AdvanceManagementView({ employeeFilter = null }) {
  const { user } = useAuth();
  const { advances, employees, requestAdvance, reviewAdvance, updateAdvance, deleteAdvance } = useWorkforce();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [form, setForm] = useState({
    employeeId: user?.employeeId || employees[0]?.id || '',
    advanceAmount: 10000,
    reason: '',
  });

  const [approvedAmount, setApprovedAmount] = useState(10000);

  // Can approve: Admin, Plant Manager, Accountant
  const canApprove = user?.role === 'Admin' || user?.role === 'Plant Manager' || user?.role === 'Accountant';

  const filteredAdvances = advances.filter((a) => {
    if (employeeFilter) return a.employeeId === employeeFilter;
    return true;
  });

  const handleRequest = (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      alert('Please state a reason for salary advance.');
      return;
    }

    try {
      requestAdvance({
        employeeId: form.employeeId,
        advanceAmount: Number(form.advanceAmount),
        reason: form.reason,
      });

      setShowRequestModal(false);
      setToastMessage(`Salary advance request of ₹ ${Number(form.advanceAmount).toLocaleString('en-IN')} submitted.`);
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
    setToastMessage(`Salary advance ${status.toLowerCase()}! Eligible for payroll ledger deduction.`);
  };

  // Metrics
  const totalDisbursed = advances
    .filter((a) => a.status === 'Approved' || a.status === 'Partially Recovered' || a.status === 'Fully Recovered')
    .reduce((sum, a) => sum + (Number(a.approvedAmount) || 0), 0);

  const totalRecovered = advances.reduce((sum, a) => sum + (Number(a.recoveredAmount) || 0), 0);
  const totalOutstanding = advances.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const pendingCount = advances.filter((a) => a.status === 'Pending').length;

  const columns = [
    {
      header: 'Advance Ref',
      accessor: 'id',
      render: (row) => <span className="font-mono text-amber-700 font-bold">{row.id}</span>,
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{row.employeeName}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.employeeId} • {row.role}</span>
        </div>
      ),
    },
    {
      header: 'Requested',
      accessor: 'advanceAmount',
      render: (row) => (
        <span className="font-mono font-bold text-slate-800">
          ₹ {row.advanceAmount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Approved',
      accessor: 'approvedAmount',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-700">
          ₹ {row.approvedAmount ? row.approvedAmount.toLocaleString('en-IN') : '0'}
        </span>
      ),
    },
    {
      header: 'Recovered',
      accessor: 'recoveredAmount',
      render: (row) => (
        <span className="font-mono text-blue-700 font-semibold">
          ₹ {row.recoveredAmount ? row.recoveredAmount.toLocaleString('en-IN') : '0'}
        </span>
      ),
    },
    {
      header: 'Outstanding Balance',
      accessor: 'balance',
      render: (row) => (
        <span className="font-mono font-bold text-amber-700">
          ₹ {row.balance ? row.balance.toLocaleString('en-IN') : '0'}
        </span>
      ),
    },
    { header: 'Status', accessor: 'status', type: 'status' },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {canApprove && row.status === 'Pending' && (
            <button
              type="button"
              onClick={() => handleOpenReview(row)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-colors"
            >
              Approve
            </button>
          )}
          {canApprove && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingAdvance({ ...row });
                  setShowEditModal(true);
                }}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-700 border border-slate-200 transition-colors"
                title="Edit Advance"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete advance record for ${row.employeeName}?`)) {
                    deleteAdvance(row.id);
                    setToastMessage(`Advance record ${row.id} deleted.`);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors"
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
    <div className="space-y-5">
      {/* Metrics Banner: Clean Light Theme Cards with Generous Spacing */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {/* Card 1: Total Disbursed */}
        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white border border-slate-200/85 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider block font-sans">Total Disbursed</span>
            <div className="w-5.5 h-5.5 rounded-md bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 shadow-2xs">
              <IndianRupee className="w-3 h-3" />
            </div>
          </div>
          <div className="my-0.5">
            <span className="text-base sm:text-[17px] font-semibold text-slate-800 font-sans tabular-nums tracking-tight block">
              ₹ {totalDisbursed.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] font-normal text-slate-500 pt-1 border-t border-slate-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Approved advances</span>
          </div>
        </div>

        {/* Card 2: Total Recovered */}
        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white border border-slate-200/85 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider block font-sans">Total Recovered</span>
            <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 shadow-2xs">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
          <div className="my-0.5">
            <span className="text-base sm:text-[17px] font-semibold text-emerald-700 font-sans tabular-nums tracking-tight block">
              ₹ {totalRecovered.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] font-normal text-slate-500 pt-1 border-t border-slate-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Payroll deductions</span>
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white border border-slate-200/85 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider block font-sans">Outstanding Balance</span>
            <div className="w-5.5 h-5.5 rounded-md bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600 shadow-2xs">
              <TrendingDown className="w-3 h-3" />
            </div>
          </div>
          <div className="my-0.5">
            <span className="text-base sm:text-[17px] font-semibold text-amber-800 font-sans tabular-nums tracking-tight block">
              ₹ {totalOutstanding.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] font-normal text-slate-500 pt-1 border-t border-slate-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>To be recovered</span>
          </div>
        </div>

        {/* Card 4: Pending Requests */}
        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white border border-slate-200/85 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider block font-sans">Pending Requests</span>
            <div className="w-5.5 h-5.5 rounded-md bg-purple-50 border border-purple-200/70 flex items-center justify-center text-purple-600 shadow-2xs">
              <FileText className="w-3 h-3" />
            </div>
          </div>
          <div className="my-0.5">
            <span className="text-base sm:text-[17px] font-semibold text-purple-700 font-sans tabular-nums tracking-tight block">
              {pendingCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] font-normal text-slate-500 pt-1 border-t border-slate-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Awaiting finance approval</span>
          </div>
        </div>
      </div>

      {/* Action Bar: Light, Clean & Spatially Balanced */}
      <div className="p-4.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <IndianRupee className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Salary Advance & Emergency Disbursals</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-mono">
                Active Ledger
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Approved salary advances are scheduled for automatic monthly deduction in payroll preparation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Request Advance</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        title="Employee Salary Advance Ledger"
        subtitle="Tracking advance requests, approved disbursement amounts, and monthly payroll recoveries"
        icon={CreditCard}
        columns={columns}
        data={filteredAdvances}
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">{row.employeeName}</div>
                <div className="text-xs font-mono text-cyan-700 font-bold">{row.id} • {row.requestDate}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Requested:</span>
                <span className="text-slate-900 font-bold">₹ {row.advanceAmount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Approved:</span>
                <span className="text-emerald-700 font-bold">₹ {row.approvedAmount?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Recovered:</span>
                <span className="text-cyan-700 font-semibold">₹ {row.recoveredAmount?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance:</span>
                <span className="text-amber-700 font-bold">₹ {row.balance?.toLocaleString('en-IN') || 0}</span>
              </div>
            </div>

            {canApprove && row.status === 'Pending' && (
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenReview(row)}
                  className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Approve / Decline
                </button>
              </div>
            )}
          </div>
        )}
      />

      {/* Request Advance Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Request Salary Advance"
        subtitle="Apply for advance salary for plant review."
        icon={IndianRupee}
      >
        <form onSubmit={handleRequest} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1">Employee</label>
              {employeeFilter || user?.role !== 'Admin' ? (
                <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-xs">
                  {user?.name || 'Staff'} ({employeeFilter || user?.employeeId || user?.id})
                </div>
              ) : (
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-slate-700 font-bold block mb-1">Advance Amount (₹) *</label>
              <input
                type="number"
                required
                min={1000}
                max={50000}
                value={form.advanceAmount}
                onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1">Reason for Advance *</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Urgent household medical treatment expense."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Approve Salary Advance"
        subtitle="Set sanctioned disbursement amount and authorized payroll deduction."
        icon={UserCheck}
      >
        {selectedAdvance && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-1">
              <div className="text-slate-900 font-bold text-sm">{selectedAdvance.employeeName} ({selectedAdvance.employeeId})</div>
              <div className="text-slate-600 font-mono">Requested: ₹ {selectedAdvance.advanceAmount.toLocaleString('en-IN')}</div>
              <p className="text-slate-700 pt-1 text-xs">Reason: {selectedAdvance.reason}</p>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Approved Sanction Amount (₹)</label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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

      {/* Edit Advance Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Salary Advance Record"
        subtitle="Update advance amount, approved figures, recovered sums, or status."
        icon={Edit3}
      >
        {editingAdvance && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateAdvance(editingAdvance.id, {
                advanceAmount: Number(editingAdvance.advanceAmount),
                approvedAmount: Number(editingAdvance.approvedAmount || 0),
                recoveredAmount: Number(editingAdvance.recoveredAmount || 0),
                balance: Math.max(0, Number(editingAdvance.approvedAmount || editingAdvance.advanceAmount) - Number(editingAdvance.recoveredAmount || 0)),
                status: editingAdvance.status,
                reason: editingAdvance.reason,
              });
              setShowEditModal(false);
              setToastMessage('Salary advance record updated.');
            }}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="text-slate-700 font-bold block mb-1">Employee</label>
              <input
                type="text"
                disabled
                value={`${editingAdvance.employeeName || ''} (${editingAdvance.employeeId || ''})`}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Requested Amount (₹)</label>
                <input
                  type="number"
                  value={editingAdvance.advanceAmount}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, advanceAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-700 font-bold block mb-1">Approved Amount (₹)</label>
                <input
                  type="number"
                  value={editingAdvance.approvedAmount ?? ''}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, approvedAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Recovered So Far (₹)</label>
                <input
                  type="number"
                  value={editingAdvance.recoveredAmount ?? 0}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, recoveredAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-700 font-bold block mb-1">Status</label>
                <select
                  value={editingAdvance.status}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Disbursed">Disbursed</option>
                  <option value="Recovering">Recovering</option>
                  <option value="Closed">Closed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Reason / Notes</label>
              <textarea
                rows={2}
                value={editingAdvance.reason || ''}
                onChange={(e) => setEditingAdvance({ ...editingAdvance, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
