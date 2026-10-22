import React, { useState } from 'react';
import { 
  Receipt, 
  RefreshCw, 
  CheckCircle2, 
  Lock, 
  Unlock,
  Eye, 
  IndianRupee, 
  Printer, 
  Clock,
  ShieldCheck,
  Edit3,
  Trash2,
  Plus,
  Calculator,
  UserCheck,
  Building2,
  FileCheck2,
  User,
  AlertTriangle,
  CreditCard,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';
import AdvanceManagementView from './AdvanceManagementView';
import LoanManagementView from './LoanManagementView';

export default function PayrollPreparationView({ defaultMonth = 'October 2026' }) {
  const { user } = useAuth();
  const { 
    payrollRecords, 
    generatePayroll, 
    approvePayroll, 
    reversePayroll,
    addPayrollRecord,
    updatePayrollRecord,
    deletePayrollRecord,
    employees, 
    advances,
    loans,
    hrSettings 
  } = useWorkforce();

  // Navigation subtabs: 'sheet' | 'advances' | 'loans' | 'summary'
  const [activeSubTab, setActiveSubTab] = useState('sheet');
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedSummaryEmpId, setSelectedSummaryEmpId] = useState('');
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [activeSlip, setActiveSlip] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    employeeId: '',
    basicSalary: 30000,
    workingDays: 26,
    presentDays: 26,
    leaveDays: 0,
    overtimeHours: 0,
    overtimeRate: 216,
    allowances: 0,
    advanceDeduction: 0,
    loanEmi: 0,
    otherDeductions: 0,
    status: 'Calculated',
    remarks: '',
  });

  const canApprove = 
    user?.role === 'Admin' || 
    user?.role === 'Accountant' || 
    user?.role === 'Owner / Director' ||
    user?.email === 'smconcretech@gmail.com';

  const canEdit = 
    user?.role === 'Admin' || 
    user?.role === 'Accountant' ||
    user?.email === 'smconcretech@gmail.com';

  // Current month's records
  const records = payrollRecords.filter((p) => p.monthYear === selectedMonth);
  const isPayrollLocked = records.length > 0 && records.every((p) => p.status === 'Approved' || p.status === 'Locked');

  // Helper to get active advance balance and scheduled loan EMI for an employee
  const getEmployeeScheduledDeductions = (empId) => {
    if (!empId) return { scheduledAdvance: 0, scheduledLoanEmi: 0 };
    
    const empAdvances = (advances || []).filter(
      (a) => a.employeeId === empId && 
             (a.status === 'Approved' || a.status === 'Partially Recovered' || a.status === 'Active') && 
             Number(a.balance) > 0
    );
    const scheduledAdvance = empAdvances.reduce((sum, a) => {
      const bal = Number(a.balance) || 0;
      const monthly = Number(a.monthlyDeduction) > 0 ? Number(a.monthlyDeduction) : bal;
      return sum + Math.min(bal, monthly);
    }, 0);

    const empLoans = (loans || []).filter(
      (l) => l.employeeId === empId && 
             (l.status === 'Active' || l.status === 'Approved') && 
             Number(l.outstandingBalance) > 0
    );
    const scheduledLoanEmi = empLoans.reduce((sum, l) => {
      const out = Number(l.outstandingBalance) || 0;
      const emi = Number(l.emiAmount) || 0;
      return sum + Math.min(out, emi);
    }, 0);

    return { scheduledAdvance, scheduledLoanEmi };
  };

  const handleRecalculate = () => {
    setCalculating(true);
    setTimeout(() => {
      generatePayroll(selectedMonth);
      setCalculating(false);
      setToastMessage(`Payroll recalculated from latest attendance, advance balance, and loan EMI ledgers.`);
    }, 300);
  };

  const handleApprovePayroll = () => {
    approvePayroll(selectedMonth, user);
    setToastMessage(`Payroll for ${selectedMonth} approved and locked. Advance recoveries and loan EMIs applied.`);
  };

  const handleUnlockPayroll = () => {
    if (window.confirm(`Unlock and reverse payroll deductions for ${selectedMonth}? This will restore employee advance and loan balances.`)) {
      if (typeof reversePayroll === 'function') {
        reversePayroll(selectedMonth, user);
        setToastMessage(`Payroll for ${selectedMonth} unlocked. Deductions and loan balances restored.`);
      }
    }
  };

  // Live calculations for Add / Edit form
  const curBasic = Number(formData.basicSalary) || 0;
  const curWorkingDays = Number(formData.workingDays) || 26;
  const curPresentDays = Number(formData.presentDays) || 0;
  const curLeaveDays = Number(formData.leaveDays) || 0;
  const curOtHours = Number(formData.overtimeHours) || 0;
  const curOtRate = Number(formData.overtimeRate) || (curWorkingDays > 0 ? Math.round((curBasic / curWorkingDays / 8) * 1.5) : 0);
  const curOtAmount = Math.round(curOtHours * curOtRate);
  const curAllowances = Number(formData.allowances) || 0;
  const curEarnedBasic = curWorkingDays > 0 ? Math.round((curBasic / curWorkingDays) * Math.min(curWorkingDays, curPresentDays + curLeaveDays)) : 0;
  const curGross = curEarnedBasic + curOtAmount + curAllowances;
  const curAdvance = Number(formData.advanceDeduction) || 0;
  const curLoan = Number(formData.loanEmi) || 0;
  const curOther = Number(formData.otherDeductions) || 0;
  const curTotalDeduct = curAdvance + curLoan + curOther;
  const curNet = Math.max(0, curGross - curTotalDeduct);
  const isSalaryInsufficient = curTotalDeduct > curGross;

  const handleOpenAdd = () => {
    const firstEmp = employees[0];
    const initialBasic = firstEmp?.salary || 30000;
    const initialOtRate = Math.round((initialBasic / 26 / 8) * 1.5);
    const { scheduledAdvance, scheduledLoanEmi } = getEmployeeScheduledDeductions(firstEmp?.id);

    setFormData({
      employeeId: firstEmp?.id || '',
      basicSalary: initialBasic,
      workingDays: 26,
      presentDays: 26,
      leaveDays: 0,
      overtimeHours: 0,
      overtimeRate: initialOtRate,
      allowances: 0,
      advanceDeduction: scheduledAdvance,
      loanEmi: scheduledLoanEmi,
      otherDeductions: 0,
      status: 'Calculated',
      remarks: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      employeeId: record.employeeId,
      basicSalary: record.basicSalary || 0,
      workingDays: record.workingDays || 26,
      presentDays: record.presentDays || 0,
      leaveDays: record.leaveDays || 0,
      overtimeHours: record.overtimeHours || 0,
      overtimeRate: record.overtimeRate || Math.round(((record.basicSalary || 0) / (record.workingDays || 26) / 8) * 1.5),
      allowances: record.allowances || 0,
      advanceDeduction: record.advanceDeduction || 0,
      loanEmi: record.loanEmi || 0,
      otherDeductions: record.otherDeductions || 0,
      status: record.status || 'Calculated',
      remarks: record.remarks || '',
    });
    setShowEditModal(true);
  };

  const handleSaveAdd = (e) => {
    e.preventDefault();
    if (!formData.employeeId) {
      alert('Please select an employee.');
      return;
    }
    const emp = employees.find((em) => em.id === formData.employeeId);
    addPayrollRecord({
      monthYear: selectedMonth,
      employeeId: formData.employeeId,
      employeeName: emp?.name || formData.employeeId,
      role: emp?.role || 'Staff',
      department: emp?.department || 'Operations',
      plant: emp?.plant || 'Central Plant',
      basicSalary: curBasic,
      workingDays: curWorkingDays,
      presentDays: curPresentDays,
      leaveDays: curLeaveDays,
      overtimeHours: curOtHours,
      overtimeRate: curOtRate,
      otAmount: curOtAmount,
      allowances: curAllowances,
      advanceDeduction: curAdvance,
      loanEmi: curLoan,
      otherDeductions: curOther,
      totalDeductions: curTotalDeduct,
      earnedBasic: curEarnedBasic,
      grossSalary: curGross,
      netPayable: curNet,
      insufficientSalary: isSalaryInsufficient,
      status: formData.status,
      remarks: formData.remarks,
    });
    setShowAddModal(false);
    setToastMessage(`Salary record created for ${emp?.name || formData.employeeId}.`);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    updatePayrollRecord(editingRecord.id, {
      basicSalary: curBasic,
      workingDays: curWorkingDays,
      presentDays: curPresentDays,
      leaveDays: curLeaveDays,
      overtimeHours: curOtHours,
      overtimeRate: curOtRate,
      otAmount: curOtAmount,
      allowances: curAllowances,
      advanceDeduction: curAdvance,
      loanEmi: curLoan,
      otherDeductions: curOther,
      totalDeductions: curTotalDeduct,
      earnedBasic: curEarnedBasic,
      grossSalary: curGross,
      netPayable: curNet,
      insufficientSalary: isSalaryInsufficient,
      status: formData.status,
      remarks: formData.remarks,
    });
    setShowEditModal(false);
    setToastMessage(`Salary record updated for ${editingRecord.employeeName}.`);
  };

  const handleDeleteRecord = async (id, name) => {
    if (window.confirm(`Permanently remove payroll slip for ${name}?`)) {
      try {
        await deletePayrollRecord(id);
        setToastMessage(`Payroll record deleted.`);
      } catch (err) {
        console.error('Failed to delete payroll record:', err);
        setToastMessage(`Failed to delete payroll record: ${err.message}`);
      }
    }
  };

  // Summary Metrics for the current cycle
  const totalGrossCycle = records.reduce((sum, r) => sum + (Number(r.grossSalary) || 0), 0);
  const totalAdvanceCycle = records.reduce((sum, r) => sum + (Number(r.advanceDeduction) || 0), 0);
  const totalLoanEmiCycle = records.reduce((sum, r) => sum + (Number(r.loanEmi) || 0), 0);
  const totalDeductionsCycle = totalAdvanceCycle + totalLoanEmiCycle;
  const totalNetCycle = records.reduce((sum, r) => sum + (Number(r.netPayable) || 0), 0);
  const insufficientCount = records.filter((r) => r.insufficientSalary).length;

  // Single employee selected for detailed breakdown in Deduction Summary
  const summaryEmpRecord = records.find((r) => r.employeeId === selectedSummaryEmpId) || records[0];

  const columns = [
    {
      header: 'Emp ID',
      accessor: 'employeeId',
      width: '9%',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 font-mono font-bold text-[11px] inline-block whitespace-nowrap shadow-2xs">
          {row.employeeId}
        </span>
      ),
    },
    {
      header: 'Staff Name',
      accessor: 'employeeName',
      width: '16%',
      render: (row) => {
        const initials = row.employeeName 
          ? row.employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) 
          : 'EM';
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-slate-900 text-xs block leading-tight truncate" title={row.employeeName}>
                {row.employeeName}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">{row.role || 'Staff'}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Basic Pay',
      accessor: 'basicSalary',
      width: '10%',
      render: (row) => (
        <span className="font-mono text-xs text-slate-800 font-semibold whitespace-nowrap">
          ₹ {(row.basicSalary || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Gross Pay',
      accessor: 'grossSalary',
      width: '10%',
      render: (row) => (
        <span className="font-mono text-xs text-slate-900 font-bold whitespace-nowrap">
          ₹ {(row.grossSalary || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Advance Deduct',
      accessor: 'advanceDeduction',
      width: '11%',
      render: (row) => {
        const adv = Number(row.advanceDeduction) || 0;
        return (
          <span className={`font-mono text-xs font-bold whitespace-nowrap ${adv > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
            {adv > 0 ? `- ₹ ${adv.toLocaleString('en-IN')}` : '₹ 0'}
          </span>
        );
      },
    },
    {
      header: 'Loan EMI',
      accessor: 'loanEmi',
      width: '10%',
      render: (row) => {
        const emi = Number(row.loanEmi) || 0;
        return (
          <span className={`font-mono text-xs font-bold whitespace-nowrap ${emi > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {emi > 0 ? `- ₹ ${emi.toLocaleString('en-IN')}` : '₹ 0'}
          </span>
        );
      },
    },
    {
      header: 'Total Deduct',
      accessor: 'totalDeductions',
      width: '10%',
      render: (row) => {
        const total = (Number(row.advanceDeduction) || 0) + (Number(row.loanEmi) || 0) + (Number(row.otherDeductions) || 0);
        return (
          <span className={`font-mono text-xs font-bold whitespace-nowrap ${total > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
            {total > 0 ? `- ₹ ${total.toLocaleString('en-IN')}` : '₹ 0'}
          </span>
        );
      },
    },
    {
      header: 'Net Payable',
      accessor: 'netPayable',
      width: '12%',
      render: (row) => (
        <div className="whitespace-nowrap">
          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-black shadow-2xs inline-block">
            ₹ {(row.netPayable || 0).toLocaleString('en-IN')}
          </span>
          {row.insufficientSalary && (
            <span className="text-[10px] text-amber-600 block font-medium flex items-center gap-0.5 mt-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> Capped
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      type: 'status',
      width: '8%',
      render: (row) => <StatusBadge status={row.status || 'Draft'} />,
    },
    {
      header: 'Actions',
      align: 'right',
      width: '8%',
      render: (row) => (
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => {
              setActiveSlip(row);
              setShowSlipModal(true);
            }}
            className="p-1 rounded-md bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title="View Details & Digital Payslip"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canEdit && !isPayrollLocked && (
            <>
              <button
                type="button"
                onClick={() => handleOpenEdit(row)}
                className="p-1 rounded-md bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                title="Edit Salary & Deductions"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRecord(row.id, row.employeeName)}
                className="p-1 rounded-md bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                title="Delete Payroll Record"
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
      {/* Sub-View Navigation Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-2xl bg-slate-100/90 border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('sheet')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'sheet'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-amber-600" />
            <span>Payroll Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('advances')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'advances'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
            <span>Salary Advances</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('loans')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'loans'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Company Loans</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('summary')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'summary'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-purple-600" />
            <span>Deduction Summary</span>
          </button>
        </div>

        {/* Cycle selector shown on Sheet & Summary */}
        {(activeSubTab === 'sheet' || activeSubTab === 'summary') && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Payroll Cycle:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
            >
              <option value="October 2026">October 2026 (Active)</option>
              <option value="September 2026">September 2026</option>
              <option value="August 2026">August 2026</option>
            </select>
          </div>
        )}
      </div>

      {/* Subtab 1: ADVANCES MANAGEMENT */}
      {activeSubTab === 'advances' && <AdvanceManagementView />}

      {/* Subtab 2: LOANS MANAGEMENT */}
      {activeSubTab === 'loans' && <LoanManagementView />}

      {/* Subtab 3: PAYROLL DEDUCTION SUMMARY */}
      {activeSubTab === 'summary' && (
        <div className="space-y-4">
          {/* Header Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-blue-50/35 via-white to-white border-2 border-blue-400 hover:border-blue-500 shadow-xs hover:shadow-blue-500/15 transition-all duration-200 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#136dec] transition-all group-hover:h-[4px]" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Gross Wages</span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-1 block">
                ₹ {totalGrossCycle.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500">{records.length} employee(s)</span>
            </div>

            <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-amber-50/35 via-white to-white border-2 border-amber-400 hover:border-amber-500 shadow-xs hover:shadow-amber-500/15 transition-all duration-200 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500 transition-all group-hover:h-[4px]" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Advance Deductions</span>
              <span className="text-lg font-bold text-amber-700 font-mono mt-1 block">
                - ₹ {totalAdvanceCycle.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500">Recovered from salary</span>
            </div>

            <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-rose-50/35 via-white to-white border-2 border-rose-400 hover:border-rose-500 shadow-xs hover:shadow-rose-500/15 transition-all duration-200 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-rose-500 transition-all group-hover:h-[4px]" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Loan EMI Deductions</span>
              <span className="text-lg font-bold text-rose-600 font-mono mt-1 block">
                - ₹ {totalLoanEmiCycle.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500">Company loan repayments</span>
            </div>

            <div className="p-3.5 pt-4 rounded-xl bg-gradient-to-b from-emerald-50/35 via-white to-white border-2 border-emerald-400 hover:border-emerald-500 shadow-xs hover:shadow-emerald-500/15 transition-all duration-200 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500 transition-all group-hover:h-[4px]" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Salary Payable</span>
              <span className="text-lg font-bold text-emerald-700 font-mono mt-1 block">
                ₹ {totalNetCycle.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500">Total direct disbursement</span>
            </div>
          </div>

          {/* Warning Banner if any employee has insufficient earnings */}
          {insufficientCount > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Insufficient Salary Notice:</strong> {insufficientCount} employee(s) have scheduled advance/loan deductions exceeding their gross pay. Deductions were safely capped to prevent negative net payable amounts. Review before locking.
              </div>
            </div>
          )}

          {/* Side-by-Side: Dedicated Table & Single Employee Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Cols: All Employees Deduction Summary Table */}
            <div className="lg:col-span-2 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Monthly Deduction Ledger</h3>
                  <p className="text-[11px] text-slate-500">Advance recoveries and loan EMIs for {selectedMonth}</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {records.length} Employees
                </span>
              </div>

              {records.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No payroll records calculated for {selectedMonth}. Switch to "Payroll Sheet" and click "Recalculate".
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-200 text-left text-[11px]">
                        <th className="pb-2 font-semibold">Employee</th>
                        <th className="pb-2 font-semibold">Monthly Salary</th>
                        <th className="pb-2 font-semibold">Advance Deduct</th>
                        <th className="pb-2 font-semibold">Loan EMI</th>
                        <th className="pb-2 font-semibold">Total Deduct</th>
                        <th className="pb-2 font-semibold text-right">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((r) => {
                        const totalDed = (Number(r.advanceDeduction) || 0) + (Number(r.loanEmi) || 0) + (Number(r.otherDeductions) || 0);
                        const isSelected = (summaryEmpRecord?.employeeId === r.employeeId);
                        return (
                          <tr
                            key={r.id}
                            onClick={() => setSelectedSummaryEmpId(r.employeeId)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5">
                              <span className="font-bold text-slate-900 block truncate">{r.employeeName}</span>
                              <span className="text-[10px] text-slate-400 block">{r.employeeId} • {r.role || 'Staff'}</span>
                            </td>
                            <td className="py-2.5 text-slate-800">
                              ₹ {(r.grossSalary || r.basicSalary || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 text-amber-700 font-semibold">
                              {Number(r.advanceDeduction) > 0 ? `- ₹ ${Number(r.advanceDeduction).toLocaleString('en-IN')}` : '₹ 0'}
                            </td>
                            <td className="py-2.5 text-rose-600 font-semibold">
                              {Number(r.loanEmi) > 0 ? `- ₹ ${Number(r.loanEmi).toLocaleString('en-IN')}` : '₹ 0'}
                            </td>
                            <td className="py-2.5 text-rose-700 font-bold">
                              {totalDed > 0 ? `- ₹ ${totalDed.toLocaleString('en-IN')}` : '₹ 0'}
                            </td>
                            <td className="py-2.5 text-right font-black text-emerald-700">
                              ₹ {(r.netPayable || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right 1 Col: Section 4 Prompt Deduction Breakdown Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Payroll Deduction Summary</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                  {summaryEmpRecord?.employeeName || 'Selected Employee'}
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  {summaryEmpRecord ? `${summaryEmpRecord.employeeId} • ${summaryEmpRecord.role}` : 'Select an employee from the table'}
                </span>
              </div>

              {summaryEmpRecord ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 overflow-hidden font-mono text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                          <th className="py-2 px-3 text-left font-bold">Description</th>
                          <th className="py-2 px-3 text-right font-bold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-3 text-slate-700">Monthly Salary</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            ₹ {(summaryEmpRecord.grossSalary || summaryEmpRecord.basicSalary || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-700">Advance Deduction</td>
                          <td className="py-2 px-3 text-right font-bold text-amber-700">
                            ₹ {(Number(summaryEmpRecord.advanceDeduction) || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-slate-700">Loan EMI</td>
                          <td className="py-2 px-3 text-right font-bold text-rose-600">
                            ₹ {(Number(summaryEmpRecord.loanEmi) || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="py-2 px-3 text-slate-900">Total Deduction</td>
                          <td className="py-2 px-3 text-right text-rose-700">
                            ₹ {((Number(summaryEmpRecord.advanceDeduction) || 0) + (Number(summaryEmpRecord.loanEmi) || 0)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr className="bg-emerald-50 text-emerald-900 font-bold border-t border-emerald-200">
                          <td className="py-2.5 px-3">Net Salary Payable</td>
                          <td className="py-2.5 px-3 text-right font-black text-sm text-emerald-700">
                            ₹ {(Number(summaryEmpRecord.netPayable) || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">Formula Applied:</div>
                    <div>Total Deduction = Advance Deduction + Loan EMI</div>
                    <div>Net Salary = Monthly Salary − Total Deduction</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSlip(summaryEmpRecord);
                      setShowSlipModal(true);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Digital Payslip</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs">
                  Select an employee from the table to view the deduction calculation breakdown.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 4: PAYROLL SHEET (MAIN) */}
      {activeSubTab === 'sheet' && (
        <div className="space-y-4">
          {/* Action Header */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isPayrollLocked ? (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-mono">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PAYROLL APPROVED & LOCKED</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>DRAFT CALCULATION</span>
                </span>
              )}
              {insufficientCount > 0 && (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{insufficientCount} Capped Deduction(s)</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRecalculate}
                disabled={calculating || isPayrollLocked}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95 disabled:opacity-50"
                title="Recalculate from attendance, advances, and loans"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
                <span>Sync Attendance & Advances</span>
              </button>

              {canEdit && !isPayrollLocked && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Salary Record</span>
                </button>
              )}

              {canApprove && !isPayrollLocked && (
                <button
                  type="button"
                  onClick={handleApprovePayroll}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0 stroke-white" />
                  <span>Approve & Lock Payroll</span>
                </button>
              )}

              {canApprove && isPayrollLocked && (
                <button
                  type="button"
                  onClick={handleUnlockPayroll}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Unlock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Unlock / Reverse</span>
                </button>
              )}
            </div>
          </div>

          {/* Connected Payroll Table */}
          <DataTable
            title={`Staff Payroll Sheet - ${selectedMonth}`}
            subtitle="Gross earnings, overtime, salary advance recoveries, loan EMIs, and net payable disbursement"
            icon={Receipt}
            columns={columns}
            data={records}
            compact={true}
            emptyMessage="No salary records calculated or added for this cycle. Click 'Add Salary Record' to enter manual wages, or 'Sync Attendance & Advances' to generate automatically."
            renderMobileCard={(row) => {
              const sumDeduct = (Number(row.advanceDeduction) || 0) + (Number(row.loanEmi) || 0) + (Number(row.otherDeductions) || 0);
              return (
                <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2.5">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 truncate">{row.employeeName}</div>
                      <div className="text-xs font-mono text-amber-700 font-bold">{row.employeeId} • {row.role || 'Staff'}</div>
                    </div>
                    <StatusBadge status={row.status || 'Draft'} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1.5 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Gross Pay</span>
                      <span className="text-slate-900 font-bold">₹ {(row.grossSalary || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Advance Deduct</span>
                      <span className="text-amber-700 font-bold">₹ {(Number(row.advanceDeduction) || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Loan EMI</span>
                      <span className="text-rose-600 font-bold">₹ {(Number(row.loanEmi) || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Net Payable</span>
                      <span className="text-emerald-700 font-black text-sm">₹ {(row.netPayable || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlip(row);
                        setShowSlipModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Payslip</span>
                    </button>
                    {canEdit && !isPayrollLocked && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(row)}
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 text-xs cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(row.id, row.employeeName)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-xs cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}

      {/* Modal: Add Salary Record */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Employee Salary Record"
        subtitle={`Enter monthly pay, advance deduction, and loan EMI for ${selectedMonth}`}
        icon={Plus}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-700 font-semibold block mb-1">Select Employee *</label>
            <select
              value={formData.employeeId}
              onChange={(e) => {
                const emp = employees.find((em) => em.id === e.target.value);
                const basic = emp?.salary || 30000;
                const { scheduledAdvance, scheduledLoanEmi } = getEmployeeScheduledDeductions(e.target.value);
                setFormData({
                  ...formData,
                  employeeId: e.target.value,
                  basicSalary: basic,
                  overtimeRate: Math.round((basic / 26 / 8) * 1.5),
                  advanceDeduction: scheduledAdvance,
                  loanEmi: scheduledLoanEmi,
                });
              }}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.id}) - {e.role}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Monthly Basic Salary (₹) *</label>
              <input
                type="number"
                value={formData.basicSalary}
                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Standard Working Days *</label>
              <input
                type="number"
                value={formData.workingDays}
                onChange={(e) => setFormData({ ...formData, workingDays: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Present Duty Days</label>
              <input
                type="number"
                step="0.5"
                value={formData.presentDays}
                onChange={(e) => setFormData({ ...formData, presentDays: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Paid Leave Days</label>
              <input
                type="number"
                value={formData.leaveDays}
                onChange={(e) => setFormData({ ...formData, leaveDays: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Overtime Hours</label>
              <input
                type="number"
                step="0.5"
                value={formData.overtimeHours}
                onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">OT Rate / Hr (₹)</label>
              <input
                type="number"
                value={formData.overtimeRate}
                onChange={(e) => setFormData({ ...formData, overtimeRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Allowances / Bonus (₹)</label>
              <input
                type="number"
                value={formData.allowances}
                onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Advance Deduct (₹)</label>
              <input
                type="number"
                value={formData.advanceDeduction}
                onChange={(e) => setFormData({ ...formData, advanceDeduction: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-amber-700 font-bold rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Loan EMI (₹)</label>
              <input
                type="number"
                value={formData.loanEmi}
                onChange={(e) => setFormData({ ...formData, loanEmi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-rose-700 font-bold rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Other / Tax (₹)</label>
              <input
                type="number"
                value={formData.otherDeductions}
                onChange={(e) => setFormData({ ...formData, otherDeductions: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          {/* Section 4 Required: Payroll Deduction Summary Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Payroll Deduction Summary
            </span>
            <div className="rounded-lg border border-slate-200 overflow-hidden font-mono text-xs bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px]">
                    <th className="py-1 px-2.5 text-left font-semibold">Description</th>
                    <th className="py-1 px-2.5 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1 px-2.5 text-slate-600">Monthly Salary</td>
                    <td className="py-1 px-2.5 text-right font-bold text-slate-900">₹ {curGross.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2.5 text-slate-600">Advance Deduction</td>
                    <td className="py-1 px-2.5 text-right font-bold text-amber-700">₹ {curAdvance.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2.5 text-slate-600">Loan EMI</td>
                    <td className="py-1 px-2.5 text-right font-bold text-rose-600">₹ {curLoan.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="py-1 px-2.5 text-slate-800">Total Deduction</td>
                    <td className="py-1 px-2.5 text-right text-rose-700">₹ {curTotalDeduct.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-900 font-bold border-t border-emerald-200">
                    <td className="py-1.5 px-2.5">Net Salary Payable</td>
                    <td className="py-1.5 px-2.5 text-right text-emerald-700 text-sm font-black">₹ {curNet.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {isSalaryInsufficient && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Warning: Deductions exceed gross pay. Net payable will be ₹0 (cannot be negative).</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Save Salary Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Salary Record */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Salary & Deduction Values"
        subtitle={`Adjust wages, advance recovery, and loan EMI for ${editingRecord?.employeeName} (${editingRecord?.employeeId})`}
        icon={Edit3}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-sm block">{editingRecord?.employeeName}</span>
              <span className="text-slate-500 font-mono text-[11px]">{editingRecord?.employeeId} • {editingRecord?.role}</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {editingRecord?.monthYear}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Monthly Basic Salary (₹) *</label>
              <input
                type="number"
                value={formData.basicSalary}
                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Standard Working Days *</label>
              <input
                type="number"
                value={formData.workingDays}
                onChange={(e) => setFormData({ ...formData, workingDays: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Present Duty Days</label>
              <input
                type="number"
                step="0.5"
                value={formData.presentDays}
                onChange={(e) => setFormData({ ...formData, presentDays: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Paid Leave Days</label>
              <input
                type="number"
                value={formData.leaveDays}
                onChange={(e) => setFormData({ ...formData, leaveDays: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Overtime Hours</label>
              <input
                type="number"
                step="0.5"
                value={formData.overtimeHours}
                onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">OT Rate / Hr (₹)</label>
              <input
                type="number"
                value={formData.overtimeRate}
                onChange={(e) => setFormData({ ...formData, overtimeRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Allowances / Bonus (₹)</label>
              <input
                type="number"
                value={formData.allowances}
                onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Advance Deduct (₹)</label>
              <input
                type="number"
                value={formData.advanceDeduction}
                onChange={(e) => setFormData({ ...formData, advanceDeduction: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-amber-700 font-bold rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Loan EMI (₹)</label>
              <input
                type="number"
                value={formData.loanEmi}
                onChange={(e) => setFormData({ ...formData, loanEmi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-rose-700 font-bold rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Other / Tax (₹)</label>
              <input
                type="number"
                value={formData.otherDeductions}
                onChange={(e) => setFormData({ ...formData, otherDeductions: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          {/* Section 4 Required: Payroll Deduction Summary Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Payroll Deduction Summary
            </span>
            <div className="rounded-lg border border-slate-200 overflow-hidden font-mono text-xs bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px]">
                    <th className="py-1 px-2.5 text-left font-semibold">Description</th>
                    <th className="py-1 px-2.5 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1 px-2.5 text-slate-600">Monthly Salary</td>
                    <td className="py-1 px-2.5 text-right font-bold text-slate-900">₹ {curGross.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2.5 text-slate-600">Advance Deduction</td>
                    <td className="py-1 px-2.5 text-right font-bold text-amber-700">₹ {curAdvance.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2.5 text-slate-600">Loan EMI</td>
                    <td className="py-1 px-2.5 text-right font-bold text-rose-600">₹ {curLoan.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="py-1 px-2.5 text-slate-800">Total Deduction</td>
                    <td className="py-1 px-2.5 text-right text-rose-700">₹ {curTotalDeduct.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-900 font-bold border-t border-emerald-200">
                    <td className="py-1.5 px-2.5">Net Salary Payable</td>
                    <td className="py-1.5 px-2.5 text-right text-emerald-700 text-sm font-black">₹ {curNet.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {isSalaryInsufficient && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Warning: Deductions exceed gross pay. Net payable will be ₹0 (cannot be negative).</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Employee Salary & Payroll Details */}
      <Modal
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
        title="Employee Salary & Payroll Details"
        subtitle={`Complete wage breakdown and attendance record for ${activeSlip?.employeeName} (${activeSlip?.monthYear})`}
        icon={Receipt}
        maxWidth="max-w-2xl"
      >
        {activeSlip && (
          <div className="space-y-4 text-xs">
            {/* Header Voucher Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-sm">
                    SM
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base">SM CONCRETECH</h4>
                    <span className="text-[11px] text-slate-500 font-mono">Navi Mumbai RMC Plant Network • Official Payslip</span>
                  </div>
                </div>
                <StatusBadge status={activeSlip.status} />
              </div>

              {/* Employee & Plant Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">EMPLOYEE NAME</span>
                  <span className="font-bold text-slate-900 text-xs block truncate">{activeSlip.employeeName}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">EMPLOYEE ID</span>
                  <span className="font-bold text-amber-600 text-xs block">{activeSlip.employeeId}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">DESIGNATION / ROLE</span>
                  <span className="font-bold text-slate-800 text-xs block truncate">{activeSlip.role || 'Staff'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">DEPARTMENT</span>
                  <span className="font-bold text-slate-800 text-xs block truncate">{activeSlip.department || 'Operations'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">PLANT UNIT</span>
                  <span className="font-bold text-slate-800 text-xs block truncate">{activeSlip.plant || 'Central Plant'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">PAYROLL CYCLE</span>
                  <span className="font-bold text-slate-900 text-xs block">{activeSlip.monthYear}</span>
                </div>
              </div>
            </div>

            {/* Attendance & Duty Breakdown */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
              <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Duty & Attendance Log</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <div className="bg-white p-2 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-slate-500 block">Working Days</span>
                  <span className="font-bold text-slate-900">{activeSlip.workingDays || 26} Days</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-slate-500 block">Present Duty</span>
                  <span className="font-bold text-emerald-700">{activeSlip.presentDays || 0} Days</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-slate-500 block">Paid Leave</span>
                  <span className="font-bold text-blue-700">{activeSlip.leaveDays || 0} Days</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-slate-500 block">Overtime Worked</span>
                  <span className="font-bold text-purple-700">{activeSlip.overtimeHours || 0} Hrs (@ ₹{activeSlip.overtimeRate || 0}/hr)</span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown: Earnings vs Deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Earnings Breakdown */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 font-mono">
                <div className="text-xs font-bold uppercase text-emerald-700 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Earnings Breakdown</span>
                  <span className="text-[10px] text-emerald-600 font-normal">Credits</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Monthly Basic Salary:</span>
                  <span className="font-semibold text-slate-900">₹ {(activeSlip.basicSalary || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Earned Basic (P+L):</span>
                  <span className="font-semibold text-slate-900">₹ {(activeSlip.earnedBasic || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-purple-700 text-xs">
                  <span>Overtime Pay ({activeSlip.overtimeHours || 0}h):</span>
                  <span className="font-bold">+ ₹ {(activeSlip.otAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                {(activeSlip.allowances || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700 text-xs">
                    <span>Allowances / Bonus:</span>
                    <span className="font-bold">+ ₹ {(activeSlip.allowances || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 text-xs font-bold pt-2 border-t border-slate-100">
                  <span>Gross Salary:</span>
                  <span className="text-sm font-black text-slate-900">₹ {(activeSlip.grossSalary || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 font-mono">
                <div className="text-xs font-bold uppercase text-rose-700 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Deductions Breakdown</span>
                  <span className="text-[10px] text-rose-600 font-normal">Debits</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Salary Advance Recovery:</span>
                  <span className="font-semibold text-amber-700">- ₹ {(Number(activeSlip.advanceDeduction) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Company Loan EMI:</span>
                  <span className="font-semibold text-rose-600">- ₹ {(Number(activeSlip.loanEmi) || 0).toLocaleString('en-IN')}</span>
                </div>
                {Number(activeSlip.otherDeductions || 0) > 0 && (
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>Other Deductions:</span>
                    <span className="font-semibold text-slate-700">- ₹ {(Number(activeSlip.otherDeductions) || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 text-xs font-bold pt-2 border-t border-slate-100">
                  <span>Total Deductions:</span>
                  <span className="text-sm font-black text-rose-700">
                    - ₹ {((Number(activeSlip.advanceDeduction) || 0) + (Number(activeSlip.loanEmi) || 0) + (Number(activeSlip.otherDeductions) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-bold text-emerald-900 uppercase block tracking-wider">NET PAYABLE AMOUNT</span>
                <span className="text-[11px] text-emerald-700 font-medium">Final take-home salary after all earnings & recoveries</span>
              </div>
              <div className="text-right font-mono font-black text-2xl text-emerald-700">
                ₹ {(activeSlip.netPayable || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Remarks or Capped Warning */}
            {activeSlip.insufficientSalary && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Notice: Deductions were capped to available gross earnings to prevent a negative salary.</span>
              </div>
            )}

            {activeSlip.remarks && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Remarks / Audit Note:</span>
                <p className="text-slate-600 italic font-mono">{activeSlip.remarks}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Payslip</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSlipModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
