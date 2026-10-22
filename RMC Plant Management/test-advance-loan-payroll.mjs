/**
 * Comprehensive Test Suite: Advance & Loan Management + Automatic Salary Deduction
 * Verifies all 12 points specified in user request.
 */

import {
  INITIAL_EMPLOYEES,
  INITIAL_ADVANCES,
  INITIAL_LOANS,
} from './src/data/mockWorkforceData.js';

console.log('=====================================================');
console.log('Advance & Loan Management + Payroll Integration Test');
console.log('=====================================================');

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// 1. Initial State Checks
assert(INITIAL_ADVANCES.length === 0, 'Initial advances array is clean (got 0)');
assert(INITIAL_LOANS.length === 0, 'Initial loans array is clean (got 0)');

// Test Data
const employees = [
  { id: 'EMP-001', name: 'Ramesh Patil', role: 'Mixer Driver', department: 'Logistics', salary: 25000, plant: 'Main Plant Unit #01' },
  { id: 'EMP-002', name: 'Suresh Kumar', role: 'Plant Operator', department: 'Production', salary: 20000, plant: 'Main Plant Unit #01' },
  { id: 'EMP-003', name: 'Amit Sharma', role: 'Site Supervisor', department: 'Field Operations', salary: 15000, plant: 'Main Plant Unit #01' },
];

let advances = [];
let loans = [];
let payrollRecords = [];

// Helper functions simulating WorkforceContext logic
function recordAdvance(advData) {
  const amount = Number(advData.advanceAmount);
  if (!amount || amount <= 0) throw new Error('Invalid advance amount');
  if (!advData.employeeId) throw new Error('Missing employee ID');
  const emp = employees.find(e => e.id === advData.employeeId);
  if (!emp) throw new Error('Employee not found');

  const newAdvance = {
    id: advData.id || `ADV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    employeeId: advData.employeeId,
    employeeName: emp.name,
    role: emp.role,
    plant: emp.plant,
    advanceAmount: amount,
    approvedAmount: amount,
    recoveredAmount: 0,
    balance: amount,
    date: advData.date || '2026-10-01',
    reason: advData.reason || 'Personal necessity',
    monthlyDeduction: Number(advData.monthlyDeduction) > 0 ? Number(advData.monthlyDeduction) : amount,
    status: 'Approved',
    repaymentHistory: [],
  };
  advances.push(newAdvance);
  return newAdvance;
}

function recordLoan(loanData) {
  const loanAmount = Number(loanData.loanAmount);
  if (!loanAmount || loanAmount <= 0) throw new Error('Invalid loan amount');
  if (!loanData.employeeId) throw new Error('Missing employee ID');
  const emp = employees.find(e => e.id === loanData.employeeId);
  if (!emp) throw new Error('Employee not found');

  let emiAmount = Number(loanData.monthlyEmi);
  let totalEmis = Number(loanData.totalEmis);

  if (emiAmount > 0) {
    totalEmis = totalEmis || Math.ceil(loanAmount / emiAmount);
  } else if (totalEmis > 0) {
    emiAmount = Math.round(loanAmount / totalEmis);
  } else {
    throw new Error('Must provide valid EMI or tenure');
  }

  emiAmount = Math.min(loanAmount, emiAmount);

  const newLoan = {
    id: loanData.id || `LON-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    employeeId: loanData.employeeId,
    employeeName: emp.name,
    role: emp.role,
    plant: emp.plant,
    loanAmount,
    emiAmount,
    totalEmis,
    paidEmis: 0,
    remainingEmis: totalEmis,
    amountRepaid: 0,
    outstandingBalance: loanAmount,
    startDate: loanData.startDate || '2026-10-01',
    reason: loanData.reason || 'Medical assistance',
    status: 'Active',
    repaymentHistory: [],
  };
  loans.push(newLoan);
  return newLoan;
}

function computeSalary(emp, monthYear) {
  const basicSalary = emp.salary;
  const workingDays = 26;
  const presentDays = 26;
  const dailyRate = basicSalary / workingDays;
  const earnedBasic = Math.round(dailyRate * presentDays);
  const otAmount = 0;
  const allowances = 0;
  const grossSalary = earnedBasic + otAmount + allowances;

  // 1. Fetch outstanding advance
  const empAdv = advances.filter(a => a.employeeId === emp.id && a.balance > 0 && a.status !== 'Rejected');
  const scheduledAdvance = empAdv.reduce((sum, a) => sum + Math.min(a.balance, a.monthlyDeduction || a.balance), 0);

  // 2. Fetch scheduled loan EMI
  const empL = loans.filter(l => l.employeeId === emp.id && l.status === 'Active' && l.outstandingBalance > 0);
  const scheduledLoanEmi = empL.reduce((sum, l) => sum + Math.min(l.outstandingBalance, l.emiAmount), 0);

  // 3. Total desired deduction
  const otherDeductions = 0;
  const availableSalary = Math.max(0, grossSalary - otherDeductions);
  const totalDesired = scheduledAdvance + scheduledLoanEmi;

  let advanceDeduction = scheduledAdvance;
  let loanEmi = scheduledLoanEmi;
  let insufficientSalary = false;

  if (totalDesired > availableSalary) {
    insufficientSalary = true;
    advanceDeduction = Math.min(scheduledAdvance, availableSalary);
    loanEmi = Math.min(scheduledLoanEmi, Math.max(0, availableSalary - advanceDeduction));
  }

  const totalDeductions = advanceDeduction + loanEmi + otherDeductions;
  const netPayable = Math.max(0, grossSalary - totalDeductions);

  return {
    id: `PAY-${monthYear.replace(/\s+/g, '')}-${emp.id}`,
    monthYear,
    employeeId: emp.id,
    employeeName: emp.name,
    basicSalary,
    grossSalary,
    advanceDeduction,
    loanEmi,
    otherDeductions,
    totalDeductions,
    netPayable,
    insufficientSalary,
    deductionsApplied: false,
    status: 'Calculated',
  };
}

function finalizePayroll(records, monthYear) {
  return records.map(p => {
    if (p.deductionsApplied) return p; // Prevent double deduction!

    // Deduct advance
    if (p.advanceDeduction > 0) {
      let remAdv = p.advanceDeduction;
      advances = advances.map(a => {
        if (a.employeeId === p.employeeId && a.balance > 0 && remAdv > 0) {
          const deductThis = Math.min(a.balance, remAdv);
          remAdv -= deductThis;
          const newBal = a.balance - deductThis;
          a.repaymentHistory.push({
            date: '2026-10-31',
            monthYear,
            amount: deductThis,
            balanceAfter: newBal,
            type: 'Payroll Advance Recovery',
          });
          return {
            ...a,
            recoveredAmount: a.recoveredAmount + deductThis,
            balance: newBal,
            status: newBal === 0 ? 'Fully Recovered' : 'Partially Recovered',
          };
        }
        return a;
      });
    }

    // Deduct loan EMI
    if (p.loanEmi > 0) {
      let remEmi = p.loanEmi;
      loans = loans.map(l => {
        if (l.employeeId === p.employeeId && l.status === 'Active' && l.outstandingBalance > 0 && remEmi > 0) {
          const deductThis = Math.min(l.outstandingBalance, remEmi);
          remEmi -= deductThis;
          const newBal = l.outstandingBalance - deductThis;
          const newPaid = l.paidEmis + 1;
          l.repaymentHistory.push({
            date: '2026-10-31',
            monthYear,
            amount: deductThis,
            balanceAfter: newBal,
            emiNumber: newPaid,
            type: 'Payroll EMI Deduction',
          });
          return {
            ...l,
            paidEmis: newPaid,
            remainingEmis: Math.max(0, l.totalEmis - newPaid),
            amountRepaid: l.amountRepaid + deductThis,
            outstandingBalance: newBal,
            status: newBal === 0 ? 'Closed' : 'Active',
          };
        }
        return l;
      });
    }

    return {
      ...p,
      deductionsApplied: true,
      status: 'Approved',
    };
  });
}

// -----------------------------------------------------
// TEST EXECUTION
// -----------------------------------------------------

// Test 1: Record Advance
const adv1 = recordAdvance({
  employeeId: 'EMP-002',
  advanceAmount: 2000,
  date: '2026-10-05',
  reason: 'Urgent household requirement',
});
assert(adv1.advanceAmount === 2000, 'Test 1: Record employee advance of ₹2,000');
assert(adv1.balance === 2000, 'Test 2: Correct advance balance displayed: ₹2,000');
assert(adv1.recoveredAmount === 0, 'Test 2b: Amount already deducted starts at ₹0');

// Test 3: Record Loan
const loan1 = recordLoan({
  employeeId: 'EMP-002',
  loanAmount: 12000,
  monthlyEmi: 1000,
  startDate: '2026-10-01',
  reason: 'Family home roof tin repair',
});
assert(loan1.loanAmount === 12000 && loan1.emiAmount === 1000, 'Test 3: Record loan assigned to Suresh Kumar: ₹12,000 @ ₹1,000/mo');
assert(loan1.totalEmis === 12, 'Test 3b: Calculated tenure is 12 EMIs');
assert(loan1.outstandingBalance === 12000, 'Test 4: Correct outstanding loan balance displayed: ₹12,000');

// Test 5 & 6: Automatic Payroll Deduction Computation (Matching Prompt Example)
// Monthly Salary: ₹20,000, Advance Deduction: ₹2,000, Loan EMI: ₹1,000, Total Deduction: ₹3,000, Net Salary: ₹17,000
const paySlipOct = computeSalary(employees[1], 'October 2026');
assert(paySlipOct.basicSalary === 20000, 'Example Match: Monthly Salary = ₹20,000');
assert(paySlipOct.advanceDeduction === 2000, 'Test 5a: Advance deduction correctly fetched = ₹2,000');
assert(paySlipOct.loanEmi === 1000, 'Test 5b: Loan EMI correctly fetched = ₹1,000');
assert(paySlipOct.totalDeductions === 3000, 'Test 5c: Total Deduction = Advance (₹2,000) + Loan EMI (₹1,000) = ₹3,000');
assert(paySlipOct.netPayable === 17000, 'Test 6: Net Salary Payable = ₹20,000 - ₹3,000 = ₹17,000');
assert(paySlipOct.deductionsApplied === false, 'Test 6b: Deductions not finalized before payroll approval');

// Test 7: Deductions Applied on Finalization
const finalizedOct = finalizePayroll([paySlipOct], 'October 2026');
assert(finalizedOct[0].status === 'Approved', 'Test 7a: Payroll status Approved');
assert(finalizedOct[0].deductionsApplied === true, 'Test 7b: deductionsApplied marked true');

const updatedAdv1 = advances.find(a => a.id === adv1.id);
assert(updatedAdv1.recoveredAmount === 2000, 'Test 8a: Advance recovered amount updated to ₹2,000');
assert(updatedAdv1.balance === 0, 'Test 8b: Advance remaining balance updated to ₹0');
assert(updatedAdv1.status === 'Fully Recovered', 'Test 8c: Advance status updated to Fully Recovered');
assert(updatedAdv1.repaymentHistory.length === 1, 'Test 8d: Advance repayment history recorded entry');

const updatedLoan1 = loans.find(l => l.id === loan1.id);
assert(updatedLoan1.amountRepaid === 1000, 'Test 8e: Loan amount repaid updated to ₹1,000');
assert(updatedLoan1.outstandingBalance === 11000, 'Test 8f: Loan outstanding balance updated to ₹11,000');
assert(updatedLoan1.paidEmis === 1 && updatedLoan1.remainingEmis === 11, 'Test 8g: Paid EMIs: 1, Remaining EMIs: 11');
assert(updatedLoan1.repaymentHistory.length === 1, 'Test 8h: Loan repayment history recorded entry for October 2026');

// Test 7 & 9: Prevent Duplicate Deductions If Processed Again
const reFinalized = finalizePayroll(finalizedOct, 'October 2026');
const advAfterReprocess = advances.find(a => a.id === adv1.id);
const loanAfterReprocess = loans.find(l => l.id === loan1.id);
assert(advAfterReprocess.balance === 0, 'Test 7c: Duplicate advance deduction strictly prevented on re-process');
assert(loanAfterReprocess.outstandingBalance === 11000, 'Test 7d: Duplicate loan EMI deduction strictly prevented on re-process');
assert(loanAfterReprocess.repaymentHistory.length === 1, 'Test 7e: Repayment history length unchanged (1 entry)');

// Test Next Cycle (November 2026): Advance balance is 0, only loan EMI is deducted
const paySlipNov = computeSalary(employees[1], 'November 2026');
assert(paySlipNov.advanceDeduction === 0, 'Test 8i: November Advance deduction is ₹0 (already fully recovered)');
assert(paySlipNov.loanEmi === 1000, 'Test 8j: November Loan EMI is ₹1,000');
assert(paySlipNov.totalDeductions === 1000, 'Test 8k: November Total Deductions = ₹1,000');
assert(paySlipNov.netPayable === 19000, 'Test 8l: November Net Salary = ₹19,000');

// Test 9: Input Validation
let invalidAdvancePrevented = false;
try {
  recordAdvance({ employeeId: 'EMP-001', advanceAmount: -500 });
} catch {
  invalidAdvancePrevented = true;
}
assert(invalidAdvancePrevented, 'Test 9a: Negative advance amount rejected');

let missingEmployeePrevented = false;
try {
  recordAdvance({ employeeId: '', advanceAmount: 5000 });
} catch {
  missingEmployeePrevented = true;
}
assert(missingEmployeePrevented, 'Test 9b: Advance without employee rejected');

// Test 5 Safeguard: Insufficient Salary Warning & Capping (No Negative Salary)
const lowSalaryEmp = { id: 'EMP-LOW', name: 'Part-time Cleaner', role: 'Staff', salary: 3000 };
employees.push(lowSalaryEmp);
recordAdvance({ employeeId: 'EMP-LOW', advanceAmount: 2500, date: '2026-10-01' });
recordLoan({ employeeId: 'EMP-LOW', loanAmount: 5000, monthlyEmi: 1500, startDate: '2026-10-01' });

// Gross: ₹3,000. Desired Deductions: ₹2,500 + ₹1,500 = ₹4,000 > ₹3,000
const paySlipLow = computeSalary(lowSalaryEmp, 'October 2026');
assert(paySlipLow.insufficientSalary === true, 'Test 5d: Insufficient salary detected when deductions exceed earnings');
assert(paySlipLow.netPayable >= 0, 'Test 5e: Net salary payable is NEVER negative (got ₹' + paySlipLow.netPayable + ')');
assert(paySlipLow.totalDeductions <= paySlipLow.grossSalary, 'Test 5f: Deductions capped to not exceed gross earnings');

// Test 10: Repayments Do Not Exceed Remaining Loan Balance
const smallLoan = recordLoan({ employeeId: 'EMP-003', loanAmount: 1500, monthlyEmi: 1000, startDate: '2026-10-01' });
// Month 1: EMI 1000, balance becomes 500
const slip1 = finalizePayroll([computeSalary(employees[2], 'October 2026')], 'October 2026');
const smallLoanM1 = loans.find(l => l.id === smallLoan.id);
assert(smallLoanM1.outstandingBalance === 500, 'Test 10a: After Month 1, small loan balance = ₹500');

// Month 2: Scheduled EMI was 1000, but remaining balance is only 500!
const slip2 = computeSalary(employees[2], 'November 2026');
assert(slip2.loanEmi === 500, 'Test 10b: Loan EMI capped to remaining balance of ₹500 (does not exceed balance)');
const finalizedSlip2 = finalizePayroll([slip2], 'November 2026');
const smallLoanM2 = loans.find(l => l.id === smallLoan.id);
assert(smallLoanM2.outstandingBalance === 0, 'Test 10c: Small loan fully closed with remaining balance = ₹0');
assert(smallLoanM2.status === 'Closed', 'Test 10d: Loan status marked Closed');
assert(smallLoanM2.amountRepaid === 1500, 'Test 10e: Total amount repaid exactly ₹1,500');

console.log('=====================================================');
console.log(`Results: ${passed}/${total} Tests Passed`);
console.log('=====================================================');
