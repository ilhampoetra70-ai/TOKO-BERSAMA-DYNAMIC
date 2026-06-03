import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';
import { createDbClient } from './client.js';

export function runMigrations() {
  const db = createDbClient();
  const migrationFiles = fs
    .readdirSync(config.migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((row) => (row as { version: string }).version)
  );
  const applyMigration = db.transaction((version: string, sql: string) => {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString());
  });

  for (const file of migrationFiles) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(config.migrationDir, file), 'utf8');
    applyMigration(file, sql);
  }

  db.close();
}

function main() {
  runMigrations();
}

main();
