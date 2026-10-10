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
      render: (row) => <span className="font-mono text-amber-400 font-bold">{row.id}</span>,
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
      render: (row) => (
        <div>
          <span className="font-bold text-white text-xs block">{row.employeeName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.employeeId} • {row.role}</span>
        </div>
      ),
    },
    {
      header: 'Requested',
      accessor: 'advanceAmount',
      render: (row) => (
        <span className="font-mono font-bold text-slate-200">
          ₹ {row.advanceAmount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Approved',
      accessor: 'approvedAmount',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400">
          ₹ {row.approvedAmount ? row.approvedAmount.toLocaleString('en-IN') : '0'}
        </span>
      ),
    },
    {
      header: 'Recovered',
      accessor: 'recoveredAmount',
      render: (row) => (
        <span className="font-mono text-cyan-400">
          ₹ {row.recoveredAmount ? row.recoveredAmount.toLocaleString('en-IN') : '0'}
        </span>
      ),
    },
    {
      header: 'Outstanding Balance',
      accessor: 'balance',
      render: (row) => (
        <span className="font-mono font-bold text-amber-300">
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
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold cursor-pointer"
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
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors"
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
                className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
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
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#12151e] border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Disbursed</span>
          <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
            ₹ {totalDisbursed.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Approved advances</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12151e] border border-slate-800">
          <span className="text-[10px] text-cyan-400 uppercase font-semibold block">Total Recovered</span>
          <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-0.5 block">
            ₹ {totalRecovered.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Payroll deductions</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12151e] border border-slate-800">
          <span className="text-[10px] text-amber-400 uppercase font-semibold block">Outstanding Balance</span>
          <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-0.5 block">
            ₹ {totalOutstanding.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">To be recovered</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12151e] border border-slate-800">
          <span className="text-[10px] text-purple-400 uppercase font-semibold block">Pending Requests</span>
          <span className="text-xl sm:text-2xl font-black text-purple-300 font-mono mt-0.5 block">{pendingCount}</span>
          <span className="text-[10px] text-slate-500 font-mono">Awaiting finance approval</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#12151e] border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-400" />
            <span>Salary Advance & Emergency Disbursals</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Approved salary advances are scheduled for automatic monthly deduction in payroll preparation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
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
                <div className="text-sm font-bold text-white truncate">{row.employeeName}</div>
                <div className="text-xs font-mono text-slate-400">{row.id} • {row.requestDate}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Requested:</span>
                <span className="text-white font-bold">₹ {row.advanceAmount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Approved:</span>
                <span className="text-emerald-400 font-bold">₹ {row.approvedAmount?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Recovered:</span>
                <span className="text-cyan-400">₹ {row.recoveredAmount?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Balance:</span>
                <span className="text-amber-400 font-bold">₹ {row.balance?.toLocaleString('en-IN') || 0}</span>
              </div>
            </div>

            {canApprove && row.status === 'Pending' && (
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenReview(row)}
                  className="w-full py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold"
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
              <label className="text-slate-400 font-semibold block mb-1">Advance Amount (₹) *</label>
              <input
                type="number"
                required
                min={1000}
                max={50000}
                value={form.advanceAmount}
                onChange={(e) => setForm({ ...form, advanceAmount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Reason for Advance *</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Urgent household medical treatment expense."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white placeholder-slate-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950"
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
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-1">
              <div className="text-white font-bold">{selectedAdvance.employeeName} ({selectedAdvance.employeeId})</div>
              <div className="text-slate-400">Requested: ₹ {selectedAdvance.advanceAmount.toLocaleString('en-IN')}</div>
              <p className="text-slate-300 pt-1">Reason: {selectedAdvance.reason}</p>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Approved Sanction Amount (₹)</label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleExecuteReview('Rejected')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-950/60 text-red-300 border border-red-800/60"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleExecuteReview('Approved')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950"
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
              <label className="text-slate-400 font-semibold block mb-1">Employee</label>
              <input
                type="text"
                disabled
                value={`${editingAdvance.employeeName || ''} (${editingAdvance.employeeId || ''})`}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-300 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Requested Amount (₹)</label>
                <input
                  type="number"
                  value={editingAdvance.advanceAmount}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, advanceAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Approved Amount (₹)</label>
                <input
                  type="number"
                  value={editingAdvance.approvedAmount ?? ''}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, approvedAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Recovered So Far (₹)</label>
                <input
                  type="number"
                  value={editingAdvance.recoveredAmount ?? 0}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, recoveredAmount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Status</label>
                <select
                  value={editingAdvance.status}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
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
              <label className="text-slate-400 font-semibold block mb-1">Reason / Notes</label>
              <textarea
                rows={2}
                value={editingAdvance.reason || ''}
                onChange={(e) => setEditingAdvance({ ...editingAdvance, reason: e.target.value })}
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
