import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateUniqueCatalogBarcode } from '../domain/barcode.js';
import { formatRupiah, normalizeCatalogText, parsePriceValue, toQueueItem } from '../domain/catalogFormat.js';
import { NotFoundError, ValidationError } from '../core/errors.js';
import type { AuthenticatedRequest } from '../http/authHook.js';
import { CatalogRepository, type ProductRecord } from '../repositories/catalogRepository.js';
import { SalesRepository } from '../repositories/salesRepository.js';
import { listCashierSessionRows, listSaleRows } from './sales.routes.js';
import { StockRepository, type StockMovementRecord } from '../repositories/stockRepository.js';

const LOW_STOCK_THRESHOLD = 12;
const WORKSPACE_SALE_LIMIT = 100;
const WORKSPACE_STOCK_HISTORY_LIMIT = 100;

const catalogInputSchema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1),
  category: z.string().optional(),
  categoryName: z.string().optional(),
  unit: z.string().min(1),
  note: z.string().optional(),
  qty: z.coerce.number().int().nonnegative(),
  price: z.union([z.string(), z.number()]).optional(),
  unitPrice: z.coerce.number().int().nonnegative().optional(),
});

const importCatalogSchema = z.object({
  items: z.array(catalogInputSchema).min(1),
});

const renameCategorySchema = z.object({
  previousCategory: z.string().min(1),
  nextCategory: z.string().min(1),
});

const restockSchema = z.object({
  addedQty: z.coerce.number().int().positive(),
  supplier: z.string().optional(),
  note: z.string().optional(),
});

const supplierDebtStockSchema = z.object({
  supplier: z.string().min(1),
  takeDate: z.string().optional(),
  items: z.array(z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    packQty: z.coerce.number().int().positive(),
    unit: z.string().min(1),
    price: z.union([z.string(), z.number()]),
  })).min(1),
});

type CatalogInput = z.infer<typeof catalogInputSchema>;

function nowIso() {
  return new Date().toISOString();
}

function formatDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()] ?? 'Jan';
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year} ${hour}:${minute}`;
}

function normalizeInput(input: CatalogInput, fallbackBarcode: string) {
  const barcode = normalizeCatalogText(input.sku || input.barcode || fallbackBarcode);
  const name = normalizeCatalogText(input.name);
  const category = normalizeCatalogText(input.categoryName || input.category, 'MATERIAL UMUM');
  const unit = normalizeCatalogText(input.unit, 'PCS');
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  const unitPrice = input.unitPrice ?? parsePriceValue(input.price);

  if (!barcode || !/^\d{8,14}$/.test(barcode)) {
    throw new ValidationError('Barcode harus berupa angka 8 sampai 14 digit.');
  }

  if (!name || !category || !unit) {
    throw new ValidationError('Nama barang, kategori, dan satuan wajib diisi.');
  }

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new ValidationError('Harga barang wajib lebih dari 0.');
  }

  return {
    barcode,
    name,
    category,
    unit,
    note,
    qty: input.qty,
    unitPrice,
  };
}

function createProductRecord(input: ReturnType<typeof normalizeInput>, existing?: ProductRecord): ProductRecord {
  const timestamp = nowIso();

  return {
    id: existing?.id ?? crypto.randomUUID(),
    barcode: input.barcode,
    name: input.name,
    category_name: input.category,
    unit: input.unit,
    note: input.note,
    qty: input.qty,
    unit_price: input.unitPrice,
    status: 'active',
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };
}

function createMovement(
  stockRepository: StockRepository,
  product: ProductRecord,
  beforeQty: number,
  afterQty: number,
  event: string,
  source: string,
  actorUserId: string,
  reason?: string
) {
  const movementQty = afterQty - beforeQty;

  if (movementQty === 0) {
    return;
  }

  stockRepository.create({
    id: crypto.randomUUID(),
    productId: product.id,
    movementQty,
    beforeQty,
    afterQty,
    type: event,
    source,
    reason,
    createdByUserId: actorUserId,
    createdAt: nowIso(),
  });
}

function getActorUserId(request: unknown) {
  return (request as AuthenticatedRequest).auth?.userId ?? 'system-admin';
}

function toStockHistoryItem(row: StockMovementRecord) {
  const sign = row.movement_qty > 0 ? '+' : '';

  return {
    sku: row.product_barcode,
    item: row.product_name,
    movement: `${sign}${row.movement_qty} ${row.unit}`,
    note: row.reason || row.source,
    time: formatDisplayDate(row.created_at),
    event: row.type,
    beforeQty: row.before_qty,
    afterQty: row.after_qty,
    operator: row.created_by_display_name || row.created_by_user_id,
    source: row.source,
  };
}

function toStockRow(product: ProductRecord) {
  const status = product.qty <= 0 ? 'Critical' : product.qty <= LOW_STOCK_THRESHOLD ? 'Low' : 'Healthy';

  return {
    item: product.name,
    stock: product.qty,
    status,
    action: status === 'Healthy' ? 'Pantau' : 'Restok',
  };
}

function assertNoDuplicate(
  catalogRepository: CatalogRepository,
  input: { name: string; category: string; unit: string; barcode: string },
  exceptBarcode?: string
) {
  const duplicate = catalogRepository.findActiveDuplicate({
    name: input.name,
    categoryName: input.category,
    unit: input.unit,
    exceptBarcode,
  });

  if (duplicate) {
    throw new ValidationError(`Barang ${input.name} dengan kategori dan satuan yang sama sudah ada.`);
  }

  const barcodeOwner = catalogRepository.findActiveByBarcode(input.barcode);
  if (barcodeOwner && barcodeOwner.barcode !== exceptBarcode) {
    throw new ValidationError(`Barcode ${input.barcode} sudah dipakai.`);
  }
}

export async function registerCatalogRoutes(
  app: FastifyInstance,
  catalogRepository: CatalogRepository,
  stockRepository: StockRepository,
  salesRepository: SalesRepository
) {
  app.get('/workspace', async () => {
    const products = catalogRepository.listActive();
    const catalog = products.map(toQueueItem);

    return {
      alerts: true,
      data: {
        posQueue: [],
        posCatalog: catalog,
        stockHistoryRows: stockRepository.listRecent(WORKSPACE_STOCK_HISTORY_LIMIT).map(toStockHistoryItem),
        saleRows: listSaleRows(salesRepository, WORKSPACE_SALE_LIMIT),
        cashierSessionRows: listCashierSessionRows(salesRepository),
        adminMetrics: [],
        adminControls: [],
        stockRows: products.map(toStockRow),
        adminAlerts: [],
        priceHistory: [],
      },
    };
  });

  app.get('/catalog', async () => {
    return {
      items: catalogRepository.listActive().map(toQueueItem),
    };
  });

  app.get('/catalog/barcode', async () => {
    return {
      barcode: generateUniqueCatalogBarcode(catalogRepository.listActiveBarcodes()),
    };
  });

  app.post('/catalog', async (request, reply) => {
    const actorUserId = getActorUserId(request);
    const parsed = catalogInputSchema.parse(request.body);
    const input = normalizeInput(parsed, generateUniqueCatalogBarcode(catalogRepository.listActiveBarcodes()));
    assertNoDuplicate(catalogRepository, input);

    const product = catalogRepository.transaction(() => {
      const created = catalogRepository.create(createProductRecord(input));
      createMovement(stockRepository, created, 0, created.qty, 'Stock awal', 'Tambah barang', actorUserId, 'Barang baru dibuat');
      return created;
    });

    return reply.status(201).send({ item: toQueueItem(product) });
  });

  app.post('/catalog/import', async (request, reply) => {
    const actorUserId = getActorUserId(request);
    const { items } = importCatalogSchema.parse(request.body);
    const existingCodes = new Set(catalogRepository.listActiveBarcodes());
    const batchKeys = new Set<string>();
    const createdProducts: ProductRecord[] = [];

    const products = catalogRepository.transaction(() => {
      for (const rawItem of items) {
        const fallbackBarcode = generateUniqueCatalogBarcode(existingCodes);
        const input = normalizeInput(rawItem, fallbackBarcode);
        const key = `${input.name}::${input.category}::${input.unit}`;

        if (batchKeys.has(key)) {
          throw new ValidationError(`Duplikasi import pada barang ${input.name}.`);
        }

        assertNoDuplicate(catalogRepository, input);
        existingCodes.add(input.barcode);
        batchKeys.add(key);

        const created = catalogRepository.create(createProductRecord(input));
        createMovement(stockRepository, created, 0, created.qty, 'Import', 'Import barang', actorUserId, 'Barang dibuat dari import daftar barang');
        createdProducts.push(created);
      }

      return createdProducts;
    });

    return reply.status(201).send({ items: products.map(toQueueItem) });
  });

  app.put('/catalog/:barcode', async (request) => {
    const actorUserId = getActorUserId(request);
    const params = z.object({ barcode: z.string().min(1) }).parse(request.params);
    const existing = catalogRepository.findActiveByBarcode(params.barcode);

    if (!existing) {
      throw new NotFoundError('Barcode', params.barcode);
    }

    const parsed = catalogInputSchema.parse(request.body);
    const input = normalizeInput(parsed, params.barcode);
    assertNoDuplicate(catalogRepository, input, params.barcode);

    const updated = catalogRepository.transaction(() => {
      const product = catalogRepository.updateByBarcode(params.barcode, createProductRecord(input, existing));
      createMovement(stockRepository, product, existing.qty, product.qty, 'Penyesuaian', 'Edit barang', actorUserId, 'Qty barang diubah dari halaman Barang');
      return product;
    });

    return { item: toQueueItem(updated) };
  });

  app.patch('/catalog/categories/rename', async (request) => {
    const input = renameCategorySchema.parse(request.body);
    const previousCategory = normalizeCatalogText(input.previousCategory);
    const nextCategory = normalizeCatalogText(input.nextCategory);

    if (!previousCategory || !nextCategory) {
      throw new ValidationError('Kategori asal dan kategori baru wajib diisi.');
    }

    const updatedCount = catalogRepository.renameCategory(previousCategory, nextCategory, nowIso());
    if (updatedCount === 0) {
      throw new NotFoundError('Kategori', previousCategory);
    }

    return { updatedCount };
  });

  app.delete('/catalog/:barcode', async (request, reply) => {
    const actorUserId = getActorUserId(request);
    const params = z.object({ barcode: z.string().min(1) }).parse(request.params);
    const existing = catalogRepository.findActiveByBarcode(params.barcode);

    if (!existing) {
      throw new NotFoundError('Barcode', params.barcode);
    }

    catalogRepository.transaction(() => {
      catalogRepository.softDeleteByBarcode(params.barcode, nowIso());
      createMovement(stockRepository, existing, existing.qty, 0, 'Hapus barang', 'Hapus barang', actorUserId, 'Barang dihapus dari katalog');
    });

    return reply.status(204).send();
  });

  app.post('/catalog/:barcode/restock', async (request) => {
    const actorUserId = getActorUserId(request);
    const params = z.object({ barcode: z.string().min(1) }).parse(request.params);
    const input = restockSchema.parse(request.body);
    const existing = catalogRepository.findActiveByBarcode(params.barcode);

    if (!existing) {
      throw new NotFoundError('Barcode', params.barcode);
    }

    const updated = catalogRepository.transaction(() => {
      const nextProduct = catalogRepository.updateByBarcode(params.barcode, {
        ...existing,
        qty: existing.qty + input.addedQty,
        updated_at: nowIso(),
      });
      const notes = [`Restok oleh user pada ${formatDisplayDate(nowIso())}`];
      if (input.supplier?.trim()) notes.push(`Supplier: ${normalizeCatalogText(input.supplier)}`);
      if (input.note?.trim()) notes.push(input.note.trim());
      createMovement(stockRepository, nextProduct, existing.qty, nextProduct.qty, 'Restok', 'Restok', actorUserId, notes.join(' - '));
      return nextProduct;
    });

    return { item: toQueueItem(updated) };
  });

  app.post('/supplier-debts/receive-stock', async (request) => {
    const actorUserId = getActorUserId(request);
    const input = supplierDebtStockSchema.parse(request.body);
    const supplier = normalizeCatalogText(input.supplier);
    const takeDate = input.takeDate?.trim() || formatDisplayDate(nowIso());
    const existingCodes = new Set(catalogRepository.listActiveBarcodes());

    catalogRepository.transaction(() => {
      for (const item of input.items) {
        const normalized = {
          barcode: generateUniqueCatalogBarcode(existingCodes),
          name: normalizeCatalogText(item.name),
          category: normalizeCatalogText(item.category, 'MATERIAL UMUM'),
          unit: normalizeCatalogText(item.unit, 'PCS'),
          note: `Masuk dari hutang supplier ${supplier}`,
          qty: item.packQty,
          unitPrice: parsePriceValue(item.price),
        };

        const existing = catalogRepository.findActiveDuplicate({
          name: normalized.name,
          categoryName: normalized.category,
          unit: normalized.unit,
        });

        if (existing) {
          const updated = catalogRepository.updateByBarcode(existing.barcode, {
            ...existing,
            qty: existing.qty + normalized.qty,
            unit_price: normalized.unitPrice,
            updated_at: nowIso(),
          });
          createMovement(
            stockRepository,
            updated,
            existing.qty,
            updated.qty,
            'Restok',
            'Hutang supplier',
            actorUserId,
            `Masuk dari hutang supplier ${supplier} pada ${takeDate}`
          );
          continue;
        }

        existingCodes.add(normalized.barcode);
        const created = catalogRepository.create(createProductRecord(normalized));
        createMovement(
          stockRepository,
          created,
          0,
          created.qty,
          'Restok',
          'Hutang supplier',
          actorUserId,
          `Masuk dari hutang supplier ${supplier} pada ${takeDate}`
        );
      }
    });

    return {
      posCatalog: catalogRepository.listActive().map(toQueueItem),
      stockHistoryRows: stockRepository.listRecent().map(toStockHistoryItem),
    };
  });
}
