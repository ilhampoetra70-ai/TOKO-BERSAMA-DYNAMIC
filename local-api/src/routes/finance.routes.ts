import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { formatRupiah, normalizeCatalogText, parsePriceValue } from '../domain/catalogFormat.js';
import { ValidationError } from '../core/errors.js';
import type { AuthenticatedRequest } from '../http/authHook.js';
import { SalesRepository, type SaleRecord } from '../repositories/salesRepository.js';
import {
  SupplierDebtRepository,
  type SupplierDebtRecord,
  type SupplierDebtItemRecord,
  type DebtPaymentRecord,
} from '../repositories/supplierDebtRepository.js';
import type { CashDrawerService } from '../services/cashDrawerService.js';

const paymentSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  method: z.string().min(1),
  note: z.string().optional(),
});

const supplierDebtCreateSchema = z.object({
  supplier: z.string().min(1),
  takeDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    unit: z.string().min(1),
    qty: z.coerce.number().int().positive(),
    price: z.union([z.string(), z.number()]),
  })).min(1),
});

function nowIso() {
  return new Date().toISOString();
}

function formatDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()] ?? 'Jan'} ${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function saleStatusToUi(status: SaleRecord['status']): 'Lunas' | 'DP' | 'Cicilan' | 'Void' {
  if (status === 'paid') return 'Lunas';
  if (status === 'dp') return 'DP';
  if (status === 'void') return 'Void';
  return 'Cicilan';
}

function debtStatusToUi(status: SupplierDebtRecord['status']): 'Belum lunas' | 'Lunas' | 'Overdue' {
  if (status === 'paid') return 'Lunas';
  if (status === 'overdue') return 'Overdue';
  return 'Belum lunas';
}

function parseDue(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function isOverdue(dueDate: string | null, remainingAmount: number): boolean {
  const parsed = parseDue(dueDate);
  return Boolean(parsed && remainingAmount > 0 && parsed.getTime() < Date.now());
}

function mapSaleToReceivableRow(
  sale: SaleRecord,
  items: Array<{ name_snapshot: string; qty: number; unit_snapshot: string; unit_price: number; subtotal_amount: number }>,
  payments: Array<{ id: string; amount: number; method: string; note: string | null; created_at: string }>
) {
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, sale.total_amount - paid);
  const latestPayment = payments[0];

  return {
    id: sale.id,
    invoice: sale.invoice_no,
    customer: sale.customer_name,
    customerName: sale.customer_name,
    cashier: sale.cashier_display_name || sale.cashier_user_id,
    total: formatRupiah(sale.total_amount),
    paid: formatRupiah(paid),
    remaining: formatRupiah(remaining),
    method: sale.payment_method,
    status: remaining === 0 ? 'Lunas' : paid > 0 ? 'Cicilan' : saleStatusToUi(sale.status) === 'DP' ? 'DP' : 'Belum dibayar',
    due: sale.due_date ?? '-',
    time: formatDisplayDate(sale.created_at),
    phone: sale.customer_phone ?? '',
    address: sale.customer_address ?? '',
    projectName: '',
    reference: sale.request_id,
    note: sale.note ?? '',
    lastPayment: latestPayment ? formatDisplayDate(latestPayment.created_at) : '-',
    paymentHistory: payments.map((payment) => ({
      id: payment.id,
      time: formatDisplayDate(payment.created_at),
      amount: formatRupiah(payment.amount),
      method: payment.method as 'Tunai' | 'Transfer' | 'QRIS' | 'Cicilan',
      note: payment.note ?? '',
    })),
    items: items.map((item) => ({
      name: item.name_snapshot,
      qty: item.qty,
      unit: item.unit_snapshot,
      price: item.unit_price,
      subtotal: item.subtotal_amount,
    })),
  };
}

function getActorUserId(request: unknown) {
  return (request as AuthenticatedRequest).auth?.userId ?? 'system-admin';
}

function mapDebtToUiRow(
  debt: SupplierDebtRecord,
  items: SupplierDebtItemRecord[],
  payments: Array<DebtPaymentRecord & { id: string }>
) {
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, debt.total_amount - paid);
  const overdue = isOverdue(debt.due_date, remaining);

  return {
    id: debt.id,
    supplier: debt.supplier_name,
    supplierPhone: '',
    supplierAddress: '',
    takeDate: debt.take_date,
    due: debt.due_date ?? '-',
    total: formatRupiah(debt.total_amount),
    paid: formatRupiah(paid),
    remaining: formatRupiah(remaining),
    status: overdue ? 'Overdue' : debtStatusToUi(debt.status),
    note: '',
    collectionNote: '',
    items: items.map((item) => ({
      name: item.name_snapshot,
      category: item.category_snapshot,
      boxQty: 0,
      packQty: item.qty,
      unit: item.unit_snapshot,
      price: item.unit_price,
    })),
    paymentHistory: payments.map((payment) => ({
      id: payment.id,
      time: formatDisplayDate(payment.created_at),
      amount: formatRupiah(payment.amount),
      method: payment.method as 'Tunai' | 'Transfer' | 'QRIS',
      receiver: 'ADMIN TOKO',
      note: payment.note ?? '',
    })),
    stockTrail: [],
  };
}

export function listReceivableRows(salesRepository: SalesRepository) {
    const sales = salesRepository.listSales().filter((sale) => sale.remaining_amount > 0);
    const saleIds = sales.map((sale) => sale.id);
    const items = salesRepository.listItemsForSales(saleIds);
    const payments = salesRepository.listPaymentsForSales(saleIds);

    const itemsBySale = new Map<string, typeof items>();
    const paymentsBySale = new Map<string, typeof payments>();

    for (const item of items) {
      const bucket = itemsBySale.get(item.sale_id) ?? [];
      bucket.push(item);
      itemsBySale.set(item.sale_id, bucket);
    }

    for (const payment of payments) {
      const bucket = paymentsBySale.get(payment.target_id) ?? [];
      bucket.push(payment);
      paymentsBySale.set(payment.target_id, bucket);
    }

    return sales.map((sale) => mapSaleToReceivableRow(
      sale,
      itemsBySale.get(sale.id) ?? [],
      paymentsBySale.get(sale.id) ?? []
    ));
}

export async function registerFinanceRoutes(
  app: FastifyInstance,
  salesRepository: SalesRepository,
  supplierDebtRepository: SupplierDebtRepository,
  cashDrawerService?: CashDrawerService
) {
  app.get('/receivables', async () => {
    return { items: listReceivableRows(salesRepository) };
  });

  app.post('/receivables/:saleId/payments', async (request) => {
    const actorUserId = getActorUserId(request);
    const params = z.object({ saleId: z.string().min(1) }).parse(request.params);
    const input = paymentSchema.parse(request.body);
    const sale = salesRepository.findSaleById(params.saleId) || salesRepository.findSaleByInvoice(params.saleId);

    if (!sale) {
      throw new ValidationError('Tagihan tidak ditemukan.');
    }

    const amount = parsePriceValue(input.amount);
    if (amount <= 0) {
      throw new ValidationError('Nominal pembayaran harus lebih dari 0.');
    }

    const createdAt = nowIso();

    salesRepository.transaction(() => {
      const currentPayments = salesRepository.listPaymentsForSales([sale.id]);
      const nextPaid = currentPayments.reduce((sum, payment) => sum + payment.amount, 0) + amount;
      const paidAmount = Math.min(sale.total_amount, nextPaid);
      const remainingAmount = Math.max(0, sale.total_amount - paidAmount);
      const status = remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'installment' : sale.status;

      salesRepository.createPayment({
        id: crypto.randomUUID(),
        target_type: 'sale',
        target_id: sale.id,
        amount,
        method: input.method.trim(),
        note: input.note?.trim() || null,
        received_by_user_id: actorUserId,
        created_at: createdAt,
      });

      salesRepository.updateSaleAmounts(sale.id, paidAmount, remainingAmount, status);
    });

    const refreshedSale = salesRepository.findSaleById(sale.id) || sale;
    const refreshedItems = salesRepository.listItemsForSales([sale.id]);
    const refreshedPayments = salesRepository.listPaymentsForSales([sale.id]);
    if (input.method.trim() === 'Tunai') {
      void cashDrawerService?.openBestEffort('receivable-payment');
    }
    return {
      item: mapSaleToReceivableRow(refreshedSale, refreshedItems, refreshedPayments),
    };
  });

  app.delete('/receivables/:saleId/payments/:paymentId', async (request) => {
    const params = z.object({ saleId: z.string().min(1), paymentId: z.string().min(1) }).parse(request.params);
    const sale = salesRepository.findSaleById(params.saleId) || salesRepository.findSaleByInvoice(params.saleId);

    if (!sale) {
      throw new ValidationError('Tagihan tidak ditemukan.');
    }

    const payment = salesRepository.findPaymentById(params.paymentId);
    if (!payment || payment.target_type !== 'sale' || payment.target_id !== sale.id) {
      throw new ValidationError('Pembayaran tidak ditemukan.');
    }

    salesRepository.transaction(() => {
      salesRepository.deletePayment(payment.id);
      const currentPayments = salesRepository.listPaymentsForSales([sale.id]);
      const paidAmount = currentPayments.reduce((sum, entry) => sum + entry.amount, 0);
      const remainingAmount = Math.max(0, sale.total_amount - paidAmount);
      const status = remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'installment' : sale.status;
      salesRepository.updateSaleAmounts(sale.id, paidAmount, remainingAmount, status);
    });

    return { ok: true };
  });

  app.get('/supplier-debts', async () => {
    const debts = supplierDebtRepository.listDebts();
    const debtIds = debts.map((debt) => debt.id);
    const items = supplierDebtRepository.listItemsForDebts(debtIds);
    const payments = supplierDebtRepository.listPaymentsForDebts(debtIds);

    const itemsByDebt = new Map<string, SupplierDebtItemRecord[]>();
    const paymentsByDebt = new Map<string, DebtPaymentRecord[]>();

    for (const item of items) {
      const bucket = itemsByDebt.get(item.supplier_debt_id) ?? [];
      bucket.push(item);
      itemsByDebt.set(item.supplier_debt_id, bucket);
    }

    for (const payment of payments) {
      const bucket = paymentsByDebt.get(payment.target_id) ?? [];
      bucket.push(payment);
      paymentsByDebt.set(payment.target_id, bucket);
    }

    return {
      items: debts.map((debt) => mapDebtToUiRow(
        debt,
        itemsByDebt.get(debt.id) ?? [],
        paymentsByDebt.get(debt.id) ?? []
      )),
    };
  });

  app.post('/supplier-debts', async (request) => {
    const actorUserId = getActorUserId(request);
    const input = supplierDebtCreateSchema.parse(request.body);
    const supplier = normalizeCatalogText(input.supplier);
    const createdAt = nowIso();
    const debtId = crypto.randomUUID();
    const items = input.items.map((item) => ({
      id: crypto.randomUUID(),
      supplier_debt_id: debtId,
      product_id: null,
      name_snapshot: normalizeCatalogText(item.name),
      category_snapshot: normalizeCatalogText(item.category),
      unit_snapshot: normalizeCatalogText(item.unit),
      qty: item.qty,
      unit_price: parsePriceValue(item.price),
      subtotal_amount: item.qty * parsePriceValue(item.price),
    }));
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal_amount, 0);

    const debt = supplierDebtRepository.transaction(() => {
      const record = supplierDebtRepository.createDebt({
        id: debtId,
        supplier_name: supplier,
        take_date: input.takeDate?.trim() || formatDisplayDate(createdAt),
        due_date: input.dueDate?.trim() || null,
        status: input.dueDate?.trim() ? 'open' : 'open',
        total_amount: totalAmount,
        paid_amount: 0,
        remaining_amount: totalAmount,
        created_by_user_id: actorUserId,
        created_at: createdAt,
        updated_at: createdAt,
      });

      for (const item of items) {
        supplierDebtRepository.createItem(item);
      }

      return record;
    });

    return {
      item: mapDebtToUiRow(debt, items, []),
    };
  });

  app.post('/supplier-debts/:debtId/payments', async (request) => {
    const actorUserId = getActorUserId(request);
    const params = z.object({ debtId: z.string().min(1) }).parse(request.params);
    const input = paymentSchema.parse(request.body);
    const debt = supplierDebtRepository.findDebtById(params.debtId);

    if (!debt) {
      throw new ValidationError('Hutang supplier tidak ditemukan.');
    }

    const amount = parsePriceValue(input.amount);
    if (amount <= 0) {
      throw new ValidationError('Nominal pembayaran harus lebih dari 0.');
    }

    const createdAt = nowIso();

    supplierDebtRepository.transaction(() => {
      const currentPayments = supplierDebtRepository.listPaymentsForDebts([debt.id]);
      const nextPaid = currentPayments.reduce((sum, payment) => sum + payment.amount, 0) + amount;
      const paidAmount = Math.min(debt.total_amount, nextPaid);
      const remainingAmount = Math.max(0, debt.total_amount - paidAmount);
      const status = remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : debt.status;

      supplierDebtRepository.createPayment({
        id: crypto.randomUUID(),
        target_type: 'supplier_debt',
        target_id: debt.id,
        amount,
        method: input.method.trim(),
        note: input.note?.trim() || null,
        received_by_user_id: actorUserId,
        created_at: createdAt,
      });

      supplierDebtRepository.updateDebtAmounts(debt.id, paidAmount, remainingAmount, status, createdAt);
    });

    const refreshedDebt = supplierDebtRepository.findDebtById(debt.id) || debt;
    const refreshedItems = supplierDebtRepository.listItemsForDebts([debt.id]);
    const refreshedPayments = supplierDebtRepository.listPaymentsForDebts([debt.id]);
    return {
      item: mapDebtToUiRow(refreshedDebt, refreshedItems, refreshedPayments),
    };
  });

  app.delete('/supplier-debts/:debtId/payments/:paymentId', async (request) => {
    const params = z.object({ debtId: z.string().min(1), paymentId: z.string().min(1) }).parse(request.params);
    const debt = supplierDebtRepository.findDebtById(params.debtId);

    if (!debt) {
      throw new ValidationError('Hutang supplier tidak ditemukan.');
    }

    const payment = supplierDebtRepository.findPaymentById(params.paymentId);
    if (!payment || payment.target_type !== 'supplier_debt' || payment.target_id !== debt.id) {
      throw new ValidationError('Pembayaran tidak ditemukan.');
    }

    supplierDebtRepository.transaction(() => {
      supplierDebtRepository.deletePayment(payment.id);
      const currentPayments = supplierDebtRepository.listPaymentsForDebts([debt.id]);
      const paidAmount = currentPayments.reduce((sum, entry) => sum + entry.amount, 0);
      const remainingAmount = Math.max(0, debt.total_amount - paidAmount);
      const status = remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : debt.status;
      supplierDebtRepository.updateDebtAmounts(debt.id, paidAmount, remainingAmount, status, nowIso());
    });

    return { ok: true };
  });

  app.delete('/supplier-debts/:debtId', async (request) => {
    const params = z.object({ debtId: z.string().min(1) }).parse(request.params);
    const debt = supplierDebtRepository.findDebtById(params.debtId);

    if (!debt) {
      throw new ValidationError('Hutang supplier tidak ditemukan.');
    }

    supplierDebtRepository.transaction(() => {
      const payments = supplierDebtRepository.listPaymentsForDebts([debt.id]);
      for (const payment of payments) {
        supplierDebtRepository.deletePayment(payment.id);
      }

      supplierDebtRepository.deleteItemsByDebt(debt.id);
      supplierDebtRepository.deleteDebt(debt.id);
    });

    return { ok: true };
  });
}
