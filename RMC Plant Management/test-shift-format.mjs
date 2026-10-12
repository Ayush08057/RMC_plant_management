// Verification script for Indian 12-Hour Shift Formatter
import { formatToIndian12Hr, formatShiftRange, formatShiftOption, parseTimeToMinutes, getNowIndian12Hr } from './src/utils/shiftUtils.js';

console.log('=====================================================');
console.log('RMC Plant Management - Indian 12-Hour Shift Test');
console.log('=====================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
  }
}

// 1. Single time conversions
assert(formatToIndian12Hr('09:00') === '09:00 AM', '09:00 -> 09:00 AM');
assert(formatToIndian12Hr('18:00') === '06:00 PM', '18:00 -> 06:00 PM');
assert(formatToIndian12Hr('20:00') === '08:00 PM', '20:00 -> 08:00 PM');
assert(formatToIndian12Hr('05:00') === '05:00 AM', '05:00 -> 05:00 AM');
assert(formatToIndian12Hr('00:00') === '12:00 AM', '00:00 -> 12:00 AM (Midnight)');
assert(formatToIndian12Hr('12:00') === '12:00 PM', '12:00 -> 12:00 PM (Noon)');
assert(formatToIndian12Hr('07:30') === '07:30 AM', '07:30 -> 07:30 AM');
assert(formatToIndian12Hr('16:45') === '04:45 PM', '16:45 -> 04:45 PM');
assert(formatToIndian12Hr('14:30:15') === '02:30:15 PM', '14:30:15 -> 02:30:15 PM (with seconds)');

// 2. Range conversions
assert(
  formatShiftRange('09:00', '18:00') === '09:00 AM - 06:00 PM',
  'Range 09:00, 18:00 -> 09:00 AM - 06:00 PM'
);
assert(
  formatShiftRange('20:00', '05:00') === '08:00 PM - 05:00 AM',
  'Range 20:00, 05:00 -> 08:00 PM - 05:00 AM'
);
assert(
  formatToIndian12Hr('09:00 - 18:00') === '09:00 AM - 06:00 PM',
  'String range "09:00 - 18:00" -> "09:00 AM - 06:00 PM"'
);
assert(
  formatToIndian12Hr('11:30 - 14:00') === '11:30 AM - 02:00 PM',
  'Pending order slot "11:30 - 14:00" -> "11:30 AM - 02:00 PM"'
);

// 3. Formatted options for UI dropdown
const morningShift = {
  name: 'General Morning Shift',
  startTime: '09:00',
  endTime: '18:00',
};

const nightShift = {
  name: 'Night Pour Shift',
  startTime: '20:00',
  endTime: '05:00',
};

assert(
  formatShiftOption(morningShift) === 'General Morning Shift (09:00 AM - 06:00 PM)',
  'Dropdown option: General Morning Shift (09:00 AM - 06:00 PM)'
);

assert(
  formatShiftOption(nightShift) === 'Night Pour Shift (08:00 PM - 05:00 AM)',
  'Dropdown option: Night Pour Shift (08:00 PM - 05:00 AM)'
);

// 4. Idempotency test (if already formatted, does not duplicate or break)
assert(
  formatToIndian12Hr('09:00 AM') === '09:00 AM',
  'Idempotent: 09:00 AM remains 09:00 AM'
);
assert(
  formatToIndian12Hr('06:00 PM') === '06:00 PM',
  'Idempotent: 06:00 PM remains 06:00 PM'
);

// 5. parseTimeToMinutes tests
assert(parseTimeToMinutes('09:00') === 540, 'parseTimeToMinutes: 09:00 -> 540');
assert(parseTimeToMinutes('09:00 AM') === 540, 'parseTimeToMinutes: 09:00 AM -> 540');
assert(parseTimeToMinutes('18:00') === 1080, 'parseTimeToMinutes: 18:00 -> 1080');
assert(parseTimeToMinutes('06:00 PM') === 1080, 'parseTimeToMinutes: 06:00 PM -> 1080');
assert(parseTimeToMinutes('12:00 AM') === 0, 'parseTimeToMinutes: 12:00 AM -> 0');
assert(parseTimeToMinutes('12:00 PM') === 720, 'parseTimeToMinutes: 12:00 PM -> 720');
assert(parseTimeToMinutes('12:30 AM') === 30, 'parseTimeToMinutes: 12:30 AM -> 30');
assert(parseTimeToMinutes('12:30 PM') === 750, 'parseTimeToMinutes: 12:30 PM -> 750');

// 6. getNowIndian12Hr format test
const now12 = getNowIndian12Hr(false);
assert(/^(0[1-9]|1[0-2]):[0-5][0-9]\s(AM|PM)$/.test(now12), `getNowIndian12Hr(false) matches 12-hr format: ${now12}`);

const nowWithSec = getNowIndian12Hr(true);
assert(/^(0[1-9]|1[0-2]):[0-5][0-9]:[0-5][0-9]\s(AM|PM)$/.test(nowWithSec), `getNowIndian12Hr(true) matches with seconds: ${nowWithSec}`);

console.log('=====================================================');
console.log(`Test Results: ${passedTests}/${totalTests} Passed`);
console.log('=====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

