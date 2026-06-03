const fs = require('node:fs');
const path = require('node:path');

function createPortableContext(rootDir) {
  const releaseDir = path.join(rootDir, 'release');
  const portableExeDir = path.join(releaseDir, 'portable-exe');
  const portableDir = path.join(releaseDir, 'TOKOBERSAMA-POS-Portable');
  const portableExe = path.join(portableExeDir, 'TOKOBERSAMA-POS-Portable.exe');
  const portableExeUnpackedDir = path.join(portableExeDir, 'win-unpacked');
  const portableExeResourcesDir = path.join(portableExeUnpackedDir, 'resources');
  const portableFolderResourcesDir = path.join(portableDir, 'resources');
  const portableAppExe = path.join(portableDir, 'TOKOBERSAMA POS.exe');
  const portableFolderAppExe = path.join(portableDir, 'electron.exe');
  const preferredTarget = process.env.TOKOBERSAMA_PORTABLE_TARGET || process.env.TOKOBERSAMA_SMOKE_TARGET;
  const singleExists = fs.existsSync(portableExe);
  const folderExists = fs.existsSync(portableAppExe);
  const singleManifest = readArtifactManifest(portableExeUnpackedDir);
  const folderManifest = readArtifactManifest(portableDir);
  const useSingleExe = preferredTarget === 'single'
    ? true
    : preferredTarget === 'folder'
      ? false
      : singleManifest?.builtAt && folderManifest?.builtAt
        ? Date.parse(singleManifest.builtAt) >= Date.parse(folderManifest.builtAt)
        : singleManifest?.builtAt
          ? true
          : folderManifest?.builtAt
            ? false
            : singleExists && folderExists
              ? fs.statSync(portableExe).mtimeMs >= fs.statSync(portableAppExe).mtimeMs
              : singleExists || !folderExists;
  const appExecutable = useSingleExe ? portableExe : portableAppExe;
  const appDir = useSingleExe ? portableExeDir : portableDir;
  const resourcesDir = useSingleExe ? portableExeResourcesDir : portableFolderResourcesDir;
  const apiDir = useSingleExe ? path.join(portableExeResourcesDir, 'local-api') : path.join(portableFolderResourcesDir, 'local-api');
  const nodeBinary = useSingleExe
    ? path.join(portableExeResourcesDir, 'bin', 'node.exe')
    : path.join(portableFolderResourcesDir, 'bin', 'node.exe');
  const runId = `${process.pid}-${Date.now().toString(36)}`;
  const runtimeDir = useSingleExe
    ? path.join(path.dirname(portableExe), '.runtime', `portable-smoke-${runId}`)
    : path.join(portableDir, '.runtime', `portable-smoke-${runId}`);

  return {
    rootDir,
    releaseDir,
    portableExeDir,
    portableDir,
    portableExe,
    portableExeUnpackedDir,
    portableExeResourcesDir,
    portableAppExe,
    portableFolderAppExe,
    useSingleExe,
    appExecutable,
    appDir,
    resourcesDir,
    portableFolderResourcesDir,
    apiDir,
    nodeBinary,
    runtimeDir,
    dbPath: path.join(runtimeDir, 'tokobersama-portable-smoke.sqlite'),
    backupDir: path.join(runtimeDir, 'backups'),
    logDir: path.join(runtimeDir, 'logs'),
    baseUrl: `http://127.0.0.1:${Number(process.env.TOKOBERSAMA_PORTABLE_SMOKE_PORT || 18732)}`,
  };
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyDir(from, to) {
  fs.cpSync(from, to, { recursive: true });
}

function copyFile(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function removePath(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function assertExists(target, label) {
  if (!fs.existsSync(target)) {
    throw new Error(`${label} tidak ditemukan: ${target}`);
  }
}

function summarizeDirectory(targetDir) {
  if (!fs.existsSync(targetDir)) {
    return {
      fileCount: 0,
      totalSizeBytes: 0,
    };
  }

  let fileCount = 0;
  let totalSizeBytes = 0;
  const stack = [targetDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      fileCount += 1;
      totalSizeBytes += fs.statSync(entryPath).size;
    }
  }

  return {
    fileCount,
    totalSizeBytes,
  };
}

function readArtifactManifest(targetDir) {
  const manifestPath = path.join(targetDir, 'artifact-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  createPortableContext,
  ensureDir,
  copyDir,
  copyFile,
  writeText,
  removePath,
  assertExists,
  summarizeDirectory,
  readArtifactManifest,
};
