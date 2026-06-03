import crypto from 'node:crypto';
import type { DbClient } from '../db/client.js';
import { UnauthorizedError, ValidationError } from '../core/errors.js';
import { assertPasswordPolicy, generateTemporaryPassword, hashPassword, verifyPassword } from '../security/password.js';

export type DbUserRole = 'admin' | 'supervisor' | 'cashier';
export type UiUserRole = 'Admin' | 'Supervisor' | 'Kasir';

export type UserRow = {
  id: string;
  name: string;
  username: string;
  role: UiUserRole;
  status: 'Aktif' | 'Nonaktif';
  security: 'TOTP aktif' | 'Password' | 'Reset diperlukan';
  lastLogin: string;
  device: string;
  scope: string;
};

export type UserThemeAccent = 'amber' | 'emerald' | 'sky' | 'rose';

export type UserAppearancePreference = {
  mode: 'auto' | 'light' | 'dark';
  accent: UserThemeAccent;
  theme: 'obsidian-gold' | 'midnight-emerald' | 'midnight-sapphire' | 'midnight-ruby' | 'midnight-amethyst' | 'midnight-teal' | 'midnight-copper' | 'midnight-cyan' | 'midnight-rose' | 'midnight-lime' | 'midnight-indigo' | 'midnight-bronze' | 'midnight-onyx' | 'midnight-mint' | 'midnight-plum';
};

type UserRecord = {
  id: string;
  username: string;
  display_name: string;
  role: DbUserRole;
  password_hash: string;
  totp_enabled: number;
  totp_secret: string | null;
  active: number;
  force_password_change: number;
  last_login: string | null;
  device_label: string | null;
};

export type AuthLoginResult = {
  token: string;
  user: UserRow;
  rolePermissions: RolePermissionMap;
  forcePasswordChange: boolean;
  totpRequired: boolean;
};

export type PasswordResetResult = {
  item: UserRow;
  temporaryPassword: string;
};

export type AuditLogRow = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string;
  time: string;
};

export type AuthSessionRecord = {
  id: string;
  userId: string;
  username: string;
  role: DbUserRole;
};

type UserPreferenceRecord = {
  appearance_mode: UserAppearancePreference['mode'];
  accent: UserAppearancePreference['accent'];
  theme: UserAppearancePreference['theme'];
};

export const permissionResources = [
  'Dashboard',
  'Kasir',
  'Transaksi',
  'Barang',
  'Stok rendah',
  'Riwayat stok',
  'Hutang',
  'Piutang',
  'Laporan',
  'Database',
  'Setting',
  'Pengguna',
] as const;

export type PermissionResource = (typeof permissionResources)[number];
export type RolePermissionMap = Record<UiUserRole, PermissionResource[]>;

const roleToUi: Record<DbUserRole, UiUserRole> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  cashier: 'Kasir',
};

const roleToDb: Record<UiUserRole, DbUserRole> = {
  Admin: 'admin',
  Supervisor: 'supervisor',
  Kasir: 'cashier',
};

const defaultRolePermissions: RolePermissionMap = {
  Admin: [...permissionResources],
  Supervisor: ['Dashboard', 'Barang', 'Stok rendah', 'Riwayat stok', 'Hutang', 'Piutang', 'Laporan'],
  Kasir: ['Dashboard', 'Kasir', 'Transaksi'],
};

const SESSION_CACHE_TTL_MS = 60_000;

function formatLogin(value: string | null) {
  if (!value) return 'Belum login';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getScope(role: UiUserRole) {
  if (role === 'Admin') return 'Akses penuh';
  if (role === 'Supervisor') return 'Barang, stok, laporan';
  return 'Kasir dan transaksi';
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function defaultPortablePassword(username: string) {
  if (username === 'admin') return 'admin123';
  if (username.startsWith('kasir')) return 'kasir123';
  if (username.startsWith('spv')) return 'supervisor123';
  return 'password123';
}

function isLegacyPasswordValid(username: string, storedHash: string, password: string) {
  return storedHash === 'portable-local-placeholder' && password === defaultPortablePassword(username);
}

export class UserRepository {
  private readonly sessionCache = new Map<string, { expiresAt: number; session: AuthSessionRecord }>();
  private rolePermissionsCache: RolePermissionMap | null = null;

  constructor(private readonly db: DbClient) {
    this.ensureAppearancePreferenceSchema();
    this.ensureLegacyPlaceholderPasswordSafety();
  }

  clearAuthCaches() {
    this.sessionCache.clear();
    this.rolePermissionsCache = null;
  }

  private ensureAppearancePreferenceSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        appearance_mode TEXT NOT NULL DEFAULT 'auto' CHECK (appearance_mode IN ('auto', 'light', 'dark')),
        accent TEXT NOT NULL DEFAULT 'amber' CHECK (accent IN ('amber', 'emerald', 'sky', 'rose')),
        theme TEXT NOT NULL DEFAULT 'obsidian-gold' CHECK (theme IN ('obsidian-gold', 'midnight-emerald', 'midnight-sapphire', 'midnight-ruby', 'midnight-amethyst', 'midnight-teal', 'midnight-copper', 'midnight-cyan', 'midnight-rose', 'midnight-lime', 'midnight-indigo', 'midnight-bronze', 'midnight-onyx', 'midnight-mint', 'midnight-plum')),
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at
        ON user_preferences(updated_at);
    `);

    const columns = this.db.prepare(`PRAGMA table_info(user_preferences)`).all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'theme')) {
      this.db.exec(`
        ALTER TABLE user_preferences
        ADD COLUMN theme TEXT NOT NULL DEFAULT 'obsidian-gold' CHECK (theme IN ('obsidian-gold', 'midnight-emerald', 'midnight-sapphire', 'midnight-ruby', 'midnight-amethyst', 'midnight-teal', 'midnight-copper', 'midnight-cyan', 'midnight-rose', 'midnight-lime', 'midnight-indigo', 'midnight-bronze', 'midnight-onyx', 'midnight-mint', 'midnight-plum'));
      `);
    }
  }

  private ensureLegacyPlaceholderPasswordSafety() {
    this.db.prepare(`
      UPDATE users
      SET force_password_change = 1,
          updated_at = datetime('now')
      WHERE password_hash = 'portable-local-placeholder'
        AND force_password_change = 0
        AND deleted_at IS NULL
    `).run();
  }

  listUsers(): UserRow[] {
    const rows = this.db.prepare(`
      SELECT id, username, display_name, role, password_hash, totp_enabled, totp_secret, active,
             force_password_change, last_login, device_label
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY role ASC, username ASC
    `).all() as UserRecord[];

    return rows.map((row) => {
      const role = roleToUi[row.role];
      const security = row.force_password_change
        ? 'Reset diperlukan'
        : row.totp_enabled
          ? 'TOTP aktif'
          : 'Password';

      return {
        id: row.id,
        name: row.display_name,
        username: row.username,
        role,
        status: row.active ? 'Aktif' : 'Nonaktif',
        security,
        lastLogin: formatLogin(row.last_login),
        device: row.device_label || '-',
        scope: getScope(role),
      };
    });
  }

  getUser(id: string): UserRecord | null {
    return (this.db.prepare(`
      SELECT id, username, display_name, role, password_hash, totp_enabled, totp_secret, active,
             force_password_change, last_login, device_label
      FROM users
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
    `).get(id) as UserRecord | undefined) ?? null;
  }

  getUserByUsername(username: string): UserRecord | null {
    return (this.db.prepare(`
      SELECT id, username, display_name, role, password_hash, totp_enabled, totp_secret, active,
             force_password_change, last_login, device_label
      FROM users
      WHERE lower(username) = lower(?) AND deleted_at IS NULL
      LIMIT 1
    `).get(username) as UserRecord | undefined) ?? null;
  }

  listAuditLogs(limit = 80): AuditLogRow[] {
    const rows = this.db.prepare(`
      SELECT audit_logs.id,
             COALESCE(users.display_name, audit_logs.actor_user_id) AS actor,
             audit_logs.action,
             audit_logs.entity_type,
             audit_logs.entity_id,
             audit_logs.reason,
             audit_logs.created_at
      FROM audit_logs
      LEFT JOIN users ON users.id = audit_logs.actor_user_id
      ORDER BY audit_logs.created_at DESC
      LIMIT ?
    `).all(limit) as Array<{
      id: string;
      actor: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      reason: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      actor: row.actor,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id ?? '-',
      reason: row.reason ?? '-',
      time: formatLogin(row.created_at),
    }));
  }

  getFirstActiveAdminWithTotp(): UserRecord | null {
    return (this.db.prepare(`
      SELECT id, username, display_name, role, password_hash, totp_enabled, totp_secret, active,
             force_password_change, last_login, device_label
      FROM users
      WHERE role = 'admin' AND active = 1 AND deleted_at IS NULL AND totp_enabled = 1 AND totp_secret IS NOT NULL
      ORDER BY username ASC
      LIMIT 1
    `).get() as UserRecord | undefined) ?? null;
  }

  createSessionForUser(user: UserRecord, auditAction = 'auth.login'): AuthLoginResult {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    this.db.prepare(`
      INSERT INTO auth_sessions (id, token_hash, user_id, created_at, expires_at, revoked_at)
      VALUES (?, ?, ?, ?, ?, NULL)
    `).run(createId('session'), hashToken(token), user.id, now.toISOString(), expiresAt);

    this.db.prepare(`
      UPDATE users
      SET last_login = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);
    this.writeAudit(user.id, auditAction, 'user', user.id, `${auditAction} @${user.username}`);

    const row = this.listUsers().find((item) => item.id === user.id);
    if (!row) throw new Error('User tidak ditemukan.');

    return {
      token,
      user: row,
      rolePermissions: this.getRolePermissions(),
      forcePasswordChange: Boolean(user.force_password_change),
      totpRequired: false,
    };
  }

  authenticate(username: string, password: string): AuthLoginResult {
    const user = this.getUserByUsername(username);
    if (!user || !user.active) {
      throw new ValidationError('Username atau password tidak valid.');
    }

    const legacyPasswordOk = isLegacyPasswordValid(user.username, user.password_hash, password);
    const passwordOk = legacyPasswordOk || verifyPassword(password, user.password_hash);

    if (!passwordOk) {
      throw new ValidationError('Username atau password tidak valid.');
    }

    if (legacyPasswordOk) {
      this.db.prepare(`
        UPDATE users
        SET force_password_change = 1,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(user.id);
      return this.createSessionForUser({ ...user, force_password_change: 1 }, 'auth.legacy_password_login');
    }

    return this.createSessionForUser(user);
  }

  validateSession(token: string): AuthSessionRecord {
    const tokenHash = hashToken(token);
    const now = Date.now();
    const cached = this.sessionCache.get(tokenHash);
    if (cached && cached.expiresAt > now) {
      return cached.session;
    }
    if (cached) {
      this.sessionCache.delete(tokenHash);
    }

    const row = this.db.prepare(`
      SELECT sessions.id, users.id as user_id, users.username, users.role
      FROM auth_sessions sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
        AND sessions.revoked_at IS NULL
        AND sessions.expires_at > ?
        AND users.active = 1
        AND users.deleted_at IS NULL
      LIMIT 1
    `).get(tokenHash, new Date().toISOString()) as { id: string; user_id: string; username: string; role: DbUserRole } | undefined;

    if (!row) {
      throw new UnauthorizedError();
    }

    const session = {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      role: row.role,
    };
    this.sessionCache.set(tokenHash, { expiresAt: now + SESSION_CACHE_TTL_MS, session });

    return session;
  }

  revokeSession(token: string): void {
    const tokenHash = hashToken(token);
    this.db.prepare(`
      UPDATE auth_sessions
      SET revoked_at = datetime('now')
      WHERE token_hash = ? AND revoked_at IS NULL
    `).run(tokenHash);
    this.sessionCache.delete(tokenHash);
  }

  getAppearancePreference(userId: string): UserAppearancePreference {
    const row = this.db.prepare(`
      SELECT appearance_mode, accent, theme
      FROM user_preferences
      WHERE user_id = ?
      LIMIT 1
    `).get(userId) as UserPreferenceRecord | undefined;

    return {
      mode: row?.appearance_mode ?? 'auto',
      accent: row?.accent ?? 'amber',
      theme: row?.theme ?? 'obsidian-gold',
    };
  }

  updateAppearancePreference(
    userId: string,
    input: UserAppearancePreference,
    actorUserId: string
  ): UserAppearancePreference {
    const user = this.getUser(userId);
    if (!user) {
      throw new ValidationError('User tidak ditemukan.');
    }

    this.db.prepare(`
      INSERT INTO user_preferences (user_id, appearance_mode, accent, theme, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        appearance_mode = excluded.appearance_mode,
        accent = excluded.accent,
        theme = excluded.theme,
        updated_at = datetime('now')
    `).run(userId, input.mode, input.accent, input.theme);
    this.writeAudit(actorUserId, 'user.preferences_update', 'user', userId, `Update tampilan @${user.username}`);

    return this.getAppearancePreference(userId);
  }

  changePassword(userId: string, nextPassword: string, currentPassword?: string): UserRow {
    const user = this.getUser(userId);
    if (!user) throw new ValidationError('User tidak ditemukan.');

    try {
      assertPasswordPolicy(nextPassword);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : 'Password tidak valid.');
    }

    if (!user.force_password_change) {
      const currentOk = Boolean(currentPassword)
        && (isLegacyPasswordValid(user.username, user.password_hash, currentPassword ?? '') || verifyPassword(currentPassword ?? '', user.password_hash));
      if (!currentOk) {
        throw new ValidationError('Password lama tidak valid.');
      }
    }

    this.db.prepare(`
      UPDATE users
      SET password_hash = ?, force_password_change = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(hashPassword(nextPassword), userId);
    this.clearAuthCaches();
    this.writeAudit(userId, 'user.password_change', 'user', userId, `Ganti password @${user.username}`);

    const updated = this.listUsers().find((row) => row.id === userId);
    if (!updated) throw new ValidationError('User tidak ditemukan.');
    return updated;
  }

  getRolePermissions(): RolePermissionMap {
    if (this.rolePermissionsCache) {
      return {
        Admin: [...this.rolePermissionsCache.Admin],
        Supervisor: [...this.rolePermissionsCache.Supervisor],
        Kasir: [...this.rolePermissionsCache.Kasir],
      };
    }

    const rows = this.db.prepare(`
      SELECT role, resource, allowed
      FROM permissions
      WHERE action = 'view'
    `).all() as Array<{ role: DbUserRole; resource: string; allowed: number }>;

    const next: RolePermissionMap = {
      Admin: [...defaultRolePermissions.Admin],
      Supervisor: [...defaultRolePermissions.Supervisor],
      Kasir: [...defaultRolePermissions.Kasir],
    };

    for (const role of ['supervisor', 'cashier'] as DbUserRole[]) {
      const uiRole = roleToUi[role];
      const configured = rows.filter((row) => row.role === role);
      if (!configured.length) continue;

      next[uiRole] = configured
        .filter((row) => row.allowed && permissionResources.includes(row.resource as PermissionResource))
        .map((row) => row.resource as PermissionResource);
    }

    this.rolePermissionsCache = next;

    return {
      Admin: [...next.Admin],
      Supervisor: [...next.Supervisor],
      Kasir: [...next.Kasir],
    };
  }

  canRoleAccessResource(role: DbUserRole, resource: PermissionResource): boolean {
    if (role === 'admin') return true;

    const uiRole = roleToUi[role];
    return this.getRolePermissions()[uiRole].includes(resource);
  }

  saveRolePermissions(input: RolePermissionMap): RolePermissionMap {
    const save = this.db.transaction((rolePermissions: RolePermissionMap) => {
      const statement = this.db.prepare(`
        INSERT INTO permissions (id, role, resource, action, allowed)
        VALUES (?, ?, ?, 'view', ?)
        ON CONFLICT(role, resource, action) DO UPDATE SET allowed = excluded.allowed
      `);

      for (const uiRole of ['Supervisor', 'Kasir'] as UiUserRole[]) {
        const dbRole = roleToDb[uiRole];
        const allowedResources = new Set(rolePermissions[uiRole] ?? []);
        for (const resource of permissionResources) {
          statement.run(createId('perm'), dbRole, resource, allowedResources.has(resource) ? 1 : 0);
        }
      }
    });

    save(input);
    this.rolePermissionsCache = null;
    return this.getRolePermissions();
  }

  createUser(input: { username: string; displayName: string; role: UiUserRole; active: boolean }, actorUserId: string): PasswordResetResult {
    const username = input.username.trim().toLowerCase();
    const displayName = input.displayName.trim().toUpperCase();
    if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw new ValidationError('Username minimal 3 karakter dan hanya boleh huruf, angka, titik, underscore, strip.');
    }
    if (!displayName) {
      throw new ValidationError('Nama user wajib diisi.');
    }
    if (this.getUserByUsername(username)) {
      throw new ValidationError(`Username @${username} sudah dipakai.`);
    }

    const temporaryPassword = generateTemporaryPassword();
    const id = createId('user');
    this.db.prepare(`
      INSERT INTO users (
        id, username, display_name, role, password_hash, totp_enabled, active,
        force_password_change, last_login, device_label, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, 1, NULL, '-', datetime('now'), datetime('now'))
    `).run(id, username, displayName, roleToDb[input.role], hashPassword(temporaryPassword), input.active ? 1 : 0);
    this.clearAuthCaches();
    this.writeAudit(actorUserId, 'user.create', 'user', id, `Buat user @${username}`);

    const row = this.listUsers().find((item) => item.id === id);
    if (!row) throw new ValidationError('User gagal dibuat.');
    return { item: row, temporaryPassword };
  }

  updateUser(id: string, input: { displayName: string; role: UiUserRole; active: boolean }, actorUserId: string): UserRow {
    const existing = this.getUser(id);
    if (!existing) throw new ValidationError('User tidak ditemukan.');

    const displayName = input.displayName.trim().toUpperCase();
    if (!displayName) {
      throw new ValidationError('Nama user wajib diisi.');
    }

    this.db.prepare(`
      UPDATE users
      SET display_name = ?,
          role = ?,
          active = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(displayName, roleToDb[input.role], input.active ? 1 : 0, id);
    this.clearAuthCaches();
    this.writeAudit(actorUserId, 'user.update', 'user', id, `Update user @${existing.username}`);

    const row = this.listUsers().find((item) => item.id === id);
    if (!row) throw new ValidationError('User tidak ditemukan.');
    return row;
  }

  deleteUser(id: string, actorUserId: string): void {
    const existing = this.getUser(id);
    if (!existing) throw new ValidationError('User tidak ditemukan.');
    if (existing.id === actorUserId) {
      throw new ValidationError('User yang sedang aktif tidak bisa dihapus.');
    }

    const activeAdminCount = this.db.prepare(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE role = 'admin' AND id <> ? AND active = 1 AND deleted_at IS NULL
    `).get(id) as { count: number } | undefined;

    if (existing.role === 'admin' && (activeAdminCount?.count ?? 0) < 1) {
      throw new ValidationError('Minimal harus ada satu admin aktif.');
    }

    const remove = this.db.transaction((targetId: string) => {
      this.db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(targetId);
      this.db.prepare(`
        UPDATE users
        SET active = 0,
            totp_enabled = 0,
            totp_secret = NULL,
            deleted_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(targetId);
    });

    remove(id);
    this.clearAuthCaches();
    this.writeAudit(actorUserId, 'user.delete', 'user', id, `Hapus user @${existing.username}`);
  }

  markPasswordReset(id: string, actorUserId: string): PasswordResetResult {
    const user = this.getUser(id);
    if (!user) throw new Error('User tidak ditemukan.');
    const temporaryPassword = generateTemporaryPassword();

    this.db.prepare(`
      UPDATE users
      SET password_hash = ?, force_password_change = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(hashPassword(temporaryPassword), id);
    this.clearAuthCaches();
    this.writeAudit(actorUserId, 'user.password_reset', 'user', id, `Reset password @${user.username}`);

    const updated = this.listUsers().find((row) => row.id === id);
    if (!updated) throw new Error('User tidak ditemukan.');
    return { item: updated, temporaryPassword };
  }

  saveTotpSecret(id: string, secret: string, actorUserId: string): void {
    const user = this.getUser(id);
    if (!user) throw new Error('User tidak ditemukan.');

    this.db.prepare(`
      UPDATE users
      SET totp_secret = ?, totp_enabled = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(secret, id);
    this.clearAuthCaches();
    this.writeAudit(actorUserId, 'user.totp_setup', 'user', id, `Setup TOTP @${user.username}`);
  }

  enableTotp(id: string, actorUserId: string): UserRow {
    const user = this.getUser(id);
    if (!user) throw new Error('User tidak ditemukan.');

    this.db.prepare(`
      UPDATE users
      SET totp_enabled = 1, force_password_change = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(id);
    this.clearAuthCaches();
    this.writeAudit(actorUserId, 'user.totp_enable', 'user', id, `Aktifkan TOTP @${user.username}`);

    const updated = this.listUsers().find((row) => row.id === id);
    if (!updated) throw new Error('User tidak ditemukan.');
    return updated;
  }

  disableTotp(id: string, actorUserId: string): UserRow {
    const user = this.getUser(id);
    if (!user) throw new Error('User tidak ditemukan.');

    this.db.prepare(`
      UPDATE users
      SET totp_secret = NULL, totp_enabled = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(id);
    this.clearAuthCaches();
    this.writeAudit(actorUserId, 'user.totp_disable', 'user', id, `Nonaktifkan TOTP @${user.username}`);

    const updated = this.listUsers().find((row) => row.id === id);
    if (!updated) throw new Error('User tidak ditemukan.');
    return updated;
  }

  writeAudit(actorUserId: string, action: string, entityType: string, entityId: string, reason: string) {
    this.db.prepare(`
      INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, reason, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(createId('audit'), actorUserId, action, entityType, entityId, reason, '{}');
  }
}
