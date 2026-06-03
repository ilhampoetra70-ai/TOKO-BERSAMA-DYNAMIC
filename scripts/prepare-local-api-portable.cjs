const fs = require('node:fs');
const path = require('node:path');

const {
  assertExists,
  copyDir,
  copyFile,
  ensureDir,
  removePath,
} = require('./portable-runtime.cjs');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'local-api');
const stageDir = path.join(rootDir, 'release', 'portable-local-api');
const apiPackagePath = path.join(apiDir, 'package.json');
const apiPackage = JSON.parse(fs.readFileSync(apiPackagePath, 'utf8'));
const esbuildBinary = process.platform === 'win32'
  ? path.join(apiDir, 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe')
  : path.join(apiDir, 'node_modules', 'esbuild', 'bin', 'esbuild');

function bundleEntry(entryPoint, outfile) {
  const result = process.platform === 'win32'
    ? require('node:child_process').spawnSync(esbuildBinary, [
        entryPoint,
        '--bundle',
        '--platform=node',
        '--format=esm',
        '--target=node20',
        '--external:better-sqlite3',
        '--banner:js=import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
        '--legal-comments=none',
        '--log-level=warning',
        `--outfile=${outfile}`,
      ], {
        stdio: 'inherit',
        shell: false,
      })
    : require('node:child_process').spawnSync(process.execPath, [
        esbuildBinary,
        entryPoint,
        '--bundle',
        '--platform=node',
        '--format=esm',
        '--target=node20',
        '--external:better-sqlite3',
        '--banner:js=import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
        '--legal-comments=none',
        '--log-level=warning',
        `--outfile=${outfile}`,
      ], {
        stdio: 'inherit',
        shell: false,
      });

  if (result.error || result.status !== 0) {
    throw new Error([
      `Bundling gagal untuk ${path.basename(entryPoint)}.`,
      result.error ? `error: ${result.error.message}` : '',
    ].filter(Boolean).join('\n'));
  }
}

function copyPackageRuntime(sourceDir, targetDir, entries) {
  removePath(targetDir);
  ensureDir(targetDir);

  for (const entry of entries) {
    const source = path.join(sourceDir, entry);
    assertExists(source, `${path.basename(sourceDir)} runtime entry`);
    const stat = fs.statSync(source);
    const target = path.join(targetDir, entry);

    if (stat.isDirectory()) {
      copyDir(source, target);
      continue;
    }

    copyFile(source, target);
  }
}

function stageRuntimePackage(packageName, entries) {
  const sourceDir = path.join(apiDir, 'node_modules', packageName);
  const targetDir = path.join(stageDir, 'node_modules', packageName);
  copyPackageRuntime(sourceDir, targetDir, entries);
}

removePath(stageDir);
ensureDir(stageDir);

fs.writeFileSync(
  path.join(stageDir, 'package.json'),
  JSON.stringify({
    name: 'tokobersama-local-api-portable',
    private: true,
    type: 'module',
    dependencies: {
      'better-sqlite3': apiPackage.dependencies?.['better-sqlite3'],
    },
  }, null, 2)
);

bundleEntry(path.join(apiDir, 'src', 'server.ts'), path.join(stageDir, 'dist', 'server.js'));
bundleEntry(path.join(apiDir, 'src', 'db', 'migrate.ts'), path.join(stageDir, 'dist', 'db', 'migrate.js'));

copyDir(path.join(apiDir, 'src', 'db', 'migrations'), path.join(stageDir, 'src', 'db', 'migrations'));

stageRuntimePackage('better-sqlite3', [
  'package.json',
  'lib',
  path.join('build', 'Release', 'better_sqlite3.node'),
]);
stageRuntimePackage('bindings', [
  'package.json',
  'bindings.js',
]);
stageRuntimePackage('file-uri-to-path', [
  'package.json',
  'index.js',
]);

assertExists(path.join(stageDir, 'dist', 'server.js'), 'Backend bundle server.js');
assertExists(path.join(stageDir, 'dist', 'db', 'migrate.js'), 'Backend bundle migrate.js');
assertExists(path.join(stageDir, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'), 'better-sqlite3 native binding');

console.log(`Portable local-api siap: ${stageDir}`);
