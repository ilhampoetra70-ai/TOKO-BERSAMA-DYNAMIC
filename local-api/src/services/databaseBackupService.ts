import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';
import { ValidationError } from '../core/errors.js';
import type { DbClient } from '../db/client.js';

export type DatabaseBackupRow = {
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

export async function restoreDatabaseFromPath(db: DbClient, backupPath: string, actorUserId: string, reason: string): Promise<DatabaseBackupRow> {
  await fs.access(backupPath);
  const preRestoreBackup = await createRestoreBackup(db);
  copyBackupIntoLiveDatabase(db, backupPath, actorUserId, reason);
  await createBackup(db, 'latest');
  return preRestoreBackup;
}

export async function restoreDatabase(db: DbClient, backupFileName: string, actorUserId: string, reason: string): Promise<DatabaseBackupRow> {
  const normalizedFile = assertBackupFileName(backupFileName);
  const backupPath = path.join(config.backupDir, normalizedFile);
  return restoreDatabaseFromPath(db, backupPath, actorUserId, reason);
}

export async function deleteBackupFile(fileName: string): Promise<void> {
  const normalizedFile = assertBackupFileName(fileName);
  const backupPath = path.join(config.backupDir, normalizedFile);
  await fs.unlink(backupPath);
}

export {
  createBackup,
  createHardResetBackup,
  listBackups,
};
