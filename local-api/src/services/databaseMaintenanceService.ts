import crypto from 'node:crypto';
import { config } from '../config/index.js';
import type { DbClient } from '../db/client.js';

export function getSchemaVersion(db: DbClient): string {
  const row = db.prepare(`
    SELECT version
    FROM schema_migrations
    ORDER BY version DESC
    LIMIT 1
  `).get() as { version?: string } | undefined;

  return row?.version ?? '000';
}

export function runIntegrityCheck(db: DbClient) {
  const result = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };

  return {
    ok: result.integrity_check === 'ok',
    database: result.integrity_check,
    time: new Date().toISOString(),
    schemaVersion: getSchemaVersion(db),
    journalMode: 'WAL',
    dbPath: config.dbPath,
    backupDir: config.backupDir,
  };
}

export function runVacuum(db: DbClient) {
  db.exec('VACUUM');
}

export function runCheckpoint(db: DbClient) {
  db.pragma('wal_checkpoint(TRUNCATE)');
}

export function hardResetDatabase(db: DbClient, actorUserId: string, reason: string) {
  const reset = db.transaction(() => {
    db.prepare('DELETE FROM auth_sessions').run();
    db.prepare('DELETE FROM cashier_sessions').run();
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM supplier_debt_items').run();
    db.prepare('DELETE FROM supplier_debts').run();
    db.prepare('DELETE FROM sale_items').run();
    db.prepare('DELETE FROM sales').run();
    db.prepare('DELETE FROM stock_movements').run();
    db.prepare('DELETE FROM products').run();
    db.prepare("DELETE FROM settings WHERE key <> 'offline_master_key_hash'").run();
    db.prepare('DELETE FROM permissions').run();
    db.prepare('DELETE FROM audit_logs').run();
    db.prepare('DELETE FROM users WHERE id <> ?').run(actorUserId);
    db.prepare(`
      UPDATE users
      SET role = 'admin',
          active = 1,
          force_password_change = 0,
          device_label = '-',
          last_login = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(actorUserId);
    db.prepare(`
      INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, reason, metadata_json, created_at)
      VALUES (?, ?, 'database.hard_reset', 'database', 'local-sqlite', ?, ?, datetime('now'))
    `).run(`audit-${crypto.randomUUID()}`, actorUserId, reason, JSON.stringify({
      result: 'factory_clean',
      preservedAdminUserId: actorUserId,
    }));
  });

  reset();
  db.pragma('wal_checkpoint(TRUNCATE)');
}
