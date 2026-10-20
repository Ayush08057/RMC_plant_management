import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter,
  Clock
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';

export default function AuditLogsView() {
  const { auditLogs } = useWorkforce();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');

  const modules = [
    'All', 
    'Employee Management', 
    'Attendance', 
    'Shift Management', 
    'Daily Work', 
    'Leave Management', 
    'Advance Management', 
    'Loan Management', 
    'Payroll Preparation', 
    'Employee Documents', 
    'Settings'
  ];

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = selectedModule === 'All' || log.module === selectedModule;
    return matchesSearch && matchesModule;
  });

  const getModuleBadgeStyle = (mod) => {
    const m = (mod || '').toLowerCase();
    if (m.includes('payroll') || m.includes('billing')) return 'bg-indigo-50 text-indigo-700 border-indigo-200/90';
    if (m.includes('attendance') || m.includes('shift')) return 'bg-cyan-50 text-cyan-700 border-cyan-200/90';
    if (m.includes('employee') || m.includes('document')) return 'bg-purple-50 text-purple-700 border-purple-200/90';
    if (m.includes('leave') || m.includes('advance') || m.includes('loan')) return 'bg-amber-50 text-amber-800 border-amber-200/90';
    return 'bg-blue-50 text-blue-700 border-blue-200/90';
  };

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      width: '125px',
      render: (row) => (
        <div className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-700 font-bold bg-slate-100/90 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">
          <Clock className="w-3 h-3 text-cyan-600 shrink-0" />
          <span>{row.timestamp}</span>
        </div>
      ),
    },
    {
      header: 'User & Role',
      accessor: 'user',
      width: '17%',
      render: (row) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-[9.5px] flex items-center justify-center shrink-0 shadow-xs border border-cyan-400/30">
            {row.user ? row.user[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1 truncate">
            <span className="font-bold text-slate-900 text-[11px] block leading-tight truncate" title={row.user}>{row.user}</span>
            <span className="text-[9px] text-slate-500 font-mono block truncate" title={row.role}>{row.role}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'System Module',
      accessor: 'module',
      width: '120px',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border truncate block text-center shadow-2xs ${getModuleBadgeStyle(row.module)}`} title={row.module}>
          {row.module}
        </span>
      ),
    },
    { 
      header: 'Action Performed', 
      accessor: 'action', 
      width: '21%',
      render: (row) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
          <span className="text-[11px] font-bold text-slate-900 truncate block" title={row.action}>
            {row.action}
          </span>
        </div>
      ) 
    },
    {
      header: 'Affected Record Details',
      accessor: 'record',
      className: 'min-w-0 flex-1',
      render: (row) => (
        <span 
          title={row.record}
          className="text-[9.5px] text-slate-700 font-mono block truncate w-full bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/80 shadow-2xs cursor-help"
        >
          {row.record}
        </span>
      ),
    },
    { 
      header: 'Status', 
      accessor: 'status', 
      type: 'status', 
      width: '80px',
      align: 'right' 
    },
  ];

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none focus:border-cyan-600 cursor-pointer shadow-2xs"
        >
          {modules.map((m) => (
            <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>
          ))}
        </select>
      </div>

      <div className="relative w-44 sm:w-52">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search audit trail..."
          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 transition-all font-medium shadow-2xs"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Connected Audit Logs Table */}
      <DataTable
        title="Enterprise System Audit Trail"
        subtitle="Read-only chronological ledger of all modifications across Phase 1 workforce operations"
        icon={ShieldCheck}
        columns={columns}
        data={filteredLogs}
        searchable={false}
        actions={headerActions}
        noScroll={true}
        tableFixed={true}
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">{row.action}</div>
                <div className="text-[10.5px] text-cyan-700 font-mono font-bold">{row.timestamp}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="text-[11px] text-slate-600">
              Operator: <strong className="text-slate-900">{row.user}</strong> ({row.role})
            </div>

            <div className="text-xs font-mono text-indigo-700 pt-1">
              Module: {row.module}
            </div>

            <p className="text-[10.5px] text-slate-600 font-mono pt-1 border-t border-slate-100 truncate">
              Details: {row.record}
            </p>
          </div>
        )}
      />
    </div>
  );
}
