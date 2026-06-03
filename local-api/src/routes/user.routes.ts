import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../core/errors.js';
import type { AuthenticatedRequest } from '../http/authHook.js';
import { type PermissionResource, permissionResources, type RolePermissionMap, UserRepository } from '../repositories/userRepository.js';
import { createOtpAuthUrl, encodeBase32, verifyTotp } from '../security/totp.js';

const rolePermissionSchema = z.object({
  Admin: z.array(z.enum(permissionResources)).default([...permissionResources]),
  Supervisor: z.array(z.enum(permissionResources)),
  Kasir: z.array(z.enum(permissionResources)),
});

const totpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Kode TOTP harus 6 digit.'),
});

const userRoleSchema = z.enum(['Admin', 'Supervisor', 'Kasir']);
const createUserSchema = z.object({
  username: z.string().trim().min(3),
  displayName: z.string().trim().min(1),
  role: userRoleSchema,
  active: z.boolean().default(true),
});
const updateUserSchema = z.object({
  displayName: z.string().trim().min(1),
  role: userRoleSchema,
  active: z.boolean(),
});
const appearancePreferenceSchema = z.object({
  mode: z.enum(['auto', 'light', 'dark']),
  accent: z.enum(['amber', 'emerald', 'sky', 'rose']),
  theme: z.enum([
    'obsidian-gold',
    'midnight-emerald',
    'midnight-sapphire',
    'midnight-ruby',
    'midnight-amethyst',
    'midnight-teal',
    'midnight-copper',
    'midnight-cyan',
    'midnight-rose',
    'midnight-lime',
    'midnight-indigo',
    'midnight-bronze',
    'midnight-onyx',
    'midnight-mint',
    'midnight-plum',
  ]).optional(),
});

function getActorUserId(request: unknown) {
  return (request as AuthenticatedRequest).auth?.userId ?? 'system-admin';
}

export async function registerUserRoutes(app: FastifyInstance, repository: UserRepository) {
  app.get('/users/me/preferences', async (request) => ({
    item: repository.getAppearancePreference(getActorUserId(request)),
  }));

  app.put('/users/me/preferences', async (request) => {
    const body = appearancePreferenceSchema.parse(request.body);
    const actorUserId = getActorUserId(request);
    const current = repository.getAppearancePreference(actorUserId);
    return {
      item: repository.updateAppearancePreference(actorUserId, { ...current, ...body }, actorUserId),
    };
  });

  app.get('/users', async () => ({
    items: repository.listUsers(),
    rolePermissions: repository.getRolePermissions(),
  }));

  app.put('/users/permissions', async (request) => {
    const body = z.object({ rolePermissions: rolePermissionSchema }).parse(request.body);
    const sanitized: RolePermissionMap = {
      Admin: [...permissionResources],
      Supervisor: body.rolePermissions.Supervisor.filter((item): item is PermissionResource => permissionResources.includes(item)),
      Kasir: body.rolePermissions.Kasir.filter((item): item is PermissionResource => permissionResources.includes(item)),
    };

    return { rolePermissions: repository.saveRolePermissions(sanitized) };
  });

  app.get('/users/audit-logs', async (request) => {
    const query = z.object({ limit: z.coerce.number().int().min(1).max(300).optional() }).parse(request.query);
    return { items: repository.listAuditLogs(query.limit ?? 80) };
  });

  app.post('/users', async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const payload = repository.createUser(body, getActorUserId(request));
    return reply.status(201).send(payload);
  });

  app.put('/users/:id', async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = updateUserSchema.parse(request.body);
    return { item: repository.updateUser(params.id, body, getActorUserId(request)) };
  });

  app.delete('/users/:id', async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    repository.deleteUser(params.id, getActorUserId(request));
    return reply.status(204).send();
  });

  app.post('/users/:id/password-reset', async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return repository.markPasswordReset(params.id, getActorUserId(request));
  });

  app.post('/users/:id/totp/setup', async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const user = repository.getUser(params.id);
    if (!user) {
      throw new NotFoundError('User', params.id);
    }

    const secret = encodeBase32(crypto.randomBytes(20));
    repository.saveTotpSecret(params.id, secret, getActorUserId(request));

    return {
      manualKey: secret,
      otpauthUrl: createOtpAuthUrl(user.username, secret),
    };
  });

  app.post('/users/:id/totp/verify', async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = totpVerifySchema.parse(request.body);
    const user = repository.getUser(params.id);
    if (!user?.totp_secret) {
      throw new ValidationError('Secret TOTP belum dibuat.');
    }

    if (!verifyTotp(user.totp_secret, body.code)) {
      throw new ValidationError('Kode TOTP tidak valid atau sudah kedaluwarsa.');
    }

    return { item: repository.enableTotp(params.id, getActorUserId(request)) };
  });

  app.delete('/users/:id/totp', async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return { item: repository.disableTotp(params.id, getActorUserId(request)) };
  });
}
