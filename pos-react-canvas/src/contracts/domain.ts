import { z } from 'zod';

export const idSchema = z.string().min(1);
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const rupiahAmountSchema = z.number().int().nonnegative();
export const signedQuantitySchema = z.number().int();
export const quantitySchema = z.number().int().nonnegative();

export const productStatusSchema = z.enum(['active', 'deleted']);
export const stockMovementTypeSchema = z.enum([
  'initial',
  'sale',
  'restock',
  'adjustment',
  'return',
  'stock_opname',
  'import',
  'delete',
  'supplier_debt',
]);
export const paymentMethodSchema = z.enum(['cash', 'transfer', 'qris', 'card', 'installment', 'split']);
export const saleStatusSchema = z.enum(['paid', 'dp', 'installment', 'void']);
export const supplierDebtStatusSchema = z.enum(['open', 'partial', 'paid', 'overdue']);
export const userRoleSchema = z.enum(['admin', 'supervisor', 'cashier']);

export const productSchema = z.object({
  id: idSchema,
  barcode: z.string().min(8),
  name: z.string().min(1),
  categoryId: idSchema.optional(),
  categoryName: z.string().min(1),
  unit: z.string().min(1),
  qty: quantitySchema,
  unitPrice: rupiahAmountSchema,
  status: productStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.optional(),
});

export const stockMovementSchema = z.object({
  id: idSchema,
  productId: idSchema,
  movementQty: signedQuantitySchema,
  beforeQty: quantitySchema,
  afterQty: quantitySchema,
  type: stockMovementTypeSchema,
  source: z.string().min(1),
  reason: z.string().optional(),
  referenceId: idSchema.optional(),
  createdByUserId: idSchema,
  createdAt: isoDateTimeSchema,
});

export const saleItemSchema = z.object({
  id: idSchema,
  saleId: idSchema,
  productId: idSchema,
  barcode: z.string().min(8),
  nameSnapshot: z.string().min(1),
  unitSnapshot: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: rupiahAmountSchema,
  subtotalAmount: rupiahAmountSchema,
});

export const saleSchema = z.object({
  id: idSchema,
  requestId: idSchema,
  invoiceNo: z.string().min(1),
  status: saleStatusSchema,
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  paymentMethod: paymentMethodSchema,
  subtotalAmount: rupiahAmountSchema,
  discountAmount: rupiahAmountSchema,
  totalAmount: rupiahAmountSchema,
  paidAmount: rupiahAmountSchema,
  remainingAmount: rupiahAmountSchema,
  cashierUserId: idSchema,
  note: z.string().optional(),
  dueDate: z.string().date().optional(),
  createdAt: isoDateTimeSchema,
  voidedAt: isoDateTimeSchema.optional(),
  voidReason: z.string().optional(),
});

export const paymentSchema = z.object({
  id: idSchema,
  targetType: z.enum(['sale', 'receivable', 'supplier_debt']),
  targetId: idSchema,
  amount: rupiahAmountSchema,
  method: paymentMethodSchema,
  note: z.string().optional(),
  receivedByUserId: idSchema,
  createdAt: isoDateTimeSchema,
});

export const supplierDebtItemSchema = z.object({
  id: idSchema,
  supplierDebtId: idSchema,
  productId: idSchema.optional(),
  nameSnapshot: z.string().min(1),
  categorySnapshot: z.string().min(1),
  unitSnapshot: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: rupiahAmountSchema,
  subtotalAmount: rupiahAmountSchema,
});

export const supplierDebtSchema = z.object({
  id: idSchema,
  supplierName: z.string().min(1),
  takeDate: z.string().date(),
  dueDate: z.string().date().optional(),
  status: supplierDebtStatusSchema,
  totalAmount: rupiahAmountSchema,
  paidAmount: rupiahAmountSchema,
  remainingAmount: rupiahAmountSchema,
  createdByUserId: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const permissionSchema = z.object({
  id: idSchema,
  role: userRoleSchema,
  resource: z.string().min(1),
  action: z.string().min(1),
  allowed: z.boolean(),
});

export const userSchema = z.object({
  id: idSchema,
  username: z.string().min(3),
  displayName: z.string().min(1),
  role: userRoleSchema,
  passwordHash: z.string().min(1),
  totpEnabled: z.boolean(),
  active: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const auditLogSchema = z.object({
  id: idSchema,
  actorUserId: idSchema,
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: idSchema.optional(),
  reason: z.string().optional(),
  metadataJson: z.string().optional(),
  createdAt: isoDateTimeSchema,
});

export const checkoutRequestSchema = z.object({
  requestId: idSchema,
  cashierUserId: idSchema,
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  paymentMethod: paymentMethodSchema,
  status: saleStatusSchema,
  paidAmount: rupiahAmountSchema,
  discountAmount: rupiahAmountSchema.default(0),
  note: z.string().optional(),
  dueDate: z.string().date().optional(),
  items: z.array(z.object({
    productId: idSchema,
    qty: z.number().int().positive(),
  })).min(1),
});

export type Product = z.infer<typeof productSchema>;
export type StockMovement = z.infer<typeof stockMovementSchema>;
export type Sale = z.infer<typeof saleSchema>;
export type SaleItem = z.infer<typeof saleItemSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type SupplierDebt = z.infer<typeof supplierDebtSchema>;
export type SupplierDebtItem = z.infer<typeof supplierDebtItemSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type User = z.infer<typeof userSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
