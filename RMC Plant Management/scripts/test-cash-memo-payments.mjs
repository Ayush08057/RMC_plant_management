import { normalizeBill } from '../src/utils/billingPayments.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('🧪 Starting Cash Memo & Billing Payment System Verification...\n');

// TEST 1: Backward Compatibility & Normalization on Legacy Bill
console.log('--- TEST 1: Legacy Bill Normalization ---');
const legacyBill = {
  id: 'BILL-LEGACY-01',
  billNo: '25-26/100',
  customerName: 'Shree Construction',
  finalAmount: 50000,
  createdAt: new Date().toISOString(),
};
const norm1 = normalizeBill(legacyBill);
assert(norm1.finalAmount === 50000, 'Legacy bill final amount is 50,000');
assert(norm1.paidAmount === 0, 'Legacy bill paid amount defaults to 0');
assert(norm1.cashPaidAmount === 0, 'Legacy bill cash paid amount defaults to 0');
assert(norm1.onlinePaidAmount === 0, 'Legacy bill online paid amount defaults to 0');
assert(norm1.balanceAmount === 50000, 'Legacy bill balance due is 50,000');
assert(norm1.paymentStatus === 'Unpaid', 'Legacy bill status is Unpaid');
assert(Array.isArray(norm1.payments) && norm1.payments.length === 0, 'Legacy bill has empty payments array');

// TEST 2: User Scenario - Bill Generated with ₹50,000 & ₹25,000 Manual Cash Paid
console.log('\n--- TEST 2: User Scenario (₹50,000 Memo, ₹25,000 Cash Advance) ---');
const billWithAdvance = normalizeBill({
  id: 'BILL-101',
  billNo: '25-26/115',
  customerName: 'Kulkarni Builders',
  site: 'Tanang Highway Pier',
  finalAmount: 50000,
  payments: [
    {
      id: 'PAY-01',
      date: '19-Oct-2026',
      time: '11:30 AM',
      amount: 25000,
      mode: 'Cash',
      referenceNo: 'Cash-Receipt-001',
      receivedBy: 'Ramesh (Site Supervisor)',
      remarks: 'Advance paid manually on site at delivery',
      createdAt: new Date().toISOString(),
    }
  ]
});

assert(billWithAdvance.finalAmount === 50000, 'Total bill amount is ₹50,000');
assert(billWithAdvance.paidAmount === 25000, 'Total paid amount is ₹25,000');
assert(billWithAdvance.cashPaidAmount === 25000, 'Cash paid amount is ₹25,000');
assert(billWithAdvance.onlinePaidAmount === 0, 'Online paid amount is ₹0');
assert(billWithAdvance.balanceAmount === 25000, 'Remaining balance due is ₹25,000');
assert(billWithAdvance.paymentStatus === 'Partially Paid', 'Payment status is "Partially Paid"');
assert(billWithAdvance.payments.length === 1, 'Exactly 1 payment record in history');

// TEST 3: Customer pays second instalment of ₹15,000 via Online UPI
console.log('\n--- TEST 3: Second Payment via Online UPI (₹15,000) ---');
const payment2 = {
  id: 'PAY-02',
  date: '20-Oct-2026',
  time: '03:15 PM',
  amount: 15000,
  mode: 'Online UPI',
  referenceNo: 'UPI-REF-987654321012',
  receivedBy: 'Accountant',
  remarks: 'GPay transfer from customer mobile',
  createdAt: new Date().toISOString(),
};

const billAfterOnline = normalizeBill({
  ...billWithAdvance,
  payments: [payment2, ...billWithAdvance.payments]
});

assert(billAfterOnline.paidAmount === 40000, 'Paid amount updated to ₹40,000');
assert(billAfterOnline.cashPaidAmount === 25000, 'Cash paid remains ₹25,000');
assert(billAfterOnline.onlinePaidAmount === 15000, 'Online paid is ₹15,000');
assert(billAfterOnline.balanceAmount === 10000, 'Remaining balance due is ₹10,000');
assert(billAfterOnline.paymentStatus === 'Partially Paid', 'Status remains Partially Paid');
assert(billAfterOnline.payments.length === 2, '2 payments in history');

// TEST 4: Customer settles remaining balance ₹10,000 via Cash
console.log('\n--- TEST 4: Final Settlement of ₹10,000 Cash ---');
const payment3 = {
  id: 'PAY-03',
  date: '21-Oct-2026',
  time: '10:00 AM',
  amount: 10000,
  mode: 'Cash',
  referenceNo: 'Cash-Receipt-002',
  receivedBy: 'Shahesh Mane',
  remarks: 'Full balance settled at office',
  createdAt: new Date().toISOString(),
};

const billFullySettled = normalizeBill({
  ...billAfterOnline,
  payments: [payment3, ...billAfterOnline.payments]
});

assert(billFullySettled.paidAmount === 50000, 'Paid amount is full ₹50,000');
assert(billFullySettled.cashPaidAmount === 35000, 'Total cash collected is ₹35,000');
assert(billFullySettled.onlinePaidAmount === 15000, 'Total online collected is ₹15,000');
assert(billFullySettled.balanceAmount === 0, 'Remaining balance due is ₹0');
assert(billFullySettled.paymentStatus === 'Paid', 'Payment status automatically updated to "Paid"');
assert(billFullySettled.payments.length === 3, 'Full history has 3 transaction records');

// TEST 5: Revert / Delete an erroneous payment
console.log('\n--- TEST 5: Voiding / Deleting Payment Record ---');
const billAfterVoid = normalizeBill({
  ...billFullySettled,
  payments: billFullySettled.payments.filter(p => p.id !== 'PAY-03')
});

assert(billAfterVoid.paidAmount === 40000, 'Paid amount restored to ₹40,000 after voiding');
assert(billAfterVoid.balanceAmount === 10000, 'Balance due restored to ₹10,000 after voiding');
assert(billAfterVoid.paymentStatus === 'Partially Paid', 'Status reverted to Partially Paid');
assert(billAfterVoid.payments.length === 2, 'History accurately reflects remaining 2 payments');

console.log('\n🎉 ALL 24 PAYMENT LOGIC & HISTORY ASSERTIONS PASSED SUCCESSFULLY!');
