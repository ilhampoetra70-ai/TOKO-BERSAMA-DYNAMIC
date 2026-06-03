import {
  canvasViewDataSchema,
  cashierSessionRowSchema,
  posWorkspaceSnapshotSchema,
  queueItemSchema,
  saleLineItemSchema,
  saleRowSchema,
  type CashierSessionRow,
  type PosWorkspaceSnapshot,
  type QueueItem,
  type SaleRow,
  type StockHistoryItem,
} from '@/contracts/pos';
import type { ReceivableRow, SupplierDebtDraft, SupplierDebtRow } from '@/contracts/pos-ui';
import { canvasViewData } from '@/data/canvasData';
import {
  assertCatalogItemComplete,
  generateBarcodeCandidate,
  generateUniqueCatalogBarcode,
  getCatalogDuplicateKey,
  normalizeDiscountText,
  normalizePriceText,
  normalizeQueueItem,
  parseCurrencyNumber,
  toCatalogText,
} from '@/domain/catalogService';
import {
  calculateCartSubtotal,
  calculateDiscountAmount,
  normalizeCartItems,
  type CashierSessionInput,
  type CheckoutSaleInput,
} from '@/domain/checkoutService';
import { createStockMovementEntry, getStockHistoryTime, normalizeStockHistoryRow } from '@/domain/stockService';
import type { AppSettings, AuditLogRow, AuthSession, DatabaseBackupRow, PasswordChangePayload, PasswordResetPayload, PosApi, ReportData, SupplierDebtStockInput, TotpSetupPayload, UserAccessPayload, UserAppearancePreference, UserPermissionMap, UserRow } from '../posApi.types';
import { format } from 'date-fns';

const STORAGE_KEY = 'tokobersama.pos.workspace';
const USERS_STORAGE_KEY = 'tokobersama.pos.mock-users';
const SETTINGS_STORAGE_KEY = 'tokobersama.pos.mock-settings';
const MY_APPEARANCE_STORAGE_KEY = 'tokobersama.pos.mock-my-appearance';
const CLEAN_RESET_STORAGE_KEY = 'tokobersama.pos.clean-reset';
const WORKSPACE_EVENT = 'tokobersama:workspace-updated';
const AUTH_EXPIRED_EVENT = 'tokobersama:auth-expired';

let memoryStore: PosWorkspaceSnapshot | null = null;
let mockDatabaseBackups: DatabaseBackupRow[] = [
  {
    file: 'TOKO-BERSAMA-auto-latest.db',
    time: format(new Date(), 'dd/MM/yyyy HH:mm'),
    size: '8.8 MB',
    status: 'Valid',
    note: 'Snapshot latest otomatis',
    latest: true,
  },
];
let mockDatabaseBackupSnapshots: Record<string, PosWorkspaceSnapshot> = {
  'TOKO-BERSAMA-auto-latest.db': seedStore(),
};

const defaultMockReceiptLayout: AppSettings['receipt']['layout'] = {
  template: 'standard',
  density: 'normal',
  fontSize: 'medium',
  sections: {
    logo: true,
    storeIdentity: true,
    transactionInfo: true,
    customerInfo: true,
    itemMeta: true,
    discount: true,
    payment: true,
    footer: true,
  },
};

const defaultMockSettings: AppSettings = {
  store: {
    name: 'TOKO BERSAMA MATERIAL',
    address: 'Jl. Raya Bangunan No. 88',
    phone: '0812-0000-7788',
    logoDataUrl: null,
    logoFileName: '',
    logoFileSizeKb: null,
  },
  printer: {
    activePrinter: 'Thermal POS 80',
    behavior: 'Preview sebelum print',
    paper: '80',
  },
  cashDrawer: {
    enabled: false,
    interface: 'printer:POS-58',
    connectionMode: 'windows',
    printerName: 'POS-58',
    networkInterface: 'tcp://192.168.1.100:9100',
    printerType: 'EPSON',
    openOnCashCheckout: true,
    openOnReceivablePayment: true,
  },
  receipt: {
    layout: defaultMockReceiptLayout,
    previewPaper: '80',
  },
  appearance: {
    mode: 'dark',
    scale: 'md',
  },
};
let mockAppSettings: AppSettings = cloneValue(defaultMockSettings);
let mockUserRows: UserRow[] = [
  {
    id: 'system-admin',
    name: 'ADMIN TOKO',
    username: 'admin',
    role: 'Admin',
    status: 'Aktif',
    security: 'TOTP aktif',
    lastLogin: 'Hari ini 08:10',
    device: 'Desktop kasir utama',
    scope: 'Akses penuh',
  },
  {
    id: 'cashier-main',
    name: 'KASIR UTAMA',
    username: 'kasir01',
    role: 'Kasir',
    status: 'Aktif',
    security: 'Password',
    lastLogin: 'Hari ini 09:02',
    device: 'POS depan',
    scope: 'Kasir dan transaksi',
  },
  {
    id: 'supervisor-stock',
    name: 'SUPERVISOR GUDANG',
    username: 'spv-gudang',
    role: 'Supervisor',
    status: 'Aktif',
    security: 'Password',
    lastLogin: 'Kemarin 17:45',
    device: 'Admin stok',
    scope: 'Barang, stok, laporan',
  },
  {
    id: 'cashier-backup',
    name: 'KASIR CADANGAN',
    username: 'kasir02',
    role: 'Kasir',
    status: 'Nonaktif',
    security: 'Reset diperlukan',
    lastLogin: 'Belum login',
    device: '-',
    scope: 'Kasir dan transaksi',
  },
];
let mockRolePermissions: UserPermissionMap = {
  Admin: ['Dashboard', 'Kasir', 'Transaksi', 'Barang', 'Stok rendah', 'Riwayat stok', 'Hutang', 'Piutang', 'Laporan', 'Database', 'Setting', 'Pengguna'],
  Supervisor: ['Dashboard', 'Barang', 'Stok rendah', 'Riwayat stok', 'Hutang', 'Piutang', 'Laporan'],
  Kasir: ['Dashboard', 'Kasir', 'Transaksi'],
};
let mockMyAppearancePreference: UserAppearancePreference = {
  mode: 'auto',
  accent: 'amber',
  theme: 'obsidian-gold',
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadPersistedMockUsers() {
  if (typeof window === 'undefined') return;

  const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) {
    if (window.localStorage.getItem(CLEAN_RESET_STORAGE_KEY) === '1') {
      mockUserRows = mockUserRows.filter((row) => row.username === 'admin');
      mockRolePermissions = {
        ...mockRolePermissions,
        Supervisor: [],
        Kasir: [],
      };
    }
    persistMockUsers();
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserAccessPayload>;
    if (Array.isArray(parsed.items) && parsed.items.length) {
      mockUserRows = parsed.items as UserRow[];
    }
    if (parsed.rolePermissions) {
      mockRolePermissions = parsed.rolePermissions;
    }
  } catch {
    window.localStorage.removeItem(USERS_STORAGE_KEY);
    persistMockUsers();
  }
}

function persistMockUsers() {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify({
    items: mockUserRows,
    rolePermissions: mockRolePermissions,
  }));
}

function loadPersistedMockSettings() {
  if (typeof window === 'undefined') return;

  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    persistMockSettings();
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    mockAppSettings = cloneSettings({
      ...defaultMockSettings,
      ...parsed,
      store: {
        ...defaultMockSettings.store,
        ...parsed.store,
      },
      printer: {
        ...defaultMockSettings.printer,
        ...parsed.printer,
      },
      cashDrawer: {
        ...defaultMockSettings.cashDrawer,
        ...parsed.cashDrawer,
        interface: parsed.cashDrawer?.connectionMode === 'network'
          ? parsed.cashDrawer?.networkInterface || parsed.cashDrawer?.interface || defaultMockSettings.cashDrawer.networkInterface
          : `printer:${parsed.cashDrawer?.printerName || defaultMockSettings.cashDrawer.printerName}`,
      },
      receipt: {
        ...defaultMockSettings.receipt,
        ...parsed.receipt,
        layout: {
          ...defaultMockSettings.receipt.layout,
          ...parsed.receipt?.layout,
          sections: {
            ...defaultMockSettings.receipt.layout.sections,
            ...parsed.receipt?.layout?.sections,
          },
        },
      },
      appearance: {
        ...defaultMockSettings.appearance,
        ...parsed.appearance,
      },
    });
  } catch {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    persistMockSettings();
  }
}

function persistMockSettings() {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(mockAppSettings));
}

function loadPersistedMockAppearancePreference() {
  if (typeof window === 'undefined') return;

  const raw = window.localStorage.getItem(MY_APPEARANCE_STORAGE_KEY);
  if (!raw) {
    persistMockAppearancePreference();
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserAppearancePreference>;
    mockMyAppearancePreference = {
      mode: parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'auto' ? parsed.mode : 'auto',
      accent: parsed.accent === 'emerald' || parsed.accent === 'sky' || parsed.accent === 'rose' || parsed.accent === 'amber'
        ? parsed.accent
        : 'amber',
      theme: parsed.theme === 'midnight-emerald'
        || parsed.theme === 'midnight-sapphire'
        || parsed.theme === 'midnight-ruby'
        || parsed.theme === 'midnight-amethyst'
        || parsed.theme === 'midnight-teal'
        || parsed.theme === 'midnight-copper'
        || parsed.theme === 'midnight-cyan'
        || parsed.theme === 'midnight-rose'
        || parsed.theme === 'midnight-lime'
        || parsed.theme === 'midnight-indigo'
        || parsed.theme === 'midnight-bronze'
        || parsed.theme === 'midnight-onyx'
        || parsed.theme === 'midnight-mint'
        || parsed.theme === 'midnight-plum'
        || parsed.theme === 'obsidian-gold'
        ? parsed.theme
        : 'obsidian-gold',
    };
  } catch {
    window.localStorage.removeItem(MY_APPEARANCE_STORAGE_KEY);
    persistMockAppearancePreference();
  }
}

function persistMockAppearancePreference() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MY_APPEARANCE_STORAGE_KEY, JSON.stringify(mockMyAppearancePreference));
}

function createMockBackupRow(mode: 'latest' | 'archive'): DatabaseBackupRow {
  const time = format(new Date(), 'dd/MM/yyyy HH:mm');
  if (mode === 'latest') {
    return {
      file: 'TOKO-BERSAMA-auto-latest.db',
      time,
      size: '8.8 MB',
      status: 'Valid',
      note: 'Snapshot latest otomatis',
      latest: true,
    };
  }

  return {
    file: `TOKO-BERSAMA-backup-${format(new Date(), 'yyyyMMdd-HHmmss')}.db`,
    time,
    size: '8.8 MB',
    status: 'Valid',
    note: 'Backup arsip manual',
    latest: false,
  };
}

function cloneSettings(value: AppSettings): AppSettings {
  return JSON.parse(JSON.stringify(value)) as AppSettings;
}

function seedStore(): PosWorkspaceSnapshot {
  const snapshot = posWorkspaceSnapshotSchema.parse({
    alerts: true,
    data: canvasViewDataSchema.parse(canvasViewData),
  });

  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      stockHistoryRows: snapshot.data.stockHistoryRows.map((item) => ({ ...item })),
      saleRows: snapshot.data.saleRows.map((item) => normalizeSaleRow(item)),
      cashierSessionRows: snapshot.data.cashierSessionRows.map((item) =>
        normalizeCashierSessionRow({
          ...item,
          cartItems: item.cartItems,
          kind: item.kind,
        })
      ),
      posQueue: snapshot.data.posQueue.map((item) => normalizeQueueItem(item)),
      posCatalog: snapshot.data.posCatalog.map((item) => normalizeQueueItem(item)),
    },
  };
}

function emptyStore(): PosWorkspaceSnapshot {
  const snapshot = seedStore();
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      posQueue: [],
      posCatalog: [],
      stockRows: [],
      stockHistoryRows: [],
      saleRows: [],
      cashierSessionRows: [],
    },
  };
}

function legacySaleItemsForInvoice(invoice: string) {
  const seedItems: Record<string, Array<{ sku: string; name: string; qty: number; unit: string; price: number; subtotal: number }>> = {
    'INV-0428': [
      { sku: '8991204500033', name: 'SEMEN 50KG', qty: 10, unit: 'SAK', price: 72000, subtotal: 720000 },
      { sku: '8991204500040', name: 'PASIR BANGUNAN', qty: 2, unit: 'TRUK', price: 260000, subtotal: 520000 },
    ],
    'INV-0429': [
      { sku: '8991204500057', name: 'BESI BETON 12MM', qty: 20, unit: 'BATANG', price: 98000, subtotal: 1960000 },
      { sku: '8991204500064', name: 'CAT TEMBOK', qty: 18, unit: 'KALENG', price: 101000, subtotal: 1818000 },
    ],
    'INV-0430': [
      { sku: '8991204500033', name: 'SEMEN 50KG', qty: 8, unit: 'SAK', price: 72000, subtotal: 576000 },
      { sku: '8991204500057', name: 'BESI BETON 12MM', qty: 3, unit: 'BATANG', price: 98000, subtotal: 294000 },
    ],
  };

  return seedItems[invoice] ?? [];
}

function normalizeSaleRow(rawItem: Partial<SaleRow>): SaleRow {
  const invoice = typeof rawItem.invoice === 'string' ? rawItem.invoice.trim() : '';
  const explicitItems = Array.isArray(rawItem.items) ? rawItem.items : legacySaleItemsForInvoice(invoice);

  return saleRowSchema.parse({
    ...rawItem,
    invoice,
    customer: typeof rawItem.customer === 'string' ? rawItem.customer.trim() : '',
    cashier: typeof rawItem.cashier === 'string' ? rawItem.cashier.trim() : 'KASIR UTAMA',
    total: normalizePriceText(rawItem.total),
    method: typeof rawItem.method === 'string' ? rawItem.method.trim() : 'Tunai',
    status: typeof rawItem.status === 'string' ? rawItem.status.trim() : 'Lunas',
    time: typeof rawItem.time === 'string' ? rawItem.time.trim() : getStockHistoryTime(),
    itemsCount: Number(rawItem.itemsCount ?? 0),
    items: explicitItems.length
      ? explicitItems.map((item) => saleLineItemSchema.parse({
          ...item,
          sku: typeof item.sku === 'string' ? item.sku.trim() : '',
          name: typeof item.name === 'string' ? item.name.trim() : '',
          qty: Number(item.qty ?? 0),
          unit: typeof item.unit === 'string' ? item.unit.trim() : '',
          price: Number(item.price ?? 0),
          subtotal: Number(item.subtotal ?? 0),
        }))
      : undefined,
    customerName: typeof rawItem.customerName === 'string' && rawItem.customerName.trim() ? rawItem.customerName.trim() : undefined,
    phone: typeof rawItem.phone === 'string' && rawItem.phone.trim() ? rawItem.phone.trim() : undefined,
    projectName: typeof rawItem.projectName === 'string' && rawItem.projectName.trim() ? rawItem.projectName.trim() : undefined,
    customerType: typeof rawItem.customerType === 'string' && rawItem.customerType.trim() ? rawItem.customerType.trim() : undefined,
    address: typeof rawItem.address === 'string' && rawItem.address.trim() ? rawItem.address.trim() : undefined,
    reference: typeof rawItem.reference === 'string' && rawItem.reference.trim() ? rawItem.reference.trim() : undefined,
    note: typeof rawItem.note === 'string' && rawItem.note.trim() ? rawItem.note.trim() : undefined,
    paymentAmount: typeof rawItem.paymentAmount === 'string' && rawItem.paymentAmount.trim() ? normalizePriceText(rawItem.paymentAmount) : undefined,
    dueDate: typeof rawItem.dueDate === 'string' && rawItem.dueDate.trim() ? rawItem.dueDate.trim() : undefined,
    discount: typeof rawItem.discount === 'string' && rawItem.discount.trim() ? rawItem.discount.trim() : undefined,
    discountMode: rawItem.discountMode === 'percent' ? 'percent' : rawItem.discountMode === 'nominal' ? 'nominal' : undefined,
  });
}

function normalizeCashierSessionRow(
  rawItem: Partial<CashierSessionRow> & { id: string; kind: 'Draft' | 'Tertahan'; cartItems: Array<{ sku: string; qty: number }> }
): CashierSessionRow {
  return cashierSessionRowSchema.parse({
    ...rawItem,
    id: typeof rawItem.id === 'string' ? rawItem.id.trim() : '',
    kind: rawItem.kind,
    customer: typeof rawItem.customer === 'string' ? rawItem.customer.trim() : '',
    cashier: typeof rawItem.cashier === 'string' ? rawItem.cashier.trim() : 'KASIR UTAMA',
    total: normalizePriceText(rawItem.total),
    method: typeof rawItem.method === 'string' ? rawItem.method.trim() : 'Tunai',
    status: typeof rawItem.status === 'string' ? rawItem.status.trim() : rawItem.kind,
    time: typeof rawItem.time === 'string' ? rawItem.time.trim() : getStockHistoryTime(),
    itemsCount: Number(rawItem.itemsCount ?? 0),
    cartItems: Array.isArray(rawItem.cartItems)
      ? rawItem.cartItems.map((item) => ({
          sku: typeof item.sku === 'string' ? item.sku.trim() : '',
          qty: Number(item.qty ?? 0),
        }))
      : [],
    customerName: typeof rawItem.customerName === 'string' && rawItem.customerName.trim() ? rawItem.customerName.trim() : undefined,
    phone: typeof rawItem.phone === 'string' && rawItem.phone.trim() ? rawItem.phone.trim() : undefined,
    projectName: typeof rawItem.projectName === 'string' && rawItem.projectName.trim() ? rawItem.projectName.trim() : undefined,
    customerType: typeof rawItem.customerType === 'string' && rawItem.customerType.trim() ? rawItem.customerType.trim() : undefined,
    address: typeof rawItem.address === 'string' && rawItem.address.trim() ? rawItem.address.trim() : undefined,
    reference: typeof rawItem.reference === 'string' && rawItem.reference.trim() ? rawItem.reference.trim() : undefined,
    note: typeof rawItem.note === 'string' && rawItem.note.trim() ? rawItem.note.trim() : undefined,
    paymentAmount: typeof rawItem.paymentAmount === 'string' && rawItem.paymentAmount.trim() ? normalizePriceText(rawItem.paymentAmount) : undefined,
    discount: typeof rawItem.discount === 'string' && rawItem.discount.trim() ? rawItem.discount.trim() : undefined,
    discountMode: rawItem.discountMode === 'percent' ? 'percent' : rawItem.discountMode === 'nominal' ? 'nominal' : undefined,
    dueDate: typeof rawItem.dueDate === 'string' && rawItem.dueDate.trim() ? rawItem.dueDate.trim() : undefined,
  });
}

function normalizeSnapshot(rawSnapshot: unknown): PosWorkspaceSnapshot {
  const candidate = rawSnapshot as Partial<PosWorkspaceSnapshot> | null | undefined;
  const posQueue = Array.isArray(candidate?.data?.posQueue)
    ? candidate?.data?.posQueue.map((item) => normalizeQueueItem(item as QueueItem))
    : [];
  const posCatalog = Array.isArray(candidate?.data?.posCatalog)
    ? candidate?.data?.posCatalog.map((item) => normalizeQueueItem(item as QueueItem))
    : [];
  const stockHistoryRows = Array.isArray(candidate?.data?.stockHistoryRows)
    ? candidate?.data?.stockHistoryRows.map((item) => normalizeStockHistoryRow(item as {
        item: string;
        movement: string;
        note: string;
        time: string;
        event: string;
        beforeQty?: number;
        afterQty?: number;
        operator?: string;
        source?: string;
      }))
    : canvasViewData.stockHistoryRows.map((item) => normalizeStockHistoryRow(item));
  const saleRows = Array.isArray(candidate?.data?.saleRows)
    ? candidate?.data?.saleRows.map((item) => normalizeSaleRow(item as SaleRow))
    : canvasViewData.saleRows.map((item) => normalizeSaleRow(item));
  const cashierSessionRows = Array.isArray(candidate?.data?.cashierSessionRows)
    ? candidate?.data?.cashierSessionRows.map((item) =>
        normalizeCashierSessionRow({
          ...(item as CashierSessionRow),
          id: item.id,
          kind: item.kind,
          cartItems: item.cartItems,
        })
      )
    : canvasViewData.cashierSessionRows.map((item) =>
        normalizeCashierSessionRow({
          ...item,
          id: item.id,
          kind: item.kind,
          cartItems: item.cartItems,
        })
      );

  return posWorkspaceSnapshotSchema.parse({
    alerts: candidate?.alerts ?? true,
    data: {
      ...(candidate?.data ?? {}),
      posQueue,
      posCatalog,
      stockHistoryRows,
      saleRows,
      cashierSessionRows,
    },
  });
}

function loadPersistedStore(): PosWorkspaceSnapshot {
  if (memoryStore) {
    return memoryStore;
  }

  if (typeof window === 'undefined') {
    memoryStore = seedStore();
    return memoryStore;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      memoryStore = normalizeSnapshot(JSON.parse(raw));
      return memoryStore;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  memoryStore = window.localStorage.getItem(CLEAN_RESET_STORAGE_KEY) === '1' ? emptyStore() : seedStore();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore));
  return memoryStore;
}

function persistStore(nextStore: PosWorkspaceSnapshot): PosWorkspaceSnapshot {
  memoryStore = posWorkspaceSnapshotSchema.parse(nextStore);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore));
    window.dispatchEvent(new Event(WORKSPACE_EVENT));
  }

  return cloneValue(memoryStore);
}

function getExistingCatalogCodes(): string[] {
  return loadPersistedStore().data.posCatalog.map((item) => item.sku);
}

function formatRupiahNumber(value: number): string {
  return `Rp ${Math.max(0, Math.trunc(value)).toLocaleString('id-ID')}`;
}

function saleRowToReceivableRow(row: SaleRow): ReceivableRow {
  const total = parseCurrencyNumber(row.total);
  const paid = row.paymentAmount ? parseCurrencyNumber(row.paymentAmount) : row.status === 'Lunas' ? total : 0;
  const remaining = Math.max(0, total - paid);
  const paymentMethod = (row.method === 'Cicilan' ? 'Cicilan' : row.method === 'QRIS' || row.method === 'Transfer' || row.method === 'Tunai' ? row.method : 'Tunai') as ReceivableRow['method'];
  const paymentHistory: ReceivableRow['paymentHistory'] = paid > 0
    ? [{
        time: row.time,
        amount: normalizePriceText(row.paymentAmount ?? formatRupiahNumber(paid)),
        method: paymentMethod,
        note: row.note || '',
      }]
    : [];

  return {
    id: row.invoice,
    invoice: row.invoice,
    customer: row.customer,
    customerName: row.customerName || row.customer,
    cashier: row.cashier,
    total: row.total,
    paid: formatRupiahNumber(paid),
    remaining: formatRupiahNumber(remaining),
    method: paymentMethod,
    status: remaining === 0 ? 'Lunas' : paid > 0 ? 'Cicilan' : 'Belum dibayar',
    due: row.dueDate || '-',
    time: row.time,
    phone: row.phone || '',
    address: row.address || '',
    projectName: row.projectName || '',
    reference: row.reference || '',
    note: row.note || '',
    lastPayment: paymentHistory[0]?.time || '-',
    paymentHistory,
  };
}

async function getWorkspaceSnapshot(): Promise<PosWorkspaceSnapshot> {
  await delay(120);
  return cloneValue(loadPersistedStore());
}

async function listCatalogItems(): Promise<QueueItem[]> {
  await delay(80);
  return cloneValue(loadPersistedStore().data.posCatalog);
}

async function generateCatalogBarcode(): Promise<string> {
  await delay(30);

  const existing = new Set(getExistingCatalogCodes());
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = generateBarcodeCandidate();
    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  throw new Error('Gagal membuat barcode unik.');
}

function getNextInvoiceCode(currentRows: SaleRow[]): string {
  const nextNumber = currentRows.reduce((maxValue, row) => {
    const match = row.invoice.match(/INV-(\d+)/i);
    const value = match ? Number(match[1]) : 0;
    return Math.max(maxValue, value);
  }, 427);

  return `INV-${String(nextNumber + 1).padStart(4, '0')}`;
}

function getSessionId(kind: 'Draft' | 'Tertahan'): string {
  return `${kind.slice(0, 1)}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000).toString(36)}`.toUpperCase();
}

async function createCatalogItem(input: QueueItem): Promise<QueueItem> {
  await delay(100);

  const item = queueItemSchema.parse(input);
  const current = loadPersistedStore();
  const nextSku = item.sku.trim() || (await generateCatalogBarcode());

  if (current.data.posCatalog.some((entry) => entry.sku === nextSku)) {
    throw new Error(`Barcode ${nextSku} sudah dipakai.`);
  }

  const nextItem = normalizeQueueItem({ ...item, sku: nextSku });
  assertCatalogItemComplete(nextItem);

  if (current.data.posCatalog.some((entry) => getCatalogDuplicateKey(entry) === getCatalogDuplicateKey(nextItem))) {
    throw new Error(`Barang ${nextItem.name} dengan kategori dan satuan yang sama sudah ada.`);
  }
  const stockMovement = createStockMovementEntry({
    item: nextItem,
    beforeQty: 0,
    afterQty: nextItem.qty,
    event: 'Stock awal',
    note: 'Barang baru dibuat',
    source: 'Tambah barang',
  });

  persistStore({
    ...current,
    data: {
      ...current.data,
      posCatalog: [nextItem, ...current.data.posCatalog],
      stockHistoryRows: stockMovement ? [stockMovement, ...current.data.stockHistoryRows] : current.data.stockHistoryRows,
    },
  });

  return cloneValue(nextItem);
}

async function importCatalogItems(inputs: QueueItem[]): Promise<QueueItem[]> {
  await delay(140);

  const current = loadPersistedStore();
  const existing = new Set(current.data.posCatalog.map((item) => item.sku));
  const existingItemKeys = new Set(current.data.posCatalog.map((item) => getCatalogDuplicateKey(item)));
  const nextItems: QueueItem[] = [];
  const stockMovements: StockHistoryItem[] = [];

  for (const input of inputs) {
    const item = queueItemSchema.parse(input);
    const sku = item.sku.trim() || generateBarcodeCandidate();

    if (existing.has(sku)) {
      throw new Error(`Barcode ${sku} sudah dipakai.`);
    }

    const nextItem = normalizeQueueItem({ ...item, sku });
    assertCatalogItemComplete(nextItem);
    const duplicateKey = getCatalogDuplicateKey(nextItem);

    if (existingItemKeys.has(duplicateKey)) {
      throw new Error(`Barang ${nextItem.name} dengan kategori dan satuan yang sama sudah ada.`);
    }

    existing.add(sku);
    existingItemKeys.add(duplicateKey);
    nextItems.push(nextItem);

    const stockMovement = createStockMovementEntry({
      item: nextItem,
      beforeQty: 0,
      afterQty: nextItem.qty,
      event: 'Import',
      note: 'Barang dibuat dari import daftar barang',
      source: 'Import barang',
    });

    if (stockMovement) {
      stockMovements.push(stockMovement);
    }
  }

  persistStore({
    ...current,
    data: {
      ...current.data,
      posCatalog: [...nextItems, ...current.data.posCatalog],
      stockHistoryRows: [...stockMovements, ...current.data.stockHistoryRows],
    },
  });

  return cloneValue(nextItems);
}

async function updateCatalogItem(previousSku: string, input: QueueItem): Promise<QueueItem> {
  await delay(100);

  const item = queueItemSchema.parse(input);
  const current = loadPersistedStore();
  const index = current.data.posCatalog.findIndex((entry) => entry.sku === previousSku);

  if (index < 0) {
    throw new Error(`Barcode ${previousSku} tidak ditemukan.`);
  }

  if (item.sku !== previousSku && current.data.posCatalog.some((entry) => entry.sku === item.sku)) {
    throw new Error(`Barcode ${item.sku} sudah dipakai.`);
  }

  const nextCatalog = current.data.posCatalog.slice();
  const nextItem = normalizeQueueItem(item);
  const previousItem = current.data.posCatalog[index];
  assertCatalogItemComplete(nextItem);

  if (
    current.data.posCatalog.some(
      (entry) => entry.sku !== previousSku && getCatalogDuplicateKey(entry) === getCatalogDuplicateKey(nextItem)
    )
  ) {
    throw new Error(`Barang ${nextItem.name} dengan kategori dan satuan yang sama sudah ada.`);
  }

  nextCatalog[index] = nextItem;
  const stockMovement = createStockMovementEntry({
    item: nextItem,
    beforeQty: previousItem.qty,
    afterQty: nextItem.qty,
    event: 'Penyesuaian',
    note: 'Qty barang diubah dari halaman Barang',
    source: 'Edit barang',
  });

  persistStore({
    ...current,
    data: {
      ...current.data,
      posCatalog: nextCatalog,
      stockHistoryRows: stockMovement ? [stockMovement, ...current.data.stockHistoryRows] : current.data.stockHistoryRows,
    },
  });

  return cloneValue(nextItem);
}

async function renameCatalogCategory(previousCategory: string, nextCategory: string): Promise<number> {
  await delay(100);

  const normalizedPrevious = toCatalogText(previousCategory);
  const normalizedNext = toCatalogText(nextCategory);

  if (!normalizedPrevious || !normalizedNext) {
    throw new Error('Kategori asal dan kategori baru wajib diisi.');
  }

  const current = loadPersistedStore();
  let updatedCount = 0;
  const nextCatalog = current.data.posCatalog.map((item) => {
    if (item.category !== normalizedPrevious) {
      return item;
    }

    updatedCount += 1;
    return normalizeQueueItem({ ...item, category: normalizedNext });
  });

  if (updatedCount === 0) {
    throw new Error(`Kategori ${normalizedPrevious} tidak ditemukan.`);
  }

  persistStore({
    ...current,
    data: {
      ...current.data,
      posCatalog: nextCatalog,
    },
  });

  return updatedCount;
}

async function deleteCatalogItem(sku: string): Promise<void> {
  await delay(100);

  const current = loadPersistedStore();
  const deletedItem = current.data.posCatalog.find((entry) => entry.sku === sku);
  const nextCatalog = current.data.posCatalog.filter((entry) => entry.sku !== sku);

  if (nextCatalog.length === current.data.posCatalog.length) {
    throw new Error(`Barcode ${sku} tidak ditemukan.`);
  }
  const stockMovement = deletedItem
    ? createStockMovementEntry({
        item: deletedItem,
        beforeQty: deletedItem.qty,
        afterQty: 0,
        event: 'Hapus barang',
        note: 'Barang dihapus dari katalog',
        source: 'Hapus barang',
      })
    : null;

  persistStore({
    ...current,
    data: {
      ...current.data,
      posCatalog: nextCatalog,
      stockHistoryRows: stockMovement ? [stockMovement, ...current.data.stockHistoryRows] : current.data.stockHistoryRows,
    },
  });
}

async function restockCatalogItem(
  sku: string,
  addedQty: number,
  details?: { supplier?: string; note?: string }
): Promise<QueueItem> {
  await delay(100);

  const current = loadPersistedStore();
  const index = current.data.posCatalog.findIndex((entry) => entry.sku === sku);

  if (index < 0) {
    throw new Error(`Barcode ${sku} tidak ditemukan.`);
  }

  const existing = current.data.posCatalog[index];
  const qtyToAdd = Math.trunc(Number(addedQty));

  if (!Number.isFinite(qtyToAdd) || qtyToAdd <= 0) {
    throw new Error('Qty restok harus lebih dari 0.');
  }

  const nextItem = normalizeQueueItem({
    ...existing,
    qty: existing.qty + qtyToAdd,
  });
  assertCatalogItemComplete(nextItem);

  const nextCatalog = current.data.posCatalog.slice();
  nextCatalog[index] = nextItem;
  const time = getStockHistoryTime();
  const noteParts = [`Restok oleh user pada ${time}`];

  if (details?.supplier?.trim()) {
    noteParts.push(`Supplier: ${details.supplier.trim().toUpperCase()}`);
  }

  if (details?.note?.trim()) {
    noteParts.push(details.note.trim());
  }

  const stockMovement = createStockMovementEntry({
    item: nextItem,
    beforeQty: existing.qty,
    afterQty: nextItem.qty,
    note: noteParts.join(' - '),
    time,
    event: 'Restok',
    operator: 'ADMIN TOKO',
    source: 'Restok',
  });

  persistStore({
    ...current,
    data: {
      ...current.data,
      posCatalog: nextCatalog,
      stockHistoryRows: stockMovement ? [stockMovement, ...current.data.stockHistoryRows] : current.data.stockHistoryRows,
    },
  });

  return cloneValue(nextItem);
}

async function receiveSupplierDebtStock(input: SupplierDebtStockInput): Promise<{
  posCatalog: QueueItem[];
  stockHistoryRows: StockHistoryItem[];
}> {
  await delay(100);

  const supplier = typeof input.supplier === 'string' ? input.supplier.trim().toUpperCase() : '';
  const takeDate = typeof input.takeDate === 'string' && input.takeDate.trim() ? input.takeDate.trim() : format(new Date(), 'dd MMM yyyy');
  const validItems = input.items
    .map((item) => ({
      name: toCatalogText(item.name),
      category: toCatalogText(item.category, 'Material umum'),
      packQty: Math.trunc(Number(item.packQty)),
      unit: toCatalogText(item.unit, 'PCS'),
      price: normalizePriceText(item.price),
    }))
    .filter((item) => item.name && item.category && item.unit && Number.isFinite(item.packQty) && item.packQty > 0 && item.price.replace(/[^\d]/g, ''));

  if (!supplier) {
    throw new Error('Supplier wajib diisi.');
  }

  if (!validItems.length) {
    throw new Error('Minimal satu item hutang wajib lengkap.');
  }

  const current = loadPersistedStore();
  const nextCatalog = current.data.posCatalog.slice();
  const nextHistory: StockHistoryItem[] = [];
  const existingCodes = new Set(nextCatalog.map((item) => item.sku));
  const time = getStockHistoryTime();

  for (const item of validItems) {
    const existingIndex = nextCatalog.findIndex((entry) => getCatalogDuplicateKey(entry) === getCatalogDuplicateKey(item));

    if (existingIndex >= 0) {
      const existing = nextCatalog[existingIndex];
      const nextItem = normalizeQueueItem({
        ...existing,
        qty: existing.qty + item.packQty,
      });

      nextCatalog[existingIndex] = nextItem;
      const movement = createStockMovementEntry({
        item: nextItem,
        beforeQty: existing.qty,
        afterQty: nextItem.qty,
        event: 'Restok',
        note: `Masuk dari hutang supplier ${supplier} pada ${takeDate}`,
        operator: 'ADMIN TOKO',
        source: 'Hutang supplier',
        time,
      });

      if (movement) {
        nextHistory.push(movement);
      }
      continue;
    }

    const nextSku = generateUniqueCatalogBarcode(existingCodes);
    existingCodes.add(nextSku);
    const nextItem = normalizeQueueItem({
      sku: nextSku,
      name: item.name,
      category: item.category,
      qty: item.packQty,
      unit: item.unit,
      note: `Masuk dari hutang supplier ${supplier}`,
      price: item.price,
    });

    nextCatalog.unshift(nextItem);
    const movement = createStockMovementEntry({
      item: nextItem,
      beforeQty: 0,
      afterQty: nextItem.qty,
      event: 'Restok',
      note: `Masuk dari hutang supplier ${supplier} pada ${takeDate}`,
      operator: 'ADMIN TOKO',
      source: 'Hutang supplier',
      time,
    });

    if (movement) {
      nextHistory.push(movement);
    }
  }

  persistStore({
    ...current,
    data: {
      ...current.data,
      posCatalog: nextCatalog,
      stockHistoryRows: [...nextHistory, ...current.data.stockHistoryRows],
    },
  });

  return {
    posCatalog: cloneValue(nextCatalog),
    stockHistoryRows: cloneValue(nextHistory),
  };
}

async function checkoutSale(input: CheckoutSaleInput): Promise<SaleRow> {
  await delay(120);

  const current = loadPersistedStore();
  const cartItems = normalizeCartItems(input.cartItems);

  if (!cartItems.length) {
    throw new Error('Keranjang masih kosong.');
  }

  const catalogBySku = new Map(current.data.posCatalog.map((item) => [item.sku, item]));
  const saleTime = getStockHistoryTime();
  const cashierName = input.cashier?.trim() || 'KASIR UTAMA';
  const customerName = input.customerName?.trim() || 'PELANGGAN UMUM';
  const reference = input.reference?.trim();
  const note = input.note?.trim();
  const subtotal = calculateCartSubtotal(cartItems, catalogBySku);
  const discountMode = input.discountMode === 'percent' ? 'percent' : 'nominal';
  const discountValue = calculateDiscountAmount(subtotal, input.discount, discountMode);
  const total = Math.max(0, subtotal - discountValue);
  const paymentAmount = Math.max(0, parseCurrencyNumber(input.paymentAmount) || total);
  const nextInvoice = getNextInvoiceCode(current.data.saleRows);

  const nextCatalog = current.data.posCatalog.slice();
  const historyEntries: StockHistoryItem[] = [];

  for (const cartItem of cartItems) {
    const index = nextCatalog.findIndex((entry) => entry.sku === cartItem.sku);
    const existing = nextCatalog[index];

    if (!existing) {
      throw new Error(`Barcode ${cartItem.sku} tidak ditemukan di katalog.`);
    }

    if (existing.qty < cartItem.qty) {
      throw new Error(`Stok ${existing.name} tidak cukup untuk dijual.`);
    }

    const nextItem = normalizeQueueItem({
      ...existing,
      qty: existing.qty - cartItem.qty,
    });

    nextCatalog[index] = nextItem;

    const movement = createStockMovementEntry({
      item: nextItem,
      beforeQty: existing.qty,
      afterQty: nextItem.qty,
      event: 'Penjualan',
      note: `Terjual ke ${customerName} pada ${saleTime}`,
      operator: cashierName,
      source: 'Kasir',
      time: saleTime,
    });

    if (movement) {
      historyEntries.push(movement);
    }
  }

    const saleRow = normalizeSaleRow({
      invoice: nextInvoice,
      customer: customerName,
      cashier: cashierName,
      total: `Rp ${total.toLocaleString('id-ID')}`,
      method: input.method,
      status: input.status,
      time: saleTime,
      itemsCount: cartItems.length,
      items: cartItems.map((cartItem) => {
        const catalogItem = catalogBySku.get(cartItem.sku);

        if (!catalogItem) {
          throw new Error(`Barcode ${cartItem.sku} tidak ditemukan di katalog.`);
        }

        const price = parseCurrencyNumber(catalogItem.price);
        return {
          sku: catalogItem.sku,
          name: catalogItem.name,
          qty: cartItem.qty,
          unit: catalogItem.unit,
          price,
          subtotal: price * cartItem.qty,
        };
      }),
      customerName,
      phone: input.phone?.trim() || undefined,
      projectName: input.projectName?.trim() || undefined,
      customerType: input.customerType?.trim() || undefined,
      address: input.address?.trim() || undefined,
      reference,
      note,
      paymentAmount: `Rp ${paymentAmount.toLocaleString('id-ID')}`,
      dueDate: input.dueDate?.trim() || undefined,
      discount: normalizeDiscountText(input.discount, discountMode),
      discountMode,
    });

  persistStore({
    ...current,
    data: {
      ...current.data,
      posCatalog: nextCatalog,
      stockHistoryRows: [...historyEntries, ...current.data.stockHistoryRows],
      saleRows: [saleRow, ...current.data.saleRows],
    },
  });

  return cloneValue(saleRow);
}

async function listSaleRevisions(_saleIdOrInvoice: string): Promise<Awaited<ReturnType<PosApi['listSaleRevisions']>>> {
  await delay(20);
  return { items: [], expectedRevisionNo: 0 };
}

async function updateSaleWithRevision(saleIdOrInvoice: string, input: Parameters<PosApi['updateSaleWithRevision']>[1]): Promise<Awaited<ReturnType<PosApi['updateSaleWithRevision']>>> {
  await delay(80);
  const current = loadPersistedStore();
  const row = current.data.saleRows.find((item) => item.invoice === saleIdOrInvoice || item.id === saleIdOrInvoice);
  if (!row) {
    throw new Error('Transaksi tidak ditemukan.');
  }
  if (row.status === 'Void') {
    throw new Error('Transaksi void tidak bisa diretur.');
  }
  if (input.reason.trim().length < 5) {
    throw new Error('Alasan retur minimal 5 karakter.');
  }

  const itemBySku = new Map((row.items ?? []).map((item) => [item.sku, item]));
  const nextItems = input.items
    .filter((item) => item.qty > 0)
    .map((item) => {
      const existing = itemBySku.get(item.sku);
      if (!existing) throw new Error(`Item ${item.sku} tidak ditemukan di transaksi mock.`);
      return { ...existing, qty: item.qty, subtotal: existing.price * item.qty };
    });
  const total = nextItems.reduce((sum, item) => sum + item.subtotal, 0);
  const nextRow = normalizeSaleRow({
    ...row,
    total: `Rp ${total.toLocaleString('id-ID')}`,
    items: nextItems,
    itemsCount: nextItems.length,
    revisionCount: (row.revisionCount ?? 0) + 1,
    revised: true,
  });

  persistStore({
    ...current,
    data: {
      ...current.data,
      saleRows: current.data.saleRows.map((item) => (item.invoice === row.invoice ? nextRow : item)),
    },
  });

  return { item: cloneValue(nextRow), revisionNo: nextRow.revisionCount ?? 1, overpaidAmount: 0 };
}

async function saveCashierSession(kind: 'Draft' | 'Tertahan', input: CashierSessionInput): Promise<CashierSessionRow> {
  await delay(90);

  const current = loadPersistedStore();
  const cartItems = normalizeCartItems(input.cartItems);

  if (!cartItems.length) {
    throw new Error('Keranjang masih kosong.');
  }

  const cashierName = input.cashier?.trim() || 'KASIR UTAMA';
  const customerName = input.customerName?.trim() || 'PELANGGAN UMUM';
  const sessionTime = getStockHistoryTime();
  const subtotal = calculateCartSubtotal(cartItems, new Map(current.data.posCatalog.map((item) => [item.sku, item])));
  const discountMode = input.discountMode === 'percent' ? 'percent' : 'nominal';
  const discountValue = calculateDiscountAmount(subtotal, input.discount, discountMode);
  const total = Math.max(0, subtotal - discountValue);

  const sessionRow = normalizeCashierSessionRow({
    id: getSessionId(kind),
    kind,
    customer: customerName,
    cashier: cashierName,
    total: `Rp ${total.toLocaleString('id-ID')}`,
    method: input.method,
    status: kind,
    time: sessionTime,
    itemsCount: cartItems.length,
    cartItems,
    customerName: input.customerName,
    phone: input.phone,
    projectName: input.projectName,
    customerType: input.customerType,
    address: input.address,
    reference: input.reference,
    note: input.note,
    dueDate: input.dueDate,
    paymentAmount: input.paymentAmount,
    discount: normalizeDiscountText(input.discount, discountMode),
    discountMode,
  });

  persistStore({
    ...current,
    data: {
      ...current.data,
      cashierSessionRows: [sessionRow, ...current.data.cashierSessionRows],
    },
  });

  return cloneValue(sessionRow);
}

async function deleteCashierSession(id: string): Promise<void> {
  await delay(50);

  const current = loadPersistedStore();
  const nextRows = current.data.cashierSessionRows.filter((row) => row.id !== id);

  if (nextRows.length === current.data.cashierSessionRows.length) {
    throw new Error(`Sesi kasir ${id} tidak ditemukan.`);
  }

  persistStore({
    ...current,
    data: {
      ...current.data,
      cashierSessionRows: nextRows,
    },
  });
}

async function listReceivableRows(): Promise<ReceivableRow[]> {
  await delay(50);
  const current = loadPersistedStore();
  return cloneValue(current.data.saleRows.map(saleRowToReceivableRow).filter((row) => row.status !== 'Lunas'));
}

async function createReceivablePayment(_saleId: string, _input: { amount: string; method: string; note?: string }): Promise<ReceivableRow> {
  throw new Error('Fitur piutang belum tersedia di mode mock.');
}

async function deleteReceivablePayment(_saleId: string, _paymentId: string): Promise<void> {
  throw new Error('Fitur piutang belum tersedia di mode mock.');
}

async function listSupplierDebtRows(): Promise<SupplierDebtRow[]> {
  await delay(20);
  return [];
}

async function createSupplierDebt(_input: SupplierDebtDraft): Promise<SupplierDebtRow> {
  throw new Error('Fitur hutang supplier belum tersedia di mode mock.');
}

async function createSupplierDebtPayment(_debtId: string, _input: { amount: string; method: string; note?: string }): Promise<SupplierDebtRow> {
  throw new Error('Fitur hutang supplier belum tersedia di mode mock.');
}

async function deleteSupplierDebtPayment(_debtId: string, _paymentId: string): Promise<void> {
  throw new Error('Fitur hutang supplier belum tersedia di mode mock.');
}

async function deleteSupplierDebt(_debtId: string): Promise<void> {
  throw new Error('Fitur hutang supplier belum tersedia di mode mock.');
}

async function getReportData(_input: { from?: string; to?: string; lowStockThreshold: number }): Promise<ReportData> {
  throw new Error('Fitur laporan backend belum tersedia di mode mock.');
}

async function getAppSettings(): Promise<AppSettings> {
  await delay(20);
  loadPersistedMockSettings();
  return cloneSettings(mockAppSettings);
}

async function getPublicStoreIdentity(): Promise<AppSettings['store']> {
  await delay(20);
  loadPersistedMockSettings();
  return cloneValue(mockAppSettings.store);
}

async function login(input: { username: string; password: string; totpCode?: string }): Promise<AuthSession> {
  await delay(30);
  loadPersistedMockUsers();
  const user = mockUserRows.find((row) => row.username.toLowerCase() === input.username.trim().toLowerCase());
  const expectedPassword = user?.username === 'admin' ? 'admin123' : user?.username.startsWith('spv') ? 'supervisor123' : 'kasir123';
  if (!user || input.password !== expectedPassword) {
    throw new Error('Username atau password tidak valid.');
  }

  return {
    token: `mock-${Date.now()}`,
    user,
    rolePermissions: cloneValue(mockRolePermissions),
    forcePasswordChange: user.security === 'Reset diperlukan',
    totpRequired: false,
  };
}

async function recoveryLogin(input: { username: string; method: 'totp' | 'masterkey'; adminTotpCode?: string; masterKey?: string }): Promise<AuthSession> {
  await delay(30);
  loadPersistedMockUsers();
  const user = mockUserRows.find((row) => row.username.toLowerCase() === input.username.trim().toLowerCase());
  const validTotp = input.method === 'totp' && /^\d{6}$/.test(input.adminTotpCode ?? '');
  const validMasterKey = input.method === 'masterkey' && input.masterKey === 'TB-OFFLINE-2026';
  if (!user || (!validTotp && !validMasterKey)) {
    throw new Error('User atau kunci recovery tidak valid.');
  }

  return {
    token: `mock-recovery-${Date.now()}`,
    user,
    rolePermissions: cloneValue(mockRolePermissions),
    forcePasswordChange: true,
    totpRequired: false,
  };
}

async function logout(_token: string): Promise<void> {
  await delay(10);
}

async function changePassword(_input: { currentPassword?: string; nextPassword: string }): Promise<PasswordChangePayload> {
  await delay(30);
  const user = mockUserRows[0];
  return {
    user: { ...user, security: user.security === 'Reset diperlukan' ? 'Password' : user.security },
    forcePasswordChange: false,
  };
}

async function updateAppSettings(input: AppSettings): Promise<AppSettings> {
  await delay(40);
  mockAppSettings = cloneSettings(input);
  persistMockSettings();
  return cloneSettings(mockAppSettings);
}

async function openCashDrawer(): Promise<{ opened: boolean; skipped: boolean; message: string }> {
  await delay(30);
  return { opened: true, skipped: false, message: 'Cash drawer mock berhasil dibuka.' };
}

async function getMyAppearancePreference(): Promise<UserAppearancePreference> {
  await delay(20);
  loadPersistedMockAppearancePreference();
  return cloneValue(mockMyAppearancePreference);
}

async function updateMyAppearancePreference(input: UserAppearancePreference): Promise<UserAppearancePreference> {
  await delay(30);
  mockMyAppearancePreference = cloneValue(input);
  persistMockAppearancePreference();
  return cloneValue(mockMyAppearancePreference);
}

async function listUsers(): Promise<UserAccessPayload> {
  await delay(20);
  loadPersistedMockUsers();
  return {
    items: cloneValue(mockUserRows),
    rolePermissions: cloneValue(mockRolePermissions),
  };
}

async function listAuditLogs(_limit = 80): Promise<AuditLogRow[]> {
  await delay(20);
  return [
    { id: 'audit-mock-1', actor: 'ADMIN TOKO', action: 'auth.login', entityType: 'user', entityId: 'system-admin', reason: 'Login mock', time: 'Hari ini 08:00' },
  ];
}

async function createUser(input: { username: string; displayName: string; role: UserRow['role']; active: boolean }): Promise<PasswordResetPayload> {
  await delay(40);
  loadPersistedMockUsers();
  const row: UserRow = {
    id: `mock-${Date.now()}`,
    name: input.displayName.toUpperCase(),
    username: input.username.toLowerCase(),
    role: input.role,
    status: input.active ? 'Aktif' : 'Nonaktif',
    security: 'Reset diperlukan',
    lastLogin: 'Belum login',
    device: '-',
    scope: input.role === 'Admin' ? 'Akses penuh' : input.role === 'Supervisor' ? 'Barang, stok, laporan' : 'Kasir dan transaksi',
  };
  mockUserRows = [row, ...mockUserRows];
  persistMockUsers();
  return { item: cloneValue(row), temporaryPassword: 'TB-MOCK-2026' };
}

async function updateUser(userId: string, input: { displayName: string; role: UserRow['role']; active: boolean }): Promise<UserRow> {
  await delay(40);
  loadPersistedMockUsers();
  mockUserRows = mockUserRows.map((row) => row.id === userId ? {
    ...row,
    name: input.displayName.toUpperCase(),
    role: input.role,
    status: input.active ? 'Aktif' : 'Nonaktif',
    scope: input.role === 'Admin' ? 'Akses penuh' : input.role === 'Supervisor' ? 'Barang, stok, laporan' : 'Kasir dan transaksi',
  } : row);
  const row = mockUserRows.find((item) => item.id === userId);
  if (!row) throw new Error('User tidak ditemukan.');
  persistMockUsers();
  return cloneValue(row);
}

async function deleteUser(userId: string): Promise<void> {
  await delay(40);
  loadPersistedMockUsers();

  const target = mockUserRows.find((row) => row.id === userId);
  if (!target) {
    throw new Error('User tidak ditemukan.');
  }
  if (target.id === 'system-admin') {
    throw new Error('User yang sedang aktif tidak bisa dihapus.');
  }

  const remainingAdmins = mockUserRows.filter((row) => row.role === 'Admin' && row.id !== userId);
  if (target.role === 'Admin' && !remainingAdmins.length) {
    throw new Error('Minimal harus ada satu admin aktif.');
  }

  mockUserRows = mockUserRows.filter((row) => row.id !== userId);
  persistMockUsers();
}

async function updateRolePermissions(input: UserPermissionMap): Promise<UserPermissionMap> {
  await delay(40);
  loadPersistedMockUsers();
  mockRolePermissions = {
    ...cloneValue(input),
    Admin: cloneValue(mockRolePermissions.Admin),
  };
  persistMockUsers();
  return cloneValue(mockRolePermissions);
}

async function resetUserPassword(userId: string): Promise<PasswordResetPayload> {
  await delay(40);
  loadPersistedMockUsers();
  mockUserRows = mockUserRows.map((row) => (row.id === userId ? { ...row, security: 'Reset diperlukan' } : row));
  const row = mockUserRows.find((item) => item.id === userId);
  if (!row) throw new Error('User tidak ditemukan.');
  persistMockUsers();
  return { item: cloneValue(row), temporaryPassword: 'TB-MOCK-2026' };
}

async function setupUserTotp(_userId: string): Promise<TotpSetupPayload> {
  await delay(40);
  return {
    manualKey: 'JBSWY3DPEHPK3PXP',
    otpauthUrl: 'otpauth://totp/TOKO%20BERSAMA%20POS:mock?secret=JBSWY3DPEHPK3PXP&issuer=TOKO%20BERSAMA%20POS',
  };
}

async function verifyUserTotp(userId: string, code: string): Promise<UserRow> {
  await delay(40);
  loadPersistedMockUsers();
  if (!/^\d{6}$/.test(code)) throw new Error('Kode TOTP harus 6 digit.');
  mockUserRows = mockUserRows.map((row) => (row.id === userId ? { ...row, security: 'TOTP aktif' } : row));
  const row = mockUserRows.find((item) => item.id === userId);
  if (!row) throw new Error('User tidak ditemukan.');
  persistMockUsers();
  return cloneValue(row);
}

async function disableUserTotp(userId: string): Promise<UserRow> {
  await delay(40);
  loadPersistedMockUsers();
  mockUserRows = mockUserRows.map((row) => (row.id === userId ? { ...row, security: 'Password' } : row));
  const row = mockUserRows.find((item) => item.id === userId);
  if (!row) throw new Error('User tidak ditemukan.');
  persistMockUsers();
  return cloneValue(row);
}

async function listDatabaseBackups(): Promise<DatabaseBackupRow[]> {
  await delay(20);
  return cloneValue(mockDatabaseBackups);
}

async function createDatabaseBackup(mode: 'latest' | 'archive' = 'latest'): Promise<DatabaseBackupRow> {
  await delay(50);
  const snapshot = cloneValue(loadPersistedStore());
  const row = createMockBackupRow(mode);
  mockDatabaseBackupSnapshots[row.file] = snapshot;

  if (mode === 'latest') {
    mockDatabaseBackups = [row, ...mockDatabaseBackups.filter((item) => item.file !== row.file)];
  } else {
    mockDatabaseBackups = [row, ...mockDatabaseBackups.filter((item) => item.file !== 'TOKO-BERSAMA-auto-latest.db')];
    const latestRow = createMockBackupRow('latest');
    mockDatabaseBackupSnapshots[latestRow.file] = snapshot;
    mockDatabaseBackups = [latestRow, ...mockDatabaseBackups];
  }

  return cloneValue(row);
}

async function restoreDatabaseBackup(file: string, input: { confirmation: 'RESTORE'; reason?: string }): Promise<{ backup: DatabaseBackupRow; message: string }> {
  await delay(80);
  if (input.confirmation !== 'RESTORE') {
    throw new Error('Ketik RESTORE untuk menjalankan restore.');
  }

  const target = mockDatabaseBackups.find((item) => item.file === file);
  const snapshot = mockDatabaseBackupSnapshots[file];
  if (!target || !snapshot) {
    throw new Error(`Backup ${file} tidak ditemukan.`);
  }

  const preRestoreSnapshot = cloneValue(loadPersistedStore());
  const backup = createMockBackupRow('archive');
  mockDatabaseBackupSnapshots[backup.file] = preRestoreSnapshot;
  mockDatabaseBackups = [
    { ...backup, note: 'Auto-backup sebelum restore' },
    ...mockDatabaseBackups.filter((item) => item.file !== backup.file),
  ];

  persistStore(cloneValue(snapshot));
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CLEAN_RESET_STORAGE_KEY);
  }
  mockDatabaseBackups = [
    { ...createMockBackupRow('latest'), note: `Restore dari ${file}` },
    ...mockDatabaseBackups.filter((item) => item.file !== 'TOKO-BERSAMA-auto-latest.db'),
  ];
  mockDatabaseBackupSnapshots['TOKO-BERSAMA-auto-latest.db'] = cloneValue(snapshot);

  return {
    backup: cloneValue(backup),
    message: `Restore ${file} berhasil.`,
  };
}

async function deleteDatabaseBackup(file: string): Promise<void> {
  await delay(30);
  mockDatabaseBackups = mockDatabaseBackups.filter((item) => item.file !== file);
  delete mockDatabaseBackupSnapshots[file];
}

async function checkDatabaseHealth(): Promise<{ ok: boolean; database: string; time: string; schemaVersion: string; journalMode: string; dbPath: string; backupDir: string; }> {
  await delay(15);
  return {
    ok: true,
    database: 'ok',
    time: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    schemaVersion: 'mock-seed',
    journalMode: 'WAL',
    dbPath: 'Mock workspace',
    backupDir: 'Mock backup folder',
  };
}

async function runDatabaseVacuum(): Promise<{ message: string }> {
  await delay(40);
  return { message: 'VACUUM mock selesai dijalankan.' };
}

async function runDatabaseCheckpoint(): Promise<{ message: string }> {
  await delay(25);
  return { message: 'WAL checkpoint mock selesai dijalankan.' };
}

async function hardResetDatabase(input: { confirmation: 'RESET'; reason?: string }, _options?: { authToken?: string }): Promise<{ backup: DatabaseBackupRow; message: string }> {
  await delay(80);
  if (input.confirmation !== 'RESET') {
    throw new Error('Ketik RESET untuk menjalankan hard reset.');
  }

  const backup = createMockBackupRow('archive');
  mockDatabaseBackups = [
    { ...createMockBackupRow('latest'), note: 'Snapshot latest setelah hard reset' },
    { ...backup, file: backup.file.replace('backup', 'hard-reset'), note: 'Auto-backup sebelum hard reset' },
    ...mockDatabaseBackups.filter((item) => item.file !== 'TOKO-BERSAMA-auto-latest.db'),
  ];

  const current = loadPersistedStore();
  persistStore({
    ...current,
    data: {
      ...current.data,
      posCatalog: [],
      posQueue: [],
      stockRows: [],
      stockHistoryRows: [],
      saleRows: [],
    },
  });
  if (typeof window !== 'undefined') {
    mockUserRows = mockUserRows.filter((row) => row.username === 'admin').map((row) => ({
      ...row,
      role: 'Admin',
      status: 'Aktif',
      device: '-',
      lastLogin: 'Belum login',
      scope: 'Akses penuh',
    }));
    mockRolePermissions = {
      ...mockRolePermissions,
      Admin: ['Dashboard', 'Kasir', 'Transaksi', 'Barang', 'Stok rendah', 'Riwayat stok', 'Hutang', 'Piutang', 'Laporan', 'Database', 'Setting', 'Pengguna'],
      Supervisor: [],
      Kasir: [],
    };
    persistMockUsers();
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    window.localStorage.setItem(CLEAN_RESET_STORAGE_KEY, '1');
  }

  return {
    backup: cloneValue(mockDatabaseBackups[1] ?? backup),
    message: 'Hard reset berhasil. Data operasional sudah dikosongkan.',
  };
}

async function getMobileAdminDashboard(
  input: Parameters<PosApi['getMobileAdminDashboard']>[0] = {}
): ReturnType<PosApi['getMobileAdminDashboard']> {
  const [store, report, catalog, receivables] = await Promise.all([
    getPublicStoreIdentity(),
    getReportData({ from: input.from, to: input.to, lowStockThreshold: 20 }),
    input.section === 'inventory' ? listCatalogItems() : Promise.resolve([]),
    input.section === 'overview' || input.section === 'receivables' ? listReceivableRows() : Promise.resolve([]),
  ]);

  return {
    store,
    report: {
      ...report,
      dataset: {
        ...report.dataset,
        transactionLog: input.section === 'overview' ? report.dataset.transactionLog.slice(0, 5) : report.dataset.transactionLog,
        stockTrailRows: input.section === 'inventory' ? report.dataset.stockTrailRows.slice(0, 24) : report.dataset.stockTrailRows.slice(0, 4),
      },
    },
    catalog,
    receivables: input.section === 'overview' ? receivables.slice(0, 4) : receivables,
    loadedAt: new Date().toISOString(),
  };
}

export const mockPosApi: PosApi = {
  login,
  recoveryLogin,
  logout,
  changePassword,
  getWorkspaceSnapshot,
  listCatalogItems,
  generateCatalogBarcode,
  createCatalogItem,
  importCatalogItems,
  updateCatalogItem,
  renameCatalogCategory,
  deleteCatalogItem,
  restockCatalogItem,
  receiveSupplierDebtStock,
  checkoutSale,
  listSaleRevisions,
  updateSaleWithRevision,
  listReceivableRows,
  createReceivablePayment,
  deleteReceivablePayment,
  listSupplierDebtRows,
  createSupplierDebt,
  createSupplierDebtPayment,
  deleteSupplierDebtPayment,
  deleteSupplierDebt,
  getReportData,
  getMobileAdminDashboard,
  getPublicStoreIdentity,
  getAppSettings,
  updateAppSettings,
  openCashDrawer,
  getMyAppearancePreference,
  updateMyAppearancePreference,
  listUsers,
  listAuditLogs,
  createUser,
  updateUser,
  deleteUser,
  updateRolePermissions,
  resetUserPassword,
  setupUserTotp,
  verifyUserTotp,
  disableUserTotp,
  listDatabaseBackups,
  createDatabaseBackup,
  restoreDatabaseBackup,
  deleteDatabaseBackup,
  checkDatabaseHealth,
  runDatabaseVacuum,
  runDatabaseCheckpoint,
  hardResetDatabase,
  saveCashierSession,
  deleteCashierSession,
  eventName: WORKSPACE_EVENT,
  authExpiredEventName: AUTH_EXPIRED_EVENT,
};


