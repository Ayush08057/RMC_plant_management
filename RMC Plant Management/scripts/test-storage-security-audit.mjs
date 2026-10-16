/**
 * Storage Security & Production Readiness Audit Test Suite
 * Safe, non-destructive tests inspecting configuration, rules, and code paths.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let securityWarnings = 0;

function auditCheck(description, fn) {
  totalChecks++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedChecks++;
  } catch (err) {
    console.log(`  ❌ [FAIL] ${description}:`);
    console.log(`     ↳ ${err.message}`);
    securityWarnings++;
  }
}

console.log('================================================================');
console.log('🛡️  SM Concrete Tech - Firebase Storage Security & Readiness Audit');
console.log('================================================================\n');

// 1. CONFIGURATION AUDIT
console.log('📋 AUDIT SECTION 1: Firebase Project & Bucket Configuration');

auditCheck('firebase.json declares storage rules configuration', () => {
  const firebaseJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'firebase.json'), 'utf8'));
  assert.ok(firebaseJson.storage, 'Missing "storage" key in firebase.json');
  assert.strictEqual(firebaseJson.storage.rules, 'storage.rules');
});

auditCheck('Default project in .firebaserc matches smconcretech-2149c', () => {
  const firebaserc = JSON.parse(fs.readFileSync(path.join(rootDir, '.firebaserc'), 'utf8'));
  assert.strictEqual(firebaserc.projects.default, 'smconcretech-2149c');
});

auditCheck('firebase.js config specifies valid storageBucket domain', () => {
  const firebaseJs = fs.readFileSync(path.join(rootDir, 'src/config/firebase.js'), 'utf8');
  assert.ok(firebaseJs.includes('smconcretech-2149c.firebasestorage.app'), 'Must target smconcretech-2149c.firebasestorage.app');
});

// 2. STORAGE RULES AUDIT
console.log('\n🔒 AUDIT SECTION 2: Storage Security Rules Inspection (storage.rules)');

const rulesContent = fs.readFileSync(path.join(rootDir, 'storage.rules'), 'utf8');

auditCheck('Rules enforce authentication on all document operations', () => {
  assert.ok(rulesContent.includes('function isAuthenticated() {'), 'Must have isAuthenticated function');
  assert.ok(rulesContent.includes('request.auth != null'), 'Must verify request.auth != null');
});

auditCheck('Rules enforce 5MB maximum file size limit', () => {
  assert.ok(rulesContent.includes('request.resource.size < 5 * 1024 * 1024'), 'Must enforce 5MB limit');
});

auditCheck('Rules restrict MIME types to PDF, JPEG, PNG, and WebP', () => {
  assert.ok(rulesContent.includes("request.resource.contentType.matches('application/pdf|image/jpeg|image/png|image/webp')"), 'Must enforce MIME types');
});

auditCheck('Rules enforce company-level isolation (Cross-Tenant Prevention)', () => {
  // Check if companyId parameter in path is validated against token or firestore
  const hasCompanyCheck = rulesContent.includes('isSameCompany(targetCompanyId)') ||
                          rulesContent.includes('isSameCompany(companyId)');
  assert.ok(hasCompanyCheck, 'storage.rules lacks companyId validation on path /documents/{companyId}/{employeeId}/{fileName}!');
  assert.ok(rulesContent.includes('getUserCompanyId() == targetCompanyId'), 'Must compare user company with target path company');
});

auditCheck('Rules enforce employee ownership validation (Self Access)', () => {
  assert.ok(rulesContent.includes('function isSelf(companyId, employeeId)'), 'Must have isSelf with companyId check');
  assert.ok(rulesContent.includes('getUserEmployeeId() == employeeId'), 'Must compare employeeId with user profile/token');
});

auditCheck('Rules restrict deletion strictly to Admin and HR of the same company', () => {
  assert.ok(rulesContent.includes('allow delete: if isHR(companyId);'), 'Delete must be restricted to Admin and HR of same company');
});

// 3. STORAGE SERVICE & CODEBASE AUDIT
console.log('\n📦 AUDIT SECTION 3: Storage Service & UI Error Propagation');

const storageServiceContent = fs.readFileSync(path.join(rootDir, 'src/services/storageService.js'), 'utf8');
const workforceContextContent = fs.readFileSync(path.join(rootDir, 'src/context/WorkforceContext.jsx'), 'utf8');
const documentsViewContent = fs.readFileSync(path.join(rootDir, 'src/components/workforce/EmployeeDocumentsView.jsx'), 'utf8');

auditCheck('Upload does not generate or store permanent public token URLs', () => {
  // Verify uploadEmployeeDocument does NOT call getDownloadURL
  const uploadBlock = storageServiceContent.substring(
    storageServiceContent.indexOf('export async function uploadEmployeeDocument'),
    storageServiceContent.indexOf('export async function downloadEmployeeDocument')
  );
  assert.ok(!uploadBlock.includes('getDownloadURL('), 'uploadEmployeeDocument must not call getDownloadURL to prevent persistent public token leakage!');
});

auditCheck('Download implements authorized binary retrieval via getBlob', () => {
  assert.ok(storageServiceContent.includes('const blob = await getBlob(fileRef);'), 'Must use getBlob for authorized download');
  assert.ok(storageServiceContent.includes('window.URL.createObjectURL(blob)'), 'Must generate temporary object URL');
  assert.ok(storageServiceContent.includes('window.URL.revokeObjectURL(objectUrl)'), 'Must revoke object URL after download');
});

auditCheck('Deletion failures in Storage / Firestore propagate to UI', () => {
  // Check that deleteDocument in WorkforceContext does NOT silently catch
  assert.ok(!workforceContextContent.includes('deleteEmployeeDocumentFile(targetDoc.storagePath).catch(() => {})'), 'Must not silently catch storage deletion');
  assert.ok(workforceContextContent.includes('await deleteEmployeeDocumentFile(targetDoc.storagePath);'), 'Must await storage deletion');
  assert.ok(workforceContextContent.includes('await removeDocument(COLLECTIONS.DOCUMENTS, id);'), 'Must await Firestore removal');
});

auditCheck('deleteDocument verifies user authorization before deletion', () => {
  assert.ok(workforceContextContent.includes('const isAuthorized ='), 'Must check user authorization before deletion');
  assert.ok(workforceContextContent.includes('Permission denied. Only Administrators and HR personnel'), 'Must throw on unauthorized deletion');
});

auditCheck('Upload failures prevent Firestore metadata creation', () => {
  // Verify EmployeeDocumentsView awaits upload before addDocument
  assert.ok(documentsViewContent.includes('const uploadResult = await uploadEmployeeDocument('), 'Must await upload');
  assert.ok(documentsViewContent.includes('await addDocument({'), 'Must await addDocument');
  assert.ok(documentsViewContent.indexOf('uploadEmployeeDocument') < documentsViewContent.indexOf('addDocument'), 'Upload must precede metadata save');
});

console.log('\n================================================================');
console.log(`📊 Audit Verification Complete:`);
console.log(`   Total Checks:     ${totalChecks}`);
console.log(`   Passed:           ${passedChecks}`);
console.log(`   Failed / Warnings: ${securityWarnings}`);
console.log('================================================================\n');

if (securityWarnings > 0) {
  process.exit(1);
}
