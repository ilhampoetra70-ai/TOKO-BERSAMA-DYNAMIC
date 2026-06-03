CREATE TABLE IF NOT EXISTS cashier_sessions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('Draft', 'Tertahan')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  cashier_user_id TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  subtotal_amount INTEGER NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  payment_amount INTEGER NOT NULL DEFAULT 0 CHECK (payment_amount >= 0),
  discount_text TEXT,
  discount_mode TEXT NOT NULL DEFAULT 'nominal' CHECK (discount_mode IN ('nominal', 'percent')),
  reference_no TEXT,
  note TEXT,
  due_date TEXT,
  cart_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cashier_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cashier_sessions_kind ON cashier_sessions(kind);
CREATE INDEX IF NOT EXISTS idx_cashier_sessions_updated_at ON cashier_sessions(updated_at);
