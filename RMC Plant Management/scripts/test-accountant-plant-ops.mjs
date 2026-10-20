import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- STARTING ACCOUNTANT PLANT OPERATIONS FILTERING TEST ---');

const projectRoot = 'E:/RMC Plant Management/RMC Plant Management';
const plantOpsViewPath = path.join(projectRoot, 'src/components/operations/PlantOperationsView.jsx');
const plantOpsViewContent = fs.readFileSync(plantOpsViewPath, 'utf-8');

// 1. Verify PlantOperationsView imports and role setup
assert(plantOpsViewContent.includes("import { ROLES } from '../../data/mockUsers'"), 'Must import ROLES');
assert(plantOpsViewContent.includes("import { useAuth } from '../../context/AuthContext'"), 'Must import useAuth');
assert(plantOpsViewContent.includes("allowedModules"), 'Must calculate allowedModules');
assert(plantOpsViewContent.includes("allowedModules.map"), 'Must map over allowedModules in sub-navigation');
console.log('✓ [PASS] PlantOperationsView.jsx has role-based filtering imports and allowedModules mapping');

// 2. Extract and verify OPERATIONS_MODULES
const ROLES = {
  ADMIN: 'Admin',
  PLANT_MANAGER: 'Plant Manager',
  PLANT_INCHARGE: 'Plant Incharge',
  ACCOUNTANT: 'Accountant',
  OPERATOR: 'Operator',
  DISPATCHER: 'Dispatcher',
  QC_ENGINEER: 'QC Engineer',
  SITE_SUPERVISOR: 'Site Supervisor',
  DRIVER: 'Driver',
  OWNER_DIRECTOR: 'Owner / Director',
};

// Evaluate allowed modules logic for Accountant
const accountantOps = [
  'material-inward',
  'weighbridge',
  'delivery-challans',
  'diesel-management',
  'plant-reports'
];

const disallowedOpsForAccountant = [
  'plant-dashboard',
  'batching-sheets',
  'mix-design',
  'vehicle-management',
  'driver-trips'
];

accountantOps.forEach(opId => {
  assert(plantOpsViewContent.includes(`id: '${opId}'`), `Module ${opId} must be defined in OPERATIONS_MODULES`);
});
console.log('✓ [PASS] All 5 required Accountant plant operation modules exist in PlantOperationsView');

// 3. Verify AppLayout handles default plant op for Accountant
const appLayoutPath = path.join(projectRoot, 'src/components/dashboard/AppLayout.jsx');
const appLayoutContent = fs.readFileSync(appLayoutPath, 'utf-8');
assert(appLayoutContent.includes('isAccountant'), 'AppLayout must check for isAccountant');
assert(appLayoutContent.includes("defaultPlantOp = isAccountant ? 'material-inward' : 'plant-dashboard'"), 'AppLayout must set defaultPlantOp to material-inward for accountant');
console.log('✓ [PASS] AppLayout.jsx sets role-aware defaultPlantOp for accountant');

console.log('\n======================================================');
console.log('🎉 ALL ACCOUNTANT PLANT OPERATIONS ASSERTIONS PASSED!');
console.log('======================================================\n');
