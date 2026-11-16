/**
 * Counter Seed Script (Dry-Run by Default)
 * Scans existing Cash Memos, Delivery Challans, and Batch Sheets.
 * 
 * Production-Readiness Rules:
 * 1. Flags and ignores wizard-generated timestamp numbers (Date.now() suffix, > 6 digits) so they do NOT inflate the counter.
 * 2. Detects and reports existing duplicate bill or challan numbers.
 * 3. Measures blob document size and item counts against Firestore's 1 MiB hard limit (Item 8 audit).
 * 4. Dry-run mode by default; commits zero database writes unless --execute is passed.
 *
 * Usage:
 *   node scripts/seed-counters.mjs              # Dry-run analysis (no writes)
 *   node scripts/seed-counters.mjs --execute    # Commits seed to Firestore
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyArzrvlIIXYiafzurcD0GGPlbMagqgAk6w',
  authDomain: 'smconcretech-2149c.firebaseapp.com',
  projectId: 'smconcretech-2149c',
  storageBucket: 'smconcretech-2149c.firebasestorage.app',
  messagingSenderId: '658193047633',
  appId: '1:658193047633:web:41155562d9a2373bdfd870'
};

const isExecute = process.argv.includes('--execute');
const defaultCompanyId = 'sm-concretech';
const defaultFinancialYear = '25-26';
const FIRESTORE_DOC_LIMIT_BYTES = 1048576; // 1 MiB

console.log(`\n======================================================================`);
console.log(`  RMC Counter Seeding & Blob Sizing Utility [${isExecute ? 'EXECUTE MODE' : 'DRY RUN'}]`);
console.log(`======================================================================\n`);

async function seed() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, 'smconcretech@gmail.com', 'sm1234');
    console.log(`🔐 Authenticated as Admin (${auth.currentUser.email})\n`);
  } catch (authErr) {
    console.warn(`⚠️ Auth notice: Could not authenticate (${authErr.message}). Continuing with unauthenticated / offline rules.\n`);
  }

  const syncCol = `plantSync_${defaultCompanyId}`;

  // 1. Inspect existing cash memos
  console.log(`🔍 1. Inspecting Cash Memos: ${syncCol}/cloud_billing_bills ...`);
  const billsRef = doc(db, syncCol, 'cloud_billing_bills');
  let maxBillNum = 115; // baseline starting value
  const billNoMap = new Map();
  const flaggedWizardBills = [];
  let billsBlobBytes = 0;
  let totalBillsCount = 0;

  try {
    const snap = await getDoc(billsRef);
    if (snap.exists()) {
      const data = snap.data();
      const rawJson = JSON.stringify(data);
      billsBlobBytes = Buffer.byteLength(rawJson, 'utf8');
      const items = data.items || [];
      totalBillsCount = items.length;
      console.log(`   Found ${totalBillsCount} bills in blob document.`);
      console.log(`   Blob Size: ${billsBlobBytes.toLocaleString()} bytes (${(billsBlobBytes / 1024).toFixed(2)} KB) - ${((billsBlobBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100).toFixed(2)}% of 1 MiB limit.`);

      items.forEach((b) => {
        const rawNo = String(b.billNo || '').trim();
        if (!rawNo) return;

        // Duplicate tracking
        billNoMap.set(rawNo, (billNoMap.get(rawNo) || 0) + 1);

        // Sequence number parsing
        const match = rawNo.match(/\/(\d+)$/);
        if (match) {
          const numStr = match[1];
          // Check for wizard timestamp (Date.now() suffix >= 10 digits)
          if (numStr.length >= 10 || parseInt(numStr, 10) > 999999) {
            flaggedWizardBills.push(rawNo);
          } else {
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxBillNum) maxBillNum = num;
          }
        }
      });
    } else {
      console.log(`   No existing bills document found in Firestore. Using baseline ${maxBillNum}.`);
    }
  } catch (e) {
    console.warn(`   Could not fetch bills from Firestore (${e.message}). Using baseline ${maxBillNum}.`);
  }

  // Report flagged wizard numbers for cash memos
  if (flaggedWizardBills.length > 0) {
    console.log(`   ⚠️ FLAGGED ${flaggedWizardBills.length} wizard timestamp bill(s) (ignored from counter inflation):`);
    flaggedWizardBills.slice(0, 5).forEach(f => console.log(`      - ${f}`));
    if (flaggedWizardBills.length > 5) console.log(`      ... and ${flaggedWizardBills.length - 5} more.`);
  } else {
    console.log(`   ✅ No wizard timestamp numbers detected in cash memos.`);
  }

  // Report duplicate bills
  const dupBills = Array.from(billNoMap.entries()).filter(([_, count]) => count > 1);
  if (dupBills.length > 0) {
    console.log(`   ⚠️ DUPLICATE BILL NUMBERS DETECTED:`);
    dupBills.forEach(([no, count]) => console.log(`      - "${no}": appears ${count} times`));
  } else {
    console.log(`   ✅ Zero duplicate bill numbers found.`);
  }

  console.log(`   👉 Computed Safe Max Cash Memo Counter: ${maxBillNum}`);

  // 2. Inspect existing delivery challans
  console.log(`\n🔍 2. Inspecting Delivery Challans: ${syncCol}/cloud_delivery_challans ...`);
  const challanRef = doc(db, syncCol, 'cloud_delivery_challans');
  let maxChallanDc = 1421;
  let maxChallanNbc = 101;
  const challanNoMap = new Map();
  const flaggedWizardChallans = [];
  let challansBlobBytes = 0;
  let totalChallansCount = 0;

  try {
    const snap = await getDoc(challanRef);
    if (snap.exists()) {
      const data = snap.data();
      const rawJson = JSON.stringify(data);
      challansBlobBytes = Buffer.byteLength(rawJson, 'utf8');
      const items = data.items || [];
      totalChallansCount = items.length;
      console.log(`   Found ${totalChallansCount} challans in blob document.`);
      console.log(`   Blob Size: ${challansBlobBytes.toLocaleString()} bytes (${(challansBlobBytes / 1024).toFixed(2)} KB) - ${((challansBlobBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100).toFixed(2)}% of 1 MiB limit.`);

      items.forEach((c) => {
        const rawNo = String(c.challanNo || '').trim();
        if (!rawNo) return;

        // Duplicate tracking
        challanNoMap.set(rawNo, (challanNoMap.get(rawNo) || 0) + 1);

        const match = rawNo.match(/\/(\d+)$/);
        if (match) {
          const numStr = match[1];
          if (numStr.length >= 10 || parseInt(numStr, 10) > 999999) {
            flaggedWizardChallans.push(rawNo);
          } else {
            const num = parseInt(numStr, 10);
            if (!isNaN(num)) {
              if (rawNo.startsWith('NBC') && num > maxChallanNbc) maxChallanNbc = num;
              else if (num > maxChallanDc) maxChallanDc = num;
            }
          }
        }
      });
    } else {
      console.log(`   No existing challan document found in Firestore. Using baseline.`);
    }
  } catch (e) {
    console.warn(`   Could not fetch challans from Firestore (${e.message}). Using baseline.`);
  }

  // Report flagged wizard challans
  if (flaggedWizardChallans.length > 0) {
    console.log(`   ⚠️ FLAGGED ${flaggedWizardChallans.length} wizard timestamp challan(s) (ignored from counter inflation):`);
    flaggedWizardChallans.slice(0, 5).forEach(f => console.log(`      - ${f}`));
    if (flaggedWizardChallans.length > 5) console.log(`      ... and ${flaggedWizardChallans.length - 5} more.`);
  } else {
    console.log(`   ✅ No wizard timestamp numbers detected in delivery challans.`);
  }

  // Report duplicate challans
  const dupChallans = Array.from(challanNoMap.entries()).filter(([_, count]) => count > 1);
  if (dupChallans.length > 0) {
    console.log(`   ⚠️ DUPLICATE CHALLAN NUMBERS DETECTED:`);
    dupChallans.forEach(([no, count]) => console.log(`      - "${no}": appears ${count} times`));
  } else {
    console.log(`   ✅ Zero duplicate challan numbers found.`);
  }

  console.log(`   👉 Computed Safe Max Billable Challan (DC): ${maxChallanDc}`);
  console.log(`   👉 Computed Safe Max Non-Bill Challan (NBC): ${maxChallanNbc}`);

  // 3. Inspect batching sheets
  console.log(`\n🔍 3. Inspecting Batching Sheets: ${syncCol}/cloud_batching_sheets ...`);
  const sheetsRef = doc(db, syncCol, 'cloud_batching_sheets');
  let totalSheetsCount = 0;
  let sheetsBlobBytes = 0;

  try {
    const snap = await getDoc(sheetsRef);
    if (snap.exists()) {
      const data = snap.data();
      const rawJson = JSON.stringify(data);
      sheetsBlobBytes = Buffer.byteLength(rawJson, 'utf8');
      totalSheetsCount = (data.items || []).length;
      console.log(`   Found ${totalSheetsCount} batch sheets in blob document.`);
      console.log(`   Blob Size: ${sheetsBlobBytes.toLocaleString()} bytes (${(sheetsBlobBytes / 1024).toFixed(2)} KB) - ${((sheetsBlobBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100).toFixed(2)}% of 1 MiB limit.`);
    } else {
      console.log(`   No existing batch sheets document found.`);
    }
  } catch (e) {
    console.warn(`   Could not fetch batch sheets (${e.message}).`);
  }

  // Target counters configuration
  const targets = [
    {
      counterId: `${defaultCompanyId}_cash_memos_${defaultFinancialYear}`,
      type: 'cash_memos',
      lastValue: maxBillNum,
    },
    {
      counterId: `${defaultCompanyId}_delivery_challans_${defaultFinancialYear}`,
      type: 'delivery_challans',
      lastValue: maxChallanDc,
    },
    {
      counterId: `${defaultCompanyId}_nonbill_challans_${defaultFinancialYear}`,
      type: 'nonbill_challans',
      lastValue: maxChallanNbc,
    },
  ];

  console.log(`\n📋 Target Counter Documents to Seed:`);
  targets.forEach((t) => {
    console.log(`   - counters/${t.counterId} -> lastValue: ${t.lastValue}`);
  });

  console.log(`\n======================================================================`);
  console.log(`📊 BLOB CAPACITY AUDIT SUMMARY (Item 8):`);
  console.log(`   - Bills:         ${totalBillsCount.toString().padStart(4)} items | ${(billsBlobBytes / 1024).toFixed(1).padStart(7)} KB (${((billsBlobBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100).toFixed(1)}% of 1MB)`);
  console.log(`   - Challans:      ${totalChallansCount.toString().padStart(4)} items | ${(challansBlobBytes / 1024).toFixed(1).padStart(7)} KB (${((challansBlobBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100).toFixed(1)}% of 1MB)`);
  console.log(`   - Batch Sheets:  ${totalSheetsCount.toString().padStart(4)} items | ${(sheetsBlobBytes / 1024).toFixed(1).padStart(7)} KB (${((sheetsBlobBytes / FIRESTORE_DOC_LIMIT_BYTES) * 100).toFixed(1)}% of 1MB)`);
  console.log(`======================================================================\n`);

  if (!isExecute) {
    console.log(`[DRY RUN COMPLETE] Zero database writes performed.`);
    console.log(`To apply these seed values to Firestore when ready, run:\n   node scripts/seed-counters.mjs --execute\n`);
    process.exit(0);
  }

  console.log(`\n⚡ Committing seed documents to Firestore...`);
  for (const t of targets) {
    const ref = doc(db, 'counters', t.counterId);
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const current = existingSnap.data()?.lastValue;
      if (current >= t.lastValue) {
        console.log(`   ⏭️ counters/${t.counterId} already exists with higher/equal lastValue (${current}). Skipping.`);
        continue;
      }
    }
    await setDoc(ref, {
      companyId: defaultCompanyId,
      type: t.type,
      financialYear: defaultFinancialYear,
      lastValue: t.lastValue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'seed_script',
      note: 'Initial production-readiness seed to prevent numbering collision',
    }, { merge: true });
    console.log(`   ✅ Seeded counters/${t.counterId} -> ${t.lastValue}`);
  }

  console.log(`\n🎉 Counter seeding complete!\n`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Counter seed error:', err);
  process.exit(1);
});
