import { queueItemSchema, type QueueItem } from '@/contracts/pos';

let barcodeSequence = 0;

export function toCatalogText(value: unknown, fallback = ''): string {
  const text = typeof value === 'string' ? value.trim() : fallback;
  return text.toUpperCase();
}

export function normalizePriceText(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  const numeric = text.replace(/[^\d]/g, '');

  if (!numeric) {
    return text;
  }

  return `Rp ${Number(numeric).toLocaleString('id-ID')}`;
}

export function normalizeDiscountText(value: unknown, mode: 'nominal' | 'percent' = 'nominal'): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';

  if (!text) {
    return undefined;
  }

  if (mode === 'percent') {
    const numeric = text.replace(/[^\d]/g, '');
    return numeric ? `${Number(numeric)}%` : undefined;
  }

  return normalizePriceText(text);
}

export function parseCurrencyNumber(value: unknown): number {
  const text = typeof value === 'string' ? value : String(value ?? '');
  const numeric = text.replace(/[^\d]/g, '');
  return numeric ? Number(numeric) : 0;
}

export function normalizeQueueItem(rawItem: Partial<QueueItem> & { sku: string; name: string; note: string; price: string }): QueueItem {
  return queueItemSchema.parse({
    ...rawItem,
    name: toCatalogText(rawItem.name),
    category: toCatalogText(rawItem.category, 'Material umum'),
    qty: typeof rawItem.qty === 'number' ? rawItem.qty : Number(rawItem.qty ?? 0),
    unit: toCatalogText(rawItem.unit, 'PCS'),
    price: normalizePriceText(rawItem.price),
  });
}

export function assertCatalogItemComplete(item: QueueItem): void {
  if (!item.name.trim()) throw new Error('Nama barang wajib diisi.');
  if (!item.category.trim()) throw new Error('Kategori barang wajib diisi.');
  if (!item.unit.trim()) throw new Error('Satuan barang wajib diisi.');
  if (!Number.isFinite(item.qty) || item.qty < 0) throw new Error('Qty harus berupa angka 0 atau lebih.');
  if (!item.price.trim() || !item.price.replace(/[^\d]/g, '')) throw new Error('Harga barang wajib diisi dengan angka.');
}

export function getCatalogDuplicateKey(item: Pick<QueueItem, 'name' | 'category' | 'unit'>): string {
  return [item.name, item.category, item.unit].map((value) => value.trim().toUpperCase()).join('|');
}

export function computeEan13CheckDigit(body12: string): string {
  const digits = body12.split('').map((digit) => Number(digit));
  const sum = digits.reduce((total, digit, index) => {
    const weight = index % 2 === 0 ? 1 : 3;
    return total + digit * weight;
  }, 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return String(checkDigit);
}

export function generateBarcodeCandidate(): string {
  const seed = `${Date.now()}${barcodeSequence++}${Math.floor(Math.random() * 1000)}`;
  const numeric = seed.replace(/\D/g, '');
  const tail = numeric.slice(-9).padStart(9, '0');
  const body12 = `899${tail}`;
  const checkDigit = computeEan13CheckDigit(body12);
  return `${body12}${checkDigit}`;
}

export function generateUniqueCatalogBarcode(existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = generateBarcodeCandidate();
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }

  throw new Error('Gagal membuat barcode unik.');
}
