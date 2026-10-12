import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Calendar, 
  UserCheck, 
  MessageSquare,
  AlertCircle,
  Edit3,
  Trash2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function DailyWorkView({ employeeFilter = null }) {
  const { user } = useAuth();
  const { dailyWork, employees, submitDailyWork, reviewDailyWork, updateDailyWork, deleteDailyWork } = useWorkforce();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [selectedWork, setSelectedWork] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const [form, setForm] = useState({
    employeeId: user?.employeeId || employees[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    workType: 'Concrete Batching & Dispatch Haul',
    hoursWorked: 8,
    workDescription: '',
    remarks: '',
  });

  const [reviewRemarks, setReviewRemarks] = useState('');

  // Authorized to review? (Admin, Plant Manager, Site Supervisor)
  const canReview = user?.role === 'Admin' || user?.role === 'Plant Manager' || user?.role === 'Site Supervisor';

  const filteredWork = dailyWork.filter((w) => {
    if (employeeFilter) return w.employeeId === employeeFilter;
    return true;
  });

  const handleOpenSubmit = () => {
    setForm({
      employeeId: user?.employeeId || employees[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      workType: 'Concrete Mixer Delivery Trip',
      hoursWorked: 8,
      workDescription: '',
      remarks: '',
    });
    setShowSubmitModal(false);
    setShowSubmitModal(true);
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!form.workDescription.trim()) {
      alert('Please provide work description.');
      return;
    }

    submitDailyWork({
      employeeId: form.employeeId,
      date: form.date,
      workType: form.workType,
      hoursWorked: form.hoursWorked,
      workDescription: form.workDescription,
      remarks: form.remarks,
      status: 'Submitted',
    });

    setShowSubmitModal(false);
    setToastMessage('Daily operational work log submitted successfully.');
  };

  const handleOpenReview = (work) => {
    setSelectedWork(work);
    setReviewRemarks('');
    setShowReviewModal(true);
  };

  const handleExecuteReview = (status) => {
    if (!selectedWork) return;
    reviewDailyWork(selectedWork.id, status, reviewRemarks, user);
    setShowReviewModal(false);
    setToastMessage(`Daily work entry ${status.toLowerCase()} by ${user?.name || 'Supervisor'}.`);
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      className: 'font-mono text-xs text-slate-300 font-bold',
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
      render: (row) => (
        <div>
          <span className="font-bold text-white text-xs block">{row.employeeName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.employeeId}</span>
        </div>
      ),
    },
    { header: 'Work Classification', accessor: 'workType', className: 'text-xs text-amber-300 font-medium' },
    {
      header: 'Operational Description',
      accessor: 'workDescription',
      render: (row) => (
        <p className="text-xs text-slate-300 leading-relaxed max-w-md line-clamp-2">
          {row.workDescription}
        </p>
      ),
    },
    {
      header: 'Hours',
      accessor: 'hoursWorked',
      render: (row) => <span className="font-mono text-white font-bold">{row.hoursWorked} hrs</span>,
    },
    { header: 'Approval Status', accessor: 'status', type: 'status' },
    {
      header: 'Supervisor Review',
      accessor: 'reviewedBy',
      render: (row) => (
        <span className="text-[11px] text-slate-400 block font-mono">
          {row.reviewedBy || 'Pending Review'}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {canReview && row.status === 'Submitted' && (
            <button
              type="button"
              onClick={() => handleOpenReview(row)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold cursor-pointer"
            >
              Review
            </button>
          )}
          {canReview && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingWork({ ...row });
                  setShowEditModal(true);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors"
                title="Edit Work Log"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete work log for ${row.employeeName}?`)) {
                    deleteDailyWork(row.id);
                    setToastMessage(`Daily work entry ${row.id} deleted.`);
                  }
                }}
                className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                title="Delete Work Log"
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
      {/* Top Banner & Submit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4.5 rounded-3xl bg-gradient-to-r from-amber-50/90 via-white to-orange-50/90 border border-amber-200/90 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-600" />
            <span>Daily Workforce Duty & Execution Log</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record batching volumes, transit mixer rounds, slump tests, and site discharge execution.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenSubmit}
          className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Work Log</span>
        </button>
      </div>

      {/* Daily Work Table */}
      <DataTable
        title="Operational Execution History"
        subtitle="Submitted duty logs awaiting supervisor signoff and attendance matching"
        icon={FileText}
        columns={columns}
        data={filteredWork}
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">{row.employeeName}</div>
                <div className="text-xs font-mono text-slate-500">{row.date} • {row.workType}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <p className="text-xs text-slate-700 leading-relaxed pt-1 font-medium">
              {row.workDescription}
            </p>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200">
              <span>Hours: <strong className="text-slate-800">{row.hoursWorked}h</strong></span>
              <span>{row.reviewedBy ? `Reviewed: ${row.reviewedBy}` : 'Pending'}</span>
            </div>

            {canReview && row.status === 'Submitted' && (
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenReview(row)}
                  className="w-full py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
                >
                  Review Submission
                </button>
              </div>
            )}
          </div>
        )}
      />

      {/* Submit Daily Work Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Daily Duty Log"
        subtitle="Document plant production, driver transit hauls, QC sampling, or site coordination."
        icon={Briefcase}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee *
              </label>
              {employeeFilter || user?.role !== 'Admin' ? (
                <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 font-bold font-mono">
                  {user?.name || 'Staff'} ({employeeFilter || user?.employeeId || user?.id})
                </div>
              ) : (
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Duty Date *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Classification *
              </label>
              <select
                value={form.workType}
                onChange={(e) => setForm({ ...form, workType: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
              >
                <option value="Concrete Mixer Delivery Trip">Concrete Mixer Delivery Trip</option>
                <option value="Batching Plant SCADA Operation">Batching Plant SCADA Operation</option>
                <option value="QC Slump Testing & Cube Sampling">QC Slump Testing & Cube Sampling</option>
                <option value="On-Site Foundation Pouring Supervision">On-Site Foundation Pouring Supervision</option>
                <option value="Fleet Dispatch Scheduling">Fleet Dispatch Scheduling</option>
                <option value="Maintenance & Mechanical Inspection">Maintenance & Mechanical Inspection</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hours Worked *
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={form.hoursWorked}
                onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Operational Description *
            </label>
            <textarea
              required
              rows={3}
              value={form.workDescription}
              onChange={(e) => setForm({ ...form, workDescription: e.target.value })}
              placeholder="e.g. Completed 2 return mixer trips (14 m³ M30) to Godrej Woods Tower A pier pour; washed drum."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white transition-all shadow-md shadow-amber-500/20 active:scale-[0.98]"
            >
              Submit for Signoff
            </button>
          </div>
        </form>
      </Modal>

      {/* Supervisor Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Supervisor Review of Daily Work"
        subtitle="Verify operational work execution against plant telemetry."
        icon={UserCheck}
      >
        {selectedWork && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-slate-900 font-bold">{selectedWork.employeeName} ({selectedWork.employeeId})</div>
              <div className="text-slate-500 text-[11px] font-mono mt-0.5">{selectedWork.date} • {selectedWork.workType} ({selectedWork.hoursWorked} hrs)</div>
              <p className="text-slate-700 mt-2 leading-relaxed font-medium">{selectedWork.workDescription}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Supervisor Signoff Remarks
              </label>
              <input
                type="text"
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="e.g. Verified against SCADA batch slips."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleExecuteReview('Rejected')}
                className="px-4 py-2.5 rounded-xl font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
              >
                Reject Log
              </button>
              <button
                type="button"
                onClick={() => handleExecuteReview('Approved')}
                className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
              >
                Approve & Signoff
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Daily Work Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Daily Workforce Duty Log"
        subtitle="Modify logged hours, task scope, or supervisor approval status."
        icon={Edit3}
      >
        {editingWork && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateDailyWork(editingWork.id, {
                workType: editingWork.workType,
                hoursWorked: Number(editingWork.hoursWorked),
                workDescription: editingWork.workDescription,
                remarks: editingWork.remarks,
                status: editingWork.status,
                reviewedBy: editingWork.reviewedBy,
              });
              setShowEditModal(false);
              setToastMessage('Daily work entry updated.');
            }}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee
              </label>
              <input
                type="text"
                disabled
                value={`${editingWork.employeeName || ''} (${editingWork.employeeId || ''})`}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Work Type</label>
                <input
                  type="text"
                  value={editingWork.workType}
                  onChange={(e) => setEditingWork({ ...editingWork, workType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Hours Worked</label>
                <input
                  type="number"
                  step="0.5"
                  value={editingWork.hoursWorked}
                  onChange={(e) => setEditingWork({ ...editingWork, hoursWorked: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={editingWork.status}
                onChange={(e) => setEditingWork({ ...editingWork, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium cursor-pointer"
              >
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Work Description</label>
              <textarea
                rows={2}
                value={editingWork.workDescription}
                onChange={(e) => setEditingWork({ ...editingWork, workDescription: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Remarks</label>
              <input
                type="text"
                value={editingWork.remarks || ''}
                onChange={(e) => setEditingWork({ ...editingWork, remarks: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md shadow-amber-500/20"
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
