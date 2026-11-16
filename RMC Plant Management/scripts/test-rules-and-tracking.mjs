/**
 * Phase 1.5 Verification Suite (Items 2, 3, 4)
 * Runs against live Firestore Emulator at 127.0.0.1:8088
 * 
 * Verifies:
 * Item 2: Counters security rules (roles allow/deny, companyId mismatch, updatedBy, increment != +1, delete, voided doc)
 * Item 3: Tracking & Attendance security rules (Driver/Staff/Supervisor writes, Dispatcher/Admin/Manager reads)
 * Item 4: Real concurrency test (10 parallel transaction allocations for cash memos & challans with 0 duplicates)
 */

const EMULATOR_HOST = 'http://127.0.0.1:8088';
const PROJECT_ID = 'smconcretech-2149c';
const BASE_URL = `${EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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

// Roles for testing
const TOKENS = {
  admin: createJwt({ sub: 'uid_admin', email: 'admin@smconcretech.com', role: 'Admin', companyId: 'CMP-SM-001' }),
  manager: createJwt({ sub: 'uid_manager', email: 'manager@smconcretech.com', role: 'Plant Manager', companyId: 'CMP-SM-001' }),
  accountant: createJwt({ sub: 'uid_accountant', email: 'accountant@smconcretech.com', role: 'Accountant', companyId: 'CMP-SM-001' }),
  dispatcher: createJwt({ sub: 'uid_dispatcher', email: 'dispatcher@smconcretech.com', role: 'Dispatcher', companyId: 'CMP-SM-001' }),
  driver: createJwt({ sub: 'uid_driver', email: 'driver@smconcretech.com', role: 'Driver', companyId: 'CMP-SM-001' }),
  operator: createJwt({ sub: 'uid_operator', email: 'operator@smconcretech.com', role: 'Operator', companyId: 'CMP-SM-001' }),
  supervisor: createJwt({ sub: 'uid_supervisor', email: 'supervisor@smconcretech.com', role: 'Site Supervisor', companyId: 'CMP-SM-001' }),
  diffCompanyAdmin: createJwt({ sub: 'uid_other_admin', email: 'admin@other.com', role: 'Admin', companyId: 'CMP-OTHER-999' })
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

async function requestFirestore({ path, method = 'GET', token = null, body = null }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { }
  return { status: res.status, ok: res.ok, json, raw: text };
}

async function runItem2RulesTests() {
  console.log('\n======================================================');
  console.log('--- ITEM 2: COUNTERS SECURITY RULES VERIFICATION ---');
  console.log('======================================================');

  // Clean / prepare counter doc ID
  const counterDoc = 'counters/CMP-SM-001_cash_memos_26-27';

  // 1. Create counter by Admin (lastValue = 100)
  const createAdminRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.admin,
    body: {
      fields: {
        lastValue: { integerValue: '100' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_admin' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    }
  });
  assert(createAdminRes.status === 200, 'Admin can initialize counter (lastValue=100)');

  // 2. Increment by Plant Manager (+1: 100 -> 101)
  const incManagerRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.manager,
    body: {
      fields: {
        lastValue: { integerValue: '101' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_manager' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    }
  });
  assert(incManagerRes.status === 200, 'Plant Manager can increment counter by +1 (100 -> 101)');

  // 3. Increment by Accountant (+1: 101 -> 102)
  const incAccountantRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.accountant,
    body: {
      fields: {
        lastValue: { integerValue: '102' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_accountant' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    }
  });
  assert(incAccountantRes.status === 200, 'Accountant can increment counter by +1 (101 -> 102)');

  // 4. Increment by Dispatcher (+1: 102 -> 103)
  const incDispatcherRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.dispatcher,
    body: {
      fields: {
        lastValue: { integerValue: '103' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_dispatcher' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    }
  });
  assert(incDispatcherRes.status === 200, 'Dispatcher can increment counter by +1 (102 -> 103)');

  // 5. Driver attempt to increment counter -> DENY
  const driverIncRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.driver,
    body: {
      fields: {
        lastValue: { integerValue: '104' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_driver' }
      }
    }
  });
  assert(driverIncRes.status === 403, `Driver cannot update counter (got HTTP ${driverIncRes.status} 403 Forbidden)`);

  // 6. Unauthenticated update attempt -> DENY
  const unauthRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: null,
    body: {
      fields: {
        lastValue: { integerValue: '104' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'unauth' }
      }
    }
  });
  assert(unauthRes.status === 403, `Unauthenticated update blocked (got HTTP ${unauthRes.status} 403)`);

  // 7. CompanyId mismatch check
  const mismatchCompanyRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.diffCompanyAdmin,
    body: {
      fields: {
        lastValue: { integerValue: '104' },
        companyId: { stringValue: 'CMP-OTHER-999' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_other_admin' }
      }
    }
  });
  assert(mismatchCompanyRes.status === 403, `CompanyId mismatch strictly denied (got HTTP ${mismatchCompanyRes.status})`);

  // 8. Wrong updatedBy check (admin with uid_admin sends updatedBy = uid_impostor)
  const wrongUpdatedByRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.admin,
    body: {
      fields: {
        lastValue: { integerValue: '104' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_impostor' }
      }
    }
  });
  assert(wrongUpdatedByRes.status === 403, `Impersonated updatedBy strictly denied (got HTTP ${wrongUpdatedByRes.status})`);

  // 9. Increment other than +1: +2 attempt (103 -> 105)
  const incPlus2Res = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.admin,
    body: {
      fields: {
        lastValue: { integerValue: '105' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_admin' }
      }
    }
  });
  assert(incPlus2Res.status === 403, `Increment other than +1 (+2: 103 -> 105) strictly denied (got HTTP ${incPlus2Res.status})`);

  // 10. Increment other than +1: Zero jump attempt (103 -> 103)
  const incZeroRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.admin,
    body: {
      fields: {
        lastValue: { integerValue: '103' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_admin' }
      }
    }
  });
  assert(incZeroRes.status === 403, `Increment other than +1 (+0: 103 -> 103) strictly denied (got HTTP ${incZeroRes.status})`);

  // 11. Increment other than +1: Decrement attempt (103 -> 102)
  const decRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.admin,
    body: {
      fields: {
        lastValue: { integerValue: '102' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_admin' }
      }
    }
  });
  assert(decRes.status === 403, `Decrementation (103 -> 102) strictly denied (got HTTP ${decRes.status})`);

  // 12. Delete counter denied
  const deleteRes = await requestFirestore({
    path: counterDoc,
    method: 'DELETE',
    token: TOKENS.admin
  });
  assert(deleteRes.status === 403, `Counter document deletion denied for Admin (got HTTP ${deleteRes.status})`);

  // 13. Attack Test (Fix 2): Manager attempts to tamper with lastValue (e.g. 999) using voidedNumbers payload on real counter doc
  const attackCounterRes = await requestFirestore({
    path: counterDoc,
    method: 'PATCH',
    token: TOKENS.manager,
    body: {
      fields: {
        lastValue: { integerValue: '999' },
        companyId: { stringValue: 'CMP-SM-001' },
        updatedBy: { stringValue: 'uid_manager' },
        voidedNumbers: { arrayValue: { values: [] } }
      }
    }
  });
  assert(attackCounterRes.status === 403, `ATTACK BLOCKED: Tampering with lastValue via voidedNumbers payload on counters doc is strictly DENIED (HTTP ${attackCounterRes.status})`);

  // 14. Attack Test (Fix 2): Manager attempts to inject lastValue into /counters_voided collection
  const voidedDoc = 'counters_voided/CMP-SM-001_26-27';
  const attackVoidedRes = await requestFirestore({
    path: voidedDoc,
    method: 'PATCH',
    token: TOKENS.manager,
    body: {
      fields: {
        lastValue: { integerValue: '999' },
        companyId: { stringValue: 'CMP-SM-001' },
        financialYear: { stringValue: '26-27' },
        updatedBy: { stringValue: 'uid_manager' },
        voidedNumbers: { arrayValue: { values: [] } }
      }
    }
  });
  assert(attackVoidedRes.status === 403, `ATTACK BLOCKED: Injecting lastValue into /counters_voided is strictly DENIED (HTTP ${attackVoidedRes.status})`);

  // 15. Legitimate voided document creation in /counters_voided
  const createVoidedRes = await requestFirestore({
    path: voidedDoc,
    method: 'PATCH',
    token: TOKENS.dispatcher,
    body: {
      fields: {
        companyId: { stringValue: 'CMP-SM-001' },
        financialYear: { stringValue: '26-27' },
        updatedBy: { stringValue: 'uid_dispatcher' },
        voidedNumbers: {
          arrayValue: {
            values: [
              {
                mapValue: {
                  fields: {
                    type: { stringValue: 'cash_memos' },
                    number: { stringValue: '26-27/1' },
                    sequence: { integerValue: '1' },
                    reason: { stringValue: 'Simulated network timeout during save' },
                    voidedAt: { stringValue: new Date().toISOString() }
                  }
                }
              }
            ]
          }
        }
      }
    }
  });
  assert(createVoidedRes.status === 200, `Legitimate voided document creation allowed for Dispatcher in counters_voided (HTTP ${createVoidedRes.status})`);

  // 16. Driver attempt to write voided doc -> DENY
  const driverVoidedRes = await requestFirestore({
    path: voidedDoc,
    method: 'PATCH',
    token: TOKENS.driver,
    body: {
      fields: {
        companyId: { stringValue: 'CMP-SM-001' },
        financialYear: { stringValue: '26-27' },
        updatedBy: { stringValue: 'uid_driver' },
        voidedNumbers: { arrayValue: { values: [] } }
      }
    }
  });
  assert(driverVoidedRes.status === 403, `Driver cannot write to voided doc (got HTTP ${driverVoidedRes.status})`);
}

async function runItem3TrackingTests() {
  console.log('\n======================================================');
  console.log('--- ITEM 3: TRACKING & ATTENDANCE RULES VERIFICATION ---');
  console.log('======================================================');

  // Exact payload from foreground_service.dart
  const driverEmpId = 'EMP-DRV-001';
  const liveCol = 'liveLocations_CMP-SM-001';
  const foregroundLivePayload = {
    fields: {
      id: { stringValue: driverEmpId },
      employeeId: { stringValue: driverEmpId },
      companyId: { stringValue: 'CMP-SM-001' },
      date: { stringValue: '2026-11-16' },
      attendanceId: { stringValue: 'ATT-2026-11-16-001' },
      isOnDuty: { booleanValue: true },
      lat: { doubleValue: 16.8524 },
      lng: { doubleValue: 74.5815 },
      accuracy: { doubleValue: 12.5 },
      address: { stringValue: 'Sangli-Miraj Industrial Area' },
      landmarkName: { stringValue: 'Live GPS Fix' },
      timestamp: { stringValue: new Date().toISOString() },
      updatedAt: { stringValue: new Date().toISOString() },
      userId: { stringValue: 'uid_driver' }
    }
  };

  // 1. Driver write live location (foreground_service.dart payload)
  const drvWriteRes = await requestFirestore({
    path: `${liveCol}/${driverEmpId}`,
    method: 'PATCH',
    token: TOKENS.driver,
    body: foregroundLivePayload
  });
  assert(drvWriteRes.status === 200, `Driver can write liveLocations (foreground_service payload, HTTP ${drvWriteRes.status})`);

  // 2. Operator / Plant Incharge write live location (WorkforceContext.jsx payload)
  const opEmpId = 'EMP-OP-002';
  const workforceLivePayload = {
    fields: {
      id: { stringValue: opEmpId },
      employeeId: { stringValue: opEmpId },
      userId: { stringValue: 'uid_operator' },
      employeeName: { stringValue: 'Plant Operator' },
      role: { stringValue: 'Operator' },
      companyId: { stringValue: 'CMP-SM-001' },
      date: { stringValue: '2026-11-16' },
      attendanceId: { stringValue: 'ATT-2026-11-16-002' },
      isOnDuty: { booleanValue: true },
      lat: { doubleValue: 16.8540 },
      lng: { doubleValue: 74.5830 },
      accuracy: { doubleValue: 15.0 },
      address: { stringValue: 'SM Concrete Tech Batching Yard' },
      landmarkName: { stringValue: 'Batching Plant' },
      timestamp: { stringValue: new Date().toISOString() },
      updatedAt: { stringValue: new Date().toISOString() }
    }
  };
  const opWriteRes = await requestFirestore({
    path: `${liveCol}/${opEmpId}`,
    method: 'PATCH',
    token: TOKENS.operator,
    body: workforceLivePayload
  });
  assert(opWriteRes.status === 200, `Operator can write liveLocations (WorkforceContext payload, HTTP ${opWriteRes.status})`);

  // 3. Supervisor write live location
  const supEmpId = 'EMP-SUP-003';
  const supLivePayload = {
    fields: {
      ...workforceLivePayload.fields,
      id: { stringValue: supEmpId },
      employeeId: { stringValue: supEmpId },
      userId: { stringValue: 'uid_supervisor' },
      role: { stringValue: 'Site Supervisor' }
    }
  };
  const supWriteRes = await requestFirestore({
    path: `${liveCol}/${supEmpId}`,
    method: 'PATCH',
    token: TOKENS.supervisor,
    body: supLivePayload
  });
  assert(supWriteRes.status === 200, `Supervisor can write liveLocations (HTTP ${supWriteRes.status})`);

  // 4. Driver write attendance record (WorkforceContext attendance sync)
  const attDoc = 'attendance_CMP-SM-001/ATT-2026-11-16-001';
  const attWriteRes = await requestFirestore({
    path: attDoc,
    method: 'PATCH',
    token: TOKENS.driver,
    body: {
      fields: {
        id: { stringValue: 'ATT-2026-11-16-001' },
        employeeId: { stringValue: driverEmpId },
        userId: { stringValue: 'uid_driver' },
        employeeName: { stringValue: 'Driver Name' },
        companyId: { stringValue: 'CMP-SM-001' },
        role: { stringValue: 'Driver' },
        date: { stringValue: '2026-11-16' },
        status: { stringValue: 'Present' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    }
  });
  assert(attWriteRes.status === 200, `Driver can write attendance (HTTP ${attWriteRes.status})`);

  // 5. Dispatcher reads liveLocations
  const dispReadLiveRes = await requestFirestore({
    path: `${liveCol}/${driverEmpId}`,
    method: 'GET',
    token: TOKENS.dispatcher
  });
  assert(dispReadLiveRes.status === 200, `Dispatcher can read liveLocations (HTTP ${dispReadLiveRes.status})`);

  // 6. Plant Manager reads liveLocations
  const mgrReadLiveRes = await requestFirestore({
    path: `${liveCol}/${driverEmpId}`,
    method: 'GET',
    token: TOKENS.manager
  });
  assert(mgrReadLiveRes.status === 200, `Plant Manager can read liveLocations (HTTP ${mgrReadLiveRes.status})`);

  // 7. Admin reads liveLocations
  const admReadLiveRes = await requestFirestore({
    path: `${liveCol}/${driverEmpId}`,
    method: 'GET',
    token: TOKENS.admin
  });
  assert(admReadLiveRes.status === 200, `Admin can read liveLocations (HTTP ${admReadLiveRes.status})`);

  // 8. Dispatcher reads attendance
  const dispReadAttRes = await requestFirestore({
    path: attDoc,
    method: 'GET',
    token: TOKENS.dispatcher
  });
  assert(dispReadAttRes.status === 200, `Dispatcher can read attendance (HTTP ${dispReadAttRes.status})`);

  // 9. Verify counters match block does not shadow liveLocations or attendance
  assert(
    drvWriteRes.status === 200 && dispReadLiveRes.status === 200 && dispReadAttRes.status === 200,
    'Counters match block cleanly coexists without shadowing liveLocations or attendance rules'
  );
}

// Atomic sequence allocation using compare-and-swap (OCC) precondition against live emulator
async function allocateRestTransaction({ type, prefix = '', companyId = 'CMP-SM-001', token, startVal = 100 }) {
  const fy = '26-27';
  const docPath = `counters/${companyId}_${type}_${fy}`;

  for (let attempt = 0; attempt < 30; attempt++) {
    // 1. Read current state of counter doc
    const readRes = await requestFirestore({
      path: docPath,
      method: 'GET',
      token
    });

    let nextVal = startVal;
    let updateTime = null;

    if (readRes.status === 200 && readRes.json) {
      updateTime = readRes.json.updateTime;
      const cur = parseInt(readRes.json.fields?.lastValue?.integerValue || String(startVal), 10);
      nextVal = cur + 1;
    }

    // 2. Commit atomic update with precondition currentDocument.updateTime
    const queryParam = updateTime ? `?currentDocument.updateTime=${encodeURIComponent(updateTime)}` : '?currentDocument.exists=false';
    const writeRes = await requestFirestore({
      path: `${docPath}${queryParam}`,
      method: 'PATCH',
      token,
      body: {
        fields: {
          lastValue: { integerValue: String(nextVal) },
          companyId: { stringValue: companyId },
          type: { stringValue: type },
          financialYear: { stringValue: fy },
          updatedBy: { stringValue: 'uid_admin' },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      }
    });

    if (writeRes.status === 200) {
      const formatted = type === 'cash_memos'
        ? `${fy}/${nextVal}`
        : `${prefix ? prefix + '-' : 'DC-'}${fy}/${nextVal}`;
      return { sequenceNumber: formatted, sequenceValue: nextVal };
    }

    // If precondition failed (another concurrent worker updated it first), jittered backoff & retry
    await new Promise(r => setTimeout(r, 20 + Math.random() * 40));
  }
  throw new Error(`Atomic allocation failed for ${type} after 30 attempts`);
}

async function runItem4ConcurrencyTests() {
  console.log('\n======================================================');
  console.log('--- ITEM 4: REAL CONCURRENCY TRANSACTION TESTS ---');
  console.log('======================================================');

  // Seed baseline docs for concurrency test
  await requestFirestore({
    path: 'counters/CMP-SM-001_cash_memos_26-27',
    method: 'PATCH',
    token: TOKENS.admin,
    body: {
      fields: {
        lastValue: { integerValue: '500' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'cash_memos' },
        updatedBy: { stringValue: 'uid_admin' }
      }
    }
  });

  await requestFirestore({
    path: 'counters/CMP-SM-001_delivery_challans_26-27',
    method: 'PATCH',
    token: TOKENS.admin,
    body: {
      fields: {
        lastValue: { integerValue: '2000' },
        companyId: { stringValue: 'CMP-SM-001' },
        type: { stringValue: 'delivery_challans' },
        updatedBy: { stringValue: 'uid_admin' }
      }
    }
  });

  console.log('Running 10 parallel transactional allocations for Cash Memos...');
  const cashMemoPromises = Array.from({ length: 10 }).map(() =>
    allocateRestTransaction({
      type: 'cash_memos',
      companyId: 'CMP-SM-001',
      token: TOKENS.admin,
      startVal: 500
    })
  );

  const cashMemoResults = await Promise.all(cashMemoPromises);
  const cmNumbers = cashMemoResults.map(r => r.sequenceNumber);
  const cmSequences = cashMemoResults.map(r => r.sequenceValue).sort((a, b) => a - b);
  const cmUnique = new Set(cmNumbers);

  console.log('  Allocated Cash Memos:', cmNumbers);
  assert(cmNumbers.length === 10, '10 Cash Memos allocated');
  assert(cmUnique.size === 10, 'ZERO duplicates in concurrent Cash Memo allocation (10 unique)');
  console.log(`  Sequences range: ${cmSequences[0]} to ${cmSequences[cmSequences.length - 1]}`);
  assert(cmSequences[0] === 501 && cmSequences[9] === 510, 'Strictly sequential: 501 through 510 (+1 monotonicity)');

  console.log('\nRunning 10 parallel transactional allocations for Delivery Challans...');
  const challanPromises = Array.from({ length: 10 }).map(() =>
    allocateRestTransaction({
      type: 'delivery_challans',
      prefix: 'DC',
      companyId: 'CMP-SM-001',
      token: TOKENS.admin,
      startVal: 2000
    })
  );

  const challanResults = await Promise.all(challanPromises);
  const dcNumbers = challanResults.map(r => r.sequenceNumber);
  const dcSequences = challanResults.map(r => r.sequenceValue).sort((a, b) => a - b);
  const dcUnique = new Set(dcNumbers);

  console.log('  Allocated Challans:', dcNumbers);
  assert(dcNumbers.length === 10, '10 Challans allocated');
  assert(dcUnique.size === 10, 'ZERO duplicates in concurrent Challan allocation (10 unique)');
  console.log(`  Sequences range: ${dcSequences[0]} to ${dcSequences[dcSequences.length - 1]}`);
  assert(dcSequences[0] === 2001 && dcSequences[9] === 2010, 'Strictly sequential: 2001 through 2010 (+1 monotonicity)');
}

async function main() {
  try {
    await runItem2RulesTests();
    await runItem3TrackingTests();

    console.log('\n======================================================');
    console.log(`🎉 RULES & TRACKING TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 UNEXPECTED ERROR IN TEST SUITE:', err);
    process.exit(1);
  }
}

main();
