import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { formatRupiah } from '../domain/catalogFormat.js';
import type { DbClient } from '../db/client.js';
import { CatalogRepository } from '../repositories/catalogRepository.js';
import { SalesRepository, type SaleItemRecord } from '../repositories/salesRepository.js';
import { StockRepository } from '../repositories/stockRepository.js';
import { SupplierDebtRepository } from '../repositories/supplierDebtRepository.js';

const reportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  lowStockThreshold: z.coerce.number().int().positive().default(20),
});

type ReportResponse = {
  summary: {
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
  transactionTrend: Array<{ label: string; omzet: number; masuk: number }>;
  paymentDistribution: Array<{ method: string; total: number }>;
  categoryDistribution: Array<{ category: string; value: number }>;
  receivableDebtChart: Array<{ label: string; value: number }>;
  stockMovementChart: Array<{ label: string; value: number }>;
  dataset: {
    transactionLog: Array<ReportTransactionRow>;
    averageSale: number;
    estimatedCost: number;
    grossProfit: number;
    margin: number;
    topProducts: Array<{ sku: string; name: string; qty: number; total: number; category: string }>;
    topProductsChart: Array<{ item: string; total: number; count: number }>;
    customerByName: Array<{ label: string; total: number; count: number }>;
    customerByAddress: Array<{ label: string; total: number; count: number }>;
    hourlyChart: Array<{ hour: string; count: number; total: number }>;
    cashFlowRows: Array<{
      date: string;
      startingCash: number;
      cashSales: number;
      adjustmentIn: number;
      adjustmentOut: number;
      estimatedCash: number;
      actualCash: number;
      diff: number;
      status: string;
    }>;
    cashFlowChart: Array<{ label: string; value: number }>;
    comparisonRows: Array<{ label: string; current: number; previous: number; format: 'currency' | 'number' }>;
    stockAuditRows: Array<{ category: string; items: number; qty: number; low: number; value: number }>;
    stockMovementCategoryRows: Array<{ category: string; movementCount: number; netMovement: number }>;
    stockTrailRows: Array<{
      time: string;
      item: string;
      movement: string;
      note: string;
      event: string;
      beforeQty?: number;
      afterQty?: number;
      operator?: string;
      source?: string;
    }>;
  };
};

type ReportTransactionRow = {
  id: string;
  request_id: string;
  invoice_no: string;
  status: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  payment_method: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  cashier_user_id: string;
  cashier_display_name?: string;
  note: string | null;
  due_date: string | null;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
  total: string;
  method: string;
  time: string;
  itemsCount: number;
  customer: string;
  customerName: string;
  cashier: string;
  phone?: string;
  address?: string;
  reference?: string;
  paymentAmount?: string;
  dueDate?: string;
  items: Array<{
    sku: string;
    name: string;
    qty: number;
    unit: string;
    price: number;
    subtotal: number;
  }>;
  totalNumber: number;
  paidNumber: number;
  remainingNumber: number;
};

function toReportTransactionItem(item: SaleItemRecord) {
  const price = item.unit_price > 0
    ? item.unit_price
    : item.qty > 0 && item.subtotal_amount > 0
      ? Math.round(item.subtotal_amount / item.qty)
      : 0;

  return {
    sku: item.barcode,
    name: item.name_snapshot,
    qty: item.qty,
    unit: item.unit_snapshot,
    price,
    subtotal: item.subtotal_amount > 0 ? item.subtotal_amount : price * item.qty,
  };
}

function parseRangeStart(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function parseRangeEnd(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function formatDayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function normalizeMoney(value: number): number {
  return Number((value / 1000000).toFixed(2));
}

type ReportBuildOptions = {
  transactionLogLimit?: number;
  stockTrailLimit?: number;
  topProductsLimit?: number;
};

export function buildResponse(
  salesRepository: SalesRepository,
  catalogRepository: CatalogRepository,
  stockRepository: StockRepository,
  supplierDebtRepository: SupplierDebtRepository,
  query: z.infer<typeof reportQuerySchema>,
  options: ReportBuildOptions = {}
): ReportResponse {
  const hasRangeQuery = Boolean(query.from || query.to);
  const rangeStart = hasRangeQuery ? parseRangeStart(query.from ?? query.to) : null;
  const rangeEnd = hasRangeQuery ? parseRangeEnd(query.to ?? query.from) : null;
  const sales = rangeStart && rangeEnd
    ? salesRepository.listSalesByCreatedRange(rangeStart, rangeEnd)
    : salesRepository.listSales();
  const activeRange = rangeStart && rangeEnd ? { start: rangeStart, end: rangeEnd } : null;
  const saleItems = salesRepository.listItemsForSales(sales.map((sale) => sale.id));
  const salePayments = salesRepository.listPaymentsForSales(sales.map((sale) => sale.id));
  const debts = supplierDebtRepository.listDebts();
  const debtItems = supplierDebtRepository.listItemsForDebts(debts.map((debt) => debt.id));
  const debtPayments = supplierDebtRepository.listPaymentsForDebts(debts.map((debt) => debt.id));
  const stockMovements = stockRepository.listRecent(1000);
  const activeProducts = catalogRepository.listActive();
  const lowStockThreshold = query.lowStockThreshold;

  const itemsBySaleId = new Map<string, SaleItemRecord[]>();
  for (const item of saleItems) {
    const current = itemsBySaleId.get(item.sale_id) ?? [];
    current.push(item);
    itemsBySaleId.set(item.sale_id, current);
  }

  const paymentsBySaleId = new Map<string, Array<{ id: string; amount: number; method: string; note: string | null; created_at: string }>>();
  for (const payment of salePayments) {
    const current = paymentsBySaleId.get(payment.target_id) ?? [];
    current.push(payment);
    paymentsBySaleId.set(payment.target_id, current);
  }

  const itemsByDebtId = new Map<string, typeof debtItems>();
  for (const item of debtItems) {
    const current = itemsByDebtId.get(item.supplier_debt_id) ?? [];
    current.push(item);
    itemsByDebtId.set(item.supplier_debt_id, current);
  }

  const paymentsByDebtId = new Map<string, typeof debtPayments>();
  for (const payment of debtPayments) {
    const current = paymentsByDebtId.get(payment.target_id) ?? [];
    current.push(payment);
    paymentsByDebtId.set(payment.target_id, current);
  }

  const saleRows = sales
    .slice()
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((sale) => {
      const items = itemsBySaleId.get(sale.id) ?? [];
      const totalNumber = sale.total_amount;
      const paidNumber = sale.paid_amount;
      const remainingNumber = sale.remaining_amount;
      return {
        ...sale,
        total: formatRupiah(totalNumber),
        method: sale.payment_method,
        status: sale.status === 'paid' ? 'Lunas' : sale.status === 'dp' ? 'DP' : sale.status === 'void' ? 'Void' : 'Cicilan',
        time: sale.created_at,
        itemsCount: items.length,
        customer: sale.customer_name,
        customerName: sale.customer_name,
        cashier: sale.cashier_display_name || sale.cashier_user_id,
        phone: sale.customer_phone ?? undefined,
        address: sale.customer_address ?? undefined,
        reference: sale.request_id,
        note: sale.note ?? null,
        paymentAmount: formatRupiah(paidNumber),
        dueDate: sale.due_date ?? undefined,
        items: items.map(toReportTransactionItem),
        totalNumber,
        paidNumber,
        remainingNumber,
      };
    });

  const salesSummary = activeRange
    ? salesRepository.summarizeSalesByCreatedRange(activeRange)
    : {
        totalOmzet: saleRows.reduce((total, row) => total + row.totalNumber, 0),
        totalPaid: saleRows.reduce((total, row) => total + row.paidNumber, 0),
        transactionCount: saleRows.length,
      };
  const totalOmzet = salesSummary.totalOmzet;
  const totalPaid = salesSummary.totalPaid;
  const receivableRemaining = salesRepository.sumReceivableRemaining();
  const debtRemaining = debts.reduce((total, debt) => total + debt.remaining_amount, 0);
  const debtOverdue = debts.filter((debt) => debt.status === 'overdue').length;
  const receivableOverdue = salesRepository.countOverdueReceivables(new Date().toISOString());

  const transactionTrendMap = new Map<string, { label: string; omzet: number; masuk: number; sortKey: number }>();
  const trendRangeStart = rangeStart ? new Date(rangeStart) : null;
  const trendRangeEnd = rangeEnd ? new Date(rangeEnd) : null;

  if (trendRangeStart && trendRangeEnd) {
    const cursor = new Date(trendRangeStart);
    while (cursor <= trendRangeEnd) {
      const key = cursor.toISOString().slice(0, 10);
      transactionTrendMap.set(key, {
        label: formatDayLabel(cursor.toISOString()),
        omzet: 0,
        masuk: 0,
        sortKey: cursor.getTime(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const trendRows = activeRange
    ? salesRepository.listTrendByCreatedRange(activeRange)
    : saleRows.map((sale) => ({ day: sale.created_at.slice(0, 10), omzet: sale.totalNumber, paid: sale.paidNumber }));
  trendRows.forEach((sale) => {
    const key = sale.day;
    const existing = transactionTrendMap.get(key) ?? {
      label: formatDayLabel(sale.day),
      omzet: 0,
      masuk: 0,
      sortKey: new Date(sale.day).getTime(),
    };

    existing.omzet += normalizeMoney(sale.omzet);
    existing.masuk += normalizeMoney(sale.paid);
    existing.sortKey = new Date(sale.day).getTime();
    transactionTrendMap.set(key, existing);
  });

  const transactionTrend = Array.from(transactionTrendMap.values())
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ sortKey, ...item }) => item);

  const paymentDistribution = activeRange
    ? salesRepository.listPaymentDistributionByCreatedRange(activeRange).map((row) => ({ method: row.method, total: normalizeMoney(row.total) }))
    : Array.from(
        saleRows.reduce((map, sale) => {
          map.set(sale.payment_method, (map.get(sale.payment_method) ?? 0) + sale.totalNumber);
          return map;
        }, new Map<string, number>())
      )
        .map(([method, total]) => ({ method, total: normalizeMoney(total) }))
        .sort((left, right) => right.total - left.total);

  const categoryByProductId = new Map(activeProducts.map((product) => [product.id, product.category_name]));
  const categoryDistribution = activeRange
    ? salesRepository.listCategoryDistributionByCreatedRange(activeRange).map((row) => ({ category: row.category, value: normalizeMoney(row.total) }))
    : Array.from(
        saleItems.reduce((map, item) => {
          const category = categoryByProductId.get(item.product_id) ?? 'LAINNYA';
          map.set(category, (map.get(category) ?? 0) + item.subtotal_amount);
          return map;
        }, new Map<string, number>())
      )
        .map(([category, value]) => ({ category, value: normalizeMoney(value) }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 6);

  const customerByNameMap = new Map<string, { label: string; total: number; count: number }>();
  const customerByAddressMap = new Map<string, { label: string; total: number; count: number }>();
  saleRows.forEach((sale) => {
    const customerLabel = sale.customer_name?.trim() || 'PELANGGAN UMUM';
    const customer = customerByNameMap.get(customerLabel) ?? { label: customerLabel, total: 0, count: 0 };
    customer.total += sale.totalNumber;
    customer.count += 1;
    customerByNameMap.set(customerLabel, customer);

    const addressLabel = sale.customer_address?.trim() || 'Alamat belum diisi';
    const address = customerByAddressMap.get(addressLabel) ?? { label: addressLabel, total: 0, count: 0 };
    address.total += sale.totalNumber;
    address.count += 1;
    customerByAddressMap.set(addressLabel, address);
  });
  const customerByName = Array.from(customerByNameMap.values()).sort((left, right) => right.total - left.total).slice(0, 5);
  const customerByAddress = Array.from(customerByAddressMap.values()).sort((left, right) => right.total - left.total).slice(0, 5);

  const hourlyChart = activeRange
    ? salesRepository.listHourlySalesByCreatedRange(activeRange).map((row) => ({ hour: `${row.hour}.00`, count: row.count, total: normalizeMoney(row.total) }))
    : Array.from(
        saleRows.reduce((map, sale) => {
          const hour = String(new Date(sale.created_at).getHours()).padStart(2, '0');
          const label = `${hour}.00`;
          const current = map.get(label) ?? { hour: label, count: 0, total: 0 };
          current.count += 1;
          current.total += sale.totalNumber;
          map.set(label, current);
          return map;
        }, new Map<string, { hour: string; count: number; total: number }>())
      )
        .map(([, row]) => ({ ...row, total: normalizeMoney(row.total) }))
        .sort((left, right) => left.hour.localeCompare(right.hour, 'id'));

  const supplierCashOut = debtPayments.reduce((total, payment) => (payment.method === 'Tunai' ? total + payment.amount : total), 0);
  const cashSales = saleRows.filter((sale) => sale.payment_method === 'Tunai').reduce((total, sale) => total + sale.paidNumber, 0);
  const cashFlowRows = [
    {
      date: query.from && query.to ? `${query.from} - ${query.to}` : 'Periode aktif',
      startingCash: 0,
      cashSales,
      adjustmentIn: 0,
      adjustmentOut: supplierCashOut,
      estimatedCash: Math.max(0, cashSales - supplierCashOut),
      actualCash: Math.max(0, cashSales - supplierCashOut),
      diff: 0,
      status: 'Seimbang',
    },
  ];
  const cashFlowChart = [
    { label: 'Kas masuk', value: normalizeMoney(cashSales) },
    { label: 'Kas keluar', value: normalizeMoney(supplierCashOut) },
    { label: 'Estimasi kas', value: normalizeMoney(Math.max(0, cashSales - supplierCashOut)) },
  ];

  const splitIndex = Math.max(1, Math.floor(saleRows.length / 2));
  const previousRows = saleRows.slice(0, splitIndex);
  const currentRows = saleRows.slice(splitIndex).length ? saleRows.slice(splitIndex) : saleRows;
  const summarizeRows = (rows: typeof saleRows) => {
    const rowsRevenue = rows.reduce((total, row) => total + row.totalNumber, 0);
    const rowsPaid = rows.reduce((total, row) => total + row.paidNumber, 0);
    const rowsAverage = rows.length ? Math.round(rowsRevenue / rows.length) : 0;

    return { revenue: rowsRevenue, paid: rowsPaid, count: rows.length, average: rowsAverage };
  };
  const currentSummary = summarizeRows(currentRows);
  const previousSummary = summarizeRows(previousRows);
  const comparisonRows = [
    { label: 'Omzet', current: currentSummary.revenue, previous: previousSummary.revenue, format: 'currency' as const },
    { label: 'Kas masuk', current: currentSummary.paid, previous: previousSummary.paid, format: 'currency' as const },
    { label: 'Transaksi', current: currentSummary.count, previous: previousSummary.count, format: 'number' as const },
    { label: 'Rata-rata transaksi', current: currentSummary.average, previous: previousSummary.average, format: 'currency' as const },
  ];

  const stockAuditRows = Array.from(
    activeProducts.reduce((map, item) => {
      const current = map.get(item.category_name) ?? { category: item.category_name, items: 0, qty: 0, low: 0, value: 0 };
      current.items += 1;
      current.qty += item.qty;
      current.low += item.qty <= lowStockThreshold ? 1 : 0;
      current.value += item.qty * item.unit_price;
      map.set(item.category_name, current);
      return map;
    }, new Map<string, { category: string; items: number; qty: number; low: number; value: number }>())
  )
    .map(([, value]) => ({ ...value, value: normalizeMoney(value.value) }))
    .sort((left, right) => right.value - left.value);

  const stockMovementCategoryMap = new Map<string, { category: string; movementCount: number; netMovement: number }>();
  stockMovements.forEach((movement) => {
    const category = movement.product_name ? (categoryByProductId.get(movement.product_id) ?? 'LAINNYA') : 'LAINNYA';
    const current = stockMovementCategoryMap.get(category) ?? { category, movementCount: 0, netMovement: 0 };
    current.movementCount += 1;
    current.netMovement += Number(movement.movement_qty) || 0;
    stockMovementCategoryMap.set(category, current);
  });
  const stockMovementCategoryRows = Array.from(stockMovementCategoryMap.values())
    .sort((left, right) => right.movementCount - left.movementCount)
    .slice(0, 5);

  const stockTrailRows = stockMovements
    .filter((movement) => {
      if (!rangeStart || !rangeEnd) return true;
      return movement.created_at >= rangeStart && movement.created_at <= rangeEnd;
    })
    .slice(0, options.stockTrailLimit ?? 10)
    .map((movement) => ({
      time: movement.created_at,
      item: movement.product_name,
      movement: String(movement.movement_qty),
      note: movement.reason ?? movement.source,
      event: movement.type,
      beforeQty: movement.before_qty,
      afterQty: movement.after_qty,
      operator: movement.created_by_display_name || movement.created_by_user_id,
      source: movement.source,
    }));

  const topProducts = activeRange
    ? salesRepository.listTopProductsByCreatedRange(activeRange)
    : Array.from(
        saleItems.reduce((map, item) => {
          const productCategory = categoryByProductId.get(item.product_id) ?? 'LAINNYA';
          const key = item.barcode || item.name_snapshot;
          const current = map.get(key) ?? {
            sku: item.barcode,
            name: item.name_snapshot,
            qty: 0,
            total: 0,
            category: productCategory,
          };

          current.qty += item.qty;
          current.total += item.subtotal_amount;
          map.set(key, current);
          return map;
        }, new Map<string, { sku: string; name: string; qty: number; total: number; category: string }>())
      )
        .map(([, value]) => value)
        .sort((left, right) => right.total - left.total)
        .slice(0, 8);
  const limitedTopProducts = topProducts.slice(0, options.topProductsLimit ?? topProducts.length);
  const topProductsChart = limitedTopProducts.map((item) => ({
    item: item.name.length > 16 ? `${item.name.slice(0, 16)}...` : item.name,
    total: normalizeMoney(item.total),
    count: item.qty,
  }));

  return {
    summary: {
      omzet: totalOmzet,
      paid: totalPaid,
      receivableRemaining,
      debtRemaining,
      transactionCount: salesSummary.transactionCount,
      lowStockCount: stockAuditRows.filter((row) => row.low > 0).reduce((total, row) => total + row.low, 0),
      criticalStockCount: stockAuditRows.filter((row) => row.low > 0 && row.qty <= Math.max(1, Math.floor(lowStockThreshold / 2))).reduce((total, row) => total + row.low, 0),
      debtOverdue,
      receivableOverdue,
    },
    transactionTrend,
    paymentDistribution,
    categoryDistribution,
    receivableDebtChart: [
      { label: 'Kas masuk', value: normalizeMoney(totalPaid) },
      { label: 'Piutang', value: normalizeMoney(receivableRemaining) },
      { label: 'Hutang', value: normalizeMoney(debtRemaining) },
    ],
    stockMovementChart: [
      { label: 'Restok', value: stockMovements.filter((movement) => movement.type === 'Restok').length },
      { label: 'Penjualan', value: stockMovements.filter((movement) => movement.type === 'Penjualan').length },
      { label: 'Manual', value: stockMovements.filter((movement) => movement.source !== 'Kasir' && movement.source !== 'Hutang supplier').length },
      { label: 'Stok rendah', value: stockAuditRows.reduce((total, row) => total + row.low, 0) },
    ],
    dataset: {
      transactionLog: saleRows.slice(0, options.transactionLogLimit ?? saleRows.length),
      averageSale: saleRows.length ? Math.round(totalOmzet / saleRows.length) : 0,
      estimatedCost: Math.round(totalOmzet * 0.82),
      grossProfit: Math.max(0, Math.round(totalOmzet - totalOmzet * 0.82)),
      margin: totalOmzet ? Number((((Math.max(0, totalOmzet - totalOmzet * 0.82)) / totalOmzet) * 100).toFixed(1)) : 0,
      topProducts: limitedTopProducts,
      topProductsChart,
      customerByName,
      customerByAddress,
      hourlyChart,
      cashFlowRows,
      cashFlowChart,
      comparisonRows,
      stockAuditRows,
      stockMovementCategoryRows,
      stockTrailRows,
    },
  };
}

export async function registerReportRoutes(
  app: FastifyInstance,
  db: DbClient,
  catalogRepository: CatalogRepository,
  stockRepository: StockRepository,
  salesRepository: SalesRepository,
  supplierDebtRepository: SupplierDebtRepository
) {
  app.get('/reports', async (request) => {
    const query = reportQuerySchema.parse(request.query ?? {});
    return buildResponse(salesRepository, catalogRepository, stockRepository, supplierDebtRepository, query);
  });
}
