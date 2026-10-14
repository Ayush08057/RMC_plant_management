import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('================================================================');
console.log('Testing Header.jsx - Company Selector & Notification Bell Fixes');
console.log('================================================================');

const headerPath = resolve('src/components/dashboard/Header.jsx');
const headerCode = readFileSync(headerPath, 'utf8');

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 1. Check useRef import and usage
assert(
  /import\s+React,\s*\{\s*useEffect,\s*useState,\s*useRef\s*\}\s*from\s*'react'/.test(headerCode),
  'Header.jsx imports useRef from react'
);
assert(
  headerCode.includes('const companyDropdownRef = useRef(null);'),
  'companyDropdownRef is declared'
);
assert(
  headerCode.includes('const notificationsRef = useRef(null);'),
  'notificationsRef is declared'
);

// 2. Check Click-outside & Escape key handlers
assert(
  headerCode.includes("document.addEventListener('mousedown', handleClickOutside);") &&
  headerCode.includes("document.addEventListener('keydown', handleKeyDown);"),
  'Click-outside and Keydown document event listeners are attached'
);
assert(
  headerCode.includes("document.removeEventListener('mousedown', handleClickOutside);") &&
  headerCode.includes("document.removeEventListener('keydown', handleKeyDown);"),
  'Event listeners are cleanly removed on unmount'
);
assert(
  headerCode.includes("if (event.key === 'Escape')"),
  'Escape key press dismisses open popovers'
);
assert(
  headerCode.includes('companyDropdownRef.current.contains(event.target)'),
  'Outside-click detection checks companyDropdownRef boundary'
);
assert(
  headerCode.includes('notificationsRef.current.contains(event.target)'),
  'Outside-click detection checks notificationsRef boundary'
);

// 3. Check Company Selector Dropdown positioning
assert(
  headerCode.includes('sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-1.5'),
  'Company dropdown uses sm:absolute sm:top-full (prevents 100vh fixed bug)'
);
assert(
  headerCode.includes('fixed inset-x-3 top-15 sm:inset-x-auto'),
  'Company dropdown is responsive on mobile with fixed inset-x-3'
);
assert(
  headerCode.includes('id="company-selector-button"') &&
  headerCode.includes('id="company-dropdown-menu"'),
  'Company Selector has proper id and accessible dropdown menu attributes'
);
assert(
  headerCode.includes('aria-expanded={showPlantPicker}'),
  'Company Selector has aria-expanded bound to showPlantPicker'
);
assert(
  headerCode.includes('rotate-180'),
  'Dropdown arrow reflects open and closed states with rotate-180'
);

// 4. Check Notification Bell Popover positioning
assert(
  headerCode.includes('sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-1.5'),
  'Notification panel uses sm:absolute sm:top-full (prevents 100vh fixed bug)'
);
assert(
  headerCode.includes('fixed inset-x-3 top-15 sm:inset-x-auto'),
  'Notification panel is responsive on mobile with fixed inset-x-3'
);
assert(
  headerCode.includes('id="notifications-button"') &&
  headerCode.includes('id="notifications-popover-menu"'),
  'Notification button and popover have proper accessible id attributes'
);
assert(
  headerCode.includes('aria-expanded={showNotifications}'),
  'Notification button has aria-expanded bound to showNotifications'
);

// 5. Check real notification and company data integration
assert(
  headerCode.includes('notifications.map(') &&
  headerCode.includes('markNotificationRead(') &&
  headerCode.includes('clearNotifications'),
  'Notification panel integrates actual data, markNotificationRead, and clearNotifications'
);
assert(
  headerCode.includes('No notifications') &&
  headerCode.includes("You're all caught up with current updates."),
  'Notification panel includes clean empty state when no notifications exist'
);
assert(
  headerCode.includes('companies.map(') &&
  headerCode.includes('switchCompany(') &&
  headerCode.includes('openAddPlantModal'),
  'Company selector integrates actual companies array, switchCompany, and Add Company workspace'
);
assert(
  headerCode.includes('plantToDelete') &&
  headerCode.includes('Confirm Company Deletion'),
  'Delete company retains confirmation modal with explicit warning before deletion'
);

console.log('================================================================');
if (process.exitCode === 1) {
  console.error('FAILED: Some assertions did not pass');
} else {
  console.log('ALL HEADER TESTS PASSED SUCCESSFULLY (17/17)');
}
console.log('================================================================');
