import React, { useState, useMemo } from 'react';
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
  Trash2,
  Truck,
  Factory,
  HardHat,
  ShieldCheck,
  Filter,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  User
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
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  // Base employee-filtered work
  const baseFilteredWork = useMemo(() => {
    return dailyWork.filter((w) => {
      if (employeeFilter) return w.employeeId === employeeFilter;
      return true;
    });
  }, [dailyWork, employeeFilter]);

  // Status-filtered work
  const filteredWork = useMemo(() => {
    if (statusFilter === 'ALL') return baseFilteredWork;
    return baseFilteredWork.filter((w) => (w.status || '').toLowerCase() === statusFilter.toLowerCase());
  }, [baseFilteredWork, statusFilter]);

  // Statistics & KPI metrics
  const stats = useMemo(() => {
    const total = baseFilteredWork.length;
    const submitted = baseFilteredWork.filter((w) => (w.status || '').toLowerCase() === 'submitted').length;
    const approved = baseFilteredWork.filter((w) => (w.status || '').toLowerCase() === 'approved').length;
    const rejected = baseFilteredWork.filter((w) => (w.status || '').toLowerCase() === 'rejected').length;
    const totalHours = baseFilteredWork.reduce((sum, w) => sum + (Number(w.hoursWorked) || 0), 0);

    return { total, submitted, approved, rejected, totalHours };
  }, [baseFilteredWork]);

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

  // Helper to resolve employee name when blank or missing
  const getEmployeeDisplayName = (row) => {
    if (row.employeeName && row.employeeName.trim()) return row.employeeName;
    const match = employees?.find((e) => e.id === row.employeeId);
    if (match?.name) return match.name;
    if (row.employeeId === 'ADM-001') return 'System Administrator';
    return row.employeeId || 'Staff Member';
  };

  // Helper for avatar initials and colors
  const getAvatarMeta = (name) => {
    const clean = (name || 'Staff').trim();
    const parts = clean.split(/\s+/);
    const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : clean.slice(0, 2).toUpperCase();

    const colorPalettes = [
      'bg-blue-100 text-[#1D5FA7] border-blue-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-violet-100 text-violet-700 border-violet-200',
      'bg-sky-100 text-sky-800 border-sky-200',
    ];
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorClass = colorPalettes[Math.abs(hash) % colorPalettes.length];
    return { initials, colorClass };
  };

  // Helper for date formatting
  const formatDateMeta = (dateStr) => {
    if (!dateStr) return { day: '--', month: '---', year: '----', weekday: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { day: dateStr, month: '', year: '', weekday: '' };
      return {
        day: String(d.getDate()).padStart(2, '0'),
        month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        year: d.getFullYear(),
        weekday: d.toLocaleString('en-US', { weekday: 'short' }),
      };
    } catch {
      return { day: dateStr, month: '', year: '', weekday: '' };
    }
  };

  // Helper for Work Classification Pill
  const renderWorkTypeBadge = (type) => {
    const t = (type || '').toLowerCase();
    let IconComp = Briefcase;
    let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-200';
    let iconColor = 'text-slate-600';

    if (t.includes('mixer') || t.includes('delivery') || t.includes('transit') || t.includes('haul')) {
      IconComp = Truck;
      badgeStyle = 'bg-sky-50 text-sky-900 border-sky-200/90';
      iconColor = 'text-sky-600';
    } else if (t.includes('plant') || t.includes('batching') || t.includes('scada')) {
      IconComp = Factory;
      badgeStyle = 'bg-indigo-50 text-indigo-900 border-indigo-200/90';
      iconColor = 'text-indigo-600';
    } else if (t.includes('site') || t.includes('pouring') || t.includes('foundation')) {
      IconComp = HardHat;
      badgeStyle = 'bg-amber-50 text-amber-900 border-amber-200/90';
      iconColor = 'text-amber-700';
    } else if (t.includes('qc') || t.includes('slump') || t.includes('test') || t.includes('sampling')) {
      IconComp = ShieldCheck;
      badgeStyle = 'bg-teal-50 text-teal-900 border-teal-200/90';
      iconColor = 'text-teal-700';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${badgeStyle} shadow-2xs`}>
        <IconComp className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
        <span className="truncate max-w-[165px]" title={type}>{type}</span>
      </span>
    );
  };

  // Helper for Operational Description with tags
  const renderDescription = (text) => {
    if (!text) return <span className="text-slate-400 italic text-xs">No execution details provided</span>;

    if (text.includes('|')) {
      const parts = text.split('|').map((p) => p.trim()).filter(Boolean);
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {parts.map((p, idx) => (
            <span
              key={idx}
              className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${
                idx === 0
                  ? 'bg-slate-100 text-slate-900 font-semibold border-slate-300'
                  : 'bg-[#F5F9FF] text-[#123B6D] border-[#D4E4F7]'
              }`}
            >
              {p}
            </span>
          ))}
        </div>
      );
    }

    return (
      <p className="text-xs text-slate-800 leading-relaxed font-normal line-clamp-2" title={text}>
        {text}
      </p>
    );
  };

  // Helper for Approval Status Pill
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Approved</span>
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Rejected</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
        <span>Submitted</span>
      </span>
    );
  };

  // Helper for Supervisor Review Column
  const renderSupervisorReview = (reviewedBy) => {
    if (reviewedBy && reviewedBy !== 'Pending Review') {
      const match = reviewedBy.match(/^(.*?)(?:\s*\((.*?)\))?$/);
      const name = match ? match[1].trim() : reviewedBy;
      const role = match && match[2] ? match[2].trim() : null;

      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 text-xs block truncate" title={name}>
              {name}
            </span>
            {role && (
              <span className="text-[10px] text-slate-500 font-medium block truncate">
                {role}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/70 border border-amber-200/60 text-amber-800 text-[11px] font-medium">
        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
        <span>Pending Review</span>
      </span>
    );
  };

  // High-Grade Enterprise Table Columns
  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      width: '130px',
      minWidth: '120px',
      render: (row) => {
        const meta = formatDateMeta(row.date);
        return (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#F5F9FF] border border-[#D4E4F7] flex flex-col items-center justify-center shrink-0 shadow-2xs text-[#1D5FA7]">
              <span className="text-[8px] font-extrabold uppercase tracking-tight leading-none text-[#1D5FA7]">
                {meta.month}
              </span>
              <span className="text-xs font-black font-mono leading-none mt-0.5 text-[#123B6D]">
                {meta.day}
              </span>
            </div>
            <div className="min-w-0">
              <span className="font-mono text-xs font-bold text-slate-900 block leading-tight">
                {row.date}
              </span>
              {meta.weekday && (
                <span className="text-[10px] text-slate-500 font-medium block">
                  {meta.weekday}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
      width: '200px',
      minWidth: '180px',
      render: (row) => {
        const name = getEmployeeDisplayName(row);
        const { initials, colorClass } = getAvatarMeta(name);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs ${colorClass}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 text-xs block truncate" title={name}>
                {name}
              </span>
              <span className="inline-block mt-0.5 text-[10px] text-slate-600 font-mono font-semibold bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded">
                {row.employeeId || 'STAFF'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Work Classification',
      accessor: 'workType',
      width: '210px',
      minWidth: '180px',
      render: (row) => renderWorkTypeBadge(row.workType),
    },
    {
      header: 'Operational Description',
      accessor: 'workDescription',
      minWidth: '260px',
      render: (row) => renderDescription(row.workDescription),
    },
    {
      header: 'Hours',
      accessor: 'hoursWorked',
      width: '105px',
      minWidth: '95px',
      align: 'center',
      render: (row) => (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 font-mono font-bold text-xs shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>{Number(row.hoursWorked || 0).toFixed(1)} hrs</span>
        </div>
      ),
    },
    {
      header: 'Approval Status',
      accessor: 'status',
      width: '140px',
      minWidth: '130px',
      align: 'center',
      render: (row) => renderStatusBadge(row.status),
    },
    {
      header: 'Supervisor Review',
      accessor: 'reviewedBy',
      width: '190px',
      minWidth: '170px',
      render: (row) => renderSupervisorReview(row.reviewedBy),
    },
    {
      header: 'Action',
      accessor: 'action',
      width: '150px',
      minWidth: '140px',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {canReview && (row.status === 'Submitted' || (row.status || '').toLowerCase() === 'submitted') && (
            <button
              type="button"
              onClick={() => handleOpenReview(row)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white border border-amber-500 text-xs font-bold cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Review</span>
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
                className="p-1.5 rounded-xl hover:bg-blue-50 text-slate-500 hover:text-[#1D5FA7] border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                title="Edit Work Log"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete work log for ${getEmployeeDisplayName(row)}?`)) {
                    deleteDailyWork(row.id);
                    setToastMessage(`Daily work entry ${row.id} deleted.`);
                  }
                }}
                className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
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
    <div className="space-y-5">
      {/* Top Banner & Submit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-[#D4E4F7] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1D5FA7] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Daily Workforce Duty & Execution Log</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Record batching volumes, transit mixer rounds, slump tests, and site discharge execution.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenSubmit}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Work Log</span>
        </button>
      </div>

      {/* Industrial Operational KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#D4E4F7] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Total Logged</span>
            <FileText className="w-4 h-4 text-[#1D5FA7]" />
          </div>
          <div className="text-xl font-mono font-black text-slate-900 mt-1">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Duty entries recorded</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D4E4F7] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Total Hours Executed</span>
            <Clock className="w-4 h-4 text-[#246BCE]" />
          </div>
          <div className="text-xl font-mono font-black text-slate-900 mt-1">
            {stats.totalHours.toFixed(1)} <span className="text-xs font-sans font-bold text-slate-500">hrs</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Shift operational duration</div>
        </div>

        <div
          onClick={() => setStatusFilter('SUBMITTED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'SUBMITTED'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-[#D4E4F7] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
            <span>Pending Signoff</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-mono font-black text-amber-900 mt-1">
            {stats.submitted}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Awaiting supervisor review</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-[#D4E4F7] hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
            <span>Approved & Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-mono font-black text-emerald-900 mt-1">
            {stats.approved}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Matched with plant telemetry</div>
        </div>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Logs</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-mono font-bold text-slate-700 border border-slate-200">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'SUBMITTED'
                ? 'bg-white text-amber-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Review</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono font-bold border border-amber-200">
              {stats.submitted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'APPROVED'
                ? 'bg-white text-emerald-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Approved</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
              {stats.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'REJECTED'
                ? 'bg-white text-rose-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Rejected</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold border border-rose-200">
              {stats.rejected}
            </span>
          </button>
        </div>

        {statusFilter !== 'ALL' && (
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className="text-xs text-[#1D5FA7] hover:underline font-semibold cursor-pointer"
          >
            Clear status filter
          </button>
        )}
      </div>

      {/* Daily Work Table */}
      <DataTable
        title="Operational Execution History"
        subtitle="Submitted duty logs awaiting supervisor signoff and attendance matching"
        icon={FileText}
        columns={columns}
        data={filteredWork}
        tableMinWidth="min-w-[1050px]"
        renderMobileCard={(row) => {
          const name = getEmployeeDisplayName(row);
          const { initials, colorClass } = getAvatarMeta(name);
          return (
            <div className="w-full max-w-full overflow-hidden min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${colorClass}`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{name}</div>
                    <div className="text-xs font-mono text-slate-500 font-semibold">{row.employeeId || 'STAFF'} • {row.date}</div>
                  </div>
                </div>
                {renderStatusBadge(row.status)}
              </div>

              <div className="pt-1">
                {renderWorkTypeBadge(row.workType)}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Execution Log</div>
                {renderDescription(row.workDescription)}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
                <span className="flex items-center gap-1 font-mono font-bold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> {Number(row.hoursWorked || 0).toFixed(1)} hrs
                </span>
                <span className="text-[11px] text-slate-500">
                  {row.reviewedBy ? `Signoff: ${row.reviewedBy}` : 'Pending review'}
                </span>
              </div>

              {canReview && (row.status === 'Submitted' || (row.status || '').toLowerCase() === 'submitted') && (
                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleOpenReview(row)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-xs hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Review Submission</span>
                  </button>
                </div>
              )}
            </div>
          );
        }}
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
