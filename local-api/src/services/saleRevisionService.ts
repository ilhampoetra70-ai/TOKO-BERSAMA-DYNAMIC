import crypto from 'node:crypto';
import { ForbiddenError, NotFoundError, ValidationError } from '../core/errors.js';
import type { CatalogRepository, ProductRecord } from '../repositories/catalogRepository.js';
import type { SaleItemRecord, SaleRecord, SalesRepository } from '../repositories/salesRepository.js';
import type { StockRepository } from '../repositories/stockRepository.js';

export type SaleRevisionItemInput = {
  sku: string;
  qty: number;
};

export type SaleRevisionInput = {
  items: SaleRevisionItemInput[];
  reason: string;
  expectedRevisionNo: number;
};

export type SaleRevisionResult = {
  sale: SaleRecord;
  items: SaleItemRecord[];
  revisionNo: number;
  overpaidAmount: number;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeItems(items: SaleRevisionItemInput[]) {
  const bySku = new Map<string, number>();
  for (const item of items) {
    const sku = item.sku.trim();
    const qty = Math.trunc(Number(item.qty));
    if (!sku) {
      throw new ValidationError('SKU item retur wajib diisi.');
    }
    if (!Number.isFinite(qty) || qty < 0) {
      throw new ValidationError(`Qty ${sku} tidak valid.`);
    }
    bySku.set(sku, (bySku.get(sku) ?? 0) + qty);
  }

  return Array.from(bySku.entries())
    .filter(([, qty]) => qty > 0)
    .map(([sku, qty]) => ({ sku, qty }));
}

function snapshot(sale: SaleRecord, items: SaleItemRecord[], payments: unknown[]) {
  return {
    sale,
    items,
    payments,
  };
}

function resolveStatus(previousStatus: SaleRecord['status'], totalAmount: number, paidAmount: number): SaleRecord['status'] {
  if (previousStatus === 'void') return 'void';
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'installment';
  if (previousStatus === 'dp') return 'dp';
  return 'installment';
}

export class SaleRevisionService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly catalogRepository: CatalogRepository,
    private readonly stockRepository: StockRepository
  ) {}

  getLatestRevisionNo(saleIdOrInvoice: string) {
    const sale = this.salesRepository.findSaleById(saleIdOrInvoice) || this.salesRepository.findSaleByInvoice(saleIdOrInvoice);
    if (!sale) {
      throw new NotFoundError('Transaksi', saleIdOrInvoice);
    }

    return this.salesRepository.getLatestRevisionNo(sale.id);
  }

  listRevisions(saleIdOrInvoice: string) {
    const sale = this.salesRepository.findSaleById(saleIdOrInvoice) || this.salesRepository.findSaleByInvoice(saleIdOrInvoice);
    if (!sale) {
      throw new NotFoundError('Transaksi', saleIdOrInvoice);
    }

    return this.salesRepository.listSaleRevisions(sale.id);
  }

  updateSaleWithRevision(saleIdOrInvoice: string, input: SaleRevisionInput, actor: { userId: string; role: string }): SaleRevisionResult {
    if (actor.role !== 'admin' && actor.role !== 'supervisor') {
      throw new ForbiddenError('Retur barang hanya boleh dilakukan Admin atau Supervisor.');
    }

    const reason = input.reason.trim();
    if (reason.length < 5) {
      throw new ValidationError('Alasan retur minimal 5 karakter.');
    }

    const requestedItems = normalizeItems(input.items);
    if (!requestedItems.length) {
      throw new ValidationError('Transaksi hasil revisi wajib punya minimal satu item.');
    }

    return this.salesRepository.transaction(() => {
      const sale = this.salesRepository.findSaleById(saleIdOrInvoice) || this.salesRepository.findSaleByInvoice(saleIdOrInvoice);
      if (!sale) {
        throw new NotFoundError('Transaksi', saleIdOrInvoice);
      }
      if (sale.status === 'void') {
        throw new ValidationError('Transaksi void tidak bisa diretur atau diedit.');
      }

      const latestRevisionNo = this.salesRepository.getLatestRevisionNo(sale.id);
      if (latestRevisionNo !== input.expectedRevisionNo) {
        throw new ValidationError('Transaksi sudah berubah. Muat ulang sebelum menyimpan.');
      }

      const previousItems = this.salesRepository.listItemsForSales([sale.id]);
      const payments = this.salesRepository.listPaymentsForSales([sale.id]);
      const beforeSnapshot = snapshot(sale, previousItems, payments);
      const previousBySku = new Map(previousItems.map((item) => [item.barcode, item]));
      const requestedBySku = new Map(requestedItems.map((item) => [item.sku, item.qty]));
      const allSkus = Array.from(new Set([...previousBySku.keys(), ...requestedBySku.keys()]));
      const products = new Map<string, ProductRecord>();
      const stockDeltas: Array<{ sku: string; name: string; beforeQty: number; afterQty: number; movementQty: number; type: string }> = [];
      const createdAt = nowIso();

      for (const sku of allSkus) {
        const previous = previousBySku.get(sku);
        const nextQty = requestedBySku.get(sku) ?? 0;
        const previousQty = previous?.qty ?? 0;
        const deltaSaleQty = nextQty - previousQty;
        if (deltaSaleQty === 0) continue;

        const product = this.catalogRepository.findActiveByBarcode(sku);
        if (!product) {
          throw new ValidationError(`Produk ${previous?.name_snapshot || sku} tidak aktif, stok tidak bisa dikoreksi.`);
        }
        products.set(sku, product);

        const movementQty = -deltaSaleQty;
        const afterQty = product.qty + movementQty;
        if (afterQty < 0) {
          throw new ValidationError(`Stok ${product.name} tidak cukup. Tersedia ${product.qty} ${product.unit}.`);
        }

        this.catalogRepository.updateByBarcode(product.barcode, {
          ...product,
          qty: afterQty,
          updated_at: createdAt,
        });
        this.stockRepository.create({
          id: crypto.randomUUID(),
          productId: product.id,
          movementQty,
          beforeQty: product.qty,
          afterQty,
          type: movementQty > 0 ? 'Retur' : 'Penjualan',
          source: 'Revisi transaksi',
          reason: `Invoice ${sale.invoice_no} revisi #${latestRevisionNo + 1}: ${reason}`,
          referenceId: sale.id,
          createdByUserId: actor.userId,
          createdAt,
        });
        stockDeltas.push({
          sku,
          name: product.name,
          beforeQty: product.qty,
          afterQty,
          movementQty,
          type: movementQty > 0 ? 'Retur' : 'Penjualan',
        });
      }

      const nextItems = requestedItems.map((item) => {
        const previous = previousBySku.get(item.sku);
        const product = products.get(item.sku) || this.catalogRepository.findActiveByBarcode(item.sku);
        if (!previous && !product) {
          throw new ValidationError(`Produk ${item.sku} tidak aktif.`);
        }

        const unitPrice = previous?.unit_price ?? product?.unit_price ?? 0;
        return {
          id: previous?.id ?? crypto.randomUUID(),
          sale_id: sale.id,
          product_id: previous?.product_id ?? product?.id ?? '',
          barcode: item.sku,
          name_snapshot: previous?.name_snapshot ?? product?.name ?? item.sku,
          unit_snapshot: previous?.unit_snapshot ?? product?.unit ?? 'pcs',
          qty: item.qty,
          unit_price: unitPrice,
          subtotal_amount: unitPrice * item.qty,
        };
      });

      const subtotalAmount = nextItems.reduce((total, item) => total + item.subtotal_amount, 0);
      const discountAmount = Math.min(sale.discount_amount, subtotalAmount);
      const totalAmount = Math.max(0, subtotalAmount - discountAmount);
      const paidAmount = payments.reduce((total, payment) => total + payment.amount, 0);
      const remainingAmount = Math.max(0, totalAmount - paidAmount);
      const nextSale: SaleRecord = {
        ...sale,
        status: resolveStatus(sale.status, totalAmount, paidAmount),
        subtotal_amount: subtotalAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
      };

      this.salesRepository.updateSaleAfterRevision(nextSale);
      this.salesRepository.replaceSaleItems(sale.id, nextItems);

      const afterSnapshot = snapshot(nextSale, nextItems, payments);
      const revisionNo = latestRevisionNo + 1;
      this.salesRepository.createSaleRevision({
        id: crypto.randomUUID(),
        sale_id: sale.id,
        revision_no: revisionNo,
        reason,
        edited_by_user_id: actor.userId,
        edited_at: createdAt,
        before_snapshot_json: JSON.stringify(beforeSnapshot),
        after_snapshot_json: JSON.stringify(afterSnapshot),
        stock_delta_json: JSON.stringify(stockDeltas),
        total_before: sale.total_amount,
        total_after: totalAmount,
      });

      return {
        sale: nextSale,
        items: nextItems,
        revisionNo,
        overpaidAmount: Math.max(0, paidAmount - totalAmount),
      };
    });
  }
}
