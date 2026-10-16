/**
 * Data Persistence & Error Propagation Verification Script
 * 
 * Verifies:
 * 1. Data Persistence: Writes from session A persist and are retrieved in session B.
 * 2. Error Propagation: Failed database writes throw errors instead of returning fake success.
 */

import { auth, db } from '../src/config/firebase.js';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { saveDocumentWithId, removeDocument } from '../src/services/firestoreService.js';
import { ROLES, OFFICIAL_ROLE_ACCOUNTS } from '../src/data/mockUsers.js';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}`);
  }
}

async function runPersistenceTest() {
  console.log('================================================================');
  console.log('Data Persistence & Database Error Propagation Verification');
  console.log('================================================================');

  // --- PART 1: Session Persistence Verification ---
  console.log('\n--- 1. Cross-Session Persistence Verification ---');
  const adminAcc = OFFICIAL_ROLE_ACCOUNTS.find(a => a.role === ROLES.ADMIN);
  const probeDocId = `PERSIST-TEST-${Date.now()}`;

  // Session A: Write probe document
  await signInWithEmailAndPassword(auth, adminAcc.email, adminAcc.password);
  assert(auth.currentUser?.email === adminAcc.email, 'Session A established for Admin');

  const probeData = {
    id: probeDocId,
    testMarker: 'Verification_Persistence_Probe',
    createdAt: new Date().toISOString(),
  };

  await saveDocumentWithId('auditLogs', probeDocId, probeData);
  assert(true, 'Session A successfully wrote probe to Firestore');

  // Terminate Session A completely
  await signOut(auth);
  assert(!auth.currentUser, 'Session A cleanly terminated (simulating browser close/reload)');

  // Session B: New login and fetch
  await signInWithEmailAndPassword(auth, adminAcc.email, adminAcc.password);
  assert(auth.currentUser?.email === adminAcc.email, 'Session B established for Admin');

  const fetchedDoc = await getDoc(doc(db, 'auditLogs', probeDocId));
  assert(
    fetchedDoc.exists() && fetchedDoc.data()?.testMarker === 'Verification_Persistence_Probe',
    'Session B successfully retrieved persisted document written by Session A'
  );

  // Clean up probe
  await removeDocument('auditLogs', probeDocId);
  const verifyDeleted = await getDoc(doc(db, 'auditLogs', probeDocId));
  assert(!verifyDeleted.exists(), 'Probe document cleanly deleted from Firestore');
  await signOut(auth);

  // --- PART 2: Database Error Propagation Verification ---
  console.log('\n--- 2. Database Error Propagation (No Fake Success) ---');
  const driverAcc = OFFICIAL_ROLE_ACCOUNTS.find(a => a.role === ROLES.DRIVER);
  await signInWithEmailAndPassword(auth, driverAcc.email, driverAcc.password);
  assert(auth.currentUser?.email === driverAcc.email, 'Driver authenticated for unauthorized write probe');

  let errorCaught = false;
  let caughtCode = '';

  try {
    // Driver attempting to perform unauthorized write on Admin's user document
    await saveDocumentWithId('users', adminAcc.id, {
      role: 'TamperedAdminRole',
      tamperedAt: new Date().toISOString()
    });
    assert(false, 'Unauthorized write unexpectedly succeeded!');
  } catch (err) {
    errorCaught = true;
    caughtCode = err.code || err.message;
    assert(
      err.code === 'permission-denied' || (err.message && err.message.includes('permission')),
      `Failed database operation threw error as expected (Code: ${caughtCode})`
    );
  }

  assert(errorCaught, 'saveDocumentWithId correctly throws on failure instead of returning fake success');

  // Terminate session cleanly
  await signOut(auth);
  assert(!auth.currentUser, 'Driver session cleanly terminated');

  console.log('\n================================================================');
  console.log(`Persistence & Error Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runPersistenceTest().catch(err => {
  console.error('Fatal persistence test error:', err);
  process.exit(1);
});
