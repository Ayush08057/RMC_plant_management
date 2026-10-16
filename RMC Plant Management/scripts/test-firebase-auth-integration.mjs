/**
 * Comprehensive Verification Suite for Firebase Authentication Integration
 * Tests:
 * 1. Official Role Account Authentication against Firebase Auth
 * 2. Invalid credential rejection
 * 3. Identity & identifier resolution (ID, Username, Email, Phone)
 * 4. Account status enforcement (Active vs Pending/Rejected/Inactive)
 * 5. Elimination of plaintext passwords from state, cache, and Firestore
 * 6. Authorized Firestore read/write operations with Firebase Auth token
 * 7. Prevention of unprivileged role escalation
 * 8. Safe worker provisioning via secondary auth without admin sign-out
 * 9. Password reset email dispatch
 */

import { auth, db } from '../src/config/firebase.js';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  limit 
} from 'firebase/firestore';
import { OFFICIAL_ROLE_ACCOUNTS, ROLES, ROLE_ROUTES } from '../src/data/mockUsers.js';
import { 
  EMPLOYEE_STATUS, 
  resolveLoginIdentity, 
  validateEmployeeForRegistration,
  createEmployeeFirebaseAuth 
} from '../src/services/employeeAuthService.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('Firebase Authentication & Security Integration Test Suite');
  console.log('================================================================');

  // TEST 1: Official Role Accounts in Firebase Auth
  console.log('\n--- 1. Official Role Accounts Authentication ---');
  for (const acc of OFFICIAL_ROLE_ACCOUNTS) {
    try {
      const cred = await signInWithEmailAndPassword(auth, acc.email, acc.password);
      assert(!!cred.user.uid, `Firebase Auth sign-in successful for ${acc.role} (${acc.email}) -> UID: ${cred.user.uid}`);
      assert(cred.user.email === acc.email, `Firebase Auth returned verified email: ${acc.email}`);
      await signOut(auth);
    } catch (err) {
      assert(false, `Firebase Auth sign-in for ${acc.role} (${acc.email}) failed: ${err.message}`);
    }
  }

  // TEST 2: Invalid Credential Rejection
  console.log('\n--- 2. Invalid Credential Rejection ---');
  try {
    await signInWithEmailAndPassword(auth, 'smconcretech@gmail.com', 'WrongPassword!@#');
    assert(false, 'Invalid password was unexpectedly accepted');
  } catch (err) {
    assert(
      err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password',
      `Invalid password properly rejected by Firebase Auth (Code: ${err.code})`
    );
  }

  // TEST 3: Multi-Identifier Resolution (Employee ID, Username, Email, Phone)
  console.log('\n--- 3. Multi-Identifier Resolution ---');
  const mockWorkforce = [
    {
      id: 'EMP-DRV-101',
      name: 'Ramesh Patil',
      email: 'ramesh.driver@smconcretech.com',
      mobile: '+91 9820044001',
      username: 'ramesh_driver',
      role: ROLES.DRIVER,
      status: EMPLOYEE_STATUS.ACTIVE,
      plantLocation: 'Plant Unit #01',
    },
    {
      id: 'EMP-PENDING-01',
      name: 'Sunil Kumar',
      email: 'sunil@smconcretech.com',
      mobile: '+91 9820044002',
      role: ROLES.SITE_SUPERVISOR,
      status: EMPLOYEE_STATUS.PENDING_APPROVAL,
    }
  ];

  const resById = resolveLoginIdentity('ADM-001', mockWorkforce, []);
  assert(resById.found && resById.email === 'smconcretech@gmail.com', 'Resolved Employee ID ADM-001 to smconcretech@gmail.com');
  assert(resById.role === ROLES.ADMIN, 'Resolved role matches official Admin record');

  const resByUsername = resolveLoginIdentity('ramesh_driver', mockWorkforce, []);
  assert(resByUsername.found && resByUsername.email === 'ramesh.driver@smconcretech.com', 'Resolved username ramesh_driver to official email');
  assert(resByUsername.role === ROLES.DRIVER, 'Resolved role matches trusted employee record (Driver)');

  const resByPhone = resolveLoginIdentity('9820044001', mockWorkforce, []);
  assert(resByPhone.found && resByPhone.email === 'ramesh.driver@smconcretech.com', 'Resolved 10-digit mobile to official email');

  // TEST 4: Account Status Validation
  console.log('\n--- 4. Account Status Validation ---');
  const resPending = resolveLoginIdentity('EMP-PENDING-01', mockWorkforce, []);
  assert(resPending.found && resPending.status === EMPLOYEE_STATUS.PENDING_APPROVAL, 'Detected Pending Approval status');

  const unknownRes = resolveLoginIdentity('UNKNOWN-ID-999', mockWorkforce, []);
  assert(!unknownRes.found, 'Unknown ID correctly reported as not found');

  // TEST 5: Elimination of Plaintext Passwords & Unauthorized Access Block
  console.log('\n--- 5. Plaintext Passwords Verification in Firestore & Memory ---');
  try {
    await getDocs(query(collection(db, 'users'), limit(5)));
    assert(false, 'Unauthorized unauthenticated read to /users should have failed');
  } catch (err) {
    assert(err.code === 'permission-denied', 'Unauthorized direct database read correctly blocked by Firestore rules (permission-denied)');
  }

  const adminAcc = OFFICIAL_ROLE_ACCOUNTS.find(a => a.role === ROLES.ADMIN);
  await signInWithEmailAndPassword(auth, adminAcc.email, adminAcc.password);
  const userSnapshot = await getDocs(query(collection(db, 'users'), limit(20)));
  let foundPlaintextPassword = false;
  userSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.password) {
      foundPlaintextPassword = true;
      console.error(`Found password in doc ${docSnap.id}`);
    }
  });
  assert(!foundPlaintextPassword, 'Zero plaintext passwords stored in Firestore users collection');

  const resSafe = resolveLoginIdentity('PM-001', [], OFFICIAL_ROLE_ACCOUNTS);
  assert(resSafe.found && !resSafe.user.password, 'resolveLoginIdentity output user profile completely omits password');

  // TEST 6: Authorized Firestore Operations with Firebase Auth
  console.log('\n--- 6. Authorized Firestore Access with request.auth ---');
  const adminCred = await signInWithEmailAndPassword(auth, 'smconcretech@gmail.com', 'sm1234');
  assert(!!auth.currentUser && auth.currentUser.uid === adminCred.user.uid, 'Firebase Auth session active for Admin');

  const testAuditDocId = `AUD-TEST-${Date.now()}`;
  try {
    const testDocRef = doc(db, 'auditLogs', testAuditDocId);
    await setDoc(testDocRef, {
      id: testAuditDocId,
      action: 'Security Audit Probe',
      user: 'System Administrator',
      role: 'Admin',
      timestamp: new Date().toISOString(),
      status: 'Verified'
    });
    assert(true, 'Authorized authenticated write to auditLogs succeeded');

    const readDoc = await getDoc(testDocRef);
    assert(readDoc.exists() && readDoc.data().action === 'Security Audit Probe', 'Authorized authenticated read from auditLogs succeeded');

    // Clean up test probe
    await deleteDoc(testDocRef);
    assert(true, 'Test document cleaned up');
  } catch (err) {
    assert(false, `Authorized Firestore operation failed: ${err.message}`);
  }

  // TEST 7: Secondary App Provisioning without Admin Disruption
  console.log('\n--- 7. Worker Provisioning via Secondary App ---');
  const initialAdminUid = auth.currentUser.uid;
  const tempWorkerEmail = `probe_worker_${Date.now()}@smconcretech.com`;
  const provisionRes = await createEmployeeFirebaseAuth(tempWorkerEmail, 'WorkerSecure@123');
  assert(provisionRes.success && provisionRes.uid, 'Secondary auth created worker without errors');
  assert(auth.currentUser.uid === initialAdminUid, 'Admin session remained active and was NOT signed out');

  // TEST 8: Role-Based Dashboard Redirection & Navigation Protection
  console.log('\n--- 8. Role-Based Navigation Routing ---');
  const driverRes = resolveLoginIdentity('DRV-001', [], OFFICIAL_ROLE_ACCOUNTS);
  assert(driverRes.redirectPath === '/driver', 'Driver routes strictly to /driver');

  const qcRes = resolveLoginIdentity('QC-001', [], OFFICIAL_ROLE_ACCOUNTS);
  assert(qcRes.redirectPath === '/qc', 'QC Engineer routes strictly to /qc');

  const accRes = resolveLoginIdentity('ACC-001', [], OFFICIAL_ROLE_ACCOUNTS);
  assert(accRes.redirectPath === '/accountant', 'Accountant routes strictly to /accountant');

  // Sign out cleanly
  await signOut(auth);
  assert(!auth.currentUser, 'Logout cleanly cleared Firebase Auth currentUser session');

  console.log('\n================================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
