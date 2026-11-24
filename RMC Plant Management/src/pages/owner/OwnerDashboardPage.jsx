import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import KPICard from '../../components/dashboard/KPICard';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import {
  Building2,
  IndianRupee,
  Layers,
  Users,
  Clock,
  Receipt,
  Factory
} from 'lucide-react';
import { MOCK_OWNER_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';

// Workforce & Operations Views
import EmployeeManagementView from '../../components/workforce/EmployeeManagementView';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import PayrollPreparationView from '../../components/workforce/PayrollPreparationView';
import HrReportsView from '../../components/workforce/HrReportsView';
import BillingManagementView from '../../components/billing/BillingManagementView';
import RolePersonalAttendanceView from '../../components/workforce/RolePersonalAttendanceView';
import ApprovalsView from '../../components/workforce/ApprovalsView';
import AuditLogsView from '../../components/workforce/AuditLogsView';
import AdvanceManagementView from '../../components/workforce/AdvanceManagementView';
import LoanManagementView from '../../components/workforce/LoanManagementView';

export default function OwnerDashboardPage() {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab');
      if (urlTab) return urlTab;
      const saved = sessionStorage.getItem('rmc_owner_active_tab');
      if (saved) return saved;
    } catch {}
    return 'dashboard';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('rmc_owner_active_tab', tab);
      const url = new URL(window.location.href);
      if (tab === 'dashboard') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = urlParams.get('tab') || 'dashboard';
        setActiveTabState(urlTab);
        sessionStorage.setItem('rmc_owner_active_tab', urlTab);
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const { employees, attendance } = useWorkforce();
  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const attendanceRate = Math.min(100, Math.round((presentCount / (employees.length || 1)) * 100));

  const { kpis, plantComparison } = MOCK_OWNER_DATA;

  const plantColumns = [
    {
      header: 'Plant Unit',
      accessor: 'plant',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs">{row.plant}</span>
          <span className="text-[10px] text-emerald-700 block font-semibold">● Online</span>
        </div>
      )
    },
    { header: 'Production', accessor: 'production', className: 'font-mono font-bold text-slate-900' },
    { header: 'Target', accessor: 'target', className: 'font-mono text-slate-500' },
    { header: 'Revenue', accessor: 'revenue', className: 'font-mono font-bold text-emerald-700' },
    { header: 'Dispatches', accessor: 'dispatches', className: 'font-mono text-slate-700' },
    { header: 'Status', accessor: 'status', type: 'status' },
  ];

  return (
    <AppLayout
      title="Executive Cockpit"
      badge="OWNER / DIRECTOR"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Mark or View Executive Attendance"
          >
            <Clock className="w-3.5 h-3.5 text-[#1D5FA7]" />
            <span>Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('billing')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Sales Register</span>
          </button>
        </div>
      }
    >
      {activeTab === 'employees' && <EmployeeManagementView />}
      {activeTab === 'attendance' && (
        <RolePersonalAttendanceView
          defaultRole="Owner / Director"
          defaultEmpId="OWN-001"
          defaultDepartment="Executive Leadership"
          canSwitchToTeamView={true}
          teamViewComponent={<AttendanceManagementView />}
        />
      )}
      {activeTab === 'payroll' && <PayrollPreparationView />}
      {activeTab === 'advances' && <AdvanceManagementView />}
      {activeTab === 'loans' && <LoanManagementView />}
      {activeTab === 'approvals' && <ApprovalsView />}
      {activeTab === 'audit' && <AuditLogsView />}
      {activeTab === 'billing' && <BillingManagementView />}
      {activeTab === 'reports' && <HrReportsView />}

      {(!['employees', 'attendance', 'payroll', 'advances', 'loans', 'approvals', 'audit', 'billing', 'reports'].includes(activeTab) || activeTab === 'dashboard') && (
        <div className="w-full flex-1 flex flex-col space-y-4 pb-6 min-w-0">
          
          {/* 4 Simple, Bold Executive Metric Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <KPICard
              title="Month Revenue"
              value={kpis.totalRevenue || "₹ 42,50,000"}
              subtext="Total Billed"
              trend="Verified"
              trendType="positive"
              color="emerald"
              icon={IndianRupee}
            />
            <KPICard
              title="Concrete Dispatched"
              value={kpis.totalProduction || "1,420 m³"}
              subtext="All Units"
              trend="On Track"
              trendType="positive"
              color="amber"
              icon={Layers}
            />
            <KPICard
              title="Staff On Duty"
              value={`${presentCount || 7} / ${employees.length || 8}`}
              subtext={`${attendanceRate || 88}% Present Today`}
              trend="Active"
              trendType="positive"
              color="blue"
              icon={Users}
            />
            <KPICard
              title="Plant Status"
              value="3 / 3 Units"
              subtext="Operating Normally"
              trend="Online"
              trendType="positive"
              color="cyan"
              icon={Building2}
            />
          </section>

          {/* Plant Operations Summary Table */}
          <section>
            <DataTable
              title="Plant Operations Summary"
              subtitle="Daily production, revenue, and dispatch overview by plant unit"
              icon={Factory}
              columns={plantColumns}
              data={plantComparison}
              searchPlaceholder="Search plant..."
              renderMobileCard={(p) => (
                <div className="w-full max-w-full overflow-hidden min-w-0 p-1">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 truncate">{p.plant}</div>
                      <div className="text-xs text-slate-500">Dispatches: {p.dispatches} Loads</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Production:</span>
                      <span className="font-mono font-bold text-slate-900">{p.production}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Revenue:</span>
                      <span className="font-mono font-bold text-emerald-700">{p.revenue}</span>
                    </div>
                  </div>
                </div>
              )}
            />
          </section>

          {/* Fast Quick Links */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className="p-3.5 rounded-2xl bg-white border border-[#D4E4F7] hover:border-[#1D5FA7] hover:bg-[#F5F9FF] transition-all cursor-pointer text-left shadow-2xs flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Attendance Roster</h4>
                  <p className="text-[11px] text-slate-500 font-medium">View today's staff punches</p>
                </div>
              </div>
              <span className="text-slate-400 group-hover:text-blue-600 font-bold text-sm">→</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className="p-3.5 rounded-2xl bg-white border border-[#D4E4F7] hover:border-[#1D5FA7] hover:bg-[#F5F9FF] transition-all cursor-pointer text-left shadow-2xs flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Sales & Billing</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Cash memos and payments</p>
                </div>
              </div>
              <span className="text-slate-400 group-hover:text-emerald-600 font-bold text-sm">→</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('employees')}
              className="p-3.5 rounded-2xl bg-white border border-[#D4E4F7] hover:border-[#1D5FA7] hover:bg-[#F5F9FF] transition-all cursor-pointer text-left shadow-2xs flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Employee Directory</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Workforce details & roles</p>
                </div>
              </div>
              <span className="text-slate-400 group-hover:text-purple-600 font-bold text-sm">→</span>
            </button>
          </section>

        </div>
      )}
    </AppLayout>
  );
}
