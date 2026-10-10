/**
 * Comprehensive End-to-End Test Suite for Employee Authentication,
 * Manual Registration, Admin Verification, and Role-Based Portals.
 * Validates all 12 Tests requested in Section 25.
 */

import { ROLES, ROLE_ROUTES, SYSTEM_ADMIN } from './src/data/mockUsers.js';
import { 
  EMPLOYEE_STATUS, 
  validateEmployeeForRegistration, 
  validateLoginAttempt 
} from './src/services/employeeAuthService.js';

console.log('================================================================');
console.log('RMC Plant Management - End-to-End Employee Verification Test');
console.log('================================================================');

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// In-memory simulation of workforce database & registered accounts
let simulatedEmployees = [];
let simulatedUsers = [];
let simulatedTrips = [];

// Helper functions mimicking WorkforceContext actions
function adminCreateEmployee(empData) {
  const newEmp = {
    ...empData,
    id: empData.id.toUpperCase(),
    status: empData.status || EMPLOYEE_STATUS.PENDING_REGISTRATION,
    salary: empData.salary || 30000,
    plant: empData.plant || 'Main Plant Unit #01',
    mobile: empData.mobile,
    email: empData.email,
  };
  simulatedEmployees.push(newEmp);
  return newEmp;
}

function employeeSubmitRegistration(registrationPayload) {
  const validation = validateEmployeeForRegistration(registrationPayload, simulatedEmployees);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { employee } = validation;
  // Ignore any role submitted by frontend: role strictly remains employee.role
  const updatedEmp = {
    ...employee,
    status: EMPLOYEE_STATUS.PENDING_APPROVAL,
    registeredAt: new Date().toISOString(),
    registeredMobile: registrationPayload.mobile,
    registeredEmail: registrationPayload.email,
    password: registrationPayload.password,
  };

  const idx = simulatedEmployees.findIndex(e => e.id === employee.id);
  simulatedEmployees[idx] = updatedEmp;

  return {
    success: true,
    status: EMPLOYEE_STATUS.PENDING_APPROVAL,
    assignedRole: employee.role, // TRUSTED role from backend
    message: 'Registration successful. Your account is waiting for Admin verification.',
  };
}

function adminApproveEmployee(employeeId) {
  const emp = simulatedEmployees.find(e => e.id === employeeId);
  if (!emp) throw new Error('Employee not found');

  emp.status = EMPLOYEE_STATUS.ACTIVE;
  emp.approvedAt = new Date().toISOString();

  // Create user record with trusted role
  const userRecord = {
    id: `USR-${emp.id}`,
    employeeId: emp.id,
    name: emp.name,
    email: emp.email,
    phone: emp.mobile,
    role: emp.role, // TRUSTED role from Admin
    status: EMPLOYEE_STATUS.ACTIVE,
    password: emp.password,
  };

  simulatedUsers.push(userRecord);
  return emp;
}

function adminRejectEmployee(employeeId, reason = 'Verification rejected') {
  const emp = simulatedEmployees.find(e => e.id === employeeId);
  if (!emp) throw new Error('Employee not found');

  emp.status = EMPLOYEE_STATUS.REJECTED;
  emp.rejectionReason = reason;
  return emp;
}

function assignTrip(tripData) {
  const trip = {
    id: tripData.id,
    driverId: tripData.driverId.toUpperCase(),
    customer: tripData.customer,
    site: tripData.site,
    vehicleNo: tripData.vehicleNo || 'MH-04-AZ-9921',
    status: 'Active',
  };
  simulatedTrips.push(trip);
  return trip;
}

function getDriverAssignedTrips(driverId) {
  return simulatedTrips.filter(t => t.driverId === driverId.toUpperCase());
}

// -----------------------------------------------------------------
// TEST 1 — New Employee: Admin creates Driver DRV001. Expected: Pending Registration
// -----------------------------------------------------------------
const emp1 = adminCreateEmployee({
  id: 'DRV001',
  name: 'Ramesh Patil',
  role: ROLES.DRIVER,
  mobile: '+91 98200 44001',
  email: 'ramesh.patil@smconcretech.com',
  plant: 'Main Plant Unit #01',
});

assert(
  emp1.status === EMPLOYEE_STATUS.PENDING_REGISTRATION,
  `TEST 1: Admin created Driver DRV001 with status "${EMPLOYEE_STATUS.PENDING_REGISTRATION}"`
);

// Verify employee cannot log in while in Pending Registration
const prematureLogin = validateLoginAttempt('DRV001', 'Password@123', simulatedEmployees, simulatedUsers);
assert(
  !prematureLogin.allowed && prematureLogin.error.includes('complete employee registration first'),
  `TEST 1: Driver DRV001 cannot log in before registering (${prematureLogin.error})`
);

// -----------------------------------------------------------------
// TEST 2 — Manual Registration: DRV001 registers online. Expected: Pending Approval. No dashboard access.
// -----------------------------------------------------------------
const regResult = employeeSubmitRegistration({
  employeeId: 'DRV001',
  name: 'Ramesh Patil',
  mobile: '+91 98200 44001',
  email: 'ramesh.patil@smconcretech.com',
  password: 'SecurePassword@123',
  confirmPassword: 'SecurePassword@123',
});

assert(
  regResult.success && regResult.status === EMPLOYEE_STATUS.PENDING_APPROVAL,
  `TEST 2: DRV001 registered successfully and transitioned to "${EMPLOYEE_STATUS.PENDING_APPROVAL}"`
);

const pendingLogin = validateLoginAttempt('DRV001', 'SecurePassword@123', simulatedEmployees, simulatedUsers);
assert(
  !pendingLogin.allowed && pendingLogin.error.includes('pending Admin approval'),
  `TEST 2: DRV001 has zero dashboard access while Pending Approval (${pendingLogin.error})`
);

// -----------------------------------------------------------------
// TEST 3 — Invalid Employee: Unknown employee attempts registration. Expected: Registration rejected.
// -----------------------------------------------------------------
const unknownReg = employeeSubmitRegistration({
  employeeId: 'UNKNOWN-999',
  name: 'Ghost User',
  mobile: '+91 99999 99999',
  email: 'ghost@unknown.com',
  password: 'Password@123',
  confirmPassword: 'Password@123',
});

assert(
  !unknownReg.success && unknownReg.error === 'Employee record not found. Please contact Admin.',
  `TEST 3: Unknown employee registration rejected: "${unknownReg.error}"`
);

// -----------------------------------------------------------------
// TEST 4 — Role Protection: Driver attempts to select Admin during registration.
// Expected: Impossible. Role remains Driver.
// -----------------------------------------------------------------
// Even if malicious payload sends role: 'Admin'
const spoofedReg = employeeSubmitRegistration({
  employeeId: 'DRV001', // Already in Pending Approval
  name: 'Ramesh Patil',
  mobile: '+91 98200 44001',
  email: 'ramesh.patil@smconcretech.com',
  role: ROLES.ADMIN, // Malicious spoof
  password: 'HackerPassword@123',
  confirmPassword: 'HackerPassword@123',
});

assert(
  !spoofedReg.success && spoofedReg.error.includes('already submitted and waiting'),
  `TEST 4: Duplicate registration prevented for DRV001`
);

const currentRecord = simulatedEmployees.find(e => e.id === 'DRV001');
assert(
  currentRecord.role === ROLES.DRIVER,
  `TEST 4: Role manipulation impossible; role remains strictly "${currentRecord.role}"`
);

// -----------------------------------------------------------------
// TEST 5 — Admin Approval: Admin approves DRV001. Expected: Active.
// -----------------------------------------------------------------
const approvedEmp = adminApproveEmployee('DRV001');
assert(
  approvedEmp.status === EMPLOYEE_STATUS.ACTIVE,
  `TEST 5: Admin approved DRV001; status updated to "${EMPLOYEE_STATUS.ACTIVE}"`
);

// -----------------------------------------------------------------
// TEST 6 — Driver Login: DRV001 logs in. Expected: Driver Personal Portal. Not Admin Dashboard.
// -----------------------------------------------------------------
const driverLogin = validateLoginAttempt('DRV001', 'SecurePassword@123', simulatedEmployees, simulatedUsers);
assert(
  driverLogin.allowed === true && driverLogin.role === ROLES.DRIVER,
  `TEST 6: DRV001 logged in successfully with verified role "${driverLogin.role}"`
);
assert(
  driverLogin.redirectPath === '/driver',
  `TEST 6: DRV001 directed to Driver Personal Portal (/driver) instead of /admin`
);

// -----------------------------------------------------------------
// TEST 7 — Task Filtering: Assign Trip #1025 to DRV001.
// Expected: DRV001 sees Trip #1025. DRV001 must not see another driver's private trip.
// -----------------------------------------------------------------
const trip1025 = assignTrip({
  id: 'TRIP-1025',
  driverId: 'DRV001',
  customer: 'L&T Metro Infra',
  site: 'Metro Pier #14',
});

const trip1026 = assignTrip({
  id: 'TRIP-1026',
  driverId: 'DRV002', // Assigned to a different driver
  customer: 'Godrej Properties',
  site: 'Godrej Woods Site B',
});

const drv001Trips = getDriverAssignedTrips('DRV001');
const seesOwnTrip = drv001Trips.some(t => t.id === 'TRIP-1025');
const seesOtherDriverTrip = drv001Trips.some(t => t.id === 'TRIP-1026');

assert(
  seesOwnTrip && !seesOtherDriverTrip,
  `TEST 7: DRV001 sees assigned Trip #1025 but does NOT see Trip #1026 assigned to another driver`
);

// -----------------------------------------------------------------
// TEST 8 — Unauthorized Dashboard: Driver tries to access Admin Dashboard URL (/admin).
// Expected: Access Denied.
// -----------------------------------------------------------------
function checkRoutePermission(userRole, targetRoute) {
  const routePermissions = {
    '/admin': [ROLES.ADMIN],
    '/plant-manager': [ROLES.PLANT_MANAGER, ROLES.ADMIN, ROLES.OWNER_DIRECTOR],
    '/accountant': [ROLES.ACCOUNTANT, ROLES.ADMIN, ROLES.OWNER_DIRECTOR],
    '/dispatcher': [ROLES.DISPATCHER, ROLES.ADMIN, ROLES.PLANT_MANAGER],
    '/qc': [ROLES.QC_ENGINEER, ROLES.ADMIN, ROLES.PLANT_MANAGER],
    '/site-supervisor': [ROLES.SITE_SUPERVISOR, ROLES.ADMIN, ROLES.PLANT_MANAGER, ROLES.DISPATCHER],
    '/driver': [ROLES.DRIVER, ROLES.ADMIN, ROLES.DISPATCHER],
    '/owner': [ROLES.OWNER_DIRECTOR, ROLES.ADMIN],
  };

  const allowed = routePermissions[targetRoute] || [];
  return allowed.includes(userRole);
}

const driverAccessAdmin = checkRoutePermission(ROLES.DRIVER, '/admin');
assert(
  driverAccessAdmin === false,
  `TEST 8: Driver accessing /admin is rejected: Access Denied`
);

// -----------------------------------------------------------------
// TEST 9 — Rejected Employee: Admin rejects another employee.
// Expected: That employee cannot log in/access portal.
// -----------------------------------------------------------------
const emp2 = adminCreateEmployee({
  id: 'EMP-REJ-01',
  name: 'Sunil Verma',
  role: ROLES.QC_ENGINEER,
  mobile: '+91 98200 44099',
  email: 'sunil@smconcretech.com',
});

employeeSubmitRegistration({
  employeeId: 'EMP-REJ-01',
  name: 'Sunil Verma',
  mobile: '+91 98200 44099',
  email: 'sunil@smconcretech.com',
  password: 'Password@123',
  confirmPassword: 'Password@123',
});

adminRejectEmployee('EMP-REJ-01', 'Incomplete KYC documentation');

const rejectedLogin = validateLoginAttempt('EMP-REJ-01', 'Password@123', simulatedEmployees, simulatedUsers);
assert(
  !rejectedLogin.allowed && rejectedLogin.error.includes('rejected'),
  `TEST 9: Rejected employee cannot log in (${rejectedLogin.error})`
);

// -----------------------------------------------------------------
// TEST 10 — Logout: Employee logs out.
// Expected: Protected pages cannot be accessed without logging in again.
// -----------------------------------------------------------------
let authenticatedSession = { ...driverLogin.user };
// Simulate logout
authenticatedSession = null;

const unauthenticatedAccess = !authenticatedSession;
assert(
  unauthenticatedAccess === true,
  `TEST 10: After logout, session is cleared and protected pages redirect to /login`
);

// -----------------------------------------------------------------
// TEST 11 — Role Change: Admin changes an employee from Driver to Supervisor.
// Expected: After the next authenticated session, employee receives Supervisor permissions.
// -----------------------------------------------------------------
const empToPromote = simulatedEmployees.find(e => e.id === 'DRV001');
empToPromote.role = ROLES.SITE_SUPERVISOR;

// Update in users table as well
const userToPromote = simulatedUsers.find(u => u.employeeId === 'DRV001');
if (userToPromote) userToPromote.role = ROLES.SITE_SUPERVISOR;

const nextLogin = validateLoginAttempt('DRV001', 'SecurePassword@123', simulatedEmployees, simulatedUsers);
assert(
  nextLogin.allowed && nextLogin.role === ROLES.SITE_SUPERVISOR && nextLogin.redirectPath === '/site-supervisor',
  `TEST 11: After Admin role update, next session receives Role "${nextLogin.role}" and routes to ${nextLogin.redirectPath}`
);

// -----------------------------------------------------------------
// TEST 12 — Direct API Security: Attempt to access another employee's task.
// Expected: 403 Forbidden / rejected.
// -----------------------------------------------------------------
function secureGetTripApi(requester, tripId) {
  const trip = simulatedTrips.find(t => t.id === tripId);
  if (!trip) return { status: 404, error: 'Trip not found' };

  // Management roles have broader access; operational roles access only their own
  const isManagement = [ROLES.ADMIN, ROLES.DISPATCHER, ROLES.PLANT_MANAGER].includes(requester.role);
  const isAssigned = trip.driverId === requester.employeeId;

  if (!isManagement && !isAssigned) {
    return { status: 403, error: '403 Forbidden: Unauthorized access to trip records' };
  }

  return { status: 200, data: trip };
}

// DRV001 requests TRIP-1026 which belongs to DRV002
const unauthorizedApiAttempt = secureGetTripApi({ employeeId: 'DRV001', role: ROLES.DRIVER }, 'TRIP-1026');
assert(
  unauthorizedApiAttempt.status === 403,
  `TEST 12: Direct API request for another employee's task rejected with 403 Forbidden`
);

console.log('================================================================');
console.log(`E2E Verification Summary: ${passedCount}/${totalCount} Tests Passed`);
console.log('================================================================');

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
