import path from 'node:path';

const rootDir = process.cwd();
const host = process.env.TOKOBERSAMA_API_HOST || '0.0.0.0';
const port = Number(process.env.TOKOBERSAMA_API_PORT || 8731);

function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  host,
  port,
  dbPath: process.env.TOKOBERSAMA_DB_PATH || path.join(rootDir, 'data', 'tokobersama.sqlite'),
  backupDir: process.env.TOKOBERSAMA_BACKUP_DIR || path.join(rootDir, 'data', 'backups'),
  migrationDir: path.join(rootDir, 'src', 'db', 'migrations'),
  corsAllowedOrigins: [
    'null',
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    ...parseCsv(process.env.TOKOBERSAMA_CORS_ORIGINS),
  ],
};
