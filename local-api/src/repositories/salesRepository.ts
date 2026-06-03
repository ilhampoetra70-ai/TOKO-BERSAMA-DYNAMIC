import type { DbClient } from '../db/client.js';

export type SaleRecord = {
  id: string;
  request_id: string;
  invoice_no: string;
  status: 'paid' | 'dp' | 'installment' | 'void';
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  payment_method: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  cashier_user_id: string;
  cashier_display_name?: string;
  note: string | null;
  due_date: string | null;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
};

export type SaleItemRecord = {
  id: string;
  sale_id: string;
  product_id: string;
  barcode: string;
  name_snapshot: string;
  unit_snapshot: string;
  qty: number;
  unit_price: number;
  subtotal_amount: number;
};

export type PaymentRecord = {
  id: string;
  target_type: 'sale' | 'receivable' | 'supplier_debt';
  target_id: string;
  amount: number;
  method: string;
  note: string | null;
  received_by_user_id: string;
  created_at: string;
};

export type SaleRevisionRecord = {
  id: string;
  sale_id: string;
  revision_no: number;
  reason: string;
  edited_by_user_id: string;
  edited_at: string;
  before_snapshot_json: string;
  after_snapshot_json: string;
  stock_delta_json: string;
  total_before: number;
  total_after: number;
};

export type SalePaymentRow = PaymentRecord & {
  target_type: 'sale';
  target_id: string;
};

export type CashierSessionRecord = {
  id: string;
  kind: 'Draft' | 'Tertahan';
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  cashier_user_id: string;
  cashier_display_name?: string;
  payment_method: string;
  payment_status: string;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_amount: number;
  discount_text: string | null;
  discount_mode: 'nominal' | 'percent';
  reference_no: string | null;
  note: string | null;
  due_date: string | null;
  cart_json: string;
  created_at: string;
  updated_at: string;
};

export type SalesListOptions = {
  limit?: number;
};

export type SalesDateRange = {
  start: string;
  end: string;
};

export type SalesSummaryRow = {
  totalOmzet: number;
  totalPaid: number;
  transactionCount: number;
};

export type SalesTrendRow = {
  day: string;
  omzet: number;
  paid: number;
};

export type SalesPaymentDistributionRow = {
  method: string;
  total: number;
};

export type SalesCategoryDistributionRow = {
  category: string;
  total: number;
};

export type SalesHourlyRow = {
  hour: string;
  count: number;
  total: number;
};

export type SalesTopProductRow = {
  sku: string;
  name: string;
  qty: number;
  total: number;
  category: string;
};

export class SalesRepository {
  constructor(private readonly db: DbClient) {}

  listSales(options: SalesListOptions = {}): SaleRecord[] {
    const limit = options.limit && Number.isFinite(options.limit)
      ? Math.max(1, Math.trunc(options.limit))
      : null;
    if (limit) {
      return this.db.prepare(`
        SELECT sales.*, users.display_name AS cashier_display_name
        FROM sales
        LEFT JOIN users ON users.id = sales.cashier_user_id
        ORDER BY sales.created_at DESC
        LIMIT ?
      `).all(limit) as SaleRecord[];
    }

    return this.db.prepare(`
      SELECT sales.*, users.display_name AS cashier_display_name
      FROM sales
      LEFT JOIN users ON users.id = sales.cashier_user_id
      ORDER BY sales.created_at DESC
    `).all() as SaleRecord[];
  }

  listSalesByCreatedRange(start: string, end: string): SaleRecord[] {
    return this.db.prepare(`
      SELECT sales.*, users.display_name AS cashier_display_name
      FROM sales
      LEFT JOIN users ON users.id = sales.cashier_user_id
      WHERE sales.created_at >= ?
        AND sales.created_at <= ?
      ORDER BY sales.created_at DESC
    `).all(start, end) as SaleRecord[];
  }

  sumReceivableRemaining(): number {
    const row = this.db.prepare(`
      SELECT COALESCE(SUM(remaining_amount), 0) AS total
      FROM sales
    `).get() as { total: number } | undefined;

    return row?.total ?? 0;
  }

  countOverdueReceivables(nowIso: string): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count
      FROM sales
      WHERE status = 'installment'
        AND remaining_amount > 0
        AND due_date IS NOT NULL
        AND due_date < ?
    `).get(nowIso) as { count: number } | undefined;

    return row?.count ?? 0;
  }

  summarizeSalesByCreatedRange(range: SalesDateRange): SalesSummaryRow {
    const row = this.db.prepare(`
      SELECT
        COALESCE(SUM(total_amount), 0) AS totalOmzet,
        COALESCE(SUM(paid_amount), 0) AS totalPaid,
        COUNT(*) AS transactionCount
      FROM sales
      WHERE created_at >= @start
        AND created_at <= @end
    `).get(range) as SalesSummaryRow | undefined;

    return row ?? { totalOmzet: 0, totalPaid: 0, transactionCount: 0 };
  }

  listTrendByCreatedRange(range: SalesDateRange): SalesTrendRow[] {
    return this.db.prepare(`
      SELECT
        substr(created_at, 1, 10) AS day,
        COALESCE(SUM(total_amount), 0) AS omzet,
        COALESCE(SUM(paid_amount), 0) AS paid
      FROM sales
      WHERE created_at >= @start
        AND created_at <= @end
      GROUP BY substr(created_at, 1, 10)
      ORDER BY day ASC
    `).all(range) as SalesTrendRow[];
  }

  listPaymentDistributionByCreatedRange(range: SalesDateRange): SalesPaymentDistributionRow[] {
    return this.db.prepare(`
      SELECT
        payment_method AS method,
        COALESCE(SUM(total_amount), 0) AS total
      FROM sales
      WHERE created_at >= @start
        AND created_at <= @end
      GROUP BY payment_method
      ORDER BY total DESC
    `).all(range) as SalesPaymentDistributionRow[];
  }

  listHourlySalesByCreatedRange(range: SalesDateRange): SalesHourlyRow[] {
    return this.db.prepare(`
      SELECT
        substr(created_at, 12, 2) AS hour,
        COUNT(*) AS count,
        COALESCE(SUM(total_amount), 0) AS total
      FROM sales
      WHERE created_at >= @start
        AND created_at <= @end
      GROUP BY substr(created_at, 12, 2)
      ORDER BY hour ASC
    `).all(range) as SalesHourlyRow[];
  }

  listCategoryDistributionByCreatedRange(range: SalesDateRange, limit = 6): SalesCategoryDistributionRow[] {
    return this.db.prepare(`
      SELECT
        COALESCE(products.category_name, 'LAINNYA') AS category,
        COALESCE(SUM(sale_items.subtotal_amount), 0) AS total
      FROM sale_items
      INNER JOIN sales ON sales.id = sale_items.sale_id
      LEFT JOIN products ON products.id = sale_items.product_id
      WHERE sales.created_at >= @start
        AND sales.created_at <= @end
      GROUP BY COALESCE(products.category_name, 'LAINNYA')
      ORDER BY total DESC
      LIMIT @limit
    `).all({ ...range, limit }) as SalesCategoryDistributionRow[];
  }

  listTopProductsByCreatedRange(range: SalesDateRange, limit = 8): SalesTopProductRow[] {
    return this.db.prepare(`
      SELECT
        sale_items.barcode AS sku,
        sale_items.name_snapshot AS name,
        COALESCE(SUM(sale_items.qty), 0) AS qty,
        COALESCE(SUM(sale_items.subtotal_amount), 0) AS total,
        COALESCE(products.category_name, 'LAINNYA') AS category
      FROM sale_items
      INNER JOIN sales ON sales.id = sale_items.sale_id
      LEFT JOIN products ON products.id = sale_items.product_id
      WHERE sales.created_at >= @start
        AND sales.created_at <= @end
      GROUP BY sale_items.barcode, sale_items.name_snapshot, COALESCE(products.category_name, 'LAINNYA')
      ORDER BY total DESC
      LIMIT @limit
    `).all({ ...range, limit }) as SalesTopProductRow[];
  }

  listItemsForSales(saleIds: string[]): SaleItemRecord[] {
    if (!saleIds.length) {
      return [];
    }

    const placeholders = saleIds.map(() => '?').join(',');
    return this.db.prepare(`
      SELECT * FROM sale_items
      WHERE sale_id IN (${placeholders})
      ORDER BY rowid ASC
    `).all(...saleIds) as SaleItemRecord[];
  }

  listInvoiceNumbers(): string[] {
    return this.db
      .prepare("SELECT invoice_no FROM sales WHERE invoice_no LIKE 'INV-%'")
      .all()
      .map((row) => (row as { invoice_no: string }).invoice_no);
  }

  createSale(record: SaleRecord): SaleRecord {
    this.db.prepare(`
      INSERT INTO sales (
        id, request_id, invoice_no, status, customer_name, customer_phone,
        customer_address, payment_method, subtotal_amount, discount_amount,
        total_amount, paid_amount, remaining_amount, cashier_user_id, note,
        due_date, created_at, voided_at, void_reason
      ) VALUES (
        @id, @request_id, @invoice_no, @status, @customer_name, @customer_phone,
        @customer_address, @payment_method, @subtotal_amount, @discount_amount,
        @total_amount, @paid_amount, @remaining_amount, @cashier_user_id, @note,
        @due_date, @created_at, @voided_at, @void_reason
      )
    `).run(record);

    return record;
  }

  createSaleItem(record: SaleItemRecord): SaleItemRecord {
    this.db.prepare(`
      INSERT INTO sale_items (
        id, sale_id, product_id, barcode, name_snapshot, unit_snapshot, qty,
        unit_price, subtotal_amount
      ) VALUES (
        @id, @sale_id, @product_id, @barcode, @name_snapshot, @unit_snapshot, @qty,
        @unit_price, @subtotal_amount
      )
    `).run(record);

    return record;
  }

  replaceSaleItems(saleId: string, records: SaleItemRecord[]): void {
    this.db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);
    const insert = this.db.prepare(`
      INSERT INTO sale_items (
        id, sale_id, product_id, barcode, name_snapshot, unit_snapshot, qty,
        unit_price, subtotal_amount
      ) VALUES (
        @id, @sale_id, @product_id, @barcode, @name_snapshot, @unit_snapshot, @qty,
        @unit_price, @subtotal_amount
      )
    `);

    for (const record of records) {
      insert.run(record);
    }
  }

  createPayment(record: PaymentRecord): PaymentRecord {
    this.db.prepare(`
      INSERT INTO payments (
        id, target_type, target_id, amount, method, note, received_by_user_id, created_at
      ) VALUES (
        @id, @target_type, @target_id, @amount, @method, @note, @received_by_user_id, @created_at
      )
    `).run(record);

    return record;
  }

  findPaymentById(paymentId: string): PaymentRecord | null {
    return this.db.prepare('SELECT * FROM payments WHERE id = ? LIMIT 1').get(paymentId) as PaymentRecord | undefined ?? null;
  }

  deletePayment(paymentId: string): number {
    return this.db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId).changes;
  }

  listPaymentsForSales(saleIds: string[]): SalePaymentRow[] {
    if (!saleIds.length) {
      return [];
    }

    const placeholders = saleIds.map(() => '?').join(',');
    return this.db.prepare(`
      SELECT * FROM payments
      WHERE target_type = 'sale'
        AND target_id IN (${placeholders})
      ORDER BY created_at DESC
    `).all(...saleIds) as SalePaymentRow[];
  }

  findSaleById(id: string): SaleRecord | null {
    return this.db.prepare('SELECT * FROM sales WHERE id = ? LIMIT 1').get(id) as SaleRecord | undefined ?? null;
  }

  findSaleByInvoice(invoiceNo: string): SaleRecord | null {
    return this.db.prepare('SELECT * FROM sales WHERE invoice_no = ? LIMIT 1').get(invoiceNo) as SaleRecord | undefined ?? null;
  }

  updateSaleAmounts(id: string, paidAmount: number, remainingAmount: number, status: SaleRecord['status']): void {
    this.db.prepare(`
      UPDATE sales
      SET paid_amount = ?,
          remaining_amount = ?,
          status = ?
      WHERE id = ?
    `).run(paidAmount, remainingAmount, status, id);
  }

  updateSaleAfterRevision(record: SaleRecord): void {
    this.db.prepare(`
      UPDATE sales
      SET status = @status,
          subtotal_amount = @subtotal_amount,
          discount_amount = @discount_amount,
          total_amount = @total_amount,
          paid_amount = @paid_amount,
          remaining_amount = @remaining_amount,
          note = @note,
          due_date = @due_date
      WHERE id = @id
    `).run(record);
  }

  getLatestRevisionNo(saleId: string): number {
    const row = this.db.prepare(`
      SELECT COALESCE(MAX(revision_no), 0) AS revisionNo
      FROM sale_revisions
      WHERE sale_id = ?
    `).get(saleId) as { revisionNo: number } | undefined;

    return row?.revisionNo ?? 0;
  }

  createSaleRevision(record: SaleRevisionRecord): SaleRevisionRecord {
    this.db.prepare(`
      INSERT INTO sale_revisions (
        id, sale_id, revision_no, reason, edited_by_user_id, edited_at,
        before_snapshot_json, after_snapshot_json, stock_delta_json, total_before, total_after
      ) VALUES (
        @id, @sale_id, @revision_no, @reason, @edited_by_user_id, @edited_at,
        @before_snapshot_json, @after_snapshot_json, @stock_delta_json, @total_before, @total_after
      )
    `).run(record);

    return record;
  }

  listSaleRevisions(saleId: string): SaleRevisionRecord[] {
    return this.db.prepare(`
      SELECT *
      FROM sale_revisions
      WHERE sale_id = ?
      ORDER BY revision_no DESC
    `).all(saleId) as SaleRevisionRecord[];
  }

  listRevisionCountsForSales(saleIds: string[]): Map<string, number> {
    if (!saleIds.length) {
      return new Map();
    }

    const placeholders = saleIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT sale_id, COUNT(*) AS count
      FROM sale_revisions
      WHERE sale_id IN (${placeholders})
      GROUP BY sale_id
    `).all(...saleIds) as Array<{ sale_id: string; count: number }>;

    return new Map(rows.map((row) => [row.sale_id, row.count]));
  }

  listCashierSessions(): CashierSessionRecord[] {
    return this.db.prepare(`
      SELECT cashier_sessions.*, users.display_name AS cashier_display_name
      FROM cashier_sessions
      LEFT JOIN users ON users.id = cashier_sessions.cashier_user_id
      ORDER BY cashier_sessions.updated_at DESC
    `).all() as CashierSessionRecord[];
  }

  createCashierSession(record: CashierSessionRecord): CashierSessionRecord {
    this.db.prepare(`
      INSERT INTO cashier_sessions (
        id, kind, customer_name, customer_phone, customer_address, cashier_user_id,
        payment_method, payment_status, subtotal_amount, discount_amount, total_amount,
        payment_amount, discount_text, discount_mode, reference_no, note, due_date,
        cart_json, created_at, updated_at
      ) VALUES (
        @id, @kind, @customer_name, @customer_phone, @customer_address, @cashier_user_id,
        @payment_method, @payment_status, @subtotal_amount, @discount_amount, @total_amount,
        @payment_amount, @discount_text, @discount_mode, @reference_no, @note, @due_date,
        @cart_json, @created_at, @updated_at
      )
    `).run(record);

    return record;
  }

  deleteCashierSession(id: string): number {
    return this.db.prepare('DELETE FROM cashier_sessions WHERE id = ?').run(id).changes;
  }

  transaction<T>(work: () => T): T {
    return this.db.transaction(work)();
  }
}
