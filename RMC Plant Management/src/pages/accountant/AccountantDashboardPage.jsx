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
  ReceiptText,
  IndianRupee,
  CreditCard,
  FileCheck2,
  TrendingUp,
  Layers,
  Plus,
  FileText,
  AlertCircle,
  Download,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { MOCK_ACCOUNTANT_DATA } from '../../data/mockDashboardData';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import { formatToIndian12Hr } from '../../utils/shiftUtils';

// Phase 1 Workforce Views
import PayrollPreparationView from '../../components/workforce/PayrollPreparationView';
import AdvanceManagementView from '../../components/workforce/AdvanceManagementView';
import LoanManagementView from '../../components/workforce/LoanManagementView';
import HrReportsView from '../../components/workforce/HrReportsView';
import BillingManagementView from '../../components/billing/BillingManagementView';
import RolePersonalAttendanceView from '../../components/workforce/RolePersonalAttendanceView';

export default function AccountantDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [ledgers, setLedgers] = useState(MOCK_ACCOUNTANT_DATA.customerLedgers);

  const {
    payrollRecords,
    advances,
    loans,
    employees,
    attendance
  } = useWorkforce();

  const todayStr = new Date().toISOString().split('T')[0];
  const accountantTodayAttendance = (attendance || []).find(
    (a) => a.date === todayStr &&
      ((a.employeeId && a.employeeId.toUpperCase() === 'ACC-001') ||
       (a.employeeId && user?.employeeId && a.employeeId.toUpperCase() === user.employeeId.toUpperCase()) ||
       (a.employeeId && user?.id && a.employeeId.toUpperCase() === user.id.toUpperCase()))
  );
  const isAccountantClockedIn = Boolean(accountantTodayAttendance?.punchIn);
  const isAccountantShiftEnded = Boolean(accountantTodayAttendance?.punchOut);

  // Phase 1 Payroll & Advances stats
  const pendingPayrollCount = payrollRecords.filter((p) => p.status === 'Calculated' || p.status === 'Draft').length;
  const approvedPayrollCount = payrollRecords.filter((p) => p.status === 'Approved' || p.status === 'Locked').length;
  const advanceOutstanding = advances.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const loanOutstanding = loans.reduce((sum, l) => sum + (Number(l.outstandingBalance) || 0), 0);
  const totalGrossSalaries = payrollRecords.reduce((sum, p) => sum + (Number(p.grossSalary) || 0), 0);

  const { kpis, invoiceBreakdown, revenueTrend, expenseSummary } = MOCK_ACCOUNTANT_DATA;

  // New Invoice Form
  const [invForm, setInvForm] = useState({
    client: '',
    amount: '',
    grade: '',
    volume: '',
    dueDate: '',
  });

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    const newInv = {
      client: invForm.client,
      invoice: `INV-2026-${Math.floor(8810 + Math.random() * 90)}`,
      amount: invForm.amount,
      dueDate: invForm.dueDate,
      status: 'Pending',
      grade: invForm.grade,
      volume: invForm.volume,
    };
    setLedgers([newInv, ...ledgers]);
    setShowInvoiceModal(false);
    setToastMessage(`Tax Invoice ${newInv.invoice} created successfully!`);
  };

  const columns = [
    { header: 'Invoice #', accessor: 'invoice', render: (row) => <span className="font-mono text-emerald-400 font-bold">{row.invoice}</span> },
    { header: 'Client Account', accessor: 'client', render: (row) => <span className="font-semibold text-white">{row.client}</span> },
    { header: 'Mix Grade', accessor: 'grade', render: (row) => <span className="px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300/80 font-mono text-[10px]">{row.grade}</span> },
    { header: 'Billed Volume', accessor: 'volume', className: 'font-mono text-slate-300' },
    { header: 'Amount (INR)', accessor: 'amount', render: (row) => <span className="font-bold text-white font-mono">{row.amount}</span> },
    { header: 'Due Date', accessor: 'dueDate', className: 'font-mono text-slate-400' },
    { header: 'Payment Status', accessor: 'status', type: 'status' },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => setToastMessage(`Challan & GST e-Invoice ${row.invoice} downloaded`)}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs transition-colors"
        >
          View PDF
        </button>
      ),
    },
  ];

  return (
    <AppLayout
      title={activeTab === 'dashboard' ? 'Finance & Invoicing' : null}
      badge={activeTab === 'dashboard' ? 'ACCOUNTS' : null}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        activeTab === 'dashboard' ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                isAccountantClockedIn && !isAccountantShiftEnded
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7]'
              }`}
              title="Mark or View Daily Attendance"
            >
              <Clock className={`w-3.5 h-3.5 ${isAccountantClockedIn && !isAccountantShiftEnded ? 'text-emerald-600 animate-pulse' : 'text-[#1D5FA7]'}`} />
              <span>{isAccountantClockedIn && !isAccountantShiftEnded ? 'On Duty' : 'Daily Attendance'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ReceiptText className="w-3.5 h-3.5" />
              <span>Cash Memo / Billing</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#1D5FA7]" />
              <span>Record Payment</span>
            </button>
          </div>
        ) : null
      }
    >
      {activeTab === 'attendance' && (
        <RolePersonalAttendanceView
          defaultRole="Accountant"
          defaultEmpId="ACC-001"
          defaultDepartment="Finance & Accounts"
          onPunched={() => setToastMessage('Accountant daily attendance synced successfully!')}
        />
      )}
      {activeTab === 'billing' && <BillingManagementView defaultSection="cash_memos" />}
      {activeTab === 'purchases' && <BillingManagementView defaultSection="purchases" />}
      {activeTab === 'otp_audit' && <BillingManagementView defaultSection="otp_audit" />}
      {activeTab === 'payroll' && <PayrollPreparationView />}
      {activeTab === 'advances' && <AdvanceManagementView />}
      {activeTab === 'loans' && <LoanManagementView />}
      {activeTab === 'reports' && <HrReportsView />}

      {activeTab === 'dashboard' && (
        <div className="w-full flex-1 flex flex-col space-y-4 pb-6 min-w-0">
          
          {/* Accountant Daily Duty & Attendance Quick Card */}
          <section className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#D4E4F7] shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] border border-[#D4E4F7] text-[#1D5FA7] flex items-center justify-center font-bold shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-black uppercase tracking-wide">
                    Accountant Daily Attendance
                  </h3>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EAF3FF] text-black border border-[#D4E4F7]">
                    ACC-001
                  </span>
                </div>
                <p className="text-[11px] text-slate-700">
                  {isAccountantClockedIn && !isAccountantShiftEnded
                    ? `Clocked In at ${formatToIndian12Hr(accountantTodayAttendance?.punchIn)} • Biometric & GPS verified`
                    : isAccountantShiftEnded
                    ? `Shift Concluded at ${formatToIndian12Hr(accountantTodayAttendance?.punchOut)} (${accountantTodayAttendance?.workingHours || 8}h worked)`
                    : 'Awaiting Today\'s Attendance Punch-In • Shift: 09:00 AM - 06:00 PM'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isAccountantClockedIn && !isAccountantShiftEnded
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-[#1D5FA7] hover:bg-[#123B6D] text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isAccountantClockedIn && !isAccountantShiftEnded ? 'Punch Out / End Shift →' : 'Punch In for Today →'}</span>
              </button>
            </div>
          </section>
          {/* Phase 1 Payroll & Advances Financial Telemetry Strip */}
          <section className="p-4.5 rounded-3xl bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/90 border border-emerald-200/90 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-800 font-bold block tracking-wider">
                  WORKFORCE PAYROLL & RECOVERY TELEMETRY
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {employees.length} Staff Enrolled • Monthly Gross Wages: <span className="font-mono font-black text-emerald-700">₹ {totalGrossSalaries.toLocaleString('en-IN')}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                Pending Payroll: <strong className="text-amber-700 font-bold">{pendingPayrollCount}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                Advance Book: <strong className="text-rose-700 font-bold">₹ {advanceOutstanding.toLocaleString('en-IN')}</strong>
              </span>
              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                Loan Book: <strong className="text-cyan-700 font-bold">₹ {loanOutstanding.toLocaleString('en-IN')}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('payroll')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold font-sans cursor-pointer shadow-xs transition-all active:scale-[0.98]"
              >
                Open Payroll Prep →
              </button>
            </div>
          </section>

          {/* 4 Primary KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            <KPICard
              title="Today's Revenue"
              value={kpis.todayRevenue}
              subtext={kpis.todayRevenue !== '₹ 0' ? `${kpis.todayInvoices} Delivery Challans billed` : "No billing transactions recorded today"}
              trend="Today"
              trendType="neutral"
              color="emerald"
              icon={IndianRupee}
            />
            <KPICard
              title="Monthly Gross Sales"
              value={kpis.totalMonthSales}
              subtext="FY 2026-27 Q3 Operating Gross"
              trend="Current"
              trendType="neutral"
              color="blue"
              icon={TrendingUp}
            />
            <KPICard
              title="Outstanding Receivables"
              value={kpis.outstandingReceivables}
              subtext="Within 30-day corporate credit"
              trend={invoiceBreakdown.overdue > 0 ? `${invoiceBreakdown.overdue} Overdue` : "Clear"}
              trendType={invoiceBreakdown.overdue > 0 ? "down" : "neutral"}
              color="amber"
              icon={ReceiptText}
            />
            <KPICard
              title="Monthly Material Expenses"
              value={kpis.monthlyExpenses}
              subtext="Cement, aggregates, fuel & power"
              trend="Controlled"
              trendType="neutral"
              color="rose"
              icon={Layers}
            />
          </section>

          {/* Primary Operations Table: Customer Payment & Ledger Table */}
          <section>
            <DataTable
              title="Customer Invoices & Ledger Table"
              subtitle="Tax invoices generated from electronic batch delivery tickets"
              icon={ReceiptText}
              columns={columns}
              data={ledgers}
              searchPlaceholder="Search client, invoice number, mix grade..."
              renderMobileCard={(inv) => (
                <div className="w-full max-w-full overflow-hidden min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-bold text-emerald-700 truncate">{inv.invoice}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">{inv.client}</div>
                      <div className="text-xs text-slate-500 truncate">Mix: {inv.grade} • {inv.volume}</div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Amount:</span>
                      <span className="font-bold text-slate-900 font-mono text-sm">{inv.amount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Due Date:</span>
                      <span className="font-mono text-slate-700">{inv.dueDate}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setToastMessage(`Downloading Invoice ${inv.invoice}`)}
                      className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl cursor-pointer transition-colors"
                    >
                      Download Challan PDF
                    </button>
                  </div>
                </div>
              )}
            />
          </section>

          {/* Invoice Status Distribution & Revenue Trend Chart */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Invoice Status Snapshot Card */}
            <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ReceiptText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Invoice Pipeline</span>
                  </h3>
                  <span className="text-[9px] font-mono text-slate-500 font-semibold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                    {invoiceBreakdown.paid + invoiceBreakdown.pending + invoiceBreakdown.overdue} TOTAL
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="p-2 rounded-md bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-900 block">Paid & Reconciled</span>
                      <span className="text-[9.5px] text-slate-500">Direct NEFT/RTGS bank settlements</span>
                    </div>
                    <span className="text-base font-bold text-emerald-700 font-mono">{invoiceBreakdown.paid}</span>
                  </div>

                  <div className="p-2 rounded-md bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-amber-900 block">Pending Clearance</span>
                      <span className="text-[9.5px] text-slate-500">Awaiting credit period maturity</span>
                    </div>
                    <span className="text-base font-bold text-amber-700 font-mono">{invoiceBreakdown.pending}</span>
                  </div>

                  <div className="p-2 rounded-md bg-rose-50/80 border border-rose-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-rose-900 block">Overdue (&gt; 30 Days)</span>
                      <span className="text-[9.5px] text-slate-500">Follow-up reminders issued</span>
                    </div>
                    <span className="text-base font-bold text-rose-700 font-mono">{invoiceBreakdown.overdue}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                <span>GST E-Way Bills: 100% Synced</span>
                <span className="text-emerald-700 font-bold">• Zero Non-Compliance</span>
              </div>
            </div>

            {/* 7-Day Revenue & Collection Chart */}
            <div className="lg:col-span-2">
              <ChartCard
                title="Daily Revenue vs Cash Collections (Lakhs INR)"
                subtitle="Real-time cashflow balance from electronic invoice reconciliations"
                icon={TrendingUp}
                data={revenueTrend}
                dataKey="revenue"
                labelKey="day"
                unit="Lakhs"
                color="emerald"
                secondaryKey="collections"
                secondaryUnit="Lakhs"
              />
            </div>
          </section>

          {/* Quick Actions & Cost Breakdown */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Finance Operations Quick Commands
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <QuickAction
                  icon={ReceiptText}
                  title="Create Invoice"
                  desc="Draft GST delivery challan"
                  color="emerald"
                  onClick={() => setShowInvoiceModal(true)}
                />
                <QuickAction
                  icon={CreditCard}
                  title="Record Payment"
                  desc="Log RTGS / NEFT transfer"
                  color="blue"
                  onClick={() => setShowPaymentModal(true)}
                />
                <QuickAction
                  icon={IndianRupee}
                  title="Receivables"
                  desc="Inspect client aged ledgers"
                  color="amber"
                  onClick={() => setToastMessage(`Filtered to ${kpis.outstandingReceivables || '₹ 0'} pending receivables.`)}
                />
                <QuickAction
                  icon={FileText}
                  title="GST Audit"
                  desc="Export GSTR-1 & B2B report"
                  color="purple"
                  onClick={() => setToastMessage('GSTR-1 report export initiated.')}
                />
              </div>

              {invoiceBreakdown.overdue > 0 && (
                <AlertCard
                  title="Overdue Balance Notice Issued"
                  desc="Outstanding client invoices exceeded 30 days. Auto-reminder sent to accounts department."
                  time="Today"
                  type="warning"
                  actionLabel="View Statement"
                  onAction={() => setToastMessage('Opened Overdue Account Statements')}
                />
              )}
            </div>

            {/* Expense Summary Breakdown Card */}
            <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Monthly Raw Material Costings</span>
              </h3>

              <div className="space-y-2">
                {expenseSummary.length > 0 ? (
                  expenseSummary.map((exp, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-medium truncate max-w-[65%]">{exp.category}</span>
                        <span className="font-bold text-slate-900 font-mono text-xs">{exp.amount}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full shadow-2xs"
                          style={{ width: `${exp.percent}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400 font-medium">
                    No expense breakdown records logged for the current period.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Create Tax Invoice / Delivery Challan"
        subtitle="Generate B2B tax invoice against verified batching tickets."
        icon={ReceiptText}
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Client Account *
            </label>
            <input
              type="text"
              required
              value={invForm.client}
              onChange={(e) => setInvForm({ ...invForm, client: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Concrete Mix
              </label>
              <input
                type="text"
                value={invForm.grade}
                onChange={(e) => setInvForm({ ...invForm, grade: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Billed Volume
              </label>
              <input
                type="text"
                value={invForm.volume}
                onChange={(e) => setInvForm({ ...invForm, volume: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Total Amount (INR) *
              </label>
              <input
                type="text"
                required
                value={invForm.amount}
                onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="text"
                value={invForm.dueDate}
                onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowInvoiceModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            >
              Generate Invoice
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Client Payment Receipt"
        subtitle="Match NEFT / RTGS / UTR number with outstanding tax invoices."
        icon={CreditCard}
      >
        <div className="space-y-3 text-xs text-slate-300">
          <p className="text-slate-400">
            Payment gateway hook is enabled. Invoices marked as 'Paid' will automatically update client ledger limits in real time.
          </p>
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 font-mono text-emerald-800">
            Auto-reconciliation active via virtual bank account numbers.
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setShowPaymentModal(false);
                setToastMessage('Payment recorded and synced with tally ledger.');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950"
            >
              Record Payment
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </AppLayout>
  );
}
