import { z } from 'zod';

export const viewIdSchema = z.enum(['pos', 'admin', 'price']);
export const viewportIdSchema = z.enum(['desktop', 'laptop', 'tablet', 'mobile']);

export const queueItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  qty: z.coerce.number().int().nonnegative(),
  unit: z.string(),
  note: z.string(),
  price: z.string(),
});
export const catalogItemSchema = queueItemSchema;

export const metricItemSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const stockStatusSchema = z.enum(['Low', 'Healthy', 'Critical']);

export const stockItemSchema = z.object({
  item: z.string(),
  stock: z.number().int().nonnegative(),
  status: stockStatusSchema,
  action: z.string(),
});

export const stockHistoryItemSchema = z.object({
  sku: z.string().optional(),
  item: z.string(),
  movement: z.string(),
  note: z.string(),
  time: z.string(),
  event: z.string(),
  beforeQty: z.coerce.number().int().nonnegative().optional(),
  afterQty: z.coerce.number().int().nonnegative().optional(),
  operator: z.string().optional(),
  source: z.string().optional(),
});

export const cashierCartItemSchema = z.object({
  sku: z.string(),
  qty: z.coerce.number().int().positive(),
});

export const saleLineItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  qty: z.coerce.number().int().positive(),
  unit: z.string(),
  price: z.coerce.number().nonnegative(),
  subtotal: z.coerce.number().nonnegative(),
});

export const saleRowSchema = z.object({
  id: z.string().optional(),
  invoice: z.string(),
  customer: z.string(),
  cashier: z.string(),
  total: z.string(),
  method: z.string(),
  status: z.string(),
  time: z.string(),
  itemsCount: z.coerce.number().int().nonnegative(),
  items: z.array(saleLineItemSchema).optional(),
  customerName: z.string().optional(),
  phone: z.string().optional(),
  projectName: z.string().optional(),
  customerType: z.string().optional(),
  address: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
  paymentAmount: z.string().optional(),
  dueDate: z.string().optional(),
  discount: z.string().optional(),
  discountMode: z.enum(['nominal', 'percent']).optional(),
  revisionCount: z.coerce.number().int().nonnegative().optional(),
  revised: z.boolean().optional(),
});

export const cashierSessionRowSchema = z.object({
  id: z.string(),
  kind: z.enum(['Draft', 'Tertahan']),
  customer: z.string(),
  cashier: z.string(),
  total: z.string(),
  method: z.string(),
  status: z.string(),
  time: z.string(),
  itemsCount: z.coerce.number().int().nonnegative(),
  cartItems: z.array(cashierCartItemSchema),
  customerName: z.string().optional(),
  phone: z.string().optional(),
  projectName: z.string().optional(),
  customerType: z.string().optional(),
  address: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
  paymentAmount: z.string().optional(),
  discount: z.string().optional(),
  discountMode: z.enum(['nominal', 'percent']).optional(),
  dueDate: z.string().optional(),
});

export const alertItemSchema = z.object({
  title: z.string(),
  note: z.string(),
});

export const priceHistoryItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const canvasViewDataSchema = z.object({
  posQueue: z.array(queueItemSchema),
  posCatalog: z.array(queueItemSchema),
  stockHistoryRows: z.array(stockHistoryItemSchema),
  saleRows: z.array(saleRowSchema),
  cashierSessionRows: z.array(cashierSessionRowSchema),
  adminMetrics: z.array(metricItemSchema),
  adminControls: z.array(alertItemSchema),
  stockRows: z.array(stockItemSchema),
  adminAlerts: z.array(alertItemSchema),
  priceHistory: z.array(priceHistoryItemSchema),
});

export const posWorkspaceSnapshotSchema = z.object({
  alerts: z.boolean(),
  data: canvasViewDataSchema,
});

export type ViewId = z.infer<typeof viewIdSchema>;
export type ViewportId = z.infer<typeof viewportIdSchema>;
export type QueueItem = z.infer<typeof queueItemSchema>;
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type MetricItem = z.infer<typeof metricItemSchema>;
export type StockItem = z.infer<typeof stockItemSchema>;
export type StockHistoryItem = z.infer<typeof stockHistoryItemSchema>;
export type SaleRow = z.infer<typeof saleRowSchema>;
export type SaleLineItem = z.infer<typeof saleLineItemSchema>;
export type CashierSessionRow = z.infer<typeof cashierSessionRowSchema>;
export type AlertItem = z.infer<typeof alertItemSchema>;
export type PriceHistoryItem = z.infer<typeof priceHistoryItemSchema>;
export type CanvasViewData = z.infer<typeof canvasViewDataSchema>;
export type PosWorkspaceSnapshot = z.infer<typeof posWorkspaceSnapshotSchema>;
