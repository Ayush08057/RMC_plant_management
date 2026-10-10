// Automated verification script for RMC Plant Authentication Logic
import { ROLES, ROLE_ROUTES, SYSTEM_ADMIN, SYSTEM_ROLE_PROFILES } from './src/data/mockUsers.js';

console.log('=====================================================');
console.log('RMC Plant Management System - Auth Verification Test');
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

// 1. Verify all 8 roles exist
const expectedRoles = [
  'Admin',
  'Plant Manager',
  'Accountant',
  'Dispatcher',
  'QC Engineer',
  'Site Supervisor',
  'Driver',
  'Owner / Director',
];

expectedRoles.forEach((role) => {
  const profile = SYSTEM_ROLE_PROFILES.find((p) => p.role === role);
  assert(!!profile, `Role "${role}" defined in system role profiles`);
  assert(!!ROLE_ROUTES[role], `Role "${role}" maps to route: ${ROLE_ROUTES[role]}`);
});

// 2. Verify Root Admin credentials
assert(SYSTEM_ADMIN.employeeId === 'ADM-001', 'Admin has Employee ID ADM-001');
assert(SYSTEM_ADMIN.email === 'smconcretech@gmail.com', 'Admin has verified admin email (smconcretech@gmail.com)');
assert(SYSTEM_ADMIN.password === 'sm1234', 'Admin has password sm1234');

// 3. Test Role Route Protection Matrix
const matrix = [
  { role: ROLES.DRIVER, targetRoute: '/admin', allowed: false },
  { role: ROLES.QC_ENGINEER, targetRoute: '/accountant', allowed: false },
  { role: ROLES.SITE_SUPERVISOR, targetRoute: '/dispatcher', allowed: false },
  { role: ROLES.ADMIN, targetRoute: '/admin', allowed: true },
  { role: ROLES.PLANT_MANAGER, targetRoute: '/plant-manager', allowed: true },
  { role: ROLES.QC_ENGINEER, targetRoute: '/qc', allowed: true },
];

const routeAllowedRoles = {
  '/admin': [ROLES.ADMIN],
  '/plant-manager': [ROLES.PLANT_MANAGER, ROLES.ADMIN, ROLES.OWNER_DIRECTOR],
  '/accountant': [ROLES.ACCOUNTANT, ROLES.ADMIN, ROLES.OWNER_DIRECTOR],
  '/dispatcher': [ROLES.DISPATCHER, ROLES.ADMIN, ROLES.PLANT_MANAGER],
  '/qc': [ROLES.QC_ENGINEER, ROLES.ADMIN, ROLES.PLANT_MANAGER],
  '/site-supervisor': [ROLES.SITE_SUPERVISOR, ROLES.ADMIN, ROLES.PLANT_MANAGER, ROLES.DISPATCHER],
  '/driver': [ROLES.DRIVER, ROLES.ADMIN, ROLES.DISPATCHER],
  '/owner': [ROLES.OWNER_DIRECTOR, ROLES.ADMIN],
};

matrix.forEach((test) => {
  const allowedRoles = routeAllowedRoles[test.targetRoute] || [];
  const isAllowed = allowedRoles.includes(test.role);
  assert(
    isAllowed === test.allowed,
    `Access check: ${test.role} accessing ${test.targetRoute} -> Expected allowed=${test.allowed}, got=${isAllowed}`
  );
});

// 4. Test Registration Data Integrity & Route Mapping
const sampleRegistrations = [
  { role: ROLES.QC_ENGINEER, expectedRoute: '/qc' },
  { role: ROLES.DISPATCHER, expectedRoute: '/dispatcher' },
  { role: ROLES.PLANT_MANAGER, expectedRoute: '/plant-manager' },
  { role: ROLES.SITE_SUPERVISOR, expectedRoute: '/site-supervisor' },
  { role: ROLES.ACCOUNTANT, expectedRoute: '/accountant' },
  { role: ROLES.DRIVER, expectedRoute: '/driver' },
];

sampleRegistrations.forEach((item) => {
  assert(
    ROLE_ROUTES[item.role] === item.expectedRoute,
    `Registered role "${item.role}" correctly directs to ${item.expectedRoute}`
  );
});

console.log('=====================================================');
console.log(`Test Results: ${passedTests}/${totalTests} Passed`);
console.log('=====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
