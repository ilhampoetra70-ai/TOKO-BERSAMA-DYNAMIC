const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const {
  createPortableContext,
  removePath,
  summarizeDirectory,
} = require('./portable-runtime.cjs');

const rootDir = path.resolve(__dirname, '..');
const context = createPortableContext(rootDir);
const measurementPath = path.join(rootDir, 'release', 'startup-measurement.json');
let baseUrl = context.baseUrl;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const text = await response.text();
  return { response, data: text ? JSON.parse(text) : null };
}

async function waitForHealth(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const { response } = await request('/health');
      if (response.ok) return;
    } catch {
      // Server belum siap.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Portable local-api tidak siap.');
}

async function loadBackendApp() {
  const previousCwd = process.cwd();
  try {
    process.chdir(context.apiDir);

    await import(pathToFileURL(path.join(context.apiDir, 'dist', 'db', 'migrate.js')).href);

    const serverModule = await import(pathToFileURL(path.join(context.apiDir, 'dist', 'server.js')).href);
    assert(typeof serverModule.createApp === 'function', 'Export createApp tidak ditemukan.');
    return serverModule.createApp();
  } finally {
    process.chdir(previousCwd);
  }
}

async function main() {
  removePath(context.runtimeDir);
  fs.mkdirSync(context.backupDir, { recursive: true });

  assert(fs.existsSync(context.appExecutable), `Portable app executable tidak ditemukan: ${context.appExecutable}`);
  assert(fs.existsSync(context.nodeBinary), `Portable node runtime tidak ditemukan: ${context.nodeBinary}`);

  const startedAt = Date.now();
  const app = await loadBackendApp();
  await app.listen({
    host: '127.0.0.1',
    port: 0,
  });
  const address = app.server.address();
  assert(address && typeof address !== 'string' && typeof address.port === 'number', 'Alamat listen tidak valid.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  let mainBootstrapLogMs = Date.now() - startedAt;
  let healthReadyMs = null;

  try {
    await waitForHealth();
    healthReadyMs = Date.now() - startedAt;

    const artifactSummary = summarizeDirectory(context.useSingleExe ? context.portableExeDir : context.portableDir);
    const resourcesSummary = summarizeDirectory(context.resourcesDir);
    const nodeModulesSummary = summarizeDirectory(path.join(context.apiDir, 'node_modules'));
    const unpackedSummary = summarizeDirectory(context.portableExeUnpackedDir);
    const measurement = {
      timestamp: new Date().toISOString(),
      target: context.useSingleExe ? 'single' : 'folder',
      artifact: {
        path: context.appExecutable,
        sizeBytes: fs.statSync(context.appExecutable).size,
        treeFileCount: artifactSummary.fileCount,
        treeSizeBytes: artifactSummary.totalSizeBytes,
      },
      timings: {
        mainBootstrapLogMs,
        healthReadyMs,
      },
      payload: {
        resourcesDir: context.resourcesDir,
        resourcesFileCount: resourcesSummary.fileCount,
        resourcesSizeBytes: resourcesSummary.totalSizeBytes,
        nodeModulesFileCount: nodeModulesSummary.fileCount,
        nodeModulesSizeBytes: nodeModulesSummary.totalSizeBytes,
        winUnpackedFileCount: unpackedSummary.fileCount,
        winUnpackedSizeBytes: unpackedSummary.totalSizeBytes,
      },
      logPath: path.join(context.logDir, 'electron-main.log'),
    };

    fs.writeFileSync(measurementPath, JSON.stringify(measurement, null, 2));
    console.log(JSON.stringify(measurement, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
