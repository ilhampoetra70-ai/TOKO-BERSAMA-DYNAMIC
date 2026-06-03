import type { DbClient } from '../db/client.js';

export type ProductRecord = {
  id: string;
  barcode: string;
  name: string;
  category_name: string;
  unit: string;
  note: string;
  qty: number;
  unit_price: number;
  status: 'active' | 'deleted';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export class CatalogRepository {
  constructor(private readonly db: DbClient) {}

  listActive(): ProductRecord[] {
    return this.db
      .prepare('SELECT * FROM products WHERE status = ? ORDER BY name ASC')
      .all('active') as ProductRecord[];
  }

  listActiveBarcodes(): string[] {
    return this.db
      .prepare('SELECT barcode FROM products WHERE status = ?')
      .all('active')
      .map((row) => (row as { barcode: string }).barcode);
  }

  findByBarcode(barcode: string): ProductRecord | null {
    return this.db
      .prepare('SELECT * FROM products WHERE barcode = ? LIMIT 1')
      .get(barcode) as ProductRecord | undefined ?? null;
  }

  findActiveByBarcode(barcode: string): ProductRecord | null {
    return this.db
      .prepare('SELECT * FROM products WHERE barcode = ? AND status = ? LIMIT 1')
      .get(barcode, 'active') as ProductRecord | undefined ?? null;
  }

  searchActive(query: string, limit: number): ProductRecord[] {
    const likeQuery = `%${query.replace(/[%_]/g, (value) => `\\${value}`)}%`;
    return this.db
      .prepare(`
        SELECT * FROM products
        WHERE status = 'active'
          AND (
            name LIKE @query ESCAPE '\\'
            OR barcode LIKE @query ESCAPE '\\'
            OR category_name LIKE @query ESCAPE '\\'
          )
        ORDER BY
          CASE
            WHEN barcode = @exact THEN 0
            WHEN barcode LIKE @prefix THEN 1
            WHEN name LIKE @prefix THEN 2
            ELSE 3
          END,
          name ASC
        LIMIT @limit
      `)
      .all({
        query: likeQuery,
        exact: query,
        prefix: `${query}%`,
        limit,
      }) as ProductRecord[];
  }

  findActiveDuplicate(input: { name: string; categoryName: string; unit: string; exceptBarcode?: string }): ProductRecord | null {
    return this.db.prepare(`
      SELECT * FROM products
      WHERE name = @name
        AND category_name = @categoryName
        AND unit = @unit
        AND status = 'active'
        AND (@exceptBarcode IS NULL OR barcode <> @exceptBarcode)
      LIMIT 1
    `).get({
      ...input,
      exceptBarcode: input.exceptBarcode ?? null,
    }) as ProductRecord | undefined ?? null;
  }

  create(product: ProductRecord): ProductRecord {
    this.db.prepare(`
      INSERT INTO products (
        id, barcode, name, category_name, unit, note, qty, unit_price,
        status, created_at, updated_at, deleted_at
      ) VALUES (
        @id, @barcode, @name, @category_name, @unit, @note, @qty, @unit_price,
        @status, @created_at, @updated_at, @deleted_at
      )
    `).run(product);

    return product;
  }

  updateByBarcode(previousBarcode: string, product: ProductRecord): ProductRecord {
    this.db.prepare(`
      UPDATE products
      SET barcode = @barcode,
          name = @name,
          category_name = @category_name,
          unit = @unit,
          note = @note,
          qty = @qty,
          unit_price = @unit_price,
          status = @status,
          updated_at = @updated_at,
          deleted_at = @deleted_at
      WHERE barcode = @previousBarcode
        AND status = 'active'
    `).run({
      ...product,
      previousBarcode,
    });

    return product;
  }

  renameCategory(previousCategory: string, nextCategory: string, updatedAt: string): number {
    const result = this.db.prepare(`
      UPDATE products
      SET category_name = ?, updated_at = ?
      WHERE category_name = ?
        AND status = 'active'
    `).run(nextCategory, updatedAt, previousCategory);

    return result.changes;
  }

  softDeleteByBarcode(barcode: string, deletedAt: string): number {
    const result = this.db.prepare(`
      UPDATE products
      SET status = 'deleted',
          qty = 0,
          updated_at = ?,
          deleted_at = ?
      WHERE barcode = ?
        AND status = 'active'
    `).run(deletedAt, deletedAt, barcode);

    return result.changes;
  }

  transaction<T>(work: () => T): T {
    return this.db.transaction(work)();
  }
}
