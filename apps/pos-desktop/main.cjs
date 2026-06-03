const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');

const isPackaged = app.isPackaged;
const devRootDir = path.resolve(__dirname, '..', '..');
const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR;
const rootDir = isPackaged ? (portableExecutableDir || path.dirname(process.execPath)) : devRootDir;
const resourcesDir = isPackaged ? process.resourcesPath : rootDir;
const apiHost = process.env.TOKOBERSAMA_API_HOST || '127.0.0.1';
const backendHost = process.env.TOKOBERSAMA_API_BIND_HOST || process.env.TOKOBERSAMA_API_HOST || '0.0.0.0';
const apiPort = Number(process.env.TOKOBERSAMA_API_PORT || 8731);
const apiBaseUrl = `http://${apiHost}:${apiPort}`;
const backendDir = path.join(resourcesDir, 'local-api');
const bundledNodeBinary = path.join(resourcesDir, 'bin', 'node.exe');
const defaultNodeBinary = 'C:\\Program Files\\nodejs\\node.exe';
const nodeBinary = process.env.TOKOBERSAMA_NODE_BINARY
  || (fs.existsSync(bundledNodeBinary) ? bundledNodeBinary : '')
  || (fs.existsSync(defaultNodeBinary) ? defaultNodeBinary : 'node');
const frontendEntry = process.env.TOKOBERSAMA_FRONTEND_ENTRY
  ? path.resolve(process.env.TOKOBERSAMA_FRONTEND_ENTRY)
  : path.join(resourcesDir, 'pos-react-canvas', 'dist', 'index.html');
const backendScript = process.env.TOKOBERSAMA_BACKEND_ENTRY
  ? path.resolve(process.env.TOKOBERSAMA_BACKEND_ENTRY)
  : path.join(resourcesDir, 'local-api', 'dist', 'server.js');
const migrationScript = path.join(resourcesDir, 'local-api', 'dist', 'db', 'migrate.js');
const logDir = process.env.TOKOBERSAMA_LOG_DIR
  ? path.resolve(process.env.TOKOBERSAMA_LOG_DIR)
  : path.join(rootDir, 'logs');
const backendLog = path.join(logDir, 'electron-backend.log');
const startupLog = path.join(logDir, 'electron-main.log');
const defaultDataDir = path.join(rootDir, '.runtime', 'data');
const defaultBackupDir = path.join(defaultDataDir, 'backups');
const defaultDbPath = path.join(defaultDataDir, 'tokobersama.sqlite');
const manageBackend = process.env.TOKOBERSAMA_MANAGE_BACKEND !== '0';
const defaultProfileRoot = path.join(rootDir, '.runtime', 'electron-profile');
const electronProfileDir = process.env.TOKOBERSAMA_ELECTRON_PROFILE
  ? path.resolve(process.env.TOKOBERSAMA_ELECTRON_PROFILE)
  : defaultProfileRoot;
const electronSessionDir = path.join(electronProfileDir, 'session');
const electronCacheDir = path.join(electronProfileDir, 'cache');
const startupStartedAt = Date.now();
const disableGpu = process.env.TOKOBERSAMA_DISABLE_GPU === '1' || process.env.TOKOBERSAMA_DISABLE_GPU === 'true';

try {
  fs.mkdirSync(path.dirname(startupLog), { recursive: true });
  fs.appendFileSync(
    startupLog,
    [
      `[${new Date().toISOString()}] main bootstrap`,
      `argv=${process.argv.join(' | ')}`,
      `rootDir=${rootDir}`,
      `resourcesDir=${resourcesDir}`,
      `backendScript=${backendScript}`,
      `frontendEntry=${frontendEntry}`,
      `apiBaseUrl=${apiBaseUrl}`,
      `backendHost=${backendHost}`,
      `dbPath=${process.env.TOKOBERSAMA_DB_PATH || defaultDbPath}`,
      `backupDir=${process.env.TOKOBERSAMA_BACKUP_DIR || defaultBackupDir}`,
      '',
    ].join('\n')
  );
} catch {
  // Logging harus best-effort saja.
}

for (const dir of [electronProfileDir, electronSessionDir, electronCacheDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

app.setName('Tokobersama POS');
app.setPath('userData', electronProfileDir);
app.setPath('sessionData', electronSessionDir);
app.setPath('cache', electronCacheDir);
if (disableGpu) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
}
app.commandLine.appendSwitch('disk-cache-dir', electronCacheDir);
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-features', 'NetworkServiceSandbox');

let backendProcess = null;
let mainWindow = null;
let exitConfirmed = false;

ipcMain.handle('tokobersama:open-external', async (_event, url) => {
  const target = String(url || '').trim();
  if (!/^https?:\/\//i.test(target)) {
    throw new Error('URL eksternal tidak valid.');
  }
  await shell.openExternal(target);
});

function createSplashHtml(status, detail = '') {
  const safeStatus = String(status).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
  const safeDetail = String(detail).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

  return [
    '<!doctype html>',
    '<html lang="id">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<style>',
    'html,body{height:100%;margin:0;background:#111318;color:#eef2f6;font-family:Segoe UI,Arial,sans-serif;}',
    'body{display:grid;place-items:center;}',
    '.shell{width:min(520px,calc(100vw - 48px));display:grid;gap:18px;}',
    '.brand{display:flex;align-items:center;gap:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#cbd5e1;}',
    '.mark{width:34px;height:34px;border:1px solid #f59e0b;background:#f59e0b22;display:grid;place-items:center;color:#fbbf24;font-weight:800;}',
    '.panel{border:1px solid #2d333d;background:#171b22;padding:24px;box-shadow:0 24px 80px #0008;}',
    'h1{margin:0 0 10px;font-size:26px;line-height:1.15;letter-spacing:0;}',
    'p{margin:0;color:#94a3b8;font-size:14px;line-height:1.6;}',
    '.bar{height:4px;background:#2a303a;overflow:hidden;margin-top:20px;}',
    '.bar span{display:block;height:100%;width:42%;background:#f59e0b;animation:load 1.2s ease-in-out infinite;}',
    '@keyframes load{0%{transform:translateX(-110%)}100%{transform:translateX(250%)}}',
    '</style>',
    '</head>',
    '<body>',
    '<main class="shell">',
    '<div class="brand"><div class="mark">TB</div><div>TOKOBERSAMA POS</div></div>',
    `<section class="panel"><h1>${safeStatus}</h1><p>${safeDetail}</p><div class="bar"><span></span></div></section>`,
    '</main>',
    '</body>',
    '</html>',
  ].join('');
}

function showSplash(window, status, detail) {
  if (!window || window.isDestroyed()) return;
  void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createSplashHtml(status, detail))}`).catch((error) => {
    if (error?.errno === -3 || error?.code === 'ERR_ABORTED') {
      return;
    }
    try {
      fs.appendFileSync(startupLog, `[${new Date().toISOString()}] splash load failed\n${error?.stack || error?.message || String(error)}\n`);
    } catch {
      // Logging harus best-effort saja.
    }
  });
}

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

async function writePerformanceCheckpoint(label) {
  try {
    const memoryInfo = typeof process.getProcessMemoryInfo === 'function'
      ? await process.getProcessMemoryInfo()
      : null;
    const heap = process.memoryUsage();
    const elapsedMs = Date.now() - startupStartedAt;
    fs.appendFileSync(
      startupLog,
      [
        `[${new Date().toISOString()}] perf ${label}`,
        `elapsedMs=${elapsedMs}`,
        `gpuDisabled=${disableGpu ? '1' : '0'}`,
        `heapUsedMb=${(heap.heapUsed / 1024 / 1024).toFixed(1)}`,
        `rssMb=${(heap.rss / 1024 / 1024).toFixed(1)}`,
        memoryInfo ? `privateMb=${(memoryInfo.private / 1024).toFixed(1)}` : '',
        memoryInfo ? `workingSetMb=${(memoryInfo.workingSetSize / 1024).toFixed(1)}` : '',
        '',
      ].filter(Boolean).join('\n')
    );
  } catch {
    // Perf logging harus best-effort saja.
  }
}

function waitForBackend(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tick = () => {
      const request = http.get(`${url}/health`, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Backend tidak siap dalam ${timeoutMs}ms.`));
          return;
        }
        setTimeout(tick, 500);
      });

      request.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Backend tidak siap dalam ${timeoutMs}ms.`));
          return;
        }
        setTimeout(tick, 500);
      });
    };

    tick();
  });
}

function probeBackend(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const request = http.get(`${url}/health`, (response) => {
      response.resume();
      resolve(Boolean(response.statusCode && response.statusCode < 500));
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

function startBackend(onStatus = () => {}) {
  ensureLogDir();

  if (!fs.existsSync(backendScript)) {
    throw new Error(`Backend build tidak ditemukan: ${backendScript}`);
  }

  if (fs.existsSync(migrationScript)) {
    onStatus('Menyiapkan database', 'Migrasi lokal sedang diperiksa sebelum API dijalankan.');
    const migration = spawnSync(nodeBinary, [migrationScript], {
      cwd: backendDir,
      env: {
        ...process.env,
        TOKOBERSAMA_API_HOST: backendHost,
        TOKOBERSAMA_API_PORT: String(apiPort),
        TOKOBERSAMA_DB_PATH: process.env.TOKOBERSAMA_DB_PATH || defaultDbPath,
        TOKOBERSAMA_BACKUP_DIR: process.env.TOKOBERSAMA_BACKUP_DIR || defaultBackupDir,
      },
      encoding: 'utf8',
    });

    if (migration.status !== 0) {
      fs.appendFileSync(backendLog, `[${new Date().toISOString()}] migration failed\n${migration.stdout || ''}\n${migration.stderr || ''}\n`);
      throw new Error('Migrasi database gagal dijalankan.');
    }
  }

  onStatus('Menjalankan local API', 'Backend lokal sedang dinyalakan dan akan dicek melalui health endpoint.');
  const output = fs.createWriteStream(backendLog, { flags: 'a' });
  backendProcess = spawn(nodeBinary, [backendScript], {
    cwd: backendDir,
    env: {
      ...process.env,
      TOKOBERSAMA_API_HOST: backendHost,
      TOKOBERSAMA_API_PORT: String(apiPort),
      TOKOBERSAMA_DB_PATH: process.env.TOKOBERSAMA_DB_PATH || defaultDbPath,
      TOKOBERSAMA_BACKUP_DIR: process.env.TOKOBERSAMA_BACKUP_DIR || defaultBackupDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backendProcess.stdout?.pipe(output);
  backendProcess.stderr?.pipe(output);
  backendProcess.unref();
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1366,
    minHeight: 840,
    backgroundColor: '#12141a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  window.on('close', (event) => {
    if (exitConfirmed) {
      return;
    }

    const choice = dialog.showMessageBoxSync(window, {
      type: 'question',
      buttons: ['Batal', 'Keluar'],
      defaultId: 0,
      cancelId: 0,
      title: 'Konfirmasi keluar',
      message: 'Keluar dari TOKO BERSAMA POS?',
      detail: 'Sesi login akan berakhir dan user harus login ulang saat aplikasi dibuka kembali.',
      noLink: true,
    });

    if (choice !== 1) {
      event.preventDefault();
      return;
    }

    exitConfirmed = true;
  });

  return window;
}

async function bootstrap() {
  await writePerformanceCheckpoint('bootstrap-start');
  mainWindow = createWindow();
  showSplash(mainWindow, 'Memulai aplikasi', 'Tokobersama POS sedang menyiapkan runtime lokal.');

  let backendReady = await probeBackend(apiBaseUrl);
  if (!backendReady && manageBackend) {
    startBackend((status, detail) => showSplash(mainWindow, status, detail));
  }
  if (!backendReady) {
    try {
      showSplash(mainWindow, 'Menunggu local API', 'Aplikasi sedang menunggu backend siap menerima request.');
      await waitForBackend(apiBaseUrl, 8000);
      backendReady = true;
    } catch (error) {
      fs.appendFileSync(startupLog, `[${new Date().toISOString()}] backend unavailable, opening fallback UI\n`);
    }
  }

  if (backendReady) {
    process.env.TOKOBERSAMA_API_BASE_URL = apiBaseUrl;
    await writePerformanceCheckpoint('backend-ready');
  } else {
    delete process.env.TOKOBERSAMA_API_BASE_URL;
  }

  if (!fs.existsSync(frontendEntry)) {
    throw new Error(`Frontend build tidak ditemukan: ${frontendEntry}`);
  }

  showSplash(mainWindow, 'Membuka POS', backendReady ? 'Local API siap. Antarmuka kasir sedang dimuat.' : 'Backend lokal belum siap. Antarmuka fallback akan dibuka.');
  try {
    await mainWindow.loadFile(frontendEntry);
  } catch (error) {
    if (error?.errno !== -3 && error?.code !== 'ERR_ABORTED') {
      throw error;
    }
  }
  await writePerformanceCheckpoint('frontend-loaded');
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  void bootstrap().catch((error) => {
    try {
      fs.appendFileSync(startupLog, `[${new Date().toISOString()}] bootstrap failed\n${error?.stack || error?.message || String(error)}\n`);
    } catch {
      // Logging harus best-effort saja.
    }
    console.error(error);
    exitConfirmed = true;
    app.quit();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  exitConfirmed = true;
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
});
