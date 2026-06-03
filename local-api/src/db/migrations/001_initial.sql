CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'cashier')),
  password_hash TEXT NOT NULL,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty >= 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_name);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  movement_qty INTEGER NOT NULL,
  before_qty INTEGER NOT NULL CHECK (before_qty >= 0),
  after_qty INTEGER NOT NULL CHECK (after_qty >= 0),
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  reason TEXT,
  reference_id TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  invoice_no TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('paid', 'dp', 'installment', 'void')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  payment_method TEXT NOT NULL,
  subtotal_amount INTEGER NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  paid_amount INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount INTEGER NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
  cashier_user_id TEXT NOT NULL,
  note TEXT,
  due_date TEXT,
  created_at TEXT NOT NULL,
  voided_at TEXT,
  void_reason TEXT,
  FOREIGN KEY (cashier_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  barcode TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  unit_snapshot TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  subtotal_amount INTEGER NOT NULL CHECK (subtotal_amount >= 0),
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('sale', 'receivable', 'supplier_debt')),
  target_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  method TEXT NOT NULL,
  note TEXT,
  received_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (received_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_target ON payments(target_type, target_id);

CREATE TABLE IF NOT EXISTS supplier_debts (
  id TEXT PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  take_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('open', 'partial', 'paid', 'overdue')),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  paid_amount INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount INTEGER NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS supplier_debt_items (
  id TEXT PRIMARY KEY,
  supplier_debt_id TEXT NOT NULL,
  product_id TEXT,
  name_snapshot TEXT NOT NULL,
  category_snapshot TEXT NOT NULL,
  unit_snapshot TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  subtotal_amount INTEGER NOT NULL CHECK (subtotal_amount >= 0),
  FOREIGN KEY (supplier_debt_id) REFERENCES supplier_debts(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'cashier')),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 0,
  UNIQUE(role, resource, action)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
