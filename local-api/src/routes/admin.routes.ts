import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DbClient } from '../db/client.js';
import { toQueueItem } from '../domain/catalogFormat.js';
import { CatalogRepository, type ProductRecord } from '../repositories/catalogRepository.js';
import { SalesRepository } from '../repositories/salesRepository.js';
import { StockRepository, type StockMovementRecord } from '../repositories/stockRepository.js';
import { SupplierDebtRepository } from '../repositories/supplierDebtRepository.js';
import { type PermissionResource, UserRepository } from '../repositories/userRepository.js';
import type { AuthenticatedRequest } from '../http/authHook.js';
import { ForbiddenError, ValidationError } from '../core/errors.js';
import { getSettings } from './settings.routes.js';
import { listReceivableRows } from './finance.routes.js';
import { buildResponse } from '../services/reportBuilder.js';

const adminDashboardQuerySchema = z.object({
  section: z.enum(['overview', 'transactions', 'inventory', 'receivables', 'settings']).default('overview'),
  from: z.string().optional(),
  to: z.string().optional(),
  lowStockThreshold: z.coerce.number().int().positive().default(20),
  inventoryQuery: z.string().trim().max(120).default(''),
  inventorySort: z.enum(['priority', 'stockLow', 'priceHigh', 'priceLow', 'name']).default('priority'),
  inventoryLimit: z.coerce.number().int().positive().max(220).default(180),
  inventoryCursor: z.coerce.number().int().nonnegative().default(0),
});

type AdminReport = ReturnType<typeof buildResponse>;
const adminDashboardLimits = {
  overviewTransactions: 5,
  overviewReceivables: 4,
  overviewStockTrail: 4,
  overviewTopProducts: 4,
  transactionsPage: 300,
  inventoryStockTrail: 80,
  receivablesPage: 300,
} as const;

const sectionResources: Record<z.infer<typeof adminDashboardQuerySchema>['section'], PermissionResource> = {
  overview: 'Dashboard',
  transactions: 'Transaksi',
  inventory: 'Barang',
  receivables: 'Piutang',
  settings: 'Dashboard',
};

function createEmptyReport(): AdminReport {
  return {
    summary: {
      omzet: 0,
      paid: 0,
      receivableRemaining: 0,
      debtRemaining: 0,
      transactionCount: 0,
      lowStockCount: 0,
      criticalStockCount: 0,
      debtOverdue: 0,
      receivableOverdue: 0,
    },
    transactionTrend: [],
    paymentDistribution: [],
    categoryDistribution: [],
    receivableDebtChart: [],
    stockMovementChart: [],
    dataset: {
      transactionLog: [],
      averageSale: 0,
      estimatedCost: 0,
      grossProfit: 0,
      margin: 0,
      topProducts: [],
      topProductsChart: [],
      customerByName: [],
      customerByAddress: [],
      hourlyChart: [],
      cashFlowRows: [],
      cashFlowChart: [],
      comparisonRows: [],
      stockAuditRows: [],
      stockMovementCategoryRows: [],
      stockTrailRows: [],
    },
  };
}

function toStockTrailRow(row: StockMovementRecord) {
  return {
    time: row.created_at,
    item: row.product_name,
    movement: String(row.movement_qty),
    note: row.reason ?? row.source,
    event: row.type,
    beforeQty: row.before_qty,
    afterQty: row.after_qty,
    operator: row.created_by_display_name || row.created_by_user_id,
    source: row.source,
  };
}

function buildInventoryReport(products: ProductRecord[], stockRepository: StockRepository, lowStockThreshold: number, stockTrailLimit: number): AdminReport {
  const report = createEmptyReport();
  const categoryRows = Array.from(products.reduce((map, item) => {
    const current = map.get(item.category_name) ?? { category: item.category_name, items: 0, qty: 0, low: 0, value: 0 };
    current.items += 1;
    current.qty += item.qty;
    current.low += item.qty <= lowStockThreshold ? 1 : 0;
    current.value += item.qty * item.unit_price;
    map.set(item.category_name, current);
    return map;
  }, new Map<string, { category: string; items: number; qty: number; low: number; value: number }>()).values())
    .map((row) => ({ ...row, value: Number((row.value / 1000000).toFixed(2)) }))
    .sort((left, right) => right.value - left.value);

  report.summary.lowStockCount = products.filter((item) => item.qty <= lowStockThreshold).length;
  report.summary.criticalStockCount = products.filter((item) => item.qty <= Math.max(1, Math.floor(lowStockThreshold / 2))).length;
  report.dataset.stockAuditRows = categoryRows;
  report.dataset.stockTrailRows = stockRepository.listRecent(stockTrailLimit).map(toStockTrailRow);
  report.stockMovementChart = [
    { label: 'Stok rendah', value: report.summary.lowStockCount },
    { label: 'Critical', value: report.summary.criticalStockCount },
  ];

  return report;
}

function normalizeInventorySearch(value: string) {
  return value.toLowerCase().trim();
}

function getInventoryStatusRank(item: ProductRecord, lowStockThreshold: number) {
  if (item.qty <= 0) return 0;
  if (item.qty <= lowStockThreshold) return 1;
  return 2;
}

function filterInventoryProducts(products: ProductRecord[], query: string) {
  const needle = normalizeInventorySearch(query);
  if (!needle) return products;

  return products.filter((item) => normalizeInventorySearch([
    item.name,
    item.category_name,
    item.barcode,
    item.unit,
    item.note,
  ].join(' ')).includes(needle));
}

function sortInventoryProducts(products: ProductRecord[], sort: z.infer<typeof adminDashboardQuerySchema>['inventorySort'], lowStockThreshold: number) {
  return products.slice().sort((left, right) => {
    if (sort === 'name') return left.name.localeCompare(right.name, 'id');
    if (sort === 'stockLow') return left.qty - right.qty || left.name.localeCompare(right.name, 'id');
    if (sort === 'priceHigh') return right.unit_price - left.unit_price || left.name.localeCompare(right.name, 'id');
    if (sort === 'priceLow') return left.unit_price - right.unit_price || left.name.localeCompare(right.name, 'id');

    const statusDiff = getInventoryStatusRank(left, lowStockThreshold) - getInventoryStatusRank(right, lowStockThreshold);
    if (statusDiff) return statusDiff;
    return left.name.localeCompare(right.name, 'id');
  });
}

export async function registerAdminRoutes(
  app: FastifyInstance,
  db: DbClient,
  catalogRepository: CatalogRepository,
  stockRepository: StockRepository,
  salesRepository: SalesRepository,
  supplierDebtRepository: SupplierDebtRepository,
  userRepository: UserRepository
) {
  app.get('/admin-api/dashboard', async (request) => {
    const query = adminDashboardQuerySchema.parse(request.query ?? {});
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new ValidationError('Sesi admin tidak valid.');
    }

    const requiredResource = sectionResources[query.section];
    if (!userRepository.canRoleAccessResource(auth.role, requiredResource)) {
      throw new ForbiddenError();
    }

    const settings = getSettings(db);
    const products = query.section === 'inventory' ? catalogRepository.listActive() : [];
    const baseRange = {
      from: query.from,
      to: query.to,
      lowStockThreshold: query.lowStockThreshold,
    };

    let report = createEmptyReport();
    let catalog = [] as ReturnType<typeof toQueueItem>[];
    let receivables = [] as ReturnType<typeof listReceivableRows>;
    let meta = {};

    if (query.section === 'overview') {
      report = buildResponse(salesRepository, catalogRepository, stockRepository, supplierDebtRepository, baseRange, {
        transactionLogLimit: adminDashboardLimits.overviewTransactions,
        stockTrailLimit: adminDashboardLimits.overviewStockTrail,
        topProductsLimit: adminDashboardLimits.overviewTopProducts,
      });
      receivables = listReceivableRows(salesRepository).slice(0, adminDashboardLimits.overviewReceivables);
    } else if (query.section === 'transactions') {
      report = buildResponse(salesRepository, catalogRepository, stockRepository, supplierDebtRepository, baseRange, {
        transactionLogLimit: adminDashboardLimits.transactionsPage,
        stockTrailLimit: 0,
        topProductsLimit: 0,
      });
    } else if (query.section === 'inventory') {
      const filteredProducts = sortInventoryProducts(filterInventoryProducts(products, query.inventoryQuery), query.inventorySort, query.lowStockThreshold);
      const cursor = Math.min(query.inventoryCursor, filteredProducts.length);
      const visibleProducts = filteredProducts.slice(cursor, cursor + query.inventoryLimit);
      const nextCursor = cursor + visibleProducts.length;

      catalog = visibleProducts.map(toQueueItem);
      meta = {
        inventory: {
          total: products.length,
          filtered: filteredProducts.length,
          returned: visibleProducts.length,
          limit: query.inventoryLimit,
          cursor,
          nextCursor: nextCursor < filteredProducts.length ? nextCursor : null,
          hasMore: nextCursor < filteredProducts.length,
        },
      };
      report = buildInventoryReport(products, stockRepository, query.lowStockThreshold, adminDashboardLimits.inventoryStockTrail);
    } else if (query.section === 'receivables') {
      receivables = listReceivableRows(salesRepository).slice(0, adminDashboardLimits.receivablesPage);
    }

    return {
      store: settings.store,
      report,
      catalog,
      receivables,
      loadedAt: new Date().toISOString(),
      meta,
    };
  });
}
