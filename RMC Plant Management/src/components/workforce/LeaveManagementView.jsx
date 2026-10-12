import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  AlertCircle,
  FileCheck2,
  CalendarDays,
  Edit3,
  Trash2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function LeaveManagementView({ employeeFilter = null }) {
  const { user } = useAuth();
  const { leaves, employees, applyLeave, reviewLeave, updateLeave, deleteLeave } = useWorkforce();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [form, setForm] = useState({
    employeeId: user?.employeeId || employees[0]?.id || '',
    leaveType: 'Casual Leave',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    days: 1,
    reason: '',
  });

  const [reviewRemarks, setReviewRemarks] = useState('');

  // Authorized to approve leaves (Admin, Plant Manager, Site Supervisor)
  const canApprove = user?.role === 'Admin' || user?.role === 'Plant Manager' || user?.role === 'Site Supervisor';

  const filteredLeaves = leaves.filter((l) => {
    if (employeeFilter) return l.employeeId === employeeFilter;
    return true;
  });

  const handleDatesChange = (from, to) => {
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diffTime = Math.max(0, d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setForm((prev) => ({
      ...prev,
      fromDate: from,
      toDate: to,
      days: isNaN(diffDays) || diffDays <= 0 ? 1 : diffDays,
    }));
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      alert('Please state a reason for leave.');
      return;
    }

    applyLeave({
      employeeId: form.employeeId,
      leaveType: form.leaveType,
      fromDate: form.fromDate,
      toDate: form.toDate,
      days: Number(form.days),
      reason: form.reason,
    });

    setShowApplyModal(false);
    setToastMessage(`Leave application submitted for ${form.days} day(s). Notification dispatched to manager.`);
  };

  const handleOpenReview = (leave) => {
    setSelectedLeave(leave);
    setReviewRemarks('');
    setShowReviewModal(true);
  };

  const handleExecuteReview = (status) => {
    if (!selectedLeave) return;
    reviewLeave(selectedLeave.id, status, reviewRemarks, user);
    setShowReviewModal(false);
    setToastMessage(`Leave request ${status.toLowerCase()}! Attendance and roster records updated.`);
  };

  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'Approved').length;

  const columns = [
    {
      header: 'Application ID',
      accessor: 'id',
      render: (row) => <span className="font-mono text-amber-400 font-bold">{row.id}</span>,
    },
    {
      header: 'Staff Member',
      accessor: 'employeeName',
      render: (row) => (
        <div>
          <span className="font-bold text-white text-xs block">{row.employeeName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.employeeId} • {row.role}</span>
        </div>
      ),
    },
    { header: 'Leave Category', accessor: 'leaveType', className: 'text-xs text-purple-300 font-semibold' },
    {
      header: 'Duration Window',
      accessor: 'duration',
      render: (row) => (
        <div>
          <span className="font-mono text-xs text-white block">{row.fromDate} to {row.toDate}</span>
          <span className="text-[10px] text-slate-400 font-mono font-bold">{row.days} Working Day(s)</span>
        </div>
      ),
    },
    {
      header: 'Operational Reason',
      accessor: 'reason',
      render: (row) => <span className="text-xs text-slate-300 line-clamp-2 max-w-sm">{row.reason}</span>,
    },
    { header: 'Status', accessor: 'status', type: 'status' },
    {
      header: 'Manager Remarks',
      accessor: 'reviewedBy',
      render: (row) => (
        <span className="text-[11px] text-slate-400 font-mono block">
          {row.reviewedBy ? `${row.reviewedBy}` : 'Pending Review'}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {canApprove && row.status === 'Pending' && (
            <button
              type="button"
              onClick={() => handleOpenReview(row)}
              className="px-2.5 py-1 rounded-lg bg-purple-900/40 hover:bg-purple-850 text-purple-300 border border-purple-700/50 text-[11px] font-semibold cursor-pointer"
            >
              Review
            </button>
          )}
          {canApprove && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingLeave({ ...row });
                  setShowEditModal(true);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors"
                title="Edit Leave"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete leave application for ${row.employeeName}?`)) {
                    deleteLeave(row.id);
                    setToastMessage(`Leave application ${row.id} deleted.`);
                  }
                }}
                className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                title="Delete Leave"
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
      {/* Top Banner & Leave Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#12151e] border border-slate-800">
          <span className="text-[10px] text-amber-400 uppercase font-semibold block">Pending Approvals</span>
          <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-0.5 block">{pendingCount}</span>
          <span className="text-[10px] text-slate-500 font-mono">Awaiting manager signoff</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12151e] border border-slate-800">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Approved This Month</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5 block">{approvedCount}</span>
          <span className="text-[10px] text-slate-500 font-mono">Deducted from leave bank</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12151e] border border-slate-800">
          <span className="text-[10px] text-cyan-400 uppercase font-semibold block">Casual Leave Quota</span>
          <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-0.5 block">12 / Year</span>
          <span className="text-[10px] text-slate-500 font-mono">Paid statutory allowance</span>
        </div>
        <div className="p-4 rounded-xl bg-[#12151e] border border-slate-800">
          <span className="text-[10px] text-purple-400 uppercase font-semibold block">Earned Leave Quota</span>
          <span className="text-xl sm:text-2xl font-black text-purple-300 font-mono mt-0.5 block">15 / Year</span>
          <span className="text-[10px] text-slate-500 font-mono">Encashable on tenure</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#12151e] border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-purple-400" />
            <span>Leave Management & Relief Roster</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Approved leaves automatically update daily attendance and payroll preparation sheets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leaves Table */}
      <DataTable
        title="Leave Applications & Approvals Ledger"
        subtitle="Chronological leave records across plant drivers, technicians, batchers, and supervisors"
        icon={FileCheck2}
        columns={columns}
        data={filteredLeaves}
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">{row.employeeName}</div>
                <div className="text-xs font-mono text-purple-700 font-bold">{row.leaveType} ({row.days} Days)</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="text-xs font-mono text-slate-700 pt-1">
              Dates: <strong className="text-slate-900">{row.fromDate}</strong> to <strong className="text-slate-900">{row.toDate}</strong>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Reason: {row.reason}
            </p>

            <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200">
              {row.reviewedBy ? `Reviewed: ${row.reviewedBy}` : 'Awaiting Review'}
            </div>

            {canApprove && row.status === 'Pending' && (
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenReview(row)}
                  className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Review Application
                </button>
              </div>
            )}
          </div>
        )}
      />

      {/* Apply Leave Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Apply for Employee Leave"
        subtitle="Submit dates, category, and operational reason for plant management signoff."
        icon={CalendarDays}
      >
        <form onSubmit={handleApply} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Employee</label>
              {employeeFilter || user?.role !== 'Admin' ? (
                <div className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs">
                  {user?.name || 'Staff'} ({employeeFilter || user?.employeeId || user?.id})
                </div>
              ) : (
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-purple-500"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Leave Category</label>
              <select
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white focus:border-purple-500"
              >
                <option value="Casual Leave">Casual Leave (CL)</option>
                <option value="Sick Leave">Sick Leave (SL)</option>
                <option value="Earned Leave">Earned Leave (EL)</option>
                <option value="Emergency Leave">Emergency Leave</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">From Date *</label>
              <input
                type="date"
                required
                value={form.fromDate}
                onChange={(e) => handleDatesChange(e.target.value, form.toDate)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">To Date *</label>
              <input
                type="date"
                required
                value={form.toDate}
                onChange={(e) => handleDatesChange(form.fromDate, e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Days Count</label>
              <input
                type="number"
                readOnly
                value={form.days}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-amber-300 font-mono font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Reason for Leave *</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Attending sibling wedding ceremony in native place."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white placeholder-slate-500 focus:border-purple-500"
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
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white"
            >
              Submit Application
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Leave Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Leave Application"
        subtitle="Approve or decline employee leave request."
        icon={CalendarDays}
      >
        {selectedLeave && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
              <div className="text-white font-bold">{selectedLeave.employeeName} ({selectedLeave.employeeId})</div>
              <div className="text-purple-300 text-[11px] font-mono">
                {selectedLeave.leaveType} • {selectedLeave.days} Days ({selectedLeave.fromDate} to {selectedLeave.toDate})
              </div>
              <p className="text-slate-300 mt-2 leading-relaxed">Reason: {selectedLeave.reason}</p>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Manager Signoff Remarks</label>
              <input
                type="text"
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="e.g. Relief driver assigned during absence."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleExecuteReview('Rejected')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 cursor-pointer"
              >
                Reject Leave
              </button>
              <button
                type="button"
                onClick={() => handleExecuteReview('Approved')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
              >
                Approve & Update Attendance
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Leave Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Leave Application"
        subtitle="Update leave dates, duration, category, or status."
        icon={Edit3}
      >
        {editingLeave && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateLeave(editingLeave.id, {
                leaveType: editingLeave.leaveType,
                fromDate: editingLeave.fromDate,
                toDate: editingLeave.toDate,
                days: Number(editingLeave.days),
                reason: editingLeave.reason,
                status: editingLeave.status,
                reviewedBy: editingLeave.reviewedBy,
              });
              setShowEditModal(false);
              setToastMessage('Leave application updated.');
            }}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Employee</label>
              <input
                type="text"
                disabled
                value={`${editingLeave.employeeName || ''} (${editingLeave.employeeId || ''})`}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-300 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Leave Type</label>
                <select
                  value={editingLeave.leaveType}
                  onChange={(e) => setEditingLeave({ ...editingLeave, leaveType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white"
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Earned / Privilege Leave">Earned / Privilege Leave (EL)</option>
                  <option value="Loss of Pay (Unpaid)">Loss of Pay (Unpaid)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Status</label>
                <select
                  value={editingLeave.status}
                  onChange={(e) => setEditingLeave({ ...editingLeave, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">From Date</label>
                <input
                  type="date"
                  value={editingLeave.fromDate}
                  onChange={(e) => setEditingLeave({ ...editingLeave, fromDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">To Date</label>
                <input
                  type="date"
                  value={editingLeave.toDate}
                  onChange={(e) => setEditingLeave({ ...editingLeave, toDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Total Days</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={editingLeave.days}
                  onChange={(e) => setEditingLeave({ ...editingLeave, days: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Reason</label>
              <textarea
                rows={2}
                value={editingLeave.reason || ''}
                onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })}
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
