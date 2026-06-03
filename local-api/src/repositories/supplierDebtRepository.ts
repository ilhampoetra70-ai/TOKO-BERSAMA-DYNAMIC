import type { DbClient } from '../db/client.js';

export type SupplierDebtRecord = {
  id: string;
  supplier_name: string;
  take_date: string;
  due_date: string | null;
  status: 'open' | 'partial' | 'paid' | 'overdue';
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  created_by_user_id: string;
  created_by_display_name?: string;
  created_at: string;
  updated_at: string;
};

export type SupplierDebtItemRecord = {
  id: string;
  supplier_debt_id: string;
  product_id: string | null;
  name_snapshot: string;
  category_snapshot: string;
  unit_snapshot: string;
  qty: number;
  unit_price: number;
  subtotal_amount: number;
};

export type DebtPaymentRecord = {
  id: string;
  target_type: 'supplier_debt';
  target_id: string;
  amount: number;
  method: string;
  note: string | null;
  received_by_user_id: string;
  created_at: string;
};

export class SupplierDebtRepository {
  constructor(private readonly db: DbClient) {}

  listDebts(): SupplierDebtRecord[] {
    return this.db.prepare(`
      SELECT supplier_debts.*, users.display_name AS created_by_display_name
      FROM supplier_debts
      LEFT JOIN users ON users.id = supplier_debts.created_by_user_id
      ORDER BY supplier_debts.created_at DESC
    `).all() as SupplierDebtRecord[];
  }

  findDebtById(id: string): SupplierDebtRecord | null {
    return this.db.prepare('SELECT * FROM supplier_debts WHERE id = ? LIMIT 1').get(id) as SupplierDebtRecord | undefined ?? null;
  }

  listItemsForDebts(debtIds: string[]): SupplierDebtItemRecord[] {
    if (!debtIds.length) return [];

    const placeholders = debtIds.map(() => '?').join(',');
    return this.db.prepare(`
      SELECT * FROM supplier_debt_items
      WHERE supplier_debt_id IN (${placeholders})
      ORDER BY rowid ASC
    `).all(...debtIds) as SupplierDebtItemRecord[];
  }

  listPaymentsForDebts(debtIds: string[]): DebtPaymentRecord[] {
    if (!debtIds.length) return [];

    const placeholders = debtIds.map(() => '?').join(',');
    return this.db.prepare(`
      SELECT * FROM payments
      WHERE target_type = 'supplier_debt'
        AND target_id IN (${placeholders})
      ORDER BY created_at DESC
    `).all(...debtIds) as DebtPaymentRecord[];
  }

  createDebt(record: SupplierDebtRecord): SupplierDebtRecord {
    this.db.prepare(`
      INSERT INTO supplier_debts (
        id, supplier_name, take_date, due_date, status, total_amount, paid_amount,
        remaining_amount, created_by_user_id, created_at, updated_at
      ) VALUES (
        @id, @supplier_name, @take_date, @due_date, @status, @total_amount, @paid_amount,
        @remaining_amount, @created_by_user_id, @created_at, @updated_at
      )
    `).run(record);

    return record;
  }

  createItem(record: SupplierDebtItemRecord): SupplierDebtItemRecord {
    this.db.prepare(`
      INSERT INTO supplier_debt_items (
        id, supplier_debt_id, product_id, name_snapshot, category_snapshot,
        unit_snapshot, qty, unit_price, subtotal_amount
      ) VALUES (
        @id, @supplier_debt_id, @product_id, @name_snapshot, @category_snapshot,
        @unit_snapshot, @qty, @unit_price, @subtotal_amount
      )
    `).run(record);

    return record;
  }

  createPayment(record: DebtPaymentRecord): DebtPaymentRecord {
    this.db.prepare(`
      INSERT INTO payments (
        id, target_type, target_id, amount, method, note, received_by_user_id, created_at
      ) VALUES (
        @id, @target_type, @target_id, @amount, @method, @note, @received_by_user_id, @created_at
      )
    `).run(record);

    return record;
  }

  findPaymentById(paymentId: string): DebtPaymentRecord | null {
    return this.db.prepare('SELECT * FROM payments WHERE id = ? LIMIT 1').get(paymentId) as DebtPaymentRecord | undefined ?? null;
  }

  deletePayment(paymentId: string): number {
    return this.db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId).changes;
  }

  updateDebtAmounts(id: string, paidAmount: number, remainingAmount: number, status: SupplierDebtRecord['status'], updatedAt: string): void {
    this.db.prepare(`
      UPDATE supplier_debts
      SET paid_amount = ?,
          remaining_amount = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(paidAmount, remainingAmount, status, updatedAt, id);
  }

  deleteDebt(id: string): number {
    return this.db.prepare('DELETE FROM supplier_debts WHERE id = ?').run(id).changes;
  }

  deleteItemsByDebt(id: string): number {
    return this.db.prepare('DELETE FROM supplier_debt_items WHERE supplier_debt_id = ?').run(id).changes;
  }

  transaction<T>(work: () => T): T {
    return this.db.transaction(work)();
  }
}
