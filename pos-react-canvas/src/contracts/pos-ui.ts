import type { ComponentType } from 'react';

export type PosMenuId =
  | 'Dashboard'
  | 'Kasir'
  | 'Barang'
  | 'Stok rendah'
  | 'Riwayat stok'
  | 'Transaksi'
  | 'Hutang'
  | 'Piutang'
  | 'Laporan'
  | 'Insight'
  | 'Pengguna'
  | 'Database'
  | 'Setting';

export type MenuIcon = ComponentType<{ className?: string }>;
export type CatalogSortKey = 'name' | 'category' | 'qty' | 'unit' | 'price';
export type CatalogSortDirection = 'asc' | 'desc';
export type TransactionSortKey = 'invoice' | 'customer' | 'time' | 'total' | 'status';
export type ReceivableSortKey = 'invoice' | 'customer' | 'due' | 'remaining' | 'status' | 'method';
export type ImportMode = 'paste' | 'file';
export type StockHistoryFilter = 'Semua' | 'Penjualan' | 'Restok' | 'Penyesuaian' | 'Retur' | 'Stock opname' | 'Stock awal' | 'Import' | 'Hapus barang';
export type CashierPaymentMethod = 'Tunai' | 'Transfer' | 'QRIS' | 'Debit/Kartu' | 'Cicilan' | 'Split';
export type CashierPaymentStatus = 'Lunas' | 'DP' | 'Cicilan';
export type ReceivableStatusFilter = 'Semua' | 'Belum dibayar' | 'Cicilan' | 'Tertagih sebagian' | 'Tagihan terbuka';
export type ReceivableMethodFilter = 'Semua metode' | 'Tunai' | 'Transfer' | 'QRIS' | 'Cicilan';
export type CashierDiscountMode = 'nominal' | 'percent';
export type TransactionStatusFilter = 'Semua' | 'Lunas' | 'Cicilan' | 'DP' | 'Void';
export type TransactionMethodFilter = 'Semua metode' | CashierPaymentMethod;
export type SupplierDebtStatusFilter = 'Semua' | 'Belum lunas' | 'Lunas' | 'Overdue';
export type SupplierDebtPaymentMethod = 'Tunai' | 'Transfer' | 'QRIS';
export type DatabaseTab = 'health' | 'backup' | 'maintenance' | 'export' | 'advanced';
export type DatabaseActionTone = 'success' | 'warning' | 'danger';
export type UserRoleFilter = 'Semua role' | 'Admin' | 'Supervisor' | 'Kasir';
export type UserPermissionRole = Exclude<UserRoleFilter, 'Semua role'>;
export type SettingTab = 'store' | 'printer' | 'receipt' | 'cashier' | 'lan' | 'priceChecker' | 'security' | 'appearance';
export type SettingReceiptPaper = '58' | '80' | 'cf';
export type SettingReceiptTemplate = 'compact' | 'standard' | 'detail';
export type SettingReceiptDensity = 'compact' | 'normal' | 'loose';
export type SettingReceiptFontSize = 'small' | 'medium' | 'large';
export type SettingAppearanceMode = 'auto' | 'light' | 'dark';
export type SettingAppearanceScale = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SettingAppearanceTheme =
  | 'obsidian-gold'
  | 'midnight-emerald'
  | 'midnight-sapphire'
  | 'midnight-ruby'
  | 'midnight-amethyst'
  | 'midnight-teal'
  | 'midnight-copper'
  | 'midnight-cyan'
  | 'midnight-rose'
  | 'midnight-lime'
  | 'midnight-indigo'
  | 'midnight-bronze'
  | 'midnight-onyx'
  | 'midnight-mint'
  | 'midnight-plum';
export type SettingReceiptSectionKey =
  | 'logo'
  | 'storeIdentity'
  | 'transactionInfo'
  | 'customerInfo'
  | 'itemMeta'
  | 'discount'
  | 'payment'
  | 'footer';

export type SettingReceiptLayoutConfig = {
  template: SettingReceiptTemplate;
  density: SettingReceiptDensity;
  fontSize: SettingReceiptFontSize;
  sections: Record<SettingReceiptSectionKey, boolean>;
};

export type SettingAppearanceConfig = {
  mode: SettingAppearanceMode;
  scale: SettingAppearanceScale;
};

export type SettingReceiptPreviewModel = {
  paper: SettingReceiptPaper;
  label: string;
  note: string;
  paperWidth: string;
  widthPx: number;
  heightPx: number;
  badge: string;
  html: string;
};

export type SupplierDebtTrailEntry = {
  time: string;
  item: string;
  movement: string;
  note: string;
};

export type CashierCheckoutForm = {
  customerName: string;
  phone: string;
  projectName: string;
  customerType: string;
  address: string;
  reference: string;
  note: string;
  dueDate: string;
};

export type CashierReceiptLine = {
  sku: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  subtotal: number;
};

export type CashierReceiptPreview = {
  invoice: string;
  saleTime: string;
  saleDate: string;
  cashier: string;
  method: CashierPaymentMethod;
  status: CashierPaymentStatus;
  customerName: string;
  customerType: string;
  phone: string;
  projectName: string;
  address: string;
  reference: string;
  note: string;
  dueDate: string;
  items: CashierReceiptLine[];
  paymentHistory?: Array<{
    time: string;
    amount: string;
    method: string;
    note: string;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  change: number;
};

export type ReceivablePaymentEntry = {
  id?: string;
  time: string;
  amount: string;
  method: Exclude<ReceivableMethodFilter, 'Semua metode'>;
  note: string;
};

export type ReceivableRow = {
  id?: string;
  invoice: string;
  customer: string;
  customerName: string;
  cashier: string;
  total: string;
  paid: string;
  remaining: string;
  method: Exclude<ReceivableMethodFilter, 'Semua metode'>;
  status: Exclude<ReceivableStatusFilter, 'Semua'> | 'Lunas';
  due: string;
  time: string;
  phone: string;
  address: string;
  projectName: string;
  reference: string;
  note: string;
  lastPayment: string;
  paymentHistory: ReceivablePaymentEntry[];
};

export type ReceivableReceiptPreview = {
  row: ReceivableRow;
  payment: ReceivablePaymentEntry;
};

export type SupplierDebtItem = {
  name: string;
  category: string;
  boxQty: number;
  packQty: number;
  unit: string;
  price: number;
};

export type SupplierDebtPaymentEntry = {
  id?: string;
  time: string;
  amount: string;
  method: SupplierDebtPaymentMethod;
  receiver: string;
  note: string;
};

export type SupplierDebtRow = {
  id: string;
  supplier: string;
  supplierPhone: string;
  supplierAddress: string;
  takeDate: string;
  due: string;
  total: string;
  paid: string;
  remaining: string;
  status: Exclude<SupplierDebtStatusFilter, 'Semua'>;
  note: string;
  collectionNote: string;
  items: SupplierDebtItem[];
  paymentHistory: SupplierDebtPaymentEntry[];
  stockTrail: SupplierDebtTrailEntry[];
};

export type SupplierDebtDraft = {
  supplier: string;
  takeDate: string;
  due: string;
  items: SupplierDebtItem[];
};

export type SupplierDebtReceiptPreview = {
  row: SupplierDebtRow;
  payment?: SupplierDebtPaymentEntry;
};

export type ReportTab = 'sales' | 'profit' | 'cashflow' | 'comparison' | 'comprehensive';

export type ReportPrintPreview = {
  title: string;
  tab: ReportTab;
  html: string;
};
