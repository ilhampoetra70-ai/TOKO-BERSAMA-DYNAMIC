import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DbClient } from '../db/client.js';

const settingsKey = 'app_settings';

const receiptSectionSchema = z.object({
  logo: z.boolean(),
  storeIdentity: z.boolean(),
  transactionInfo: z.boolean(),
  customerInfo: z.boolean(),
  itemMeta: z.boolean(),
  discount: z.boolean(),
  payment: z.boolean(),
  footer: z.boolean(),
});

const appearanceSchema = z.object({
  mode: z.enum(['auto', 'light', 'dark']),
  scale: z.enum(['xs', 'sm', 'md', 'lg', 'xl']),
});

const appSettingsSchema = z.object({
  store: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    logoDataUrl: z.string().nullable(),
    logoFileName: z.string(),
    logoFileSizeKb: z.number().int().nonnegative().nullable(),
  }),
  printer: z.object({
    activePrinter: z.string(),
    behavior: z.string(),
    paper: z.enum(['58', '80', 'cf']),
  }),
  cashDrawer: z.object({
    enabled: z.boolean(),
    interface: z.string(),
    connectionMode: z.enum(['windows', 'network']).default('windows'),
    printerName: z.string().default('POS-58'),
    networkInterface: z.string().default('tcp://192.168.1.100:9100'),
    printerType: z.enum(['EPSON', 'STAR', 'TANCA', 'DARUMA', 'BROTHER', 'CUSTOM']),
    openOnCashCheckout: z.boolean(),
    openOnReceivablePayment: z.boolean(),
  }),
  receipt: z.object({
    layout: z.object({
      template: z.enum(['compact', 'standard', 'detail']),
      density: z.enum(['compact', 'normal', 'loose']),
      fontSize: z.enum(['small', 'medium', 'large']),
      sections: receiptSectionSchema,
    }),
    previewPaper: z.enum(['58', '80', 'cf']),
  }),
  appearance: appearanceSchema,
});

export type AppSettingsRecord = z.infer<typeof appSettingsSchema>;

const defaultAppSettings: AppSettingsRecord = {
  store: {
    name: 'TOKO BERSAMA MATERIAL',
    address: 'Jl. Raya Bangunan No. 88',
    phone: '0812-0000-7788',
    logoDataUrl: null,
    logoFileName: '',
    logoFileSizeKb: null,
  },
  printer: {
    activePrinter: 'Thermal POS 80',
    behavior: 'Preview sebelum print',
    paper: '80',
  },
  cashDrawer: {
    enabled: false,
    interface: 'printer:POS-58',
    connectionMode: 'windows',
    printerName: 'POS-58',
    networkInterface: 'tcp://192.168.1.100:9100',
    printerType: 'EPSON',
    openOnCashCheckout: true,
    openOnReceivablePayment: true,
  },
  receipt: {
    layout: {
      template: 'standard',
      density: 'normal',
      fontSize: 'medium',
      sections: {
        logo: true,
        storeIdentity: true,
        transactionInfo: true,
        customerInfo: true,
        itemMeta: true,
        discount: true,
        payment: true,
        footer: true,
      },
    },
    previewPaper: '80',
  },
  appearance: {
    mode: 'dark',
    scale: 'md',
  },
};

function mergeWithDefaults(input: unknown): AppSettingsRecord {
  const candidate = typeof input === 'object' && input !== null ? input as Partial<AppSettingsRecord> : {};
  return appSettingsSchema.parse({
    ...defaultAppSettings,
    ...candidate,
    store: {
      ...defaultAppSettings.store,
      ...candidate.store,
    },
    printer: {
      ...defaultAppSettings.printer,
      ...candidate.printer,
    },
    cashDrawer: {
      ...defaultAppSettings.cashDrawer,
      ...candidate.cashDrawer,
      interface: candidate.cashDrawer?.connectionMode === 'network'
        ? candidate.cashDrawer?.networkInterface || candidate.cashDrawer?.interface || defaultAppSettings.cashDrawer.networkInterface
        : `printer:${candidate.cashDrawer?.printerName || defaultAppSettings.cashDrawer.printerName}`,
    },
    receipt: {
      ...defaultAppSettings.receipt,
      ...candidate.receipt,
      layout: {
        ...defaultAppSettings.receipt.layout,
        ...candidate.receipt?.layout,
        sections: {
          ...defaultAppSettings.receipt.layout.sections,
          ...candidate.receipt?.layout?.sections,
        },
      },
    },
    appearance: {
      ...defaultAppSettings.appearance,
      ...candidate.appearance,
    },
  });
}

export function getSettings(db: DbClient): AppSettingsRecord {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ? LIMIT 1').get(settingsKey) as { value_json?: string } | undefined;
  if (!row?.value_json) {
    return defaultAppSettings;
  }

  try {
    return mergeWithDefaults(JSON.parse(row.value_json));
  } catch {
    return defaultAppSettings;
  }
}

function saveSettings(db: DbClient, input: AppSettingsRecord): AppSettingsRecord {
  const normalized = mergeWithDefaults(input);
  const valueJson = JSON.stringify(normalized);
  db.prepare(`
    INSERT INTO settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).run(settingsKey, valueJson, new Date().toISOString());

  return normalized;
}

export async function registerSettingsRoutes(app: FastifyInstance, db: DbClient) {
  app.get('/settings/public', async () => {
    const settings = getSettings(db);
    return { item: settings.store };
  });

  app.get('/settings', async () => {
    return { item: getSettings(db) };
  });

  app.put('/settings', async (request) => {
    const body = appSettingsSchema.parse(request.body);
    const item = saveSettings(db, body);
    return { item };
  });
}
