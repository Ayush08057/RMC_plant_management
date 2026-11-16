#!/usr/bin/env node
/**
 * Standalone Firebase Admin Custom Claims Migration Script
 * SM CONCRETECH - RMC Plant Management System
 * 
 * Sets custom claims { role: '<role>', companyId: '<companyId>' } on Firebase Auth accounts
 * derived from the existing Firestore /users directory.
 * 
 * Usage:
 *   node scripts/set-custom-claims.mjs [--dry-run] [--companyId=sm-concretech]
 *   node scripts/set-custom-claims.mjs --commit [--companyId=sm-concretech]
 *   node scripts/set-custom-claims.mjs --commit --uid=<targetUid> --role=Admin
 * 
 * Safety:
 *   - Runs in DRY-RUN mode by default.
 *   - Requires explicit --commit flag to apply claims.
 *   - Supports both Firebase Admin SDK and standard Firebase Auth REST / Emulator APIs.
 */

import http from 'http';
import https from 'https';

const args = process.argv.slice(2);
const isCommit = args.includes('--commit');
const isDryRun = !isCommit || args.includes('--dry-run');

function getArgValue(name, defaultVal = '') {
  const prefix = `--${name}=`;
  const match = args.find((a) => a.startsWith(prefix));
  if (match) return match.slice(prefix.length).trim();
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith('--')) {
    return args[idx + 1].trim();
  }
  return defaultVal;
}

const targetCompanyId = getArgValue('companyId', 'sm-concretech');
const targetUid = getArgValue('uid', '');
const targetRole = getArgValue('role', '');
const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'smconcretech-2149c';

console.log('='.repeat(70));
console.log('  SM CONCRETECH - Firebase Custom Claims Migration Utility');
console.log('='.repeat(70));
console.log(`Mode:       ${isDryRun ? 'DRY-RUN (Safe - No changes written)' : 'LIVE COMMIT (Writing custom claims)'}`);
console.log(`Company ID: ${targetCompanyId}`);
console.log(`Project ID: ${projectId}`);
if (targetUid) console.log(`Target UID: ${targetUid}`);
if (targetRole) console.log(`Target Role: ${targetRole}`);
console.log('-'.repeat(70));

/**
 * Fetch existing users from Firestore REST API
 */
async function fetchFirestoreUsers() {
  const hostParts = firestoreEmulatorHost.split(':');
  const host = hostParts[0];
  const port = parseInt(hostParts[1] || '8080', 10);

  return new Promise((resolve) => {
    const path = `/v1/projects/${projectId}/databases/(default)/documents/users`;
    const req = http.request(
      {
        host,
        port,
        path,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(body);
              const docs = data.documents || [];
              const users = docs.map((doc) => {
                const fields = doc.fields || {};
                const parseVal = (v) => {
                  if (!v) return null;
                  if ('stringValue' in v) return v.stringValue;
                  if ('integerValue' in v) return parseInt(v.integerValue, 10);
                  if ('booleanValue' in v) return v.booleanValue;
                  return null;
                };
                const id = doc.name.split('/').pop();
                return {
                  uid: id,
                  email: parseVal(fields.email) || '',
                  name: parseVal(fields.name) || '',
                  role: parseVal(fields.role) || 'Pending',
                  companyId: parseVal(fields.companyId) || targetCompanyId,
                  isApproved: parseVal(fields.isApproved) ?? false,
                };
              });
              resolve(users);
            } catch (e) {
              console.warn('Could not parse Firestore documents response:', e.message);
              resolve([]);
            }
          } else {
            console.warn(`Firestore GET returned HTTP ${res.statusCode}`);
            resolve([]);
          }
        });
      }
    );
    req.on('error', (err) => {
      console.warn('Could not reach Firestore emulator:', err.message);
      resolve([]);
    });
    req.end();
  });
}

/**
 * Update custom claims on Firebase Auth account via REST endpoint
 */
async function setClaimsRest(uid, claims) {
  const hostParts = authEmulatorHost.split(':');
  const host = hostParts[0];
  const port = parseInt(hostParts[1] || '9099', 10);

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify(claims),
    });

    const req = http.request(
      {
        host,
        port,
        path: `/identitytoolkit.googleapis.com/v1/accounts:update`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );
    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function run() {
  let admin = null;
  try {
    admin = await import('firebase-admin');
    if (admin.default) admin = admin.default;
  } catch {
    // Admin SDK not installed in client bundle; fallback to REST endpoints
  }

  let users = [];

  if (targetUid) {
    users = [
      {
        uid: targetUid,
        email: `${targetUid}@smconcretech.com`,
        role: targetRole || 'Admin',
        companyId: targetCompanyId,
        isApproved: true,
      },
    ];
  } else {
    users = await fetchFirestoreUsers();
    if (users.length === 0) {
      console.log('No user profiles retrieved from Firestore emulator /users.');
      console.log('Using standard official system accounts for migration reference:');
      users = [
        { uid: 'admin_smconcretech', email: 'smconcretech@gmail.com', role: 'Admin', companyId: 'sm-concretech' },
        { uid: 'manager_plant', email: 'manager@smconcretech.com', role: 'Plant Manager', companyId: 'sm-concretech' },
        { uid: 'accountant_office', email: 'accountant@smconcretech.com', role: 'Accountant', companyId: 'sm-concretech' },
        { uid: 'dispatcher_plant', email: 'dispatcher@smconcretech.com', role: 'Dispatcher', companyId: 'sm-concretech' },
        { uid: 'driver_fleet', email: 'driver@smconcretech.com', role: 'Driver', companyId: 'sm-concretech' },
      ];
    }
  }

  console.log(`Found ${users.length} user record(s) to process.\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const u of users) {
    const claims = {
      role: targetRole && u.uid === targetUid ? targetRole : u.role,
      companyId: u.companyId || targetCompanyId,
    };

    const userInfo = `User: ${u.email || u.uid} (${u.uid}) -> Role: [${claims.role}] Company: [${claims.companyId}]`;

    if (isDryRun) {
      console.log(`[DRY RUN] ${userInfo}`);
      skipCount++;
    } else {
      try {
        if (admin && admin.auth) {
          await admin.auth().setCustomUserClaims(u.uid, claims);
        } else {
          await setClaimsRest(u.uid, claims);
        }
        console.log(`[COMMITTED] ${userInfo}`);
        successCount++;
      } catch (err) {
        console.error(`[ERROR]     ${userInfo} - ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Migration Summary:');
  console.log(`  Total Users Processed: ${users.length}`);
  console.log(`  Committed:             ${successCount}`);
  console.log(`  Dry-Run (Simulated):   ${skipCount}`);
  console.log(`  Errors:                ${errorCount}`);
  console.log('='.repeat(70));

  if (isDryRun) {
    console.log('\nTo execute changes for real, re-run with:');
    console.log('  node scripts/set-custom-claims.mjs --commit\n');
  }
}

run().catch((err) => {
  console.error('Fatal error running migration:', err);
  process.exit(1);
});
