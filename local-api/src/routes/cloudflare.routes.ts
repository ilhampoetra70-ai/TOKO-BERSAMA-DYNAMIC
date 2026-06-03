import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  checkCloudflareConnectorPreflight,
  getCloudflareConnectorStatus,
  installCloudflared,
  installCloudflaredWindowsService,
  readCloudflareConnectorLogs,
  saveCloudflareConnectorConfig,
  startCloudflareConnector,
  startCloudflaredWindowsService,
  stopCloudflareConnector,
  stopCloudflaredWindowsService,
  uninstallCloudflaredWindowsService,
} from '../services/cloudflareConnector.js';

const configBodySchema = z.object({
  token: z.string().optional(),
  originUrl: z.string().url().optional(),
  publicHostname: z.string().optional(),
  publicUrl: z.string().url().optional().or(z.literal('')),
  binaryPath: z.string().optional(),
  autoStart: z.boolean().optional(),
});

const installBodySchema = z.object({
  force: z.boolean().optional(),
}).optional();

export async function registerCloudflareRoutes(app: FastifyInstance) {
  app.get('/cloudflare/connector', async () => ({
    item: getCloudflareConnectorStatus(),
  }));

  app.get('/cloudflare/connector/preflight', async () => ({
    item: await checkCloudflareConnectorPreflight(),
  }));

  app.put('/cloudflare/connector', async (request) => {
    const body = configBodySchema.parse(request.body ?? {});
    saveCloudflareConnectorConfig(body);
    return { item: getCloudflareConnectorStatus() };
  });

  app.post('/cloudflare/connector/install', async (request) => {
    const body = installBodySchema.parse(request.body ?? {});
    return { item: await installCloudflared(Boolean(body?.force)) };
  });

  app.post('/cloudflare/connector/service/install', async (request) => {
    const body = installBodySchema.parse(request.body ?? {});
    return { item: installCloudflaredWindowsService(Boolean(body?.force)) };
  });

  app.post('/cloudflare/connector/service/uninstall', async () => ({
    item: uninstallCloudflaredWindowsService(),
  }));

  app.post('/cloudflare/connector/service/start', async () => ({
    item: startCloudflaredWindowsService(),
  }));

  app.post('/cloudflare/connector/service/stop', async () => ({
    item: stopCloudflaredWindowsService(),
  }));

  app.post('/cloudflare/connector/start', async () => ({
    item: startCloudflareConnector(),
  }));

  app.post('/cloudflare/connector/stop', async () => ({
    item: stopCloudflareConnector(),
  }));

  app.get('/cloudflare/connector/logs', async () => ({
    items: readCloudflareConnectorLogs(),
  }));
}
