import type { ReceivableRow } from '@/contracts/pos-ui';
import type { QueueItem } from '@/contracts/pos';
import { posApi } from '../services/posApi';
import type { AppSettings, MobileAdminDashboardInput, MobileAdminDashboardMeta, ReportData } from '../services/posApi.types';

export type MobileAdminDashboardData = {
  store: AppSettings['store'];
  report: ReportData;
  catalog: QueueItem[];
  receivables: ReceivableRow[];
  loadedAt: string;
  meta?: MobileAdminDashboardMeta;
};

export async function loadMobileAdminDashboard(input: MobileAdminDashboardInput & { signal?: AbortSignal } = {}) {
  return posApi.getMobileAdminDashboard({
    from: input.from,
    to: input.to,
    section: input.section,
    inventoryQuery: input.inventoryQuery,
    inventorySort: input.inventorySort,
    inventoryLimit: input.inventoryLimit,
    inventoryCursor: input.inventoryCursor,
  }, {
    signal: input.signal,
  });
}
