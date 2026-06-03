import { resolveRuntimeApiBaseUrl } from '../services/apiBaseUrl';

export type PriceCheckerStockStatus = 'available' | 'low' | 'out';

export type PriceCheckerProduct = {
  barcode: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  priceText: string;
  stockStatus: PriceCheckerStockStatus;
};

export type PriceCheckerStore = {
  name: string;
  address: string;
  phone: string;
  logoDataUrl: string | null;
  logoFileName: string;
  logoFileSizeKb: number | null;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

export class PriceCheckerRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'PriceCheckerRequestError';
  }
}

export function isPriceCheckerRequestError(error: unknown): error is PriceCheckerRequestError {
  return error instanceof PriceCheckerRequestError;
}

function resolveBaseUrl() {
  return resolveRuntimeApiBaseUrl();
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiErrorPayload | null;
    throw new PriceCheckerRequestError(payload?.error?.message || `Price checker API error ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

export const priceCheckerApi = {
  async health() {
    return requestJson<{ ok: boolean; timestamp: string }>('/public/price-checker/health');
  },

  async getStore() {
    const payload = await requestJson<{ item: PriceCheckerStore }>('/public/price-checker/store');
    return payload.item;
  },

  async lookupBarcode(barcode: string) {
    const payload = await requestJson<{ item: PriceCheckerProduct }>(`/public/price-checker/products/${encodeURIComponent(barcode)}`);
    return payload.item;
  },

  async searchProducts(query: string) {
    const params = new URLSearchParams({ q: query });
    const payload = await requestJson<{ items: PriceCheckerProduct[] }>(`/public/price-checker/products/search?${params.toString()}`);
    return payload.items;
  },
};
