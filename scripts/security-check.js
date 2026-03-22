#!/usr/bin/env node

/**
 * Repository security guard for supply-chain style tampering.
 * - Blocks dangerous npm lifecycle scripts in root package.json
 * - Blocks suspicious root-level install hook files
 * - Scans executable source/config files for high-risk obfuscation/runtime-exec indicators
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const LIFECYCLE_SCRIPTS_DENYLIST = [
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'prepublishOnly',
  'prepare',
  'preprepare',
  'postprepare',
];

const SUSPICIOUS_ROOT_FILENAMES = [
  'preinstall.js',
  'preinstall.cjs',
  'preinstall.mjs',
  'postinstall.js',
  'postinstall.cjs',
  'postinstall.mjs',
  'install.js',
  'install.cjs',
  'install.mjs',
  'prepare.js',
  'prepare.cjs',
  'prepare.mjs',
];

const SCAN_DIR_ALLOWLIST = [
  'src',
  'scripts',
  '.github',
];

const SCAN_ROOT_FILES = [
  'package.json',
  'next.config.ts',
  'eslint.config.mjs',
  'postcss.config.mjs',
  'preinstall.js',
];

const FILE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx']);

const SUSPICIOUS_PATTERNS = [
  { regex: /eval\s*\(/g, reason: 'Use of eval(...)' },
  { regex: /new\s+Function\s*\(/g, reason: 'Use of new Function(...)' },
  { regex: /createDecipheriv\s*\(/g, reason: 'Runtime decryption primitive (createDecipheriv)' },
  { regex: /child_process/g, reason: 'Node child_process usage' },
  { regex: /Buffer\.from\s*\(\s*s\s*\(`/, reason: 'Encoded payload + runtime decoding pattern' },
  { regex: /[\u{E0100}-\u{E01EF}]/gu, reason: 'Unicode supplementary variation selector (possible hidden encoding)' },
];

const FAILURES = [];
const WARNINGS = [];

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function addFailure(message) {
  FAILURES.push(message);
}

function addWarning(message) {
  WARNINGS.push(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function checkPackageScripts() {
  const packageJsonPath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    addFailure('Missing package.json in repository root.');
    return;
  }

  let pkg;
  try {
    pkg = JSON.parse(readText(packageJsonPath));
  } catch (error) {
    addFailure(`Unable to parse package.json: ${error.message}`);
    return;
  }

  const scripts = pkg.scripts || {};
  for (const scriptName of LIFECYCLE_SCRIPTS_DENYLIST) {
    if (Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
      addFailure(
        `Disallowed npm lifecycle script detected: scripts.${scriptName} = ${JSON.stringify(scripts[scriptName])}`
      );
    }
  }
}

function checkSuspiciousRootFiles() {
  for (const filename of SUSPICIOUS_ROOT_FILENAMES) {
    const filePath = path.join(ROOT, filename);
    if (fs.existsSync(filePath)) {
      addFailure(`Disallowed root hook-like file detected: ${filename}`);
    }
  }
}

function shouldScanPath(filePath) {
  const relativePath = rel(filePath);
  if (!relativePath || relativePath.startsWith('node_modules/') || relativePath.startsWith('.git/')) {
    return false;
  }

  if (relativePath === 'scripts/security-check.js') {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  return FILE_EXTENSIONS.has(ext);
}

function collectFilesRecursively(dirPath, out = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = rel(fullPath);

    if (entry.isDirectory()) {
      if (
        relativePath.startsWith('node_modules/') ||
        relativePath.startsWith('.next/') ||
        relativePath.startsWith('out/') ||
        relativePath.startsWith('build/') ||
        relativePath.startsWith('coverage/') ||
        relativePath.startsWith('.git/') ||
        relativePath.startsWith('Summaries/')
      ) {
        continue;
      }
      collectFilesRecursively(fullPath, out);
      continue;
    }

    if (shouldScanPath(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function scanFile(filePath) {
  let content;
  try {
    content = readText(filePath);
  } catch (error) {
    addWarning(`Could not read ${rel(filePath)}: ${error.message}`);
    return;
  }

  const lines = content.split(/\r?\n/);
  for (const { regex, reason } of SUSPICIOUS_PATTERNS) {
    regex.lastIndex = 0;
    const match = regex.exec(content);
    if (!match) continue;

    const index = match.index ?? 0;
    const lineNumber = content.slice(0, index).split(/\r?\n/).length;
    const line = lines[lineNumber - 1] ?? '';
    addFailure(`${rel(filePath)}:${lineNumber} — ${reason}. Snippet: ${line.trim()}`);
  }
}

function scanCodeFiles() {
  const filesToScan = [];

  for (const dir of SCAN_DIR_ALLOWLIST) {
    const dirPath = path.join(ROOT, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      collectFilesRecursively(dirPath, filesToScan);
    }
  }

  for (const filename of SCAN_ROOT_FILES) {
    const filePath = path.join(ROOT, filename);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile() && shouldScanPath(filePath)) {
      filesToScan.push(filePath);
    }
  }

  const unique = [...new Set(filesToScan)];
  for (const filePath of unique) {
    scanFile(filePath);
  }
}

function printReport() {
  const divider = '-'.repeat(72);
  console.log(divider);
  console.log('Repository Security Check');
  console.log(divider);

  if (WARNINGS.length > 0) {
    console.log('\nWarnings:');
    for (const warning of WARNINGS) {
      console.log(`  - ${warning}`);
    }
  }

  if (FAILURES.length > 0) {
    console.log('\nFailures:');
    for (const failure of FAILURES) {
      console.log(`  - ${failure}`);
    }
    console.log('\nResult: FAILED');
    process.exitCode = 1;
    return;
  }

  console.log('\nResult: PASSED');
}

function main() {
  checkPackageScripts();
  checkSuspiciousRootFiles();
  scanCodeFiles();
  printReport();
}

main();
