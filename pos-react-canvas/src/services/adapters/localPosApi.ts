import type { CashierSessionRow, PosWorkspaceSnapshot, QueueItem, SaleRow, StockHistoryItem } from '@/contracts/pos';
import type { ReceivableRow, SupplierDebtDraft, SupplierDebtRow } from '@/contracts/pos-ui';
import type { CashierSessionInput, CheckoutSaleInput } from '@/domain/checkoutService';
import { AUTH_STORAGE_KEY, readRuntimeAuthToken } from '@/lib/authSession';
import type { AppSettings, AuditLogRow, AuthSession, DatabaseBackupRow, DatabaseHealthPayload, MobileAdminDashboardData, PasswordChangePayload, PasswordResetPayload, PosApi, PaymentInput, ReportData, SaleRevisionInput, SaleRevisionPayload, SaleRevisionRow, SupplierDebtStockInput, TotpSetupPayload, UserAccessPayload, UserAppearancePreference, UserPermissionMap, UserRow } from '../posApi.types';

type LocalApiOptions = {
  baseUrl: string;
};

type CatalogItemsPayload = {
  items: QueueItem[];
};

type CatalogItemPayload = {
  item: QueueItem;
};

type BarcodePayload = {
  barcode: string;
};

type SalePayload = {
  item: SaleRow;
};
type SaleRevisionListPayload = {
  items: SaleRevisionRow[];
  expectedRevisionNo: number;
};

type FinanceListPayload<T> = {
  items: T[];
};

type DatabaseBackupPayload = {
  item: DatabaseBackupRow;
  items: DatabaseBackupRow[];
};

type DatabaseHardResetPayload = {
  backup: DatabaseBackupRow;
  message: string;
};

type ReportPayload = ReportData;
type SettingsPayload = {
  item: AppSettings;
};
type PublicStorePayload = {
  item: AppSettings['store'];
};
type UserRowPayload = {
  item: UserRow;
};
type UserAppearancePreferencePayload = {
  item: UserAppearancePreference;
};

type LocalApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
    method?: string;
    path?: string;
    timestamp?: string;
  };
};

const WORKSPACE_EVENT = 'tokobersama:workspace-updated';
const AUTH_EXPIRED_EVENT = 'tokobersama:auth-expired';

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function readStoredAuthToken() {
  const runtimeToken = readRuntimeAuthToken();
  if (runtimeToken) {
    return runtimeToken;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { token?: string };
    if (parsed.token) {
      return parsed.token;
    }
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return null;
}

function formatErrorDetails(details: unknown) {
  if (!details) return '';
  if (typeof details === 'string') return details;

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

async function readJsonResponse<T>(response: Response, method: string, path: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    return response.json() as Promise<T>;
  }

  const rawBody = await response.text();
  if (!rawBody) {
    return undefined as T;
  }

  const trimmedBody = rawBody.trimStart();
  if (trimmedBody.startsWith('<!doctype') || trimmedBody.startsWith('<html')) {
    throw new LocalApiRequestError(
      `Endpoint ${method} ${path} mengembalikan HTML, bukan JSON. Pastikan base URL menunjuk ke local-api:8731, bukan origin admin.`,
      {
        status: response.status,
        code: 'LOCAL_API_HTML_RESPONSE',
        requestId: response.headers.get('x-tokobersama-request-id') || '-',
        method,
        path,
      }
    );
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new LocalApiRequestError(
      `Endpoint ${method} ${path} mengembalikan respons non-JSON.`,
      {
        status: response.status,
        code: 'LOCAL_API_NON_JSON_RESPONSE',
        requestId: response.headers.get('x-tokobersama-request-id') || '-',
        method,
        path,
      }
    );
  }
}

class LocalApiRequestError extends Error {
  constructor(
    message: string,
    readonly context: {
      status: number;
      code: string;
      requestId: string;
      method: string;
      path: string;
      details?: unknown;
      timestamp?: string;
    }
  ) {
    super(message);
    this.name = 'LocalApiRequestError';
  }
}

async function requestJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const method = init?.method ?? 'GET';

  if (typeof window !== 'undefined') {
    const authToken = readStoredAuthToken();
    if (authToken && !headers.has('authorization')) {
      headers.set('authorization', `Bearer ${authToken}`);
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = await readJsonResponse<LocalApiErrorPayload | null>(response, method, path).catch((error) => {
      if (error instanceof LocalApiRequestError) {
        throw error;
      }
      return null;
    }) as LocalApiErrorPayload | null;
    const errorPayload = payload?.error;
    const requestId = errorPayload?.requestId || response.headers.get('x-tokobersama-request-id') || '-';
    const errorMethod = errorPayload?.method || method;
    const errorPath = errorPayload?.path || path.split('?')[0] || path;
    const details = formatErrorDetails(errorPayload?.details);
    const baseMessage = errorPayload?.message || details || `Local API error ${response.status}`;
    const diagnosticSuffix = `Kode diagnosis: ${requestId}; endpoint: ${errorMethod} ${errorPath}.`;
    if (response.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/login') && !path.startsWith('/auth/recovery-login')) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, {
        detail: {
          message: errorPayload?.message || 'Sesi sudah berakhir. Silakan login ulang.',
        },
      }));
    }
    throw new LocalApiRequestError(`${baseMessage} ${diagnosticSuffix}`, {
      status: response.status,
      code: errorPayload?.code || 'LOCAL_API_ERROR',
      requestId,
      method: errorMethod,
      path: errorPath,
      details: errorPayload?.details,
      timestamp: errorPayload?.timestamp,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return readJsonResponse<T>(response, method, path);
}

function dispatchWorkspaceUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(WORKSPACE_EVENT));
  }
}

async function mutate<T>(work: Promise<T>): Promise<T> {
  const result = await work;
  dispatchWorkspaceUpdate();
  return result;
}

export function createLocalPosApi(options: LocalApiOptions): PosApi {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  return {
    async login(input) {
      return requestJson<AuthSession>(baseUrl, '/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    async recoveryLogin(input) {
      return requestJson<AuthSession>(baseUrl, '/auth/recovery-login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    async logout(token: string) {
      await requestJson<void>(baseUrl, '/auth/logout', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
    },

    async changePassword(input) {
      return requestJson<PasswordChangePayload>(baseUrl, '/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    async getWorkspaceSnapshot() {
      return requestJson<PosWorkspaceSnapshot>(baseUrl, '/workspace');
    },

    async listCatalogItems() {
      const payload = await requestJson<CatalogItemsPayload>(baseUrl, '/catalog');
      return payload.items;
    },

    async generateCatalogBarcode() {
      const payload = await requestJson<BarcodePayload>(baseUrl, '/catalog/barcode');
      return payload.barcode;
    },

    async createCatalogItem(input: QueueItem) {
      const payload = await mutate(requestJson<CatalogItemPayload>(baseUrl, '/catalog', {
        method: 'POST',
        body: JSON.stringify(input),
      }));
      return payload.item;
    },

    async importCatalogItems(inputs: QueueItem[]) {
      const payload = await mutate(requestJson<CatalogItemsPayload>(baseUrl, '/catalog/import', {
        method: 'POST',
        body: JSON.stringify({ items: inputs }),
      }));
      return payload.items;
    },

    async updateCatalogItem(previousSku: string, input: QueueItem) {
      const payload = await mutate(requestJson<CatalogItemPayload>(baseUrl, `/catalog/${encodeURIComponent(previousSku)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }));
      return payload.item;
    },

    async renameCatalogCategory(previousCategory: string, nextCategory: string) {
      const payload = await mutate(requestJson<{ updatedCount: number }>(baseUrl, '/catalog/categories/rename', {
        method: 'PATCH',
        body: JSON.stringify({ previousCategory, nextCategory }),
      }));
      return payload.updatedCount;
    },

    async deleteCatalogItem(sku: string) {
      await mutate(requestJson<void>(baseUrl, `/catalog/${encodeURIComponent(sku)}`, {
        method: 'DELETE',
      }));
    },

    async restockCatalogItem(sku: string, addedQty: number, details?: { supplier?: string; note?: string }) {
      const payload = await mutate(requestJson<CatalogItemPayload>(baseUrl, `/catalog/${encodeURIComponent(sku)}/restock`, {
        method: 'POST',
        body: JSON.stringify({ addedQty, ...details }),
      }));
      return payload.item;
    },

    async receiveSupplierDebtStock(input: SupplierDebtStockInput): Promise<{
      posCatalog: QueueItem[];
      stockHistoryRows: StockHistoryItem[];
    }> {
      return mutate(requestJson<{
        posCatalog: QueueItem[];
        stockHistoryRows: StockHistoryItem[];
      }>(baseUrl, '/supplier-debts/receive-stock', {
        method: 'POST',
        body: JSON.stringify(input),
      }));
    },

    async checkoutSale(input: CheckoutSaleInput) {
      const payload = await mutate(requestJson<SalePayload>(baseUrl, '/sales/checkout', {
        method: 'POST',
        body: JSON.stringify(input),
      }));
      return payload.item;
    },

    async listSaleRevisions(saleIdOrInvoice: string) {
      return requestJson<SaleRevisionListPayload>(baseUrl, `/sales/${encodeURIComponent(saleIdOrInvoice)}/revisions`);
    },

    async updateSaleWithRevision(saleIdOrInvoice: string, input: SaleRevisionInput) {
      return mutate(requestJson<SaleRevisionPayload>(baseUrl, `/sales/${encodeURIComponent(saleIdOrInvoice)}/revision`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }));
    },

    async listReceivableRows() {
      const payload = await requestJson<FinanceListPayload<ReceivableRow>>(baseUrl, '/receivables');
      return payload.items;
    },

    async createReceivablePayment(saleId: string, input: PaymentInput) {
      const payload = await mutate(requestJson<SalePayload>(baseUrl, `/receivables/${encodeURIComponent(saleId)}/payments`, {
        method: 'POST',
        body: JSON.stringify(input),
      }));
      return payload.item as unknown as ReceivableRow;
    },

    async deleteReceivablePayment(saleId: string, paymentId: string) {
      await mutate(requestJson<void>(baseUrl, `/receivables/${encodeURIComponent(saleId)}/payments/${encodeURIComponent(paymentId)}`, {
        method: 'DELETE',
      }));
    },

    async listSupplierDebtRows() {
      const payload = await requestJson<FinanceListPayload<SupplierDebtRow>>(baseUrl, '/supplier-debts');
      return payload.items;
    },

    async createSupplierDebt(input: SupplierDebtDraft) {
      const payload = await mutate(requestJson<{ item: SupplierDebtRow }>(baseUrl, '/supplier-debts', {
        method: 'POST',
        body: JSON.stringify({
          supplier: input.supplier,
          takeDate: input.takeDate,
          dueDate: input.due || undefined,
          items: input.items.map((item) => ({
            name: item.name,
            category: item.category,
            unit: item.unit,
            qty: item.packQty,
            price: item.price,
          })),
        }),
      }));
      return payload.item;
    },

    async createSupplierDebtPayment(debtId: string, input: PaymentInput) {
      const payload = await mutate(requestJson<{ item: SupplierDebtRow }>(baseUrl, `/supplier-debts/${encodeURIComponent(debtId)}/payments`, {
        method: 'POST',
        body: JSON.stringify(input),
      }));
      return payload.item;
    },

    async deleteSupplierDebtPayment(debtId: string, paymentId: string) {
      await mutate(requestJson<void>(baseUrl, `/supplier-debts/${encodeURIComponent(debtId)}/payments/${encodeURIComponent(paymentId)}`, {
        method: 'DELETE',
      }));
    },

    async deleteSupplierDebt(debtId: string) {
      await mutate(requestJson<void>(baseUrl, `/supplier-debts/${encodeURIComponent(debtId)}`, {
        method: 'DELETE',
      }));
    },

    async getReportData(input) {
      const params = new URLSearchParams();
      if (input.from) params.set('from', input.from);
      if (input.to) params.set('to', input.to);
      params.set('lowStockThreshold', String(input.lowStockThreshold));
      return requestJson<ReportPayload>(baseUrl, `/reports?${params.toString()}`);
    },

    async getMobileAdminDashboard(input, options) {
      const params = new URLSearchParams();
      if (input.from) params.set('from', input.from);
      if (input.to) params.set('to', input.to);
      if (input.section) params.set('section', input.section);
      if (input.inventoryQuery) params.set('inventoryQuery', input.inventoryQuery);
      if (input.inventorySort) params.set('inventorySort', input.inventorySort);
      if (typeof input.inventoryLimit === 'number') params.set('inventoryLimit', String(input.inventoryLimit));
      if (typeof input.inventoryCursor === 'number') params.set('inventoryCursor', String(input.inventoryCursor));
      params.set('lowStockThreshold', '20');
      return requestJson<MobileAdminDashboardData>(baseUrl, `/admin-api/dashboard?${params.toString()}`, {
        signal: options?.signal,
      });
    },

    async getPublicStoreIdentity() {
      const payload = await requestJson<PublicStorePayload>(baseUrl, '/settings/public');
      return payload.item;
    },

    async getAppSettings() {
      const payload = await requestJson<SettingsPayload>(baseUrl, '/settings');
      return payload.item;
    },

    async updateAppSettings(input) {
      const payload = await mutate(requestJson<SettingsPayload>(baseUrl, '/settings', {
        method: 'PUT',
        body: JSON.stringify(input),
      }));
      return payload.item;
    },

    async openCashDrawer(input = { force: true }) {
      const payload = await mutate(requestJson<{ item: { opened: boolean; skipped: boolean; message: string } }>(baseUrl, '/hardware/cash-drawer/open', {
        method: 'POST',
        body: JSON.stringify(input),
      }));
      return payload.item;
    },

    async getMyAppearancePreference() {
      const payload = await requestJson<UserAppearancePreferencePayload>(baseUrl, '/users/me/preferences');
      return payload.item;
    },

    async updateMyAppearancePreference(input) {
      const payload = await mutate(requestJson<UserAppearancePreferencePayload>(baseUrl, '/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify(input),
      }));
      return payload.item;
    },

    async listUsers() {
      return requestJson<UserAccessPayload>(baseUrl, '/users');
    },

    async listAuditLogs(limit = 80) {
      const payload = await requestJson<FinanceListPayload<AuditLogRow>>(baseUrl, `/users/audit-logs?limit=${encodeURIComponent(String(limit))}`);
      return payload.items;
    },

    async createUser(input) {
      return mutate(requestJson<PasswordResetPayload>(baseUrl, '/users', {
        method: 'POST',
        body: JSON.stringify(input),
      }));
    },

    async updateUser(userId, input) {
      const payload = await mutate(requestJson<UserRowPayload>(baseUrl, `/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }));
      return payload.item;
    },

    async deleteUser(userId: string) {
      await mutate(requestJson<void>(baseUrl, `/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      }));
    },

    async updateRolePermissions(input: UserPermissionMap) {
      const payload = await mutate(requestJson<{ rolePermissions: UserPermissionMap }>(baseUrl, '/users/permissions', {
        method: 'PUT',
        body: JSON.stringify({ rolePermissions: input }),
      }));
      return payload.rolePermissions;
    },

    async resetUserPassword(userId: string) {
      return mutate(requestJson<PasswordResetPayload>(baseUrl, `/users/${encodeURIComponent(userId)}/password-reset`, {
        method: 'POST',
      }));
    },

    async setupUserTotp(userId: string) {
      return mutate(requestJson<TotpSetupPayload>(baseUrl, `/users/${encodeURIComponent(userId)}/totp/setup`, {
        method: 'POST',
      }));
    },

    async verifyUserTotp(userId: string, code: string) {
      const payload = await mutate(requestJson<UserRowPayload>(baseUrl, `/users/${encodeURIComponent(userId)}/totp/verify`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      }));
      return payload.item;
    },

    async disableUserTotp(userId: string) {
      const payload = await mutate(requestJson<UserRowPayload>(baseUrl, `/users/${encodeURIComponent(userId)}/totp`, {
        method: 'DELETE',
      }));
      return payload.item;
    },

    async listDatabaseBackups() {
      const payload = await requestJson<FinanceListPayload<DatabaseBackupRow>>(baseUrl, '/database/backups');
      return payload.items;
    },

    async createDatabaseBackup(mode = 'latest') {
      const payload = await mutate(requestJson<DatabaseBackupPayload>(baseUrl, '/database/backups', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      }));
      return payload.item;
    },

    async restoreDatabaseBackup(file, input) {
      return mutate(requestJson<DatabaseHardResetPayload>(baseUrl, `/database/backups/${encodeURIComponent(file)}/restore`, {
        method: 'POST',
        body: JSON.stringify(input),
      }));
    },

    async deleteDatabaseBackup(file) {
      await mutate(requestJson<void>(baseUrl, `/database/backups/${encodeURIComponent(file)}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE' }),
      }));
    },

    async checkDatabaseHealth() {
      return requestJson<DatabaseHealthPayload>(baseUrl, '/database/health');
    },

    async runDatabaseVacuum() {
      return mutate(requestJson<{ message: string }>(baseUrl, '/database/maintenance/vacuum', {
        method: 'POST',
      }));
    },

    async runDatabaseCheckpoint() {
      return mutate(requestJson<{ message: string }>(baseUrl, '/database/maintenance/checkpoint', {
        method: 'POST',
      }));
    },

    async hardResetDatabase(input, options) {
      const headers = options?.authToken
        ? { authorization: `Bearer ${options.authToken}` }
        : undefined;

      return mutate(requestJson<DatabaseHardResetPayload>(baseUrl, '/database/hard-reset', {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      }));
    },

    async saveCashierSession(kind: 'Draft' | 'Tertahan', input: CashierSessionInput): Promise<CashierSessionRow> {
      const payload = await mutate(requestJson<{ item: CashierSessionRow }>(baseUrl, '/cashier-sessions', {
        method: 'POST',
        body: JSON.stringify({ kind, input }),
      }));
      return payload.item;
    },

    async deleteCashierSession(id: string): Promise<void> {
      await mutate(requestJson<void>(baseUrl, `/cashier-sessions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }));
    },

    eventName: WORKSPACE_EVENT,
    authExpiredEventName: AUTH_EXPIRED_EVENT,
  };
}

export const localApiRequest = requestJson;
