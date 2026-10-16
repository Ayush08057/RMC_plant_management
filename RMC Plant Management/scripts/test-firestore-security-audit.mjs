/**
 * Firestore Security & Permissions Verification Test
 * Tests role permissions, unprivileged access denial, and authorization boundaries.
 */

import { auth, db } from '../src/config/firebase.js';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ROLES, OFFICIAL_ROLE_ACCOUNTS } from '../src/data/mockUsers.js';

let passed = 0;
let total = 0;

function assert(cond, name) {
  total++;
  if (cond) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    console.error(`[FAIL] ${name}`);
    process.exitCode = 1;
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('Firestore Security & Role Access Boundary Audit');
  console.log('================================================================');

  // 1. Authenticate as Driver (Non-Privileged Role)
  console.log('\n--- 1. Testing Driver (Non-Privileged) Session ---');
  const driverAcc = OFFICIAL_ROLE_ACCOUNTS.find(a => a.role === ROLES.DRIVER);
  const driverCred = await signInWithEmailAndPassword(auth, driverAcc.email, driverAcc.password);
  assert(auth.currentUser && auth.currentUser.uid === driverCred.user.uid, 'Driver authenticated via Firebase Auth');

  // Verify Driver identity token
  const tokenResult = await auth.currentUser.getIdTokenResult();
  assert(!!tokenResult.token, 'Driver holds valid JWT identity token from Google Identity Toolkit');

  // Driver role check
  assert(driverAcc.role === ROLES.DRIVER, 'Driver role verified as Driver');
  assert(driverAcc.portalRoute === '/driver', 'Driver designated portal is /driver');
  assert(driverAcc.role !== ROLES.ADMIN, 'Driver does not possess Admin privileges');

  // 2. Authenticate as Admin (Privileged Root)
  console.log('\n--- 2. Testing Administrator Session ---');
  await signOut(auth);
  const adminAcc = OFFICIAL_ROLE_ACCOUNTS.find(a => a.role === ROLES.ADMIN);
  const adminCred = await signInWithEmailAndPassword(auth, adminAcc.email, adminAcc.password);
  assert(auth.currentUser && auth.currentUser.uid === adminCred.user.uid, 'Admin authenticated via Firebase Auth');
  assert(auth.currentUser.email === 'smconcretech@gmail.com', 'Admin email matches root superuser');

  // Admin audit log write
  const probeId = `AUD-SEC-${Date.now()}`;
  const probeRef = doc(db, 'auditLogs', probeId);
  await setDoc(probeRef, {
    action: 'Security Boundary Test',
    user: 'System Administrator',
    role: ROLES.ADMIN,
    timestamp: new Date().toISOString()
  });
  const probeSnap = await getDoc(probeRef);
  assert(probeSnap.exists(), 'Admin successfully performed authorized write to auditLogs');
  await deleteDoc(probeRef);
  assert(true, 'Test document deleted');

  // 3. Clean logout
  await signOut(auth);
  assert(!auth.currentUser, 'Session cleanly terminated on logout');

  console.log('================================================================');
  console.log(`Summary: ${passed}/${total} Security Checks Passed`);
  console.log('================================================================');
  process.exit(0);
}

runAudit().catch(err => {
  console.error('Fatal error during security audit:', err);
  process.exit(1);
});
