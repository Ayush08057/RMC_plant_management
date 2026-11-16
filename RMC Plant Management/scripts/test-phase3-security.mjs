#!/usr/bin/env node
/**
 * Phase 3 Automated Security & Index Verification Suite
 * Tests User Privilege Escalation, Custom Claims, Sync-Doc Validation, and Protected Tracking Rules
 */

import http from 'http';

const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;
const PROJECT_ID = 'smconcretech-2149c';
const BASE_URL = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const COMMIT_URL = `/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

let passCount = 0;
let failCount = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${detail}`);
    failCount++;
  }
}

function requestRest({ method = 'GET', path, tokenClaims = null, body = null, isCommit = false }) {
  return new Promise((resolve) => {
    let authHeader = undefined;
    if (tokenClaims) {
      const payload = {
        iss: `https://securetoken.google.com/${PROJECT_ID}`,
        aud: PROJECT_ID,
        auth_time: Math.floor(Date.now() / 1000),
        sub: tokenClaims.uid || 'test-user',
        user_id: tokenClaims.uid || 'test-user',
        uid: tokenClaims.uid || 'test-user',
        email: tokenClaims.email || `${tokenClaims.uid || 'user'}@smconcretech.com`,
        ...tokenClaims,
      };
      const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      authHeader = `Bearer eyJhbGciOiJub25lIn0.${b64Payload}.`;
    }

    const postData = body ? JSON.stringify(body) : null;
    const reqPath = isCommit ? COMMIT_URL : (path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`);

    const options = {
      hostname: EMULATOR_HOST,
      port: EMULATOR_PORT,
      path: reqPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {}
        resolve({ status: res.statusCode, data: parsed, raw: data });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) fields[key] = { nullValue: null };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (typeof val === 'number') {
      if (Number.isInteger(val)) fields[key] = { integerValue: String(val) };
      else fields[key] = { doubleValue: val };
    } else if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((v) => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') return { integerValue: String(v) };
            if (typeof v === 'object' && v !== null) return { mapValue: { fields: toFirestoreFields(v) } };
            return { stringValue: String(v) };
          }),
        },
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('   PHASE 3 SECURITY & INDEX VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  // Test 1: Self-Registration Privilege Escalation
  console.log('--- Suite 1: User Profile & Self-Registration Security ---');

  // 1a: Unapproved user self-registers with role: 'Pending', isApproved: false (Valid)
  const resValidSelfReg = await requestRest({
    method: 'PATCH',
    path: '/users/pending_user_001',
    tokenClaims: { uid: 'pending_user_001', email: 'applicant@example.com' },
    body: {
      fields: toFirestoreFields({
        name: 'Applicant One',
        email: 'applicant@example.com',
        role: 'Pending',
        isApproved: false,
        companyId: 'sm-concretech',
      }),
    },
  });
  assert(resValidSelfReg.status === 200, 'Self-registration with role=Pending and isApproved=false is ALLOWED');

  // 1b: User attempts to self-assign role: 'Plant Manager' (Escalation Attempt)
  const resEscalateRole = await requestRest({
    method: 'PATCH',
    path: '/users/hacker_user_002',
    tokenClaims: { uid: 'hacker_user_002', email: 'hacker@example.com' },
    body: {
      fields: toFirestoreFields({
        name: 'Malicious User',
        email: 'hacker@example.com',
        role: 'Plant Manager',
        isApproved: false,
        companyId: 'sm-concretech',
      }),
    },
  });
  assert(resEscalateRole.status === 403, 'Self-registration with role=Plant Manager is DENIED (HTTP 403)');

  // 1c: User attempts to self-assign role: 'Admin'
  const resEscalateAdmin = await requestRest({
    method: 'PATCH',
    path: '/users/hacker_user_003',
    tokenClaims: { uid: 'hacker_user_003', email: 'hacker3@example.com' },
    body: {
      fields: toFirestoreFields({
        name: 'Malicious Admin Wannabe',
        email: 'hacker3@example.com',
        role: 'Admin',
        isApproved: false,
        companyId: 'sm-concretech',
      }),
    },
  });
  assert(resEscalateAdmin.status === 403, 'Self-registration with role=Admin is DENIED (HTTP 403)');

  // 1d: User attempts to self-assign isApproved: true
  const resEscalateApproval = await requestRest({
    method: 'PATCH',
    path: '/users/hacker_user_004',
    tokenClaims: { uid: 'hacker_user_004', email: 'hacker4@example.com' },
    body: {
      fields: toFirestoreFields({
        name: 'Self Approver',
        email: 'hacker4@example.com',
        role: 'Pending',
        isApproved: true,
        companyId: 'sm-concretech',
      }),
    },
  });
  assert(resEscalateApproval.status === 403, 'Self-registration with isApproved=true is DENIED (HTTP 403)');

  // 1e: User attempts to inject permissions
  const resEscalatePerms = await requestRest({
    method: 'PATCH',
    path: '/users/hacker_user_005',
    tokenClaims: { uid: 'hacker_user_005', email: 'hacker5@example.com' },
    body: {
      fields: toFirestoreFields({
        name: 'Permission Injector',
        email: 'hacker5@example.com',
        role: 'Pending',
        isApproved: false,
        permissions: ['ALL_ACCESS', 'ROOT'],
        companyId: 'sm-concretech',
      }),
    },
  });
  assert(resEscalatePerms.status === 403, 'Self-registration with injected permissions is DENIED (HTTP 403)');

  // 1f: Admin creating user profile with elevated role
  const resAdminCreateUser = await requestRest({
    method: 'PATCH',
    path: '/users/verified_manager_001',
    tokenClaims: { uid: 'admin_sys', role: 'Admin', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        name: 'Authorized Plant Manager',
        email: 'authorized_manager@smconcretech.com',
        role: 'Plant Manager',
        isApproved: true,
        companyId: 'sm-concretech',
      }),
    },
  });
  assert(resAdminCreateUser.status === 200, 'Admin creating user with role=Plant Manager is ALLOWED (HTTP 200)');

  // 1g: User updating own profile cannot change role or permissions
  const resUserTamperRole = await requestRest({
    method: 'PATCH',
    path: '/users/pending_user_001',
    tokenClaims: { uid: 'pending_user_001', email: 'applicant@example.com' },
    body: {
      fields: toFirestoreFields({
        name: 'Applicant One Renamed',
        email: 'applicant@example.com',
        role: 'Plant Manager', // Tampered!
        isApproved: false,
        companyId: 'sm-concretech',
      }),
    },
  });
  assert(resUserTamperRole.status === 403, 'User attempting to update own profile to role=Plant Manager is DENIED (HTTP 403)');

  // Test 2: Custom Claims Authorization
  console.log('\n--- Suite 2: Custom Claims Authorization Checks ---');

  // 2a: User with custom claim role='Admin' can read users and write plants
  const resAdminToken = await requestRest({
    method: 'GET',
    path: '/users',
    tokenClaims: { uid: 'claims_admin', role: 'Admin', companyId: 'sm-concretech' },
  });
  assert(resAdminToken.status === 200, 'Token with role=Admin custom claim can read /users directory');

  // 2b: User with custom claim role='Plant Manager' can write orders
  const resManagerOrder = await requestRest({
    method: 'PATCH',
    path: '/orders_sm-concretech/ORD-TEST-001',
    tokenClaims: { uid: 'claims_manager', role: 'Plant Manager', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        id: 'ORD-TEST-001',
        companyId: 'sm-concretech',
        status: 'Scheduled',
        customerName: 'Test Infrastructure Pvt Ltd',
      }),
    },
  });
  assert(resManagerOrder.status === 200, 'Token with role=Plant Manager custom claim can write orders');

  // 2c: User with custom claim role='Driver' is DENIED writing orders
  const resDriverDeniedOrder = await requestRest({
    method: 'PATCH',
    path: '/orders_sm-concretech/ORD-TEST-002',
    tokenClaims: { uid: 'claims_driver', role: 'Driver', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        id: 'ORD-TEST-002',
        companyId: 'sm-concretech',
        status: 'Tampered',
      }),
    },
  });
  assert(resDriverDeniedOrder.status === 403, 'Token with role=Driver custom claim is DENIED writing orders (HTTP 403)');

  // Test 3: Sync-Doc Validation (plantSync_* and hrSettings_*)
  console.log('\n--- Suite 3: Sync-Doc Validation (plantSync & hrSettings) ---');

  // 3a: Valid plantSync write with matching companyId, lastUpdatedBy, and items array
  const resValidSync = await requestRest({
    method: 'PATCH',
    path: '/plantSync_sm-concretech/cloud_billing_bills',
    tokenClaims: { uid: 'staff_sync_user', role: 'Operator', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        id: 'cloud_billing_bills',
        nodeKey: 'cloud_billing_bills',
        companyId: 'sm-concretech',
        lastUpdatedBy: 'staff_sync_user',
        updatedAt: Date.now(),
        items: [{ id: 'BILL-001', amount: 50000 }],
        source: 'web_client_sync',
      }),
    },
  });
  assert(resValidSync.status === 200, 'Valid plantSync write with matching companyId and lastUpdatedBy is ALLOWED (HTTP 200)');

  // 3b: Valid hrSettings write with matching companyId
  const resValidHrSync = await requestRest({
    method: 'PATCH',
    path: '/hrSettings_sm-concretech/general_rules',
    tokenClaims: { uid: 'staff_sync_user', role: 'Operator', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        id: 'general_rules',
        companyId: 'sm-concretech',
        lastUpdatedBy: 'staff_sync_user',
        updatedAt: Date.now(),
        items: [{ rule: 'shift_start', time: '08:00' }],
      }),
    },
  });
  assert(resValidHrSync.status === 200, 'Valid hrSettings write with matching companyId is ALLOWED (HTTP 200)');

  // 3c: Tampered plantSync write with mismatched companyId
  const resMismatchedCompany = await requestRest({
    method: 'PATCH',
    path: '/plantSync_sm-concretech/cloud_billing_bills',
    tokenClaims: { uid: 'staff_sync_user', role: 'Operator', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        id: 'cloud_billing_bills',
        companyId: 'malicious_tenant_999', // Mismatched!
        lastUpdatedBy: 'staff_sync_user',
        updatedAt: Date.now(),
      }),
    },
  });
  assert(resMismatchedCompany.status === 403, 'plantSync write with mismatched companyId is DENIED (HTTP 403)');

  // 3d: Tampered plantSync write with invalid lastUpdatedBy (not a string)
  const resInvalidUpdatedBy = await requestRest({
    method: 'PATCH',
    path: '/plantSync_sm-concretech/cloud_billing_bills',
    tokenClaims: { uid: 'staff_sync_user', role: 'Operator', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        id: 'cloud_billing_bills',
        companyId: 'sm-concretech',
        lastUpdatedBy: 12345, // Invalid type!
        updatedAt: Date.now(),
      }),
    },
  });
  assert(resInvalidUpdatedBy.status === 403, 'plantSync write with non-string lastUpdatedBy is DENIED (HTTP 403)');

  // 3e: Legacy blob write to cloud_silo_inventory remains DENIED
  const resLegacySiloDenied = await requestRest({
    method: 'PATCH',
    path: '/plantSync_sm-concretech/cloud_silo_inventory',
    tokenClaims: { uid: 'admin_sys', role: 'Admin', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        id: 'cloud_silo_inventory',
        companyId: 'sm-concretech',
        items: [],
      }),
    },
  });
  assert(resLegacySiloDenied.status === 403, 'Write to plantSync/cloud_silo_inventory remains strictly DENIED (HTTP 403)');

  // Test 4: Protected Zone Live Tracking & Attendance Regression Check
  console.log('\n--- Suite 4: Protected Zone Tracking & Attendance Regression Check ---');

  // 4a: Driver writing liveLocations update
  const resDriverLocation = await requestRest({
    method: 'PATCH',
    path: '/liveLocations_sm-concretech/EMP-DRV-101',
    tokenClaims: { uid: 'EMP-DRV-101', role: 'Driver', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        employeeId: 'EMP-DRV-101',
        userId: 'EMP-DRV-101',
        lat: 16.8465,
        lng: 74.5989,
        accuracy: 12,
        timestamp: new Date().toISOString(),
      }),
    },
  });
  assert(resDriverLocation.status === 200, 'Driver writing live location telemetry is ALLOWED (HTTP 200)');

  // 4b: Driver writing attendance punch
  const resDriverAttendance = await requestRest({
    method: 'PATCH',
    path: '/attendance_sm-concretech/ATT-DRV-101-20261116',
    tokenClaims: { uid: 'EMP-DRV-101', role: 'Driver', companyId: 'sm-concretech' },
    body: {
      fields: toFirestoreFields({
        employeeId: 'EMP-DRV-101',
        userId: 'EMP-DRV-101',
        date: '2026-11-16',
        punchIn: '08:30:00',
        status: 'Present',
      }),
    },
  });
  assert(resDriverAttendance.status === 200, 'Driver writing attendance record is ALLOWED (HTTP 200)');

  // 4c: Dispatcher reading liveLocations
  const resDispatcherReadLocations = await requestRest({
    method: 'GET',
    path: '/liveLocations_sm-concretech',
    tokenClaims: { uid: 'dispatcher_user_1', role: 'Dispatcher', companyId: 'sm-concretech' },
  });
  assert(resDispatcherReadLocations.status === 200, 'Dispatcher reading live locations is ALLOWED (HTTP 200)');

  // 4d: Dispatcher reading driver trips
  const resDispatcherReadTrips = await requestRest({
    method: 'GET',
    path: '/driverTrips_sm-concretech',
    tokenClaims: { uid: 'dispatcher_user_1', role: 'Dispatcher', companyId: 'sm-concretech' },
  });
  assert(resDispatcherReadTrips.status === 200, 'Dispatcher reading driver trips is ALLOWED (HTTP 200)');

  console.log('\n===============================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
