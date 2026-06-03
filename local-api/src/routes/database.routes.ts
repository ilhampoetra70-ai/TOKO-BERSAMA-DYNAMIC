import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config/index.js';
import { ForbiddenError, ValidationError } from '../core/errors.js';
import type { AuthenticatedRequest } from '../http/authHook.js';
import type { DbClient } from '../db/client.js';
import type { UserRepository } from '../repositories/userRepository.js';
import {
  createBackup as createDatabaseBackup,
  createHardResetBackup as createDatabaseHardResetBackup,
  deleteBackupFile as deleteDatabaseBackupFile,
  listBackups as listDatabaseBackups,
  restoreDatabase as restoreDatabaseFromBackupFile,
} from '../services/databaseBackupService.js';
import {
  hardResetDatabase as applyDatabaseHardReset,
  runCheckpoint as runDatabaseCheckpoint,
  runIntegrityCheck as runDatabaseIntegrityCheck,
  runVacuum as runDatabaseVacuum,
} from '../services/databaseMaintenanceService.js';

const backupRequestSchema = z.object({
  mode: z.enum(['latest', 'archive']).default('latest'),
});

const restoreRequestSchema = z.object({
  confirmation: z.literal('RESTORE', {
    message: 'Ketik RESTORE untuk menjalankan restore.',
  }),
  reason: z.string().trim().max(240).optional().default('Restore database dari halaman Database.'),
});

const deleteBackupRequestSchema = z.object({
  confirmation: z.literal('DELETE', {
    message: 'Ketik DELETE untuk menghapus backup.',
  }),
});

const hardResetRequestSchema = z.object({
  confirmation: z.literal('RESET', {
    message: 'Ketik RESET untuk menjalankan hard reset.',
  }),
  reason: z.string().trim().max(240).optional().default('Hard reset database dari halaman Database.'),
});

type DatabaseBackupRow = {
  file: string;
  time: string;
  size: string;
  status: 'Valid';
  note: string;
  latest: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFileTime(value: Date): string {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function backupStamp(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');
  const second = String(value.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hour}${minute}${second}`;
}

async function ensureBackupDir() {
  await fs.mkdir(config.backupDir, { recursive: true });
}

function latestBackupPath() {
  return path.join(config.backupDir, 'TOKO-BERSAMA-auto-latest.db');
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function assertBackupFileName(fileName: string): string {
  const normalized = path.basename(fileName);
  if (normalized !== fileName || !/^[A-Za-z0-9._-]+\.db$/i.test(normalized)) {
    throw new ValidationError('Nama file backup tidak valid.');
  }

  return normalized;
}

function toBackupRow(filePath: string, stat: Awaited<ReturnType<typeof fs.stat>>, latest: boolean): DatabaseBackupRow {
  return {
    file: path.basename(filePath),
    time: formatFileTime(stat.mtime),
    size: formatBytes(Number(stat.size)),
    status: 'Valid',
    note: latest ? 'Snapshot latest otomatis' : 'Backup arsip manual',
    latest,
  };
}

async function listBackups(): Promise<DatabaseBackupRow[]> {
  await ensureBackupDir();
  const entries = await fs.readdir(config.backupDir, { withFileTypes: true });
  const backupFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.db'))
    .map((entry) => path.join(config.backupDir, entry.name));

  const rows = await Promise.all(
    backupFiles.map(async (filePath) => {
      const stat = await fs.stat(filePath);
      return {
        row: toBackupRow(filePath, stat, path.basename(filePath) === 'TOKO-BERSAMA-auto-latest.db'),
        mtimeMs: stat.mtimeMs,
      };
    })
  );

  return rows
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .map((entry) => entry.row);
}

async function createBackup(db: DbClient, mode: 'latest' | 'archive'): Promise<DatabaseBackupRow> {
  await ensureBackupDir();

  if (mode === 'latest') {
    const targetPath = latestBackupPath();
    await db.backup(targetPath);
    const stat = await fs.stat(targetPath);
    return toBackupRow(targetPath, stat, true);
  }

  const targetPath = path.join(config.backupDir, `TOKO-BERSAMA-backup-${backupStamp()}.db`);
  const latestPath = latestBackupPath();
  await db.backup(targetPath);
  await fs.copyFile(targetPath, latestPath);
  const stat = await fs.stat(targetPath);
  return toBackupRow(targetPath, stat, false);
}

async function createHardResetBackup(db: DbClient): Promise<DatabaseBackupRow> {
  await ensureBackupDir();

  const targetPath = path.join(config.backupDir, `TOKO-BERSAMA-hard-reset-${backupStamp()}.db`);
  await db.backup(targetPath);
  await fs.copyFile(targetPath, latestBackupPath());
  const stat = await fs.stat(targetPath);
  return {
    ...toBackupRow(targetPath, stat, false),
    note: 'Auto-backup sebelum hard reset',
  };
}

async function createRestoreBackup(db: DbClient): Promise<DatabaseBackupRow> {
  await ensureBackupDir();

  const targetPath = path.join(config.backupDir, `TOKO-BERSAMA-restore-pre-${backupStamp()}.db`);
  await db.backup(targetPath);
  await fs.copyFile(targetPath, latestBackupPath());
  const stat = await fs.stat(targetPath);
  return {
    ...toBackupRow(targetPath, stat, false),
    note: 'Auto-backup sebelum restore',
  };
}

function copyBackupIntoLiveDatabase(db: DbClient, backupPath: string, actorUserId: string, reason: string) {
  const escapedBackupPath = backupPath.replaceAll('\\', '\\\\').replaceAll("'", "''");
  db.pragma('foreign_keys = OFF');
  db.exec(`ATTACH DATABASE '${escapedBackupPath}' AS restore_db`);

  try {
    const tableRows = db.prepare(`
      SELECT name
      FROM restore_db.sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as Array<{ name: string }>;

    const restore = db.transaction(() => {
      for (const { name } of tableRows) {
        if (!/^[A-Za-z0-9_]+$/.test(name)) {
          throw new ValidationError(`Nama tabel backup tidak valid: ${name}`);
        }

        const quotedName = quoteIdentifier(name);
        const columnRows = db.prepare(`PRAGMA restore_db.table_info(${quotedName})`).all() as Array<{ name: string }>;
        if (!columnRows.length) {
          continue;
        }

        const columns = columnRows.map((column) => quoteIdentifier(column.name)).join(', ');
        db.prepare(`DELETE FROM main.${quotedName}`).run();
        db.prepare(`INSERT INTO main.${quotedName} (${columns}) SELECT ${columns} FROM restore_db.${quotedName}`).run();
      }

      db.prepare('DELETE FROM auth_sessions').run();
      db.prepare(`
        INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, reason, metadata_json, created_at)
        VALUES (?, ?, 'database.restore', 'database', 'local-sqlite', ?, ?, datetime('now'))
      `).run(`audit-${crypto.randomUUID()}`, actorUserId, reason, JSON.stringify({
        result: 'restore',
        backupFile: path.basename(backupPath),
      }));
    });

    restore();
    db.pragma('wal_checkpoint(TRUNCATE)');
  } finally {
    db.pragma('foreign_keys = ON');
    db.exec('DETACH DATABASE restore_db');
  }
}

function getSchemaVersion(db: DbClient): string {
  const row = db.prepare(`
    SELECT version
    FROM schema_migrations
    ORDER BY version DESC
    LIMIT 1
  `).get() as { version?: string } | undefined;

  return row?.version ?? '000';
}

async function restoreDatabase(db: DbClient, backupFileName: string, actorUserId: string, reason: string): Promise<DatabaseBackupRow> {
  const normalizedFile = assertBackupFileName(backupFileName);
  const backupPath = path.join(config.backupDir, normalizedFile);
  await fs.access(backupPath);

  const preRestoreBackup = await createRestoreBackup(db);
  copyBackupIntoLiveDatabase(db, backupPath, actorUserId, reason);
  await createBackup(db, 'latest');

  return preRestoreBackup;
}

async function deleteBackupFile(fileName: string): Promise<void> {
  const normalizedFile = assertBackupFileName(fileName);
  const backupPath = path.join(config.backupDir, normalizedFile);
  await fs.unlink(backupPath);
}

function runIntegrityCheck(db: DbClient) {
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

function runVacuum(db: DbClient) {
  db.exec('VACUUM');
}

function runCheckpoint(db: DbClient) {
  db.pragma('wal_checkpoint(TRUNCATE)');
}

function hardResetDatabase(db: DbClient, actorUserId: string, reason: string) {
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

export async function registerDatabaseRoutes(app: FastifyInstance, db: DbClient, userRepository?: UserRepository) {
  app.get('/database/health', async () => {
    return runDatabaseIntegrityCheck(db);
  });

  app.get('/database/backups', async () => {
    const items = await listDatabaseBackups();
    return { items };
  });

  app.post('/database/backups', async (request) => {
    const body = backupRequestSchema.parse(request.body ?? {});
    const item = await createDatabaseBackup(db, body.mode);
    const items = await listDatabaseBackups();
    return { item, items };
  });

  app.post('/database/backups/:file/restore', async (request) => {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new ValidationError('Sesi admin tidak valid.');
    }
    if (auth.role !== 'admin') {
      throw new ForbiddenError('Restore hanya boleh dijalankan oleh Admin.');
    }

    const params = request.params as { file?: string };
    const body = restoreRequestSchema.parse(request.body ?? {});
    const item = await restoreDatabaseFromBackupFile(db, decodeURIComponent(params.file ?? ''), auth.userId, body.reason);
    userRepository?.clearAuthCaches();
    const items = await listDatabaseBackups();
    return {
      item,
      items,
      message: 'Restore berhasil. Snapshot sebelum restore sudah dibackup dan sesi dicabut.',
    };
  });

  app.delete('/database/backups/:file', async (request) => {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new ValidationError('Sesi admin tidak valid.');
    }
    if (auth.role !== 'admin') {
      throw new ForbiddenError('Hapus backup hanya boleh dijalankan oleh Admin.');
    }

    const params = request.params as { file?: string };
    deleteBackupRequestSchema.parse(request.body ?? {});
    await deleteDatabaseBackupFile(decodeURIComponent(params.file ?? ''));
    const items = await listDatabaseBackups();
    return { items };
  });

  app.post('/database/maintenance/integrity-check', async (request) => {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new ValidationError('Sesi admin tidak valid.');
    }
    if (auth.role !== 'admin') {
      throw new ForbiddenError('Maintenance hanya boleh dijalankan oleh Admin.');
    }
    return runDatabaseIntegrityCheck(db);
  });

  app.post('/database/maintenance/vacuum', async (request) => {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new ValidationError('Sesi admin tidak valid.');
    }
    if (auth.role !== 'admin') {
      throw new ForbiddenError('Maintenance hanya boleh dijalankan oleh Admin.');
    }
    runDatabaseVacuum(db);
    return { message: 'VACUUM selesai dijalankan.' };
  });

  app.post('/database/maintenance/checkpoint', async (request) => {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new ValidationError('Sesi admin tidak valid.');
    }
    if (auth.role !== 'admin') {
      throw new ForbiddenError('Maintenance hanya boleh dijalankan oleh Admin.');
    }
    runDatabaseCheckpoint(db);
    return { message: 'WAL checkpoint selesai dijalankan.' };
  });

  app.post('/database/hard-reset', async (request) => {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) {
      throw new ValidationError('Sesi admin tidak valid.');
    }
    if (auth.role !== 'admin') {
      throw new ForbiddenError('Hard reset hanya boleh dijalankan oleh Admin.');
    }

    const body = hardResetRequestSchema.parse(request.body ?? {});
    const backup = await createDatabaseHardResetBackup(db);
    applyDatabaseHardReset(db, auth.userId, body.reason);
    userRepository?.clearAuthCaches();

    return {
      backup,
      message: 'Hard reset berhasil. Data operasional sudah dikosongkan dan sesi aktif dicabut.',
    };
  });
}
