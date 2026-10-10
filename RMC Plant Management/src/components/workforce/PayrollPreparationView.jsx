import React, { useState } from 'react';
import { 
  Receipt, 
  RefreshCw, 
  CheckCircle2, 
  Lock, 
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
  User
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function PayrollPreparationView({ defaultMonth = 'October 2026' }) {
  const { user } = useAuth();
  const { 
    payrollRecords, 
    generatePayroll, 
    approvePayroll, 
    addPayrollRecord,
    updatePayrollRecord,
    deletePayrollRecord,
    employees, 
    hrSettings 
  } = useWorkforce();

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
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

  const canApprove = user?.role === 'Admin' || user?.role === 'Accountant' || user?.role === 'Owner / Director';
  const canEdit = user?.role === 'Admin' || user?.role === 'Accountant';

  // Current month's records
  const records = payrollRecords.filter((p) => p.monthYear === selectedMonth);

  const handleRecalculate = () => {
    setCalculating(true);
    setTimeout(() => {
      generatePayroll(selectedMonth);
      setCalculating(false);
      setToastMessage(`Payroll recalculated from latest attendance, overtime, advance, and loan ledgers.`);
    }, 400);
  };

  const handleApprovePayroll = () => {
    approvePayroll(selectedMonth, user);
    setToastMessage(`Payroll for ${selectedMonth} approved and locked. Salary advance & loan ledgers updated.`);
  };

  const isPayrollLocked = records.length > 0 && records.every((p) => p.status === 'Approved' || p.status === 'Locked');

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

  const handleOpenAdd = () => {
    const firstEmp = employees[0];
    const initialBasic = firstEmp?.salary || 30000;
    const initialOtRate = Math.round((initialBasic / 26 / 8) * 1.5);
    setFormData({
      employeeId: firstEmp?.id || '',
      basicSalary: initialBasic,
      workingDays: 26,
      presentDays: 26,
      leaveDays: 0,
      overtimeHours: 0,
      overtimeRate: initialOtRate,
      allowances: 0,
      advanceDeduction: 0,
      loanEmi: 0,
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
      earnedBasic: curEarnedBasic,
      grossSalary: curGross,
      netPayable: curNet,
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
      earnedBasic: curEarnedBasic,
      grossSalary: curGross,
      netPayable: curNet,
      status: formData.status,
      remarks: formData.remarks,
    });
    setShowEditModal(false);
    setToastMessage(`Salary record updated for ${editingRecord.employeeName}.`);
  };

  const handleDeleteRecord = (id, name) => {
    if (window.confirm(`Permanently remove payroll slip for ${name}?`)) {
      deletePayrollRecord(id);
      setToastMessage(`Payroll record deleted.`);
    }
  };

  const columns = [
    {
      header: 'Employee ID',
      accessor: 'employeeId',
      width: '110px',
      render: (row) => (
        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 font-mono font-bold text-xs inline-block whitespace-nowrap shadow-2xs">
          {row.employeeId}
        </span>
      ),
    },
    {
      header: 'Staff Name',
      accessor: 'employeeName',
      width: '180px',
      render: (row) => {
        const initials = row.employeeName 
          ? row.employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) 
          : 'EM';
        return (
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 text-xs block leading-tight truncate">{row.employeeName}</span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">{row.role || 'Staff'}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Basic Salary',
      accessor: 'basicSalary',
      width: '110px',
      render: (row) => (
        <span className="font-mono text-xs text-slate-800 font-bold whitespace-nowrap">
          ₹ {(row.basicSalary || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Duty Days (P+L)',
      accessor: 'dutyDays',
      width: '125px',
      render: (row) => {
        const duty = (row.presentDays || 0) + (row.leaveDays || 0);
        const total = row.workingDays || 26;
        const isFull = duty >= total;
        return (
          <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border inline-block whitespace-nowrap shadow-2xs ${
            isFull ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200'
          }`}>
            {duty} / {total} Days
          </span>
        );
      },
    },
    {
      header: 'Overtime Pay',
      accessor: 'otAmount',
      width: '110px',
      render: (row) => (
        <div className="whitespace-nowrap">
          <span className="font-mono text-xs text-purple-700 font-bold block">
            ₹ {(row.otAmount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-purple-600 font-mono block">
            ({row.overtimeHours || 0}h OT)
          </span>
        </div>
      ),
    },
    {
      header: 'Adv / Loan Deduct',
      accessor: 'deductions',
      width: '130px',
      render: (row) => {
        const sumDeduct = (Number(row.advanceDeduction) || 0) + (Number(row.loanEmi) || 0) + (Number(row.otherDeductions) || 0);
        return (
          <span className={`font-mono text-xs font-bold whitespace-nowrap ${sumDeduct > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {sumDeduct > 0 ? `- ₹ ${sumDeduct.toLocaleString('en-IN')}` : '₹ 0'}
          </span>
        );
      },
    },
    {
      header: 'Gross Salary',
      accessor: 'grossSalary',
      width: '110px',
      render: (row) => (
        <span className="font-mono text-xs text-slate-900 font-black whitespace-nowrap">
          ₹ {(row.grossSalary || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Net Payable',
      accessor: 'netPayable',
      width: '130px',
      render: (row) => (
        <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-200 font-mono text-xs sm:text-sm font-black shadow-2xs inline-block whitespace-nowrap">
          ₹ {(row.netPayable || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    { header: 'Status', accessor: 'status', type: 'status', width: '100px' },
    {
      header: 'Actions',
      align: 'right',
      width: '110px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <button
            type="button"
            onClick={() => {
              setActiveSlip(row);
              setShowSlipModal(true);
            }}
            className="p-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title="View Details & Digital Payslip"
          >
            <Eye className="w-4 h-4" />
          </button>
          {canEdit && !isPayrollLocked && (
            <>
              <button
                type="button"
                onClick={() => handleOpenEdit(row)}
                className="p-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                title="Edit Salary & Deductions"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRecord(row.id, row.employeeName)}
                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                title="Delete Payroll Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Control Header */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-bold">Payroll Cycle:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="October 2026">October 2026 (Active)</option>
              <option value="September 2026">September 2026</option>
              <option value="August 2026">August 2026</option>
            </select>
          </div>

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
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Lock Payroll</span>
            </button>
          )}
        </div>
      </div>

      {/* Connected Payroll Table */}
      <DataTable
        title={`Staff Payroll Sheet - ${selectedMonth}`}
        subtitle="Gross wages, overtime computation, company advances, loan EMIs, and net direct disbursement."
        icon={Receipt}
        columns={columns}
        data={records}
        emptyMessage="No salary records calculated or added for this cycle. Click 'Add Salary Record' to enter manual wages, or 'Recalculate from HR Data' to sync attendance."
      />

      {/* Modal: Add Salary Record */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Employee Salary Record"
        subtitle={`Manual entry of monthly pay, overtime, and deductions for ${selectedMonth}`}
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
                setFormData({
                  ...formData,
                  employeeId: e.target.value,
                  basicSalary: basic,
                  overtimeRate: Math.round((basic / 26 / 8) * 1.5),
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-rose-700 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Loan EMI (₹)</label>
              <input
                type="number"
                value={formData.loanEmi}
                onChange={(e) => setFormData({ ...formData, loanEmi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-rose-700 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Other / Tax (₹)</label>
              <input
                type="number"
                value={formData.otherDeductions}
                onChange={(e) => setFormData({ ...formData, otherDeductions: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-rose-700 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2 font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Earned Basic:</span>
              <span className="text-slate-900 font-bold">₹ {curEarnedBasic.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Overtime ({curOtHours}h @ ₹{curOtRate}/h):</span>
              <span className="text-purple-700 font-bold">+ ₹ {curOtAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Gross Earnings:</span>
              <span className="text-amber-700 font-bold">₹ {curGross.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Deductions:</span>
              <span className="text-rose-600 font-bold">- ₹ {curTotalDeduct.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700 text-sm font-bold pt-2 border-t border-slate-200">
              <span>Net Take-Home Pay:</span>
              <span>₹ {curNet.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 font-semibold"
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
        subtitle={`Adjust wages, overtime, and deductions for ${editingRecord?.employeeName} (${editingRecord?.employeeId})`}
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-rose-700 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Loan EMI (₹)</label>
              <input
                type="number"
                value={formData.loanEmi}
                onChange={(e) => setFormData({ ...formData, loanEmi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-rose-700 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Other / Tax (₹)</label>
              <input
                type="number"
                value={formData.otherDeductions}
                onChange={(e) => setFormData({ ...formData, otherDeductions: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-rose-700 rounded-xl font-mono focus:border-amber-500"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2 font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Earned Basic:</span>
              <span className="text-slate-900 font-bold">₹ {curEarnedBasic.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Overtime ({curOtHours}h @ ₹{curOtRate}/h):</span>
              <span className="text-purple-700 font-bold">+ ₹ {curOtAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Gross Earnings:</span>
              <span className="text-amber-700 font-bold">₹ {curGross.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Deductions:</span>
              <span className="text-rose-600 font-bold">- ₹ {curTotalDeduct.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700 text-sm font-bold pt-2 border-t border-slate-200">
              <span>Net Take-Home Pay:</span>
              <span>₹ {curNet.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 font-semibold"
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
                  <span className="font-semibold text-rose-600">- ₹ {(Number(activeSlip.advanceDeduction) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Company Loan EMI:</span>
                  <span className="font-semibold text-rose-600">- ₹ {(Number(activeSlip.loanEmi) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Other / Tax Deductions:</span>
                  <span className="font-semibold text-rose-600">- ₹ {(Number(activeSlip.otherDeductions) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-900 text-xs font-bold pt-2 border-t border-slate-100">
                  <span>Total Deductions:</span>
                  <span className="text-sm font-black text-rose-600">
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

            {/* Remarks section if available */}
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
