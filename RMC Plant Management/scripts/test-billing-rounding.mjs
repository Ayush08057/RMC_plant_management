import { roundCurrency, normalizeBill } from '../src/utils/billingPayments.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('🧪 Running Item 8: Currency Rounding & Precision Tests...\n');

// 1. Float drift case: 14250.000000000002
assert(roundCurrency(14250.000000000002) === 14250, '14250.000000000002 rounds to 14250');

// 2. Half-up rounding case: 1.005 -> 1.01
assert(roundCurrency(1.005) === 1.01, '1.005 half-up rounds to 1.01');
assert(roundCurrency(1.004) === 1.00, '1.004 rounds down to 1.00');

// 3. Large sums
assert(roundCurrency(99999999.994) === 99999999.99, 'Large sum rounds 2 decimals correctly');
assert(roundCurrency(99999999.995) === 100000000.00, 'Large sum rounds up to 100,000,000');

// 4. Zero balance and micro-remainders
assert(roundCurrency(0) === 0, 'Zero returns 0');
assert(roundCurrency(0.00000000000001) === 0, 'Micro epsilon 1e-14 rounds to 0');
assert(roundCurrency(-0.00000000000001) === 0, 'Negative micro epsilon rounds to 0');

// 5. normalizeBill integration tests with floating subtractions
const bill1 = normalizeBill({
  finalAmount: 14250.000000000002,
  paidAmount: 14250,
  payments: []
});
assert(bill1.finalAmount === 14250, 'normalizeBill sets finalAmount to clean 14250');
assert(bill1.balanceAmount === 0, 'normalizeBill eliminates float residual to 0 balance');
assert(bill1.paymentStatus === 'Paid', 'normalizeBill correctly marks Paid for zero balance');

// 6. Partial payment with float drift
const bill2 = normalizeBill({
  finalAmount: 100.00,
  payments: [
    { amount: 33.333, mode: 'Online' },
    { amount: 33.333, mode: 'Cash' },
  ]
});
assert(bill2.paidAmount === 66.67, 'normalizeBill sums payments to 66.67');
assert(bill2.balanceAmount === 33.33, 'normalizeBill balance is exactly 33.33');
assert(bill2.paymentStatus === 'Partially Paid', 'normalizeBill status is Partially Paid');

console.log('\n🎉 ALL ITEM 8 ROUNDING TESTS PASSED SUCCESSFULLY!\n');
