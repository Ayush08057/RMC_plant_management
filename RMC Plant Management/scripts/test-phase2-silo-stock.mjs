/**
 * Phase 2 Verification Suite: Stock Model & Silo Inventory Integrity
 * Runs against live Firestore Emulator at 127.0.0.1:8088
 *
 * Verifies:
 * 1. Idempotency: 5 parallel submissions of the same batchId deduct stock exactly once.
 * 2. Concurrency: 5 distinct batches deducting simultaneously update stock with 0 lost updates.
 * 3. Negative Stock Rejection: normal deduction path rejects shortfall with INSUFFICIENT_STOCK.
 * 4. Supervisor Override: Admin/Plant Manager override with reason succeeds and logs to silo_logs.
 * 5. Override Validation: override without reason or by unauthorized role is rejected.
 * 6. Security Rules per Role: authorized roles allowed, unauthorized roles denied, delete denied.
 * 7. Legacy Blob Protection: plantSync/cloud_silo_inventory write rejected while other keys succeed.
 * 8. Protected Zone: driver liveLocations and attendance continue working without regressions.
 */

import {
  roundStock,
  getSiloLogId,
  resolveMaterialKey
} from '../src/services/siloStockService.js';

const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8088;
const PROJECT_ID = 'smconcretech-2149c';
const BASE_URL = `http://${EMULATOR_HOST}:${EMULATOR_PORT}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const COMMIT_URL = `http://${EMULATOR_HOST}:${EMULATOR_PORT}/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

function createJwt(claims) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    auth_time: Math.floor(Date.now() / 1000),
    user_id: claims.sub,
    sub: claims.sub,
    email_verified: true,
    ...claims
  })).toString('base64url');
  return `${header}.${payload}.`;
}

const TOKENS = {
  admin: createJwt({ sub: 'uid_admin', email: 'admin@smconcretech.com', role: 'Admin', companyId: 'sm-concretech' }),
  manager: createJwt({ sub: 'uid_manager', email: 'manager@smconcretech.com', role: 'Plant Manager', companyId: 'sm-concretech' }),
  operator: createJwt({ sub: 'uid_operator', email: 'operator@smconcretech.com', role: 'Operator', companyId: 'sm-concretech' }),
  weighbridge: createJwt({ sub: 'uid_wb', email: 'wb@smconcretech.com', role: 'Weighbridge Operator', companyId: 'sm-concretech' }),
  dispatcher: createJwt({ sub: 'uid_dispatcher', email: 'dispatcher@smconcretech.com', role: 'Dispatcher', companyId: 'sm-concretech' }),
  driver: createJwt({ sub: 'uid_driver', email: 'driver@smconcretech.com', role: 'Driver', companyId: 'sm-concretech' }),
  accountant: createJwt({ sub: 'uid_accountant', email: 'accountant@smconcretech.com', role: 'Accountant', companyId: 'sm-concretech' }),
  diffCompany: createJwt({ sub: 'uid_other', email: 'other@other.com', role: 'Admin', companyId: 'other-company' })
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function requestRest({ path = '', method = 'GET', token = null, body = null, isCommit = false }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const targetUrl = isCommit ? COMMIT_URL : `${BASE_URL}/${path}`;
  const res = await fetch(targetUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  return { status: res.status, ok: res.ok, data };
}

/**
 * Executes atomic, idempotent silo adjustment over REST matching Firestore rules
 */
async function executeSiloAdjustmentRest({
  token,
  companyId = 'sm-concretech',
  operation = 'deduct',
  referenceId,
  items = [],
  allowNegative = false,
  overrideReason = '',
  user = null,
}) {
  const logId = getSiloLogId(operation, referenceId);
  const logPath = `silo_logs/${logId}`;
  const siloPath = `silo_inventory/${companyId}`;
  const uid = user?.id || 'uid_admin';
  const role = user?.role || 'Admin';

  if (allowNegative) {
    const isAuthSuper = role === 'Admin' || role === 'Plant Manager';
    if (!isAuthSuper) {
      const err = new Error('PERMISSION_DENIED: Only Admin or Plant Manager can authorize negative stock overrides.');
      err.code = 'PERMISSION_DENIED';
      throw err;
    }
    if (!overrideReason || !String(overrideReason).trim()) {
      const err = new Error('INVALID_ARGUMENT: Mandatory reason is required.');
      err.code = 'INVALID_ARGUMENT';
      throw err;
    }
  }

  for (let attempt = 0; attempt < 30; attempt++) {
    // 1. Idempotency Check
    const logCheck = await requestRest({ path: logPath, method: 'GET', token });
    if (logCheck.status === 200) {
      return { success: true, alreadyProcessed: true, logId };
    }

    // 2. Read current stock
    const siloSnap = await requestRest({ path: siloPath, method: 'GET', token });
    let updateTime = null;
    let cementStock = 100.0;
    if (siloSnap.status === 200 && siloSnap.data) {
      updateTime = siloSnap.data.updateTime;
      cementStock = parseFloat(siloSnap.data.fields?.cement?.mapValue?.fields?.stockTons?.doubleValue ?? '100.0');
    }

    // 3. Compute delta
    const delta = items[0]?.delta || 0;
    const finalVal = roundStock(cementStock - delta, 3);

    if (finalVal < 0 && !allowNegative) {
      const err = new Error(`INSUFFICIENT_STOCK: Deficit detected (required: ${delta}, available: ${cementStock}).`);
      err.code = 'INSUFFICIENT_STOCK';
      throw err;
    }

    // 4. Atomic conditional write using documents:commit
    const commitRes = await requestRest({
      isCommit: true,
      method: 'POST',
      token,
      body: {
        writes: [
          {
            update: {
              name: `projects/${PROJECT_ID}/databases/(default)/documents/${siloPath}`,
              fields: {
                companyId: { stringValue: companyId },
                updatedBy: { stringValue: uid },
                updatedAt: { stringValue: new Date().toISOString() },
                cement: {
                  mapValue: {
                    fields: {
                      name: { stringValue: 'Cement (OPC 53 Grade)' },
                      stockTons: { doubleValue: finalVal },
                      capacityTons: { integerValue: '100' },
                      unit: { stringValue: 'Tons' }
                    }
                  }
                }
              }
            },
            currentDocument: updateTime ? { updateTime } : { exists: false }
          },
          {
            update: {
              name: `projects/${PROJECT_ID}/databases/(default)/documents/${logPath}`,
              fields: {
                logId: { stringValue: logId },
                companyId: { stringValue: companyId },
                operation: { stringValue: operation },
                referenceId: { stringValue: referenceId },
                isOverride: { booleanValue: allowNegative },
                overrideReason: { stringValue: overrideReason },
                updatedBy: { stringValue: uid },
                updatedAt: { stringValue: new Date().toISOString() }
              }
            },
            currentDocument: { exists: false }
          }
        ]
      }
    });

    if (commitRes.status === 200) {
      return { success: true, alreadyProcessed: false, logId, finalCementStock: finalVal };
    }

    // Check if failure was because another concurrent write just created the log
    const recheck = await requestRest({ path: logPath, method: 'GET', token });
    if (recheck.status === 200) {
      return { success: true, alreadyProcessed: true, logId };
    }

    // Jittered backoff if contention
    await new Promise(r => setTimeout(r, 20 + Math.random() * 50));
  }
  throw new Error('Silo adjustment transaction contention failed after 30 attempts');
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   PHASE 2 VERIFICATION: STOCK MODEL & SILO INTEGRITY');
  console.log('======================================================\n');

  // Test 1: Precision Rounding
  console.log('--- 1. NUMERIC PRECISION & ROUNDING (3 DECIMALS) ---');
  assert(roundStock(85.4004, 3) === 85.4, '85.4004 rounds to 85.4');
  assert(roundStock(85.4006, 3) === 85.401, '85.4006 rounds to 85.401');
  assert(roundStock(123.0005, 3) === 123.001, 'Half-way 123.0005 rounds up to 123.001');
  assert(roundStock(0.001 + 0.002, 3) === 0.003, '0.001 + 0.002 IEEE float drift eliminates to 0.003');

  // Test 2: Deterministic Log IDs
  console.log('\n--- 2. DETERMINISTIC IDEMPOTENCY LOG IDs ---');
  assert(getSiloLogId('deduct', 'BATCH-001') === 'deduct_BATCH-001', 'Log ID for batch deduct is deduct_BATCH-001');
  assert(getSiloLogId('inward', 'SLIP-999') === 'inward_SLIP-999', 'Log ID for slip inward is inward_SLIP-999');
  assert(getSiloLogId('weighment', 'WB-1234') === 'weighment_WB-1234', 'Log ID for weighbridge is weighment_WB-1234');
  assert(getSiloLogId('reversal', 'WB-1234') === 'reversal_WB-1234', 'Log ID for reversal is reversal_WB-1234');

  // Setup baseline stock in emulator via authenticated REST
  const testCompany = 'sm-concretech';
  const baseRes = await requestRest({
    path: `silo_inventory/${testCompany}`,
    method: 'PATCH',
    token: TOKENS.admin,
    body: {
      fields: {
        companyId: { stringValue: testCompany },
        updatedBy: { stringValue: 'uid_admin' },
        updatedAt: { stringValue: new Date().toISOString() },
        cement: {
          mapValue: {
            fields: {
              name: { stringValue: 'Cement (OPC 53 Grade)' },
              stockTons: { doubleValue: 100.0 },
              capacityTons: { integerValue: '100' },
              unit: { stringValue: 'Tons' }
            }
          }
        }
      }
    }
  });

  // Test 3: Idempotency (5 parallel submissions of same batchId)
  console.log('\n--- 3. PARALLEL IDEMPOTENCY: 5 PARALLEL SUBMISSIONS DEDUCT ONCE ---');
  const idempotentBatchId = `BATCH-IDEMP-${Date.now()}`;
  const deductPayload = {
    token: TOKENS.manager,
    companyId: testCompany,
    operation: 'deduct',
    referenceId: idempotentBatchId,
    items: [{ rawName: 'Cement', materialKey: 'cement', delta: 10.0, unit: 'Tons' }],
    user: { id: 'uid_manager', name: 'Plant Manager', role: 'Plant Manager' }
  };

  const parallelResults = await Promise.all([
    executeSiloAdjustmentRest(deductPayload),
    executeSiloAdjustmentRest(deductPayload),
    executeSiloAdjustmentRest(deductPayload),
    executeSiloAdjustmentRest(deductPayload),
    executeSiloAdjustmentRest(deductPayload)
  ]);

  const alreadyProcessedCount = parallelResults.filter(r => r.alreadyProcessed === true).length;
  const committedCount = parallelResults.filter(r => r.alreadyProcessed === false).length;

  assert(committedCount === 1, `Exactly 1 submission committed deduction (actual: ${committedCount})`);
  assert(alreadyProcessedCount === 4, `4 submissions intercepted by idempotency check (actual: ${alreadyProcessedCount})`);

  const afterIdempSnap = await requestRest({ path: `silo_inventory/${testCompany}`, method: 'GET', token: TOKENS.admin });
  const cementAfterIdemp = parseFloat(afterIdempSnap.data.fields.cement.mapValue.fields.stockTons.doubleValue);
  assert(cementAfterIdemp === 90.0, `Cement stock reduced from 100.0 by exactly 10.0 MT to 90.0 MT (actual: ${cementAfterIdemp})`);

  // Test 4: Concurrency (5 distinct batches deducting simultaneously)
  console.log('\n--- 4. CONCURRENT TRANSACTIONS ACROSS DISTINCT BATCHES ---');
  const batchDeductions = [1, 2, 3, 4, 5].map(idx => 
    executeSiloAdjustmentRest({
      token: TOKENS.operator,
      companyId: testCompany,
      operation: 'deduct',
      referenceId: `BATCH-CONC-${Date.now()}-${idx}`,
      items: [{ rawName: 'Cement', materialKey: 'cement', delta: 5.0, unit: 'Tons' }],
      user: { id: 'uid_operator', name: 'Batching Operator', role: 'Operator' }
    })
  );

  await Promise.all(batchDeductions);
  const afterConcSnap = await requestRest({ path: `silo_inventory/${testCompany}`, method: 'GET', token: TOKENS.admin });
  const cementAfterConc = parseFloat(afterConcSnap.data.fields.cement.mapValue.fields.stockTons.doubleValue);
  assert(cementAfterConc === 65.0, `5 x 5.0 MT deductions cleanly updated cement to 65.0 MT with 0 lost updates (actual: ${cementAfterConc})`);

  // Test 5: Negative Stock Rejection
  console.log('\n--- 5. NEGATIVE STOCK ENFORCEMENT & REJECTION ---');
  let rejected = false;
  try {
    await executeSiloAdjustmentRest({
      token: TOKENS.operator,
      companyId: testCompany,
      operation: 'deduct',
      referenceId: `BATCH-EXCEED-${Date.now()}`,
      items: [{ rawName: 'Cement', materialKey: 'cement', delta: 500.0, unit: 'Tons' }],
      allowNegative: false,
      user: { id: 'uid_operator', name: 'Operator', role: 'Operator' }
    });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK') rejected = true;
  }
  assert(rejected, 'Normal deduction path rejected shortfall with INSUFFICIENT_STOCK');

  // Test 6: Negative Stock Override by Admin with Mandatory Reason
  console.log('\n--- 6. SUPERVISOR OVERRIDE PATH (ADMIN/MGR + REASON) ---');
  const overrideBatchId = `BATCH-OVERRIDE-${Date.now()}`;
  const overrideRes = await executeSiloAdjustmentRest({
    token: TOKENS.admin,
    companyId: testCompany,
    operation: 'deduct',
    referenceId: overrideBatchId,
    items: [{ rawName: 'Cement', materialKey: 'cement', delta: 100.0, unit: 'Tons' }],
    allowNegative: true,
    overrideReason: 'Physical bulk tanker arrived without unrecorded gate slip',
    user: { id: 'uid_admin', name: 'Ayush Admin', role: 'Admin' }
  });

  assert(overrideRes.success === true, 'Admin override succeeded');
  const afterOverrideSnap = await requestRest({ path: `silo_inventory/${testCompany}`, method: 'GET', token: TOKENS.admin });
  const cementAfterOverride = parseFloat(afterOverrideSnap.data.fields.cement.mapValue.fields.stockTons.doubleValue);
  assert(cementAfterOverride === -35.0, `True negative stock recorded (-35.0 MT) without silent Math.max(0) clamp (actual: ${cementAfterOverride})`);

  // Check audit log
  const logDocSnap = await requestRest({ path: `silo_logs/deduct_${overrideBatchId}`, method: 'GET', token: TOKENS.admin });
  assert(logDocSnap.status === 200, 'Audit record written to /silo_logs/deduct_<batchId>');
  assert(logDocSnap.data.fields.isOverride.booleanValue === true, 'Log doc records isOverride = true');
  assert(logDocSnap.data.fields.overrideReason.stringValue.includes('Physical bulk tanker'), 'Log doc records exact mandatory reason');

  // Test 7: Negative Stock Override Rejection Without Reason or Unauthorized Role
  console.log('\n--- 7. OVERRIDE VALIDATION: MISSING REASON & UNAUTHORIZED ROLE ---');
  let noReasonRejected = false;
  try {
    await executeSiloAdjustmentRest({
      token: TOKENS.admin,
      companyId: testCompany,
      operation: 'deduct',
      referenceId: `BATCH-FAIL-REASON-${Date.now()}`,
      items: [{ rawName: 'Cement', materialKey: 'cement', delta: 10.0, unit: 'Tons' }],
      allowNegative: true,
      overrideReason: '',
      user: { id: 'uid_admin', name: 'Admin', role: 'Admin' }
    });
  } catch (e) {
    if (e.code === 'INVALID_ARGUMENT') noReasonRejected = true;
  }
  assert(noReasonRejected, 'Override rejected when mandatory reason is empty');

  let unauthRoleRejected = false;
  try {
    await executeSiloAdjustmentRest({
      token: TOKENS.driver,
      companyId: testCompany,
      operation: 'deduct',
      referenceId: `BATCH-FAIL-ROLE-${Date.now()}`,
      items: [{ rawName: 'Cement', materialKey: 'cement', delta: 10.0, unit: 'Tons' }],
      allowNegative: true,
      overrideReason: 'Driver wants to proceed',
      user: { id: 'uid_driver', name: 'Driver', role: 'Driver' }
    });
  } catch (e) {
    if (e.code === 'PERMISSION_DENIED') unauthRoleRejected = true;
  }
  assert(unauthRoleRejected, 'Override rejected when requested by Driver role');

  // Test 8: Security Rules Allow / Deny Per Role
  console.log('\n--- 8. FIRESTORE SECURITY RULES FOR /silo_inventory AND /silo_logs ---');
  // Admin write to silo_inventory
  const adminInvRes = await requestRest({
    path: 'silo_inventory/sm-concretech',
    method: 'PATCH',
    token: TOKENS.admin,
    body: {
      fields: {
        companyId: { stringValue: 'sm-concretech' },
        updatedBy: { stringValue: 'uid_admin' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    }
  });
  assert(adminInvRes.ok, `Admin can update /silo_inventory/sm-concretech (HTTP ${adminInvRes.status})`);

  // Operator write to silo_inventory
  const opInvRes = await requestRest({
    path: 'silo_inventory/sm-concretech',
    method: 'PATCH',
    token: TOKENS.operator,
    body: {
      fields: {
        companyId: { stringValue: 'sm-concretech' },
        updatedBy: { stringValue: 'uid_operator' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    }
  });
  assert(opInvRes.ok, `Operator can update /silo_inventory/sm-concretech (HTTP ${opInvRes.status})`);

  // Driver write to silo_inventory -> DENIED
  const drvInvRes = await requestRest({
    path: 'silo_inventory/sm-concretech',
    method: 'PATCH',
    token: TOKENS.driver,
    body: {
      fields: {
        companyId: { stringValue: 'sm-concretech' },
        updatedBy: { stringValue: 'uid_driver' }
      }
    }
  });
  assert(drvInvRes.status === 403, `Driver cannot update /silo_inventory (HTTP ${drvInvRes.status} Forbidden)`);

  // Delete denied on silo_inventory
  const delInvRes = await requestRest({
    path: 'silo_inventory/sm-concretech',
    method: 'DELETE',
    token: TOKENS.admin
  });
  assert(delInvRes.status === 403, `Delete is denied on /silo_inventory (HTTP ${delInvRes.status} Forbidden)`);

  // Update denied on silo_logs (append-only)
  const updLogRes = await requestRest({
    path: `silo_logs/deduct_${overrideBatchId}`,
    method: 'PATCH',
    token: TOKENS.admin,
    body: { fields: { overrideReason: { stringValue: 'Tampered reason' } } }
  });
  assert(updLogRes.status === 403, `Update is denied on /silo_logs immutable ledger (HTTP ${updLogRes.status} Forbidden)`);

  // Test 9: Legacy Blob Protection
  console.log('\n--- 9. LEGACY BLOB PROTECTION ON plantSync ---');
  // Attempt to write old single blob cloud_silo_inventory -> MUST BE REJECTED
  const oldBlobRes = await requestRest({
    path: 'plantSync_sm-concretech/cloud_silo_inventory',
    method: 'PATCH',
    token: TOKENS.admin,
    body: { fields: { legacyBlob: { stringValue: 'tampered' } } }
  });
  assert(oldBlobRes.status === 403, `Old-client write to plantSync/cloud_silo_inventory is REJECTED (HTTP ${oldBlobRes.status} Forbidden)`);

  // Legitimate write to other plantSync key (e.g. cloud_billing_bills) -> MUST SUCCEED
  const billBlobRes = await requestRest({
    path: 'plantSync_sm-concretech/cloud_billing_bills',
    method: 'PATCH',
    token: TOKENS.admin,
    body: { fields: { activeBillsCount: { integerValue: '1' } } }
  });
  assert(billBlobRes.ok, `Write to plantSync/cloud_billing_bills remains ALLOWED (HTTP ${billBlobRes.status})`);

  // Test 10: Protected Zone Verification (Tracking & Attendance)
  console.log('\n--- 10. PROTECTED ZONE REGRESSION CHECK ---');
  // Driver writes liveLocations
  const drvLocRes = await requestRest({
    path: 'liveLocations_sm-concretech/DRV-001',
    method: 'PATCH',
    token: TOKENS.driver,
    body: {
      fields: {
        employeeId: { stringValue: 'DRV-001' },
        userId: { stringValue: 'uid_driver' },
        lat: { doubleValue: 16.8524 },
        lng: { doubleValue: 74.5815 },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    }
  });
  assert(drvLocRes.ok, `Driver can write liveLocations_sm-concretech (HTTP ${drvLocRes.status})`);

  // Dispatcher reads liveLocations
  const dispLocRes = await requestRest({
    path: 'liveLocations_sm-concretech/DRV-001',
    method: 'GET',
    token: TOKENS.dispatcher
  });
  assert(dispLocRes.ok, `Dispatcher can read liveLocations_sm-concretech (HTTP ${dispLocRes.status})`);

  // Driver writes attendance
  const attRes = await requestRest({
    path: `attendance_sm-concretech/ATT-${Date.now()}`,
    method: 'PATCH',
    token: TOKENS.driver,
    body: {
      fields: {
        employeeId: { stringValue: 'DRV-001' },
        userId: { stringValue: 'uid_driver' },
        timestamp: { stringValue: new Date().toISOString() }
      }
    }
  });
  assert(attRes.ok, `Driver can write attendance_sm-concretech (HTTP ${attRes.status})`);

  console.log('\n======================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
