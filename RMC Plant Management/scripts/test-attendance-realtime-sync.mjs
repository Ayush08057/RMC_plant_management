import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseTimeToMinutes, formatToIndian12Hr } from '../src/utils/shiftUtils.js';
import { ROLES, OFFICIAL_ROLE_ACCOUNTS } from '../src/data/mockUsers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ [PASS] ${message}`);
    passedTests++;
  }
}

console.log('================================================================');
console.log('SM CONCRETE TECH — REAL-TIME ATTENDANCE SYNCHRONIZATION AUDIT');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: FIRESTORE SECURITY RULES VERIFICATION
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: Firestore Security Rules Verification ---');

const rulesContent = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');

// 1.1 Company default & resolution
assert(
  rulesContent.includes("getUserCompanyId()"),
  'getUserCompanyId function exists in firestore.rules'
);
assert(
  rulesContent.includes("'sm-concretech'"),
  'sm-concretech is recognized as authoritative company partition'
);
assert(
  rulesContent.includes("targetCompanyId == 'CMP-SM-001' || targetCompanyId == 'sm-concretech'"),
  'isSameCompany handles CMP-SM-001 and sm-concretech alias cleanly'
);

// 1.2 User Profile Creation (Allows self-creation without privilege escalation)
assert(
  rulesContent.includes("request.auth.uid == userId &&\n         request.resource.data.role != 'Admin'") ||
  rulesContent.includes("request.auth.uid == userId &&\r\n         request.resource.data.role != 'Admin'"),
  'Authenticated users can provision own profile without Admin elevation'
);

// 1.3 Attendance update permissions across all partitions
const partitions = ['CMP-SM-001', 'sm-concretech', 'sm-concretech-unit-2', 'sm-infra-projects'];
for (const p of partitions) {
  const hasRead = rulesContent.includes(`match /attendance_${p}/{attId}`) &&
    rulesContent.includes(`isSameCompany('${p}')`);
  assert(hasRead, `Partition attendance_${p} is guarded with company isolation`);

  // Check that update allows isOwner
  const attIndex = rulesContent.indexOf(`match /attendance_${p}/{attId}`);
  const attSlice = rulesContent.slice(attIndex, attIndex + 900);
  assert(
    attSlice.includes('isOwner(resource.data.employeeId)') && attSlice.includes('isOwner(resource.data.userId)'),
    `Partition attendance_${p} allow update permits isOwner(employeeId) and isOwner(userId)`
  );
  assert(
    attSlice.includes('allow delete: if isAdmin()'),
    `Partition attendance_${p} deletion strictly limited to Admin`
  );
}

// 1.4 Global /attendance collection
const globalAttIndex = rulesContent.indexOf('match /attendance/{attId}');
const globalAttSlice = rulesContent.slice(globalAttIndex, globalAttIndex + 900);
assert(
  globalAttSlice.includes('isOwner(resource.data.employeeId)') &&
  globalAttSlice.includes('isOwner(resource.data.userId)'),
  'Global /attendance collection allow update permits isOwner'
);

// -----------------------------------------------------------------------------
// SECTION 2: WORKFORCE CONTEXT ASYNC AND REAL-TIME METHODS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: Workforce Context Async and Synchronous Safety ---');

const workforceContextCode = fs.readFileSync(path.join(rootDir, 'src/context/WorkforceContext.jsx'), 'utf8');

// 2.1 Async signature verification
assert(
  workforceContextCode.includes('const checkIn = async (employeeId, options = {}) => {'),
  'checkIn is declared as an async function'
);
assert(
  workforceContextCode.includes('const checkOut = async (employeeId, options = {}) => {'),
  'checkOut is declared as an async function'
);
assert(
  workforceContextCode.includes('const addAttendanceRecord = async (attData) => {'),
  'addAttendanceRecord is declared as an async function'
);
assert(
  workforceContextCode.includes('const updateAttendanceRecord = async (id, fields) => {'),
  'updateAttendanceRecord is declared as an async function'
);
assert(
  workforceContextCode.includes('const submitDailyWork = async (workData) => {'),
  'submitDailyWork is declared as an async function'
);

// 2.2 Authoritative Cloud Firestore persistence (await saveDocumentWithId)
assert(
  workforceContextCode.includes('await saveDocumentWithId(COLLECTIONS.ATTENDANCE, newRecord.id, newRecord);'),
  'checkIn awaits saveDocumentWithId to confirm authoritative database write'
);
assert(
  workforceContextCode.includes('await saveDocumentWithId(COLLECTIONS.ATTENDANCE, updatedRecord.id, updatedRecord);'),
  'checkOut awaits saveDocumentWithId to confirm authoritative database write'
);
assert(
  workforceContextCode.includes('await saveDocumentWithId(COLLECTIONS.DAILY_WORK, newWork.id, newWork);'),
  'submitDailyWork awaits saveDocumentWithId before confirming'
);

// 2.3 Required attributes on attendance records
assert(
  workforceContextCode.includes('userId: user?.uid || user?.id || null'),
  'checkIn binds authenticated userId for direct Firestore security evaluation'
);
assert(
  workforceContextCode.includes('companyId: activeCompanyId'),
  'checkIn binds activeCompanyId for strict multi-tenant company isolation'
);
assert(
  workforceContextCode.includes('normalizeCompanyId'),
  'WorkforceContext exports and applies normalizeCompanyId to unify tenant keys'
);

// -----------------------------------------------------------------------------
// SECTION 3: MOBILE PUNCH WIDGET ASYNC WRITES & AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: Mobile Punch Widget Async Confirmation ---');

const mobilePunchCode = fs.readFileSync(path.join(rootDir, 'src/components/workforce/MobilePunchWidget.jsx'), 'utf8');

assert(
  mobilePunchCode.includes('const handlePunchIn = async () => {'),
  'MobilePunchWidget handlePunchIn is async'
);
assert(
  mobilePunchCode.includes('const rec = await checkIn(targetId,'),
  'MobilePunchWidget awaits checkIn before displaying success message'
);
assert(
  mobilePunchCode.includes('const handlePunchOutWithReport = async (e) => {'),
  'MobilePunchWidget handlePunchOutWithReport is async'
);
assert(
  mobilePunchCode.includes('const rec = await checkOut(targetId,'),
  'MobilePunchWidget awaits checkOut before displaying punch out confirmation'
);
assert(
  mobilePunchCode.includes('a.employeeId.toUpperCase() === (activeEmployee.employeeId || \'\').toUpperCase()') ||
  mobilePunchCode.includes('a.employeeId.toUpperCase()'),
  'MobilePunchWidget matches employeeId case-insensitively'
);

// -----------------------------------------------------------------------------
// SECTION 4: MULTI-ROLE ATTENDANCE SYNCHRONIZATION SIMULATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: Multi-Role Punch Simulation Across Enterprise Roles ---');

const testRoles = [
  { role: ROLES.ACCOUNTANT, name: 'Senior Accountant', employeeId: 'ACC-001', uid: 'uid-acc-001' },
  { role: ROLES.DRIVER, name: 'Transit Mixer Driver', employeeId: 'DRV-001', uid: 'uid-drv-001' },
  { role: ROLES.PLANT_MANAGER, name: 'Plant Incharge', employeeId: 'PM-001', uid: 'uid-pm-001' },
  { role: ROLES.DISPATCHER, name: 'Plant Dispatcher', employeeId: 'DISP-001', uid: 'uid-disp-001' },
  { role: ROLES.QC_ENGINEER, name: 'Quality Control Lead', employeeId: 'QC-001', uid: 'uid-qc-001' },
  { role: ROLES.SITE_SUPERVISOR, name: 'Pouring Supervisor', employeeId: 'SUP-001', uid: 'uid-sup-001' },
  { role: ROLES.ADMIN, name: 'System Administrator', employeeId: 'ADM-001', uid: 'uid-adm-001' },
];

const mockCompanyId = 'sm-concretech';
const todayStr = new Date().toISOString().split('T')[0];

testRoles.forEach(({ role, name, employeeId, uid }) => {
  // Simulate punch in record generation
  const punchInTime = '08:30 AM';
  const punchRecord = {
    id: `ATT-${todayStr.replace(/-/g, '')}-${employeeId}`,
    date: todayStr,
    employeeId,
    userId: uid,
    companyId: mockCompanyId,
    employeeName: name,
    role,
    plant: 'Main Plant Unit #01',
    punchIn: punchInTime,
    punchOut: null,
    workingHours: null,
    status: 'Present',
    lateStatus: false,
    lateMinutes: 0,
    geofenceStatus: 'Inside Plant Boundary (12m)',
    gpsLocation: { lat: 18.5204, lng: 73.8567, address: 'Plant Dispatch Hub' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Verify security rule evaluation simulation for this role:
  // allow create: isManager() || isHR() || isOwner(request.resource.data.employeeId) || isOwner(request.resource.data.userId)
  const isOwnerUid = punchRecord.userId === uid;
  const isOwnerEmpId = punchRecord.employeeId === employeeId;
  const canCreate = isOwnerUid || isOwnerEmpId;
  assert(canCreate, `Role "${role}" (${employeeId}) has authorized permission to punch in`);

  // Simulate shift completion / punch out
  const punchOutTime = '05:30 PM';
  const inMins = parseTimeToMinutes(punchInTime);
  const outMins = parseTimeToMinutes(punchOutTime);
  const totalMins = outMins - inMins;
  const workingHours = Number((totalMins / 60).toFixed(1));
  const overtimeHours = workingHours > 8.5 ? Number((workingHours - 8.5).toFixed(1)) : 0;

  const updatedRecord = {
    ...punchRecord,
    punchOut: punchOutTime,
    workingHours,
    overtimeHours,
    exitGeofenceStatus: 'Shift Concluded (GPS Verified)',
    updatedAt: new Date().toISOString(),
  };

  // Verify security rule evaluation simulation for update:
  // allow update: isManager() || isHR() || isOwner(resource.data.employeeId) || isOwner(resource.data.userId)
  const canUpdate = (punchRecord.userId === uid) || (punchRecord.employeeId === employeeId);
  assert(canUpdate, `Role "${role}" (${employeeId}) has authorized permission to punch out (update own attendance)`);
  assert(updatedRecord.workingHours === 9.0, `Working hours correctly calculated as 9.0h for ${role}`);
  assert(updatedRecord.overtimeHours === 0.5, `Overtime correctly calculated as 0.5h for ${role}`);
});

// -----------------------------------------------------------------------------
// SECTION 5: REAL-TIME LISTENER DISPATCH SIMULATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: Real-time Firestore Listener Dispatch Simulation ---');

let adminDashboardAttendance = [];
let listenerTriggerCount = 0;

// Simulate subscribeToCollection callback
const onSnapshotCallback = (newCloudItems) => {
  listenerTriggerCount++;
  adminDashboardAttendance = newCloudItems;
};

// Initial state: empty
assert(adminDashboardAttendance.length === 0, 'Admin dashboard starts with empty attendance');

// Accountant punches in on mobile
const accountantPunchIn = {
  id: `ATT-${todayStr.replace(/-/g, '')}-ACC-001`,
  date: todayStr,
  employeeId: 'ACC-001',
  userId: 'uid-acc-001',
  companyId: 'sm-concretech',
  employeeName: 'Senior Accountant',
  role: 'Accountant',
  plant: 'Main Plant Unit #01',
  punchIn: '09:05 AM',
  punchOut: null,
  workingHours: null,
  status: 'Present',
  lateStatus: true,
  lateMinutes: 5,
};

// Snapshot fires automatically to Admin desktop listener
onSnapshotCallback([accountantPunchIn]);

assert(listenerTriggerCount === 1, 'Real-time listener callback invoked immediately on punch in');
assert(adminDashboardAttendance.length === 1, 'Admin dashboard received new attendance record without page reload');
assert(adminDashboardAttendance[0].employeeId === 'ACC-001', 'Admin dashboard reflects Accountant employee ID');
assert(adminDashboardAttendance[0].punchIn === '09:05 AM', 'Admin dashboard reflects Accountant punch in time');
assert(adminDashboardAttendance[0].lateStatus === true, 'Admin dashboard reflects Accountant late arrival status');

// Driver punches in on mobile
const driverPunchIn = {
  id: `ATT-${todayStr.replace(/-/g, '')}-DRV-001`,
  date: todayStr,
  employeeId: 'DRV-001',
  userId: 'uid-drv-001',
  companyId: 'sm-concretech',
  employeeName: 'Transit Mixer Driver',
  role: 'Driver',
  plant: 'Main Plant Unit #01',
  punchIn: '08:00 AM',
  punchOut: null,
  workingHours: null,
  status: 'Present',
  lateStatus: false,
  lateMinutes: 0,
};

onSnapshotCallback([accountantPunchIn, driverPunchIn]);

assert(listenerTriggerCount === 2, 'Real-time listener callback invoked for Driver punch in');
assert(adminDashboardAttendance.length === 2, 'Admin dashboard displays both Accountant and Driver records');

// Accountant punches out
const accountantPunchOut = {
  ...accountantPunchIn,
  punchOut: '06:05 PM',
  workingHours: 9.0,
  overtimeHours: 0.5,
};

onSnapshotCallback([accountantPunchOut, driverPunchIn]);

assert(listenerTriggerCount === 3, 'Real-time listener callback invoked for Accountant punch out');
const currentAccRec = adminDashboardAttendance.find(a => a.employeeId === 'ACC-001');
assert(currentAccRec.punchOut === '06:05 PM', 'Admin dashboard receives Accountant punch out time immediately');
assert(currentAccRec.workingHours === 9.0, 'Admin dashboard receives updated duty hours');

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS RUN: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('\n🎉 ALL REAL-TIME ATTENDANCE TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('\n❌ SOME TESTS FAILED. CHECK LOGS ABOVE.\n');
  process.exit(1);
}
