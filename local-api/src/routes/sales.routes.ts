import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { formatRupiah, normalizeCatalogText, parsePriceValue } from '../domain/catalogFormat.js';
import { ValidationError } from '../core/errors.js';
import type { AuthenticatedRequest } from '../http/authHook.js';
import { CatalogRepository } from '../repositories/catalogRepository.js';
import { SalesRepository, type CashierSessionRecord, type SaleItemRecord, type SaleRecord } from '../repositories/salesRepository.js';
import { StockRepository } from '../repositories/stockRepository.js';
import type { CashDrawerService } from '../services/cashDrawerService.js';
import { SaleRevisionService } from '../services/saleRevisionService.js';

const checkoutSchema = z.object({
  cashier: z.string().optional(),
  method: z.string().min(1),
  status: z.string().min(1),
  paymentAmount: z.string().optional(),
  discount: z.string().optional(),
  discountMode: z.enum(['nominal', 'percent']).optional(),
  customerName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
  dueDate: z.string().optional(),
  cartItems: z.array(z.object({
    sku: z.string().min(1),
    qty: z.coerce.number().int().positive(),
  })).min(1),
});

const saleRevisionSchema = z.object({
  items: z.array(z.object({
    sku: z.string().min(1),
    qty: z.coerce.number().int().nonnegative(),
  })).min(1),
  reason: z.string().trim().min(5),
  expectedRevisionNo: z.coerce.number().int().nonnegative(),
});

function nowIso() {
  return new Date().toISOString();
}

function formatDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return [
    String(date.getDate()).padStart(2, '0'),
    months[date.getMonth()] ?? 'Jan',
    date.getFullYear(),
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  ].join(' ');
}

function toDbStatus(status: string): SaleRecord['status'] {
  const normalized = normalizeCatalogText(status);
  if (normalized === 'LUNAS') return 'paid';
  if (normalized === 'DP') return 'dp';
  if (normalized === 'VOID') return 'void';
  return 'installment';
}

function toUiStatus(status: SaleRecord['status']) {
  if (status === 'paid') return 'Lunas';
  if (status === 'dp') return 'DP';
  if (status === 'void') return 'Void';
  return 'Cicilan';
}

function calculateDiscount(subtotal: number, discount: string | undefined, mode: 'nominal' | 'percent') {
  if (mode === 'percent') {
    const percent = Math.max(0, Number(String(discount ?? '').replace(/[^\d]/g, '')));
    return Math.min(subtotal, Math.round((percent / 100) * subtotal));
  }

  return Math.min(subtotal, parsePriceValue(discount));
}

function formatDiscountText(discount: string | undefined, mode: 'nominal' | 'percent') {
  if (mode === 'percent') {
    const percent = Math.max(0, Number(String(discount ?? '').replace(/[^\d]/g, '')));
    return percent ? `${percent}%` : '';
  }

  const amount = parsePriceValue(discount);
  return amount ? formatRupiah(amount) : '';
}

function getNextInvoiceNo(existing: string[]) {
  const nextNumber = existing.reduce((max, invoice) => {
    const match = invoice.match(/INV-(\d+)/i);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;

  return `INV-${String(nextNumber).padStart(6, '0')}`;
}

export function toSaleRow(sale: SaleRecord, items: SaleItemRecord[], revisionCount = 0) {
  return {
    id: sale.id,
    invoice: sale.invoice_no,
    customer: sale.customer_name,
    cashier: sale.cashier_display_name || sale.cashier_user_id,
    total: formatRupiah(sale.total_amount),
    method: sale.payment_method,
    status: toUiStatus(sale.status),
    time: formatDisplayDate(sale.created_at),
    itemsCount: items.length,
    items: items.map((item) => ({
      sku: item.barcode,
      name: item.name_snapshot,
      qty: item.qty,
      unit: item.unit_snapshot,
      price: item.unit_price,
      subtotal: item.subtotal_amount,
    })),
    customerName: sale.customer_name,
    phone: sale.customer_phone ?? undefined,
    address: sale.customer_address ?? undefined,
    reference: sale.request_id,
    note: sale.note ?? undefined,
    paymentAmount: formatRupiah(sale.paid_amount),
    dueDate: sale.due_date ?? undefined,
    revisionCount,
    revised: revisionCount > 0,
  };
}

function parseSessionCart(record: CashierSessionRecord) {
  try {
    const parsed = JSON.parse(record.cart_json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        sku: typeof item === 'object' && item && 'sku' in item ? String(item.sku ?? '').trim() : '',
        qty: typeof item === 'object' && item && 'qty' in item ? Math.trunc(Number(item.qty)) : 0,
      }))
      .filter((item) => item.sku && Number.isFinite(item.qty) && item.qty > 0);
  } catch {
    return [];
  }
}

function toCashierSessionRow(record: CashierSessionRecord) {
  const cartItems = parseSessionCart(record);

  return {
    id: record.id,
    kind: record.kind,
    customer: record.customer_name,
    cashier: record.cashier_display_name || record.cashier_user_id,
    total: formatRupiah(record.total_amount),
    method: record.payment_method,
    status: record.payment_status,
    time: formatDisplayDate(record.updated_at),
    itemsCount: cartItems.length,
    cartItems,
    customerName: record.customer_name,
    phone: record.customer_phone ?? undefined,
    address: record.customer_address ?? undefined,
    reference: record.reference_no ?? undefined,
    note: record.note ?? undefined,
    paymentAmount: record.payment_amount ? formatRupiah(record.payment_amount) : undefined,
    discount: record.discount_text ?? undefined,
    discountMode: record.discount_mode,
    dueDate: record.due_date ?? undefined,
  };
}

function getActorUserId(request: unknown) {
  return (request as AuthenticatedRequest).auth?.userId ?? 'system-admin';
}

export function listSaleRows(salesRepository: SalesRepository, limit?: number) {
  const sales = salesRepository.listSales({ limit });
  const items = salesRepository.listItemsForSales(sales.map((sale) => sale.id));
  const revisionCounts = salesRepository.listRevisionCountsForSales(sales.map((sale) => sale.id));
  const itemsBySaleId = new Map<string, SaleItemRecord[]>();

  for (const item of items) {
    const current = itemsBySaleId.get(item.sale_id) ?? [];
    current.push(item);
    itemsBySaleId.set(item.sale_id, current);
  }

  return sales.map((sale) => toSaleRow(sale, itemsBySaleId.get(sale.id) ?? [], revisionCounts.get(sale.id) ?? 0));
}

export function listCashierSessionRows(salesRepository: SalesRepository) {
  return salesRepository.listCashierSessions().map(toCashierSessionRow);
}

export async function registerSalesRoutes(
  app: FastifyInstance,
  catalogRepository: CatalogRepository,
  stockRepository: StockRepository,
  salesRepository: SalesRepository,
  cashDrawerService?: CashDrawerService
) {
  const saleRevisionService = new SaleRevisionService(salesRepository, catalogRepository, stockRepository);

  app.get('/sales', async () => {
    return { items: listSaleRows(salesRepository) };
  });

  app.get('/sales/:id/revisions', async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const revisions = saleRevisionService.listRevisions(params.id);
    const expectedRevisionNo = saleRevisionService.getLatestRevisionNo(params.id);
    return {
      items: revisions.map((revision) => ({
        id: revision.id,
        saleId: revision.sale_id,
        revisionNo: revision.revision_no,
        reason: revision.reason,
        editedByUserId: revision.edited_by_user_id,
        editedAt: revision.edited_at,
        totalBefore: revision.total_before,
        totalAfter: revision.total_after,
        stockDelta: JSON.parse(revision.stock_delta_json) as unknown,
      })),
      expectedRevisionNo,
    };
  });

  app.put('/sales/:id/revision', async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const input = saleRevisionSchema.parse(request.body);
    const auth = (request as AuthenticatedRequest).auth;
    const result = saleRevisionService.updateSaleWithRevision(params.id, input, {
      userId: auth?.userId ?? getActorUserId(request),
      role: auth?.role ?? 'cashier',
    });

    return {
      item: toSaleRow(result.sale, result.items, result.revisionNo),
      revisionNo: result.revisionNo,
      overpaidAmount: result.overpaidAmount,
    };
  });

  app.post('/cashier-sessions', async (request, reply) => {
    const actorUserId = getActorUserId(request);
    const body = z.object({
      kind: z.enum(['Draft', 'Tertahan']),
      input: checkoutSchema,
    }).parse(request.body);
    const cartItems = body.input.cartItems;
    const createdAt = nowIso();
    const discountMode = body.input.discountMode ?? 'nominal';

    const session = salesRepository.transaction(() => {
      const cartProducts = cartItems.map((cartItem) => {
        const product = catalogRepository.findActiveByBarcode(cartItem.sku);
        if (!product) {
          throw new ValidationError(`Barcode ${cartItem.sku} tidak ditemukan di katalog.`);
        }
        return { cartItem, product };
      });
      const subtotal = cartProducts.reduce((total, { cartItem, product }) => total + product.unit_price * cartItem.qty, 0);
      const discountAmount = calculateDiscount(subtotal, body.input.discount, discountMode);
      const totalAmount = Math.max(0, subtotal - discountAmount);

      return salesRepository.createCashierSession({
        id: `cashier-session-${crypto.randomUUID()}`,
        kind: body.kind,
        customer_name: body.input.customerName?.trim() || 'PELANGGAN UMUM',
        customer_phone: body.input.phone?.trim() || null,
        customer_address: body.input.address?.trim() || null,
        cashier_user_id: actorUserId,
        payment_method: body.input.method,
        payment_status: body.kind,
        subtotal_amount: subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        payment_amount: parsePriceValue(body.input.paymentAmount),
        discount_text: formatDiscountText(body.input.discount, discountMode) || null,
        discount_mode: discountMode,
        reference_no: body.input.reference?.trim() || null,
        note: body.input.note?.trim() || null,
        due_date: body.input.dueDate?.trim() || null,
        cart_json: JSON.stringify(cartItems),
        created_at: createdAt,
        updated_at: createdAt,
      });
    });

    return reply.status(201).send({ item: toCashierSessionRow(session) });
  });

  app.delete('/cashier-sessions/:id', async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const deleted = salesRepository.deleteCashierSession(params.id);
    if (!deleted) {
      throw new ValidationError(`Sesi kasir ${params.id} tidak ditemukan.`);
    }

    return reply.status(204).send();
  });

  app.post('/sales/checkout', async (request, reply) => {
    const actorUserId = getActorUserId(request);
    const input = checkoutSchema.parse(request.body);
    const createdAt = nowIso();
    const discountMode = input.discountMode ?? 'nominal';

    const saleRow = salesRepository.transaction(() => {
      const cartProducts = input.cartItems.map((cartItem) => {
        const product = catalogRepository.findActiveByBarcode(cartItem.sku);
        if (!product) {
          throw new ValidationError(`Barcode ${cartItem.sku} tidak ditemukan di katalog.`);
        }

        if (product.qty < cartItem.qty) {
          throw new ValidationError(`Stok ${product.name} tidak cukup. Tersedia ${product.qty} ${product.unit}.`);
        }

        return { cartItem, product };
      });

      const subtotal = cartProducts.reduce((total, { cartItem, product }) => total + product.unit_price * cartItem.qty, 0);
      const discountAmount = calculateDiscount(subtotal, input.discount, discountMode);
      const totalAmount = Math.max(0, subtotal - discountAmount);
      const dbStatus = toDbStatus(input.status);
      const paymentInput = parsePriceValue(input.paymentAmount);
      const paidAmount = dbStatus === 'paid' ? totalAmount : Math.min(totalAmount, paymentInput);
      const remainingAmount = Math.max(0, totalAmount - paidAmount);
      const saleId = crypto.randomUUID();
      const sale: SaleRecord = {
        id: saleId,
        request_id: input.reference?.trim() || crypto.randomUUID(),
        invoice_no: getNextInvoiceNo(salesRepository.listInvoiceNumbers()),
        status: dbStatus,
        customer_name: input.customerName?.trim() || 'PELANGGAN UMUM',
        customer_phone: input.phone?.trim() || null,
        customer_address: input.address?.trim() || null,
        payment_method: input.method,
        subtotal_amount: subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        cashier_user_id: actorUserId,
        note: input.note?.trim() || null,
        due_date: input.dueDate?.trim() || null,
        created_at: createdAt,
        voided_at: null,
        void_reason: null,
      };

      salesRepository.createSale(sale);

      const saleItems = cartProducts.map(({ cartItem, product }) => {
        const nextQty = product.qty - cartItem.qty;
        catalogRepository.updateByBarcode(product.barcode, {
          ...product,
          qty: nextQty,
          updated_at: createdAt,
        });
        stockRepository.create({
          id: crypto.randomUUID(),
          productId: product.id,
          movementQty: -cartItem.qty,
          beforeQty: product.qty,
          afterQty: nextQty,
          type: 'Penjualan',
          source: 'Kasir',
          reason: `Invoice ${sale.invoice_no}`,
          referenceId: sale.id,
          createdByUserId: actorUserId,
          createdAt,
        });

        return salesRepository.createSaleItem({
          id: crypto.randomUUID(),
          sale_id: sale.id,
          product_id: product.id,
          barcode: product.barcode,
          name_snapshot: product.name,
          unit_snapshot: product.unit,
          qty: cartItem.qty,
          unit_price: product.unit_price,
          subtotal_amount: product.unit_price * cartItem.qty,
        });
      });

      if (paidAmount > 0) {
        salesRepository.createPayment({
          id: crypto.randomUUID(),
          target_type: 'sale',
          target_id: sale.id,
          amount: paidAmount,
          method: input.method,
          note: `Pembayaran invoice ${sale.invoice_no}`,
          received_by_user_id: actorUserId,
          created_at: createdAt,
        });
      }

      return toSaleRow(sale, saleItems);
    });

    if (input.method === 'Tunai') {
      void cashDrawerService?.openBestEffort('cash-checkout');
    }

    return reply.status(201).send({ item: saleRow });
  });
}
