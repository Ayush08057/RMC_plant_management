import React, { useState } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import KPICard from '../../components/dashboard/KPICard';
import ChartCard from '../../components/dashboard/ChartCard';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import QuickAction from '../../components/dashboard/QuickAction';
import AlertCard from '../../components/dashboard/AlertCard';
import Modal from '../../components/dashboard/Modal';
import Toast from '../../components/dashboard/Toast';
import { 
  Building2, 
  IndianRupee, 
  Truck, 
  ShieldCheck, 
  TrendingUp, 
  Layers, 
  Users, 
  Download, 
  FileText,
  Activity,
  Award
} from 'lucide-react';
import { MOCK_OWNER_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';

// Phase 1 Workforce Views
import EmployeeManagementView from '../../components/workforce/EmployeeManagementView';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import PayrollPreparationView from '../../components/workforce/PayrollPreparationView';
import HrReportsView from '../../components/workforce/HrReportsView';
import BillingManagementView from '../../components/billing/BillingManagementView';

export default function OwnerDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);
  const [showBoardModal, setShowBoardModal] = useState(false);

  const { employees, attendance, payrollRecords, advances, loans, leaves } = useWorkforce();
  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const attendanceRate = Math.min(100, Math.round((presentCount / (employees.length || 1)) * 100));
  const totalPayroll = payrollRecords.reduce((sum, p) => sum + (Number(p.grossSalary) || 0), 0);
  const totalRecoverables = advances.reduce((s, a) => s + (Number(a.balance) || 0), 0) + loans.reduce((s, l) => s + (Number(l.outstandingBalance) || 0), 0);

  const { kpis, plantComparison, topClients, managementInsights } = MOCK_OWNER_DATA;

  const plantColumns = [
    { 
      header: 'Plant Node', 
      accessor: 'plant', 
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs">{row.plant}</span>
          <span className="text-[10px] text-slate-500 block font-mono">SCADA Connected</span>
        </div>
      ) 
    },
    { header: 'Actual Production', accessor: 'production', className: 'font-mono font-bold text-slate-900' },
    { header: 'Target Goal', accessor: 'target', className: 'font-mono text-slate-500' },
    { header: 'Gross Revenue', accessor: 'revenue', className: 'font-mono font-bold text-emerald-700' },
    { header: 'Dispatches', accessor: 'dispatches', className: 'font-mono text-slate-700' },
    { header: 'OEE Uptime', accessor: 'oee', className: 'font-mono text-cyan-700 font-bold' },
    { header: 'Operating Status', accessor: 'status', type: 'status' },
  ];

  const clientColumns = [
    { header: 'Enterprise Client', accessor: 'client', className: 'font-bold text-slate-900 text-xs' },
    { header: 'Billed Volume', accessor: 'volume', className: 'font-mono text-slate-700' },
    { header: 'Gross Billing', accessor: 'revenue', className: 'font-mono font-bold text-emerald-700' },
    { header: 'Revenue Share', accessor: 'share', className: 'font-mono text-amber-700 font-semibold' },
  ];

  // Trailing consolidated revenue trend
  const revenueTrendData = [];

  return (
    <AppLayout
      title="Executive Board & Ownership Cockpit"
      subtitle="High-level consolidated multi-plant revenue, production targets, client profitability, and asset uptime."
      badge="BOARD OF DIRECTORS COCKPIT"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowBoardModal(true)}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Award className="w-4 h-4" />
            <span>Board Summary</span>
          </button>
          <button
            type="button"
            onClick={() => setToastMessage('Executive EBITDA & consolidated PDF report generated.')}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-cyan-600" />
            <span className="hidden sm:inline">Export Executive Pack</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      }
    >
      {activeTab === 'employees' && <EmployeeManagementView />}
      {activeTab === 'attendance' && <AttendanceManagementView />}
      {activeTab === 'payroll' && <PayrollPreparationView />}
      {activeTab === 'billing' && <BillingManagementView />}
      {activeTab === 'reports' && <HrReportsView />}

      {activeTab === 'dashboard' && (
        <>
          {/* Executive Workforce Intelligence Strip */}
          <section className="p-4.5 rounded-3xl bg-gradient-to-r from-rose-50/90 via-white to-purple-50/90 border border-rose-200/90 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <div>
                <span className="text-[10px] font-mono uppercase text-rose-800 font-bold block tracking-wider">
                  BOARD WORKFORCE & PAYROLL OVERVIEW
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {employees.length} Enrolled Employees • {attendanceRate}% Today's Turnout • Gross Monthly Wages: <span className="font-mono font-black text-rose-700">₹ {totalPayroll.toLocaleString('en-IN')}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                Staff on Leave: <strong className="text-amber-700 font-bold">{leaves.filter(l => l.status === 'Approved').length}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                Advances Book: <strong className="text-cyan-700 font-bold">₹ {totalRecoverables.toLocaleString('en-IN')}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('employees')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white font-bold font-sans cursor-pointer shadow-xs transition-all active:scale-[0.98]"
              >
                Workforce Roster →
              </button>
            </div>
          </section>

          {/* 4 Primary KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Consolidated Month Revenue"
              value={kpis.totalRevenue}
              subtext={kpis.totalRevenue !== '₹ 0' ? "EBITDA Margin: 22.4%" : "Awaiting operational data"}
              trend="Current"
              trendType="neutral"
              color="rose"
              icon={IndianRupee}
            />
            <KPICard
              title="Total Concrete Production"
              value={kpis.totalProduction}
              subtext="Across active plant units"
              trend={kpis.totalProduction !== '0 m³' ? "Active Production" : "Standby"}
              trendType="neutral"
              color="amber"
              icon={Layers}
            />
            <KPICard
              title="Corporate Client Base"
              value={kpis.activeCustomers}
              subtext={kpis.activeCustomers !== '0 Clients' ? "Active registered clients" : "No active clients"}
              trend="Active Accounts"
              trendType="neutral"
              color="emerald"
              icon={Users}
            />
            <KPICard
              title="Overall Equipment Uptime (OEE)"
              value="100%"
              subtext="Zero catastrophic breakdowns"
              trend="Optimal"
              trendType="up"
              color="cyan"
              icon={Building2}
            />
          </section>

      {/* Executive Management Insights */}
      <section className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-50/90 via-white to-purple-50/90 border border-rose-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-rose-600" />
            <span>Executive Business Performance Insights</span>
          </h2>
          <span className="text-[10px] font-mono text-emerald-700 font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
            BOARD AUDIT VERIFIED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {managementInsights.length > 0 ? (
            managementInsights.map((ins, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{ins.title}</span>
                <div className="text-sm sm:text-base font-bold text-slate-900 truncate">{ins.value}</div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed font-medium">{ins.desc}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full py-4 text-center text-xs text-slate-500 font-medium">
              No executive performance insights generated yet. Telemetry will calibrate with live production data.
            </div>
          )}
        </div>
      </section>

      {/* Revenue Trend Visualizer & Top Accounts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard
            title="Consolidated Monthly Gross Revenue (Crores INR)"
            subtitle="Trailing 6-month commercial revenue performance across all batching plants"
            icon={TrendingUp}
            data={revenueTrendData}
            dataKey="revenue"
            labelKey="month"
            unit="Cr"
            color="rose"
          />
        </div>

        {/* Top 5 Revenue Contributing Clients */}
        <div className="p-5 rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Top Revenue Accounts</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500 font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200">TOP 5</span>
            </div>

            <div className="space-y-3">
              {topClients.length > 0 ? (
                topClients.map((client, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-bold truncate max-w-[65%]">{client.client}</span>
                      <span className="font-bold text-emerald-700 font-mono">{client.revenue}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{client.volume}</span>
                      <span className="text-amber-700 font-bold">{client.share} of gross</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  No client accounts billed yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Outstanding Due: {kpis.outstandingAmount}</span>
            <span className="text-emerald-700 font-bold">100% Verified</span>
          </div>
        </div>
      </section>

      {/* Multi-Plant Performance Comparison Table */}
      <section>
        <DataTable
          title="Multi-Plant Comparative Operations Table"
          subtitle="Real-time KPI comparison across central, coastal, and highway concrete nodes"
          icon={Building2}
          columns={plantColumns}
          data={plantComparison}
          searchPlaceholder="Search plant node..."
          renderMobileCard={(p) => (
            <div className="w-full max-w-full overflow-hidden min-w-0">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">{p.plant}</div>
                  <div className="text-xs text-slate-500">Dispatches: {p.dispatches} Loads</div>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-slate-200 text-[11px]">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Actual Production:</span>
                  <span className="font-mono font-bold text-slate-900 truncate block">{p.production}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Gross Revenue:</span>
                  <span className="font-mono font-bold text-emerald-700 truncate block">{p.revenue}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Target Goal:</span>
                  <span className="font-mono text-slate-600 truncate block">{p.target}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Equipment OEE:</span>
                  <span className="font-mono text-cyan-700 font-bold truncate block">{p.oee}</span>
                </div>
              </div>
            </div>
          )}
        />
      </section>

      {/* Major Operational Alerts for Directors */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <span>Executive Risk & Compliance Alerts</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-700 font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">NO ESCALATIONS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AlertCard
            title="Capital Expenditure ROI Validated"
            desc="Automated moisture probes installed at Plant Unit #01 achieved 4.2% cement savings over 60 days."
            time="Yesterday"
            type="success"
            actionLabel="View Analysis"
            onAction={() => setToastMessage('CapEx analysis sheet opened.')}
          />
          <AlertCard
            title="Credit Insurance Limit Review"
            desc="L&T Metro Infra credit ceiling raised to ₹ 2.50 Cr following spotless 6-month payment cycle."
            time="2 days ago"
            type="info"
            actionLabel="View Approval"
            onAction={() => setToastMessage('Credit approval ledger verified.')}
          />
        </div>
      </section>
      </>
      )}

      {/* Board Summary Modal */}
      <Modal
        isOpen={showBoardModal}
        onClose={() => setShowBoardModal(false)}
        title="Executive Board Summary Pack"
        subtitle="Consolidated high-level business briefing for ownership."
        icon={Award}
      >
        <div className="space-y-3 text-xs text-slate-700">
          <p className="text-slate-600 leading-relaxed font-medium">
            SM CONCRETECH continues to operate with healthy 22.4% gross operating margins across 3 plants. Quality pass rate is 98.4%, with zero customer rejections on major infrastructure piers.
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 font-mono text-xs">
            <div className="text-slate-900 font-bold">Active Transit Mixers: 24 Trucks</div>
            <div className="text-emerald-700 font-bold">Monthly Run Rate: ₹ 6.42 Cr</div>
            <div className="text-amber-700 font-bold">Average Turnaround Time: 38.4 mins</div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowBoardModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white shadow-xs cursor-pointer hover:bg-rose-700"
            >
              Close Briefing
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </AppLayout>
  );
}
