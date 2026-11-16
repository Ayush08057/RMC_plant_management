/**
 * Counter Seed Script (Dry-Run by Default)
 * Scans existing Cash Memos and Delivery Challans in Cloud Firestore (or local JSON backup)
 * Computes the maximum sequential number used to date,
 * and seeds the atomic counter document to prevent number collisions.
 *
 * Usage:
 *   node scripts/seed-counters.mjs              # Dry-run analysis (no writes)
 *   node scripts/seed-counters.mjs --execute    # Commits seed to Firestore
 */

import { initializeApp } from 'firebase/app';
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

console.log(`\n======================================================`);
console.log(`  RMC Counter Seeding Utility [${isExecute ? 'EXECUTE MODE' : 'DRY RUN'}]`);
console.log(`======================================================\n`);

async function seed() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const syncCol = `plantSync_${defaultCompanyId}`;

  // 1. Inspect existing cash memos
  console.log(`🔍 Inspecting ${syncCol}/cloud_billing_bills ...`);
  const billsRef = doc(db, syncCol, 'cloud_billing_bills');
  let maxBillNum = 115; // baseline

  try {
    const snap = await getDoc(billsRef);
    if (snap.exists()) {
      const items = snap.data().items || [];
      console.log(`   Found ${items.length} existing bills in cloud store.`);
      items.forEach((b) => {
        const rawNo = String(b.billNo || '').trim();
        const match = rawNo.match(/\/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxBillNum) maxBillNum = num;
        }
      });
    } else {
      console.log(`   No existing bills document found in Firestore. Using baseline.`);
    }
  } catch (e) {
    console.warn(`   Could not fetch bills from Firestore (${e.message}). Using baseline ${maxBillNum}.`);
  }

  console.log(`   👉 Computed Max Cash Memo Number: ${maxBillNum}`);

  // 2. Inspect existing delivery challans
  console.log(`\n🔍 Inspecting ${syncCol}/cloud_delivery_challans ...`);
  const challanRef = doc(db, syncCol, 'cloud_delivery_challans');
  let maxChallanDc = 1421;
  let maxChallanNbc = 101;

  try {
    const snap = await getDoc(challanRef);
    if (snap.exists()) {
      const items = snap.data().items || [];
      console.log(`   Found ${items.length} existing challans in cloud store.`);
      items.forEach((c) => {
        const rawNo = String(c.challanNo || '').trim();
        const match = rawNo.match(/\/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num)) {
            if (rawNo.startsWith('NBC') && num > maxChallanNbc) maxChallanNbc = num;
            else if (num > maxChallanDc) maxChallanDc = num;
          }
        }
      });
    } else {
      console.log(`   No existing challan document found in Firestore. Using baseline.`);
    }
  } catch (e) {
    console.warn(`   Could not fetch challans from Firestore (${e.message}). Using baseline.`);
  }

  console.log(`   👉 Computed Max Billable Challan (DC): ${maxChallanDc}`);
  console.log(`   👉 Computed Max Non-Bill Challan (NBC): ${maxChallanNbc}`);

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

  if (!isExecute) {
    console.log(`\n[DRY RUN COMPLETE] Zero database writes performed.`);
    console.log(`To apply these seed values to Firestore, run:\n   node scripts/seed-counters.mjs --execute\n`);
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
