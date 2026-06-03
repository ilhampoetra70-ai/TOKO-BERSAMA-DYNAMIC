import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function resolveFrontendDistDir() {
  const candidates = [
    process.env.TOKOBERSAMA_FRONTEND_DIST,
    path.resolve(process.cwd(), '..', 'pos-react-canvas', 'dist'),
    path.resolve(process.cwd(), 'pos-react-canvas', 'dist'),
    path.resolve(process.cwd(), '..', '..', 'pos-react-canvas', 'dist'),
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => existsSync(path.join(candidate, 'index.html'))) ?? null;
}

function resolveWithin(rootDir: string, requestPath: string) {
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const target = path.resolve(rootDir, normalized);
  const relative = path.relative(rootDir, target);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return target;
}

function getStaticCacheControl(candidate: string) {
  const normalized = candidate.replaceAll('\\', '/');
  if (normalized.endsWith('/sw.js') || normalized === 'sw.js') {
    return 'no-store';
  }
  if (normalized.endsWith('.webmanifest') || normalized.endsWith('index.html')) {
    return 'no-cache, must-revalidate';
  }
  if (normalized.startsWith('assets/') || normalized.includes('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  return 'no-cache, must-revalidate';
}

function sendStaticFile(reply: FastifyReply, filePath: string, cacheControl: string) {
  const extension = path.extname(filePath).toLowerCase();
  reply.header('content-type', mimeTypes[extension] ?? 'application/octet-stream');
  reply.header('cache-control', cacheControl);
  return reply.send(createReadStream(filePath));
}

async function serveDistFile(reply: FastifyReply, distDir: string | null, requestPath: string, fallbackToIndex: boolean, scopedPrefixes: string[] = []) {
  if (!distDir) {
    return reply.status(404).send({ error: { code: 'FRONTEND_NOT_BUILT', message: 'Build frontend belum tersedia.' } });
  }

  const candidatePaths = [...scopedPrefixes.map((prefix) => path.join(prefix, requestPath)), requestPath];
  for (const candidate of candidatePaths) {
    const filePath = resolveWithin(distDir, candidate);
    if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
      const cacheControl = getStaticCacheControl(candidate);
      return sendStaticFile(reply, filePath, cacheControl);
    }
  }

  if (!fallbackToIndex) {
    return reply.status(404).send({ error: { code: 'STATIC_NOT_FOUND', message: 'Asset tidak ditemukan.' } });
  }

  return sendStaticFile(reply, path.join(distDir, 'index.html'), 'no-cache, must-revalidate');
}

export async function registerFrontendStaticRoutes(app: FastifyInstance) {
  const distDir = resolveFrontendDistDir();

  app.get('/price-checker', async (_request, reply) => {
    return serveDistFile(reply, distDir, 'index.html', true);
  });

  app.get('/price-checker/*', async (request: FastifyRequest<{ Params: { '*': string } }>, reply) => {
    const requested = request.params['*'] || 'index.html';
    if (requested === '' || requested === '/') {
      return serveDistFile(reply, distDir, 'index.html', true);
    }
    return serveDistFile(reply, distDir, requested, !path.extname(requested));
  });

  app.get('/admin', async (_request, reply) => {
    return serveDistFile(reply, distDir, 'index.html', true, ['admin']);
  });

  app.get('/admin/*', async (request: FastifyRequest<{ Params: { '*': string } }>, reply) => {
    const requested = request.params['*'] || 'index.html';
    if (requested === '' || requested === '/') {
      return serveDistFile(reply, distDir, 'index.html', true, ['admin']);
    }
    return serveDistFile(reply, distDir, requested, !path.extname(requested), ['admin']);
  });

  app.get('/connector', async (_request, reply) => {
    return serveDistFile(reply, distDir, 'index.html', true);
  });

  app.get('/connector/*', async (request: FastifyRequest<{ Params: { '*': string } }>, reply) => {
    const requested = request.params['*'] || 'index.html';
    if (requested === '' || requested === '/') {
      return serveDistFile(reply, distDir, 'index.html', true);
    }
    return serveDistFile(reply, distDir, requested, !path.extname(requested));
  });

  app.get('/favicon.ico', async (_request, reply) => {
    return serveDistFile(reply, distDir, 'tokobersama-icon.svg', false);
  });

  app.get('/manifest.webmanifest', async (_request, reply) => {
    return serveDistFile(reply, distDir, 'manifest.webmanifest', false);
  });

  app.get('/sw.js', async (_request, reply) => {
    return serveDistFile(reply, distDir, 'sw.js', false);
  });

  app.get('/assets/*', async (request: FastifyRequest<{ Params: { '*': string } }>, reply) => {
    return serveDistFile(reply, distDir, path.join('assets', request.params['*']), false);
  });
}
