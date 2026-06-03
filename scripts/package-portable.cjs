const fs = require('node:fs');
const path = require('node:path');

const {
  assertExists,
  copyDir,
  copyFile,
  writeText,
  removePath,
} = require('./portable-runtime.cjs');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const portableDir = path.join(releaseDir, 'TOKOBERSAMA-POS-Portable');
const portableLocalApiDir = path.join(releaseDir, 'portable-local-api');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const systemNodeBinary = process.env.TOKOBERSAMA_NODE_BINARY || 'C:\\Program Files\\nodejs\\node.exe';
const resourcesDir = path.join(portableDir, 'resources');

assertExists(electronDistDir, 'Electron runtime');
assertExists(path.join(rootDir, 'pos-react-canvas', 'dist', 'index.html'), 'Frontend build');
assertExists(path.join(portableLocalApiDir, 'dist', 'server.js'), 'Portable backend build');
assertExists(path.join(portableLocalApiDir, 'dist', 'db', 'migrate.js'), 'Portable migration build');
assertExists(path.join(portableLocalApiDir, 'src', 'db', 'migrations'), 'SQL migrations');
assertExists(path.join(portableLocalApiDir, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'), 'better-sqlite3 native binding');
assertExists(path.join(rootDir, 'apps', 'pos-desktop', 'main.cjs'), 'Electron main process');
assertExists(systemNodeBinary, 'Node runtime');

removePath(portableDir);
fs.mkdirSync(portableDir, { recursive: true });

copyDir(electronDistDir, portableDir);

const electronExe = path.join(portableDir, 'electron.exe');
const appExe = path.join(portableDir, 'TOKOBERSAMA POS.exe');
if (!fs.existsSync(electronExe)) {
  throw new Error(`Electron executable tidak ditemukan setelah copy: ${electronExe}`);
}

removePath(appExe);
fs.renameSync(electronExe, appExe);
assertExists(appExe, 'Portable app executable');

copyFile(systemNodeBinary, path.join(resourcesDir, 'bin', 'node.exe'));

const appDir = path.join(resourcesDir, 'app');
copyFile(path.join(rootDir, 'apps', 'pos-desktop', 'main.cjs'), path.join(appDir, 'main.cjs'));
copyFile(path.join(rootDir, 'apps', 'pos-desktop', 'preload.cjs'), path.join(appDir, 'preload.cjs'));
copyFile(path.join(rootDir, 'apps', 'pos-desktop', 'package.json'), path.join(appDir, 'package.json'));

copyDir(path.join(rootDir, 'pos-react-canvas', 'dist'), path.join(resourcesDir, 'pos-react-canvas', 'dist'));
copyDir(path.join(portableLocalApiDir, 'dist'), path.join(resourcesDir, 'local-api', 'dist'));
copyDir(path.join(portableLocalApiDir, 'src', 'db', 'migrations'), path.join(resourcesDir, 'local-api', 'src', 'db', 'migrations'));
copyDir(path.join(portableLocalApiDir, 'node_modules'), path.join(resourcesDir, 'local-api', 'node_modules'));
copyFile(path.join(portableLocalApiDir, 'package.json'), path.join(resourcesDir, 'local-api', 'package.json'));

writeText(path.join(portableDir, 'START_TOKOBERSAMA_POS.bat'), [
  '@echo off',
  'setlocal EnableExtensions',
  'set "ROOT=%~dp0"',
  'set "TOKOBERSAMA_API_HOST=127.0.0.1"',
  'set "TOKOBERSAMA_API_PORT=8731"',
  'set "TOKOBERSAMA_ELECTRON_PROFILE=%ROOT%.runtime\\electron-profile"',
  'start "" "%ROOT%TOKOBERSAMA POS.exe"',
  '',
].join('\r\n'));

writeText(path.join(portableDir, 'README_PORTABLE.txt'), [
  'TOKO BERSAMA POS - Portable',
  '',
  'Cara jalan:',
  '1. Buka START_TOKOBERSAMA_POS.bat atau TOKOBERSAMA POS.exe.',
  '2. Data SQLite tersimpan di .runtime\\data\\tokobersama.sqlite.',
  '3. Backup database tersimpan di .runtime\\data\\backups.',
  '4. Folder .runtime berisi profil aplikasi Electron lokal.',
  '',
  'Catatan:',
  '- Jangan hapus folder resources, bin, locales, atau file exe.',
  '- Untuk memindahkan aplikasi ke komputer lain, pindahkan satu folder TOKOBERSAMA-POS-Portable ini.',
].join('\r\n'));

writeText(path.join(portableDir, 'artifact-manifest.json'), JSON.stringify({
  target: 'folder',
  builtAt: new Date().toISOString(),
  appExecutable: 'TOKOBERSAMA POS.exe',
}, null, 2));

console.log(`PORTABLE_OK ${portableDir}`);
