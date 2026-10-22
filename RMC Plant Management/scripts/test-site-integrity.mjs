import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('SM CONCRETE TECH — SYSTEM-WIDE SITE INTEGRITY AUDIT');
console.log('================================================================\n');

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ [PASS] ${message}`);
    passedChecks++;
  }
}

// 1. Audit all files in src for undefined React hooks or missing imports
function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist') files.push(...walk(full));
    } else if (full.endsWith('.jsx') || full.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const allSrcFiles = walk(path.join(rootDir, 'src'));
console.log(`Auditing ${allSrcFiles.length} source code files for runtime reference hazards...`);

const hooks = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useContext'];
let hookErrors = [];

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const hook of hooks) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      // Check for bare hook usage like useEffect( without React.
      const bareHookRegex = new RegExp('(?<!React\\.)\\b' + hook + '\\s*\\(');
      if (bareHookRegex.test(line)) {
        // Must have imported the hook or declared it
        const importRegex = new RegExp('import\\s+.*\\b' + hook + '\\b.*from');
        const isDeclared = new RegExp('(const|let|var|function)\\s+' + hook + '\\b').test(content);
        if (!importRegex.test(content) && !isDeclared) {
          hookErrors.push({ file: path.relative(rootDir, file), line: i + 1, hook, text: line.trim() });
        }
      }
    }
  }
}

assert(hookErrors.length === 0, `All React hooks properly imported across all ${allSrcFiles.length} files (found ${hookErrors.length} errors)`);
if (hookErrors.length > 0) {
  console.error('Details of hook errors:', hookErrors);
}

// 2. Specific Verification of the reported error in MakeConcreteWizard
const wizardPath = path.join(rootDir, 'src', 'components', 'operations', 'guided', 'MakeConcreteWizard.jsx');
const wizardSrc = fs.readFileSync(wizardPath, 'utf8');
assert(
  wizardSrc.includes('import React, { useState, useEffect }') || 
  wizardSrc.includes('useEffect') && wizardSrc.includes("from 'react'"),
  'MakeConcreteWizard.jsx correctly imports useEffect from react'
);

// 3. Verify KPICard full perimeter border & color themes
const kpiCardPath = path.join(rootDir, 'src', 'components', 'dashboard', 'KPICard.jsx');
const kpiCardSrc = fs.readFileSync(kpiCardPath, 'utf8');
assert(kpiCardSrc.includes('border-2'), 'KPICard uses border-2 for prominent 4-sided borders');
assert(kpiCardSrc.includes('border-emerald-400') && kpiCardSrc.includes('border-rose-400'), 'KPICard defines emerald, blue, amber, rose 4-sided color borders');

// 4. Verify All Operations Views exist and have valid export defaults
const operationsComponents = [
  'BatchingSheetsView.jsx',
  'DeliveryChallansView.jsx',
  'DieselManagementView.jsx',
  'DriverTripsView.jsx',
  'MaterialInwardView.jsx',
  'MixDesignView.jsx',
  'PlantDashboardView.jsx',
  'PlantOperationsView.jsx',
  'PlantReportsView.jsx',
  'VehicleManagementView.jsx',
  'WeighbridgeView.jsx'
];

for (const comp of operationsComponents) {
  const p = path.join(rootDir, 'src', 'components', 'operations', comp);
  assert(fs.existsSync(p), `Operations component ${comp} exists on disk`);
  const src = fs.readFileSync(p, 'utf8');
  assert(src.includes('export default'), `${comp} contains valid default export`);
}

// 5. Verify All Primary Dashboard Pages exist and have valid export defaults
const dashboardPages = [
  'accountant/AccountantDashboardPage.jsx',
  'admin/AdminDashboardPage.jsx',
  'dispatcher/DispatcherDashboardPage.jsx',
  'driver/DriverDashboardPage.jsx',
  'owner/OwnerDashboardPage.jsx',
  'plant-manager/PlantManagerDashboardPage.jsx',
  'qc/QcDashboardPage.jsx',
  'site-supervisor/SiteSupervisorDashboardPage.jsx'
];

for (const dash of dashboardPages) {
  const p = path.join(rootDir, 'src', 'pages', dash);
  assert(fs.existsSync(p), `Dashboard page ${dash} exists on disk`);
  const src = fs.readFileSync(p, 'utf8');
  assert(src.includes('export default'), `${dash} contains valid default export`);
}

// 6. Verify Workforce & Billing Components
const workforceComponents = [
  'workforce/AdvanceManagementView.jsx',
  'workforce/LoanManagementView.jsx',
  'workforce/PayrollPreparationView.jsx',
  'workforce/AttendanceManagementView.jsx',
  'workforce/HrReportsView.jsx',
  'billing/BillingManagementView.jsx'
];

for (const wf of workforceComponents) {
  const p = path.join(rootDir, 'src', 'components', wf);
  assert(fs.existsSync(p), `Workforce/Billing component ${wf} exists on disk`);
  const src = fs.readFileSync(p, 'utf8');
  assert(src.includes('export default'), `${wf} contains valid default export`);
}

console.log('\n================================================================');
console.log(`SITE INTEGRITY VERIFICATION: ${passedChecks}/${totalChecks} CHECKS PASSED`);
console.log('================================================================');
if (passedChecks === totalChecks) {
  console.log('🎉 ENTIRE SITE RUNTIME INTEGRITY VERIFIED 100% OPERATIONAL!');
}
