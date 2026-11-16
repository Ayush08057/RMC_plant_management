#!/usr/bin/env node
/**
 * Local Emulator Environment Setup & Seeding Script
 * Seeds test users for all 7 operational roles, initial sequence counters, and silo stock
 * into the local Firestore and Auth emulator for local app testing.
 */

import http from 'http';

const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;
const AUTH_PORT = 9099;
const PROJECT_ID = 'smconcretech-2149c';
const BASE_URL = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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
          values: val.map((v) => ({ stringValue: String(v) })),
        },
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

function writeFirestoreDoc(path, data, adminToken = true) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ fields: toFirestoreFields(data) });
    const authPayload = adminToken ? Buffer.from(JSON.stringify({
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      aud: PROJECT_ID,
      auth_time: Math.floor(Date.now() / 1000),
      sub: 'admin_sys',
      user_id: 'admin_sys',
      uid: 'admin_sys',
      role: 'Admin',
      companyId: 'sm-concretech',
      email: 'admin@smconcretech.com',
    })).toString('base64url') : null;

    const req = http.request({
      hostname: EMULATOR_HOST,
      port: EMULATOR_PORT,
      path: `${BASE_URL}/${path}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(authPayload ? { Authorization: `Bearer eyJhbGciOiJub25lIn0.${authPayload}.` } : {}),
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.write(payload);
    req.end();
  });
}

function createAuthUser(uid, email, role, companyId) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      localId: uid,
      email,
      passwordHash: Buffer.from('password123').toString('base64'),
      customAttributes: JSON.stringify({ role, companyId }),
    });

    const req = http.request({
      hostname: EMULATOR_HOST,
      port: AUTH_PORT,
      path: `/identitytoolkit.googleapis.com/v1/accounts:update`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('======================================================================');
  console.log('   LOCAL EMULATOR SEEDER - USERS, COUNTERS & SILO INVENTORY');
  console.log('======================================================================\n');

  const companyId = 'sm-concretech';
  const fy = '26-27';

  // 1. Seed Operational Roles (7 Required Profiles)
  const users = [
    { uid: 'USR_ADMIN_01', email: 'admin@smconcretech.com', name: 'System Admin', role: 'Admin' },
    { uid: 'USR_MANAGER_01', email: 'manager@smconcretech.com', name: 'Plant Manager', role: 'Plant Manager' },
    { uid: 'USR_ACCOUNTANT_01', email: 'accountant@smconcretech.com', name: 'Plant Accountant', role: 'Accountant' },
    { uid: 'USR_DISPATCHER_01', email: 'dispatcher@smconcretech.com', name: 'Dispatch Officer', role: 'Dispatcher' },
    { uid: 'USR_DRIVER_01', email: 'driver@smconcretech.com', name: 'Transit Mixer Driver', role: 'Driver' },
    { uid: 'USR_WB_OPERATOR_01', email: 'weighbridge@smconcretech.com', name: 'Weighbridge Operator', role: 'Operator' },
    { uid: 'USR_BATCH_OPERATOR_01', email: 'batching@smconcretech.com', name: 'Batching Plant Operator', role: 'Operator' },
  ];

  console.log('1. Seeding 7 User Profiles & Auth Accounts (Password: password123)...');
  for (const u of users) {
    const docData = {
      id: u.uid,
      name: u.name,
      email: u.email,
      role: u.role,
      companyId,
      isApproved: true,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    const resDoc = await writeFirestoreDoc(`users/${u.uid}`, docData);
    const resAuth = await createAuthUser(u.uid, u.email, u.role, companyId);
    console.log(`  ✓ ${u.name.padEnd(26)} [${u.role.padEnd(14)}] -> Doc: HTTP ${resDoc.status}, Auth: ${resAuth.status ? 'HTTP ' + resAuth.status : 'Skipped (Auth emu optional)'}`);
  }

  // 2. Seed Sequence Counters (Fresh FY 26-27 starting at 0)
  console.log('\n2. Seeding Fresh Sequence Counters (FY 26-27)...');
  const counters = [
    { type: 'cash_memos', path: `counters/${companyId}_cash_memos_${fy}` },
    { type: 'delivery_challans', path: `counters/${companyId}_delivery_challans_${fy}` },
  ];

  for (const c of counters) {
    const counterData = {
      companyId,
      type: c.type,
      financialYear: fy,
      lastValue: 0,
      updatedBy: 'USR_ADMIN_01',
      updatedAt: new Date().toISOString(),
    };
    const res = await writeFirestoreDoc(c.path, counterData);
    console.log(`  ✓ ${c.path.padEnd(46)} -> HTTP ${res.status} (lastValue = 0)`);
  }

  // 3. Seed Silo Inventory Initial Balances
  console.log('\n3. Seeding Silo Inventory Document...');
  const siloData = {
    companyId,
    updatedAt: new Date().toISOString(),
    lastUpdatedBy: 'USR_ADMIN_01',
    materials: {
      cement: { stockTons: 100.0, capacityTons: 100.0, name: 'Cement (OPC 53 Grade)', unit: 'Tons' },
      flyash: { stockTons: 60.0, capacityTons: 60.0, name: 'Fly Ash (Pozzolanic)', unit: 'Tons' },
      agg20: { stockTons: 200.0, capacityTons: 200.0, name: '20mm Coarse Aggregate', unit: 'Tons' },
      agg10: { stockTons: 150.0, capacityTons: 150.0, name: '10mm Coarse Aggregate', unit: 'Tons' },
      sand: { stockTons: 200.0, capacityTons: 200.0, name: 'Crushed M-Sand (Fine Sand)', unit: 'Tons' },
      riverSand: { stockTons: 120.0, capacityTons: 120.0, name: 'Natural River Sand', unit: 'Tons' },
      admixturePce: { stockLiters: 5000.0, capacityLiters: 5000.0, name: 'Chemical Admixture (PCE)', unit: 'Litres' },
      retarder: { stockLiters: 3000.0, capacityLiters: 3000.0, name: 'Retarder / Plasticizer Chemical', unit: 'Litres' },
    },
  };
  const resSilo = await writeFirestoreDoc(`silo_inventory/${companyId}`, siloData);
  console.log(`  ✓ silo_inventory/${companyId} -> HTTP ${resSilo.status}`);

  console.log('\n======================================================================');
  console.log('   EMULATOR SEEDING COMPLETE! LOCAL ENVIRONMENT READY.');
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error seeding emulator:', err);
  process.exit(1);
});
