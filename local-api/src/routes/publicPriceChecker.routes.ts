import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../core/errors.js';
import type { DbClient } from '../db/client.js';
import {
  isValidPriceCheckerBarcode,
  normalizePriceCheckerSearchQuery,
  toPublicPriceCheckerProduct,
} from '../domain/publicPriceChecker.js';
import type { CatalogRepository } from '../repositories/catalogRepository.js';

const settingsKey = 'app_settings';
const maxSearchResults = 15;

const defaultStoreIdentity = {
  name: 'TOKO BERSAMA MATERIAL',
  address: '',
  phone: '',
  logoDataUrl: null as string | null,
  logoFileName: '',
  logoFileSizeKb: null as number | null,
};

function getPublicStoreIdentity(db: DbClient) {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ? LIMIT 1').get(settingsKey) as { value_json?: string } | undefined;
  if (!row?.value_json) {
    return defaultStoreIdentity;
  }

  try {
    const parsed = JSON.parse(row.value_json) as { store?: Partial<typeof defaultStoreIdentity> };
    return {
      ...defaultStoreIdentity,
      ...parsed.store,
    };
  } catch {
    return defaultStoreIdentity;
  }
}

export async function registerPublicPriceCheckerRoutes(
  app: FastifyInstance,
  db: DbClient,
  catalogRepository: CatalogRepository
) {
  app.get('/public/price-checker/health', async () => ({
    ok: true,
    service: 'price-checker',
    timestamp: new Date().toISOString(),
  }));

  app.get('/public/price-checker/store', async () => ({
    item: getPublicStoreIdentity(db),
  }));

  app.get('/public/price-checker/products/search', async (request) => {
    const parsed = z.object({
      q: z.string().optional(),
    }).parse(request.query);
    const query = normalizePriceCheckerSearchQuery(parsed.q);

    if (query.length < 2) {
      throw new ValidationError('Kata kunci pencarian minimal 2 karakter.');
    }

    return {
      items: catalogRepository.searchActive(query, maxSearchResults).map(toPublicPriceCheckerProduct),
    };
  });

  app.get('/public/price-checker/products/:barcode', async (request) => {
    const params = z.object({
      barcode: z.string(),
    }).parse(request.params);
    const barcode = params.barcode.trim();

    if (!isValidPriceCheckerBarcode(barcode)) {
      throw new ValidationError('Barcode harus berupa angka 8 sampai 14 digit.');
    }

    const product = catalogRepository.findActiveByBarcode(barcode);
    if (!product) {
      throw new NotFoundError('Barcode', barcode);
    }

    return {
      item: toPublicPriceCheckerProduct(product),
    };
  });
}
