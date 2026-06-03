import type { ProductRecord } from '../repositories/catalogRepository.js';

const LOW_STOCK_THRESHOLD = 5;

export type PublicPriceCheckerProduct = {
  barcode: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  priceText: string;
  stockStatus: 'available' | 'low' | 'out';
};

export function formatPriceCheckerRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function resolveStockStatus(qty: number): PublicPriceCheckerProduct['stockStatus'] {
  if (qty <= 0) return 'out';
  if (qty <= LOW_STOCK_THRESHOLD) return 'low';
  return 'available';
}

export function normalizePriceCheckerSearchQuery(query: unknown) {
  if (typeof query !== 'string') return '';
  return query.trim().replace(/\s+/g, ' ').slice(0, 80);
}

export function isValidPriceCheckerBarcode(barcode: string) {
  return /^\d{8,14}$/.test(barcode);
}

export function toPublicPriceCheckerProduct(product: ProductRecord): PublicPriceCheckerProduct {
  return {
    barcode: product.barcode,
    name: product.name,
    category: product.category_name,
    unit: product.unit,
    unitPrice: product.unit_price,
    priceText: formatPriceCheckerRupiah(product.unit_price),
    stockStatus: resolveStockStatus(product.qty),
  };
}
