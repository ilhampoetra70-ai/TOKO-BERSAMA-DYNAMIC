import type { DbClient } from '../db/client.js';

export type StockMovementRecord = {
  id: string;
  product_id: string;
  product_barcode: string;
  product_name: string;
  unit: string;
  movement_qty: number;
  before_qty: number;
  after_qty: number;
  type: string;
  source: string;
  reason: string | null;
  reference_id: string | null;
  created_by_user_id: string;
  created_by_display_name?: string;
  created_at: string;
};

export type CreateStockMovementInput = {
  id: string;
  productId: string;
  movementQty: number;
  beforeQty: number;
  afterQty: number;
  type: string;
  source: string;
  reason?: string;
  referenceId?: string;
  createdByUserId: string;
  createdAt: string;
};

export class StockRepository {
  constructor(private readonly db: DbClient) {}

  create(input: CreateStockMovementInput): void {
    this.db.prepare(`
      INSERT INTO stock_movements (
        id, product_id, movement_qty, before_qty, after_qty, type, source,
        reason, reference_id, created_by_user_id, created_at
      ) VALUES (
        @id, @productId, @movementQty, @beforeQty, @afterQty, @type, @source,
        @reason, @referenceId, @createdByUserId, @createdAt
      )
    `).run({
      ...input,
      reason: input.reason ?? null,
      referenceId: input.referenceId ?? null,
    });
  }

  listRecent(limit = 500): StockMovementRecord[] {
    return this.db.prepare(`
      SELECT
        stock_movements.*,
        users.display_name AS created_by_display_name,
        products.barcode AS product_barcode,
        products.name AS product_name,
        products.unit AS unit
      FROM stock_movements
      JOIN products ON products.id = stock_movements.product_id
      LEFT JOIN users ON users.id = stock_movements.created_by_user_id
      ORDER BY stock_movements.created_at DESC
      LIMIT ?
    `).all(limit) as StockMovementRecord[];
  }
}
