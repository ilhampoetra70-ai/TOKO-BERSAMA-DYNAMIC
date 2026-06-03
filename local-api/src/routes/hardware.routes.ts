import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '../core/errors.js';
import type { CashDrawerService } from '../services/cashDrawerService.js';

const cashDrawerOpenSchema = z.object({
  force: z.boolean().optional(),
});

export async function registerHardwareRoutes(app: FastifyInstance, cashDrawerService: CashDrawerService) {
  app.post('/hardware/cash-drawer/open', async (request) => {
    const input = cashDrawerOpenSchema.parse(request.body ?? {});

    try {
      const result = await cashDrawerService.open('manual', { force: input.force ?? true });
      return { item: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cash drawer gagal dibuka.';
      throw new ValidationError(message);
    }
  });
}
