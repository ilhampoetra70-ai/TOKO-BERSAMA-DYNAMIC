ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN force_password_change INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login TEXT;
ALTER TABLE users ADD COLUMN device_label TEXT NOT NULL DEFAULT '-';

UPDATE users
SET device_label = 'Desktop kasir utama',
    last_login = datetime('now'),
    force_password_change = 1
WHERE id = 'system-admin';

INSERT OR IGNORE INTO users (
  id, username, display_name, role, password_hash, totp_enabled, active, force_password_change, last_login, device_label, created_at, updated_at
) VALUES
  ('cashier-main', 'kasir01', 'KASIR UTAMA', 'cashier', 'portable-local-placeholder', 0, 1, 1, datetime('now'), 'POS depan', datetime('now'), datetime('now')),
  ('supervisor-stock', 'spv-gudang', 'SUPERVISOR GUDANG', 'supervisor', 'portable-local-placeholder', 0, 1, 1, datetime('now', '-1 day'), 'Admin stok', datetime('now'), datetime('now')),
  ('cashier-backup', 'kasir02', 'KASIR CADANGAN', 'cashier', 'portable-local-placeholder', 0, 0, 1, NULL, '-', datetime('now'), datetime('now'));
