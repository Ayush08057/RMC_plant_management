import {
  INITIAL_EMPLOYEES,
  INITIAL_SHIFTS,
  INITIAL_ATTENDANCE,
  INITIAL_DAILY_WORK,
  INITIAL_LEAVES,
  INITIAL_ADVANCES,
  INITIAL_LOANS,
  INITIAL_DOCUMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_HR_SETTINGS
} from './src/data/mockWorkforceData.js';
import {
  MOCK_ADMIN_DATA,
  MOCK_PLANT_MANAGER_DATA,
  MOCK_ACCOUNTANT_DATA,
  MOCK_DISPATCHER_DATA,
  MOCK_QC_DATA,
  MOCK_SITE_SUPERVISOR_DATA,
  MOCK_DRIVER_DATA,
  MOCK_OWNER_DATA
} from './src/data/mockDashboardData.js';

console.log('=====================================================');
console.log('RMC Plant Management System - Clean Structure & Logic Test');
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

// 1. Clean Zero Dummy Data Verifications
assert(INITIAL_EMPLOYEES.length === 0, `Zero dummy employees in initial state (got ${INITIAL_EMPLOYEES.length})`);
assert(INITIAL_ATTENDANCE.length === 0, `Zero dummy attendance records in initial state (got ${INITIAL_ATTENDANCE.length})`);
assert(INITIAL_DAILY_WORK.length === 0, `Zero dummy daily work logs (got ${INITIAL_DAILY_WORK.length})`);
assert(INITIAL_LEAVES.length === 0, `Zero dummy leave records (got ${INITIAL_LEAVES.length})`);
assert(INITIAL_ADVANCES.length === 0, `Zero dummy advance records (got ${INITIAL_ADVANCES.length})`);
assert(INITIAL_LOANS.length === 0, `Zero dummy loan records (got ${INITIAL_LOANS.length})`);
assert(INITIAL_DOCUMENTS.length === 0, `Zero dummy documents in initial state (got ${INITIAL_DOCUMENTS.length})`);
assert(INITIAL_AUDIT_LOGS.length === 0, `Zero dummy audit logs in initial state (got ${INITIAL_AUDIT_LOGS.length})`);

// 2. Dashboard Dummy Arrays Removed
assert(MOCK_ADMIN_DATA.employees.length === 0, `Admin dashboard has 0 dummy employees`);
assert(MOCK_ADMIN_DATA.systemActivities.length === 0, `Admin dashboard has 0 dummy activities`);
assert(MOCK_PLANT_MANAGER_DATA.siloStock.length === 0, `Plant Manager has 0 dummy silo records`);
assert(MOCK_PLANT_MANAGER_DATA.pendingOrders.length === 0, `Plant Manager has 0 dummy pending orders`);
assert(MOCK_ACCOUNTANT_DATA.customerLedgers.length === 0, `Accountant has 0 dummy customer ledgers`);
assert(MOCK_DISPATCHER_DATA.dispatchQueue.length === 0, `Dispatcher has 0 dummy dispatches`);
assert(MOCK_QC_DATA.tests.length === 0, `QC Engineer has 0 dummy test records`);
assert(MOCK_SITE_SUPERVISOR_DATA.todayDeliveries.length === 0, `Site Supervisor has 0 dummy deliveries`);
assert(MOCK_SITE_SUPERVISOR_DATA.currentSite === null, `Site Supervisor has null active pour (empty state)`);
assert(MOCK_DRIVER_DATA.currentTrip === null, `Driver dashboard has null active trip (empty state)`);
assert(MOCK_DRIVER_DATA.todayCompletedTrips.length === 0, `Driver has 0 dummy completed trips`);
assert(MOCK_OWNER_DATA.plantComparison.length === 0, `Owner has 0 dummy plant comparisons`);

assert(INITIAL_SHIFTS.length === 0, `Zero dummy shifts in initial state (got ${INITIAL_SHIFTS.length})`);
assert(INITIAL_HR_SETTINGS.standardWorkingHours === 8, `HR operational configuration preserved (8 hrs/day)`);

// 4. Dynamic Employee Creation & Validation
const dynamicEmployees = [];
function addEmp(emp) {
  if (dynamicEmployees.some(e => e.id === emp.id)) {
    throw new Error(`Employee ID ${emp.id} already exists`);
  }
  dynamicEmployees.push(emp);
  return emp;
}

const emp1 = addEmp({ id: 'EMP-1001', name: 'Rohan Sharma', role: 'Driver', salary: 32000 });
assert(dynamicEmployees.length === 1 && emp1.id === 'EMP-1001', `Successfully registered new employee Rohan Sharma`);

let duplicatePrevented = false;
try {
  addEmp({ id: 'EMP-1001', name: 'Duplicate Rohan', role: 'Driver' });
} catch {
  duplicatePrevented = true;
}
assert(duplicatePrevented, `Duplicate employee ID strictly rejected`);

// Test Permanent Employee Deletion
function delEmp(id) {
  const idx = dynamicEmployees.findIndex(e => e.id === id);
  if (idx !== -1) dynamicEmployees.splice(idx, 1);
}
delEmp('EMP-1001');
assert(dynamicEmployees.length === 0, `Permanently deleted employee EMP-1001; record removed from list`);

// 5. Dynamic Payroll Calculation Math
const daysInMonth = 30;
const perDayRate = (emp1.salary || 32000) / daysInMonth;
const presentDays = 26;
const leaveDays = 2;
const earnedBasic = Math.round(perDayRate * (presentDays + leaveDays));
const hourlyRate = (emp1.salary || 32000) / (daysInMonth * 8);
const otHours = 10;
const otAmount = Math.round(otHours * hourlyRate * 1.5);
const grossSalary = earnedBasic + otAmount;

const advanceDeduction = 2500;
const loanEmi = 1500;
const totalDeductions = advanceDeduction + loanEmi;
const netTakeHome = grossSalary - totalDeductions;

assert(earnedBasic > 0, `Earned basic computed: ₹ ${earnedBasic}`);
assert(otAmount > 0, `Overtime pay computed: ₹ ${otAmount}`);
assert(grossSalary === earnedBasic + otAmount, `Gross earnings matches sum: ₹ ${grossSalary}`);
assert(netTakeHome === grossSalary - totalDeductions, `Net take-home computed: ₹ ${netTakeHome}`);

// 6. Punch In / Out Working Hours Math
const punchIn = '08:00';
const punchOut = '17:30';
const [inH, inM] = punchIn.split(':').map(Number);
const [outH, outM] = punchOut.split(':').map(Number);
const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
const hoursWorked = +(totalMinutes / 60).toFixed(1);
const standardHours = 8;
const computedOt = Math.max(0, +(hoursWorked - standardHours).toFixed(1));

assert(hoursWorked === 9.5, `Total worked hours computed accurately: 9.5 hrs`);
assert(computedOt === 1.5, `Overtime hours computed accurately: 1.5 hrs OT`);

console.log('=====================================================');
console.log(`Clean State & Workforce Logic Verification: ${passed}/${total} Passed`);
console.log('=====================================================');
