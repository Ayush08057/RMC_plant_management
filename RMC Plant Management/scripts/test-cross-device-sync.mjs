import assert from 'assert';

console.log('--- STARTING CROSS-DEVICE MULTI-DEVICE CLOUD SYNC TEST ---');

async function runTest() {
  const { auth, db } = await import('../src/config/firebase.js');
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const { doc, getDoc, setDoc } = await import('firebase/firestore');

  // Authenticate as Admin
  console.log('Step 1: Authenticating test harness with Firebase Auth...');
  await signInWithEmailAndPassword(auth, 'smconcretech@gmail.com', 'sm1234');
  console.log('✓ [PASS] Authenticated successfully');

  const { pushCloudStore, subscribeCloudStore, getSyncCollectionName } = await import('../src/services/cloudSyncService.js');
  const syncCol = getSyncCollectionName();
  console.log(`Step 2: Scoped sync collection identified: ${syncCol}`);

  // Simulation: Device 1 creates a new bill with ₹25,000 payment
  console.log('\n--- SCENARIO A: Device 1 creates bill & payment ---');
  const sampleBills = [
    {
      id: 'BILL-SYNC-TEST-001',
      billNo: 'CM-25-26/999',
      customerName: 'Multi-Device Test Customer',
      siteName: 'Cross-Device Construction Site',
      totalAmount: 50000,
      paidAmount: 25000,
      cashPaidAmount: 25000,
      onlinePaidAmount: 0,
      balanceDue: 25000,
      status: 'Partially Paid',
      payments: [
        {
          id: 'PMT-001',
          date: '19-Oct-2026',
          amount: 25000,
          mode: 'Cash',
          status: 'Confirmed'
        }
      ]
    }
  ];

  console.log('Device 1 saving bill to cloud store...');
  await pushCloudStore('test_sync_bills', 'local_bills_key', sampleBills);
  console.log('✓ [PASS] Device 1 pushed bill to Cloud Firestore');

  // Simulation: Device 2 connects with empty local storage and subscribes
  console.log('\n--- SCENARIO B: Device 2 opens on new phone / computer ---');
  let device2ReceivedBills = null;
  const unsub = subscribeCloudStore('test_sync_bills', 'local_device2_key', [], (items) => {
    device2ReceivedBills = items;
  });

  // Wait for sync propagation
  await new Promise(r => setTimeout(r, 2500));

  assert(Array.isArray(device2ReceivedBills), 'Device 2 should receive bills array from Cloud Firestore');
  assert(device2ReceivedBills.length > 0, 'Device 2 should have at least 1 bill');
  const d2Bill = device2ReceivedBills.find(b => b.id === 'BILL-SYNC-TEST-001');
  assert(d2Bill, 'Device 2 must have the exact bill created on Device 1');
  assert.strictEqual(d2Bill.totalAmount, 50000, 'Device 2 bill total must be 50,000');
  assert.strictEqual(d2Bill.paidAmount, 25000, 'Device 2 bill paid amount must be 25,000');
  assert.strictEqual(d2Bill.balanceDue, 25000, 'Device 2 balance due must be 25,000');
  assert.strictEqual(d2Bill.status, 'Partially Paid', 'Device 2 bill status must be Partially Paid');
  assert.strictEqual(d2Bill.payments.length, 1, 'Device 2 bill must contain the payment history record');
  console.log('✓ [PASS] Device 2 received bill from Device 1 with 100% data fidelity:');
  console.log(`   Customer: ${d2Bill.customerName}`);
  console.log(`   Total: ₹${d2Bill.totalAmount} | Paid: ₹${d2Bill.paidAmount} (Cash) | Due: ₹${d2Bill.balanceDue}`);

  // Simulation: Device 1 adds second payment (₹15,000 Online UPI)
  console.log('\n--- SCENARIO C: Device 1 records ₹15,000 Online Payment ---');
  const updatedBills = [
    {
      ...d2Bill,
      paidAmount: 40000,
      onlinePaidAmount: 15000,
      balanceDue: 10000,
      payments: [
        ...d2Bill.payments,
        {
          id: 'PMT-002',
          date: '19-Oct-2026',
          amount: 15000,
          mode: 'Online (UPI)',
          status: 'Confirmed'
        }
      ]
    }
  ];

  await pushCloudStore('test_sync_bills', 'local_bills_key', updatedBills);
  console.log('Device 1 pushed updated payment to Cloud Firestore...');

  // Wait for real-time propagation to Device 2
  await new Promise(r => setTimeout(r, 2000));

  const updatedD2Bill = device2ReceivedBills.find(b => b.id === 'BILL-SYNC-TEST-001');
  assert.strictEqual(updatedD2Bill.paidAmount, 40000, 'Device 2 must reflect real-time updated total paid (40,000)');
  assert.strictEqual(updatedD2Bill.onlinePaidAmount, 15000, 'Device 2 must reflect online payment (15,000)');
  assert.strictEqual(updatedD2Bill.balanceDue, 10000, 'Device 2 must reflect updated balance due (10,000)');
  assert.strictEqual(updatedD2Bill.payments.length, 2, 'Device 2 must have 2 payments in history');
  console.log('✓ [PASS] Device 2 received real-time payment update:');
  console.log(`   Total Paid: ₹${updatedD2Bill.paidAmount} (₹${updatedD2Bill.cashPaidAmount} Cash + ₹${updatedD2Bill.onlinePaidAmount} Online) | Remaining: ₹${updatedD2Bill.balanceDue}`);

  unsub();

  // Clean up test document
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, syncCol, 'test_sync_bills'));
  console.log('\n✓ [PASS] Test cloud document cleanly removed');

  console.log('\n======================================================');
  console.log('🎉 ALL CROSS-DEVICE MULTI-DEVICE SYNC ASSERTIONS PASSED!');
  console.log('======================================================\n');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
