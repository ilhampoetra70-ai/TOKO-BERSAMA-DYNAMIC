import crypto from 'node:crypto';
import type { DbClient } from '../db/client.js';

const masterKeyHash = 'a7bcdaab0ba3775ae6ebb9f82fd2e7b0f787e13052c4fa68bd80c3d0b13737e4';
const masterKeyHashSetting = 'offline_master_key_hash';

function hashMasterKey(input: string) {
  return crypto.createHash('sha256').update(input.trim(), 'utf8').digest('hex');
}

function getStoredMasterKeyHash(db: DbClient) {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ? LIMIT 1').get(masterKeyHashSetting) as { value_json?: string } | undefined;
  if (!row?.value_json) return masterKeyHash;

  try {
    const parsed = JSON.parse(row.value_json) as { hash?: string };
    return parsed.hash || masterKeyHash;
  } catch {
    return masterKeyHash;
  }
}

export function verifyOfflineMasterKey(db: DbClient, input: string) {
  const digest = hashMasterKey(input);
  const storedHash = getStoredMasterKeyHash(db);
  return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(storedHash, 'hex'));
}

export function generateOfflineMasterKey() {
  const left = crypto.randomBytes(3).toString('hex').toUpperCase();
  const right = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TB-OFFLINE-${left}-${right}`;
}

export function rotateOfflineMasterKey(db: DbClient) {
  const nextMasterKey = generateOfflineMasterKey();
  const valueJson = JSON.stringify({
    hash: hashMasterKey(nextMasterKey),
    rotatedAt: new Date().toISOString(),
  });

  db.prepare(`
    INSERT INTO settings (key, value_json, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).run(masterKeyHashSetting, valueJson);

  return nextMasterKey;
}
