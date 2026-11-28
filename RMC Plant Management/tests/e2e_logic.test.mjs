import assert from 'node:assert/strict';
import { getLocalIstDateStr, formatToIndian12Hr, parseTimeToMinutes } from '../src/utils/shiftUtils.js';
import { numberToIndianWords } from '../src/utils/numberToWords.js';
import { normalizeBill } from '../src/utils/billingPayments.js';
import { generateSalesTallyXml, generateReceiptsTallyXml, generatePurchasesTallyXml } from '../src/utils/tallyXmlGenerator.js';
import { cleanRawRoutePipeline, calculateAccurateRouteDistanceKm } from '../src/utils/routeCleanUtils.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

// 1. IST Midnight Boundary Tests (12:00 AM - 5:29 AM IST = 18:30 - 23:59 UTC previous day)
test('IST Date at 00:15 AM IST (18:45 UTC prev day) returns IST date', () => {
  const d = new Date('2026-11-24T18:45:00.000Z');
  assert.equal(getLocalIstDateStr(d), '2026-11-25');
});

test('IST Date at 05:29 AM IST (23:59 UTC prev day) returns IST date', () => {
  const d = new Date('2026-11-24T23:59:00.000Z');
  assert.equal(getLocalIstDateStr(d), '2026-11-25');
});

test('IST Date at 11:59 PM IST (18:29 UTC same day) returns IST date', () => {
  const d = new Date('2026-11-25T18:29:00.000Z');
  assert.equal(getLocalIstDateStr(d), '2026-11-25');
});

// 2. Shift & Time Parsing Tests
test('formatToIndian12Hr & parseTimeToMinutes round-trip', () => {
  assert.equal(parseTimeToMinutes('09:30 AM'), 570);
  assert.equal(parseTimeToMinutes('02:15 PM'), 855);
  assert.equal(formatToIndian12Hr('14:15'), '02:15 PM');
});

// 3. Billing & Indian Number to Words
test('numberToIndianWords formats lakhs/crores accurately', () => {
  const words = numberToIndianWords(125500);
  assert.ok(words.toLowerCase().includes('lakh') && words.toLowerCase().includes('twenty'), `Unexpected: ${words}`);
});

test('normalizeBill computes balance and status cleanly without NaN', () => {
  const bill = normalizeBill({
    id: 'BILL-1',
    billNo: 'SM/26-27/001',
    finalAmount: 50000,
    paidAmount: 20000,
  });
  assert.equal(bill.finalAmount, 50000);
  assert.equal(bill.paidAmount, 20000);
  assert.equal(bill.balanceAmount, 30000);
  assert.equal(bill.paymentStatus, 'Partially Paid');
});

// 4. Tally Prime XML Export Tests
test('generateSalesTallyXml produces valid Tally ENVELOPE XML with YYYYMMDD', () => {
  const xml = generateSalesTallyXml([
    {
      billNo: 'SM/26-27/001',
      date: '2026-11-25',
      customerName: 'Apex Infra',
      finalAmount: 59000,
      taxableAmount: 50000,
      cgstAmount: 4500,
      sgstAmount: 4500,
    },
  ], 'SM CONCRETECH');
  assert.ok(xml.includes('<ENVELOPE>') && xml.includes('</ENVELOPE>'));
  assert.ok(xml.includes('20261125'));
  assert.ok(xml.includes('Apex Infra'));
});

test('generateReceiptsTallyXml & generatePurchasesTallyXml produce valid XML', () => {
  const recXml = generateReceiptsTallyXml([
    {
      billNo: 'SM/26-27/001',
      customerName: 'Apex Infra',
      payments: [{ id: 'P1', date: '2026-11-25', amount: 20000, mode: 'NEFT' }],
    },
  ], 'SM CONCRETECH');
  assert.ok(recXml.includes('<VOUCHER') && recXml.includes('20000'));

  const purXml = generatePurchasesTallyXml([
    {
      invoiceNo: 'INV-99',
      date: '2026-11-25',
      supplierName: 'UltraTech Cement Ltd',
      finalAmount: 118000,
    },
  ], 'SM CONCRETECH');
  assert.ok(purXml.includes('<VOUCHER') && purXml.includes('UltraTech Cement Ltd'));
});

// 5. Field Route Cleaning & Distance Integrity Test (~26-27 km overnight shift)
test('cleanRawRoutePipeline preserves full ~26-27 km round-trip distance without collapsing', () => {
  const baseTs = Date.parse('2026-11-25T11:29:00.000Z'); // 04:59 PM IST
  const trail = [
    { lat: 16.8442, lng: 74.6022, category: 'Punch-In Location', ts: baseTs },
    { lat: 16.8465, lng: 74.6080, ts: baseTs + 5 * 60000 },
    { lat: 16.8650, lng: 74.6450, ts: baseTs + 20 * 60000 },
    { lat: 16.8850, lng: 74.6950, ts: baseTs + 40 * 60000 },
    { lat: 16.8990, lng: 74.7180, ts: baseTs + 55 * 60000 }, // ~13.7 km away from start
    { lat: 16.8850, lng: 74.6950, ts: baseTs + 120 * 60000 },
    { lat: 16.8650, lng: 74.6450, ts: baseTs + 140 * 60000 },
    { lat: 16.8445, lng: 74.6025, category: 'Punch-Out Location', ts: baseTs + 846 * 60000 }, // 07:05 AM IST
  ];
  const cleaned = cleanRawRoutePipeline(trail);
  const km = calculateAccurateRouteDistanceKm(cleaned);
  assert.ok(cleaned.length >= 6, `Expected full trail preserved, got ${cleaned.length}`);
  assert.ok(km >= 25 && km <= 30, `Expected ~26-27 km, got ${km} km`);
});

test('cleanRawRoutePipeline strips false mid-route bounce-back spike instead of doubling km', () => {
  const baseTs = Date.parse('2026-11-26T05:11:00.000Z'); // 10:41 AM IST
  const trail = [
    { lat: 16.8442, lng: 74.6022, category: 'Punch-In Location', ts: baseTs }, // Sangli IN
    { lat: 16.9200, lng: 74.5900, ts: baseTs + 25 * 60000 }, // Budhgaon/Nandani
    { lat: 17.0100, lng: 74.5850, ts: baseTs + 50 * 60000 }, // Vasagade
    { lat: 16.8442, lng: 74.6022, ts: baseTs + 52 * 60000 }, // Spurious jump back to Sangli IN
    { lat: 17.0480, lng: 74.5800, category: 'Punch-Out Location', ts: baseTs + 600 * 60000 }, // Nagaon Nimani OUT
  ];
  const cleaned = cleanRawRoutePipeline(trail);
  const km = calculateAccurateRouteDistanceKm(cleaned);
  assert.equal(cleaned.length, 4, `Expected spurious bounce stripped to 4 stops, got ${cleaned.length}`);
  assert.ok(km >= 20 && km <= 26, `Expected real ~23 km route, got ${km} km`);
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
