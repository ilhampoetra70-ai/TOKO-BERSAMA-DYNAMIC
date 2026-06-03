import type { PriceCheckerProduct } from './priceCheckerApi';

const storageKey = 'tokobersama.price-checker.recent-scans';
const maxRecentScans = 5;

export type RecentScan = PriceCheckerProduct & {
  scannedAt: string;
};

export function readRecentScans(): RecentScan[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentScan[];
    return Array.isArray(parsed) ? parsed.slice(0, maxRecentScans) : [];
  } catch {
    return [];
  }
}

export function writeRecentScan(product: PriceCheckerProduct): RecentScan[] {
  const nextItem: RecentScan = {
    ...product,
    scannedAt: new Date().toISOString(),
  };
  const nextItems = [
    nextItem,
    ...readRecentScans().filter((item) => item.barcode !== product.barcode),
  ].slice(0, maxRecentScans);

  window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
  return nextItems;
}
