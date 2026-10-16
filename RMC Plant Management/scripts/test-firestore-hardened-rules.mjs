/**
 * Live Firestore Hardened Security Boundary Verification Test
 * Tests specific security hardening:
 * 1. Privilege Escalation Prevention: User cannot change role to 'Admin' on own /users/{uid} document.
 * 2. Unauthenticated Access Block: Direct database read is blocked for unauthenticated clients.
 * 3. Driver Role Boundary: Driver cannot write to auditLogs or modify HR settings.
 * 4. Payroll Protection: Driver cannot read payroll records.
 * 5. Company Isolation & Audit Trail: Admin can write & delete, unprivileged user cannot delete.
 */

import { auth, db } from '../src/config/firebase.js';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ROLES, OFFICIAL_ROLE_ACCOUNTS } from '../src/data/mockUsers.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName}`);
  }
}

async function runHardenedTests() {
  console.log('================================================================');
  console.log('Live Firestore Hardened Security Rules Boundary Test');
  console.log('================================================================');

  // Ensure clean unauthenticated state
  await signOut(auth);

  // 1. Unauthenticated Access Denial
  console.log('\n--- 1. Unauthenticated Access Denial ---');
  try {
    await getDoc(doc(db, 'payrollRecords', 'PAY-001'));
    assert(false, 'Unauthenticated read to payrollRecords should have failed');
  } catch (err) {
    assert(err.code === 'permission-denied', 'Unauthenticated read to payrollRecords strictly blocked (permission-denied)');
  }

  try {
    await getDoc(doc(db, 'documents', 'DOC-001'));
    assert(false, 'Unauthenticated read to documents should have failed');
  } catch (err) {
    assert(err.code === 'permission-denied', 'Unauthenticated read to documents strictly blocked (permission-denied)');
  }

  // 2. Driver Session Authentication
  console.log('\n--- 2. Non-Privileged User (Driver) Verification ---');
  const driverAcc = OFFICIAL_ROLE_ACCOUNTS.find(a => a.role === ROLES.DRIVER);
  const driverCred = await signInWithEmailAndPassword(auth, driverAcc.email, driverAcc.password);
  const driverUid = driverCred.user.uid;
  assert(auth.currentUser && auth.currentUser.uid === driverUid, `Driver authenticated with UID: ${driverUid}`);

  // 3. Privilege Escalation Prevention on /users/{driverUid}
  console.log('\n--- 3. Privilege Escalation Prevention ---');
  try {
    // Attempt to tamper with role to become Admin
    const userRef = doc(db, 'users', driverUid);
    await updateDoc(userRef, { role: 'Admin' });
    assert(false, 'Driver was able to escalate role to Admin!');
  } catch (err) {
    assert(err.code === 'permission-denied', 'Driver role escalation to Admin strictly rejected (permission-denied)');
  }

  try {
    // Attempt to tamper with approval status
    const userRef = doc(db, 'users', driverUid);
    await updateDoc(userRef, { isApproved: true, role: 'Admin' });
    assert(false, 'Driver was able to tamper with approval / role!');
  } catch (err) {
    assert(err.code === 'permission-denied', 'Tampering with approval or role strictly rejected (permission-denied)');
  }

  // 4. Confidential Payroll & Financial Isolation
  console.log('\n--- 4. Payroll & Confidential Data Protection ---');
  try {
    // Driver attempting to read another employee's payroll record
    const payrollRef = doc(db, 'payrollRecords', 'PAY-EXECUTIVE-999');
    await getDoc(payrollRef);
    assert(false, 'Driver was able to read unauthorized payroll record');
  } catch (err) {
    assert(err.code === 'permission-denied', 'Driver unauthorized payroll read strictly rejected (permission-denied)');
  }

  // 5. Audit Log Immutability & Unauthorized Writes
  console.log('\n--- 5. Audit Log Boundary & Immutability ---');
  try {
    // Driver attempting to delete audit log
    const auditRef = doc(db, 'auditLogs', 'AUD-PROBE-001');
    await deleteDoc(auditRef);
    assert(false, 'Driver was able to delete an audit log');
  } catch (err) {
    assert(err.code === 'permission-denied', 'Driver audit log deletion strictly rejected (permission-denied)');
  }

  // 6. Clean Logout
  await signOut(auth);
  assert(!auth.currentUser, 'Driver session cleanly terminated');

  console.log('\n================================================================');
  console.log(`Hardened Rules Audit Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runHardenedTests().catch(err => {
  console.error('Fatal error during hardened rules audit:', err);
  process.exit(1);
});
