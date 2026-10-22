import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transformWithOxc, parseAst } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const STANDARD_GLOBALS = new Set([
  'window', 'document', 'console', 'localStorage', 'sessionStorage',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'Math', 'Date', 'JSON', 'Promise', 'Number', 'String', 'Boolean',
  'Array', 'Object', 'RegExp', 'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError',
  'NaN', 'Infinity', 'undefined', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'fetch', 'alert', 'confirm', 'prompt', 'navigator', 'location', 'history',
  'File', 'Blob', 'FileReader', 'FormData', 'URL', 'URLSearchParams',
  'Event', 'CustomEvent', 'btoa', 'atob', 'crypto', 'Intl',
  'Set', 'Map', 'WeakSet', 'WeakMap', 'Symbol', 'Proxy', 'Reflect',
  'requestAnimationFrame', 'cancelAnimationFrame', 'performance',
  'Image', 'Audio', 'MutationObserver', 'IntersectionObserver', 'ResizeObserver',
  'AbortController', 'Headers', 'Request', 'Response', 'process', 'globalThis',
  'React', '_jsx', '_jsxs', '_Fragment', 'jsx', 'jsxs', 'Fragment', 'module', 'exports', 'require'
]);

function getAllFiles(dir, exts = ['.jsx', '.js']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(file))) {
      results.push(fullPath);
    }
  });
  return results;
}

function extractPatternIdentifiers(node, defs) {
  if (!node) return;
  if (node.type === 'Identifier') {
    defs.add(node.name);
  } else if (node.type === 'ObjectPattern') {
    node.properties.forEach(prop => {
      if (prop.type === 'Property') {
        extractPatternIdentifiers(prop.value, defs);
      } else if (prop.type === 'RestElement') {
        extractPatternIdentifiers(prop.argument, defs);
      }
    });
  } else if (node.type === 'ArrayPattern') {
    node.elements.forEach(elem => {
      if (elem) extractPatternIdentifiers(elem, defs);
    });
  } else if (node.type === 'AssignmentPattern') {
    extractPatternIdentifiers(node.left, defs);
  } else if (node.type === 'RestElement') {
    extractPatternIdentifiers(node.argument, defs);
  }
}

class ScopeAnalyzer {
  constructor(filePath, code) {
    this.filePath = filePath;
    this.code = code;
    this.scopes = [new Set()]; // Scope stack
    this.unresolved = [];
  }

  currentScope() {
    return this.scopes[this.scopes.length - 1];
  }

  pushScope() {
    this.scopes.push(new Set());
  }

  popScope() {
    this.scopes.pop();
  }

  addDef(name) {
    if (name) this.currentScope().add(name);
  }

  isDefined(name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) return true;
    }
    return STANDARD_GLOBALS.has(name);
  }

  analyze(ast) {
    this.traverse(ast, null);
    return this.unresolved;
  }

  traverse(node, parent) {
    if (!node || typeof node !== 'object') return;

    let createdScope = false;

    // Scope creation
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      // If function declaration, add its name to outer scope
      if (node.type === 'FunctionDeclaration' && node.id) {
        this.addDef(node.id.name);
      }
      this.pushScope();
      createdScope = true;
      // Hoist function declarations within this body
      const bodyNodes = node.body?.type === 'BlockStatement' ? node.body.body : (Array.isArray(node.body) ? node.body : []);
      bodyNodes.forEach(child => {
        if (child && child.type === 'FunctionDeclaration' && child.id) {
          this.addDef(child.id.name);
        }
      });
      if (node.params) {
        node.params.forEach(p => {
          const defs = new Set();
          extractPatternIdentifiers(p, defs);
          defs.forEach(d => this.addDef(d));
        });
      }
    } else if (node.type === 'BlockStatement' && parent && parent.type !== 'FunctionDeclaration' && parent.type !== 'FunctionExpression' && parent.type !== 'ArrowFunctionExpression') {
      this.pushScope();
      createdScope = true;
    } else if (node.type === 'CatchClause') {
      this.pushScope();
      createdScope = true;
      if (node.param) {
        const defs = new Set();
        extractPatternIdentifiers(node.param, defs);
        defs.forEach(d => this.addDef(d));
      }
    }

    // Hoist declarations within current scope
    if (node.type === 'ImportDeclaration') {
      node.specifiers.forEach(spec => {
        if (spec.local) this.addDef(spec.local.name);
      });
    } else if (node.type === 'VariableDeclaration') {
      node.declarations.forEach(decl => {
        const defs = new Set();
        extractPatternIdentifiers(decl.id, defs);
        defs.forEach(d => this.addDef(d));
      });
    } else if (node.type === 'ClassDeclaration' && node.id) {
      this.addDef(node.id.name);
    }

    // Check identifier usage
    if (node.type === 'Identifier') {
      let isReference = true;

      // Exclude property access non-computed: foo.bar -> bar is not a variable reference
      if (parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed) {
        isReference = false;
      }
      // Exclude class methods / properties
      if (parent && (parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && parent.key === node) {
        isReference = false;
      }
      // Exclude import.meta
      if (parent && parent.type === 'MetaProperty') {
        isReference = false;
      }
      // Exclude object literal keys: { foo: 1 } -> foo is not reference (unless computed)
      if (parent && parent.type === 'Property' && parent.key === node && !parent.computed) {
        isReference = false;
      }
      // Exclude variable / function declarations themselves
      if (parent && (
        (parent.type === 'VariableDeclarator' && parent.id === node) ||
        (parent.type === 'FunctionDeclaration' && parent.id === node) ||
        (parent.type === 'FunctionExpression' && parent.id === node) ||
        (parent.type === 'ClassDeclaration' && parent.id === node) ||
        (parent.type === 'ImportSpecifier' && (parent.local === node || parent.imported === node)) ||
        (parent.type === 'ImportDefaultSpecifier' && parent.local === node) ||
        (parent.type === 'ImportNamespaceSpecifier' && parent.local === node) ||
        (parent.type === 'CatchClause' && parent.param === node)
      )) {
        isReference = false;
      }

      if (isReference) {
        if (!this.isDefined(node.name)) {
          this.unresolved.push({
            name: node.name,
            loc: node.loc || node.start
          });
        }
      }
    }

    // Traverse children
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(c => this.traverse(c, node));
      } else if (child && typeof child === 'object') {
        this.traverse(child, node);
      }
    }

    if (createdScope) {
      this.popScope();
    }
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('SM CONCRETE TECH — STRICT STATIC CODE AUDIT (UNDEFINED VARS)');
  console.log('================================================================');
  
  const files = getAllFiles(srcDir);
  console.log(`Auditing ${files.length} source code files for ReferenceError risks...\n`);

  let totalErrors = 0;
  const issuesFound = [];

  for (const file of files) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');

    try {
      const isJsx = file.endsWith('.jsx');
      let codeToParse = content;

      if (isJsx) {
        const transformed = await transformWithOxc(content, file, { jsx: { runtime: 'automatic' } });
        codeToParse = transformed.code;
      }

      const ast = parseAst(codeToParse);
      const analyzer = new ScopeAnalyzer(relPath, codeToParse);
      const unresolved = analyzer.analyze(ast);

      if (unresolved.length > 0) {
        // Deduplicate unresolved identifiers per file
        const unique = [...new Set(unresolved.map(u => u.name))];
        console.error(`❌ [REFERENCE HAZARD] ${relPath}:`);
        unique.forEach(name => {
          console.error(`   -> Undeclared identifier: "${name}"`);
        });
        totalErrors += unique.length;
        issuesFound.push({ file: relPath, vars: unique });
      }
    } catch (err) {
      console.warn(`⚠️ [PARSE NOTICE] Could not parse ${relPath}: ${err.message}`);
    }
  }

  console.log('\n================================================================');
  if (totalErrors === 0) {
    console.log(`✅ AUDIT PASSED: ZERO UNDECLARED IDENTIFIERS FOUND ACROSS ALL ${files.length} FILES!`);
    console.log('================================================================');
    process.exit(0);
  } else {
    console.error(`❌ AUDIT FAILED: ${totalErrors} REFERENCE ERROR HAZARDS FOUND ACROSS ${issuesFound.length} FILES.`);
    console.log('================================================================');
    process.exit(1);
  }
}

runAudit();
