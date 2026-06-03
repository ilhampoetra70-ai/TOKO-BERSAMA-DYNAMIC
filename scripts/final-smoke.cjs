const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'local-api');
const runtimeDir = path.join(rootDir, '.runtime', 'final-smoke');
const dbPath = path.join(runtimeDir, 'tokobersama-smoke.sqlite');
const backupDir = path.join(runtimeDir, 'backups');
const port = Number(process.env.TOKOBERSAMA_SMOKE_PORT || 18731);
const baseUrl = `http://127.0.0.1:${port}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    env: options.env ?? process.env,
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} gagal.`,
      result.error ? `error: ${result.error.message}` : '',
      result.stdout ? `stdout:\n${result.stdout}` : '',
      result.stderr ? `stderr:\n${result.stderr}` : '',
    ].filter(Boolean).join('\n'));
  }
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
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
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Local API smoke server tidak siap.');
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

async function main() {
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const env = {
    ...process.env,
    TOKOBERSAMA_API_HOST: '127.0.0.1',
    TOKOBERSAMA_API_PORT: String(port),
    TOKOBERSAMA_DB_PATH: dbPath,
    TOKOBERSAMA_BACKUP_DIR: backupDir,
  };

  run('node', ['dist/db/migrate.js'], { cwd: apiDir, env });

  const server = spawn('node', ['dist/server.js'], {
    cwd: apiDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLog = '';
  server.stdout.on('data', (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverLog += chunk.toString();
  });

  try {
    await waitForHealth();

    const publicSettings = await request('/settings/public');
    assert(publicSettings.response.ok, 'Public store identity harus bisa diakses sebelum login.');
    assert(publicSettings.data?.item?.name, 'Public store identity wajib berisi nama toko.');

    const priceCheckerHealth = await request('/public/price-checker/health');
    assert(priceCheckerHealth.response.ok, 'Public price checker health harus bisa diakses sebelum login.');

    const priceCheckerUi = await requestText('/price-checker');
    assert(priceCheckerUi.response.ok, 'UI price checker harus bisa diakses sebelum login.');
    assert(priceCheckerUi.text.includes('<div id="root"></div>'), 'UI price checker harus mengembalikan shell React.');

    const adminUi = await requestText('/admin');
    assert(adminUi.response.ok, 'UI admin mobile harus bisa diakses sebelum login.');
    assert(adminUi.text.includes('<div id="root"></div>'), 'UI admin mobile harus mengembalikan shell React.');

    const adminManifest = await requestText('/admin/manifest.webmanifest');
    assert(adminManifest.response.ok, 'Manifest admin mobile harus bisa diakses.');
    assert(adminManifest.text.includes('"start_url": "/admin"'), 'Manifest admin mobile harus memakai start_url /admin.');

    const adminServiceWorker = await requestText('/admin/sw.js');
    assert(adminServiceWorker.response.ok, 'Service worker admin mobile harus bisa diakses.');

    const adminIcon = await requestText('/admin/tokobersama-icon.svg');
    assert(adminIcon.response.ok, 'Ikon admin mobile harus bisa diakses lewat scope /admin.');

    const connectorUi = await requestText('/connector');
    assert(connectorUi.response.ok, 'UI Cloudflare connector harus bisa diakses sebelum login.');
    assert(connectorUi.text.includes('<div id="root"></div>'), 'UI Cloudflare connector harus mengembalikan shell React.');

    const lockedWorkspace = await request('/workspace');
    assert(lockedWorkspace.response.status === 401, 'Workspace wajib terkunci sebelum login.');

    const lockedCatalog = await request('/catalog');
    assert(lockedCatalog.response.status === 401, 'Catalog POS internal wajib tetap terkunci sebelum login.');

    const lockedConnector = await request('/cloudflare/connector');
    assert(lockedConnector.response.status === 401, 'API Cloudflare connector wajib terkunci sebelum login.');

    const login = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    assert(login.response.ok, 'Login admin default harus berhasil.');
    const token = login.data.token;
    assert(token, 'Login harus mengembalikan token.');

    const preferenceBefore = await authed(token, '/users/me/preferences');
    assert(preferenceBefore.response.ok, 'Preferensi tampilan akun harus bisa dibaca.');
    assert(preferenceBefore.data.item.mode === 'auto', 'Mode tampilan default harus auto.');

    const preferenceAfter = await authed(token, '/users/me/preferences', {
      method: 'PUT',
      body: JSON.stringify({ mode: 'dark', accent: 'sky', theme: 'midnight-sapphire' }),
    });
    assert(preferenceAfter.response.ok, 'Preferensi tampilan akun harus bisa disimpan.');
    assert(preferenceAfter.data.item.accent === 'sky', 'Warna aksen tersimpan harus mengikuti payload.');
    assert(preferenceAfter.data.item.theme === 'midnight-sapphire', 'Tema tersimpan harus mengikuti payload.');

    const connectorStatus = await authed(token, '/cloudflare/connector');
    assert(connectorStatus.response.ok, 'Status Cloudflare connector harus bisa dibaca oleh admin.');
    assert(typeof connectorStatus.data.item.originUrl === 'string', 'Status Cloudflare connector harus membawa origin lokal.');
    assert(connectorStatus.data.item.bundledAvailable === true, 'Binary cloudflared bundle harus terdeteksi di dev smoke.');

    const connectorInstall = await authed(token, '/cloudflare/connector/install', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert(connectorInstall.response.ok, 'Install Cloudflare connector dari bundle harus berhasil.');
    assert(connectorInstall.data.item.installed === true, 'Cloudflare connector harus terpasang setelah install.');
    assert(String(connectorInstall.data.item.version || '').includes('cloudflared'), 'Versi cloudflared harus bisa dibaca.');

    const connectorPreflight = await authed(token, '/cloudflare/connector/preflight');
    assert(connectorPreflight.response.ok, 'Preflight Cloudflare connector harus bisa dibaca.');
    assert(Array.isArray(connectorPreflight.data.item.checks), 'Preflight Cloudflare connector harus membawa daftar check.');

    const catalogCreate = await authed(token, '/catalog', {
      method: 'POST',
      body: JSON.stringify({
        sku: '8991234567890',
        name: 'SEMEN SMOKE 50KG',
        category: 'SEMEN',
        qty: 8,
        unit: 'SAK',
        price: 72000,
      }),
    });
    assert(catalogCreate.response.status === 201, 'Tambah barang harus berhasil.');
    assert(catalogCreate.data.item.qty === 8, 'Qty awal barang harus tersimpan.');

    const priceCheckerLookup = await request('/public/price-checker/products/8991234567890');
    assert(priceCheckerLookup.response.ok, 'Lookup barcode price checker harus bisa diakses tanpa login.');
    assert(priceCheckerLookup.data.item.priceText === 'Rp\u00a072.000', 'Lookup price checker harus membawa harga publik.');
    assert(priceCheckerLookup.data.item.qty === undefined, 'Lookup price checker tidak boleh mengekspos angka stok detail.');

    const priceCheckerSearch = await request('/public/price-checker/products/search?q=SEMEN');
    assert(priceCheckerSearch.response.ok, 'Search price checker harus bisa diakses tanpa login.');
    assert(priceCheckerSearch.data.items.some((item) => item.barcode === '8991234567890'), 'Search price checker harus menemukan barang smoke.');

    const restock = await authed(token, '/catalog/8991234567890/restock', {
      method: 'POST',
      body: JSON.stringify({ addedQty: 5, supplier: 'SUPPLIER SMOKE', note: 'Smoke restok' }),
    });
    assert(restock.response.ok, 'Restok barang harus berhasil.');
    assert(restock.data.item.qty === 13, 'Qty setelah restok harus bertambah.');

    const checkout = await authed(token, '/sales/checkout', {
      method: 'POST',
      body: JSON.stringify({
        method: 'Tunai',
        status: 'DP',
        paymentAmount: 'Rp 50.000',
        discount: '',
        discountMode: 'nominal',
        customerName: 'SMOKE CUSTOMER',
        phone: '08123456789',
        address: 'ALAMAT SMOKE',
        note: 'Smoke checkout',
        cartItems: [{ sku: '8991234567890', qty: 2 }],
      }),
    });
    assert(checkout.response.status === 201, 'Checkout kasir harus berhasil.');
    const invoice = checkout.data.item.invoice;
    assert(invoice, 'Checkout harus menghasilkan invoice.');

    const receivables = await authed(token, '/receivables');
    assert(receivables.response.ok, 'List piutang harus berhasil.');
    assert(receivables.data.items.some((item) => item.invoice === invoice), 'Transaksi DP harus masuk piutang.');

    const receivablePayment = await authed(token, `/receivables/${encodeURIComponent(invoice)}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount: 'Rp 94.000', method: 'Tunai', note: 'Pelunasan smoke' }),
    });
    assert(receivablePayment.response.ok, 'Pembayaran piutang harus berhasil.');

    const supplierDebt = await authed(token, '/supplier-debts', {
      method: 'POST',
      body: JSON.stringify({
        supplier: 'SUPPLIER SMOKE',
        takeDate: '11 Mei 2026',
        dueDate: '',
        items: [{ name: 'BESI SMOKE 10MM', category: 'BESI', qty: 4, unit: 'BTG', price: 98000 }],
      }),
    });
    assert(supplierDebt.response.ok, 'Tambah hutang supplier harus berhasil.');
    const debtId = supplierDebt.data.item.id;

    const receiveStock = await authed(token, '/supplier-debts/receive-stock', {
      method: 'POST',
      body: JSON.stringify({
        supplier: 'SUPPLIER SMOKE',
        takeDate: '11 Mei 2026',
        items: [{ name: 'BESI SMOKE 10MM', category: 'BESI', packQty: 4, unit: 'BTG', price: 98000 }],
      }),
    });
    assert(receiveStock.response.ok, 'Barang dari hutang supplier harus masuk stok.');
    assert(receiveStock.data.posCatalog.some((item) => item.name === 'BESI SMOKE 10MM'), 'Katalog harus berisi barang dari hutang supplier.');

    const supplierDebtPayment = await authed(token, `/supplier-debts/${encodeURIComponent(debtId)}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount: 'Rp 100.000', method: 'Transfer', note: 'Smoke bayar hutang' }),
    });
    assert(supplierDebtPayment.response.ok, 'Pembayaran hutang supplier harus berhasil.');

    const workspace = await authed(token, '/workspace');
    assert(workspace.response.ok, 'Workspace setelah login harus berhasil.');
    assert(workspace.data.data.stockHistoryRows.some((row) => row.sku === '8991234567890'), 'Stock trail harus membawa SKU.');

    const report = await authed(token, '/reports?lowStockThreshold=20');
    assert(report.response.ok, 'Laporan harus berhasil dimuat.');
    assert(typeof report.data.summary.transactionCount === 'number', 'Laporan harus membawa summary transaksi.');

    const backup = await authed(token, '/database/backups', {
      method: 'POST',
      body: JSON.stringify({ mode: 'archive' }),
    });
    assert(backup.response.ok, 'Backup database harus berhasil.');
    assert(backup.data.item.file, 'Backup harus menghasilkan nama file.');

    const hardReset = await authed(token, '/database/hard-reset', {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RESET', reason: 'Final smoke test cleanup.' }),
    });
    assert(hardReset.response.ok, 'Hard reset harus berhasil pada DB sementara.');

    const lockedAfterReset = await authed(token, '/workspace');
    assert(lockedAfterReset.response.status === 401, 'Token lama harus hangus setelah hard reset.');

    console.log('FINAL_SMOKE_OK');
  } finally {
    server.kill();
    if (serverLog.trim()) {
      fs.writeFileSync(path.join(runtimeDir, 'server.log'), serverLog);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
