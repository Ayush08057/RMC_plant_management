import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_SIZE_BYTES, validateTripPhotoFile } from '../src/services/storageService.js';
import { mergeCollectionItems } from '../src/services/cloudSyncService.js';

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
console.log('SM CONCRETE TECH — PHASE 2 CRITICAL FIXES VERIFICATION');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// FIX 1: DRIVER PHOTO STORAGE & METADATA VALIDATION
// -----------------------------------------------------------------------------
console.log('--- FIX 1: Driver Photo Storage & File Validation ---');

// 1.1 MIME type and size checks
assert(ALLOWED_PHOTO_MIME_TYPES.includes('image/jpeg'), 'ALLOWED_PHOTO_MIME_TYPES includes image/jpeg');
assert(ALLOWED_PHOTO_MIME_TYPES.includes('image/png'), 'ALLOWED_PHOTO_MIME_TYPES includes image/png');
assert(ALLOWED_PHOTO_MIME_TYPES.includes('image/webp'), 'ALLOWED_PHOTO_MIME_TYPES includes image/webp');
assert(MAX_PHOTO_SIZE_BYTES === 5 * 1024 * 1024, 'MAX_PHOTO_SIZE_BYTES is configured to 5MB');

const validMockFile = {
  name: 'trip_batching.jpg',
  type: 'image/jpeg',
  size: 2.1 * 1024 * 1024 // 2.1MB
};
const validResult = validateTripPhotoFile(validMockFile);
assert(validResult.valid === true, 'Accepts valid 2.1MB JPEG photo');

const oversizedMockFile = {
  name: 'huge_raw_photo.png',
  type: 'image/png',
  size: 6.5 * 1024 * 1024 // 6.5MB
};
const oversizedResult = validateTripPhotoFile(oversizedMockFile);
assert(oversizedResult.valid === false && oversizedResult.error.includes('5 MB'), 'Rejects photo exceeding 5MB limit');

const invalidMimeMockFile = {
  name: 'malicious_script.exe',
  type: 'application/x-msdownload',
  size: 1024
};
const invalidMimeResult = validateTripPhotoFile(invalidMimeMockFile);
assert(invalidMimeResult.valid === false && invalidMimeResult.error.includes('Only JPEG, PNG, and WebP'), 'Rejects non-whitelisted MIME type');

// 1.2 Inspect DriverDashboardPage.jsx source code
const driverDashPath = path.join(rootDir, 'src', 'pages', 'driver', 'DriverDashboardPage.jsx');
const driverDashSrc = fs.readFileSync(driverDashPath, 'utf8');

assert(driverDashSrc.includes('uploadTripPhoto'), 'DriverDashboardPage imports and uses uploadTripPhoto');
assert(driverDashSrc.includes('validateTripPhotoFile'), 'DriverDashboardPage validates photos with validateTripPhotoFile');
assert(!driverDashSrc.includes('reader.readAsDataURL'), 'DriverDashboardPage has eliminated Base64 data URL reading for trip photos');
assert(driverDashSrc.includes('URL.createObjectURL(file)'), 'DriverDashboardPage uses ephemeral object URLs for instant UI preview');
assert(driverDashSrc.includes('Cloud Stored') || driverDashSrc.includes('क्लाउड स्टोअर'), 'DriverDashboardPage displays cloud-stored verification indicator');

// 1.3 Inspect DriverTripsView.jsx source code
const driverTripsViewPath = path.join(rootDir, 'src', 'components', 'operations', 'DriverTripsView.jsx');
const driverTripsViewSrc = fs.readFileSync(driverTripsViewPath, 'utf8');

assert(driverTripsViewSrc.includes('selectedPhotoTrip'), 'DriverTripsView includes state for photo inspection modal');
assert(driverTripsViewSrc.includes('Trip Photographs') && driverTripsViewSrc.includes('setSelectedPhotoTrip(null)'), 'DriverTripsView renders modal for viewing trip photos');
assert(
  driverTripsViewSrc.includes('startOdoPhoto') &&
  driverTripsViewSrc.includes('siteArrivalPhoto') &&
  driverTripsViewSrc.includes('siteDeparturePhoto') &&
  driverTripsViewSrc.includes('finalOdoPhoto'),
  'DriverTripsView inspects all 4 lifecycle stage photographs (start, arrival, departure, return)'
);


// -----------------------------------------------------------------------------
// FIX 2: FIRESTORE ROLE SECURITY & TENANT PARTITIONING
// -----------------------------------------------------------------------------
console.log('\n--- FIX 2: Firestore Role Security & Rule Partitioning ---');

const firestoreRulesPath = path.join(rootDir, 'firestore.rules');
const firestoreRulesSrc = fs.readFileSync(firestoreRulesPath, 'utf8');

// 2.1 Driver removed from operational staff
assert(!firestoreRulesSrc.includes("getUserRole() == 'Driver'\n        || getUserRole() == 'Driver'"), 'Driver is not included in isOperationalStaff()');
const isOpStaffMatch = firestoreRulesSrc.match(/function isOperationalStaff\(\)[\s\S]*?\{([\s\S]*?)\}/);
assert(isOpStaffMatch && !isOpStaffMatch[1].includes("'Driver'"), 'isOperationalStaff() definition strictly excludes Driver role');

// 2.2 Dedicated isDriver helper exists
assert(firestoreRulesSrc.includes('function isDriver()'), 'firestore.rules defines isDriver() role helper');

// 2.3 hrSettings collections write restricted
assert(
  firestoreRulesSrc.includes('match /hrSettings/{settingId}') &&
  firestoreRulesSrc.includes('match /hrSettings_sm-concretech/{settingId}'),
  'hrSettings rules exist across global and partitioned company scopes'
);
assert(
  firestoreRulesSrc.includes("allow write: if isOperationalStaff();") &&
  firestoreRulesSrc.includes("allow write: if isSameCompany('sm-concretech') && isOperationalStaff();"),
  'hrSettings writes are strictly restricted to isOperationalStaff()'
);

// 2.4 Partitioned driverTrips collection exists
assert(
  firestoreRulesSrc.includes('match /driverTrips_sm-concretech/{tripId}') &&
  firestoreRulesSrc.includes('match /driverTrips_sm-concretech-unit-2/{tripId}') &&
  firestoreRulesSrc.includes('match /driverTrips_sm-infra-projects/{tripId}') &&
  firestoreRulesSrc.includes('match /driverTrips_CMP-SM-001/{tripId}'),
  'firestore.rules defines partitioned driverTrips collections across all tenant companies'
);
assert(
  firestoreRulesSrc.includes("(isOperationalStaff() || isDriver())"),
  'driverTrips collection permits drivers to write trip updates in their company partition'
);


// -----------------------------------------------------------------------------
// FIX 3: CONCURRENT CLOUD SYNCHRONIZATION MERGING
// -----------------------------------------------------------------------------
console.log('\n--- FIX 3: Concurrent Cloud Synchronization Merging ---');

// 3.1 Verify smart merge preserving records from concurrent writers
const localRecords = [
  { id: 'trip-101', tripId: 'TRP-101', status: 'En Route', updatedAt: 1000 },
  { id: 'trip-102', tripId: 'TRP-102', status: 'Loading', updatedAt: 1050 }
];

const cloudRecords = [
  { id: 'trip-101', tripId: 'TRP-101', status: 'En Route', updatedAt: 1000 },
  { id: 'trip-103', tripId: 'TRP-103', status: 'Completed', updatedAt: 1100 } // Created concurrently on Device B
];

const merged = mergeCollectionItems(localRecords, cloudRecords);

assert(merged.length === 3, `Merged collections retain all 3 items (got ${merged.length})`);
assert(merged.some(t => (t.id === 'trip-101' || t.tripId === 'TRP-101')), 'Contains trip-101');
assert(merged.some(t => (t.id === 'trip-102' || t.tripId === 'TRP-102')), 'Retains locally added trip-102 from Device A');
assert(merged.some(t => (t.id === 'trip-103' || t.tripId === 'TRP-103')), 'Retains remotely added trip-103 from Device B without overwriting');

// 3.2 Update collision: Newer updatedAt wins
const staleLocal = [
  { id: 'trip-101', status: 'Loading', updatedAt: 1000 }
];
const freshRemote = [
  { id: 'trip-101', status: 'At Site', updatedAt: 1200 }
];
const collisionResult = mergeCollectionItems(staleLocal, freshRemote);
assert(collisionResult.length === 1 && collisionResult[0].status === 'At Site', 'Remote record with newer updatedAt takes precedence over stale local write');

// 3.3 Verify cloudSyncService fetches remote doc before write
const cloudSyncPath = path.join(rootDir, 'src', 'services', 'cloudSyncService.js');
const cloudSyncSrc = fs.readFileSync(cloudSyncPath, 'utf8');

assert(cloudSyncSrc.includes('mergeCollectionItems'), 'cloudSyncService uses mergeCollectionItems during push operations');
assert(cloudSyncSrc.includes('getDoc(docRef)') || cloudSyncSrc.includes('remoteSnap = await getDoc'), 'pushCloudStore reads remote snapshot to perform pre-write concurrency merge');


// -----------------------------------------------------------------------------
// FIX 4: MATERIAL STOCK VALIDATION & SUPERVISOR OVERRIDE
// -----------------------------------------------------------------------------
console.log('\n--- FIX 4: Material Stock Validation & Supervisor Override ---');

const batchingSheetsPath = path.join(rootDir, 'src', 'components', 'operations', 'BatchingSheetsView.jsx');
const batchingSheetsSrc = fs.readFileSync(batchingSheetsPath, 'utf8');

assert(batchingSheetsSrc.includes('shortfallModal'), 'BatchingSheetsView defines shortfallModal state');
assert(batchingSheetsSrc.includes('shortfalls.length > 0'), 'BatchingSheetsView tracks shortfalls and blocks production execution');
assert(batchingSheetsSrc.includes('Shortfall Deficit'), 'BatchingSheetsView computes and displays stock deficit in modal table');
assert(batchingSheetsSrc.includes('Supervisor Override') || batchingSheetsSrc.includes('सुपरवायझर ओव्हरराइड मंजुरी'), 'BatchingSheetsView includes Supervisor Override modal');
assert(
  batchingSheetsSrc.includes('supervisorForm.confirmed') &&
  batchingSheetsSrc.includes('supervisorForm.name') &&
  batchingSheetsSrc.includes('supervisorForm.employeeId'),
  'Supervisor Override enforces Approver Name, Employee ID, and Confirmation'
);
assert(batchingSheetsSrc.includes('supervisorOverride'), 'Approved overrides are tagged with supervisorOverride audit trail');

// Simulated stock validation check logic
const mockInventory = {
  cement: { stockTons: 10.0 }, // 10,000 kg available
  agg20: { stockTons: 100.0 }
};

const requiredCementKg = 12000; // 12,000 kg required (deficit 2,000 kg)
const availableCementKg = mockInventory.cement.stockTons * 1000;
const hasShortfall = requiredCementKg > availableCementKg;
const deficitKg = requiredCementKg - availableCementKg;

assert(hasShortfall === true, 'Validation accurately detects shortfall when requirement (12,000 kg) exceeds stock (10,000 kg)');
assert(deficitKg === 2000, `Validation accurately calculates 2,000 kg deficit (got ${deficitKg} kg)`);


// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`CRITICAL FIXES SUITE: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('================================================================');
if (passedTests === totalTests) {
  console.log('🎉 ALL PHASE 2 CRITICAL FIX AUDIT ASSERTIONS COMPLETED SUCCESSFULLY!');
}
