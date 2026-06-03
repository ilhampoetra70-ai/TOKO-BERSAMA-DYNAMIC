import type { QueueItem } from '@/contracts/pos';
import { parseCurrencyNumber } from './catalogService';

export type CashierCartItemInput = { sku: string; qty: number };

export type CashierFormInput = {
  customerName?: string;
  phone?: string;
  projectName?: string;
  customerType?: string;
  address?: string;
  reference?: string;
  note?: string;
  dueDate?: string;
};

export type CheckoutSaleInput = CashierFormInput & {
  cashier?: string;
  method: string;
  status: string;
  paymentAmount?: string;
  discount?: string;
  discountMode?: 'nominal' | 'percent';
  cartItems: CashierCartItemInput[];
};

export type CashierSessionInput = CheckoutSaleInput;

export function normalizeCartItems(items: CashierCartItemInput[]): CashierCartItemInput[] {
  return items
    .map((item) => ({
      sku: typeof item.sku === 'string' ? item.sku.trim() : '',
      qty: Math.trunc(Number(item.qty)),
    }))
    .filter((item) => item.sku && Number.isFinite(item.qty) && item.qty > 0);
}

export function calculateCartSubtotal(cartItems: CashierCartItemInput[], catalogBySku: Map<string, QueueItem>): number {
  return cartItems.reduce((total, cartItem) => {
    const catalogItem = catalogBySku.get(cartItem.sku);
    if (!catalogItem) {
      throw new Error(`Barcode ${cartItem.sku} tidak ditemukan di katalog.`);
    }

    return total + parseCurrencyNumber(catalogItem.price) * cartItem.qty;
  }, 0);
}

export function calculateDiscountAmount(
  subtotal: number,
  discount: unknown,
  discountMode: 'nominal' | 'percent' = 'nominal'
): number {
  const discountValueRaw = discountMode === 'percent'
    ? (Math.max(0, Number(String(discount ?? '').replace(/[^\d]/g, ''))) / 100) * subtotal
    : parseCurrencyNumber(discount);

  return Math.max(0, Math.min(subtotal, discountValueRaw));
}
