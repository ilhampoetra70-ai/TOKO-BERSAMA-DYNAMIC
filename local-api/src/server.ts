import Fastify from 'fastify';
import { pathToFileURL } from 'node:url';
import { config } from './config/index.js';
import { createDbClient } from './db/client.js';
import { errorHandler } from './http/errorHandler.js';
import { createAuthHook } from './http/authHook.js';
import { CatalogRepository } from './repositories/catalogRepository.js';
import { SalesRepository } from './repositories/salesRepository.js';
import { SupplierDebtRepository } from './repositories/supplierDebtRepository.js';
import { StockRepository } from './repositories/stockRepository.js';
import { registerCatalogRoutes } from './routes/catalog.routes.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerDatabaseRoutes } from './routes/database.routes.js';
import { registerFinanceRoutes } from './routes/finance.routes.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerReportRoutes } from './routes/report.routes.js';
import { registerSettingsRoutes } from './routes/settings.routes.js';
import { registerSalesRoutes } from './routes/sales.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';
import { UserRepository } from './repositories/userRepository.js';
import { registerUserRoutes } from './routes/user.routes.js';
import { registerPublicPriceCheckerRoutes } from './routes/publicPriceChecker.routes.js';
import { registerCloudflareRoutes } from './routes/cloudflare.routes.js';
import { registerHardwareRoutes } from './routes/hardware.routes.js';
import { autoStartCloudflareConnector, stopCloudflareConnector } from './services/cloudflareConnector.js';
import { CashDrawerService } from './services/cashDrawerService.js';
import { registerFrontendStaticRoutes } from './http/staticFrontend.js';
import { applySecurityHeaders } from './http/securityHeaders.js';

export async function createApp() {
  const db = createDbClient();
  const enableRequestLogger = process.env.TOKOBERSAMA_API_LOGGER === '1' || process.env.TOKOBERSAMA_API_LOGGER === 'true';
  const app = Fastify({ logger: enableRequestLogger });

  app.setErrorHandler(errorHandler);
  app.addHook('onRequest', async (request, reply) => {
    const cors = applySecurityHeaders(request, reply);

    if (request.method === 'OPTIONS') {
      return reply.status(cors.allowed ? 204 : 403).send();
    }
  });
  app.addHook('onClose', async () => {
    stopCloudflareConnector();
    db.close();
  });

  const catalogRepository = new CatalogRepository(db);
  const stockRepository = new StockRepository(db);
  const salesRepository = new SalesRepository(db);
  const supplierDebtRepository = new SupplierDebtRepository(db);
  const userRepository = new UserRepository(db);
  const cashDrawerService = new CashDrawerService(db);

  app.addHook('onRequest', createAuthHook(userRepository));

  await registerHealthRoutes(app, db);
  await registerAuthRoutes(app, db, userRepository);
  await registerPublicPriceCheckerRoutes(app, db, catalogRepository);
  await registerCatalogRoutes(app, catalogRepository, stockRepository, salesRepository);
  await registerSalesRoutes(app, catalogRepository, stockRepository, salesRepository, cashDrawerService);
  await registerFinanceRoutes(app, salesRepository, supplierDebtRepository, cashDrawerService);
  await registerDatabaseRoutes(app, db, userRepository);
  await registerReportRoutes(app, db, catalogRepository, stockRepository, salesRepository, supplierDebtRepository);
  await registerSettingsRoutes(app, db);
  await registerUserRoutes(app, userRepository);
  await registerCloudflareRoutes(app);
  await registerHardwareRoutes(app, cashDrawerService);
  await registerAdminRoutes(app, db, catalogRepository, stockRepository, salesRepository, supplierDebtRepository, userRepository);
  await registerFrontendStaticRoutes(app);

  return app;
}

async function main() {
  const app = await createApp();
  await app.listen({ host: config.host, port: config.port });
  autoStartCloudflareConnector();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
