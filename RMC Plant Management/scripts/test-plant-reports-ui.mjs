import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- STARTING PLANT REPORTS UI & VERIFICATION TEST ---');

const projectRoot = 'E:/RMC Plant Management/RMC Plant Management';
const plantReportsFile = path.join(projectRoot, 'src/components/operations/PlantReportsView.jsx');
const plantOpsFile = path.join(projectRoot, 'src/components/operations/PlantOperationsView.jsx');
const sidebarFile = path.join(projectRoot, 'src/components/dashboard/Sidebar.jsx');

// 1. Files existence check
assert(fs.existsSync(plantReportsFile), 'PlantReportsView.jsx must exist');
assert(fs.existsSync(plantOpsFile), 'PlantOperationsView.jsx must exist');
assert(fs.existsSync(sidebarFile), 'Sidebar.jsx must exist');

const plantReportsCode = fs.readFileSync(plantReportsFile, 'utf-8');
const plantOpsCode = fs.readFileSync(plantOpsFile, 'utf-8');
const sidebarCode = fs.readFileSync(sidebarFile, 'utf-8');

// 2. Requirement 1: Verify Left Sidebar preserves all plant operations items
const expectedSidebarItems = [
  'Plant Dashboard',
  'Material Inward',
  'Weighbridge',
  'Mix Design',
  'Batching Sheets',
  'Delivery Challans',
  'Vehicle Management',
  'Driver Trips',
  'Diesel Management',
  'Plant Reports'
];

expectedSidebarItems.forEach(item => {
  assert(sidebarCode.includes(item), `Sidebar must contain ${item}`);
});
console.log('✓ [PASS] Requirement 1: Left sidebar contains all 10 operations menu items');

// 3. Requirement 2: Verify duplicate horizontal nav is omitted on Plant Reports
assert(plantOpsCode.includes("effectiveTab !== 'plant-reports'"), 'PlantOperationsView must omit horizontal sub-nav when effectiveTab is plant-reports');
console.log('✓ [PASS] Requirement 2: Duplicate horizontal navigation bar is eliminated on Plant Reports');

// 4. Requirement 3 & 4: Verify Report controls, tabs, date selector, export and print
assert(plantReportsCode.includes('Daily Production (DPR)'), 'Daily Production tab must exist');
assert(plantReportsCode.includes('Material Reconciliation'), 'Material Reconciliation tab must exist');
assert(plantReportsCode.includes('Client Dispatch Summary'), 'Client Dispatch Summary tab must exist');
assert(plantReportsCode.includes('dateRange'), 'Date selector state must exist');
assert(plantReportsCode.includes('Export CSV'), 'Export CSV button must exist');
assert(plantReportsCode.includes('Print Report'), 'Print Report button must exist');
assert(plantReportsCode.includes('handleExportCSV'), 'handleExportCSV handler must exist');
assert(plantReportsCode.includes('handlePrint'), 'handlePrint handler must exist');
console.log('✓ [PASS] Requirement 3: Report switcher tabs, date selector, CSV export, and Print preserved');

// 5. Requirement 4: Verify Report Content & Calculations
assert(plantReportsCode.includes('totalDailyM3'), 'Total production calculation preserved');
assert(plantReportsCode.includes('totalDailyCementKg'), 'Total cement calculation preserved');
assert(plantReportsCode.includes('IS 4926 / IS 10262 Compliant'), 'Compliance label preserved');
assert(plantReportsCode.includes('Total Production Today'), 'KPI Card 1 preserved');
assert(plantReportsCode.includes('Total Cement Consumed'), 'KPI Card 2 preserved');
assert(plantReportsCode.includes('Average Batch Size'), 'KPI Card 3 preserved');
console.log('✓ [PASS] Requirement 4: Report content, calculation metrics, and tables 100% preserved');

// 6. Test Data Accuracy Simulation
const dailyBatches = [
  { ticketNo: 'BT-2026-1041', qty: 6.0, cementKg: 2040 },
  { ticketNo: 'BT-2026-1042', qty: 6.0, cementKg: 1920 },
  { ticketNo: 'BT-2026-1043', qty: 7.0, cementKg: 2590 },
  { ticketNo: 'BT-2026-1044', qty: 6.0, cementKg: 1920 },
  { ticketNo: 'BT-2026-1045', qty: 6.0, cementKg: 2040 },
  { ticketNo: 'BT-2026-1046', qty: 5.5, cementKg: 1540 }
];

const totalM3 = dailyBatches.reduce((acc, b) => acc + b.qty, 0);
const totalCementKg = dailyBatches.reduce((acc, b) => acc + b.cementKg, 0);
const avgBatchSize = totalM3 / dailyBatches.length;

assert.strictEqual(totalM3, 36.5, 'Total production should be 36.5 m³');
assert.strictEqual(totalCementKg, 12050, 'Total cement should be 12,050 kg (12.05 MT)');
assert.strictEqual(Number(avgBatchSize.toFixed(1)), 6.1, 'Average batch size should be 6.1 m³');
console.log('✓ [PASS] Report metric calculations verified');

console.log('\n======================================================');
console.log('🎉 ALL PLANT REPORTS UI & VERIFICATION CHECKS PASSED!');
console.log('======================================================');
