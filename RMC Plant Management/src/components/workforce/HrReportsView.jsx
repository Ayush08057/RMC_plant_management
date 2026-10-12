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
          { header: 'Date', accessor: 'date', className: 'font-mono text-xs text-white' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-white' },
          { header: 'Plant', accessor: 'plant' },
          { header: 'Punch In', accessor: 'punchIn', className: 'font-mono text-emerald-400 font-bold', render: (row) => formatToIndian12Hr(row.punchIn) || '--:--' },
          { header: 'Punch Out', accessor: 'punchOut', className: 'font-mono text-rose-300', render: (row) => formatToIndian12Hr(row.punchOut) || '--:--' },
          { header: 'Hours', accessor: 'workingHours', className: 'font-mono text-white' },
          { header: 'OT', accessor: 'overtimeHours', className: 'font-mono text-purple-300 font-bold' },
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
          { header: 'Date', accessor: 'date', className: 'font-mono text-xs text-white' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-white' },
          { header: 'Plant', accessor: 'plant' },
          { header: 'OT Hours', accessor: 'overtimeHours', className: 'font-mono font-bold text-purple-300' },
          { header: 'Hourly Rate', accessor: 'rate', className: 'font-mono text-slate-300' },
          { header: 'Est. OT Compensation', accessor: 'estimatedPay', className: 'font-mono font-bold text-emerald-400' },
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
          { header: 'ID', accessor: 'id', className: 'font-mono text-amber-400 font-bold' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-white' },
          { header: 'Category', accessor: 'leaveType', className: 'text-purple-300 font-semibold' },
          { header: 'From', accessor: 'fromDate', className: 'font-mono text-slate-300' },
          { header: 'To', accessor: 'toDate', className: 'font-mono text-slate-300' },
          { header: 'Days', accessor: 'days', className: 'font-mono font-bold text-white' },
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
          { header: 'Ref', accessor: 'id', className: 'font-mono text-amber-400 font-bold' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-white' },
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
          { header: 'Month', accessor: 'monthYear', className: 'font-mono text-amber-300 font-bold' },
          { header: 'Employee', accessor: 'employeeName', className: 'font-bold text-white' },
          { header: 'Basic', accessor: 'basicSalary', render: (r) => `₹ ${r.basicSalary?.toLocaleString('en-IN')}` },
          { header: 'OT Pay', accessor: 'otAmount', render: (r) => `+ ₹ ${r.otAmount?.toLocaleString('en-IN')}` },
          { header: 'Deductions', accessor: 'deduct', render: (r) => `- ₹ ${((r.advanceDeduction || 0) + (r.loanEmi || 0)).toLocaleString('en-IN')}` },
          { header: 'Net Take Home', accessor: 'netPayable', render: (r) => `₹ ${r.netPayable?.toLocaleString('en-IN')}`, className: 'font-bold text-emerald-400 font-mono' },
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
          { header: 'ID', accessor: 'id', className: 'font-mono text-amber-400 font-bold' },
          { header: 'Full Name', accessor: 'name', className: 'font-bold text-white' },
          { header: 'Role', accessor: 'role' },
          { header: 'Department', accessor: 'department' },
          { header: 'Plant Location', accessor: 'plant' },
          { header: 'Mobile', accessor: 'mobile', className: 'font-mono text-slate-300' },
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-[#12151e] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span>Workforce & HR Compliance Intelligence Reports</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Export-ready operational audit sheets with plant filtering and automated CSV compilation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="All">All Plants</option>
            {MOCK_PLANTS.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCurrent}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Categories Tab Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveReport('attendance')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            activeReport === 'attendance'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Daily Attendance
        </button>
        <button
          type="button"
          onClick={() => setActiveReport('overtime')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            activeReport === 'overtime'
              ? 'bg-purple-600 text-white border-purple-500 font-bold'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Overtime & Night Pours
        </button>
        <button
          type="button"
          onClick={() => setActiveReport('leaves')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            activeReport === 'leaves'
              ? 'bg-blue-600 text-white border-blue-500 font-bold'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Leave Utilization
        </button>
        <button
          type="button"
          onClick={() => setActiveReport('advances')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            activeReport === 'advances'
              ? 'bg-cyan-600 text-white border-cyan-500 font-bold'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Salary Advances
        </button>
        <button
          type="button"
          onClick={() => setActiveReport('payroll')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            activeReport === 'payroll'
              ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Payroll Summary
        </button>
        <button
          type="button"
          onClick={() => setActiveReport('employees')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
            activeReport === 'employees'
              ? 'bg-slate-700 text-white border-slate-600 font-bold'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Workforce Directory
        </button>
      </div>

      {/* Render Table */}
      {renderReportContent()}

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
