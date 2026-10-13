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
      render: (row) => <span className="font-mono text-amber-800 font-bold text-xs">{row.id}</span>,
    },
    {
      header: 'Staff Member',
      accessor: 'employeeName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{row.employeeName}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.employeeId} • {row.role}</span>
        </div>
      ),
    },
    { 
      header: 'Leave Category', 
      accessor: 'leaveType', 
      render: (row) => (
        <span className="inline-block text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
          {row.leaveType}
        </span>
      ),
    },
    {
      header: 'Duration Window',
      accessor: 'duration',
      render: (row) => (
        <div>
          <span className="font-mono text-xs text-slate-900 font-bold block">{row.fromDate} to {row.toDate}</span>
          <span className="text-[10px] text-slate-500 font-mono font-medium">{row.days} Working Day(s)</span>
        </div>
      ),
    },
    {
      header: 'Operational Reason',
      accessor: 'reason',
      render: (row) => <span className="text-xs text-slate-600 line-clamp-2 max-w-sm">{row.reason}</span>,
    },
    { header: 'Status', accessor: 'status', type: 'status' },
    {
      header: 'Manager Remarks',
      accessor: 'reviewedBy',
      render: (row) => (
        <span className="text-[11px] text-slate-600 font-mono block">
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
              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
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
                className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
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
    <div className="space-y-4">
      {/* 4 Compact & Light Leave Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white border border-slate-200/85 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider block font-sans">
              Pending Approvals
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          </div>
          <span className="text-base sm:text-[17px] font-semibold text-amber-800 font-sans tabular-nums my-0.5 block">
            {pendingCount}
          </span>
          <span className="pt-1 border-t border-slate-100/90 text-[9.5px] sm:text-[10px] text-slate-500 font-normal truncate block">
            Awaiting manager signoff
          </span>
        </div>

        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white border border-slate-200/85 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider block font-sans">
              Approved This Month
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </div>
          <span className="text-base sm:text-[17px] font-semibold text-emerald-700 font-sans tabular-nums my-0.5 block">
            {approvedCount}
          </span>
          <span className="pt-1 border-t border-slate-100/90 text-[9.5px] sm:text-[10px] text-slate-500 font-normal truncate block">
            Deducted from leave bank
          </span>
        </div>

        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white border border-slate-200/85 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider block font-sans">
              Casual Leave Quota
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          </div>
          <span className="text-base sm:text-[17px] font-semibold text-slate-800 font-sans tabular-nums my-0.5 block">
            12 / Year
          </span>
          <span className="pt-1 border-t border-slate-100/90 text-[9.5px] sm:text-[10px] text-slate-500 font-normal truncate block">
            Paid statutory allowance
          </span>
        </div>

        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white border border-slate-200/85 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider block font-sans">
              Earned Leave Quota
            </span>
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
          </div>
          <span className="text-base sm:text-[17px] font-semibold text-slate-800 font-sans tabular-nums my-0.5 block">
            15 / Year
          </span>
          <span className="pt-1 border-t border-slate-100/90 text-[9.5px] sm:text-[10px] text-slate-500 font-normal truncate block">
            Encashable on tenure
          </span>
        </div>
      </div>

      {/* Sleek, Compact Enterprise Action Toolbar */}
      <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/80 shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight">
                Leave Management & Relief Roster
              </h2>
              <span className="hidden sm:inline-block text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                Roster Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              Approved leaves automatically update daily attendance and payroll preparation sheets.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 active:scale-95 text-white flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
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
              <label className="text-slate-700 font-semibold block mb-1 text-xs">Employee</label>
              {employeeFilter || user?.role !== 'Admin' ? (
                <div className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono font-bold text-xs">
                  {user?.name || 'Staff'} ({employeeFilter || user?.employeeId || user?.id})
                </div>
              ) : (
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1 text-xs">Leave Category</label>
              <select
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
              <label className="text-slate-700 font-semibold block mb-1 text-xs">From Date *</label>
              <input
                type="date"
                required
                value={form.fromDate}
                onChange={(e) => handleDatesChange(e.target.value, form.toDate)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1 text-xs">To Date *</label>
              <input
                type="date"
                required
                value={form.toDate}
                onChange={(e) => handleDatesChange(form.fromDate, e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1 text-xs">Days Count</label>
              <input
                type="number"
                readOnly
                value={form.days}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-amber-800 font-mono font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1 text-xs">Reason for Leave *</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Attending family wedding ceremony."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-2xs"
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
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-slate-900 font-bold text-sm">{selectedLeave.employeeName} ({selectedLeave.employeeId})</div>
              <div className="text-purple-700 text-xs font-mono font-semibold">
                {selectedLeave.leaveType} • {selectedLeave.days} Days ({selectedLeave.fromDate} to {selectedLeave.toDate})
              </div>
              <p className="text-slate-600 mt-1 leading-relaxed text-xs">Reason: {selectedLeave.reason}</p>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1 text-xs">Manager Signoff Remarks</label>
              <input
                type="text"
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="e.g. Relief staff assigned during absence."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleExecuteReview('Rejected')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
              >
                Reject Leave
              </button>
              <button
                type="button"
                onClick={() => handleExecuteReview('Approved')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
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
              <label className="text-slate-700 font-semibold block mb-1 text-xs">Employee</label>
              <input
                type="text"
                disabled
                value={`${editingLeave.employeeName || ''} (${editingLeave.employeeId || ''})`}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1 text-xs">Leave Type</label>
                <select
                  value={editingLeave.leaveType}
                  onChange={(e) => setEditingLeave({ ...editingLeave, leaveType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Earned / Privilege Leave">Earned / Privilege Leave (EL)</option>
                  <option value="Loss of Pay (Unpaid)">Loss of Pay (Unpaid)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1 text-xs">Status</label>
                <select
                  value={editingLeave.status}
                  onChange={(e) => setEditingLeave({ ...editingLeave, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1 text-xs">From Date</label>
                <input
                  type="date"
                  value={editingLeave.fromDate}
                  onChange={(e) => setEditingLeave({ ...editingLeave, fromDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1 text-xs">To Date</label>
                <input
                  type="date"
                  value={editingLeave.toDate}
                  onChange={(e) => setEditingLeave({ ...editingLeave, toDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1 text-xs">Total Days</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={editingLeave.days}
                  onChange={(e) => setEditingLeave({ ...editingLeave, days: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1 text-xs">Reason</label>
              <textarea
                rows={2}
                value={editingLeave.reason || ''}
                onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-2xs"
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
