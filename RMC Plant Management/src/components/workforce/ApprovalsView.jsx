import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCheck2, 
  CalendarDays, 
  IndianRupee, 
  Briefcase, 
  CreditCard, 
  AlertCircle,
  Filter,
  UserCheck,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function ApprovalsView() {
  const { user } = useAuth();
  const { pendingApprovals, approveRequest } = useWorkforce();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState('Approved'); // 'Approved' or 'Rejected'
  const [remarks, setRemarks] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Filter approvals by category (guaranteed strictly deduplicated)
  const filteredApprovals = React.useMemo(() => {
    const list = (pendingApprovals || []).filter((item) => {
      if (selectedCategory === 'all') return true;
      return item.category === selectedCategory;
    });
    const seen = new Set();
    return list.filter((item) => {
      const key = item.id || `${item.category}_${item.employeeId}_${item.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pendingApprovals, selectedCategory]);

  const handleOpenAction = (item, type) => {
    setActionItem(item);
    setActionType(type);
    setRemarks('');
    setShowActionModal(true);
  };

  const handleConfirmAction = () => {
    if (!actionItem) return;
    approveRequest(actionItem.category, actionItem.id, actionType, remarks);
    setShowActionModal(false);
    setToastMessage(`${actionItem.type} for ${actionItem.requester} was ${actionType.toLowerCase()}.`);
  };

  const categoryCounts = {
    all: pendingApprovals.length,
    registration: pendingApprovals.filter((i) => i.category === 'registration').length,
    leave: pendingApprovals.filter((i) => i.category === 'leave').length,
    work: pendingApprovals.filter((i) => i.category === 'work').length,
    advance: pendingApprovals.filter((i) => i.category === 'advance').length,
    loan: pendingApprovals.filter((i) => i.category === 'loan').length,
  };

  const columns = [
    {
      header: 'Request Type',
      accessor: 'type',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
          row.category === 'registration' 
            ? 'bg-cyan-50 border-cyan-200 text-cyan-800' 
            : 'bg-slate-100 border-slate-200 text-slate-800'
        }`}>
          {row.type}
        </span>
      ),
    },
    {
      header: 'Requester',
      accessor: 'requester',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{row.requester}</span>
          <span className="text-[10px] text-amber-700 font-mono font-bold">{row.employeeId}</span>
        </div>
      ),
    },
    { header: 'Submission Date', accessor: 'date', className: 'font-mono text-xs text-slate-600' },
    {
      header: 'Request Particulars / Credentials',
      accessor: 'details',
      render: (row) => (
        <p className="text-xs text-slate-700 leading-relaxed max-w-md line-clamp-2">
          {row.details}
        </p>
      ),
    },
    { header: 'Status', accessor: 'status', type: 'status' },
    {
      header: 'Admin Decision',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenAction(row, 'Approved')}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Approve</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAction(row, 'Rejected')}
            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Reject</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">


      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs'
              : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          All Requests ({categoryCounts.all})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('registration')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            selectedCategory === 'registration'
              ? 'bg-cyan-600 text-white border-cyan-700 font-bold shadow-xs'
              : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          Employee Verification ({categoryCounts.registration})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('leave')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            selectedCategory === 'leave'
              ? 'bg-purple-600 text-white border-purple-700 font-bold shadow-xs'
              : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          Leaves ({categoryCounts.leave})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('work')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            selectedCategory === 'work'
              ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-xs'
              : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          Daily Work ({categoryCounts.work})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('advance')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            selectedCategory === 'advance'
              ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
              : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          Advances ({categoryCounts.advance})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('loan')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            selectedCategory === 'loan'
              ? 'bg-orange-600 text-white border-orange-700 font-bold shadow-xs'
              : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          Loans ({categoryCounts.loan})
        </button>
      </div>

      {/* Main Approvals Table */}
      <DataTable
        title="Pending Authorization Queue"
        subtitle="Review and approve employee registrations, attendance relief, and advances"
        icon={FileCheck2}
        columns={columns}
        data={filteredApprovals}
        emptyMessage="Zero pending approvals in this category. All workforce submissions are verified."
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-800 truncate">{row.requester}</div>
                <div className="text-xs font-mono text-amber-700 font-bold">{row.type} • {row.date}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {row.details}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleOpenAction(row, 'Approved')}
                className="py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAction(row, 'Rejected')}
                className="py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        )}
      />

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={`${actionType}: ${actionItem?.type}`}
        subtitle={`Confirm operational authorization for ${actionItem?.requester}`}
        icon={actionType === 'Approved' ? CheckCircle2 : XCircle}
      >
        {actionItem && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-slate-800 font-bold text-sm">
                {actionItem.requester} ({actionItem.employeeId})
              </div>
              <div className="text-slate-600">{actionItem.details}</div>
            </div>

            {actionItem.category === 'registration' && (
              <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs">
                {actionType === 'Approved' ? (
                  <p>
                    <strong>Approval Action:</strong> This employee's account status will change from <em>Pending Approval</em> to <strong>Active</strong>. The employee will be able to log in and access their role-specific portal.
                  </p>
                ) : (
                  <p>
                    <strong>Rejection Action:</strong> This employee's status will change to <strong>Rejected</strong>. They will be denied portal login access.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Admin Signoff Note (Optional)
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional signoff notes or relief allocation..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowActionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  actionType === 'Approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                }`}
              >
                Confirm {actionType}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
