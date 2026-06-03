ALTER TABLE products ADD COLUMN note TEXT NOT NULL DEFAULT '';

INSERT OR IGNORE INTO users (
  id, username, display_name, role, password_hash, totp_enabled, active, created_at, updated_at
) VALUES (
  'system-admin',
  'admin',
  'ADMIN TOKO',
  'admin',
  'portable-local-placeholder',
  0,
  1,
  datetime('now'),
  datetime('now')
);
