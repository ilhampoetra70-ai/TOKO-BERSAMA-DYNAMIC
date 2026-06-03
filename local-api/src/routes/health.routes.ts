import type { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';
import type { DbClient } from '../db/client.js';

export async function registerHealthRoutes(app: FastifyInstance, db: DbClient) {
  app.get('/health', async () => {
    db.prepare('SELECT 1').get();
    const schemaVersionRow = db.prepare(`
      SELECT version
      FROM schema_migrations
      ORDER BY version DESC
      LIMIT 1
    `).get() as { version?: string } | undefined;

    return {
      ok: true,
      database: 'ready',
      time: new Date().toISOString(),
      schemaVersion: schemaVersionRow?.version ?? '000',
      journalMode: 'WAL',
      dbPath: config.dbPath,
      backupDir: config.backupDir,
    };
  });

  app.get('/health/integrity', async () => {
    const integrity = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    const schemaVersionRow = db.prepare(`
      SELECT version
      FROM schema_migrations
      ORDER BY version DESC
      LIMIT 1
    `).get() as { version?: string } | undefined;

    return {
      ok: integrity.integrity_check === 'ok',
      database: integrity.integrity_check,
      check: 'integrity_check',
      heavy: true,
      time: new Date().toISOString(),
      schemaVersion: schemaVersionRow?.version ?? '000',
      journalMode: 'WAL',
      dbPath: config.dbPath,
      backupDir: config.backupDir,
    };
  });
}
