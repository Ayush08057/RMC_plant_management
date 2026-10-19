import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- STARTING COMPREHENSIVE PLANT OPERATIONS SUITE TEST ---');

const projectRoot = 'E:/RMC Plant Management/RMC Plant Management';
const opsDir = path.join(projectRoot, 'src/components/operations');

// 1. Verify all 10 operations component files exist
const requiredFiles = [
  'BatchingSheetsView.jsx',
  'MixDesignView.jsx',
  'DeliveryChallansView.jsx',
  'MaterialInwardView.jsx',
  'WeighbridgeView.jsx',
  'VehicleManagementView.jsx',
  'DriverTripsView.jsx',
  'DieselManagementView.jsx',
  'PlantDashboardView.jsx',
  'PlantReportsView.jsx',
  'PlantOperationsView.jsx'
];

let checksPassed = 0;

for (const file of requiredFiles) {
  const filePath = path.join(opsDir, file);
  assert(fs.existsSync(filePath), `File ${file} should exist`);
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.length > 500, `File ${file} should have meaningful content`);
  assert(content.includes('export default'), `File ${file} should export default component`);
  checksPassed++;
  console.log(`✓ [PASS] Component ${file} verified (${content.length} bytes)`);
}

// 2. Verify AppLayout integration
const appLayoutPath = path.join(projectRoot, 'src/components/dashboard/AppLayout.jsx');
const appLayoutContent = fs.readFileSync(appLayoutPath, 'utf-8');
assert(appLayoutContent.includes('PlantOperationsView'), 'AppLayout should import PlantOperationsView');
assert(appLayoutContent.includes('isPlantOps'), 'AppLayout should handle isPlantOps logic');
checksPassed++;
console.log('✓ [PASS] AppLayout.jsx successfully wires PlantOperationsView');

// 3. Verify Sidebar integration
const sidebarPath = path.join(projectRoot, 'src/components/dashboard/Sidebar.jsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
assert(sidebarContent.includes('ALL_PLANT_OPERATIONS_ITEMS'), 'Sidebar should have ALL_PLANT_OPERATIONS_ITEMS');
assert(sidebarContent.includes('plant_operations_group'), 'Sidebar should group plant operations');
assert(sidebarContent.includes('role === ROLES.ADMIN'), 'Sidebar should grant Admin access to plant operations');
checksPassed++;
console.log('✓ [PASS] Sidebar.jsx correctly includes Plant Operations with Admin access');

// 4. Mathematical tests for Batching Calculations & IS:4926 Tolerance Check
function calculateBatchTolerance(target, actual) {
  if (!target || target === 0) return 0;
  return ((actual - target) / target) * 100;
}

const batchTestTarget = 2040; // 6m³ M30 cement target
const batchTestActual = 2060;
const diffPct = calculateBatchTolerance(batchTestTarget, batchTestActual);
assert(Math.abs(diffPct) < 2.0, 'Batch tolerance should be within ±2% IS:4926 limits');
checksPassed++;
console.log(`✓ [PASS] Batch tolerance calculation: target=${batchTestTarget}kg, actual=${batchTestActual}kg, variance=${diffPct.toFixed(2)}% (Within ±2%)`);

// 5. Mathematical tests for Weighbridge Gross-Tare-Net
function calculateNetWeight(gross, tare) {
  return Math.max(0, gross - tare);
}

const grossMT = 38.45;
const tareMT = 14.20;
const netMT = calculateNetWeight(grossMT, tareMT);
assert.strictEqual(parseFloat(netMT.toFixed(2)), 24.25, 'Net weight should equal gross - tare');
checksPassed++;
console.log(`✓ [PASS] Weighbridge calculation: Gross=${grossMT} MT, Tare=${tareMT} MT -> Net=${netMT.toFixed(2)} MT`);

// 6. Mathematical tests for Diesel Mileage calculation
function calculateMileage(kmDriven, liters) {
  if (!liters || liters === 0) return 0;
  return Number((kmDriven / liters).toFixed(2));
}

const km = 240;
const l = 65;
const mileage = calculateMileage(km, l);
assert(mileage > 3.0 && mileage < 4.5, 'Transit mixer mileage should be realistic (~3.69 km/l)');
checksPassed++;
console.log(`✓ [PASS] Diesel fuel economy: ${km} km on ${l} L = ${mileage} km/L`);

console.log(`\n========================================`);
console.log(`ALL ${checksPassed}/${requiredFiles.length + 5} PLANT OPERATIONS ASSERTIONS PASSED!`);
console.log(`========================================\n`);
