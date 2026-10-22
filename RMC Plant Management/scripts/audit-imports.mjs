import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

const files = walk(path.join(rootDir, 'src'));
let brokenImports = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const importLines = content.split('\n').filter(l => l.trim().startsWith('import '));
  for (const line of importLines) {
    const match = line.match(/from\s+['"](.*)['"]/);
    if (match && match[1]) {
      const impPath = match[1];
      if (impPath.startsWith('.')) {
        const resolvedBase = path.resolve(path.dirname(f), impPath);
        const candidates = [
          resolvedBase,
          resolvedBase + '.js',
          resolvedBase + '.jsx',
          resolvedBase + '.json',
          resolvedBase + '.png',
          resolvedBase + '.jpg',
          resolvedBase + '.svg',
          path.join(resolvedBase, 'index.js'),
          path.join(resolvedBase, 'index.jsx')
        ];
        const exists = candidates.some(c => fs.existsSync(c));
        if (!exists) {
          brokenImports.push({ file: path.relative(rootDir, f), line: line.trim(), resolvedBase });
        }
      }
    }
  }
}

console.log('--- RELATIVE IMPORT AUDIT ---');
if (brokenImports.length === 0) {
  console.log('✅ ALL relative imports resolve to real files on disk!');
} else {
  console.log('❌ Broken imports found:', JSON.stringify(brokenImports, null, 2));
}
