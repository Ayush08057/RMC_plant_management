/**
 * Enterprise Firestore Database Schema & Data Structure Specification
 * SM CONCRETECH - RMC Plant Management Cloud Architecture
 * 
 * Strict Domain Node Separation:
 * Every business domain entity is partitioned into its own clean, dedicated node.
 * Standardized Document Header:
 * - id: Unique string identifier
 * - companyId: Tenant enterprise scope (default: 'sm-concretech')
 * - createdAt: ISO 8601 creation timestamp
 * - updatedAt: ISO 8601 modification timestamp
 * - status: Normalized lifecycle state
 */

// Global Standard Company Scope
export const DEFAULT_COMPANY_ID = 'sm-concretech';

/**
 * 1. Master Firestore Collections Enum (Dedicated Clean Nodes)
 */
export const FIRESTORE_NODES = {
  // Identity & Access Control
  USERS: 'users',
  COMPANIES: 'companies',

  // Human Resources & Workforce Management
  EMPLOYEES: 'employees',
  SHIFTS: 'shifts',
  ATTENDANCE: 'attendance',
  DAILY_WORK: 'dailyWork',
  LEAVES: 'leaves',
  ADVANCES: 'advances',
  LOANS: 'loans',
  PAYROLL: 'payrollRecords',
  DOCUMENTS: 'documents',
  HR_SETTINGS: 'hrSettings',

  // Real-Time High-Frequency Telemetry (Dedicated Fast Node)
  LIVE_LOCATIONS: 'liveLocations',

  // Plant Operations & Manufacturing Execution
  PLANTS: 'plants',
  ORDERS: 'orders',
  DRIVER_TRIPS: 'driverTrips',
  PLANT_SYNC: 'plantSync',
  AUDIT_LOGS: 'auditLogs',
};

/**
 * Standardizes and sanitizes document IDs to guarantee clean path safety
 */
export function formatSemanticDocId(prefix, ...parts) {
  const cleanParts = parts
    .filter(Boolean)
    .map((p) => String(p).trim().replace(/[^a-zA-Z0-9_-]/g, ''))
    .join('_');
  return cleanParts ? `${prefix}_${cleanParts}` : `${prefix}_${Date.now()}`;
}

/**
 * Standard Document Envelope Builder
 * Guarantees uniform metadata across all database nodes
 */
export function buildDocumentEnvelope(docId, companyId = DEFAULT_COMPANY_ID, extraData = {}) {
  const now = new Date().toISOString();
  return {
    id: String(docId).trim(),
    companyId: String(companyId || DEFAULT_COMPANY_ID).trim(),
    createdAt: extraData.createdAt || now,
    updatedAt: now,
    ...extraData,
  };
}

/**
 * 2. Dedicated Node Builders & Schemas
 */

// Node: USERS (System credentials, permissions, profiles)
export function createUserNode({
  id,
  name,
  email,
  employeeId,
  role,
  department = 'Operations',
  plantLocation = 'Main Plant HQ',
  badge = 'STAFF',
  avatar = 'OP',
  portalRoute = '/admin',
  phone = '+91 98200 00000',
  status = 'Active',
  mustChangePassword = false,
  companyId = DEFAULT_COMPANY_ID,
}) {
  return buildDocumentEnvelope(id || `USR-${employeeId || 'STAFF'}`, companyId, {
    name,
    email: String(email).toLowerCase().trim(),
    secondaryEmail: String(email).toLowerCase().trim(),
    employeeId: String(employeeId || id).trim().toUpperCase(),
    role,
    department,
    plantLocation,
    badge,
    avatar,
    portalRoute,
    phone,
    status,
    mustChangePassword,
  });
}

// Node: EMPLOYEES (Enterprise Staff Directory)
export function createEmployeeNode({
  id,
  employeeId,
  name,
  role,
  department = 'Operations',
  plant = 'Main Plant HQ',
  status = 'Active',
  salary = 35000,
  mobile = '+91 98200 00000',
  email = '',
  joiningDate = new Date().toISOString().split('T')[0],
  shiftId = 'SFT-01',
  companyId = DEFAULT_COMPANY_ID,
}) {
  const canonicalId = String(employeeId || id).trim().toUpperCase();
  return buildDocumentEnvelope(canonicalId, companyId, {
    employeeId: canonicalId,
    name,
    role,
    department,
    plant,
    status,
    salary: Number(salary) || 0,
    mobile,
    email,
    joiningDate,
    shiftId,
  });
}

// Node: ATTENDANCE (Daily Clock-In/Out & Shift Verification)
export function createAttendanceNode({
  id,
  employeeId,
  employeeName,
  role,
  department = 'Operations',
  date = new Date().toISOString().split('T')[0],
  punchIn,
  punchOut = null,
  workingHours = 0,
  overtimeHours = 0,
  status = 'Present',
  gpsLocation = null,
  exitGpsLocation = null,
  geofenceStatus = 'Main Plant Geofence',
  selfieUrl = null,
  routeTrail = [],
  companyId = DEFAULT_COMPANY_ID,
}) {
  const compactDate = String(date).replace(/-/g, '');
  const cleanEmpId = String(employeeId).trim().toUpperCase();
  const docId = id || `ATT_${compactDate}_${cleanEmpId}`;

  return buildDocumentEnvelope(docId, companyId, {
    employeeId: cleanEmpId,
    employeeName,
    role,
    department,
    date,
    punchIn,
    punchOut,
    workingHours: Number(workingHours) || 0,
    overtimeHours: Number(overtimeHours) || 0,
    status,
    gpsLocation,
    exitGpsLocation,
    geofenceStatus,
    selfieUrl,
    routeTrail: Array.isArray(routeTrail) ? routeTrail : [],
  });
}

// Node: LIVE_LOCATIONS (High-Frequency Lightweight GPS Telemetry)
// Isolated to minimize bandwidth and eliminate heavy reads
export function createLiveLocationNode({
  employeeId,
  name,
  role,
  lat,
  lng,
  accuracy = 15,
  speed = null,
  heading = null,
  altitude = null,
  landmarkName = 'Sangli Industrial Area',
  address = '',
  battery = null,
  isCharging = null,
  isOnDuty = true,
  attendanceId = null,
  companyId = DEFAULT_COMPANY_ID,
}) {
  const cleanId = String(employeeId).trim().toUpperCase();
  return buildDocumentEnvelope(cleanId, companyId, {
    employeeId: cleanId,
    name,
    role,
    lat: Number(lat),
    lng: Number(lng),
    accuracy: Number(accuracy) || 15,
    speed: speed !== null ? Number(speed) : null,
    heading: heading !== null ? Number(heading) : null,
    altitude: altitude !== null ? Number(altitude) : null,
    landmarkName,
    address,
    battery: battery !== null ? Number(battery) : null,
    isCharging: Boolean(isCharging),
    isOnDuty: Boolean(isOnDuty),
    attendanceId,
    timestamp: new Date().toISOString(),
  });
}

// Node: SHIFTS (Operating Shifts & Rosters)
export function createShiftNode({
  id,
  name,
  startTime = '08:00 AM',
  endTime = '05:00 PM',
  gracePeriodMinutes = 15,
  status = 'Active',
  companyId = DEFAULT_COMPANY_ID,
}) {
  const cleanId = String(id || `SFT_${Date.now()}`).trim();
  return buildDocumentEnvelope(cleanId, companyId, {
    name,
    startTime,
    endTime,
    gracePeriodMinutes: Number(gracePeriodMinutes) || 0,
    status,
  });
}

// Node: DAILY_WORK (Daily Site Task Logs & Supervisor Approvals)
export function createDailyWorkNode({
  id,
  employeeId,
  date,
  siteName,
  workDescription,
  concretePouredM3 = 0,
  status = 'Submitted',
  supervisorRemarks = '',
  reviewedBy = '',
  companyId = DEFAULT_COMPANY_ID,
}) {
  const cleanId = id || `WRK_${date?.replace(/-/g, '')}_${employeeId}`;
  return buildDocumentEnvelope(cleanId, companyId, {
    employeeId,
    date,
    siteName,
    workDescription,
    concretePouredM3: Number(concretePouredM3) || 0,
    status,
    supervisorRemarks,
    reviewedBy,
  });
}

// Node: LEAVES (Leave Management & Clearance)
export function createLeaveNode({
  id,
  employeeId,
  leaveType = 'Casual',
  fromDate,
  toDate,
  totalDays = 1,
  reason = '',
  status = 'Pending',
  reviewedBy = '',
  reviewerRemarks = '',
  companyId = DEFAULT_COMPANY_ID,
}) {
  const cleanId = id || `LEV_${Date.now()}_${employeeId}`;
  return buildDocumentEnvelope(cleanId, companyId, {
    employeeId,
    leaveType,
    fromDate,
    toDate,
    totalDays: Number(totalDays) || 1,
    reason,
    status,
    reviewedBy,
    reviewerRemarks,
  });
}

// Node: ADVANCES (Salary Advances)
export function createAdvanceNode({
  id,
  employeeId,
  advanceAmount,
  requestDate = new Date().toISOString().split('T')[0],
  recoveryMonth,
  status = 'Pending',
  approvedBy = '',
  companyId = DEFAULT_COMPANY_ID,
}) {
  const cleanId = id || `ADV_${Date.now()}_${employeeId}`;
  return buildDocumentEnvelope(cleanId, companyId, {
    employeeId,
    advanceAmount: Number(advanceAmount) || 0,
    requestDate,
    recoveryMonth,
    status,
    approvedBy,
  });
}

// Node: LOANS (Long-term Employee Loans)
export function createLoanNode({
  id,
  employeeId,
  loanAmount,
  interestRate = 0,
  tenureMonths = 12,
  monthlyDeduction = 0,
  remainingBalance,
  status = 'Active',
  companyId = DEFAULT_COMPANY_ID,
}) {
  const cleanId = id || `LON_${Date.now()}_${employeeId}`;
  return buildDocumentEnvelope(cleanId, companyId, {
    employeeId,
    loanAmount: Number(loanAmount) || 0,
    interestRate: Number(interestRate) || 0,
    tenureMonths: Number(tenureMonths) || 12,
    monthlyDeduction: Number(monthlyDeduction) || 0,
    remainingBalance: remainingBalance !== undefined ? Number(remainingBalance) : Number(loanAmount) || 0,
    status,
  });
}

// Node: PAYROLL (Monthly Payroll Ledger)
export function createPayrollNode({
  id,
  employeeId,
  month,
  basicSalary = 0,
  overtimePay = 0,
  advanceDeduction = 0,
  loanDeduction = 0,
  netPay = 0,
  status = 'Draft',
  companyId = DEFAULT_COMPANY_ID,
}) {
  const cleanId = id || `PAY_${month?.replace(/-/g, '')}_${employeeId}`;
  return buildDocumentEnvelope(cleanId, companyId, {
    employeeId,
    month,
    basicSalary: Number(basicSalary) || 0,
    overtimePay: Number(overtimePay) || 0,
    advanceDeduction: Number(advanceDeduction) || 0,
    loanDeduction: Number(loanDeduction) || 0,
    netPay: Number(netPay) || 0,
    status,
  });
}

// Node: DOCUMENTS (Secure Employee Vault Records)
export function createDocumentNode({
  id,
  employeeId,
  documentType,
  documentNumber = '',
  fileName,
  fileUrl = '',
  verified = false,
  companyId = DEFAULT_COMPANY_ID,
}) {
  const cleanId = id || `DOC_${employeeId}_${documentType?.replace(/[^a-zA-Z0-9]/g, '')}`;
  return buildDocumentEnvelope(cleanId, companyId, {
    employeeId,
    documentType,
    documentNumber,
    fileName,
    fileUrl,
    verified: Boolean(verified),
  });
}

// Node: AUDIT_LOGS (Immutable System Event Logging)
export function createAuditLogNode({
  actorId,
  actorRole,
  action,
  details = {},
  companyId = DEFAULT_COMPANY_ID,
}) {
  const docId = `AUD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return buildDocumentEnvelope(docId, companyId, {
    actorId: String(actorId || 'SYSTEM'),
    actorRole: String(actorRole || 'System'),
    action: String(action).toUpperCase(),
    details: details || {},
    timestamp: new Date().toISOString(),
  });
}
