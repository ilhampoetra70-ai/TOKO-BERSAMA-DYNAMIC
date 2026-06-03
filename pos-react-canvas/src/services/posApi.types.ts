import type { CashierSessionRow, PosWorkspaceSnapshot, QueueItem, SaleLineItem, SaleRow, StockHistoryItem } from '@/contracts/pos';
import type { ReceivableRow, SettingAppearanceConfig, SettingAppearanceMode, SettingAppearanceTheme, SettingReceiptLayoutConfig, SettingReceiptPaper, SupplierDebtDraft, SupplierDebtRow } from '@/contracts/pos-ui';
import type { CashierSessionInput, CheckoutSaleInput } from '@/domain/checkoutService';

export type SupplierDebtStockInput = {
  supplier: string;
  takeDate?: string;
  items: Array<{
    name: string;
    category: string;
    packQty: number;
    unit: string;
    price: number;
  }>;
};

export type PaymentInput = {
  amount: string;
  method: string;
  note?: string;
};

export type SaleRevisionRow = {
  id: string;
  saleId: string;
  revisionNo: number;
  reason: string;
  editedByUserId: string;
  editedAt: string;
  totalBefore: number;
  totalAfter: number;
  stockDelta: unknown;
};

export type SaleRevisionInput = {
  items: Array<{ sku: string; qty: number }>;
  reason: string;
  expectedRevisionNo: number;
};

export type SaleRevisionPayload = {
  item: SaleRow;
  revisionNo: number;
  overpaidAmount: number;
};

export type ReportSummary = {
  omzet: number;
  paid: number;
  receivableRemaining: number;
  debtRemaining: number;
  transactionCount: number;
  lowStockCount: number;
  criticalStockCount: number;
  debtOverdue: number;
  receivableOverdue: number;
};

export type ReportTrendRow = {
  label: string;
  omzet: number;
  masuk: number;
};

export type ReportNameStatRow = {
  label: string;
  total: number;
  count: number;
};

export type ReportHourlyRow = {
  hour: string;
  count: number;
  total: number;
};

export type ReportCashFlowRow = {
  date: string;
  startingCash: number;
  cashSales: number;
  adjustmentIn: number;
  adjustmentOut: number;
  estimatedCash: number;
  actualCash: number;
  diff: number;
  status: string;
};

export type ReportComparisonRow = {
  label: string;
  current: number;
  previous: number;
  format: 'currency' | 'number';
};

export type ReportStockAuditRow = {
  category: string;
  items: number;
  qty: number;
  low: number;
  value: number;
};

export type ReportStockMovementCategoryRow = {
  category: string;
  movementCount: number;
  netMovement: number;
};

export type ReportStockTrailRow = {
  time: string;
  item: string;
  movement: string;
  note: string;
  event: string;
  beforeQty?: number;
  afterQty?: number;
  operator?: string;
  source?: string;
};

export type ReportTopProductRow = {
  sku: string;
  name: string;
  qty: number;
  total: number;
  category: string;
};

export type ReportTopProductChartRow = {
  item: string;
  total: number;
  count: number;
};

export type ReportDataset = {
  transactionLog: Array<SaleRow & {
    totalNumber: number;
    paidNumber: number;
    remainingNumber: number;
    customerName: string;
    items: SaleLineItem[];
  }>;
  averageSale: number;
  estimatedCost: number;
  grossProfit: number;
  margin: number;
  topProducts: ReportTopProductRow[];
  topProductsChart: ReportTopProductChartRow[];
  customerByName: ReportNameStatRow[];
  customerByAddress: ReportNameStatRow[];
  hourlyChart: ReportHourlyRow[];
  cashFlowRows: ReportCashFlowRow[];
  cashFlowChart: Array<{ label: string; value: number }>;
  comparisonRows: ReportComparisonRow[];
  stockAuditRows: ReportStockAuditRow[];
  stockMovementCategoryRows: ReportStockMovementCategoryRow[];
  stockTrailRows: ReportStockTrailRow[];
};

export type ReportData = {
  summary: ReportSummary;
  transactionTrend: ReportTrendRow[];
  paymentDistribution: Array<{ method: string; total: number }>;
  categoryDistribution: Array<{ category: string; value: number }>;
  receivableDebtChart: Array<{ label: string; value: number }>;
  stockMovementChart: Array<{ label: string; value: number }>;
  dataset: ReportDataset;
};

export type MobileAdminDashboardSection = 'overview' | 'transactions' | 'inventory' | 'receivables' | 'settings';
export type MobileAdminInventorySort = 'priority' | 'stockLow' | 'priceHigh' | 'priceLow' | 'name';

export type MobileAdminDashboardInput = {
  from?: string;
  to?: string;
  section?: MobileAdminDashboardSection;
  inventoryQuery?: string;
  inventorySort?: MobileAdminInventorySort;
  inventoryLimit?: number;
  inventoryCursor?: number;
};

export type MobileAdminDashboardMeta = {
  inventory?: {
    total: number;
    filtered: number;
    returned: number;
    limit: number;
    cursor: number;
    nextCursor: number | null;
    hasMore: boolean;
  };
};

export type MobileAdminDashboardData = {
  store: AppSettings['store'];
  report: ReportData;
  catalog: QueueItem[];
  receivables: ReceivableRow[];
  loadedAt: string;
  meta?: MobileAdminDashboardMeta;
};

export type AppSettings = {
  store: {
    name: string;
    address: string;
    phone: string;
    logoDataUrl: string | null;
    logoFileName: string;
    logoFileSizeKb: number | null;
  };
  printer: {
    activePrinter: string;
    behavior: string;
    paper: SettingReceiptPaper;
  };
  cashDrawer: {
    enabled: boolean;
    interface: string;
    connectionMode: 'windows' | 'network';
    printerName: string;
    networkInterface: string;
    printerType: 'EPSON' | 'STAR' | 'TANCA' | 'DARUMA' | 'BROTHER' | 'CUSTOM';
    openOnCashCheckout: boolean;
    openOnReceivablePayment: boolean;
  };
  receipt: {
    layout: SettingReceiptLayoutConfig;
    previewPaper: SettingReceiptPaper;
  };
  appearance: SettingAppearanceConfig;
};

export type DatabaseBackupRow = {
  file: string;
  time: string;
  size: string;
  status: 'Valid';
  note: string;
  latest: boolean;
};

export type DatabaseHealthPayload = {
  ok: boolean;
  database: string;
  time: string;
  schemaVersion: string;
  journalMode: string;
  dbPath: string;
  backupDir: string;
};

export type UserRow = {
  id: string;
  name: string;
  username: string;
  role: 'Admin' | 'Supervisor' | 'Kasir';
  status: 'Aktif' | 'Nonaktif';
  security: 'TOTP aktif' | 'Password' | 'Reset diperlukan';
  lastLogin: string;
  device: string;
  scope: string;
};

export type UserPermissionMap = Record<'Admin' | 'Supervisor' | 'Kasir', string[]>;

export type UserAccessPayload = {
  items: UserRow[];
  rolePermissions: UserPermissionMap;
};

export type UserThemeAccent = 'amber' | 'emerald' | 'sky' | 'rose';

export type UserAppearancePreference = {
  mode: SettingAppearanceMode;
  accent: UserThemeAccent;
  theme: SettingAppearanceTheme;
};

export type TotpSetupPayload = {
  manualKey: string;
  otpauthUrl: string;
};

export type AuthSession = {
  token: string;
  user: UserRow;
  rolePermissions: UserPermissionMap;
  forcePasswordChange: boolean;
  totpRequired: boolean;
  rotatedMasterKey?: string;
};

export type PasswordResetPayload = {
  item: UserRow;
  temporaryPassword: string;
};

export type PasswordChangePayload = {
  user: UserRow;
  forcePasswordChange: boolean;
};

export type AuditLogRow = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string;
  time: string;
};

export type PosApi = {
  login(input: { username: string; password: string; totpCode?: string }): Promise<AuthSession>;
  recoveryLogin(input: { username: string; method: 'totp' | 'masterkey'; adminTotpCode?: string; masterKey?: string }): Promise<AuthSession>;
  logout(token: string): Promise<void>;
  changePassword(input: { currentPassword?: string; nextPassword: string }): Promise<PasswordChangePayload>;
  getWorkspaceSnapshot(): Promise<PosWorkspaceSnapshot>;
  listCatalogItems(): Promise<QueueItem[]>;
  generateCatalogBarcode(): Promise<string>;
  createCatalogItem(input: QueueItem): Promise<QueueItem>;
  importCatalogItems(inputs: QueueItem[]): Promise<QueueItem[]>;
  updateCatalogItem(previousSku: string, input: QueueItem): Promise<QueueItem>;
  renameCatalogCategory(previousCategory: string, nextCategory: string): Promise<number>;
  deleteCatalogItem(sku: string): Promise<void>;
  restockCatalogItem(sku: string, addedQty: number, details?: { supplier?: string; note?: string }): Promise<QueueItem>;
  receiveSupplierDebtStock(input: SupplierDebtStockInput): Promise<{
    posCatalog: QueueItem[];
    stockHistoryRows: StockHistoryItem[];
  }>;
  checkoutSale(input: CheckoutSaleInput): Promise<SaleRow>;
  listSaleRevisions(saleIdOrInvoice: string): Promise<{ items: SaleRevisionRow[]; expectedRevisionNo: number }>;
  updateSaleWithRevision(saleIdOrInvoice: string, input: SaleRevisionInput): Promise<SaleRevisionPayload>;
  listReceivableRows(): Promise<ReceivableRow[]>;
  createReceivablePayment(saleId: string, input: PaymentInput): Promise<ReceivableRow>;
  deleteReceivablePayment(saleId: string, paymentId: string): Promise<void>;
  listSupplierDebtRows(): Promise<SupplierDebtRow[]>;
  createSupplierDebt(input: SupplierDebtDraft): Promise<SupplierDebtRow>;
  createSupplierDebtPayment(debtId: string, input: PaymentInput): Promise<SupplierDebtRow>;
  deleteSupplierDebtPayment(debtId: string, paymentId: string): Promise<void>;
  deleteSupplierDebt(debtId: string): Promise<void>;
  getReportData(input: { from?: string; to?: string; lowStockThreshold: number }): Promise<ReportData>;
  getMobileAdminDashboard(input: MobileAdminDashboardInput, options?: { signal?: AbortSignal }): Promise<MobileAdminDashboardData>;
  getPublicStoreIdentity(): Promise<AppSettings['store']>;
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(input: AppSettings): Promise<AppSettings>;
  openCashDrawer(input?: { force?: boolean }): Promise<{ opened: boolean; skipped: boolean; message: string }>;
  getMyAppearancePreference(): Promise<UserAppearancePreference>;
  updateMyAppearancePreference(input: UserAppearancePreference): Promise<UserAppearancePreference>;
  listUsers(): Promise<UserAccessPayload>;
  listAuditLogs(limit?: number): Promise<AuditLogRow[]>;
  createUser(input: { username: string; displayName: string; role: UserRow['role']; active: boolean }): Promise<PasswordResetPayload>;
  updateUser(userId: string, input: { displayName: string; role: UserRow['role']; active: boolean }): Promise<UserRow>;
  deleteUser(userId: string): Promise<void>;
  updateRolePermissions(input: UserPermissionMap): Promise<UserPermissionMap>;
  resetUserPassword(userId: string): Promise<PasswordResetPayload>;
  setupUserTotp(userId: string): Promise<TotpSetupPayload>;
  verifyUserTotp(userId: string, code: string): Promise<UserRow>;
  disableUserTotp(userId: string): Promise<UserRow>;
  listDatabaseBackups(): Promise<DatabaseBackupRow[]>;
  createDatabaseBackup(mode?: 'latest' | 'archive'): Promise<DatabaseBackupRow>;
  restoreDatabaseBackup(file: string, input: { confirmation: 'RESTORE'; reason?: string }): Promise<{ backup: DatabaseBackupRow; message: string }>;
  deleteDatabaseBackup(file: string): Promise<void>;
  checkDatabaseHealth(): Promise<DatabaseHealthPayload>;
  runDatabaseVacuum(): Promise<{ message: string }>;
  runDatabaseCheckpoint(): Promise<{ message: string }>;
  hardResetDatabase(input: { confirmation: 'RESET'; reason?: string }, options?: { authToken?: string }): Promise<{ backup: DatabaseBackupRow; message: string }>;
  saveCashierSession(kind: 'Draft' | 'Tertahan', input: CashierSessionInput): Promise<CashierSessionRow>;
  deleteCashierSession(id: string): Promise<void>;
  eventName: string;
  authExpiredEventName: string;
};
