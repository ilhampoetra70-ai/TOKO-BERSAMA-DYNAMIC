import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '../core/errors.js';
import type { DbClient } from '../db/client.js';
import { UserRepository } from '../repositories/userRepository.js';
import { rotateOfflineMasterKey, verifyOfflineMasterKey } from '../security/masterKey.js';
import { verifyTotp } from '../security/totp.js';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const recoveryLoginSchema = z.object({
  username: z.string().trim().min(1),
  method: z.enum(['totp', 'masterkey']).default('totp'),
  adminTotpCode: z.string().regex(/^\d{6}$/).optional().or(z.literal('')),
  masterKey: z.string().min(1).optional().or(z.literal('')),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  nextPassword: z.string().min(8),
});

function getBearerToken(header: string | undefined) {
  return header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

export async function registerAuthRoutes(app: FastifyInstance, db: DbClient, repository: UserRepository) {
  app.post('/auth/login', async (request) => {
    const body = loginSchema.parse(request.body);
    return repository.authenticate(body.username, body.password);
  });

  app.post('/auth/recovery-login', async (request) => {
    const body = recoveryLoginSchema.parse(request.body);
    const targetUser = repository.getUserByUsername(body.username);
    if (!targetUser || !targetUser.active) {
      throw new ValidationError('User yang akan dibantu login tidak valid.');
    }

    if (body.method === 'masterkey') {
      if (!body.masterKey || !verifyOfflineMasterKey(db, body.masterKey)) {
        throw new ValidationError('Masterkey offline tidak valid.');
      }

      const session = repository.createSessionForUser(targetUser, 'auth.recovery_masterkey');
      const rotatedMasterKey = rotateOfflineMasterKey(db);
      return { ...session, rotatedMasterKey };
    }

    const adminUser = repository.getFirstActiveAdminWithTotp();
    if (!adminUser?.totp_secret || !body.adminTotpCode || !verifyTotp(adminUser.totp_secret, body.adminTotpCode)) {
      throw new ValidationError('Kode TOTP admin tidak valid.');
    }

    return repository.createSessionForUser(targetUser, 'auth.recovery_login');
  });

  app.post('/auth/logout', async (request) => {
    const token = getBearerToken(request.headers.authorization);
    if (token) {
      repository.revokeSession(token);
    }

    return { ok: true };
  });

  app.post('/auth/change-password', async (request) => {
    const token = getBearerToken(request.headers.authorization);
    const session = repository.validateSession(token);
    const body = changePasswordSchema.parse(request.body);
    const user = repository.changePassword(session.userId, body.nextPassword, body.currentPassword);

    return {
      user,
      forcePasswordChange: false,
    };
  });
}
