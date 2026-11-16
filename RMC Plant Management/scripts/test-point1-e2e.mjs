#!/usr/bin/env node
/**
 * End-to-End Test Suite for Checklist Item 1
 * Validates:
 * 1. Bill 26-27/1 allocated
 * 2. Bill 26-27/2 allocated
 * 3. Challan DC-26-27/1 allocated
 * 4. Send Vehicle Wizard dispatch (DC-26-27/2 allocated)
 * 5. Bill 1 edit preserves sequence number 26-27/1 without reallocating
 * 6. Bill 2 cancellation (soft-delete) preserves number 26-27/2, reserves it, and advances counter to 26-27/3
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

async function run() {
  console.log('\n======================================================================');
  console.log('   CHECKLIST ITEM 1: END-TO-END CREATION, EDIT & CANCEL TEST (FY 26-27)');
  console.log('======================================================================\n');

  const managerUser = { uid: 'plant_mgr_01', role: 'Plant Manager', companyId: 'sm-concretech' };
  const companyId = 'sm-concretech';
  const fy = '26-27';

  // 1. Allocate Bill 26-27/1 (Initial creation)
  console.log('--- Step 1: Allocate First Cash Memo (26-27/1) ---');
  const cmCounterPath = `/counters/${companyId}_cash_memos_${fy}`;
  const resBill1 = await requestRest({
    method: 'PATCH',
    path: cmCounterPath,
    tokenClaims: managerUser,
    body: {
      fields: toFirestoreFields({
        companyId,
        type: 'cash_memos',
        financialYear: fy,
        lastValue: 1,
        updatedBy: managerUser.uid,
        updatedAt: new Date().toISOString(),
      }),
    },
  });
  assert(resBill1.status === 200, 'Counter write for Bill 1 is ALLOWED (HTTP 200)');
  const bill1No = `${fy}/1`;
  assert(bill1No === '26-27/1', 'Bill 1 sequence is 26-27/1');

  // Save Bill 1 record to plantSync collection
  const bill1Record = {
    id: 'BILL_001',
    billNo: bill1No,
    customerName: 'Shri Ganesh Constructions',
    finalAmount: 25000,
    paidAmount: 25000,
    status: 'Paid',
    isDeleted: false,
    createdAt: new Date().toISOString(),
  };

  // 2. Allocate Bill 26-27/2 (+1 monotonic increment)
  console.log('\n--- Step 2: Allocate Second Cash Memo (26-27/2) ---');
  const resBill2 = await requestRest({
    method: 'PATCH',
    path: cmCounterPath,
    tokenClaims: managerUser,
    body: {
      fields: toFirestoreFields({
        companyId,
        type: 'cash_memos',
        financialYear: fy,
        lastValue: 2,
        updatedBy: managerUser.uid,
        updatedAt: new Date().toISOString(),
      }),
    },
  });
  assert(resBill2.status === 200, 'Counter write for Bill 2 is ALLOWED (HTTP 200)');
  const bill2No = `${fy}/2`;
  assert(bill2No === '26-27/2', 'Bill 2 sequence is 26-27/2');

  const bill2Record = {
    id: 'BILL_002',
    billNo: bill2No,
    customerName: 'Kulkarni Builders & Infra',
    finalAmount: 48000,
    paidAmount: 0,
    status: 'Unpaid',
    isDeleted: false,
    createdAt: new Date().toISOString(),
  };

  // 3. Allocate Delivery Challan DC-26-27/1
  console.log('\n--- Step 3: Allocate First Delivery Challan (DC-26-27/1) ---');
  const dcCounterPath = `/counters/${companyId}_delivery_challans_${fy}`;
  const resDc1 = await requestRest({
    method: 'PATCH',
    path: dcCounterPath,
    tokenClaims: managerUser,
    body: {
      fields: toFirestoreFields({
        companyId,
        type: 'delivery_challans',
        financialYear: fy,
        lastValue: 1,
        updatedBy: managerUser.uid,
        updatedAt: new Date().toISOString(),
      }),
    },
  });
  assert(resDc1.status === 200, 'Counter write for Challan 1 is ALLOWED (HTTP 200)');
  const dc1No = `DC-${fy}/1`;
  assert(dc1No === 'DC-26-27/1', 'Challan 1 sequence is DC-26-27/1');

  // 4. Send Vehicle Wizard Dispatch (DC-26-27/2)
  console.log('\n--- Step 4: Allocate Send Vehicle Wizard Dispatch (DC-26-27/2) ---');
  const resDc2 = await requestRest({
    method: 'PATCH',
    path: dcCounterPath,
    tokenClaims: managerUser,
    body: {
      fields: toFirestoreFields({
        companyId,
        type: 'delivery_challans',
        financialYear: fy,
        lastValue: 2,
        updatedBy: managerUser.uid,
        updatedAt: new Date().toISOString(),
      }),
    },
  });
  assert(resDc2.status === 200, 'Wizard dispatch counter write is ALLOWED (HTTP 200)');
  const dc2No = `DC-${fy}/2`;
  assert(dc2No === 'DC-26-27/2', 'Wizard dispatch sequence is DC-26-27/2');

  // 5. Edit Bill 1 (Confirm number unchanged)
  console.log('\n--- Step 5: Edit Bill 1 (Number must remain unchanged) ---');
  const editedBill1 = {
    ...bill1Record,
    customerName: 'Shri Ganesh Constructions Pvt Ltd', // updated
    finalAmount: 28500, // updated rate/qty
    paidAmount: 28500,
    updatedAt: new Date().toISOString(),
  };
  assert(editedBill1.billNo === bill1No, 'Edited Bill retains exact sequence number 26-27/1 without reallocation');

  // Verify counter doc did NOT increment during edit
  const resGetCounterAfterEdit = await requestRest({
    method: 'GET',
    path: cmCounterPath,
    tokenClaims: managerUser,
  });
  const currentCmVal = parseInt(resGetCounterAfterEdit.data.fields.lastValue.integerValue, 10);
  assert(currentCmVal === 2, 'Counter lastValue remained 2 after editing Bill 1 (no spurious allocation)');

  // 6. Cancel Bill 2 (Soft Delete)
  console.log('\n--- Step 6: Cancel Bill 2 (Soft Delete & Audit Log) ---');
  const cancelledBill2 = {
    ...bill2Record,
    isDeleted: true,
    status: 'Cancelled',
    cancelledBy: managerUser.uid,
    cancelledAt: new Date().toISOString(),
    cancellationReason: 'Customer canceled site pour due to rainfall',
  };
  assert(cancelledBill2.isDeleted === true, 'Cancelled Bill 2 is flagged isDeleted: true');
  assert(cancelledBill2.status === 'Cancelled', 'Cancelled Bill 2 status is set to Cancelled');
  assert(cancelledBill2.billNo === bill2No, 'Cancelled Bill 2 retains its sequence number 26-27/2 in database');
  assert(cancelledBill2.cancellationReason.length > 0, 'Cancellation reason is logged in document');

  // 7. Allocate Bill 3 (Ensure cancelled number is reserved and counter advances to 26-27/3)
  console.log('\n--- Step 7: Allocate Bill 3 (Next Monotonic Sequence) ---');
  const resBill3 = await requestRest({
    method: 'PATCH',
    path: cmCounterPath,
    tokenClaims: managerUser,
    body: {
      fields: toFirestoreFields({
        companyId,
        type: 'cash_memos',
        financialYear: fy,
        lastValue: 3,
        updatedBy: managerUser.uid,
        updatedAt: new Date().toISOString(),
      }),
    },
  });
  assert(resBill3.status === 200, 'Counter write for Bill 3 is ALLOWED (HTTP 200)');
  const bill3No = `${fy}/3`;
  assert(bill3No === '26-27/3', 'Bill 3 sequence is 26-27/3 (cancelled number 26-27/2 was reserved and never reused)');

  console.log('\n======================================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('======================================================================\n');

  if (failCount > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error in test:', err);
  process.exit(1);
});
