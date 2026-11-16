/**
 * Real Concurrency Test against Firestore Emulator (Item 4)
 * Runs 10 parallel transactions for cash memos and 10 for challans
 * Proves zero duplicates and strict +1 monotonicity.
 */

import { db } from '../src/config/firebase.js';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { allocateNextSequenceNumber } from '../src/services/sequenceCounterService.js';

connectFirestoreEmulator(db, '127.0.0.1', 8088);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function main() {
  console.log('======================================================');
  console.log('🧪 ITEM 4: REAL FIRESTORE EMULATOR CONCURRENCY TEST');
  console.log('======================================================\n');

  console.log('Dispatching 10 parallel transactions for Cash Memos (startingValue = 500)...');
  const cmPromises = Array.from({ length: 10 }).map((_, i) =>
    allocateNextSequenceNumber({
      type: 'cash_memos',
      companyId: 'CMP-SM-001',
      startingValue: 500
    })
  );

  const cmResults = await Promise.all(cmPromises);
  const cmNumbers = cmResults.map(r => r.sequenceNumber);
  const cmSequences = cmResults.map(r => r.sequenceValue).sort((a, b) => a - b);
  const cmUnique = new Set(cmNumbers);

  console.log('  Allocated Cash Memos:');
  cmNumbers.forEach((n, idx) => console.log(`    [Worker ${idx + 1}] -> ${n}`));
  
  assert(cmResults.length === 10, 'All 10 parallel requests resolved');
  assert(cmUnique.size === 10, 'ZERO duplicates detected across 10 parallel transactions (10 unique numbers)');
  assert(cmSequences[0] === 500 && cmSequences[9] === 509, 'Strict monotonicity verified: 500 to 509');

  console.log('\nDispatching 10 parallel transactions for Delivery Challans (startingValue = 2000)...');
  const dcPromises = Array.from({ length: 10 }).map((_, i) =>
    allocateNextSequenceNumber({
      type: 'delivery_challans',
      prefix: 'DC',
      companyId: 'CMP-SM-001',
      startingValue: 2000
    })
  );

  const dcResults = await Promise.all(dcPromises);
  const dcNumbers = dcResults.map(r => r.sequenceNumber);
  const dcSequences = dcResults.map(r => r.sequenceValue).sort((a, b) => a - b);
  const dcUnique = new Set(dcNumbers);

  console.log('  Allocated Delivery Challans:');
  dcNumbers.forEach((n, idx) => console.log(`    [Worker ${idx + 1}] -> ${n}`));

  assert(dcResults.length === 10, 'All 10 parallel requests resolved');
  assert(dcUnique.size === 10, 'ZERO duplicates detected across 10 parallel transactions (10 unique numbers)');
  assert(dcSequences[0] === 2000 && dcSequences[9] === 2009, 'Strict monotonicity verified: DC-26-27/2000 to DC-26-27/2009');

  console.log('\n======================================================');
  console.log('🎉 REAL CONCURRENCY TEST COMPLETED WITH 0 DUPLICATES!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('💥 Concurrency test error:', err);
  process.exit(1);
});
