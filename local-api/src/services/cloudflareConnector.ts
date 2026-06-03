import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';
import { DomainError } from '../core/errors.js';

const cloudflaredDownloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
const connectorDir = path.join(path.dirname(config.dbPath), 'cloudflare');
const configPath = path.join(connectorDir, 'connector.json');
const logPath = path.join(connectorDir, 'cloudflared.log');
const bundledBinaryPath = path.join(connectorDir, 'cloudflared.exe');
const managedTunnelNote = 'Origin dan hostname untuk token tunnel diatur di Cloudflare Dashboard. Nilai di aplikasi ini dipakai untuk preflight dan panduan operator.';

export type CloudflareConnectorConfig = {
  token: string;
  originUrl: string;
  publicHostname: string;
  publicUrl: string;
  binaryPath: string;
  autoStart: boolean;
};

export type CloudflareConnectorStatus = {
  installed: boolean;
  running: boolean;
  connected: boolean;
  tokenConfigured: boolean;
  originUrl: string;
  publicHostname: string;
  publicUrl: string;
  binaryPath: string;
  logPath: string;
  lastMessage: string;
  pid: number | null;
  version: string;
  bundledAvailable: boolean;
  state: 'not-installed' | 'not-configured' | 'stopped' | 'starting' | 'connected' | 'error';
  note: string;
  service: CloudflareServiceStatus;
};

export type CloudflareServiceStatus = {
  installed: boolean;
  running: boolean;
  startType: string;
  canStop: boolean;
  serviceName: string;
  displayName: string;
  binaryPath: string;
  lastError: string;
};

let tunnelProcess: ChildProcessWithoutNullStreams | null = null;
let lastMessage = '';

function ensureConnectorDir() {
  fs.mkdirSync(connectorDir, { recursive: true });
}

function defaultConfig(): CloudflareConnectorConfig {
  return {
    token: '',
    originUrl: `http://127.0.0.1:${config.port}`,
    publicHostname: '',
    publicUrl: '',
    binaryPath: bundledBinaryPath,
    autoStart: false,
  };
}

function getTokenKey() {
  const material = [
    process.env.COMPUTERNAME,
    process.env.USERDOMAIN,
    process.env.USERNAME,
    path.dirname(config.dbPath),
    'tokobersama-cloudflare-connector-v1',
  ].filter(Boolean).join('|');

  return crypto.createHash('sha256').update(material).digest();
}

function protectToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getTokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function unprotectToken(value: string) {
  if (!value.startsWith('v1:')) return '';

  try {
    const [, ivBase64, tagBase64, encryptedBase64] = value.split(':');
    if (!ivBase64 || !tagBase64 || !encryptedBase64) return '';
    const decipher = crypto.createDecipheriv('aes-256-gcm', getTokenKey(), Buffer.from(ivBase64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedBase64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}

function appendLog(message: string) {
  ensureConnectorDir();
  lastMessage = message;
  fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`, 'utf8');
}

function normalizeBinaryPath(value: string) {
  const trimmed = value.trim();
  return trimmed || bundledBinaryPath;
}

function normalizePublicHostname(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).hostname.trim();
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').split('/')[0]?.trim() ?? '';
  }
}

function normalizePublicUrl(value: string, hostname: string) {
  const trimmed = value.trim();
  if (trimmed) {
    try {
      const parsed = new URL(trimmed);
      return parsed.toString().replace(/\/+$/, '');
    } catch {
      const normalizedHost = normalizePublicHostname(trimmed);
      return normalizedHost ? `https://${normalizedHost}` : '';
    }
  }

  return hostname ? `https://${hostname}` : '';
}

function normalizePublicFields(publicHostname: string, publicUrl: string) {
  const hostnameFromField = normalizePublicHostname(publicHostname);
  const hostnameFromUrl = normalizePublicHostname(publicUrl);
  const hostname = hostnameFromField || hostnameFromUrl;
  return {
    publicHostname: hostname,
    publicUrl: normalizePublicUrl(publicUrl, hostname),
  };
}

function redactTunnelToken(value: string) {
  return value.replace(/--token\s+\S+/gi, '--token [tersimpan]');
}

function resolveBundledBinaryCandidates() {
  return [
    process.env.TOKOBERSAMA_CLOUDFLARED_BINARY,
    path.resolve(process.cwd(), '..', 'cloudflare', 'cloudflared.exe'),
    path.resolve(process.cwd(), '..', 'vendor', 'cloudflared', 'cloudflared.exe'),
    path.resolve(process.cwd(), 'vendor', 'cloudflared', 'cloudflared.exe'),
    path.resolve(process.cwd(), '..', '..', 'vendor', 'cloudflared', 'cloudflared.exe'),
  ].filter(Boolean) as string[];
}

function resolveBundledBinaryPath() {
  return resolveBundledBinaryCandidates().find((candidate) => fs.existsSync(candidate)) ?? '';
}

function isTunnelProcessRunning() {
  return Boolean(tunnelProcess && !tunnelProcess.killed && tunnelProcess.exitCode === null);
}

function readLogText() {
  ensureConnectorDir();
  if (!fs.existsSync(logPath)) return '';
  return fs.readFileSync(logPath, 'utf8');
}

function detectConnectedFromLogs() {
  const logText = readLogText().slice(-20000).toLowerCase();
  if (!logText) return false;
  return [
    'registered tunnel connection',
    'connection established',
    'serving tunnel connection',
    'connected to',
  ].some((pattern) => logText.includes(pattern));
}

function detectErrorFromLogs() {
  const logText = readLogText().slice(-12000).toLowerCase();
  if (!logText) return false;
  return ['failed to', 'error', 'unable to', 'invalid token', 'unauthorized'].some((pattern) => logText.includes(pattern));
}

function readBinaryVersion(binaryPath: string) {
  if (!fs.existsSync(binaryPath)) return '';
  const result = spawnSync(binaryPath, ['--version'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000,
  });

  return (result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] ?? '';
}

function readCloudflaredServiceStatus(): CloudflareServiceStatus {
  const fallback: CloudflareServiceStatus = {
    installed: false,
    running: false,
    startType: '',
    canStop: false,
    serviceName: 'Cloudflared',
    displayName: '',
    binaryPath: '',
    lastError: '',
  };

  if (process.platform !== 'win32') {
    return {
      ...fallback,
      lastError: 'Windows Service hanya tersedia di Windows.',
    };
  }

  const query = spawnSync('sc.exe', ['query', 'Cloudflared'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000,
  });
  const queryText = `${query.stdout || ''}\n${query.stderr || ''}`;
  if (query.error) {
    return {
      ...fallback,
      lastError: query.error.message,
    };
  }
  if (query.status !== 0 || /does not exist|FAILED 1060/i.test(queryText)) {
    return fallback;
  }

  const qc = spawnSync('sc.exe', ['qc', 'Cloudflared'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000,
  });
  const qcText = `${qc.stdout || ''}\n${qc.stderr || ''}`;
  const state = queryText.match(/STATE\s+:\s+\d+\s+(\w+)/i)?.[1] ?? '';
  const startType = qcText.match(/START_TYPE\s+:\s+\d+\s+([^\r\n]+)/i)?.[1]?.trim() ?? '';
  const displayName = qcText.match(/DISPLAY_NAME\s+:\s+([^\r\n]+)/i)?.[1]?.trim() ?? 'Cloudflared';
  const binaryPath = qcText.match(/BINARY_PATH_NAME\s+:\s+([^\r\n]+)/i)?.[1]?.trim() ?? '';

  return {
    installed: true,
    running: state.toUpperCase() === 'RUNNING',
    startType,
    canStop: /STOPPABLE|RUNNING/i.test(queryText),
    serviceName: 'Cloudflared',
    displayName,
    binaryPath: redactTunnelToken(binaryPath),
    lastError: qc.status === 0 ? '' : qcText.trim(),
  };
}

function runCloudflaredServiceCommand(args: string[]) {
  const current = readCloudflareConnectorConfig();
  const binaryPath = current.binaryPath || bundledBinaryPath;
  if (!fs.existsSync(binaryPath)) {
    throw new DomainError('cloudflared.exe belum tersedia. Klik Install Binary dulu.', 'CLOUDFLARED_NOT_INSTALLED', 400);
  }

  const result = spawnSync(binaryPath, args, {
    cwd: connectorDir,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  if (result.status !== 0) {
    const adminHint = 'Jalankan aplikasi sebagai Administrator, lalu ulangi aksi ini.';
    throw new DomainError(`${output || 'Perintah Windows Service gagal.'} ${adminHint}`, 'CLOUDFLARED_SERVICE_COMMAND_FAILED', 500);
  }
  if (output) appendLog(redactTunnelToken(output));
}

function runServiceControl(action: 'start' | 'stop') {
  if (process.platform !== 'win32') {
    throw new DomainError('Windows Service hanya tersedia di Windows.', 'CLOUDFLARED_SERVICE_UNSUPPORTED', 400);
  }

  const result = spawnSync('sc.exe', [action, 'Cloudflared'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15000,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  if (result.status !== 0 && !/already been started|service has not been started/i.test(output)) {
    throw new DomainError(`${output || 'Kontrol Windows Service gagal.'} Jalankan aplikasi sebagai Administrator jika diperlukan.`, 'CLOUDFLARED_SERVICE_CONTROL_FAILED', 500);
  }
  appendLog(`Service Cloudflared ${action}: ${output || 'OK'}`);
}

export function readCloudflareConnectorConfig(): CloudflareConnectorConfig {
  ensureConnectorDir();
  if (!fs.existsSync(configPath)) {
    return defaultConfig();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<CloudflareConnectorConfig>;
    const fallback = defaultConfig();
    const raw = parsed as Partial<CloudflareConnectorConfig> & { tokenProtected?: string };
    const token = typeof raw.tokenProtected === 'string'
      ? unprotectToken(raw.tokenProtected)
      : typeof raw.token === 'string'
        ? raw.token
        : fallback.token;

    const publicFields = normalizePublicFields(
      typeof parsed.publicHostname === 'string' ? parsed.publicHostname : fallback.publicHostname,
      typeof parsed.publicUrl === 'string' ? parsed.publicUrl : fallback.publicUrl,
    );

    return {
      token,
      originUrl: typeof parsed.originUrl === 'string' && parsed.originUrl.trim() ? parsed.originUrl.trim() : fallback.originUrl,
      publicHostname: publicFields.publicHostname,
      publicUrl: publicFields.publicUrl,
      binaryPath: normalizeBinaryPath(typeof parsed.binaryPath === 'string' ? parsed.binaryPath : fallback.binaryPath),
      autoStart: Boolean(parsed.autoStart),
    };
  } catch {
    return defaultConfig();
  }
}

export function saveCloudflareConnectorConfig(input: Partial<CloudflareConnectorConfig>) {
  ensureConnectorDir();
  const current = readCloudflareConnectorConfig();
  const publicFields = normalizePublicFields(
    typeof input.publicHostname === 'string' ? input.publicHostname : current.publicHostname,
    typeof input.publicUrl === 'string' ? input.publicUrl : current.publicUrl,
  );
  const next: CloudflareConnectorConfig = {
    token: typeof input.token === 'string' ? input.token.trim() : current.token,
    originUrl: typeof input.originUrl === 'string' && input.originUrl.trim() ? input.originUrl.trim() : current.originUrl,
    publicHostname: publicFields.publicHostname,
    publicUrl: publicFields.publicUrl,
    binaryPath: normalizeBinaryPath(typeof input.binaryPath === 'string' ? input.binaryPath : current.binaryPath),
    autoStart: typeof input.autoStart === 'boolean' ? input.autoStart : current.autoStart,
  };

  fs.writeFileSync(configPath, JSON.stringify({
    originUrl: next.originUrl,
    publicHostname: next.publicHostname,
    publicUrl: next.publicUrl,
    binaryPath: next.binaryPath,
    autoStart: next.autoStart,
    tokenProtected: next.token ? protectToken(next.token) : '',
  }, null, 2), 'utf8');
  appendLog(`Konfigurasi disimpan. token=${next.token ? 'tersimpan' : 'kosong'} origin=${next.originUrl}`);
  return next;
}

export function getCloudflareConnectorStatus(): CloudflareConnectorStatus {
  const current = readCloudflareConnectorConfig();
  const installed = fs.existsSync(current.binaryPath);
  const service = readCloudflaredServiceStatus();
  const running = isTunnelProcessRunning();
  const connected = (running || service.running) && detectConnectedFromLogs();
  const errorDetected = (running || service.running) && detectErrorFromLogs() && !connected;
  const state = !installed
    ? 'not-installed'
    : !current.token
      ? 'not-configured'
      : connected
        ? 'connected'
        : running || service.running
          ? errorDetected ? 'error' : 'starting'
          : 'stopped';

  return {
    installed,
    running: running || service.running,
    connected,
    tokenConfigured: Boolean(current.token),
    originUrl: current.originUrl,
    publicHostname: current.publicHostname,
    publicUrl: current.publicUrl,
    binaryPath: current.binaryPath,
    logPath,
    lastMessage,
    pid: tunnelProcess?.pid ?? null,
    version: readBinaryVersion(current.binaryPath),
    bundledAvailable: Boolean(resolveBundledBinaryPath()),
    state,
    note: managedTunnelNote,
    service,
  };
}

export async function installCloudflared(force = false) {
  ensureConnectorDir();
  const current = readCloudflareConnectorConfig();
  const targetPath = current.binaryPath || bundledBinaryPath;

  if (fs.existsSync(targetPath) && !force) {
    appendLog(`cloudflared sudah tersedia di ${targetPath}`);
    return getCloudflareConnectorStatus();
  }

  const bundled = resolveBundledBinaryPath();
  if (bundled) {
    fs.copyFileSync(bundled, targetPath);
    appendLog(`cloudflared dipasang dari bundle: ${targetPath}`);
    return getCloudflareConnectorStatus();
  }

  appendLog('Mulai download cloudflared untuk Windows x64.');
  const response = await fetch(cloudflaredDownloadUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Download cloudflared gagal: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(targetPath, bytes);
  appendLog(`cloudflared terpasang di ${targetPath}`);
  return getCloudflareConnectorStatus();
}

async function probeUrl(url: string, timeoutMs = 6000) {
  if (!url.trim()) {
    return { ok: false, status: 0, message: 'URL belum diisi.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'manual',
    });
    return {
      ok: response.status >= 200 && response.status < 500,
      status: response.status,
      message: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkCloudflareConnectorPreflight() {
  const current = readCloudflareConnectorConfig();
  const status = getCloudflareConnectorStatus();
  const originHealthUrl = `${current.originUrl.replace(/\/+$/, '')}/health`;
  const origin = await probeUrl(originHealthUrl);
  const publicUrl = current.publicUrl || (current.publicHostname ? `https://${current.publicHostname}` : '');
  const publicEndpoint = publicUrl ? await probeUrl(publicUrl, 8000) : { ok: false, status: 0, message: 'Public URL belum diisi.' };

  return {
    status,
    checks: [
      {
        id: 'binary',
        label: 'cloudflared.exe',
        ok: status.installed,
        message: status.installed ? status.version || 'Binary tersedia.' : 'Binary belum tersedia. Klik Install.',
      },
      {
        id: 'token',
        label: 'Tunnel token',
        ok: status.tokenConfigured,
        message: status.tokenConfigured ? 'Token tersimpan lokal.' : 'Token Cloudflare Tunnel belum diisi.',
      },
      {
        id: 'origin',
        label: 'Origin lokal',
        ok: origin.ok,
        message: `${originHealthUrl} -> ${origin.message}`,
      },
      {
        id: 'dashboard-route',
        label: 'Mapping Dashboard',
        ok: Boolean(current.publicHostname && current.originUrl),
        message: current.publicHostname
          ? `${current.publicHostname} harus diarahkan ke ${current.originUrl} di Cloudflare Dashboard.`
          : 'Isi hostname publik dan samakan service di Cloudflare Dashboard.',
      },
      {
        id: 'process',
        label: 'Connector process',
        ok: status.connected || status.running,
        message: status.connected
          ? 'Log menunjukkan tunnel sudah terkoneksi.'
          : status.running
            ? 'Proses hidup, menunggu konfirmasi koneksi dari log.'
            : 'Proses belum berjalan.',
      },
      {
        id: 'public-url',
        label: 'Public URL',
        ok: publicEndpoint.ok,
        message: publicUrl ? `${publicUrl} -> ${publicEndpoint.message}` : publicEndpoint.message,
      },
    ],
  };
}

export function startCloudflareConnector() {
  const current = readCloudflareConnectorConfig();
  if (!current.token) {
    throw new Error('Token Cloudflare Tunnel wajib diisi.');
  }

  if (!fs.existsSync(current.binaryPath)) {
    throw new Error('cloudflared.exe belum tersedia. Jalankan instalasi connector terlebih dahulu.');
  }

  if (tunnelProcess && tunnelProcess.exitCode === null && !tunnelProcess.killed) {
    appendLog('Connector sudah berjalan.');
    return getCloudflareConnectorStatus();
  }

  appendLog(`Menjalankan tunnel untuk origin ${current.originUrl}.`);
  tunnelProcess = spawn(current.binaryPath, [
    'tunnel',
    '--no-autoupdate',
    '--loglevel',
    'info',
    'run',
    '--token',
    current.token,
  ], {
    cwd: connectorDir,
    windowsHide: true,
  });

  tunnelProcess.stdout.on('data', (chunk) => appendLog(String(chunk).trim()));
  tunnelProcess.stderr.on('data', (chunk) => appendLog(String(chunk).trim()));
  tunnelProcess.on('exit', (code) => {
    appendLog(`Connector berhenti. exitCode=${code ?? 'null'}`);
  });

  return getCloudflareConnectorStatus();
}

export function stopCloudflareConnector() {
  if (tunnelProcess && tunnelProcess.exitCode === null && !tunnelProcess.killed) {
    tunnelProcess.kill();
    appendLog('Perintah stop connector dikirim.');
  }

  return getCloudflareConnectorStatus();
}

export function installCloudflaredWindowsService(force = false) {
  const current = readCloudflareConnectorConfig();
  if (!current.token) {
    throw new DomainError('Token Cloudflare Tunnel wajib diisi sebelum install service.', 'CLOUDFLARED_TOKEN_REQUIRED', 400);
  }
  if (!fs.existsSync(current.binaryPath)) {
    throw new DomainError('cloudflared.exe belum tersedia. Klik Install Binary dulu.', 'CLOUDFLARED_NOT_INSTALLED', 400);
  }

  if (readCloudflaredServiceStatus().installed) {
    runCloudflaredServiceCommand(['service', 'uninstall']);
  }
  runCloudflaredServiceCommand(['service', 'install', current.token]);
  appendLog('Service Cloudflared terpasang memakai token tersimpan.');
  return getCloudflareConnectorStatus();
}

export function uninstallCloudflaredWindowsService() {
  if (!readCloudflaredServiceStatus().installed) {
    return getCloudflareConnectorStatus();
  }
  runCloudflaredServiceCommand(['service', 'uninstall']);
  appendLog('Service Cloudflared dihapus.');
  return getCloudflareConnectorStatus();
}

export function startCloudflaredWindowsService() {
  runServiceControl('start');
  return getCloudflareConnectorStatus();
}

export function stopCloudflaredWindowsService() {
  runServiceControl('stop');
  return getCloudflareConnectorStatus();
}

export function readCloudflareConnectorLogs(limit = 80) {
  ensureConnectorDir();
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean).slice(-limit);
}

export function autoStartCloudflareConnector() {
  const current = readCloudflareConnectorConfig();
  if (!current.autoStart) return;

  try {
    startCloudflareConnector();
  } catch (error) {
    appendLog(`Auto-start gagal: ${error instanceof Error ? error.message : String(error)}`);
  }
}
