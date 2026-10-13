import React, { useState } from 'react';
import { 
  FileCheck2, 
  Download, 
  Filter, 
  Calendar, 
  Users, 
  Clock, 
  CreditCard, 
  Receipt, 
  Layers, 
  Printer,
  TrendingUp
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { MOCK_PLANTS } from '../../data/mockDashboardData';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Toast from '../dashboard/Toast';
import { formatToIndian12Hr } from '../../utils/shiftUtils';

export default function HrReportsView() {
  const { 
    employees, 
    attendance, 
    leaves, 
    advances, 
    loans, 
    payrollRecords 
  } = useWorkforce();

  const [activeReport, setActiveReport] = useState('attendance');
  const [selectedPlant, setSelectedPlant] = useState('All');
  const [toastMessage, setToastMessage] = useState(null);

  // Export CSV generator
  const exportToCSV = (filename, rows) => {
    if (!rows || rows.length === 0) {
      alert('No data available to export.');
      return;
    }
    const headers = Object.keys(rows[0]).join(',');
    const csvContent = [
      headers,
      ...rows.map((r) =>
        Object.values(r)
          .map((v) => `"${String(v !== null && v !== undefined ? v : '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage(`Exported ${filename}.csv successfully.`);
  };

  // Render specific report table
  const renderReportContent = () => {
    switch (activeReport) {
      case 'attendance': {
        const data = attendance.filter((a) => selectedPlant === 'All' || a.plant === selectedPlant);
        const cols = [
          { header: 'Date', accessor: 'date', className: 'font-mono text-xs text-slate-700 font-semibold' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-slate-900' },
          { header: 'Plant', accessor: 'plant' },
          { header: 'Punch In', accessor: 'punchIn', className: 'font-mono text-emerald-700 font-bold', render: (row) => formatToIndian12Hr(row.punchIn) || '--:--' },
          { header: 'Punch Out', accessor: 'punchOut', className: 'font-mono text-rose-600 font-semibold', render: (row) => formatToIndian12Hr(row.punchOut) || '--:--' },
          { header: 'Hours', accessor: 'workingHours', className: 'font-mono text-slate-800 font-bold' },
          { header: 'OT', accessor: 'overtimeHours', className: 'font-mono text-purple-700 font-bold' },
          { header: 'Status', accessor: 'status', type: 'status' },
        ];
        return (
          <DataTable
            title="Workforce Attendance & Punch Log"
            subtitle="Consolidated shift clocking, geofence validations, and overtime accrual"
            icon={Clock}
            columns={cols}
            data={data}
          />
        );
      }

      case 'overtime': {
        const data = attendance
          .filter((a) => (selectedPlant === 'All' || a.plant === selectedPlant) && (a.overtimeHours > 0 || a.workingHours > 8))
          .map((a) => ({
            ...a,
            overtimeHours: a.overtimeHours || 2,
            rate: '₹ 220/hr',
            estimatedPay: `₹ ${(Number(a.overtimeHours || 2) * 220 * 1.5).toFixed(0)}`,
          }));
        const cols = [
          { header: 'Date', accessor: 'date', className: 'font-mono text-xs text-slate-700 font-semibold' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-slate-900' },
          { header: 'Plant', accessor: 'plant' },
          { header: 'OT Hours', accessor: 'overtimeHours', className: 'font-mono font-bold text-purple-700' },
          { header: 'Hourly Rate', accessor: 'rate', className: 'font-mono text-slate-600' },
          { header: 'Est. OT Compensation', accessor: 'estimatedPay', className: 'font-mono font-bold text-emerald-700' },
        ];
        return (
          <DataTable
            title="Overtime & Night Pour Hours Report"
            subtitle="Extended foundation pours and highway night concrete hauling overtime ledger"
            icon={TrendingUp}
            columns={cols}
            data={data}
          />
        );
      }

      case 'leaves': {
        const data = leaves.filter((l) => selectedPlant === 'All' || l.plant === selectedPlant);
        const cols = [
          { header: 'ID', accessor: 'id', className: 'font-mono text-amber-800 font-bold' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-slate-900' },
          { header: 'Category', accessor: 'leaveType', className: 'text-purple-700 font-semibold' },
          { header: 'From', accessor: 'fromDate', className: 'font-mono text-slate-600' },
          { header: 'To', accessor: 'toDate', className: 'font-mono text-slate-600' },
          { header: 'Days', accessor: 'days', className: 'font-mono font-bold text-slate-900' },
          { header: 'Status', accessor: 'status', type: 'status' },
        ];
        return (
          <DataTable
            title="Leave Utilization & Absence Report"
            subtitle="Paid leave quotas, casual leaves, and unexcused absence patterns"
            icon={Calendar}
            columns={cols}
            data={data}
          />
        );
      }

      case 'advances': {
        const data = advances.filter((a) => selectedPlant === 'All' || a.plant === selectedPlant);
        const cols = [
          { header: 'Ref', accessor: 'id', className: 'font-mono text-amber-800 font-bold' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-slate-900' },
          { header: 'Requested', accessor: 'advanceAmount', render: (r) => `₹ ${r.advanceAmount.toLocaleString('en-IN')}` },
          { header: 'Approved', accessor: 'approvedAmount', render: (r) => `₹ ${(r.approvedAmount || 0).toLocaleString('en-IN')}` },
          { header: 'Recovered', accessor: 'recoveredAmount', render: (r) => `₹ ${(r.recoveredAmount || 0).toLocaleString('en-IN')}` },
          { header: 'Balance', accessor: 'balance', render: (r) => `₹ ${(r.balance || 0).toLocaleString('en-IN')}` },
          { header: 'Status', accessor: 'status', type: 'status' },
        ];
        return (
          <DataTable
            title="Salary Advance & Recovery Ledger"
            subtitle="Active disbursements and monthly recovery progress from payroll"
            icon={CreditCard}
            columns={cols}
            data={data}
          />
        );
      }

      case 'payroll': {
        const data = payrollRecords.filter((p) => selectedPlant === 'All' || p.plant === selectedPlant);
        const cols = [
          { header: 'Month', accessor: 'monthYear', className: 'font-mono text-amber-800 font-bold' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-slate-900' },
          { header: 'Basic', accessor: 'basicSalary', render: (r) => `₹ ${r.basicSalary?.toLocaleString('en-IN')}` },
          { header: 'OT Pay', accessor: 'otAmount', render: (r) => `+ ₹ ${r.otAmount?.toLocaleString('en-IN')}` },
          { header: 'Deductions', accessor: 'deduct', render: (r) => `- ₹ ${((r.advanceDeduction || 0) + (r.loanEmi || 0)).toLocaleString('en-IN')}` },
          { header: 'Net Take Home', accessor: 'netPayable', render: (r) => `₹ ${r.netPayable?.toLocaleString('en-IN')}`, className: 'font-bold text-emerald-700 font-mono' },
          { header: 'Status', accessor: 'status', type: 'status' },
        ];
        return (
          <DataTable
            title="Consolidated Monthly Payroll Audit"
            subtitle="Executive financial reconciliation of earned wages and statutory deductions"
            icon={Receipt}
            columns={cols}
            data={data}
          />
        );
      }

      case 'employees':
      default: {
        const data = employees.filter((e) => selectedPlant === 'All' || e.plant === selectedPlant);
        const cols = [
          { header: 'ID', accessor: 'id', className: 'font-mono text-amber-800 font-bold' },
          { header: 'Full Name', accessor: 'name', className: 'font-bold text-slate-900' },
          { header: 'Role', accessor: 'role' },
          { header: 'Department', accessor: 'department' },
          { header: 'Plant Location', accessor: 'plant' },
          { header: 'Mobile', accessor: 'mobile', className: 'font-mono text-slate-600' },
          { header: 'Status', accessor: 'status', type: 'status' },
        ];
        return (
          <DataTable
            title="Enterprise Workforce Roster by Department"
            subtitle="Complete head-count register with department and shift designations"
            icon={Users}
            columns={cols}
            data={data}
          />
        );
      }
    }
  };

  const handleExportCurrent = () => {
    let rowsToExport = [];
    let name = 'hr_report';

    if (activeReport === 'attendance') {
      name = 'attendance_report';
      rowsToExport = attendance.map((a) => ({
        Date: a.date,
        EmployeeID: a.employeeId,
        Name: a.employeeName,
        Plant: a.plant,
        PunchIn: formatToIndian12Hr(a.punchIn) || '--:--',
        PunchOut: formatToIndian12Hr(a.punchOut) || '--:--',
        WorkingHours: a.workingHours,
        OvertimeHours: a.overtimeHours,
        Status: a.status,
      }));
    } else if (activeReport === 'overtime') {
      name = 'overtime_report';
      rowsToExport = attendance.map((a) => ({
        Date: a.date,
        Employee: a.employeeName,
        Plant: a.plant,
        OvertimeHours: a.overtimeHours || 0,
        Status: a.status,
      }));
    } else if (activeReport === 'leaves') {
      name = 'leaves_report';
      rowsToExport = leaves.map((l) => ({
        LeaveID: l.id,
        Employee: l.employeeName,
        Type: l.leaveType,
        FromDate: l.fromDate,
        ToDate: l.toDate,
        Days: l.days,
        Status: l.status,
      }));
    } else if (activeReport === 'advances') {
      name = 'advance_recovery_report';
      rowsToExport = advances.map((a) => ({
        AdvanceID: a.id,
        Employee: a.employeeName,
        Amount: a.advanceAmount,
        Approved: a.approvedAmount,
        Recovered: a.recoveredAmount,
        Balance: a.balance,
        Status: a.status,
      }));
    } else if (activeReport === 'payroll') {
      name = 'payroll_report';
      rowsToExport = payrollRecords.map((p) => ({
        MonthYear: p.monthYear,
        EmployeeID: p.employeeId,
        Name: p.employeeName,
        Role: p.role,
        BasicSalary: p.basicSalary,
        GrossSalary: p.grossSalary,
        NetPayable: p.netPayable,
        Status: p.status,
      }));
    } else {
      name = 'employee_roster_report';
      rowsToExport = employees.map((e) => ({
        EmployeeID: e.id,
        Name: e.name,
        Role: e.role,
        Department: e.department,
        Plant: e.plant,
        Mobile: e.mobile,
        Status: e.status,
      }));
    }

    exportToCSV(name, rowsToExport);
  };

  return (
    <div className="space-y-4">
      {/* Sleek, Compact Enterprise Header Toolbar */}
      <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight">
                Workforce & HR Compliance Reports
              </h2>
              <span className="hidden sm:inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                Live Audit
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              Export-ready operational audit sheets with plant filtering and automated CSV compilation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs hover:border-slate-300 transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="All">All Plants</option>
              {MOCK_PLANTS.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCurrent}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Harmonized Report Categories Segmented Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/70 border border-slate-200/80 rounded-xl">
        {[
          { id: 'attendance', label: 'Daily Attendance' },
          { id: 'overtime', label: 'Overtime & Night Pours' },
          { id: 'leaves', label: 'Leave Utilization' },
          { id: 'advances', label: 'Salary Advances' },
          { id: 'payroll', label: 'Payroll Summary' },
          { id: 'employees', label: 'Workforce Directory' },
        ].map((tab) => {
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReport(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render Table */}
      {renderReportContent()}

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
