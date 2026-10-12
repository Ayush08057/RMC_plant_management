// Verification script for Admin Cross-Role Navigation and Role Isolation
import { ROLES, ROLE_ROUTES, SYSTEM_ADMIN, OFFICIAL_ROLE_ACCOUNTS } from './src/data/mockUsers.js';

console.log('================================================================');
console.log('RMC Plant Management - Admin Master Authority & Cross-Role Test');
console.log('================================================================');

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

// 1. Check Root Admin Login Initial State
const adminLoginUser = {
  ...SYSTEM_ADMIN,
  role: ROLES.ADMIN,
  isMasterAdmin: true,
  originalAdminUser: SYSTEM_ADMIN,
};

assert(adminLoginUser.isMasterAdmin === true, 'Admin login has isMasterAdmin = true');
assert(adminLoginUser.originalAdminUser?.role === 'Admin', 'Admin login preserves originalAdminUser');

// 2. Simulate ProtectedRoute clearance check
function checkRouteClearance(user, targetRole) {
  const allowedRoles = targetRole === ROLES.PLANT_MANAGER
    ? [ROLES.PLANT_MANAGER, ROLES.PLANT_INCHARGE, ROLES.OPERATOR]
    : [targetRole];
  const hasAdminMasterClearance = Boolean(
    user?.role === 'Admin' ||
    user?.isMasterAdmin ||
    user?.originalAdminUser?.role === 'Admin'
  );
  if (hasAdminMasterClearance) return true;
  const userRoleNorm = (user?.role || '').trim().toLowerCase();
  return allowedRoles.some((allowed) => {
    const allowedNorm = (allowed || '').trim().toLowerCase();
    if (allowedNorm === userRoleNorm) return true;
    if (
      (userRoleNorm.includes('incharge') || userRoleNorm.includes('manager')) &&
      (allowedNorm.includes('manager') || allowedNorm.includes('incharge'))
    ) {
      return true;
    }
    return false;
  });
}

// Admin directly accessing all routes
const allRoles = Object.values(ROLES);
allRoles.forEach((role) => {
  const allowed = checkRouteClearance(adminLoginUser, role);
  assert(allowed === true, `Admin user can access route for role: "${role}"`);
});

// 3. Simulate Admin switching view to Plant Manager
function simulateSwitchRole(currentUser, targetRole) {
  const hasAdminAuthority = Boolean(
    currentUser?.isMasterAdmin ||
    currentUser?.role === ROLES.ADMIN ||
    currentUser?.originalAdminUser ||
    currentUser?.email === SYSTEM_ADMIN.email
  );

  if (!hasAdminAuthority && targetRole !== currentUser?.role) {
    return { success: false, error: 'Unauthorized role switch attempt blocked for non-admin session.' };
  }

  const adminRef = currentUser?.originalAdminUser || (currentUser?.role === ROLES.ADMIN ? currentUser : SYSTEM_ADMIN);

  if (targetRole === ROLES.ADMIN) {
    return {
      success: true,
      user: {
        ...adminRef,
        role: ROLES.ADMIN,
        isMasterAdmin: true,
        originalAdminUser: adminRef,
      },
      route: '/admin',
    };
  }

  const roleAccount = OFFICIAL_ROLE_ACCOUNTS.find((acc) => acc.role === targetRole) || {
    id: `USR-${targetRole.toUpperCase()}`,
    name: targetRole,
    role: targetRole,
  };

  return {
    success: true,
    user: {
      ...roleAccount,
      isMasterAdmin: true,
      originalAdminUser: adminRef,
    },
    route: ROLE_ROUTES[targetRole] || '/',
  };
}

// Admin switches to Plant Manager
const switchResult = simulateSwitchRole(adminLoginUser, ROLES.PLANT_MANAGER);
assert(switchResult.success === true, 'Admin successfully switched view to Plant Manager');
assert(switchResult.user.role === ROLES.PLANT_MANAGER, 'Switched user has role "Plant Manager"');
assert(switchResult.user.isMasterAdmin === true, 'Switched user maintains isMasterAdmin = true');
assert(switchResult.user.originalAdminUser?.role === 'Admin', 'Switched user keeps originalAdminUser reference');

// While viewing as Plant Manager, check if Admin can still access ALL other routes
allRoles.forEach((role) => {
  const allowed = checkRouteClearance(switchResult.user, role);
  assert(allowed === true, `Admin while inspecting "${switchResult.user.role}" can access role "${role}"`);
});

// Admin can switch back to Admin from Plant Manager
const returnResult = simulateSwitchRole(switchResult.user, ROLES.ADMIN);
assert(returnResult.success === true, 'Admin can return to Admin Console');
assert(returnResult.user.role === ROLES.ADMIN, 'Restored session role is Admin');
assert(returnResult.route === '/admin', 'Return route is /admin');

// 4. Test regular non-admin user (e.g. Plant Manager or Driver)
const regularPlantManager = {
  id: 'EMP-MGR-001',
  name: 'Vikram Shinde',
  role: ROLES.PLANT_MANAGER,
  email: 'manager@smconcretech.com',
  isMasterAdmin: false,
  originalAdminUser: null,
};

assert(checkRouteClearance(regularPlantManager, ROLES.PLANT_MANAGER) === true, 'Regular Plant Manager can access Plant Manager route');
assert(checkRouteClearance(regularPlantManager, ROLES.ADMIN) === false, 'Regular Plant Manager BLOCKED from Admin route');
assert(checkRouteClearance(regularPlantManager, ROLES.ACCOUNTANT) === false, 'Regular Plant Manager BLOCKED from Accountant route');
assert(checkRouteClearance(regularPlantManager, ROLES.DRIVER) === false, 'Regular Plant Manager BLOCKED from Driver route');

const regularPlantIncharge = {
  id: 'EMP-600',
  name: 'abc',
  role: ROLES.PLANT_INCHARGE,
  email: 'qwewrr@gmail.com',
  isMasterAdmin: false,
  originalAdminUser: null,
};

assert(checkRouteClearance(regularPlantIncharge, ROLES.PLANT_MANAGER) === true, 'Plant Incharge (abc EMP-600) can access Plant Manager route');
assert(checkRouteClearance(regularPlantIncharge, ROLES.ADMIN) === false, 'Plant Incharge BLOCKED from Admin route');
assert(checkRouteClearance(regularPlantIncharge, ROLES.ACCOUNTANT) === false, 'Plant Incharge BLOCKED from Accountant route');
assert(checkRouteClearance(regularPlantIncharge, ROLES.DRIVER) === false, 'Plant Incharge BLOCKED from Driver route');

const regularDriver = {
  id: 'EMP-DRV-001',
  name: 'Ramesh Pawar',
  role: ROLES.DRIVER,
  email: 'driver@smconcretech.com',
  isMasterAdmin: false,
  originalAdminUser: null,
};

assert(checkRouteClearance(regularDriver, ROLES.DRIVER) === true, 'Regular Driver can access Driver route');
assert(checkRouteClearance(regularDriver, ROLES.ADMIN) === false, 'Regular Driver BLOCKED from Admin route');
assert(checkRouteClearance(regularDriver, ROLES.PLANT_MANAGER) === false, 'Regular Driver BLOCKED from Plant Manager route');

const regularOperator = {
  id: 'EMP-OP-001',
  name: 'Operator Kiran',
  role: ROLES.OPERATOR,
  email: 'operator@smconcretech.com',
  isMasterAdmin: false,
  originalAdminUser: null,
};

assert(checkRouteClearance(regularOperator, ROLES.PLANT_MANAGER) === true, 'Operator can access Plant Manager route');
assert(checkRouteClearance(regularOperator, ROLES.ADMIN) === false, 'Operator strictly BLOCKED from Admin route');
assert(checkRouteClearance(regularOperator, ROLES.ACCOUNTANT) === false, 'Operator BLOCKED from Accountant route');
assert(checkRouteClearance(regularOperator, ROLES.DRIVER) === false, 'Operator BLOCKED from Driver route');

// Non-admin attempting to switch role
const unauthorizedSwitch = simulateSwitchRole(regularDriver, ROLES.ADMIN);
assert(unauthorizedSwitch.success === false, 'Non-admin cannot switch role or hijack admin authority');

console.log('================================================================');
console.log(`Cross-Role Verification Results: ${passedTests}/${totalTests} Passed`);
console.log('================================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
