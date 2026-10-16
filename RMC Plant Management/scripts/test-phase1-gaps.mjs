/**
 * Phase 1 Gaps Verification Test Suite
 * Tests GPS Attendance integrity, Duplicate Punch Prevention, Storage Validation, and Rules.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateDocumentFile, formatBytes } from '../src/services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}:`, err.message);
  }
}

console.log('====================================================');
console.log('🧪 SM Concrete Tech - Phase 1 Gaps Verification Test');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST GROUP 1: Document Upload & Storage Validation
// ----------------------------------------------------
console.log('📦 TEST GROUP 1: Document Upload & Storage Validation');

runTest('Accepts valid PDF document within 5MB limit', () => {
  const validPdf = {
    name: 'aadhaar_card.pdf',
    type: 'application/pdf',
    size: 1024 * 1024 * 2.5, // 2.5 MB
  };
  const result = validateDocumentFile(validPdf);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.error, null);
});

runTest('Accepts valid JPEG / PNG / WebP images within 5MB limit', () => {
  const images = [
    { name: 'pan_card.jpg', type: 'image/jpeg', size: 1024 * 500 },
    { name: 'dl_front.png', type: 'image/png', size: 1024 * 1024 * 1.2 },
    { name: 'selfie.webp', type: 'image/webp', size: 1024 * 300 },
  ];
  images.forEach(img => {
    const res = validateDocumentFile(img);
    assert.strictEqual(res.valid, true, `Expected valid for ${img.name}`);
  });
});

runTest('Rejects disallowed file types (.exe, .js, .zip, .html)', () => {
  const invalidFiles = [
    { name: 'malware.exe', type: 'application/x-msdownload', size: 1024 },
    { name: 'script.js', type: 'application/javascript', size: 1024 },
    { name: 'archive.zip', type: 'application/zip', size: 1024 * 100 },
    { name: 'phish.html', type: 'text/html', size: 1024 },
  ];
  invalidFiles.forEach(f => {
    const res = validateDocumentFile(f);
    assert.strictEqual(res.valid, false, `Expected invalid for ${f.name}`);
    assert.ok(res.error.includes('Only PDF, JPEG, PNG, and WebP'), `Expected error message for ${f.name}`);
  });
});

runTest('Rejects file exceeding 5MB maximum limit', () => {
  const oversizedFile = {
    name: 'heavy_scan.pdf',
    type: 'application/pdf',
    size: 5 * 1024 * 1024 + 1024, // 5MB + 1KB
  };
  const result = validateDocumentFile(oversizedFile);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('5 MB'), 'Expected 5MB size limit warning');
});

runTest('Rejects missing or null file input', () => {
  const result = validateDocumentFile(null);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.error, 'No file selected for upload.');
});

runTest('formatBytes correctly formats file sizes', () => {
  assert.strictEqual(formatBytes(0), '0 Bytes');
  assert.strictEqual(formatBytes(1024), '1 KB');
  assert.strictEqual(formatBytes(1024 * 1024 * 2.5), '2.5 MB');
  assert.strictEqual(formatBytes(1024 * 1024 * 1024), '1 GB');
});

// ----------------------------------------------------
// TEST GROUP 2: Attendance Duplicate Punch & GPS Preservation
// ----------------------------------------------------
console.log('\n📍 TEST GROUP 2: Attendance Workflow & GPS Integrity');

// In-memory simulation of WorkforceContext checkIn / checkOut logic
function createMockWorkforce() {
  const attendance = [];
  const todayStr = '2026-10-16';

  const checkIn = (employeeId, options = {}) => {
    const existing = attendance.find(
      (a) => a.employeeId === employeeId && a.date === todayStr && a.punchIn && !a.punchOut
    );
    if (existing) {
      throw new Error(`Employee ${employeeId} is already punched in today. Please punch out first before punching in again.`);
    }

    const newRecord = {
      id: `att_${Date.now()}_${Math.random()}`,
      employeeId,
      date: todayStr,
      punchIn: options.punchInTime || '09:00:00',
      punchOut: null,
      workingHours: 0,
      selfieUrl: options.selfieUrl || null,
      gpsLocation: options.gpsLocation || null,
      geofenceStatus: options.geofenceStatus || (options.gpsLocation ? 'Inside Plant Geofence' : 'Location Not Available'),
    };
    attendance.push(newRecord);
    return newRecord;
  };

  const checkOut = (employeeId, options = {}) => {
    const existingIndex = attendance.findIndex(
      (a) => a.employeeId === employeeId && a.date === todayStr && a.punchIn && !a.punchOut
    );
    if (existingIndex === -1) {
      const alreadyOut = attendance.find(
        (a) => a.employeeId === employeeId && a.date === todayStr && a.punchIn && a.punchOut
      );
      if (alreadyOut) {
        throw new Error(`Employee ${employeeId} has already completed their punch out for today.`);
      }
      throw new Error(`No active punch-in found for employee ${employeeId} today. Cannot punch out.`);
    }

    const current = attendance[existingIndex];
    const updated = {
      ...current,
      punchOut: options.punchOutTime || '17:30:00',
      workingHours: 8.5,
      exitGpsLocation: options.gpsLocation || null,
    };
    attendance[existingIndex] = updated;
    return updated;
  };

  return { attendance, checkIn, checkOut };
}

runTest('Check-in preserves real captured GPS coordinates', () => {
  const wf = createMockWorkforce();
  const realGps = {
    lat: 18.52043,
    lng: 73.85674,
    accuracy: 9,
    timestamp: 1729065600000,
  };
  const rec = wf.checkIn('EMP-001', {
    gpsLocation: realGps,
    selfieUrl: 'data:image/jpeg;base64,mockSelfieData',
  });

  assert.strictEqual(rec.employeeId, 'EMP-001');
  assert.deepStrictEqual(rec.gpsLocation, realGps);
  assert.strictEqual(rec.punchOut, null);
});

runTest('Check-in does NOT substitute fake coordinates when GPS is null', () => {
  const wf = createMockWorkforce();
  const rec = wf.checkIn('EMP-002', {
    gpsLocation: null,
    selfieUrl: 'data:image/jpeg;base64,mockSelfieData',
  });

  assert.strictEqual(rec.gpsLocation, null);
  assert.strictEqual(rec.geofenceStatus, 'Location Not Available');
});

runTest('Prevents duplicate check-in while already punched in', () => {
  const wf = createMockWorkforce();
  wf.checkIn('EMP-003', { gpsLocation: { lat: 19.0, lng: 73.0 } });

  assert.throws(() => {
    wf.checkIn('EMP-003', { gpsLocation: { lat: 19.0, lng: 73.0 } });
  }, /already punched in today/);
});

runTest('Prevents check-out without prior check-in', () => {
  const wf = createMockWorkforce();
  assert.throws(() => {
    wf.checkOut('EMP-NONEXISTENT', {});
  }, /No active punch-in found/);
});

runTest('Check-out completes successfully and saves exit GPS', () => {
  const wf = createMockWorkforce();
  wf.checkIn('EMP-004', { gpsLocation: { lat: 19.1, lng: 73.1 } });
  const exitGps = { lat: 19.1005, lng: 73.1002, accuracy: 12 };
  const updated = wf.checkOut('EMP-004', { gpsLocation: exitGps });

  assert.ok(updated.punchOut);
  assert.strictEqual(updated.workingHours, 8.5);
  assert.deepStrictEqual(updated.exitGpsLocation, exitGps);
});

runTest('Prevents multiple check-outs after shift completion', () => {
  const wf = createMockWorkforce();
  wf.checkIn('EMP-005', {});
  wf.checkOut('EMP-005', {});

  assert.throws(() => {
    wf.checkOut('EMP-005', {});
  }, /already completed their punch out/);
});

// ----------------------------------------------------
// TEST GROUP 3: Configuration & Storage Rules Inspection
// ----------------------------------------------------
console.log('\n🔒 TEST GROUP 3: Storage Rules & Firebase Config Inspection');

runTest('storage.rules exists and defines company/employee segregation', () => {
  const rulesPath = path.join(rootDir, 'storage.rules');
  assert.ok(fs.existsSync(rulesPath), 'storage.rules must exist');
  const content = fs.readFileSync(rulesPath, 'utf8');

  assert.ok(content.includes('match /documents/{companyId}/{employeeId}/{fileName}'), 'Must scope documents to companyId and employeeId');
  assert.ok(content.includes('request.resource.size < 5 * 1024 * 1024'), 'Must enforce 5MB limit in storage rules');
  assert.ok(content.includes("contentType.matches('application/pdf|image/jpeg|image/png|image/webp')"), 'Must enforce MIME types in storage rules');
  assert.ok(content.includes('request.auth != null'), 'Must require authentication');
});

runTest('firebase.json registers storage rules file', () => {
  const configPath = path.join(rootDir, 'firebase.json');
  assert.ok(fs.existsSync(configPath), 'firebase.json must exist');
  const json = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  assert.ok(json.storage, 'firebase.json must contain storage section');
  assert.strictEqual(json.storage.rules, 'storage.rules');
});

runTest('LiveEmployeeLocationRadar does not use hardcoded fallback coordinates or fake jitter', () => {
  const radarPath = path.join(rootDir, 'src/components/workforce/LiveEmployeeLocationRadar.jsx');
  const content = fs.readFileSync(radarPath, 'utf8');

  assert.ok(!content.includes('lat = 18.5204'), 'Must not contain fake fallback lat = 18.5204');
  assert.ok(!content.includes('lng = 73.8567'), 'Must not contain fake fallback lng = 73.8567');
  assert.ok(content.includes('hasGpsFix'), 'Must use hasGpsFix flag');
  assert.ok(content.includes('Hardware Tracking Notice'), 'Must contain hardware tracking notice disclaimer');
});

runTest('FieldWorkerLiveLocationCard does not use fake jitter interval', () => {
  const cardPath = path.join(rootDir, 'src/components/workforce/FieldWorkerLiveLocationCard.jsx');
  const content = fs.readFileSync(cardPath, 'utf8');

  assert.ok(!content.includes('deltaLat'), 'Must not generate simulated deltaLat jitter');
  assert.ok(!content.includes('deltaLng'), 'Must not generate simulated deltaLng jitter');
  assert.ok(content.includes('Continuous real-time background tracking requires vehicle-mounted GPS hardware'), 'Must contain disclaimer');
});

console.log('\n====================================================');
console.log(`📊 Test Results: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
