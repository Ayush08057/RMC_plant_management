/**
 * Silo Inventory Opening Balance Seeder
 * Reads a JSON file of physical opening balances, performs dry-run comparison by default,
 * and writes to /silo_inventory/{companyId} + /silo_logs/opening_stock_{companyId}_{timestamp}
 * when --commit flag is provided.
 *
 * Usage:
 *   node scripts/seed-silo-stock.mjs [path-to-file.json] [--companyId=sm-concretech] [--commit]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'smconcretech-2149c',
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'fake-api-key',
};

const app = initializeApp(firebaseConfig, 'silo-seeder');
const db = getFirestore(app);

// Use local emulator if requested or running locally
const useEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.argv.includes('--emulator');
if (useEmulator) {
  const host = process.env.FIRESTORE_EMULATOR_HOST ? process.env.FIRESTORE_EMULATOR_HOST.split(':')[0] : '127.0.0.1';
  const port = process.env.FIRESTORE_EMULATOR_HOST ? parseInt(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1], 10) : 8088;
  connectFirestoreEmulator(db, host, port);
  console.log(`[SeedSilo] Connected to Firestore Emulator at ${host}:${port}`);
}

const BASELINE_METADATA = {
  cement: { name: 'Cement (OPC 53 Grade)', capacityTons: 100, unit: 'Tons', siloName: 'Cement Silo #01' },
  flyash: { name: 'Fly Ash (Pozzocrete)', capacityTons: 60, unit: 'Tons', siloName: 'Fly Ash Silo #02' },
  agg20: { name: '20mm Coarse Aggregate', capacityTons: 200, unit: 'Tons', siloName: '20mm Agg Bin #01' },
  agg10: { name: '10mm Coarse Aggregate', capacityTons: 150, unit: 'Tons', siloName: '10mm Agg Bin #02' },
  sand: { name: 'Crushed M-Sand (Fine Sand)', capacityTons: 200, unit: 'Tons', siloName: 'Crushed M-Sand Bin' },
  riverSand: { name: 'Natural River Sand', capacityTons: 120, unit: 'Tons', siloName: 'Natural Sand Yard' },
  admixturePce: { name: 'Chemical Admixture (PCE)', capacityLiters: 5000, unit: 'Litres', siloName: 'Admixture Tank #01' },
  retarder: { name: 'Retarder / Plasticizer Chemical', capacityLiters: 3000, unit: 'Litres', siloName: 'Chemical Barrel Yard' },
};

function roundStock(val, decimals = 3) {
  const num = Number(val) || 0;
  return Number(Math.round(Number(`${num}e${decimals}`)) + `e-${decimals}`);
}

async function run() {
  const args = process.argv.slice(2);
  const isCommit = args.includes('--commit');
  const companyArg = args.find(a => a.startsWith('--companyId='));
  const companyId = companyArg ? companyArg.split('=')[1].trim() : 'sm-concretech';

  const fileArg = args.find(a => !a.startsWith('--'));
  const filePath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.resolve(__dirname, 'opening-silo-stock.template.json');

  console.log('\n======================================================');
  console.log('   SILO INVENTORY OPENING BALANCE SEEDER');
  console.log('======================================================');
  console.log(`Company ID : ${companyId}`);
  console.log(`Source File: ${filePath}`);
  console.log(`Mode       : ${isCommit ? '>>> LIVE WRITE (--commit) <<<' : 'DRY RUN (no database changes)'}`);
  console.log('------------------------------------------------------\n');

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File does not exist at ${filePath}`);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(filePath, 'utf8');
  let inputBalances = {};
  try {
    inputBalances = JSON.parse(rawJson);
  } catch (err) {
    console.error(`Error parsing JSON: ${err.message}`);
    process.exit(1);
  }

  // Safety guard: refuse to run if template notice or sample numbers are detected
  if (
    inputBalances._templateNotice ||
    (inputBalances.cement?.stockTons === 85.4 && inputBalances.flyash?.stockTons === 42.0)
  ) {
    console.error('❌ FATAL: Refusing to seed using sample/template values!');
    console.error('Please populate scripts/opening-silo-stock.template.json with verified physical plant counts.');
    process.exit(1);
  }

  // Verify that all required materials have a valid numeric stock count
  const missingMaterials = [];
  for (const key of Object.keys(BASELINE_METADATA)) {
    const entry = inputBalances[key];
    const val = key.includes('admixture') || key === 'retarder' ? entry?.stockLiters : entry?.stockTons;
    if (val === null || val === undefined || typeof val !== 'number' || isNaN(val) || val < 0) {
      missingMaterials.push(key);
    }
  }

  if (missingMaterials.length > 0) {
    console.error(`❌ FATAL: The following materials have missing or null physical stock counts: ${missingMaterials.join(', ')}`);
    console.error('Every material must have a valid non-negative number before seeding opening stock.');
    process.exit(1);
  }

  const siloRef = doc(db, 'silo_inventory', companyId);
  let existingData = {};
  try {
    const snap = await getDoc(siloRef);
    if (snap.exists()) {
      existingData = snap.data();
      console.log(`Found existing silo_inventory document for ${companyId}.`);
    } else {
      console.log(`No existing silo_inventory found for ${companyId}. Initializing fresh.`);
    }
  } catch (err) {
    console.warn(`Could not read remote doc (${err.message}). Proceeding with clean initialization.`);
  }

  const preparedStock = {};
  const deltas = [];

  for (const [key, meta] of Object.entries(BASELINE_METADATA)) {
    const inputEntry = inputBalances[key] || {};
    const existingEntry = existingData[key] || {};

    const isLiquid = key === 'admixturePce' || key === 'retarder';
    const prop = isLiquid ? 'stockLiters' : 'stockTons';
    const capProp = isLiquid ? 'capacityLiters' : 'capacityTons';

    const newStock = inputEntry[prop] !== undefined
      ? roundStock(inputEntry[prop], 3)
      : (existingEntry[prop] !== undefined ? roundStock(existingEntry[prop], 3) : 0);

    const oldStock = existingEntry[prop] !== undefined ? roundStock(existingEntry[prop], 3) : 0;
    const capacity = inputEntry[capProp] || existingEntry[capProp] || meta[capProp];
    const siloName = inputEntry.siloName || existingEntry.siloName || meta.siloName;
    const name = inputEntry.name || existingEntry.name || meta.name;

    preparedStock[key] = {
      name,
      siloName,
      [prop]: newStock,
      [capProp]: capacity,
      unit: meta.unit,
      lastUpdated: new Date().toISOString(),
    };

    deltas.push({
      materialKey: key,
      name,
      siloName,
      unit: meta.unit,
      before: oldStock,
      openingBalance: newStock,
      delta: roundStock(newStock - oldStock, 3),
    });
  }

  preparedStock.companyId = companyId;
  preparedStock.updatedAt = new Date().toISOString();
  preparedStock.updatedBy = 'seeder_script';

  console.log('Proposed Opening Silo Stock:');
  console.table(
    deltas.map(d => ({
      Material: d.name,
      'Silo / Bin': d.siloName,
      'Current DB': `${d.before} ${d.unit}`,
      'New Opening': `${d.openingBalance} ${d.unit}`,
      'Adjustment Delta': `${d.delta >= 0 ? '+' : ''}${d.delta} ${d.unit}`,
    }))
  );

  if (!isCommit) {
    console.log('\n[DRY RUN COMPLETE] Zero database writes performed.');
    console.log('To apply these opening balances to Firestore, run:');
    console.log(`  node scripts/seed-silo-stock.mjs "${filePath}" --companyId=${companyId} --commit\n`);
    process.exit(0);
  }

  const timestamp = Date.now();
  const logId = `opening_stock_${companyId}_${timestamp}`;
  const logRef = doc(db, 'silo_logs', logId);

  const logPayload = {
    logId,
    companyId,
    operation: 'opening_stock',
    referenceId: `OPENING-${timestamp}`,
    deltas,
    isOverride: false,
    authorizedBy: 'Plant Management Physical Audit',
    performedBy: {
      uid: 'seeder_script',
      name: 'Physical Audit Opening Seeder',
      role: 'Admin',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'seeder_script',
  };

  try {
    await setDoc(siloRef, preparedStock, { merge: true });
    await setDoc(logRef, logPayload);
    console.log(`\n✓ SUCCESS: Opening balances committed to /silo_inventory/${companyId}`);
    console.log(`✓ Audit log written to /silo_logs/${logId}\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\nFAILED to commit opening balances: ${err.message}`);
    process.exit(1);
  }
}

run();
