import type { ProductRecord } from '../repositories/catalogRepository.js';

export function normalizeCatalogText(value: unknown, fallback = ''): string {
  const text = typeof value === 'string' ? value : String(value ?? '');
  const normalized = text.trim().replace(/\s+/g, ' ').toUpperCase();

  return normalized || fallback.toUpperCase();
}

export function parsePriceValue(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }

  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

export function formatRupiah(amount: number): string {
  return `Rp ${Math.max(0, Math.trunc(amount)).toLocaleString('id-ID')}`;
}

export function toQueueItem(product: ProductRecord) {
  return {
    sku: product.barcode,
    name: product.name,
    category: product.category_name,
    qty: product.qty,
    unit: product.unit,
    note: product.note ?? '',
    price: formatRupiah(product.unit_price),
  };
}

export function getCatalogDuplicateKey(input: { name: string; category: string; unit: string }) {
  return [
    normalizeCatalogText(input.name),
    normalizeCatalogText(input.category),
    normalizeCatalogText(input.unit),
  ].join('::');
}
