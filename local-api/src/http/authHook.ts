import type { FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../core/errors.js';
import type { AuthSessionRecord, PermissionResource, UserRepository } from '../repositories/userRepository.js';

const publicAuthPaths = new Set([
  '/auth/login',
  '/auth/recovery-login',
  '/auth/logout',
  '/auth/change-password',
]);

export type AuthenticatedRequest = FastifyRequest & {
  auth?: AuthSessionRecord;
};

function extractBearerToken(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header) return '';

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return '';
  return token.trim();
}

function getRequestPath(request: FastifyRequest) {
  return new URL(request.url, 'http://tokobersama.local').pathname;
}

function isGetLike(method: string) {
  return method === 'GET' || method === 'HEAD';
}

function isPublicStaticPath(path: string) {
  return path === '/price-checker'
    || path.startsWith('/price-checker/')
    || path === '/admin'
    || path.startsWith('/admin/')
    || path === '/connector'
    || path.startsWith('/connector/')
    || path.startsWith('/assets/')
    || path === '/favicon.ico'
    || path === '/manifest.webmanifest'
    || path === '/sw.js';
}

function isPublicRequest(request: FastifyRequest) {
  const path = getRequestPath(request);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return true;
  if (publicAuthPaths.has(path)) return true;
  if (method === 'GET' && path === '/health') return true;
  if (method === 'GET' && path === '/settings/public') return true;
  if (method === 'GET' && path.startsWith('/public/price-checker/')) return true;
  if (isGetLike(method) && isPublicStaticPath(path)) return true;

  return false;
}

function resolveRequiredResources(request: FastifyRequest): PermissionResource[] {
  const path = getRequestPath(request);
  const method = request.method.toUpperCase();

  if (path === '/users/me/preferences') return [];
  if (path.startsWith('/users')) return ['Pengguna'];
  if (path.startsWith('/cloudflare')) return ['Setting'];
  if (path.startsWith('/hardware')) return ['Setting'];
  if (path.startsWith('/settings')) return ['Setting'];
  if (path.startsWith('/admin-api')) return ['Dashboard'];
  if (path.startsWith('/database')) return ['Database'];
  if (path.startsWith('/reports')) return ['Laporan'];
  if (path.startsWith('/receivables')) return ['Piutang'];
  if (path.startsWith('/supplier-debts/receive-stock')) return ['Hutang'];
  if (path.startsWith('/supplier-debts')) return ['Hutang'];
  if (path.startsWith('/cashier-sessions')) return ['Kasir', 'Transaksi'];
  if (path.startsWith('/sales')) return ['Transaksi', 'Kasir'];
  if (path.startsWith('/workspace')) return ['Dashboard'];
  if (path.startsWith('/catalog/barcode')) return ['Barang'];
  if (path.startsWith('/catalog') && method === 'GET') return ['Kasir', 'Barang'];
  if (path.startsWith('/catalog')) return ['Barang'];

  return [];
}

export function createAuthHook(repository: UserRepository) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (isPublicRequest(request)) return;

    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedError('Token sesi wajib dikirim.');
    }

    const session = repository.validateSession(token);
    const resources = resolveRequiredResources(request);
    if (resources.length && !resources.some((resource) => repository.canRoleAccessResource(session.role, resource))) {
      throw new ForbiddenError();
    }

    (request as AuthenticatedRequest).auth = session;
  };
}
