const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const {
  createPortableContext,
  removePath,
} = require('./portable-runtime.cjs');

const rootDir = path.resolve(__dirname, '..');
const context = createPortableContext(rootDir);
let baseUrl = context.baseUrl;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertExists(target, label) {
  if (!fs.existsSync(target)) {
    throw new Error(`${label} tidak ditemukan: ${target}`);
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

async function requestText(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  return { response, text };
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

async function authed(token, pathname, options = {}) {
  return request(pathname, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
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
  const smokeSuffix = `${Date.now()}`.slice(-6);
  const smokeSku = `8991234${smokeSuffix}`;
  const smokeName = `PORTABLE SMOKE ${smokeSuffix}`;

  assertExists(context.appExecutable, context.useSingleExe ? 'Portable exe' : 'Portable app executable');
  assertExists(context.nodeBinary, 'Node portable');
  assertExists(path.join(context.apiDir, 'dist', 'server.js'), 'Portable backend');
  assertExists(path.join(context.apiDir, 'dist', 'db', 'migrate.js'), 'Portable migration');
  assertExists(path.join(context.resourcesDir, 'cloudflare', 'cloudflared.exe'), 'Portable cloudflared binary');
  assertExists(path.join(context.resourcesDir, 'pos-react-canvas', 'dist', 'admin', 'manifest.webmanifest'), 'Portable admin manifest');
  assertExists(path.join(context.resourcesDir, 'pos-react-canvas', 'dist', 'admin', 'sw.js'), 'Portable admin service worker');

  const app = await loadBackendApp();
  await app.listen({
    host: '127.0.0.1',
    port: 0,
  });
  const address = app.server.address();
  assert(address && typeof address !== 'string' && typeof address.port === 'number', 'Alamat listen tidak valid.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await waitForHealth();

    const publicSettings = await request('/settings/public');
    assert(publicSettings.response.ok, 'Public setting portable harus bisa diakses.');

    const priceCheckerHealth = await request('/public/price-checker/health');
    assert(priceCheckerHealth.response.ok, 'Public price checker health portable harus bisa diakses.');

    const priceCheckerUi = await requestText('/price-checker');
    assert(priceCheckerUi.response.ok, 'UI price checker portable harus bisa diakses.');

    const adminUi = await requestText('/admin');
    assert(adminUi.response.ok, 'UI admin mobile portable harus bisa diakses.');

    const adminManifest = await requestText('/admin/manifest.webmanifest');
    assert(adminManifest.response.ok, 'Manifest admin mobile portable harus bisa diakses.');
    assert(adminManifest.text.includes('"start_url": "/admin"'), 'Manifest admin mobile portable harus memakai start_url /admin.');

    const adminServiceWorker = await requestText('/admin/sw.js');
    assert(adminServiceWorker.response.ok, 'Service worker admin mobile portable harus bisa diakses.');

    const adminIcon = await requestText('/admin/tokobersama-icon.svg');
    assert(adminIcon.response.ok, 'Ikon admin mobile portable harus bisa diakses lewat scope /admin.');

    const connectorUi = await requestText('/connector');
    assert(connectorUi.response.ok, 'UI Cloudflare connector portable harus bisa diakses.');

    const lockedWorkspace = await request('/workspace');
    assert(lockedWorkspace.response.status === 401, 'Workspace portable wajib terkunci sebelum login.');

    const lockedCatalog = await request('/catalog');
    assert(lockedCatalog.response.status === 401, 'Catalog POS portable wajib tetap terkunci sebelum login.');

    const lockedConnector = await request('/cloudflare/connector');
    assert(lockedConnector.response.status === 401, 'API Cloudflare connector portable wajib terkunci sebelum login.');

    const login = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    assert(login.response.ok, 'Login portable harus berhasil.');
    const token = login.data.token;

    const preferenceBefore = await authed(token, '/users/me/preferences');
    assert(preferenceBefore.response.ok, 'Preferensi tampilan akun portable harus bisa dibaca.');

    const preferenceAfter = await authed(token, '/users/me/preferences', {
      method: 'PUT',
      body: JSON.stringify({ mode: 'dark', accent: 'emerald' }),
    });
    assert(preferenceAfter.response.ok, 'Preferensi tampilan akun portable harus bisa disimpan.');
    assert(preferenceAfter.data.item.accent === 'emerald', 'Warna aksen portable harus tersimpan.');

    const connectorStatus = await authed(token, '/cloudflare/connector');
    assert(connectorStatus.response.ok, 'Status Cloudflare connector portable harus bisa dibaca.');
    assert(connectorStatus.data.item.bundledAvailable === true, 'Binary cloudflared portable harus terdeteksi.');

    const connectorInstall = await authed(token, '/cloudflare/connector/install', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert(connectorInstall.response.ok, 'Install Cloudflare connector portable dari bundle harus berhasil.');
    assert(connectorInstall.data.item.installed === true, 'Cloudflare connector portable harus terpasang setelah install.');

    const connectorPreflight = await authed(token, '/cloudflare/connector/preflight');
    assert(connectorPreflight.response.ok, 'Preflight Cloudflare connector portable harus bisa dibaca.');

    const created = await authed(token, '/catalog', {
      method: 'POST',
      body: JSON.stringify({
        sku: smokeSku,
        name: smokeName,
        category: 'SMOKE',
        qty: 1,
        unit: 'PCS',
        price: 1000,
      }),
    });
    assert(created.response.status === 201, 'Portable catalog create harus berhasil.');

    const priceCheckerLookup = await request(`/public/price-checker/products/${smokeSku}`);
    assert(priceCheckerLookup.response.ok, 'Lookup price checker portable harus bisa diakses tanpa login.');
    assert(priceCheckerLookup.data.item.priceText === 'Rp\u00a01.000', 'Lookup price checker portable harus membawa harga publik.');
    assert(priceCheckerLookup.data.item.qty === undefined, 'Lookup price checker portable tidak boleh mengekspos qty.');

    console.log('PORTABLE_SMOKE_OK');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
