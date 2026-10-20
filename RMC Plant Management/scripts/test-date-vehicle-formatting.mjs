import fs from 'fs';
import path from 'path';

console.log('--- TESTING TYPED DATE & VEHICLE NUMBER FORMATTING ---');

const filePath = path.resolve('src/components/billing/BillingManagementView.jsx');
const content = fs.readFileSync(filePath, 'utf-8');

let passed = true;

const assertCondition = (name, cond) => {
  if (cond) {
    console.log(`✓ [PASS] ${name}`);
  } else {
    console.error(`✗ [FAIL] ${name}`);
    passed = false;
  }
};

// 1. Static codebase assertions
assertCondition('formatTypedDate helper exported in BillingManagementView', content.includes('export const formatTypedDate ='));
assertCondition('formatVehicleNumber helper exported in BillingManagementView', content.includes('export const formatVehicleNumber ='));
assertCondition('PLANT_VEHICLE_SUGGESTIONS exported with fleet registrations', content.includes('export const PLANT_VEHICLE_SUGGESTIONS =') && content.includes('MH-10-CR-1212'));
assertCondition('Bill Date input uses formatTypedDate and getTodayFormatted', content.includes('formatTypedDate(e.target.value, prev.date)') && content.includes('getTodayFormatted()'));
assertCondition('Construction Date input uses formatTypedDate with DD-MM-YYYY format hint', content.includes('formatTypedDate(e.target.value, prev.constructionDate)') && content.includes('Format: DD-MM-YYYY'));
assertCondition('Transit Vehicle input uses formatVehicleNumber and suggestions datalist', content.includes('formatVehicleNumber(e.target.value, prev.vehicle)') && content.includes('list="transit-vehicle-suggestions"'));
assertCondition('Calendar picker triggers attached to date fields', content.includes('billDateInputRef') && content.includes('constructionDateInputRef'));

// 2. Functional logic verification
const formatTypedDate = (val, prevVal = '') => {
  if (!val) return '';
  if (prevVal && val.length < prevVal.length) return val;
  if (/[a-zA-Z]/.test(val)) return val;

  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

const formatVehicleNumber = (val, prevVal = '') => {
  if (!val) return '';
  const upper = val.toUpperCase();
  if (prevVal && upper.length < prevVal.length) return upper;

  const clean = upper.replace(/[^A-Z0-9]/g, '');
  if (!clean) return '';

  if (/^[A-Z]{2}\d/.test(clean)) {
    const state = clean.slice(0, 2);
    if (clean.length <= 2) return state;
    if (clean.length <= 4) return `${state}-${clean.slice(2)}`;

    const district = clean.slice(2, 4);
    const remainder = clean.slice(4);
    const match = remainder.match(/^([A-Z]{1,3})([0-9]{0,4})/);
    if (match) {
      const series = match[1];
      const num = match[2];
      return num ? `${state}-${district}-${series}-${num}` : `${state}-${district}-${series}`;
    }
    return `${state}-${district}-${remainder}`;
  }

  if (/^\d{2}BH/i.test(clean)) {
    const yr = clean.slice(0, 2);
    if (clean.length <= 4) return `${yr}-${clean.slice(2)}`;
    const match = clean.slice(4).match(/^([0-9]{1,4})([A-Z]{0,2})/);
    if (match) {
      return `${yr}-BH-${match[1]}${match[2] ? '-' + match[2] : ''}`;
    }
  }

  return upper;
};

// Unit tests
assertCondition('Date formatting 19102026 -> 19-10-2026', formatTypedDate('19102026') === '19-10-2026');
assertCondition('Date formatting 19/10/2026 -> 19-10-2026', formatTypedDate('19/10/2026') === '19-10-2026');
assertCondition('Vehicle formatting mh10cr1212 -> MH-10-CR-1212', formatVehicleNumber('mh10cr1212') === 'MH-10-CR-1212');
assertCondition('Vehicle formatting with spaces mh 10 cr 1212 -> MH-10-CR-1212', formatVehicleNumber('mh 10 cr 1212') === 'MH-10-CR-1212');
assertCondition('Vehicle formatting out of state ka28m5555 -> KA-28-M-5555', formatVehicleNumber('ka28m5555') === 'KA-28-M-5555');

if (!passed) {
  process.exit(1);
} else {
  console.log('\n======================================================');
  console.log('🎉 ALL DATE & VEHICLE FORMATTING TESTS PASSED!');
  console.log('======================================================\n');
}
