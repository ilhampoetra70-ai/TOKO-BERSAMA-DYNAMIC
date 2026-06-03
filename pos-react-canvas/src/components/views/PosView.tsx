import { useState } from 'react';
import * as React from 'react';
import { eachDayOfInterval, endOfDay, format, startOfDay } from 'date-fns';
import { resolveRuntimeAdminUrl, resolveRuntimePriceCheckerUrl } from '../../services/apiBaseUrl';
import { applyDocumentAppearance, defaultPosTheme, posThemeOptions, readStoredPosThemeForUsername, writeStoredAppearance, writeStoredPosThemeForUsername } from '../../lib/appearance';
import {
  Activity,
  Archive,
  AlertTriangle,
  Banknote,
  BarChart3,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Barcode,
  Boxes,
  CalendarRange,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Calculator,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  FileSpreadsheet,
  Filter,
  FolderOpen,
  Gauge,
  History,
  Keyboard,
  KeyRound,
  MapPin,
  Minus,
  Monitor,
  Palette,
  Search,
  Plus,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Package,
  Percent,
  PencilLine,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Trash2,
  Truck,
  Upload,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import type { CanvasViewData, QueueItem, SaleLineItem, SaleRow } from '../../contracts/pos';
import type {
  CashierCheckoutForm,
  CashierDiscountMode,
  CashierPaymentMethod,
  CashierPaymentStatus,
  CashierReceiptPreview,
  CatalogSortDirection,
  CatalogSortKey,
  DatabaseActionTone,
  DatabaseTab,
  ImportMode,
  MenuIcon,
  PosMenuId,
  ReceivableMethodFilter,
  ReceivablePaymentEntry,
  ReceivableReceiptPreview,
  ReceivableRow,
  ReceivableSortKey,
  ReceivableStatusFilter,
  ReportPrintPreview,
  ReportTab,
  SettingReceiptDensity,
  SettingAppearanceConfig,
  SettingAppearanceMode,
  SettingAppearanceScale,
  SettingAppearanceTheme,
  SettingReceiptFontSize,
  SettingReceiptLayoutConfig,
  SettingReceiptPaper,
  SettingReceiptPreviewModel,
  SettingReceiptSectionKey,
  SettingReceiptTemplate,
  SettingTab,
  StockHistoryFilter,
  SupplierDebtDraft,
  SupplierDebtItem,
  SupplierDebtPaymentEntry,
  SupplierDebtPaymentMethod,
  SupplierDebtReceiptPreview,
  SupplierDebtRow,
  SupplierDebtStatusFilter,
  TransactionMethodFilter,
  TransactionSortKey,
  TransactionStatusFilter,
  UserPermissionRole,
  UserRoleFilter,
} from '../../contracts/pos-ui';
import type { AppSettings, AuditLogRow, DatabaseHealthPayload, ReportData, SaleRevisionRow, UserAppearancePreference, UserPermissionMap, UserRow } from '@/services/posApi.types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ReceiptPreviewFrame } from '../receipt/ReceiptPreviewFrame';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import type { DateRange } from 'react-day-picker';
import { posApi } from '@/services/posApi';
import type { DatabaseBackupRow } from '@/services/posApi.types';
import { ContextIcon } from './pos/ContextIcon';
import { CatalogView, LowStockView } from './pos/CatalogStockViews';
import { DashboardView } from './pos/DashboardView';
import { InsightView } from './pos/InsightView';
import {
  CashierView,
  ReceivablesView,
  ReportsView,
  StockHistoryView,
  SupplierDebtView,
  TransactionsView,
  UsersView,
} from './pos/LegacyPosViews';
import { PosNavigationSidebar } from './pos/PosNavigationSidebar';
import { PosOperationalPanel } from './pos/PosOperationalPanel';

const stockHistoryFilterOptions: StockHistoryFilter[] = ['Semua', 'Penjualan', 'Restok', 'Penyesuaian', 'Retur', 'Stock opname', 'Stock awal', 'Import', 'Hapus barang'];
const cashierPaymentMethods: CashierPaymentMethod[] = ['Tunai', 'Transfer', 'QRIS', 'Debit/Kartu', 'Cicilan', 'Split'];
const cashierPaymentStatuses: CashierPaymentStatus[] = ['Lunas', 'DP', 'Cicilan'];
const cashierDiscountModes: CashierDiscountMode[] = ['nominal', 'percent'];
const cleanResetStorageKey = 'tokobersama.pos.clean-reset';
const mockWorkspaceStorageKey = 'tokobersama.pos.workspace';
const mockSettingsStorageKey = 'tokobersama.pos.mock-settings';
const mockUsersStorageKey = 'tokobersama.pos.mock-users';
const LazyDatabaseView = React.lazy(() => import('./database/DatabaseView').then((module) => ({ default: module.DatabaseView })));
const LazySettingView = React.lazy(() => import('./setting/SettingView').then((module) => ({ default: module.SettingView })));
const hasCleanResetFlag = () => typeof window !== 'undefined' && window.localStorage.getItem(cleanResetStorageKey) === '1';
const defaultCashierCheckoutForm: CashierCheckoutForm = {
  customerName: '',
  phone: '',
  projectName: '',
  customerType: 'UMUM',
  address: '',
  reference: '',
  note: '',
  dueDate: '',
};

const storeName = 'TOKO MATERIAL';
const storeLogoMaxSizeKb = 256;
const storeLogoMaxSizeBytes = storeLogoMaxSizeKb * 1024;
const storeLogoAcceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];

const sidebarItems: Array<{ label: PosMenuId; icon: MenuIcon }> = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Kasir', icon: ShoppingCart },
  { label: 'Barang', icon: Package },
  { label: 'Stok rendah', icon: Boxes },
  { label: 'Riwayat stok', icon: ReceiptText },
  { label: 'Transaksi', icon: ClipboardList },
  { label: 'Hutang', icon: Landmark },
  { label: 'Piutang', icon: HandCoins },
  { label: 'Laporan', icon: BarChart3 },
  { label: 'Insight', icon: Sparkles },
  { label: 'Pengguna', icon: Users },
  { label: 'Database', icon: Database },
  { label: 'Setting', icon: Settings2 },
];

const permissionModuleRows: Array<{ id: PosMenuId; note: string }> = [
  { id: 'Dashboard', note: 'Ringkasan toko dan transaksi terakhir' },
  { id: 'Kasir', note: 'Input penjualan dan cetak struk' },
  { id: 'Barang', note: 'Kelola katalog barang dan barcode' },
  { id: 'Stok rendah', note: 'Pantau stok di bawah threshold' },
  { id: 'Riwayat stok', note: 'Audit mutasi stok masuk dan keluar' },
  { id: 'Transaksi', note: 'Riwayat invoice dan print ulang struk' },
  { id: 'Hutang', note: 'Hutang supplier dan restok distributor' },
  { id: 'Piutang', note: 'Tagihan pelanggan dan cicilan' },
  { id: 'Laporan', note: 'Laporan penjualan, kas, dan stok' },
  { id: 'Insight', note: 'Rekomendasi operasional toko' },
  { id: 'Pengguna', note: 'User, role, dan recovery akun' },
  { id: 'Database', note: 'Backup, restore, dan maintenance data' },
  { id: 'Setting', note: 'Profil toko, printer, struk, dan LAN' },
];

const defaultRolePermissions: Record<UserPermissionRole, PosMenuId[]> = {
  Admin: sidebarItems.map((item) => item.label),
  Supervisor: ['Dashboard', 'Barang', 'Stok rendah', 'Riwayat stok', 'Transaksi', 'Hutang', 'Piutang', 'Laporan', 'Insight'],
  Kasir: ['Dashboard', 'Kasir', 'Transaksi'],
};

const createEmptySupplierDebtItem = (): SupplierDebtItem => ({
  name: '',
  category: '',
  boxQty: 0,
  packQty: 0,
  unit: 'PCS',
  price: 0,
});

const createDefaultSupplierDebtDraft = (): SupplierDebtDraft => ({
  supplier: '',
  takeDate: format(new Date(), 'dd MMM yyyy'),
  due: '',
  items: [createEmptySupplierDebtItem()],
});

const supplierDebtSeedRows: SupplierDebtRow[] = [
  {
    id: 'HS-000001',
    supplier: 'CV BATU JAYA',
    supplierPhone: '0812-8888-1122',
    supplierAddress: 'Jl. Raya Material No. 18',
    takeDate: '12 Apr 2026',
    due: '26 Apr 2026',
    total: 'Rp 12.500.000',
    paid: 'Rp 2.500.000',
    remaining: 'Rp 10.000.000',
    status: 'Belum lunas',
    note: 'Restok batu split dan pasir untuk gudang utama.',
    collectionNote: 'Hubungi bagian keuangan sebelum jatuh tempo.',
    items: [
      { name: 'BATU SPLIT', category: 'MATERIAL KASAR', boxQty: 0, packQty: 5, unit: 'TRUK', price: 1500000 },
      { name: 'PASIR BANGUNAN', category: 'MATERIAL KASAR', boxQty: 0, packQty: 4, unit: 'TRUK', price: 1250000 },
    ],
    paymentHistory: [
      { time: '14 Apr 2026 10:15', amount: 'Rp 2.500.000', method: 'Transfer', receiver: 'Admin Toko', note: 'DP hutang supplier' },
    ],
    stockTrail: [
      { time: '12 Apr 2026 08:12', item: 'BATU SPLIT', movement: '+5 TRUK', note: 'Masuk dari hutang supplier' },
      { time: '12 Apr 2026 08:12', item: 'PASIR BANGUNAN', movement: '+4 TRUK', note: 'Masuk dari hutang supplier' },
    ],
  },
  {
    id: 'HS-000002',
    supplier: 'PT SUMBER PASIR',
    supplierPhone: '0812-9999-7744',
    supplierAddress: 'Jl. Pelabuhan Utara No. 7',
    takeDate: '18 Apr 2026',
    due: '03 Mei 2026',
    total: 'Rp 8.240.000',
    paid: 'Rp 0',
    remaining: 'Rp 8.240.000',
    status: 'Belum lunas',
    note: 'Barang masuk belum dibayar.',
    collectionNote: 'Tagih via admin gudang.',
    items: [
      { name: 'SEMEN 50KG', category: 'SEMEN', boxQty: 0, packQty: 80, unit: 'SAK', price: 73000 },
      { name: 'PIPA PVC 3 INCH', category: 'PIPA', boxQty: 0, packQty: 20, unit: 'BATANG', price: 120000 },
    ],
    paymentHistory: [],
    stockTrail: [
      { time: '18 Apr 2026 11:22', item: 'SEMEN 50KG', movement: '+80 SAK', note: 'Masuk dari hutang supplier' },
      { time: '18 Apr 2026 11:22', item: 'PIPA PVC 3 INCH', movement: '+20 BATANG', note: 'Masuk dari hutang supplier' },
    ],
  },
  {
    id: 'HS-000003',
    supplier: 'TOKO JAYA MAKMUR',
    supplierPhone: '0812-1234-7788',
    supplierAddress: 'Komplek Pasar Material Blok B',
    takeDate: '20 Apr 2026',
    due: '05 Mei 2026',
    total: 'Rp 4.110.000',
    paid: 'Rp 4.110.000',
    remaining: 'Rp 0',
    status: 'Lunas',
    note: 'Pembelian cat dan kuas.',
    collectionNote: 'Sudah lunas, simpan bukti sebagai arsip.',
    items: [
      { name: 'CAT TEMBOK', category: 'CAT', boxQty: 0, packQty: 18, unit: 'KALENG', price: 101000 },
      { name: 'KUAS CAT 2 INCH', category: 'ALAT', boxQty: 0, packQty: 60, unit: 'PCS', price: 38200 },
    ],
    paymentHistory: [
      { time: '22 Apr 2026 16:40', amount: 'Rp 4.110.000', method: 'Tunai', receiver: 'Admin Toko', note: 'Pelunasan penuh' },
    ],
    stockTrail: [
      { time: '20 Apr 2026 09:40', item: 'CAT TEMBOK', movement: '+18 KALENG', note: 'Masuk dari hutang supplier' },
      { time: '20 Apr 2026 09:40', item: 'KUAS CAT 2 INCH', movement: '+60 PCS', note: 'Masuk dari hutang supplier' },
    ],
  },
];

type CatalogTrailRow = {
  time: string;
  event: string;
  movement: string;
  note: string;
};

const categoryBadgeClasses = [
  'border-amber-400/30 bg-amber-500/12 text-amber-200',
  'border-sky-400/30 bg-sky-500/12 text-sky-200',
  'border-emerald-400/30 bg-emerald-500/12 text-emerald-200',
  'border-rose-400/30 bg-rose-500/12 text-rose-200',
  'border-violet-400/30 bg-violet-500/12 text-violet-200',
  'border-cyan-400/30 bg-cyan-500/12 text-cyan-200',
  'border-lime-400/30 bg-lime-500/12 text-lime-200',
];

function getCategoryBadgeClass(category: string): string {
  const normalized = category.trim().toLowerCase();
  let hash = 0;

  for (const char of normalized) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return categoryBadgeClasses[hash % categoryBadgeClasses.length];
}

function compareCatalogValues(
  left: QueueItem,
  right: QueueItem,
  key: CatalogSortKey,
  direction: CatalogSortDirection
): number {
  const sortFactor = direction === 'asc' ? 1 : -1;

  if (key === 'qty') {
    return (left.qty - right.qty) * sortFactor;
  }

  if (key === 'price') {
    const leftPrice = Number(left.price.replace(/[^\d]/g, '')) || 0;
    const rightPrice = Number(right.price.replace(/[^\d]/g, '')) || 0;
    return (leftPrice - rightPrice) * sortFactor;
  }

  const leftValue = left[key].toString().toLowerCase();
  const rightValue = right[key].toString().toLowerCase();

  return leftValue.localeCompare(rightValue, 'id') * sortFactor;
}

function compareTransactionValues(
  left: SaleRow,
  right: SaleRow,
  key: TransactionSortKey,
  direction: CatalogSortDirection
): number {
  const sortFactor = direction === 'asc' ? 1 : -1;

  if (key === 'total') {
    return (getRupiahNumber(left.total) - getRupiahNumber(right.total)) * sortFactor;
  }

  const leftValue = key === 'customer' ? left.customerName?.trim() || left.customer : left[key];
  const rightValue = key === 'customer' ? right.customerName?.trim() || right.customer : right[key];

  return String(leftValue).toLowerCase().localeCompare(String(rightValue).toLowerCase(), 'id', { numeric: true }) * sortFactor;
}

function compareReceivableValues(
  left: ReceivableRow,
  right: ReceivableRow,
  key: ReceivableSortKey,
  direction: CatalogSortDirection
): number {
  const sortFactor = direction === 'asc' ? 1 : -1;

  if (key === 'remaining') {
    return (getRupiahNumber(left.remaining) - getRupiahNumber(right.remaining)) * sortFactor;
  }

  const leftValue = key === 'customer' ? left.customerName : left[key];
  const rightValue = key === 'customer' ? right.customerName : right[key];

  return String(leftValue).toLowerCase().localeCompare(String(rightValue).toLowerCase(), 'id', { numeric: true }) * sortFactor;
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatRupiahInput(value: string): string {
  const trimmed = value.trim();
  const numeric = trimmed.replace(/[^\d]/g, '');

  if (!numeric) {
    return trimmed;
  }

  if (/^rp\s/i.test(trimmed)) {
    return trimmed;
  }

  return `Rp ${Number(numeric).toLocaleString('id-ID')}`;
}

function getRupiahNumber(value: string): number {
  return Number(value.replace(/[^\d]/g, '')) || 0;
}

function formatRupiahNumber(value: number): string {
  return `Rp ${Math.max(0, value).toLocaleString('id-ID')}`;
}

function parseDisplayDate(value: string): Date | null {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) return null;

  const monthIndex = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    mei: 4,
    may: 4,
    jun: 5,
    jul: 6,
    agu: 7,
    aug: 7,
    sep: 8,
    okt: 9,
    oct: 9,
    nov: 10,
    des: 11,
    dec: 11,
  }[match[2].toLowerCase()];

  if (monthIndex === undefined) return null;

  const parsed = new Date(
    Number(match[3]),
    monthIndex,
    Number(match[1]),
    Number(match[4] ?? 0),
    Number(match[5] ?? 0)
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDateInBounds(value: string, bounds: { start: Date; end: Date } | null): boolean {
  if (!bounds) return true;
  const parsed = parseDisplayDate(value);
  return Boolean(parsed && parsed >= bounds.start && parsed <= bounds.end);
}

function normalizeTransactionLineItem(item: SaleLineItem): SaleLineItem {
  const unitPrice = Number.isFinite(item.price) && item.price > 0
    ? item.price
    : item.qty > 0 && item.subtotal > 0
      ? Math.round(item.subtotal / item.qty)
      : 0;

  return {
    ...item,
    price: unitPrice,
  };
}

function formatReceiptAmount(value: number): string {
  return Math.max(0, value).toLocaleString('id-ID');
}

function escapeReceiptHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const defaultSettingReceiptSections: Record<SettingReceiptSectionKey, boolean> = {
  logo: false,
  storeIdentity: true,
  transactionInfo: true,
  customerInfo: true,
  itemMeta: true,
  discount: true,
  payment: true,
  footer: true,
};

const defaultSettingReceiptLayout: SettingReceiptLayoutConfig = {
  template: 'standard',
  density: 'normal',
  fontSize: 'medium',
  sections: defaultSettingReceiptSections,
};

const defaultSettingAppearance: SettingAppearanceConfig = {
  mode: 'dark',
  scale: 'md',
};

const defaultUserAppearancePreference: UserAppearancePreference = {
  mode: 'auto',
  accent: 'amber',
  theme: defaultPosTheme,
};

type ReceiptPreviewItemData = {
  name: string;
  qty: string;
  price: number;
  subtotal: number;
};

type ReceiptPreviewDocumentData = {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  invoice: string;
  date: string;
  time: string;
  cashier: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  projectName?: string;
  paymentMethod: string;
  paymentStatus: string;
  reference?: string;
  note?: string;
  dueDate?: string;
  items: ReceiptPreviewItemData[];
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

const defaultReceiptPreviewDocument: ReceiptPreviewDocumentData = {
  storeName: 'TOKO BERSAMA MATERIAL',
  storeAddress: 'Jl. Raya Bangunan No. 88',
  storePhone: '0812-0000-7788',
  invoice: 'INV-20260429-0431',
  date: '29/04/2026',
  time: '14:20',
  cashier: 'BUDI',
  customerName: 'CV SIDO MAKMUR',
  customerAddress: 'Jl. Proyek Raya No. 4',
  note: 'Dikirim setelah pembayaran selesai',
  paymentMethod: 'Tunai',
  paymentStatus: 'Lunas',
  items: [
    { name: 'SEMEN 50KG', qty: '10 SAK', price: 72000, subtotal: 720000 },
    { name: 'BESI BETON 12MM', qty: '5 BTG', price: 98000, subtotal: 490000 },
    { name: 'PASIR BANGUNAN', qty: '1 TRK', price: 260000, subtotal: 260000 },
  ],
  subtotal: 1470000,
  discount: 50000,
  total: 1420000,
  paid: 1500000,
  remaining: 0,
  change: 80000,
};

const settingAppearanceModeOptions: Array<{ value: SettingAppearanceMode; label: string; note: string }> = [
  { value: 'dark', label: 'Gelap', note: 'Kontras tinggi untuk POS' },
  { value: 'light', label: 'Terang', note: 'Lebih bersih untuk review cepat' },
  { value: 'auto', label: 'Auto', note: 'Ikuti preferensi sistem' },
];

const settingAppearanceScaleOptions: Array<{ value: SettingAppearanceScale; label: string; note: string }> = [
  { value: 'xs', label: 'XS', note: 'Lebih padat' },
  { value: 'sm', label: 'SM', note: 'Sedikit rapat' },
  { value: 'md', label: 'MD', note: 'Standar' },
  { value: 'lg', label: 'LG', note: 'Lebih lega' },
  { value: 'xl', label: 'XL', note: 'Sangat lega' },
];

function buildSettingReceiptPreviewHtml(
  paper: SettingReceiptPaper,
  layout: SettingReceiptLayoutConfig = defaultSettingReceiptLayout,
  documentData: ReceiptPreviewDocumentData = defaultReceiptPreviewDocument
): string {
  const fontDelta = {
    small: -1,
    medium: 0,
    large: 2,
  }[layout.fontSize];
  const density = {
    compact: {
      bodyPadding: '9px 8px 11px',
      receiptGap: '6px',
      infoGap: '3px',
      itemPadding: '3px 0 4px',
      summaryGap: '2px',
    },
    normal: {
      bodyPadding: '12px 10px 14px',
      receiptGap: '8px',
      infoGap: '4px',
      itemPadding: '5px 0 7px',
      summaryGap: '3px',
    },
    loose: {
      bodyPadding: '16px 12px 18px',
      receiptGap: '11px',
      infoGap: '6px',
      itemPadding: '8px 0 9px',
      summaryGap: '5px',
    },
  }[layout.density];
  const template = layout.template;
  const config = {
    '58': {
      paperWidthPx: 181,
      pageSize: '58mm auto',
      fontSize: `${9 + fontDelta}px`,
      titleSize: `${13 + fontDelta}px`,
      itemGrid: 'minmax(0,1fr) 58px 64px',
      showQtyColumn: false,
      label: '58mm thermal',
    },
    '80': {
      paperWidthPx: 287,
      pageSize: '80mm auto',
      fontSize: `${10 + fontDelta}px`,
      titleSize: `${14 + fontDelta}px`,
      itemGrid: 'minmax(0,1fr) 64px 70px',
      showQtyColumn: false,
      label: '80mm thermal',
    },
    cf: {
      paperWidthPx: 821,
      pageSize: '9.5in 11in',
      fontSize: `${11 + fontDelta}px`,
      titleSize: `${15 + fontDelta}px`,
      itemGrid: 'minmax(0,1fr) 56px 68px 80px',
      showQtyColumn: true,
      label: 'continuous form',
    },
  }[paper];

  const items = documentData.items;
  const subtotal = documentData.subtotal;
  const discount = documentData.discount;
  const total = documentData.total;
  const paid = documentData.paid;
  const change = documentData.change;
  const remaining = documentData.remaining;
  const isThermalCompact = paper === '58';
  const shouldHideItemRpPrefix = paper === '58' || paper === '80';
  const isContinuousForm = paper === 'cf';

  const itemRows = items
    .map((item) => {
      const unitPrice = shouldHideItemRpPrefix ? formatReceiptAmount(item.price) : formatRupiahNumber(item.price);
      const lineTotal = shouldHideItemRpPrefix ? formatReceiptAmount(item.subtotal) : formatRupiahNumber(item.subtotal);

      if (isThermalCompact) {
        return `
          <div class="item-row item-row-58">
            <div class="item-left-58">
              <div class="name">${escapeReceiptHtml(item.name)}</div>
              ${layout.sections.itemMeta ? `<div class="qty qty-58">${escapeReceiptHtml(item.qty)}</div>` : ''}
            </div>
            <div class="item-right-58">
              <div class="unit-price">x${unitPrice}</div>
              <div class="total total-58">${lineTotal}</div>
            </div>
          </div>
        `;
      }

      return `
        <div class="item-row ${isContinuousForm ? 'item-row-cf' : ''}">
          <div class="item-name">
            <div class="name">${escapeReceiptHtml(item.name)}</div>
            ${
              config.showQtyColumn || !layout.sections.itemMeta
                ? ''
                : `<div class="meta">${escapeReceiptHtml(item.qty)} x ${unitPrice}</div>`
            }
          </div>
          ${config.showQtyColumn ? `<div class="qty">${escapeReceiptHtml(item.qty)}</div>` : ''}
          <div class="price">${unitPrice}</div>
          <div class="total">${lineTotal}</div>
        </div>
      `;
    })
    .join('');

  const summaryRows = [
    ['Subtotal', formatRupiahNumber(subtotal)],
    ...(layout.sections.discount ? [['Diskon', formatRupiahNumber(discount)]] : []),
    ['Total', formatRupiahNumber(total)],
    ...(layout.sections.payment
      ? [
          ['Bayar', formatRupiahNumber(paid)],
          [remaining > 0 ? 'Sisa' : 'Kembali', formatRupiahNumber(remaining > 0 ? remaining : change)],
        ]
      : []),
  ]
    .map(([label, value]) => `<div class="summary-row"><span>${label}</span><span>${value}</span></div>`)
    .join('');
  const paymentsHtml = (documentData.paymentHistory ?? [])
    .map(
      (payment) => `
        <div class="payment-row">
          <div class="summary-row"><span>${escapeReceiptHtml(payment.method)}</span><span>${escapeReceiptHtml(payment.amount)}</span></div>
          <div class="payment-note"><span>${escapeReceiptHtml(payment.time)}</span><span>${escapeReceiptHtml(payment.note || '-')}</span></div>
        </div>
      `
    )
    .join('');

  const transactionInfo =
    paper === 'cf'
      ? `
        <div class="info-grid">
          <div class="info-block">
            <div class="info-label">Invoice</div>
            <div>${escapeReceiptHtml(documentData.invoice)}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Tanggal</div>
            <div>${escapeReceiptHtml(documentData.date)} ${escapeReceiptHtml(documentData.time)}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Kasir</div>
            <div>${escapeReceiptHtml(documentData.cashier)}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Pembayaran</div>
            <div>${escapeReceiptHtml(documentData.paymentMethod)} / ${escapeReceiptHtml(documentData.paymentStatus)}</div>
          </div>
          ${
            layout.sections.customerInfo
              ? `<div class="info-block">
                  <div class="info-label">Pelanggan</div>
                  <div>${escapeReceiptHtml(documentData.customerName)}</div>
                </div>`
              : ''
          }
          ${
            template === 'detail' && layout.sections.customerInfo
              ? `<div class="info-block wide">
                  <div class="info-label">Alamat</div>
                  <div>${escapeReceiptHtml(documentData.customerAddress || '-')}</div>
                </div>`
              : ''
          }
          ${
            template === 'detail'
              ? `<div class="info-block wide">
                  <div class="info-label">Catatan</div>
                  <div>${escapeReceiptHtml(documentData.note || '-')}</div>
                </div>`
              : ''
          }
        </div>
      `
      : `
        <div class="info-stack">
          <div class="info-line"><span>INV</span><span>${escapeReceiptHtml(documentData.invoice)}</span></div>
          <div class="info-line"><span>TGL</span><span>${escapeReceiptHtml(documentData.date)} ${escapeReceiptHtml(documentData.time)}</span></div>
          <div class="info-line"><span>CSR</span><span>${escapeReceiptHtml(documentData.cashier)}</span></div>
          <div class="info-line"><span>BAYAR</span><span>${escapeReceiptHtml(documentData.paymentMethod)}</span></div>
          ${layout.sections.customerInfo ? `<div class="info-line"><span>CUST</span><span>${escapeReceiptHtml(documentData.customerName)}</span></div>` : ''}
          ${template === 'detail' && layout.sections.customerInfo ? `<div class="info-line"><span>ALMT</span><span>${escapeReceiptHtml(documentData.customerAddress || '-')}</span></div>` : ''}
          ${documentData.customerPhone && layout.sections.customerInfo ? `<div class="info-line"><span>HP</span><span>${escapeReceiptHtml(documentData.customerPhone)}</span></div>` : ''}
          ${documentData.dueDate ? `<div class="info-line"><span>TEMPO</span><span>${escapeReceiptHtml(documentData.dueDate)}</span></div>` : ''}
          ${template === 'detail' ? `<div class="info-line"><span>KET</span><span>${escapeReceiptHtml(documentData.note || '-')}</span></div>` : ''}
        </div>
      `;
  const storeIdentity = layout.sections.storeIdentity
    ? `
      <div class="center">
        ${layout.sections.logo ? '<div class="logo-mark">TB</div>' : ''}
        <div class="store-title">${escapeReceiptHtml(documentData.storeName)}</div>
        <div class="muted">${escapeReceiptHtml(documentData.storeAddress || '-')}</div>
        <div class="muted">${escapeReceiptHtml(documentData.storePhone || '-')}</div>
      </div>
    `
    : '';
  const itemHeader = isThermalCompact
    ? `
      <div class="items-head items-head-58">
        <div class="item-left-58">
          <div>Item</div>
          <div class="qty qty-58">Qty</div>
        </div>
        <div class="item-right-58">
          <div class="price">Harga</div>
          <div class="total total-58">Total</div>
        </div>
      </div>
    `
    : `
      <div class="items-head ${isContinuousForm ? 'items-head-cf' : ''}">
        <div>Item</div>
        ${config.showQtyColumn ? '<div class="qty">Qty</div>' : ''}
        <div class="price">Harga</div>
        <div class="total">Total</div>
      </div>
    `;
  const footer = layout.sections.footer
    ? `
      <div class="rule"></div>
      <div class="footer">
        <div class="strong">Terima kasih</div>
        <div class="muted">Silahkan datang kembali</div>
      </div>
    `
    : '';

  return `
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Preview ${config.label}</title>
        <style>
          :root {
            color-scheme: light;
          }
          @page {
            size: ${config.pageSize};
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #111827;
            font-family: "Courier New", monospace;
            font-size: ${config.fontSize};
            line-height: 1.25;
          }
          body {
            width: ${config.paperWidthPx}px;
            box-sizing: border-box;
            padding: ${density.bodyPadding};
          }
          .receipt {
            display: grid;
            gap: ${density.receiptGap};
          }
          .center { text-align: center; }
          .logo-mark {
            width: 34px;
            height: 34px;
            display: inline-grid;
            place-items: center;
            margin-bottom: 4px;
            border: 2px solid #111827;
            border-radius: 999px;
            font-weight: 700;
            letter-spacing: 0.06em;
          }
          .store-title {
            font-size: ${config.titleSize};
            font-weight: 700;
            letter-spacing: 0.22em;
            text-transform: uppercase;
          }
          .muted {
            color: #52525b;
            font-size: 0.92em;
          }
          .rule {
            border-top: 1px dashed #6b7280;
          }
          .info-stack,
          .info-grid {
            display: grid;
            gap: ${density.infoGap};
            text-transform: uppercase;
          }
          .info-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            column-gap: 10px;
            row-gap: 6px;
          }
          .info-grid .wide {
            grid-column: 1 / -1;
          }
          .info-block {
            display: grid;
            gap: 1px;
          }
          .info-label {
            font-size: 0.8em;
            letter-spacing: 0.12em;
            color: #52525b;
          }
          .info-line {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 0.92em;
            text-transform: uppercase;
          }
          .items {
            display: grid;
            gap: 0;
          }
          .items-head,
          .item-row {
            display: grid;
            grid-template-columns: ${config.itemGrid};
            gap: 8px;
          }
          .items-head {
            padding: 2px 0 4px;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 1px solid #111827;
          }
          .items-head-58 {
            grid-template-columns: minmax(0, 1fr) 70px;
            gap: 6px;
          }
          .item-row {
            padding: ${density.itemPadding};
            border-bottom: 1px dotted #9ca3af;
          }
          .items-head-cf,
          .item-row-cf {
            grid-template-columns: minmax(280px, 1fr) 86px 132px 142px;
            width: 100%;
            gap: 12px;
          }
          .item-row-58 {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 70px;
            gap: 6px;
            align-items: start;
            font-variant-numeric: tabular-nums;
          }
          .item-left-58,
          .item-right-58 {
            display: grid;
            gap: 1px;
          }
          .item-left-58 {
            min-width: 0;
            text-align: left;
          }
          .item-right-58 {
            text-align: right;
          }
          .qty-58 {
            text-align: left;
            color: #111827;
            font-size: 1em;
            font-weight: 700;
            white-space: nowrap;
            justify-self: start;
          }
          .unit-price {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: right;
            color: #52525b;
          }
          .total-58 {
            text-align: right;
          }
          .item-name {
            min-width: 0;
            display: grid;
            gap: 2px;
          }
          .name {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 700;
          }
          .meta {
            font-size: 0.88em;
            letter-spacing: 0.08em;
            color: #52525b;
          }
          .qty,
          .price,
          .total {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }
          .summary {
            display: grid;
            gap: ${density.summaryGap};
            text-transform: uppercase;
          }
          .payment-history {
            display: grid;
            gap: ${density.summaryGap};
            text-transform: uppercase;
          }
          .payment-row {
            display: grid;
            gap: 1px;
            padding: 2px 0;
            border-bottom: 1px dotted #9ca3af;
          }
          .payment-note {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            color: #52525b;
            font-size: 0.84em;
          }
          .section-title {
            font-weight: 700;
            letter-spacing: 0.12em;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-variant-numeric: tabular-nums;
          }
          .footer {
            text-align: center;
            display: grid;
            gap: 2px;
            text-transform: uppercase;
          }
          .footer .strong {
            font-weight: 700;
            letter-spacing: 0.18em;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          ${storeIdentity}

          ${layout.sections.transactionInfo ? transactionInfo : ''}

          <div class="rule"></div>

          <div class="items">
            ${itemHeader}
            ${itemRows}
          </div>

          ${paymentsHtml ? `<div class="rule"></div><div class="payment-history"><div class="section-title">Riwayat pembayaran</div>${paymentsHtml}</div>` : ''}

          <div class="rule"></div>

          <div class="summary">${summaryRows}</div>

          ${footer}
        </div>
      </body>
    </html>
  `;
}

function getReceivableProgress(row: Pick<ReceivableRow, 'total' | 'paid'>): number {
  const total = getRupiahNumber(row.total);
  if (!total) {
    return 0;
  }

  return Math.min(100, Math.round((getRupiahNumber(row.paid) / total) * 100));
}

function parseReceivableDueDate(value: string): Date | null {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  const monthMap: Record<string, number> = {
    jan: 0,
    januari: 0,
    feb: 1,
    februari: 1,
    mar: 2,
    maret: 2,
    apr: 3,
    april: 3,
    mei: 4,
    may: 4,
    jun: 5,
    juni: 5,
    jul: 6,
    juli: 6,
    aug: 7,
    ags: 7,
    agustus: 7,
    sep: 8,
    september: 8,
    oct: 9,
    okt: 9,
    oktober: 9,
    nov: 10,
    november: 10,
    dec: 11,
    des: 11,
    desember: 11,
  };

  if (!match) {
    return null;
  }

  const month = monthMap[match[2].toLowerCase()];
  if (month === undefined) {
    return null;
  }

  return new Date(Number(match[3]), month, Number(match[1]), 23, 59, 59, 999);
}

function isReceivableOverdue(row: Pick<ReceivableRow, 'due' | 'remaining'>): boolean {
  const dueDate = parseReceivableDueDate(row.due);
  return Boolean(dueDate && getRupiahNumber(row.remaining) > 0 && dueDate.getTime() < Date.now());
}

function applyReceivablePaymentHistory(row: ReceivableRow, paymentHistory: ReceivablePaymentEntry[]): ReceivableRow {
  const total = getRupiahNumber(row.total);
  const paid = Math.min(
    total,
    paymentHistory.reduce((sum, payment) => sum + getRupiahNumber(payment.amount), 0)
  );
  const remaining = Math.max(0, total - paid);
  const latestPayment = paymentHistory[0];

  return {
    ...row,
    paid: formatRupiahNumber(paid),
    remaining: formatRupiahNumber(remaining),
    status: remaining === 0 ? 'Lunas' : paid > 0 ? 'Cicilan' : 'Belum dibayar',
    method: latestPayment?.method ?? row.method,
    lastPayment: latestPayment ? latestPayment.time : '-',
    note: latestPayment?.note || row.note,
    paymentHistory,
  };
}

function getSupplierDebtItemSubtotal(item: SupplierDebtItem): number {
  return Math.max(0, Number(item.packQty || 0) * Number(item.price || 0));
}

function getSupplierDebtProgress(row: Pick<SupplierDebtRow, 'total' | 'paid'>): number {
  const total = getRupiahNumber(row.total);
  if (!total) {
    return 0;
  }

  return Math.min(100, Math.round((getRupiahNumber(row.paid) / total) * 100));
}

function isSupplierDebtOverdue(row: Pick<SupplierDebtRow, 'due' | 'remaining'>): boolean {
  const dueDate = parseReceivableDueDate(row.due);
  return Boolean(dueDate && getRupiahNumber(row.remaining) > 0 && dueDate.getTime() < Date.now());
}

function applySupplierDebtPaymentHistory(row: SupplierDebtRow, paymentHistory: SupplierDebtPaymentEntry[]): SupplierDebtRow {
  const total = getRupiahNumber(row.total);
  const paid = Math.min(
    total,
    paymentHistory.reduce((sum, payment) => sum + getRupiahNumber(payment.amount), 0)
  );
  const remaining = Math.max(0, total - paid);

  return {
    ...row,
    paid: formatRupiahNumber(paid),
    remaining: formatRupiahNumber(remaining),
    status: remaining === 0 ? 'Lunas' : 'Belum lunas',
    paymentHistory,
  };
}

function applySupplierDebtItems(row: SupplierDebtRow, items: SupplierDebtItem[]): SupplierDebtRow {
  const total = items.reduce((sum, item) => sum + getSupplierDebtItemSubtotal(item), 0);
  return applySupplierDebtPaymentHistory(
    {
      ...row,
      total: formatRupiahNumber(total),
      items,
    },
    row.paymentHistory
  );
}

function getSupplierDebtDuplicateWarning(item: SupplierDebtItem, catalog: QueueItem[]): string {
  const name = item.name.trim().toUpperCase();
  const category = item.category.trim().toUpperCase();
  const unit = item.unit.trim().toUpperCase();

  if (!name || !category || !unit) {
    return '';
  }

  const duplicate = catalog.find(
    (entry) => entry.name === name && entry.category === category && entry.unit === unit
  );

  if (!duplicate) {
    return '';
  }

  return `Barang ini sudah ada di katalog. Saat disimpan, stok akan ditambah ke item yang sudah ada.`;
}

function splitImportLine(line: string): string[] {
  const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
  return line.split(delimiter).map((item) => item.trim());
}

function slugFilePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getExportFileName(extension = 'csv'): string {
  return `${slugFilePart(storeName)}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.${extension}`;
}

async function saveBinaryFile(fileName: string, blob: Blob) {
  const savePicker = (
    window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<{ createWritable: () => Promise<{ write: (blob: Blob) => Promise<void>; close: () => Promise<void> }> }>;
    }
  ).showSaveFilePicker;

  if (savePicker) {
    try {
      const handle = await savePicker({
        suggestedName: fileName,
        types: [
          {
            description: fileName.endsWith('.xlsx') ? 'Excel Workbook' : 'CSV Excel',
            accept: fileName.endsWith('.xlsx')
              ? { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
              : { 'text/csv': ['.csv'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

let xlsxModulePromise: Promise<typeof import('xlsx')> | null = null;

async function loadXlsxModule() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx');
  }
  return xlsxModulePromise;
}

async function saveWorkbookFile(fileName: string, sheets: Array<{ name: string; rows: Record<string, unknown>[] }>) {
  const XLSX = await loadXlsxModule();
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31) || 'Sheet1');
  }

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  await saveBinaryFile(fileName, blob);
}

function getCatalogDraftValidationError(item: QueueItem): string {
  if (!item.name.trim()) return 'Nama barang wajib diisi.';
  if (!item.category.trim()) return 'Kategori barang wajib diisi.';
  if (!item.unit.trim()) return 'Satuan barang wajib diisi.';
  if (!Number.isFinite(item.qty) || item.qty < 0) return 'Qty harus berupa angka 0 atau lebih.';
  if (!item.price.trim() || !item.price.replace(/[^\d]/g, '')) return 'Harga barang wajib diisi dengan angka.';
  return '';
}

function normalizeCatalogDuplicateValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function findCatalogDraftDuplicate(item: Pick<QueueItem, 'name' | 'category' | 'unit'>, catalog: QueueItem[], exceptSku?: string): QueueItem | null {
  const name = normalizeCatalogDuplicateValue(item.name);
  const category = normalizeCatalogDuplicateValue(item.category);
  const unit = normalizeCatalogDuplicateValue(item.unit);

  if (!name || !category || !unit) {
    return null;
  }

  return catalog.find((entry) =>
    entry.sku !== exceptSku
    && normalizeCatalogDuplicateValue(entry.name) === name
    && normalizeCatalogDuplicateValue(entry.category) === category
    && normalizeCatalogDuplicateValue(entry.unit) === unit
  ) ?? null;
}

function getCatalogDuplicateKey(item: Pick<QueueItem, 'name' | 'category' | 'unit'>): string {
  return [item.name, item.category, item.unit].map((value) => value.trim().toUpperCase()).join('|');
}

const transactionSeedRows: SaleRow[] = [
  {
    invoice: 'INV-0428',
    customer: 'Proyek Perumahan Asri',
    cashier: 'Kasir 01',
    total: 'Rp 1.240.000',
    method: 'Tunai',
    status: 'Lunas',
    time: '09:12',
    itemsCount: 3,
    customerName: 'Proyek Perumahan Asri',
    phone: '0812-0000-1122',
    address: 'Gudang Timur, Jl. Raya Material No. 18',
    projectName: 'Blok C12',
    reference: 'INV-0428/REF',
    note: 'Diantar pagi',
    paymentAmount: 'Rp 1.240.000',
    items: [
      { sku: '8991204500033', name: 'SEMEN 50KG', qty: 10, unit: 'SAK', price: 72000, subtotal: 720000 },
      { sku: '8991204500040', name: 'PASIR BANGUNAN', qty: 2, unit: 'TRUK', price: 260000, subtotal: 520000 },
    ],
  },
  {
    invoice: 'INV-0429',
    customer: 'Kontraktor Maju',
    cashier: 'Kasir 02',
    total: 'Rp 3.780.000',
    method: 'Cicilan',
    status: 'Cicilan',
    time: '10:45',
    itemsCount: 5,
    customerName: 'Kontraktor Maju',
    phone: '0812-1111-3344',
    address: 'Jl. Proyek Raya No. 4',
    projectName: 'Perumahan Maju',
    reference: 'PO-2026-0429',
    note: 'Cicilan 2x',
    paymentAmount: 'Rp 1.500.000',
    items: [
      { sku: '8991204500057', name: 'BESI BETON 12MM', qty: 20, unit: 'BATANG', price: 98000, subtotal: 1960000 },
      { sku: '8991204500064', name: 'CAT TEMBOK', qty: 18, unit: 'KALENG', price: 101000, subtotal: 1818000 },
    ],
  },
  {
    invoice: 'INV-0430',
    customer: 'Gudang Timur',
    cashier: 'Kasir 01',
    total: 'Rp 860.000',
    method: 'QRIS',
    status: 'Lunas',
    time: '13:20',
    itemsCount: 2,
    customerName: 'Gudang Timur',
    phone: '0812-2222-5566',
    address: 'Area Timur, Blok B',
    reference: 'QRS-0430',
    note: 'Bayar QRIS',
    paymentAmount: 'Rp 860.000',
    items: [
      { sku: '8991204500033', name: 'SEMEN 50KG', qty: 8, unit: 'SAK', price: 72000, subtotal: 576000 },
      { sku: '8991204500057', name: 'BESI BETON 12MM', qty: 3, unit: 'BATANG', price: 98000, subtotal: 294000 },
    ],
  },
];

const receivableSeedRows: ReceivableRow[] = transactionSeedRows
  .filter((row) => row.status !== 'Lunas')
  .map((row) => {
    const total = getRupiahNumber(row.total);
    const paid = row.paymentAmount ? getRupiahNumber(row.paymentAmount) : 0;
    const remaining = Math.max(0, total - paid);
    const due = row.dueDate?.trim() || '30 Apr 2026';
    const lastPayment = row.paymentAmount ? `${row.time} / ${row.paymentAmount}` : '-';

    return {
      invoice: row.invoice,
      customer: row.customer,
      customerName: row.customerName?.trim() || row.customer,
      cashier: row.cashier,
      total: row.total,
      paid: formatRupiahNumber(paid),
      remaining: formatRupiahNumber(remaining),
      method: row.method === 'Cicilan' ? 'Cicilan' : (row.method as Exclude<ReceivableMethodFilter, 'Semua metode'>),
      status: row.status === 'Cicilan' ? 'Cicilan' : 'Tagihan terbuka',
      due,
      time: row.time,
      phone: row.phone?.trim() || '-',
      address: row.address?.trim() || '-',
      projectName: row.projectName?.trim() || '-',
      reference: row.reference?.trim() || '-',
      note: row.note?.trim() || '-',
      lastPayment,
      paymentHistory: row.paymentAmount
        ? [
            {
              time: `${row.time} / ${row.paymentAmount}`,
              amount: row.paymentAmount,
              method: row.method === 'Cicilan' ? 'Cicilan' : 'Transfer',
              note: row.note?.trim() || 'Pembayaran sebagian',
            },
          ]
        : [],
    };
  });

const userSeedRows: UserRow[] = [
  {
    id: 'system-admin',
    name: 'Admin Toko',
    username: 'admin',
    role: 'Admin',
    status: 'Aktif',
    security: 'TOTP aktif',
    lastLogin: 'Hari ini 08:10',
    device: 'Desktop kasir utama',
    scope: 'Akses penuh',
  },
  {
    id: 'cashier-main',
    name: 'Kasir Utama',
    username: 'kasir01',
    role: 'Kasir',
    status: 'Aktif',
    security: 'Password',
    lastLogin: 'Hari ini 09:02',
    device: 'POS depan',
    scope: 'Kasir dan transaksi',
  },
  {
    id: 'supervisor-stock',
    name: 'Supervisor Gudang',
    username: 'spv-gudang',
    role: 'Supervisor',
    status: 'Aktif',
    security: 'Password',
    lastLogin: 'Kemarin 17:45',
    device: 'Admin stok',
    scope: 'Barang, stok, laporan',
  },
  {
    id: 'cashier-backup',
    name: 'Kasir Cadangan',
    username: 'kasir02',
    role: 'Kasir',
    status: 'Nonaktif',
    security: 'Reset diperlukan',
    lastLogin: 'Belum login',
    device: '-',
    scope: 'Kasir dan transaksi',
  },
];

const reportSalesTrend = [
  { day: 'Sen', omzet: 18.4, laba: 4.8 },
  { day: 'Sel', omzet: 22.1, laba: 5.6 },
  { day: 'Rab', omzet: 19.6, laba: 4.9 },
  { day: 'Kam', omzet: 25.3, laba: 6.8 },
  { day: 'Jum', omzet: 21.8, laba: 5.2 },
  { day: 'Sab', omzet: 31.2, laba: 8.1 },
  { day: 'Min', omzet: 27.5, laba: 7.4 },
];

const reportPaymentMix = [
  { method: 'Tunai', total: 42 },
  { method: 'Transfer', total: 28 },
  { method: 'QRIS', total: 16 },
  { method: 'Tempo', total: 14 },
];

const reportCategorySales = [
  { category: 'Semen', value: 34 },
  { category: 'Besi', value: 27 },
  { category: 'Pasir', value: 18 },
  { category: 'Cat', value: 13 },
  { category: 'Pipa', value: 8 },
];

const reportCashFlow = [
  { day: 'Sen', masuk: 18.4, keluar: 11.2 },
  { day: 'Sel', masuk: 22.1, keluar: 13.7 },
  { day: 'Rab', masuk: 19.6, keluar: 15.4 },
  { day: 'Kam', masuk: 25.3, keluar: 16.1 },
  { day: 'Jum', masuk: 21.8, keluar: 17.6 },
  { day: 'Sab', masuk: 31.2, keluar: 19.3 },
  { day: 'Min', masuk: 27.5, keluar: 14.8 },
];

const dashboardChartConfig = {
  sales: {
    label: 'Penjualan',
    color: 'var(--chart-1)',
  },
  count: {
    label: 'Frekuensi transaksi',
    color: 'var(--chart-2)',
  },
  omzet: {
    label: 'Omzet',
    color: 'var(--chart-1)',
  },
  laba: {
    label: 'Laba',
    color: 'var(--chart-2)',
  },
  total: {
    label: 'Total',
    color: 'var(--chart-3)',
  },
  value: {
    label: 'Nilai',
    color: 'var(--chart-4)',
  },
  masuk: {
    label: 'Kas masuk',
    color: 'var(--chart-2)',
  },
  keluar: {
    label: 'Kas keluar',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

export function PosView({
  alerts,
  data,
  sessionToken,
  sessionUser,
  sessionRolePermissions,
  onBusyChange,
}: {
  alerts: boolean;
  data: CanvasViewData;
  sessionToken?: string;
  sessionUser?: UserRow | null;
  sessionRolePermissions?: UserPermissionMap | null;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [activeMenu, setActiveMenu] = useState<PosMenuId>('Dashboard');
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: today,
      to: today,
    };
  });
  const [stockThreshold, setStockThreshold] = React.useState([20]);
  const [cashierSearch, setCashierSearch] = React.useState('');
  const [cashierCategoryFilter, setCashierCategoryFilter] = useState('Semua kategori');
  const [cashierCategoryFilterOpen, setCashierCategoryFilterOpen] = useState(false);
  const [cashierRecentSkus, setCashierRecentSkus] = useState<string[]>(() => ['8991204500033', '8991204500040']);
  const [cashierCart, setCashierCart] = useState<Record<string, number>>({});
  const [cashierPaymentMethod, setCashierPaymentMethod] = useState<CashierPaymentMethod>('Tunai');
  const [cashierPaymentStatus, setCashierPaymentStatus] = useState<CashierPaymentStatus>('Lunas');
  const [cashierDiscountMode, setCashierDiscountMode] = useState<CashierDiscountMode>('nominal');
  const [cashierPaymentAmount, setCashierPaymentAmount] = useState('');
  const [cashierDiscount, setCashierDiscount] = useState('');
  const cashierScanBufferRef = React.useRef('');
  const cashierScanTimesRef = React.useRef<number[]>([]);
  const cashierScanCandidateRef = React.useRef(false);
  const [cashierScanError, setCashierScanError] = useState('');
  const [cashierCalculatorOpen, setCashierCalculatorOpen] = useState(false);
  const [cashierCalculatorExpression, setCashierCalculatorExpression] = useState('');
  const [cashierCalculatorResult, setCashierCalculatorResult] = useState<number | null>(null);
  const [cashierCalculatorError, setCashierCalculatorError] = useState('');
  const [cashierCheckoutForm, setCashierCheckoutForm] = useState<CashierCheckoutForm>(defaultCashierCheckoutForm);
  const [cashierCheckoutOpen, setCashierCheckoutOpen] = useState(false);
  const [cashierSessionOpen, setCashierSessionOpen] = useState(false);
  const [cashierReceiptOpen, setCashierReceiptOpen] = useState(false);
  const [cashierReceiptPreview, setCashierReceiptPreview] = useState<CashierReceiptPreview | null>(null);
  const [cashierCheckoutSaving, setCashierCheckoutSaving] = useState(false);
  const [cashierCheckoutError, setCashierCheckoutError] = useState('');
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [catalogDeleteOpen, setCatalogDeleteOpen] = useState(false);
  const [catalogPrintOpen, setCatalogPrintOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [batchBarcodeOpen, setBatchBarcodeOpen] = useState(false);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [catalogMode, setCatalogMode] = useState<'create' | 'edit'>('create');
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogTargetSku, setCatalogTargetSku] = useState('');
  const [expandedCatalogSku, setExpandedCatalogSku] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [lowStockSearch, setLowStockSearch] = useState('');
  const [catalogSortKey, setCatalogSortKey] = useState<CatalogSortKey>('name');
  const [catalogSortDirection, setCatalogSortDirection] = useState<CatalogSortDirection>('asc');
  const [transactionSortKey, setTransactionSortKey] = useState<TransactionSortKey>('invoice');
  const [transactionSortDirection, setTransactionSortDirection] = useState<CatalogSortDirection>('desc');
  const [showSalesCatalogTrail, setShowSalesCatalogTrail] = useState(false);
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<TransactionStatusFilter>('Semua');
  const [transactionMethodFilter, setTransactionMethodFilter] = useState<TransactionMethodFilter>('Semua metode');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const [supplierDebtRowsData, setSupplierDebtRowsData] = useState<SupplierDebtRow[]>(() => hasCleanResetFlag() ? [] : supplierDebtSeedRows);
  const [debtStatusFilter, setDebtStatusFilter] = useState<SupplierDebtStatusFilter>('Semua');
  const [debtSearch, setDebtSearch] = useState('');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [supplierDebtDialogOpen, setSupplierDebtDialogOpen] = useState(false);
  const [supplierDebtDraft, setSupplierDebtDraft] = useState<SupplierDebtDraft>(createDefaultSupplierDebtDraft);
  const [supplierDebtError, setSupplierDebtError] = useState('');
  const [supplierDebtPaymentOpen, setSupplierDebtPaymentOpen] = useState(false);
  const [supplierDebtPaymentTargetId, setSupplierDebtPaymentTargetId] = useState('');
  const [supplierDebtPaymentAmount, setSupplierDebtPaymentAmount] = useState('');
  const [supplierDebtPaymentMethod, setSupplierDebtPaymentMethod] = useState<SupplierDebtPaymentMethod>('Tunai');
  const [supplierDebtPaymentNote, setSupplierDebtPaymentNote] = useState('');
  const [supplierDebtPaymentEditIndex, setSupplierDebtPaymentEditIndex] = useState<number | null>(null);
  const [supplierDebtPaymentError, setSupplierDebtPaymentError] = useState('');
  const [supplierDebtReceiptPreview, setSupplierDebtReceiptPreview] = useState<SupplierDebtReceiptPreview | null>(null);
  const [receivableRowsData, setReceivableRowsData] = useState<ReceivableRow[]>(() => hasCleanResetFlag() ? [] : receivableSeedRows);
  const [receivableStatusFilter, setReceivableStatusFilter] = useState<ReceivableStatusFilter>('Semua');
  const [receivableMethodFilter, setReceivableMethodFilter] = useState<ReceivableMethodFilter>('Semua metode');
  const [receivableSearch, setReceivableSearch] = useState('');
  const [receivablePage, setReceivablePage] = useState(1);
  const [receivableSortKey, setReceivableSortKey] = useState<ReceivableSortKey>('due');
  const [receivableSortDirection, setReceivableSortDirection] = useState<CatalogSortDirection>('asc');
  const [receivableExpandedInvoice, setReceivableExpandedInvoice] = useState<string | null>(null);
  const [receivablePaymentOpen, setReceivablePaymentOpen] = useState(false);
  const [receivablePaymentTargetInvoice, setReceivablePaymentTargetInvoice] = useState('');
  const [receivablePaymentMethod, setReceivablePaymentMethod] = useState<Exclude<ReceivableMethodFilter, 'Semua metode'>>('Tunai');
  const [receivablePaymentAmount, setReceivablePaymentAmount] = useState('');
  const [receivablePaymentNote, setReceivablePaymentNote] = useState('');
  const [receivablePaymentError, setReceivablePaymentError] = useState('');
  const [receivablePaymentEditIndex, setReceivablePaymentEditIndex] = useState<number | null>(null);
  const [receivableOverdueOnly, setReceivableOverdueOnly] = useState(false);
  const [receivableReceiptPreview, setReceivableReceiptPreview] = useState<ReceivableReceiptPreview | null>(null);
  const [stockHistoryFilter, setStockHistoryFilter] = useState<StockHistoryFilter>('Semua');
  const [stockHistorySearch, setStockHistorySearch] = useState('');
  const [stockHistoryPage, setStockHistoryPage] = useState(1);
  const [stockHistoryFilterOpen, setStockHistoryFilterOpen] = useState(false);
  const [reportTab, setReportTab] = useState<ReportTab>('sales');
  const [reportPrintPreview, setReportPrintPreview] = useState<ReportPrintPreview | null>(null);
  const [reportBackendData, setReportBackendData] = useState<ReportData | null>(null);
  const [databaseTab, setDatabaseTab] = useState<DatabaseTab>('health');
  const [databaseActionMessage, setDatabaseActionMessage] = useState<{ tone: DatabaseActionTone; text: string } | null>(null);
  const [databaseAutoBackupEnabled, setDatabaseAutoBackupEnabled] = useState(true);
  const [databaseHealth, setDatabaseHealth] = useState<DatabaseHealthPayload | null>(null);
  const [databaseBackupRows, setDatabaseBackupRows] = useState<DatabaseBackupRow[]>([]);
  const [databaseHardResetOpen, setDatabaseHardResetOpen] = useState(false);
  const [databaseHardResetConfirmation, setDatabaseHardResetConfirmation] = useState('');
  const [databaseHardResetReason, setDatabaseHardResetReason] = useState('');
  const [databaseHardResetSaving, setDatabaseHardResetSaving] = useState(false);
  const [databaseHardResetError, setDatabaseHardResetError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('Semua role');
  const [rolePermissionOpen, setRolePermissionOpen] = useState(false);
  const [userRowsData, setUserRowsData] = useState<UserRow[]>(userSeedRows);
  const [rolePermissionDraft, setRolePermissionDraft] = useState<Record<UserPermissionRole, PosMenuId[]>>(
    (sessionRolePermissions as Record<UserPermissionRole, PosMenuId[]> | null) ?? defaultRolePermissions
  );
  const [userActionMessage, setUserActionMessage] = useState<{ tone: DatabaseActionTone; text: string } | null>(null);
  const [totpDialogOpen, setTotpDialogOpen] = useState(false);
  const [totpSetupUser, setTotpSetupUser] = useState<UserRow | null>(null);
  const [totpManualKey, setTotpManualKey] = useState('');
  const [totpOtpAuthUrl, setTotpOtpAuthUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userDialogMode, setUserDialogMode] = useState<'create' | 'edit'>('create');
  const [userEditTargetId, setUserEditTargetId] = useState('');
  const [userDraftUsername, setUserDraftUsername] = useState('');
  const [userDraftName, setUserDraftName] = useState('');
  const [userDraftRole, setUserDraftRole] = useState<UserRow['role']>('Kasir');
  const [userDraftActive, setUserDraftActive] = useState(true);
  const [userDraftError, setUserDraftError] = useState('');
  const [userDeleteOpen, setUserDeleteOpen] = useState(false);
  const [userDeleteTarget, setUserDeleteTarget] = useState<UserRow | null>(null);
  const [userDeleteSaving, setUserDeleteSaving] = useState(false);
  const [userDeleteError, setUserDeleteError] = useState('');
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditRows, setAuditRows] = useState<AuditLogRow[]>([]);
  const [auditError, setAuditError] = useState('');
  const [settingTab, setSettingTab] = useState<SettingTab>('store');
  const [settingActionMessage, setSettingActionMessage] = useState<{ tone: DatabaseActionTone; text: string } | null>(null);
  const [settingStoreName, setSettingStoreName] = useState('TOKO BERSAMA MATERIAL');
  const [settingStoreAddress, setSettingStoreAddress] = useState('Jl. Raya Bangunan No. 88');
  const [settingStorePhone, setSettingStorePhone] = useState('0812-0000-7788');
  const [settingPrinterName, setSettingPrinterName] = useState('Thermal POS 80');
  const [settingPrinterBehavior, setSettingPrinterBehavior] = useState('Preview sebelum print');
  const [settingCashDrawerEnabled, setSettingCashDrawerEnabled] = useState(false);
  const [settingCashDrawerConnectionMode, setSettingCashDrawerConnectionMode] = useState<AppSettings['cashDrawer']['connectionMode']>('windows');
  const [settingCashDrawerPrinterName, setSettingCashDrawerPrinterName] = useState('POS-58');
  const [settingCashDrawerNetworkInterface, setSettingCashDrawerNetworkInterface] = useState('tcp://192.168.1.100:9100');
  const [settingCashDrawerPrinterType, setSettingCashDrawerPrinterType] = useState<AppSettings['cashDrawer']['printerType']>('EPSON');
  const [settingCashDrawerOpenOnCashCheckout, setSettingCashDrawerOpenOnCashCheckout] = useState(true);
  const [settingCashDrawerOpenOnReceivablePayment, setSettingCashDrawerOpenOnReceivablePayment] = useState(true);
  const [settingReceiptLayout, setSettingReceiptLayout] = useState<SettingReceiptLayoutConfig>(defaultSettingReceiptLayout);
  const [settingReceiptPreviewPaper, setSettingReceiptPreviewPaper] = useState<SettingReceiptPaper>('80');
  const [settingAppearanceMode, setSettingAppearanceMode] = useState<SettingAppearanceMode>(defaultSettingAppearance.mode);
  const [settingAppearanceScale, setSettingAppearanceScale] = useState<SettingAppearanceScale>(defaultSettingAppearance.scale);
  const [settingAppearanceTheme, setSettingAppearanceTheme] = useState<SettingAppearanceTheme>(() => {
    if (sessionUser?.username) {
      return readStoredPosThemeForUsername(sessionUser.username) ?? defaultUserAppearancePreference.theme;
    }
    return defaultUserAppearancePreference.theme;
  });
  const [userAppearancePreference, setUserAppearancePreference] = useState<UserAppearancePreference>(defaultUserAppearancePreference);
  const [storeLogoPreview, setStoreLogoPreview] = useState<string | null>(null);
  const [storeLogoFileName, setStoreLogoFileName] = useState('');
  const [storeLogoFileSizeKb, setStoreLogoFileSizeKb] = useState<number | null>(null);
  const [storeLogoError, setStoreLogoError] = useState('');
  const [expandedTransactionInvoice, setExpandedTransactionInvoice] = useState<string | null>(null);
  const [saleRevisionOpen, setSaleRevisionOpen] = useState(false);
  const [saleRevisionTarget, setSaleRevisionTarget] = useState<SaleRow | null>(null);
  const [saleRevisionItems, setSaleRevisionItems] = useState<Array<{ sku: string; name: string; unit: string; price: number; oldQty: number; qty: number }>>([]);
  const [saleRevisionReason, setSaleRevisionReason] = useState('');
  const [saleRevisionExpectedNo, setSaleRevisionExpectedNo] = useState(0);
  const [saleRevisionRows, setSaleRevisionRows] = useState<SaleRevisionRow[]>([]);
  const [saleRevisionError, setSaleRevisionError] = useState('');
  const [saleRevisionSaving, setSaleRevisionSaving] = useState(false);
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('Semua kategori');
  const [catalogCategoryFilterOpen, setCatalogCategoryFilterOpen] = useState(false);
  const [lowStockCategoryFilter, setLowStockCategoryFilter] = useState('Semua kategori');
  const [lowStockCategoryFilterOpen, setLowStockCategoryFilterOpen] = useState(false);
  const [categoryTarget, setCategoryTarget] = useState('');
  const [categoryNextName, setCategoryNextName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('paste');
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [importSaving, setImportSaving] = useState(false);
  const [batchSelectedSkus, setBatchSelectedSkus] = useState<string[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 6;
  const transactionPageSize = 7;
  const stockHistoryPageSize = 8;
  const [restockTargetSku, setRestockTargetSku] = useState('');
  const [restockQty, setRestockQty] = useState(0);
  const [restockSupplier, setRestockSupplier] = useState('');
  const [restockNote, setRestockNote] = useState('');
  const [restockSavingSku, setRestockSavingSku] = useState('');
  const [restockError, setRestockError] = useState('');
  const [stockActionMessage, setStockActionMessage] = useState<{ tone: DatabaseActionTone; text: string } | null>(null);
  const stockActionMessageTimer = React.useRef<number | null>(null);
  const navigateMenu = React.useCallback((nextMenu: PosMenuId) => {
    React.startTransition(() => setActiveMenu(nextMenu));
  }, []);
  const [catalogDraft, setCatalogDraft] = useState<QueueItem>({
    sku: '',
    name: '',
    category: '',
    qty: 0,
    unit: '',
    note: '',
    price: '',
  });
  const catalogDraftDuplicate = React.useMemo(
    () => findCatalogDraftDuplicate(catalogDraft, data.posCatalog, catalogMode === 'edit' ? catalogTargetSku : undefined),
    [catalogDraft, catalogMode, catalogTargetSku, data.posCatalog]
  );
  const catalogDraftDuplicateMessage = catalogDraftDuplicate
    ? `Barang dengan nama, kategori, dan satuan yang sama sudah ada: ${catalogDraftDuplicate.name} (${catalogDraftDuplicate.sku}).`
    : '';
  React.useEffect(() => () => {
    if (stockActionMessageTimer.current !== null) {
      window.clearTimeout(stockActionMessageTimer.current);
    }
  }, []);
  const pushStockActionMessage = (tone: DatabaseActionTone, text: string) => {
    setStockActionMessage({ tone, text });
    if (stockActionMessageTimer.current !== null) {
      window.clearTimeout(stockActionMessageTimer.current);
    }
    stockActionMessageTimer.current = window.setTimeout(() => {
      setStockActionMessage(null);
      stockActionMessageTimer.current = null;
    }, 3800);
  };
  const localFinanceEnabled = Boolean(window.tokobersama?.apiBaseUrl?.trim() || import.meta.env.VITE_POS_API_BASE_URL?.trim());
  const deferredCashierSearch = React.useDeferredValue(cashierSearch);
  const deferredCatalogSearch = React.useDeferredValue(catalogSearch);
  const deferredLowStockSearch = React.useDeferredValue(lowStockSearch);
  const deferredTransactionSearch = React.useDeferredValue(transactionSearch);
  const deferredDebtSearch = React.useDeferredValue(debtSearch);
  const deferredReceivableSearch = React.useDeferredValue(receivableSearch);
  const deferredStockHistorySearch = React.useDeferredValue(stockHistorySearch);
  const deferredUserSearch = React.useDeferredValue(userSearch);
  const selectedRangeBounds = React.useMemo(
    () => range?.from
      ? { start: startOfDay(range.from), end: endOfDay(range.to ?? range.from) }
      : null,
    [range?.from, range?.to]
  );
  const rangedStockHistoryRows = React.useMemo(
    () => data.stockHistoryRows.filter((row) => isDateInBounds(row.time, selectedRangeBounds)),
    [data.stockHistoryRows, selectedRangeBounds]
  );
  const cashierCategories = React.useMemo(
    () => ['Semua kategori', ...Array.from(new Set(data.posCatalog.map((item) => item.category))).sort((left, right) => left.localeCompare(right, 'id'))],
    [data.posCatalog]
  );
  const cashierCatalog = data.posCatalog.filter((item) => {
    const query = deferredCashierSearch.trim().toLowerCase();
    const matchesCategory = cashierCategoryFilter === 'Semua kategori' || item.category === cashierCategoryFilter;
    const matchesQuery = !query || [item.name, item.category, item.sku].join(' ').toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
  const cashierRecentItems = React.useMemo(
    () =>
      cashierRecentSkus
        .map((sku) => data.posCatalog.find((item) => item.sku === sku))
        .filter((item): item is QueueItem => Boolean(item))
        .slice(0, 6),
    [cashierRecentSkus, data.posCatalog]
  );
  const transactionRows = data.saleRows;
  const rangedTransactionRows = React.useMemo(
    () => transactionRows.filter((row) => isDateInBounds(row.time, selectedRangeBounds)),
    [selectedRangeBounds, transactionRows]
  );
  const rangedSupplierDebtRows = React.useMemo(
    () => supplierDebtRowsData.filter((row) => isDateInBounds(row.takeDate, selectedRangeBounds)),
    [selectedRangeBounds, supplierDebtRowsData]
  );
  const rangedReceivableRowsData = React.useMemo(
    () => receivableRowsData.filter((row) => isDateInBounds(row.time, selectedRangeBounds)),
    [receivableRowsData, selectedRangeBounds]
  );
  const transactionMethodOptions = React.useMemo(
    () =>
      ['Semua metode', ...Array.from(new Set(transactionRows.map((row) => row.method))).sort((left, right) => left.localeCompare(right, 'id'))] as TransactionMethodFilter[],
    [transactionRows]
  );
  const filteredTransactionRows = React.useMemo(
    () =>
      rangedTransactionRows.filter((row) => {
        const query = deferredTransactionSearch.trim().toLowerCase();
        const searchableText = [
          row.invoice,
          row.customer,
          row.customerName,
          row.cashier,
          row.method,
          row.status,
          row.reference,
          row.note,
          ...(row.items ?? []).flatMap((item) => [item.name, item.sku, item.unit]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchesMethod = transactionMethodFilter === 'Semua metode' || row.method === transactionMethodFilter;
        const matchesQuery = !query || searchableText.includes(query);

        if (!matchesMethod || !matchesQuery) {
          return false;
        }

        if (transactionStatusFilter === 'Semua') {
          return true;
        }

        if (transactionStatusFilter === 'DP') {
          return row.status === 'DP';
        }

        return row.status === transactionStatusFilter;
      }).sort((left, right) => compareTransactionValues(left, right, transactionSortKey, transactionSortDirection)),
    [deferredTransactionSearch, rangedTransactionRows, transactionMethodFilter, transactionSortDirection, transactionSortKey, transactionStatusFilter]
  );
  const transactionSummary = React.useMemo(
    () =>
      filteredTransactionRows.reduce(
        (summary, row) => {
          const total = getRupiahNumber(row.total);
          const paid = row.paymentAmount ? getRupiahNumber(row.paymentAmount) : row.status === 'Lunas' ? total : 0;
          const remaining = Math.max(0, total - paid);

          return {
            count: summary.count + 1,
            omzet: summary.omzet + total,
            paid: summary.paid + paid,
            remaining: summary.remaining + remaining,
            lunas: summary.lunas + (row.status === 'Lunas' ? 1 : 0),
          };
        },
        { count: 0, omzet: 0, paid: 0, remaining: 0, lunas: 0 }
      ),
    [filteredTransactionRows]
  );
  const transactionPageCount = Math.max(1, Math.ceil(filteredTransactionRows.length / transactionPageSize));
  const transactionPageStart = filteredTransactionRows.length === 0 ? 0 : (transactionPage - 1) * transactionPageSize + 1;
  const transactionPageEnd = Math.min(transactionPage * transactionPageSize, filteredTransactionRows.length);
  const paginatedTransactionRows = React.useMemo(
    () => filteredTransactionRows.slice((transactionPage - 1) * transactionPageSize, transactionPage * transactionPageSize),
    [filteredTransactionRows, transactionPage]
  );
  const filteredDebtRows = React.useMemo(
    () => {
      const query = deferredDebtSearch.trim().toLowerCase();

      return rangedSupplierDebtRows.filter((row) => {
        const visibleStatus = isSupplierDebtOverdue(row) ? 'Overdue' : row.status;
        const matchesStatus = debtStatusFilter === 'Semua' || visibleStatus === debtStatusFilter;
        const searchableText = [
          row.id,
          row.supplier,
          row.takeDate,
          row.due,
          row.status,
          row.note,
          ...row.items.flatMap((item) => [item.name, item.category, item.unit]),
          ...row.paymentHistory.flatMap((payment) => [payment.amount, payment.method, payment.receiver, payment.note, payment.time]),
        ]
          .join(' ')
          .toLowerCase();

        return matchesStatus && (!query || searchableText.includes(query));
      });
    },
    [deferredDebtSearch, debtStatusFilter, rangedSupplierDebtRows]
  );
  const debtSummary = React.useMemo(
    () =>
      filteredDebtRows.reduce(
        (summary, row) => ({
          count: summary.count + 1,
          total: summary.total + getRupiahNumber(row.total),
          paid: summary.paid + getRupiahNumber(row.paid),
          remaining: summary.remaining + getRupiahNumber(row.remaining),
          overdue: summary.overdue + (isSupplierDebtOverdue(row) ? 1 : 0),
        }),
        { count: 0, total: 0, paid: 0, remaining: 0, overdue: 0 }
      ),
    [filteredDebtRows]
  );
  const receivableRows = React.useMemo(() => {
    const query = deferredReceivableSearch.trim().toLowerCase();

    return rangedReceivableRowsData
      .filter((row) => row.status !== 'Lunas')
      .filter((row) => {
        const matchesStatus = receivableStatusFilter === 'Semua' || row.status === receivableStatusFilter;
        const matchesMethod = receivableMethodFilter === 'Semua metode' || row.method === receivableMethodFilter;
        const matchesOverdue = !receivableOverdueOnly || isReceivableOverdue(row);
        const searchableText = [
          row.invoice,
          row.customer,
          row.customerName,
          row.cashier,
          row.method,
          row.status,
          row.due,
          row.reference,
          row.note,
          row.phone,
          row.address,
          row.projectName,
          row.lastPayment,
          ...row.paymentHistory.flatMap((payment) => [payment.amount, payment.method, payment.note, payment.time]),
        ]
          .join(' ')
          .toLowerCase();
        const matchesQuery = !query || searchableText.includes(query);

        return matchesStatus && matchesMethod && matchesOverdue && matchesQuery;
      })
      .sort((left, right) => compareReceivableValues(left, right, receivableSortKey, receivableSortDirection));
  }, [deferredReceivableSearch, rangedReceivableRowsData, receivableMethodFilter, receivableOverdueOnly, receivableSortDirection, receivableSortKey, receivableStatusFilter]);
  const filteredReceivableRows = receivableRows;
  const receivablePageCount = Math.max(1, Math.ceil(filteredReceivableRows.length / 7));
  const receivablePageSize = 7;
  const receivablePageStart = filteredReceivableRows.length === 0 ? 0 : (receivablePage - 1) * receivablePageSize + 1;
  const receivablePageEnd = Math.min(receivablePage * receivablePageSize, filteredReceivableRows.length);
  const paginatedReceivableRows = React.useMemo(
    () => filteredReceivableRows.slice((receivablePage - 1) * receivablePageSize, receivablePage * receivablePageSize),
    [filteredReceivableRows, receivablePage]
  );
  const receivableSummary = React.useMemo(
    () =>
      filteredReceivableRows.reduce(
        (summary, row) => {
          const total = getRupiahNumber(row.total);
          const paid = getRupiahNumber(row.paid);
          const remaining = getRupiahNumber(row.remaining);

          return {
            count: summary.count + 1,
            total: summary.total + total,
            paid: summary.paid + paid,
            remaining: summary.remaining + remaining,
            partial: summary.partial + (row.status === 'Cicilan' || row.status === 'Tertagih sebagian' ? 1 : 0),
          };
        },
        { count: 0, total: 0, paid: 0, remaining: 0, partial: 0 }
      ),
    [filteredReceivableRows]
  );
  const cashierDraftRows = data.cashierSessionRows.filter((row) => row.kind === 'Draft');
  const cashierHoldRows = data.cashierSessionRows.filter((row) => row.kind === 'Tertahan');
  const cashierCartItems = React.useMemo(
    () =>
      Object.entries(cashierCart)
        .map(([sku, qty]) => {
          const item = data.posCatalog.find((entry) => entry.sku === sku);
          return item ? { item, qty } : null;
        })
        .filter((entry): entry is { item: QueueItem; qty: number } => Boolean(entry)),
    [cashierCart, data.posCatalog]
  );
  const cashierSubtotal = cashierCartItems.reduce((total, entry) => total + getRupiahNumber(entry.item.price) * entry.qty, 0);
  const cashierDiscountValue = cashierDiscountMode === 'percent'
    ? Math.max(0, Math.min(cashierSubtotal, (Number(cashierDiscount.replace(/[^\d]/g, '')) / 100) * cashierSubtotal))
    : Math.max(0, Math.min(cashierSubtotal, getRupiahNumber(cashierDiscount)));
  const cashierGrandTotal = Math.max(0, cashierSubtotal - cashierDiscountValue);
  const cashierPaidValue = cashierPaymentAmount.trim()
    ? getRupiahNumber(cashierPaymentAmount)
    : cashierPaymentStatus === 'Lunas'
      ? cashierGrandTotal
      : 0;
  const cashierRemaining = Math.max(0, cashierGrandTotal - cashierPaidValue);
  const cashierChange = Math.max(0, cashierPaidValue - cashierGrandTotal);
  const catalogRows = React.useMemo(() => {
    const query = deferredCatalogSearch.trim().toLowerCase();
    const filtered = data.posCatalog.filter((item) => {
      const matchesCategory = catalogCategoryFilter === 'Semua kategori' || item.category === catalogCategoryFilter;
      const matchesQuery = !query || [item.name, item.category, item.unit, item.sku].join(' ').toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });

    return filtered.slice().sort((left, right) => compareCatalogValues(left, right, catalogSortKey, catalogSortDirection));
  }, [catalogCategoryFilter, catalogSortDirection, catalogSortKey, data.posCatalog, deferredCatalogSearch]);
  const catalogPageCount = Math.max(1, Math.ceil(catalogRows.length / catalogPageSize));
  const catalogPageStart = catalogRows.length === 0 ? 0 : (catalogPage - 1) * catalogPageSize + 1;
  const catalogPageEnd = Math.min(catalogPage * catalogPageSize, catalogRows.length);
  const paginatedCatalogRows = React.useMemo(
    () => catalogRows.slice((catalogPage - 1) * catalogPageSize, catalogPage * catalogPageSize),
    [catalogPage, catalogRows]
  );
  const categorySummary = React.useMemo(() => {
    const summary = new Map<string, number>();
    data.posCatalog.forEach((item) => {
      summary.set(item.category, (summary.get(item.category) || 0) + 1);
    });

    return Array.from(summary.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => left.name.localeCompare(right.name, 'id'));
  }, [data.posCatalog]);
  const catalogCategories = React.useMemo(
    () => ['Semua kategori', ...Array.from(new Set(data.posCatalog.map((item) => item.category))).sort((left, right) => left.localeCompare(right, 'id'))],
    [data.posCatalog]
  );
  const selectedBatchItems = React.useMemo(
    () => data.posCatalog.filter((item) => batchSelectedSkus.includes(item.sku)),
    [batchSelectedSkus, data.posCatalog]
  );
  const lowStockItems = React.useMemo(() => {
    const query = deferredLowStockSearch.trim().toLowerCase();
    return data.posCatalog
      .filter((item) => item.qty <= stockThreshold[0])
      .filter((item) => {
        const matchesCategory = lowStockCategoryFilter === 'Semua kategori' || item.category === lowStockCategoryFilter;
        const matchesQuery = !query || [item.name, item.category, item.unit].join(' ').toLowerCase().includes(query);
        return matchesCategory && matchesQuery;
      })
      .sort((left, right) => left.qty - right.qty);
  }, [data.posCatalog, deferredLowStockSearch, lowStockCategoryFilter, stockThreshold]);
  const lowStockCount = lowStockItems.length;
  const restockTargetItem = data.posCatalog.find((item) => item.sku === restockTargetSku) || lowStockItems[0] || null;
  const stockHistoryRows = React.useMemo(() => {
    const query = deferredStockHistorySearch.trim().toLowerCase();

    return rangedStockHistoryRows.filter((row) => {
      const matchesFilter = stockHistoryFilter === 'Semua' || row.event === stockHistoryFilter;
      const matchesSearch =
        !query ||
        [row.item, row.note, row.time, row.movement, row.event, row.operator, row.source].join(' ').toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [deferredStockHistorySearch, rangedStockHistoryRows, stockHistoryFilter]);
  const stockHistorySummary = React.useMemo(() => {
    const netMovement = rangedStockHistoryRows.reduce((total, row) => total + (Number(row.movement) || 0), 0);
    const restokCount = rangedStockHistoryRows.filter((row) => row.event === 'Restok').length;
    const salesCount = rangedStockHistoryRows.filter((row) => row.event === 'Penjualan').length;
    const manualCount = rangedStockHistoryRows.length - salesCount;

    return {
      total: rangedStockHistoryRows.length,
      restokCount,
      salesCount,
      manualCount,
      netMovement,
    };
  }, [rangedStockHistoryRows]);
  const databaseExportStamp = format(new Date(), 'yyyyMMdd-HHmm');
  const databaseEntityStats = React.useMemo(() => {
    const transactionItemCount = transactionRows.reduce((total, row) => total + (row.items?.length ?? row.itemsCount), 0);
    const openReceivableCount = receivableRowsData.filter((row) => row.status !== 'Lunas').length;
    const openDebtCount = supplierDebtRowsData.filter((row) => getRupiahNumber(row.remaining) > 0).length;

    return [
      { label: 'Barang', value: data.posCatalog.length, icon: Package, className: 'border-sky-500/20 bg-sky-500/8' },
      { label: 'Kategori', value: categorySummary.length, icon: Tags, className: 'border-cyan-500/20 bg-cyan-500/8' },
      { label: 'Transaksi', value: transactionRows.length, icon: ReceiptText, className: 'border-emerald-500/20 bg-emerald-500/8' },
      { label: 'Item transaksi', value: transactionItemCount, icon: ShoppingCart, className: 'border-lime-500/20 bg-lime-500/8' },
      { label: 'Riwayat stok', value: data.stockHistoryRows.length, icon: History, className: 'border-amber-500/20 bg-amber-500/8' },
      { label: 'Piutang terbuka', value: openReceivableCount, icon: HandCoins, className: 'border-orange-500/20 bg-orange-500/8' },
      { label: 'Hutang supplier', value: openDebtCount, icon: Landmark, className: 'border-rose-500/20 bg-rose-500/8' },
      { label: 'Sesi kasir', value: cashierDraftRows.length + cashierHoldRows.length, icon: ClipboardList, className: 'border-violet-500/20 bg-violet-500/8' },
    ];
  }, [cashierDraftRows.length, cashierHoldRows.length, categorySummary.length, data.posCatalog.length, data.stockHistoryRows.length, receivableRowsData, supplierDebtRowsData, transactionRows]);
  const databaseSizeEstimate = React.useMemo(() => {
    const totalRows = databaseEntityStats.reduce((total, item) => total + item.value, 0);
    const estimateMb = Math.max(2.4, totalRows * 0.018 + data.posCatalog.length * 0.012 + data.stockHistoryRows.length * 0.01);

    return `${estimateMb.toFixed(1)} MB`;
  }, [data.posCatalog.length, data.stockHistoryRows.length, databaseEntityStats]);
  const databaseBackupFallbackRows = React.useMemo<DatabaseBackupRow[]>(
    () => [
      {
        file: `TOKO-BERSAMA-backup-${databaseExportStamp}.db`,
        time: 'Hari ini 17.30',
        size: databaseSizeEstimate,
        status: 'Valid',
        note: 'Backup cepat terakhir',
        latest: false,
      },
      {
        file: 'TOKO-BERSAMA-backup-20260428-2130.db',
        time: '28 Apr 2026 21.30',
        size: '8.8 MB',
        status: 'Valid',
        note: 'Selesai tutup toko',
        latest: false,
      },
      {
        file: 'TOKO-BERSAMA-auto-latest.db',
        time: 'Harian 21.00',
        size: databaseSizeEstimate,
        status: 'Valid',
        note: 'Backup otomatis ditimpa setiap run',
        latest: true,
      },
    ],
    [databaseExportStamp, databaseSizeEstimate]
  );
  const databaseHealthFallback = React.useMemo<DatabaseHealthPayload>(() => ({
    ok: true,
    database: 'ok',
    time: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    schemaVersion: 'local',
    journalMode: 'WAL',
    dbPath: 'Folder data lokal aplikasi',
    backupDir: 'Folder backup lokal',
  }), []);
  const databaseBackupVisibleRows = databaseBackupRows.length ? databaseBackupRows : databaseBackupFallbackRows;
  const databaseHealthVisible = databaseHealth ?? databaseHealthFallback;
  const databaseMutationCount = data.stockHistoryRows.length + transactionRows.length + supplierDebtRowsData.length + receivableRowsData.length;
  const databaseNextBackupLabel = databaseAutoBackupEnabled ? 'Harian 21.00' : 'Nonaktif';
  const handleDatabaseAction = (text: string, tone: DatabaseActionTone = 'success') => {
    setDatabaseActionMessage({ text, tone });
  };
  const refreshDatabaseBackups = async () => {
    const nextRows = await posApi.listDatabaseBackups();
    setDatabaseBackupRows(nextRows);
  };
  const performDatabaseBackup = async (mode: 'latest' | 'archive', successText: string) => {
    try {
      const item = await posApi.createDatabaseBackup(mode);
      const nextRows = await posApi.listDatabaseBackups();
      setDatabaseBackupRows(nextRows);
      handleDatabaseAction(`${item.file} ${successText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal membuat backup database.';
      handleDatabaseAction(message, 'danger');
    }
  };
  const performDatabaseRestore = async (file: string) => {
    try {
      await posApi.restoreDatabaseBackup(file, {
        confirmation: 'RESTORE',
        reason: `Restore backup ${file} dari halaman Database.`,
      });
      const nextRows = await posApi.listDatabaseBackups();
      setDatabaseBackupRows(nextRows);
      handleDatabaseAction(`${file} dipulihkan. Snapshot sebelumnya sudah dibackup dan sesi dicabut.`);
      window.dispatchEvent(new CustomEvent(posApi.authExpiredEventName, {
        detail: {
          message: 'Restore database selesai. Silakan login ulang untuk memuat snapshot terbaru.',
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal restore backup database.';
      handleDatabaseAction(message, 'danger');
    }
  };
  const performDatabaseDelete = async (file: string) => {
    try {
      await posApi.deleteDatabaseBackup(file);
      const nextRows = await posApi.listDatabaseBackups();
      setDatabaseBackupRows(nextRows);
      handleDatabaseAction(`Backup ${file} dihapus.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menghapus backup database.';
      handleDatabaseAction(message, 'danger');
    }
  };
  const performDatabaseMaintenance = async (action: 'integrity' | 'vacuum' | 'checkpoint') => {
    try {
      if (action === 'integrity') {
        const health = await posApi.checkDatabaseHealth();
        setDatabaseHealth(health);
        handleDatabaseAction(health.ok ? `Integrity check berhasil. Schema ${health.schemaVersion}.` : 'Integrity check mendeteksi masalah.', health.ok ? 'success' : 'danger');
        return;
      }

      if (action === 'vacuum') {
        const payload = await posApi.runDatabaseVacuum();
        handleDatabaseAction(payload.message);
        return;
      }

      const payload = await posApi.runDatabaseCheckpoint();
      handleDatabaseAction(payload.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menjalankan maintenance database.';
      handleDatabaseAction(message, 'danger');
    }
  };
  const resetSettingsToDefault = async () => {
    try {
      const defaultSettings: AppSettings = {
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
          layout: defaultSettingReceiptLayout,
          previewPaper: '80',
        },
        appearance: {
          ...defaultSettingAppearance,
        },
      };

      applyAppSettings(defaultSettings);
      await posApi.updateAppSettings(defaultSettings);
      handleSettingAction('Setting dikembalikan ke standar.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mereset setting.';
      handleSettingAction(message, 'danger');
    }
  };
  const resetHardResetDialog = () => {
    setDatabaseHardResetConfirmation('');
    setDatabaseHardResetReason('');
    setDatabaseHardResetError('');
    setDatabaseHardResetSaving(false);
  };
  const performDatabaseHardReset = async () => {
    if (databaseHardResetConfirmation !== 'RESET') {
      setDatabaseHardResetError('Ketik RESET dengan huruf besar untuk menjalankan hard reset.');
      return;
    }

    setDatabaseHardResetSaving(true);
    setDatabaseHardResetError('');
    try {
      const payload = await posApi.hardResetDatabase({
        confirmation: 'RESET',
        reason: databaseHardResetReason.trim() || 'Hard reset database dari halaman Database.',
      }, {
        authToken: sessionToken,
      });
      setDatabaseBackupRows((current) => [payload.backup, ...current.filter((row) => row.file !== payload.backup.file)]);
      window.localStorage.setItem(cleanResetStorageKey, '1');
      window.localStorage.removeItem(mockWorkspaceStorageKey);
      window.localStorage.removeItem(mockSettingsStorageKey);
      window.localStorage.removeItem(mockUsersStorageKey);
      setDatabaseHardResetOpen(false);
      resetHardResetDialog();
      window.dispatchEvent(new CustomEvent(posApi.authExpiredEventName, {
        detail: {
          message: `${payload.message} Silakan login ulang untuk memuat snapshot kosong.`,
        },
      }));
    } catch (error) {
      setDatabaseHardResetError(error instanceof Error ? error.message : 'Hard reset gagal dijalankan.');
    } finally {
      setDatabaseHardResetSaving(false);
    }
  };
  const handleSettingAction = (text: string, tone: DatabaseActionTone = 'success') => {
    setSettingActionMessage({ text, tone });
  };
  const applyAppSettings = (settings: AppSettings) => {
    setSettingStoreName(settings.store.name);
    setSettingStoreAddress(settings.store.address);
    setSettingStorePhone(settings.store.phone);
    setSettingPrinterName(settings.printer.activePrinter);
    setSettingPrinterBehavior(settings.printer.behavior);
    setSettingCashDrawerEnabled(settings.cashDrawer?.enabled ?? false);
    setSettingCashDrawerConnectionMode(settings.cashDrawer?.connectionMode ?? 'windows');
    setSettingCashDrawerPrinterName(settings.cashDrawer?.printerName ?? 'POS-58');
    setSettingCashDrawerNetworkInterface(settings.cashDrawer?.networkInterface ?? settings.cashDrawer?.interface ?? 'tcp://192.168.1.100:9100');
    setSettingCashDrawerPrinterType(settings.cashDrawer?.printerType ?? 'EPSON');
    setSettingCashDrawerOpenOnCashCheckout(settings.cashDrawer?.openOnCashCheckout ?? true);
    setSettingCashDrawerOpenOnReceivablePayment(settings.cashDrawer?.openOnReceivablePayment ?? true);
    setSettingReceiptLayout(settings.receipt.layout);
    setSettingReceiptPreviewPaper(settings.receipt.previewPaper);
    setSettingAppearanceMode(settings.appearance?.mode ?? defaultSettingAppearance.mode);
    setSettingAppearanceScale(settings.appearance?.scale ?? defaultSettingAppearance.scale);
    setStoreLogoPreview(settings.store.logoDataUrl);
    setStoreLogoFileName(settings.store.logoFileName);
    setStoreLogoFileSizeKb(settings.store.logoFileSizeKb);
    setStoreLogoError('');
  };
  const buildAppSettingsPayload = (): AppSettings => ({
    store: {
      name: settingStoreName,
      address: settingStoreAddress,
      phone: settingStorePhone,
      logoDataUrl: storeLogoPreview,
      logoFileName: storeLogoFileName,
      logoFileSizeKb: storeLogoFileSizeKb,
    },
    printer: {
      activePrinter: settingPrinterName,
      behavior: settingPrinterBehavior,
      paper: settingReceiptPreviewPaper,
    },
    cashDrawer: {
      enabled: settingCashDrawerEnabled,
      interface: settingCashDrawerConnectionMode === 'network' ? settingCashDrawerNetworkInterface : `printer:${settingCashDrawerPrinterName}`,
      connectionMode: settingCashDrawerConnectionMode,
      printerName: settingCashDrawerPrinterName,
      networkInterface: settingCashDrawerNetworkInterface,
      printerType: settingCashDrawerPrinterType,
      openOnCashCheckout: settingCashDrawerOpenOnCashCheckout,
      openOnReceivablePayment: settingCashDrawerOpenOnReceivablePayment,
    },
    receipt: {
      layout: settingReceiptLayout,
      previewPaper: settingReceiptPreviewPaper,
    },
    appearance: {
      mode: settingAppearanceMode,
      scale: settingAppearanceScale,
    },
  });
  const syncAppSettings = async (silent = false) => {
    try {
      const nextSettings = await posApi.getAppSettings();
      applyAppSettings(nextSettings);
      if (!silent) {
        handleSettingAction('Setting tersinkron dari local-api.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memuat setting.';
      handleSettingAction(message, 'danger');
    }
  };
  const saveAppSettings = async () => {
    try {
      const nextSettings = await posApi.updateAppSettings(buildAppSettingsPayload());
      applyAppSettings(nextSettings);
      handleSettingAction(localFinanceEnabled ? 'Setting berhasil disimpan ke local-api.' : 'Setting berhasil disimpan.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan setting.';
      handleSettingAction(message, 'danger');
    }
  };
  const testCashDrawer = async () => {
    try {
      await posApi.updateAppSettings(buildAppSettingsPayload());
      const result = await posApi.openCashDrawer({ force: true });
      handleSettingAction(result.message, result.opened ? 'success' : 'warning');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cash drawer gagal dibuka.';
      handleSettingAction(message, 'danger');
    }
  };
  const applyAppearanceSettings = (mode: SettingAppearanceMode, scale: SettingAppearanceScale, theme = settingAppearanceTheme) => {
    setSettingAppearanceMode(mode);
    setSettingAppearanceScale(scale);
    setSettingAppearanceTheme(theme);
  };
  React.useEffect(() => {
    const nextAppearance = {
      mode: settingAppearanceMode,
      scale: settingAppearanceScale,
      theme: settingAppearanceTheme,
    };
    applyDocumentAppearance('pos', nextAppearance);
    writeStoredAppearance('pos', {
      mode: settingAppearanceMode,
      scale: settingAppearanceScale,
    });

    if (sessionUser?.username) {
      writeStoredPosThemeForUsername(sessionUser.username, settingAppearanceTheme);
    }
  }, [sessionUser?.username, settingAppearanceMode, settingAppearanceScale, settingAppearanceTheme]);

  React.useEffect(() => {
    if (!sessionUser?.username) {
      return;
    }

    let active = true;

    const loadAppearancePreference = async () => {
      try {
        const next = await posApi.getMyAppearancePreference();
        if (!active) {
          return;
        }

        setUserAppearancePreference(next);
        setSettingAppearanceTheme(next.theme ?? defaultUserAppearancePreference.theme);
        writeStoredPosThemeForUsername(sessionUser.username, next.theme ?? defaultUserAppearancePreference.theme);
      } catch {
        if (active) {
          setUserAppearancePreference(defaultUserAppearancePreference);
        }
      }
    };

    void loadAppearancePreference();
    return () => {
      active = false;
    };
  }, [sessionUser?.username]);

  const handleAppearanceThemeChange = async (theme: SettingAppearanceTheme) => {
    setSettingAppearanceTheme(theme);
    const nextPreference = {
      ...userAppearancePreference,
      theme,
    };
    setUserAppearancePreference(nextPreference);
    if (sessionUser?.username) {
      writeStoredPosThemeForUsername(sessionUser.username, theme);
    }

    try {
      const saved = await posApi.updateMyAppearancePreference(nextPreference);
      setUserAppearancePreference(saved);
      if (sessionUser?.username) {
        writeStoredPosThemeForUsername(sessionUser.username, saved.theme);
      }
      handleSettingAction(`Tema dipilih: ${posThemeOptions.find((item) => item.value === theme)?.label ?? theme}.`);
    } catch (error) {
      handleSettingAction(error instanceof Error ? error.message : 'Tema gagal disimpan.', 'danger');
    }
  };
  const handleStoreLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!storeLogoAcceptedTypes.includes(file.type)) {
      setStoreLogoError('Format logo wajib PNG, JPG, atau WEBP.');
      handleSettingAction('Upload logo ditolak: format file tidak didukung.', 'warning');
      event.target.value = '';
      return;
    }

    if (file.size > storeLogoMaxSizeBytes) {
      setStoreLogoError(`Ukuran logo maksimal ${storeLogoMaxSizeKb} KB. Kompres file sebelum upload.`);
      handleSettingAction(`Upload logo ditolak: ukuran melebihi ${storeLogoMaxSizeKb} KB.`, 'warning');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      setStoreLogoError('Gagal membaca file logo. Coba pilih file lain.');
      handleSettingAction('Gagal membaca file logo.', 'danger');
    };
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setStoreLogoError('File logo tidak valid.');
        handleSettingAction('Upload logo ditolak: file tidak valid.', 'warning');
        return;
      }

      setStoreLogoPreview(reader.result);
      setStoreLogoFileName(file.name);
      setStoreLogoFileSizeKb(Math.max(1, Math.ceil(file.size / 1024)));
      setStoreLogoError('');
      handleSettingAction(`Logo toko dipilih: ${file.name}.`);
    };
    reader.readAsDataURL(file);
  };
  const clearStoreLogo = () => {
    setStoreLogoPreview(null);
    setStoreLogoFileName('');
    setStoreLogoFileSizeKb(null);
    setStoreLogoError('');
    handleSettingAction('Logo toko dihapus dari draft setting.', 'warning');
  };
  const applyReceiptTemplatePreset = (template: SettingReceiptTemplate) => {
    const preset: Record<SettingReceiptTemplate, SettingReceiptLayoutConfig> = {
      compact: {
        template,
        density: 'compact',
        fontSize: 'small',
        sections: {
          ...defaultSettingReceiptSections,
          logo: false,
          customerInfo: false,
          itemMeta: true,
          discount: true,
        },
      },
      standard: {
        template,
        density: 'normal',
        fontSize: 'medium',
        sections: defaultSettingReceiptSections,
      },
      detail: {
        template,
        density: 'normal',
        fontSize: 'medium',
        sections: {
          ...defaultSettingReceiptSections,
          logo: true,
          customerInfo: true,
          itemMeta: true,
        },
      },
    };

    setSettingReceiptLayout(preset[template]);
    handleSettingAction(`Template struk ${template} diterapkan ke preview.`);
  };
  const toggleReceiptSection = (section: SettingReceiptSectionKey) => {
    setSettingReceiptLayout((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [section]: !current.sections[section],
      },
    }));
  };
  const settingReceiptSampleDocument = React.useMemo<ReceiptPreviewDocumentData>(
    () => ({
      ...defaultReceiptPreviewDocument,
      storeName: settingStoreName.trim() || defaultReceiptPreviewDocument.storeName,
      storeAddress: settingStoreAddress.trim() || defaultReceiptPreviewDocument.storeAddress,
      storePhone: settingStorePhone.trim() || defaultReceiptPreviewDocument.storePhone,
    }),
    [settingStoreAddress, settingStoreName, settingStorePhone]
  );
  const settingReceiptPreviewModels = React.useMemo<SettingReceiptPreviewModel[]>(
    () => [
      {
        paper: '58',
        label: '58mm',
        note: 'Thermal kecil',
        paperWidth: '48mm printable',
        widthPx: 181,
        heightPx: 760,
        badge: '1:1 live',
        html: buildSettingReceiptPreviewHtml('58', settingReceiptLayout, settingReceiptSampleDocument),
      },
      {
        paper: '80',
        label: '80mm',
        note: 'Thermal standar',
        paperWidth: '76mm printable',
        widthPx: 287,
        heightPx: 760,
        badge: '1:1 live',
        html: buildSettingReceiptPreviewHtml('80', settingReceiptLayout, settingReceiptSampleDocument),
      },
      {
        paper: 'cf',
        label: 'Continuous form',
        note: 'CF 9.5 x 11 inch',
        paperWidth: '217mm printable',
        widthPx: 821,
        heightPx: 920,
        badge: '1:1 live',
        html: buildSettingReceiptPreviewHtml('cf', settingReceiptLayout, settingReceiptSampleDocument),
      },
    ],
    [settingReceiptLayout, settingReceiptSampleDocument]
  );
  const activeSettingReceiptPreview =
    settingReceiptPreviewModels.find((model) => model.paper === settingReceiptPreviewPaper) ?? settingReceiptPreviewModels[1];
  const rangeLabel = range?.from
    ? `${format(range.from, 'dd MMM yyyy')} - ${range?.to ? format(range.to, 'dd MMM yyyy') : 'open'}`
    : 'Semua data';
  const localReportSummary = React.useMemo(() => {
    const allLowStockItems = data.posCatalog.filter((item) => item.qty <= stockThreshold[0]);
    const criticalStockItems = data.posCatalog.filter((item) => item.qty <= Math.max(1, Math.floor(stockThreshold[0] / 2)));
    const receivableRemaining = rangedReceivableRowsData.reduce((total, row) => total + getRupiahNumber(row.remaining), 0);
    const debtRemaining = rangedSupplierDebtRows.reduce((total, row) => total + getRupiahNumber(row.remaining), 0);
    const debtOverdue = rangedSupplierDebtRows.filter((row) => isSupplierDebtOverdue(row)).length;
    const receivableOverdue = rangedReceivableRowsData.filter((row) => isReceivableOverdue(row)).length;

    return {
      omzet: transactionSummary.omzet,
      paid: transactionSummary.paid,
      receivableRemaining,
      debtRemaining,
      transactionCount: transactionSummary.count,
      lowStockCount: allLowStockItems.length,
      criticalStockCount: criticalStockItems.length,
      debtOverdue,
      receivableOverdue,
    };
  }, [data.posCatalog, rangedReceivableRowsData, rangedSupplierDebtRows, stockThreshold, transactionSummary]);
  const localReportTransactionTrend = React.useMemo(() => {
    const parsedRange = selectedRangeBounds;
    const bucketMap = new Map<string, { label: string; omzet: number; masuk: number; sortKey: number }>();

    if (parsedRange) {
      eachDayOfInterval(parsedRange).forEach((day) => {
        const key = format(day, 'yyyy-MM-dd');
        bucketMap.set(key, {
          label: format(day, 'dd MMM'),
          omzet: 0,
          masuk: 0,
          sortKey: day.getTime(),
        });
      });
    }

    rangedTransactionRows.forEach((row) => {
      const parsedDate = parseDisplayDate(row.time);
      const bucketDate = parsedDate ?? parsedRange?.start ?? new Date();

      const key = format(bucketDate, 'yyyy-MM-dd');
      const existing = bucketMap.get(key) ?? {
        label: format(bucketDate, 'dd MMM'),
        omzet: 0,
        masuk: 0,
        sortKey: bucketDate.getTime(),
      };
      const total = getRupiahNumber(row.total);
      const paid = row.paymentAmount ? getRupiahNumber(row.paymentAmount) : row.status === 'Lunas' ? total : 0;

      existing.omzet += Number((total / 1000000).toFixed(2));
      existing.masuk += Number((paid / 1000000).toFixed(2));
      existing.sortKey = bucketDate.getTime();
      bucketMap.set(key, existing);
    });

    const rows = Array.from(bucketMap.values()).sort((left, right) => left.sortKey - right.sortKey).map(({ sortKey, ...item }) => item);

    return rows.length ? rows : reportSalesTrend.map((item) => ({ label: item.day, omzet: item.omzet, masuk: item.laba }));
  }, [rangedTransactionRows, selectedRangeBounds]);
  const localReportPaymentDistribution = React.useMemo(() => {
    const summary = new Map<string, number>();
    rangedTransactionRows.forEach((row) => {
      const total = getRupiahNumber(row.total);
      summary.set(row.method, (summary.get(row.method) || 0) + total);
    });

    const rows = Array.from(summary.entries())
      .map(([method, total]) => ({ method, total: Number((total / 1000000).toFixed(2)) }))
      .sort((left, right) => right.total - left.total);

    return rows.length ? rows : reportPaymentMix;
  }, [rangedTransactionRows]);
  const localReportCategoryDistribution = React.useMemo(() => {
    const catalogBySku = new Map(data.posCatalog.map((item) => [item.sku, item]));
    const catalogByName = new Map(data.posCatalog.map((item) => [item.name, item]));
    const summary = new Map<string, number>();

    rangedTransactionRows.forEach((row) => {
      (row.items ?? []).forEach((item) => {
        const category = catalogBySku.get(item.sku)?.category || catalogByName.get(item.name)?.category || 'LAINNYA';
        summary.set(category, (summary.get(category) || 0) + item.subtotal);
      });
    });

    const rows = Array.from(summary.entries())
      .map(([category, total]) => ({ category, value: Number((total / 1000000).toFixed(2)) }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);

    return rows.length ? rows : reportCategorySales;
  }, [data.posCatalog, rangedTransactionRows]);
  const localReportReceivableDebtChart = React.useMemo(
    () => [
      { label: 'Kas masuk', value: Number((localReportSummary.paid / 1000000).toFixed(2)) },
      { label: 'Piutang', value: Number((localReportSummary.receivableRemaining / 1000000).toFixed(2)) },
      { label: 'Hutang', value: Number((localReportSummary.debtRemaining / 1000000).toFixed(2)) },
    ],
    [localReportSummary]
  );
  const localReportStockMovementChart = React.useMemo(
    () => [
      { label: 'Restok', value: stockHistorySummary.restokCount },
      { label: 'Penjualan', value: stockHistorySummary.salesCount },
      { label: 'Manual', value: Math.max(0, stockHistorySummary.manualCount) },
      { label: 'Stok rendah', value: localReportSummary.lowStockCount },
    ],
    [localReportSummary.lowStockCount, stockHistorySummary]
  );
  const localReportDecisionRows = React.useMemo(() => {
    const topCategory = localReportCategoryDistribution[0];
    const topPayment = localReportPaymentDistribution[0];

    return [
      {
        label: 'Kategori dominan',
        value: topCategory ? `${topCategory.category} / ${formatRupiahNumber(topCategory.value * 1000000)}` : '-',
        icon: Tags,
      },
      {
        label: 'Metode utama',
        value: topPayment ? `${topPayment.method} / ${formatRupiahNumber(topPayment.total * 1000000)}` : '-',
        icon: CreditCard,
      },
      {
        label: 'Tagihan perlu ditagih',
        value: `${localReportSummary.receivableOverdue} overdue / ${formatRupiahNumber(localReportSummary.receivableRemaining)}`,
        icon: HandCoins,
      },
      {
        label: 'Hutang perlu dibayar',
        value: `${localReportSummary.debtOverdue} overdue / ${formatRupiahNumber(localReportSummary.debtRemaining)}`,
        icon: Landmark,
      },
      {
        label: 'Stok perlu restok',
        value: `${localReportSummary.lowStockCount} rendah / ${localReportSummary.criticalStockCount} kritis`,
      icon: Boxes,
    },
    ];
  }, [localReportCategoryDistribution, localReportPaymentDistribution, localReportSummary]);
  const localReportDataset = React.useMemo(() => {
    const catalogBySku = new Map(data.posCatalog.map((item) => [item.sku, item]));
    const transactionLog = rangedTransactionRows.map((row) => {
      const totalNumber = getRupiahNumber(row.total);
      const paidNumber = row.paymentAmount ? getRupiahNumber(row.paymentAmount) : row.status === 'Lunas' ? totalNumber : 0;
      const remainingNumber = Math.max(0, totalNumber - paidNumber);
      const customerName = row.customerName || row.customer || 'PELANGGAN UMUM';

      return {
        ...row,
        customerName,
        totalNumber,
        paidNumber,
        remainingNumber,
        items: (row.items ?? []).map(normalizeTransactionLineItem),
      };
    });
    const revenue = transactionLog.reduce((total, row) => total + row.totalNumber, 0);
    const paid = transactionLog.reduce((total, row) => total + row.paidNumber, 0);
    const averageSale = transactionLog.length ? Math.round(revenue / transactionLog.length) : 0;
    const estimatedCost = Math.round(revenue * 0.82);
    const grossProfit = Math.max(0, revenue - estimatedCost);
    const margin = revenue ? Number(((grossProfit / revenue) * 100).toFixed(1)) : 0;
    const topProductsMap = new Map<string, { sku: string; name: string; qty: number; total: number; category: string }>();

    transactionLog.forEach((row) => {
      row.items.forEach((item) => {
        const catalogItem = catalogBySku.get(item.sku);
        const key = item.sku || item.name;
        const current = topProductsMap.get(key) ?? {
          sku: item.sku,
          name: item.name,
          qty: 0,
          total: 0,
          category: catalogItem?.category || 'LAINNYA',
        };

        current.qty += item.qty;
        current.total += item.subtotal;
        topProductsMap.set(key, current);
      });
    });

    const topProducts = Array.from(topProductsMap.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 8);
    const topProductsChart = topProducts.map((item) => ({
      item: item.name.length > 16 ? `${item.name.slice(0, 16)}...` : item.name,
      total: Number((item.total / 1000000).toFixed(2)),
      count: item.qty,
    }));
    const customerByName = Array.from(
      transactionLog.reduce((map, row) => {
        const customerLabel = row.customerName?.trim() || 'PELANGGAN UMUM';
        const current = map.get(customerLabel) ?? { label: customerLabel, total: 0, count: 0 };
        current.total += row.totalNumber;
        current.count += 1;
        map.set(customerLabel, current);
        return map;
      }, new Map<string, { label: string; total: number; count: number }>())
    )
      .map(([, value]) => value)
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
    const customerByAddress = Array.from(
      transactionLog.reduce((map, row) => {
        const label = row.address?.trim() || 'Alamat belum diisi';
        const current = map.get(label) ?? { label, total: 0, count: 0 };
        current.total += row.totalNumber;
        current.count += 1;
        map.set(label, current);
        return map;
      }, new Map<string, { label: string; total: number; count: number }>())
    )
      .map(([, value]) => value)
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
    const hourlyChart = Array.from(
      transactionLog.reduce((map, row) => {
        const hour = row.time.match(/(\d{1,2}):/)?.[1]?.padStart(2, '0') ?? '00';
        const label = `${hour}.00`;
        const current = map.get(label) ?? { hour: label, count: 0, total: 0 };
        current.count += 1;
        current.total += row.totalNumber;
        map.set(label, current);
        return map;
      }, new Map<string, { hour: string; count: number; total: number }>())
    )
      .map(([, value]) => ({ ...value, total: Number((value.total / 1000000).toFixed(2)) }))
      .sort((left, right) => left.hour.localeCompare(right.hour, 'id'));
    const supplierCashOut = rangedSupplierDebtRows.reduce(
      (total, row) =>
        total +
        row.paymentHistory.reduce((paymentTotal, payment) => {
          if (payment.method !== 'Tunai') return paymentTotal;
          return paymentTotal + getRupiahNumber(payment.amount);
        }, 0),
      0
    );
    const cashSales = transactionLog
      .filter((row) => row.method === 'Tunai')
      .reduce((total, row) => total + row.paidNumber, 0);
    const cashFlowRows = [
      {
        date: rangeLabel,
        startingCash: 0,
        cashSales,
        adjustmentIn: 0,
        adjustmentOut: supplierCashOut,
        estimatedCash: Math.max(0, cashSales - supplierCashOut),
        actualCash: Math.max(0, cashSales - supplierCashOut),
        diff: 0,
        status: 'Seimbang',
      },
    ];
    const cashFlowChart = [
      { label: 'Kas masuk', value: Number((cashSales / 1000000).toFixed(2)) },
      { label: 'Kas keluar', value: Number((supplierCashOut / 1000000).toFixed(2)) },
      { label: 'Estimasi kas', value: Number((Math.max(0, cashSales - supplierCashOut) / 1000000).toFixed(2)) },
    ];
    const splitIndex = Math.max(1, Math.floor(transactionLog.length / 2));
    const previousRows = transactionLog.slice(0, splitIndex);
    const currentRows = transactionLog.slice(splitIndex).length ? transactionLog.slice(splitIndex) : transactionLog;
    const summarizeRows = (rows: typeof transactionLog) => {
      const rowsRevenue = rows.reduce((total, row) => total + row.totalNumber, 0);
      const rowsPaid = rows.reduce((total, row) => total + row.paidNumber, 0);
      const rowsAverage = rows.length ? Math.round(rowsRevenue / rows.length) : 0;

      return { revenue: rowsRevenue, paid: rowsPaid, count: rows.length, average: rowsAverage };
    };
    const currentSummary = summarizeRows(currentRows);
    const previousSummary = summarizeRows(previousRows);
    const comparisonRows = [
      { label: 'Omzet', current: currentSummary.revenue, previous: previousSummary.revenue, format: 'currency' },
      { label: 'Kas masuk', current: currentSummary.paid, previous: previousSummary.paid, format: 'currency' },
      { label: 'Transaksi', current: currentSummary.count, previous: previousSummary.count, format: 'number' },
      { label: 'Rata-rata transaksi', current: currentSummary.average, previous: previousSummary.average, format: 'currency' },
    ];
    const stockAuditRows = Array.from(
      data.posCatalog.reduce((map, item) => {
        const current = map.get(item.category) ?? { category: item.category, items: 0, qty: 0, low: 0, value: 0 };
        current.items += 1;
        current.qty += item.qty;
        current.low += item.qty <= stockThreshold[0] ? 1 : 0;
        current.value += item.qty * getRupiahNumber(item.price);
        map.set(item.category, current);
        return map;
      }, new Map<string, { category: string; items: number; qty: number; low: number; value: number }>())
    )
      .map(([, value]) => value)
      .sort((left, right) => right.value - left.value);
    const catalogCategoryByName = new Map(data.posCatalog.map((item) => [item.name.toUpperCase(), item.category]));
    const stockMovementCategoryRows = Array.from(
      rangedStockHistoryRows.reduce((map, row) => {
        const category = catalogCategoryByName.get(row.item.toUpperCase()) || 'LAINNYA';
        const current = map.get(category) ?? { category, movementCount: 0, netMovement: 0 };

        current.movementCount += 1;
        current.netMovement += Number(row.movement) || 0;
        map.set(category, current);
        return map;
      }, new Map<string, { category: string; movementCount: number; netMovement: number }>())
    )
      .map(([, value]) => value)
      .sort((left, right) => right.movementCount - left.movementCount)
      .slice(0, 5);
    const stockTrailRows = rangedStockHistoryRows.slice(0, 10);

    return {
      transactionLog,
      averageSale,
      estimatedCost,
      grossProfit,
      margin,
      topProducts,
      topProductsChart,
      customerByName,
      customerByAddress,
      hourlyChart,
      cashFlowRows,
      cashFlowChart,
      comparisonRows,
      stockAuditRows,
      stockMovementCategoryRows,
      stockTrailRows,
    };
  }, [data.posCatalog, rangedStockHistoryRows, rangeLabel, stockThreshold, rangedSupplierDebtRows, rangedTransactionRows]);
  const reportSummary = reportBackendData?.summary ?? localReportSummary;
  const reportTransactionTrend = reportBackendData?.transactionTrend ?? localReportTransactionTrend;
  const reportPaymentDistribution = reportBackendData?.paymentDistribution ?? localReportPaymentDistribution;
  const reportCategoryDistribution = reportBackendData?.categoryDistribution ?? localReportCategoryDistribution;
  const reportReceivableDebtChart = reportBackendData?.receivableDebtChart ?? localReportReceivableDebtChart;
  const reportStockMovementChart = reportBackendData?.stockMovementChart ?? localReportStockMovementChart;
  const reportDecisionRows = localReportDecisionRows;
  const reportDataset = React.useMemo(() => {
    if (!reportBackendData?.dataset) {
      return localReportDataset;
    }

    const backendDataset = reportBackendData.dataset;
    return {
      ...backendDataset,
    };
  }, [localReportDataset, reportBackendData]);
  const dashboardSales7Days = React.useMemo(
    () => reportTransactionTrend.slice(-7).map((row) => ({
      day: row.label,
      sales: row.omzet,
    })),
    [reportTransactionTrend]
  );
  const dashboardSalesByHour = React.useMemo(
    () => reportDataset.hourlyChart.map((row) => ({
      hour: row.hour.replace('.00', ''),
      count: row.count,
    })),
    [reportDataset.hourlyChart]
  );
  const stockHistoryPageCount = Math.max(1, Math.ceil(stockHistoryRows.length / stockHistoryPageSize));
  const stockHistoryPageStart = stockHistoryRows.length === 0 ? 0 : (stockHistoryPage - 1) * stockHistoryPageSize + 1;
  const stockHistoryPageEnd = Math.min(stockHistoryPage * stockHistoryPageSize, stockHistoryRows.length);
  const paginatedStockHistoryRows = React.useMemo(
    () => stockHistoryRows.slice((stockHistoryPage - 1) * stockHistoryPageSize, stockHistoryPage * stockHistoryPageSize),
    [stockHistoryPage, stockHistoryRows]
  );
  const stockHistoryFilterLabel = stockHistoryFilter === 'Semua' ? 'Semua tipe' : stockHistoryFilter;
  const lowStockCategoryOptions = React.useMemo(
    () => ['Semua kategori', ...Array.from(new Set(lowStockItems.map((item) => item.category))).sort((left, right) => left.localeCompare(right, 'id'))],
    [lowStockItems]
  );
  const userRoleOptions = React.useMemo(
    () => ['Semua role', ...Array.from(new Set(userRowsData.map((row) => row.role))).sort((left, right) => left.localeCompare(right, 'id'))] as UserRoleFilter[],
    [userRowsData]
  );
  const filteredUserRows = React.useMemo(
    () =>
      userRowsData.filter((row) => {
        const query = deferredUserSearch.trim().toLowerCase();
        const matchesRole = userRoleFilter === 'Semua role' || row.role === userRoleFilter;
        const searchableText = [row.name, row.username, row.role, row.status, row.security, row.lastLogin, row.device, row.scope]
          .join(' ')
          .toLowerCase();

        return matchesRole && (!query || searchableText.includes(query));
      }),
    [deferredUserSearch, userRoleFilter, userRowsData]
  );
  const activeUserCount = userRowsData.filter((row) => row.status === 'Aktif').length;
  const totpUserCount = userRowsData.filter((row) => row.security.toLowerCase().includes('totp')).length;
  const resetRequiredUserCount = userRowsData.filter((row) => row.security.toLowerCase().includes('reset')).length;
  const activeSessionUser = sessionUser ?? userRowsData[0] ?? userSeedRows[0];
  const activeSessionRole = activeSessionUser.role as UserPermissionRole;
  const canManageRolePermissions = activeSessionRole === 'Admin';
  const canReviseSale = activeSessionRole === 'Admin' || activeSessionRole === 'Supervisor';
  const visibleSidebarItems = React.useMemo(
    () => sidebarItems.filter((item) => rolePermissionDraft[activeSessionRole]?.includes(item.label)),
    [activeSessionRole, rolePermissionDraft]
  );
  const openSaleRevisionModal = async (row: SaleRow) => {
    if (!canReviseSale) {
      setSaleRevisionError('Retur barang hanya boleh dilakukan Admin atau Supervisor.');
      return;
    }
    if (row.status === 'Void') {
      setSaleRevisionError('Transaksi void tidak bisa diretur.');
      return;
    }

    const items = (row.items ?? []).map(normalizeTransactionLineItem);
    setSaleRevisionTarget(row);
    setSaleRevisionItems(items.map((item) => ({
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      price: item.price,
      oldQty: item.qty,
      qty: item.qty,
    })));
    setSaleRevisionReason('');
    setSaleRevisionError('');
    setSaleRevisionOpen(true);

    try {
      const payload = await posApi.listSaleRevisions(row.id || row.invoice);
      setSaleRevisionRows(payload.items);
      setSaleRevisionExpectedNo(payload.expectedRevisionNo);
    } catch (error) {
      setSaleRevisionRows([]);
      setSaleRevisionExpectedNo(row.revisionCount ?? 0);
      setSaleRevisionError(error instanceof Error ? error.message : 'Gagal memuat riwayat revisi.');
    }
  };
  const submitSaleRevision = async () => {
    if (!saleRevisionTarget) return;
    if (saleRevisionReason.trim().length < 5) {
      setSaleRevisionError('Alasan retur minimal 5 karakter.');
      return;
    }
    if (!saleRevisionItems.some((item) => item.qty > 0)) {
      setSaleRevisionError('Minimal satu item harus tersisa.');
      return;
    }

    setSaleRevisionSaving(true);
    setSaleRevisionError('');
    try {
      const payload = await posApi.updateSaleWithRevision(saleRevisionTarget.id || saleRevisionTarget.invoice, {
        items: saleRevisionItems.map((item) => ({ sku: item.sku, qty: item.qty })),
        reason: saleRevisionReason,
        expectedRevisionNo: saleRevisionExpectedNo,
      });
      setSaleRevisionOpen(false);
      setSaleRevisionTarget(null);
      setExpandedTransactionInvoice(payload.item.invoice);
      if (payload.overpaidAmount > 0) {
        handleSettingAction(`Revisi tersimpan. Kelebihan bayar ${formatRupiahNumber(payload.overpaidAmount)} perlu dicatat manual.`, 'warning');
      } else {
        handleSettingAction('Revisi transaksi tersimpan.');
      }
    } catch (error) {
      setSaleRevisionError(error instanceof Error ? error.message : 'Revisi transaksi gagal disimpan.');
    } finally {
      setSaleRevisionSaving(false);
    }
  };
  const persistRolePermissions = async (nextPermissions: Record<UserPermissionRole, PosMenuId[]>) => {
    try {
      const saved = await posApi.updateRolePermissions(nextPermissions as UserPermissionMap);
      setRolePermissionDraft(saved as Record<UserPermissionRole, PosMenuId[]>);
      setUserActionMessage({ tone: 'success', text: 'Hak akses role tersimpan.' });
    } catch (error) {
      setUserActionMessage({ tone: 'warning', text: error instanceof Error ? error.message : 'Gagal menyimpan hak akses.' });
    }
  };
  const refreshUserAccess = async (silent = false) => {
    try {
      const payload = await posApi.listUsers();
      setUserRowsData(payload.items);
      setRolePermissionDraft(payload.rolePermissions as Record<UserPermissionRole, PosMenuId[]>);
      if (!silent) {
        setUserActionMessage({ tone: 'success', text: 'Data pengguna diperbarui.' });
      }
    } catch (error) {
      if (!silent) {
        setUserActionMessage({ tone: 'warning', text: error instanceof Error ? error.message : 'Gagal memuat data pengguna.' });
      }
    }
  };
  const replaceUserRow = (nextRow: UserRow) => {
    setUserRowsData((current) => current.map((row) => (row.id === nextRow.id ? nextRow : row)));
  };
  const handleUserPasswordReset = async (row: UserRow) => {
    try {
      const payload = await posApi.resetUserPassword(row.id);
      replaceUserRow(payload.item);
      setUserActionMessage({ tone: 'success', text: `Reset password @${row.username}: ${payload.temporaryPassword}. Berikan ke user satu kali, lalu user wajib ganti password.` });
    } catch (error) {
      setUserActionMessage({ tone: 'warning', text: error instanceof Error ? error.message : 'Gagal reset password.' });
    }
  };
  const handleTotpSetup = async (row: UserRow) => {
    try {
      const payload = await posApi.setupUserTotp(row.id);
      setTotpSetupUser(row);
      setTotpManualKey(payload.manualKey);
      setTotpOtpAuthUrl(payload.otpauthUrl);
      setTotpCode('');
      setTotpError('');
      setTotpDialogOpen(true);
    } catch (error) {
      setUserActionMessage({ tone: 'warning', text: error instanceof Error ? error.message : 'Gagal membuat secret TOTP.' });
    }
  };
  const handleTotpVerify = async () => {
    if (!totpSetupUser) return;

    try {
      const nextRow = await posApi.verifyUserTotp(totpSetupUser.id, totpCode.trim());
      replaceUserRow(nextRow);
      setTotpDialogOpen(false);
      setUserActionMessage({ tone: 'success', text: `TOTP @${totpSetupUser.username} aktif.` });
    } catch (error) {
      setTotpError(error instanceof Error ? error.message : 'Kode TOTP tidak valid.');
    }
  };
  const handleTotpDisable = async (row: UserRow) => {
    try {
      const nextRow = await posApi.disableUserTotp(row.id);
      replaceUserRow(nextRow);
      setUserActionMessage({ tone: 'success', text: `TOTP @${row.username} dinonaktifkan.` });
    } catch (error) {
      setUserActionMessage({ tone: 'warning', text: error instanceof Error ? error.message : 'Gagal menonaktifkan TOTP.' });
    }
  };
  const openCreateUserDialog = () => {
    setUserDialogMode('create');
    setUserEditTargetId('');
    setUserDraftUsername('');
    setUserDraftName('');
    setUserDraftRole('Kasir');
    setUserDraftActive(true);
    setUserDraftError('');
    setUserDialogOpen(true);
  };
  const openEditUserDialog = (row: UserRow) => {
    setUserDialogMode('edit');
    setUserEditTargetId(row.id);
    setUserDraftUsername(row.username);
    setUserDraftName(row.name);
    setUserDraftRole(row.role);
    setUserDraftActive(row.status === 'Aktif');
    setUserDraftError('');
    setUserDialogOpen(true);
  };
  const openDeleteUserDialog = (row: UserRow) => {
    if (row.id === activeSessionUser.id) {
      setUserActionMessage({ tone: 'warning', text: 'User yang sedang aktif tidak bisa dihapus.' });
      return;
    }

    setUserDeleteTarget(row);
    setUserDeleteError('');
    setUserDeleteOpen(true);
  };
  const submitUserDraft = async () => {
    setUserDraftError('');
    try {
      if (userDialogMode === 'create') {
        const payload = await posApi.createUser({
          username: userDraftUsername,
          displayName: userDraftName,
          role: userDraftRole,
          active: userDraftActive,
        });
        setUserRowsData((current) => [payload.item, ...current]);
        setUserActionMessage({ tone: 'success', text: `User @${payload.item.username} dibuat. Temporary password: ${payload.temporaryPassword}` });
      } else {
        const nextRow = await posApi.updateUser(userEditTargetId, {
          displayName: userDraftName,
          role: userDraftRole,
          active: userDraftActive,
        });
        replaceUserRow(nextRow);
        setUserActionMessage({ tone: 'success', text: `User @${nextRow.username} diperbarui.` });
      }
      setUserDialogOpen(false);
    } catch (error) {
      setUserDraftError(error instanceof Error ? error.message : 'Gagal menyimpan user.');
    }
  };
  const confirmDeleteUser = async () => {
    if (!userDeleteTarget) return;

    try {
      setUserDeleteSaving(true);
      setUserDeleteError('');
      await posApi.deleteUser(userDeleteTarget.id);
      setUserRowsData((current) => current.filter((row) => row.id !== userDeleteTarget.id));
      setUserDeleteOpen(false);
      setUserDeleteTarget(null);
      setUserActionMessage({ tone: 'success', text: `User @${userDeleteTarget.username} dihapus.` });
    } catch (error) {
      setUserDeleteError(error instanceof Error ? error.message : 'Gagal menghapus user.');
    } finally {
      setUserDeleteSaving(false);
    }
  };
  const openAuditDialog = async () => {
    setAuditDialogOpen(true);
    setAuditError('');
    try {
      setAuditRows(await posApi.listAuditLogs(80));
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : 'Gagal memuat audit log.');
    }
  };
  const toggleRolePermission = (role: UserPermissionRole, module: PosMenuId) => {
    if (role === 'Admin') return;

    setRolePermissionDraft((current) => {
      const currentItems = current[role] ?? [];
      const nextItems = currentItems.includes(module)
        ? currentItems.filter((item) => item !== module)
        : [...currentItems, module];

      const next = {
        ...current,
        [role]: nextItems,
      };

      void persistRolePermissions(next);
      return next;
    });
  };
  const resetRolePermissionsToDefault = () => {
    setRolePermissionDraft(defaultRolePermissions);
    void persistRolePermissions(defaultRolePermissions);
  };
  const openDebtCount = supplierDebtRowsData.filter((row) => getRupiahNumber(row.remaining) > 0).length;
  const openReceivableCount = receivableRowsData.filter((row) => getRupiahNumber(row.remaining) > 0).length;
  const criticalLowStockCount = lowStockItems.filter((item) => item.qty <= Math.max(1, Math.floor(stockThreshold[0] / 2))).length;
  const dashboardLatestTransactions = React.useMemo(
    () =>
      transactionRows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => compareTransactionValues(left.row, right.row, 'invoice', 'desc') || left.index - right.index)
        .slice(0, 10)
        .map(({ row }) => row),
    [transactionRows]
  );
  const dashboardKpis = [
    {
      label: 'Omzet',
      value: formatRupiahNumber(transactionSummary.omzet),
      note: `${transactionSummary.count} transaksi`,
      icon: CircleDollarSign,
      className: 'border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-emerald-50',
    },
    {
      label: 'Kas masuk',
      value: formatRupiahNumber(transactionSummary.paid),
      note: `${transactionSummary.lunas} lunas`,
      icon: Banknote,
      className: 'border-sky-500/30 bg-gradient-to-br from-sky-950 via-slate-900 to-sky-900 text-sky-50',
    },
    {
      label: 'Stok rendah',
      value: `${lowStockCount} item`,
      note: `${criticalLowStockCount} kritis`,
      icon: AlertTriangle,
      className: 'border-rose-500/30 bg-gradient-to-br from-rose-950 via-slate-900 to-rose-900 text-rose-50',
    },
    {
      label: 'Tagihan terbuka',
      value: `${openReceivableCount + openDebtCount}`,
      note: `${openReceivableCount} piutang / ${openDebtCount} hutang`,
      icon: HandCoins,
      className: 'border-amber-500/30 bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 text-amber-50',
    },
  ];
  const dashboardOperations = [
    {
      title: 'Stok kritis',
      value: lowStockItems[0]?.name ?? 'Tidak ada item kritis',
      note: lowStockItems[0] ? `${lowStockItems[0].qty} ${lowStockItems[0].unit} tersisa` : 'Seluruh stok di atas threshold',
      icon: Boxes,
      tone: criticalLowStockCount > 0 ? 'danger' : 'success',
      target: 'Stok rendah' as PosMenuId,
    },
    {
      title: 'Piutang aktif',
      value: formatRupiahNumber(receivableSummary.remaining),
      note: `${openReceivableCount} tagihan customer`,
      icon: HandCoins,
      tone: openReceivableCount > 0 ? 'warning' : 'success',
      target: 'Piutang' as PosMenuId,
    },
    {
      title: 'Hutang supplier',
      value: formatRupiahNumber(debtSummary.remaining),
      note: `${openDebtCount} tagihan distributor`,
      icon: Landmark,
      tone: openDebtCount > 0 ? 'warning' : 'success',
      target: 'Hutang' as PosMenuId,
    },
  ];
  const showOperationalPanel = activeMenu === 'Dashboard';
  const showRangeFilter =
    activeMenu !== 'Dashboard' &&
    activeMenu !== 'Kasir' &&
    activeMenu !== 'Barang' &&
    activeMenu !== 'Stok rendah' &&
    activeMenu !== 'Database' &&
    activeMenu !== 'Setting';
  const adminUrl = typeof window !== 'undefined' ? resolveRuntimeAdminUrl() : '/admin';
  const lanAdminUrl = adminUrl.replace('://127.0.0.1:', '://<IP-KASIR>:').replace('://localhost:', '://<IP-KASIR>:');
  const priceCheckerUrl = typeof window !== 'undefined' ? resolveRuntimePriceCheckerUrl() : '/price-checker';
  const lanPriceCheckerUrl = priceCheckerUrl.replace('://127.0.0.1:', '://<IP-KASIR>:').replace('://localhost:', '://<IP-KASIR>:');
  const copyAdminUrl = async () => {
    try {
      await navigator.clipboard?.writeText(adminUrl);
      handleSettingAction('URL admin disalin.');
    } catch {
      handleSettingAction('Clipboard browser tidak tersedia. Salin URL manual dari panel.', 'warning');
    }
  };
  const copyPriceCheckerUrl = async () => {
    try {
      await navigator.clipboard?.writeText(priceCheckerUrl);
      handleSettingAction('URL price checker disalin.');
    } catch {
      handleSettingAction('Clipboard browser tidak tersedia. Salin URL manual dari panel.', 'warning');
    }
  };
  const openCreateCatalogDialog = async () => {
    const nextBarcode = await posApi.generateCatalogBarcode();
    setCatalogMode('create');
    setCatalogTargetSku('');
    setCatalogDraft({
      sku: nextBarcode,
      name: '',
      category: '',
      qty: 0,
      unit: '',
      note: '',
      price: '',
    });
    setCatalogError('');
    setCatalogDialogOpen(true);
  };
  const openEditCatalogDialog = (item: QueueItem) => {
    setCatalogMode('edit');
    setCatalogTargetSku(item.sku);
    setCatalogDraft({ ...item });
    setCatalogError('');
    setCatalogDialogOpen(true);
  };
  const addCashierCartItem = (item: QueueItem) => {
    setCashierCart((current) => ({
      ...current,
      [item.sku]: (current[item.sku] || 0) + 1,
    }));
    setCashierRecentSkus((current) => [item.sku, ...current.filter((sku) => sku !== item.sku)].slice(0, 6));
  };
  const findCashierCatalogItem = (code: string) =>
    data.posCatalog.find((item) => item.sku === code.trim() || item.sku.replace(/[^\dA-Z]/g, '') === code.trim().replace(/[^\dA-Z]/g, ''));
  const setCashierFormField = <K extends keyof CashierCheckoutForm>(field: K, value: CashierCheckoutForm[K]) => {
    setCashierCheckoutForm((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const formatCashierDiscountInput = (value: string, mode: CashierDiscountMode) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return '';
    }

    if (mode === 'percent') {
      const numeric = trimmed.replace(/[^\d]/g, '');
      return numeric ? `${Number(numeric)}%` : '';
    }

    return formatRupiahInput(trimmed);
  };
  const getCashierDiscountValue = () => {
    if (cashierDiscountMode === 'percent') {
      const numeric = Number(cashierDiscount.replace(/[^\d]/g, ''));
      return Math.max(0, Math.min(cashierSubtotal, (numeric / 100) * cashierSubtotal));
    }

    return Math.max(0, Math.min(cashierSubtotal, getRupiahNumber(cashierDiscount)));
  };
  const resetCashierTransactionState = () => {
    setCashierCart({});
    setCashierCheckoutForm(defaultCashierCheckoutForm);
    setCashierPaymentMethod('Tunai');
    setCashierPaymentStatus('Lunas');
    setCashierDiscountMode('nominal');
    setCashierPaymentAmount('');
    setCashierDiscount('');
    setCashierCheckoutError('');
  };
  const clearCashierScanBuffer = () => {
    cashierScanBufferRef.current = '';
    cashierScanTimesRef.current = [];
    cashierScanCandidateRef.current = false;
  };
  const processCashierScannedCode = (rawCode: string) => {
    const barcode = rawCode.trim();
    if (!barcode) {
      setCashierScanError('Barcode masih kosong.');
      return;
    }

    const item = findCashierCatalogItem(barcode);
    if (!item) {
      setCashierScanError(`Barcode ${barcode} tidak ditemukan.`);
      return;
    }

    addCashierCartItem(item);
    setCashierScanError('');
  };
  const evaluateCashierExpression = (expression: string): number | null => {
    const normalized = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '.')
      .replace(/\s+/g, '');

    if (!normalized || !/^[\d+\-*/().]+$/.test(normalized)) {
      return null;
    }

    try {
      const result = Function(`"use strict"; return (${normalized});`)();
      return typeof result === 'number' && Number.isFinite(result) ? result : null;
    } catch {
      return null;
    }
  };
  const handleCashierCalculatorCompute = () => {
    const result = evaluateCashierExpression(cashierCalculatorExpression);
    if (result === null) {
      setCashierCalculatorResult(null);
      setCashierCalculatorError('Ekspresi tidak valid.');
      return;
    }

    setCashierCalculatorError('');
    setCashierCalculatorResult(result);
  };
  const applyCashierCalculatorToPayment = () => {
    if (cashierCalculatorResult === null) {
      handleCashierCalculatorCompute();
      return;
    }

    setCashierPaymentAmount(formatRupiahNumber(Math.max(0, Math.round(cashierCalculatorResult))));
    setCashierPaymentStatus('Lunas');
    setCashierCalculatorOpen(false);
  };
  const buildCashierReceiptPreview = (saleRow: SaleRow): CashierReceiptPreview => {
    const discountValue = getCashierDiscountValue();
    const subtotal = cashierCartItems.reduce((total, entry) => total + getRupiahNumber(entry.item.price) * entry.qty, 0);
    const total = Math.max(0, subtotal - discountValue);
    const paid = cashierPaidValue;
    const remaining = Math.max(0, total - paid);
    const change = Math.max(0, paid - total);

    return {
      invoice: saleRow.invoice,
      saleTime: saleRow.time,
      saleDate: format(new Date(), 'dd/MM/yyyy'),
      cashier: 'KASIR UTAMA',
      method: cashierPaymentMethod,
      status: cashierPaymentStatus,
      customerName: cashierCheckoutForm.customerName.trim() || 'PELANGGAN UMUM',
      customerType: cashierCheckoutForm.customerType.trim() || 'UMUM',
      phone: cashierCheckoutForm.phone.trim(),
      projectName: cashierCheckoutForm.projectName.trim(),
      address: cashierCheckoutForm.address.trim(),
      reference: cashierCheckoutForm.reference.trim(),
      note: cashierCheckoutForm.note.trim(),
      dueDate: cashierCheckoutForm.dueDate.trim(),
      items: cashierCartItems.map(({ item, qty }) => {
        const price = getRupiahNumber(item.price);
        return {
          sku: item.sku,
          name: item.name,
          qty,
          unit: item.unit,
          price,
          subtotal: price * qty,
        };
      }),
      subtotal,
      discount: discountValue,
      total,
      paid,
      remaining,
      change,
    };
  };
  const buildTransactionReceiptPreview = (saleRow: SaleRow): CashierReceiptPreview => {
    const items = (saleRow.items ?? []).map((item) => {
      const normalizedItem = normalizeTransactionLineItem(item);

      return {
        sku: normalizedItem.sku,
        name: normalizedItem.name,
        qty: normalizedItem.qty,
        unit: normalizedItem.unit,
        price: normalizedItem.price,
        subtotal: normalizedItem.subtotal,
      };
    });
    const subtotal = items.reduce((total, item) => total + item.subtotal, 0);
    const discountValue =
      saleRow.discountMode === 'percent'
        ? Math.max(0, Math.min(subtotal, (Number(String(saleRow.discount ?? '').replace(/[^\d]/g, '')) / 100) * subtotal))
        : saleRow.discount
          ? getRupiahNumber(saleRow.discount)
          : 0;
    const total = Math.max(0, subtotal - discountValue);
    const paid = saleRow.paymentAmount ? getRupiahNumber(saleRow.paymentAmount) : total;
    const remaining = Math.max(0, total - paid);
    const change = Math.max(0, paid - total);

    return {
      invoice: saleRow.invoice,
      saleTime: saleRow.time,
      saleDate: format(new Date(), 'dd/MM/yyyy'),
      cashier: saleRow.cashier || 'KASIR UTAMA',
      method: saleRow.method as CashierPaymentMethod,
      status: saleRow.status as CashierPaymentStatus,
      customerName: saleRow.customerName?.trim() || saleRow.customer || 'PELANGGAN UMUM',
      customerType: saleRow.customerType?.trim() || 'UMUM',
      phone: saleRow.phone?.trim() || '',
      projectName: saleRow.projectName?.trim() || '',
      address: saleRow.address?.trim() || '',
      reference: saleRow.reference?.trim() || '',
      note: saleRow.note?.trim() || '',
      dueDate: saleRow.dueDate?.trim() || '',
      items,
      subtotal,
      discount: discountValue,
      total,
      paid,
      remaining,
      change,
    };
  };
  const getReceiptPreviewDimensions = (paper: SettingReceiptPaper) => ({
    '58': { widthPx: 181, heightPx: 760, popup: 'width=360,height=820' },
    '80': { widthPx: 287, heightPx: 760, popup: 'width=460,height=820' },
    cf: { widthPx: 821, heightPx: 920, popup: 'width=980,height=1080' },
  }[paper]);
  const buildCashierReceiptDocumentData = (preview: CashierReceiptPreview): ReceiptPreviewDocumentData => ({
    storeName: settingStoreName.trim() || storeName,
    storeAddress: settingStoreAddress.trim(),
    storePhone: settingStorePhone.trim(),
    invoice: preview.invoice,
    date: preview.saleDate,
    time: preview.saleTime,
    cashier: preview.cashier,
    customerName: preview.customerName || 'PELANGGAN UMUM',
    customerAddress: preview.address,
    customerPhone: preview.phone,
    projectName: preview.projectName,
    paymentMethod: preview.method,
    paymentStatus: preview.status,
    reference: preview.reference,
    note: preview.note,
    dueDate: preview.dueDate,
    items: preview.items.map((item) => ({
      name: item.name,
      qty: `${item.qty} ${item.unit}`,
      price: item.price,
      subtotal: item.subtotal,
    })),
    paymentHistory: preview.paymentHistory,
    subtotal: preview.subtotal,
    discount: preview.discount,
    total: preview.total,
    paid: preview.paid,
    remaining: preview.remaining,
    change: preview.change,
  });
  const buildCashierReceiptHtml = (preview: CashierReceiptPreview) =>
    buildSettingReceiptPreviewHtml(settingReceiptPreviewPaper, settingReceiptLayout, buildCashierReceiptDocumentData(preview));
  const printCashierReceiptPreview = (preview: CashierReceiptPreview) => {
    const dimensions = getReceiptPreviewDimensions(settingReceiptPreviewPaper);
    const popup = window.open('', '_blank', dimensions.popup);

    if (!popup) {
      setCashierCheckoutError('Popup cetak diblokir browser.');
      return;
    }

    popup.document.open();
    popup.document.write(
      buildCashierReceiptHtml(preview).replace(
        '</body>',
        '<script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close();},250);};</script></body>'
      )
    );
    popup.document.close();
  };
  const printReceivableReceiptPreview = (preview: ReceivableReceiptPreview) => {
    const popup = window.open('', '_blank', 'width=840,height=980');

    if (!popup) {
      setReceivablePaymentError('Popup cetak diblokir browser.');
      return;
    }

    const escapeHtml = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const saleRow = transactionRows.find((item) => item.invoice === preview.row.invoice);
    const items = (saleRow?.items ?? []).map(normalizeTransactionLineItem);
    const itemsHtml = items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.qty} ${escapeHtml(item.unit)}</td>
            <td>${formatRupiahNumber(item.price)}</td>
            <td>${formatRupiahNumber(item.subtotal)}</td>
          </tr>
        `
      )
      .join('');

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(preview.row.invoice)} - Bukti Pembayaran</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { margin: 0; background: #fff; color: #111827; font-family: Arial, sans-serif; }
            .page { display: grid; gap: 18px; font-size: 12px; }
            .header { display:flex; justify-content:space-between; gap:24px; border-bottom:2px solid #111827; padding-bottom:14px; }
            .store { display:grid; gap:4px; }
            .store-title { font-size:22px; font-weight:800; letter-spacing:.08em; }
            .doc-title { text-align:right; display:grid; gap:5px; }
            .doc-title strong { font-size:18px; text-transform:uppercase; }
            .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
            .box { border:1px solid #d1d5db; border-radius:10px; padding:12px; display:grid; gap:8px; }
            .row { display:flex; justify-content:space-between; gap:16px; border-bottom:1px dotted #d1d5db; padding-bottom:4px; }
            .row span:first-child { color:#6b7280; text-transform:uppercase; font-size:10px; letter-spacing:.08em; }
            table { width:100%; border-collapse:collapse; }
            th { background:#0f172a; color:#fff; text-align:left; padding:8px; font-size:10px; text-transform:uppercase; letter-spacing:.08em; }
            td { border:1px solid #e5e7eb; padding:8px; vertical-align:top; }
            .summary { margin-left:auto; width:320px; }
            .sign { display:grid; grid-template-columns:1fr 1fr; gap:80px; margin-top:32px; text-align:center; }
            .sign div { border-top:1px solid #111827; padding-top:8px; }
          </style>
        </head>
        <body>
          <main class="page">
            <section class="header">
              <div class="store">
                <div class="store-title">${escapeHtml(storeName)}</div>
                <div>Desa Palandan Kecamatan Baebunta</div>
                <div>Telp. 085230791657</div>
              </div>
              <div class="doc-title">
                <strong>Bukti Pembayaran Piutang</strong>
                <div>${escapeHtml(preview.row.invoice)}</div>
                <div>${escapeHtml(preview.payment.time)}</div>
              </div>
            </section>
            <section class="grid">
              <div class="box">
                <div class="row"><span>Pelanggan</span><strong>${escapeHtml(preview.row.customerName)}</strong></div>
                <div class="row"><span>Telepon</span><strong>${escapeHtml(preview.row.phone || '-')}</strong></div>
                <div class="row"><span>Alamat</span><strong>${escapeHtml(preview.row.address || '-')}</strong></div>
                <div class="row"><span>Proyek</span><strong>${escapeHtml(preview.row.projectName || '-')}</strong></div>
              </div>
              <div class="box">
                <div class="row"><span>Kasir</span><strong>${escapeHtml(preview.row.cashier)}</strong></div>
                <div class="row"><span>Metode</span><strong>${escapeHtml(preview.payment.method)}</strong></div>
                <div class="row"><span>Jatuh tempo</span><strong>${escapeHtml(preview.row.due)}</strong></div>
                <div class="row"><span>Status</span><strong>${escapeHtml(preview.row.status)}</strong></div>
              </div>
            </section>
            <section>
              <table>
                <thead>
                  <tr><th>No</th><th>Item</th><th>Qty</th><th>Harga</th><th>Total</th></tr>
                </thead>
                <tbody>
                  ${itemsHtml || '<tr><td colspan="5">Detail item belum tersedia.</td></tr>'}
                </tbody>
              </table>
            </section>
            <section class="box summary">
              <div class="row"><span>Total tagihan</span><strong>${escapeHtml(preview.row.total)}</strong></div>
              <div class="row"><span>Total terbayar</span><strong>${escapeHtml(preview.row.paid)}</strong></div>
              <div class="row"><span>Bayar sekarang</span><strong>${escapeHtml(preview.payment.amount)}</strong></div>
              <div class="row"><span>Sisa pembayaran</span><strong>${escapeHtml(preview.row.remaining)}</strong></div>
            </section>
            <section class="box">
              <div class="row"><span>Keterangan pembayaran</span><strong>${escapeHtml(preview.payment.note || '-')}</strong></div>
              <div class="row"><span>Referensi</span><strong>${escapeHtml(preview.row.reference || '-')}</strong></div>
            </section>
            <section class="sign">
              <div>Kasir / Admin</div>
              <div>Pelanggan</div>
            </section>
          </main>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };
  const restoreCashierSession = (sessionId: string) => {
    const session = data.cashierSessionRows.find((item) => item.id === sessionId);
    if (!session) {
      return;
    }

    setCashierCart(
      session.cartItems.reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.sku] = item.qty;
        return accumulator;
      }, {})
    );
    setCashierCheckoutForm({
      customerName: session.customerName ?? session.customer,
      phone: session.phone ?? '',
      projectName: session.projectName ?? '',
      customerType: session.customerType ?? 'UMUM',
      address: session.address ?? '',
      reference: session.reference ?? '',
      note: session.note ?? '',
      dueDate: '',
    });
    setCashierPaymentMethod(session.method as CashierPaymentMethod);
    setCashierPaymentStatus((session.status as CashierPaymentStatus) || 'Lunas');
    setCashierPaymentAmount(session.paymentAmount ?? session.total);
    setCashierDiscount(session.discount ?? '');
    setCashierDiscountMode((session.discountMode as CashierDiscountMode) || 'nominal');
    setCashierCheckoutOpen(true);
    setCashierSessionOpen(false);
  };
  const persistCashierSession = async (kind: 'Draft' | 'Tertahan') => {
    if (!cashierCartItems.length) return;

    try {
      setCashierCheckoutSaving(true);
      setCashierCheckoutError('');
      await posApi.saveCashierSession(kind, {
        customerName: cashierCheckoutForm.customerName,
        phone: cashierCheckoutForm.phone,
        projectName: cashierCheckoutForm.projectName,
        customerType: cashierCheckoutForm.customerType,
        address: cashierCheckoutForm.address,
        reference: cashierCheckoutForm.reference,
        note: cashierCheckoutForm.note,
        dueDate: cashierCheckoutForm.dueDate,
        cashier: 'KASIR UTAMA',
        method: cashierPaymentMethod,
        status: cashierPaymentStatus,
        paymentAmount: cashierPaymentAmount,
        discount: cashierDiscount,
        discountMode: cashierDiscountMode,
        cartItems: cashierCartItems.map(({ item, qty }) => ({ sku: item.sku, qty })),
      });
      resetCashierTransactionState();
      setCashierCheckoutOpen(false);
      setCashierSessionOpen(kind === 'Tertahan');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan sesi kasir.';
      setCashierCheckoutError(message);
    } finally {
      setCashierCheckoutSaving(false);
    }
  };
  const submitCashierCheckout = async () => {
    if (!cashierCartItems.length) return;

    try {
      setCashierCheckoutSaving(true);
      setCashierCheckoutError('');
      const saleRow = await posApi.checkoutSale({
        customerName: cashierCheckoutForm.customerName,
        phone: cashierCheckoutForm.phone,
        projectName: cashierCheckoutForm.projectName,
        customerType: cashierCheckoutForm.customerType,
        address: cashierCheckoutForm.address,
        reference: cashierCheckoutForm.reference,
        note: cashierCheckoutForm.note,
        dueDate: cashierCheckoutForm.dueDate,
        cashier: 'KASIR UTAMA',
        method: cashierPaymentMethod,
        status: cashierPaymentStatus,
        paymentAmount: cashierPaymentAmount,
        discount: cashierDiscount,
        discountMode: cashierDiscountMode,
        cartItems: cashierCartItems.map(({ item, qty }) => ({ sku: item.sku, qty })),
      });
      setCashierReceiptPreview(buildCashierReceiptPreview(saleRow));
      resetCashierTransactionState();
      setCashierCheckoutOpen(false);
      setCashierReceiptOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memproses transaksi.';
      setCashierCheckoutError(message);
    } finally {
      setCashierCheckoutSaving(false);
    }
  };
  const handleCashierSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || cashierCatalog.length !== 1) return;

    event.preventDefault();
    addCashierCartItem(cashierCatalog[0]);
  };
  const decrementCashierCartItem = (sku: string) => {
    setCashierCart((current) => {
      const nextQty = (current[sku] || 0) - 1;
      if (nextQty <= 0) {
        const { [sku]: _removed, ...rest } = current;
        return rest;
      }

      return { ...current, [sku]: nextQty };
    });
  };
  const setCashierCartItemQty = (sku: string, nextValue: string) => {
    const nextQty = Math.trunc(Number(nextValue));

    if (!Number.isFinite(nextQty)) {
      return;
    }

    setCashierCart((current) => {
      if (nextQty <= 0) {
        const { [sku]: _removed, ...rest } = current;
        return rest;
      }

      return { ...current, [sku]: nextQty };
    });
  };
  const removeCashierCartItem = (sku: string) => {
    setCashierCart((current) => {
      const { [sku]: _removed, ...rest } = current;
      return rest;
    });
  };
  const resetCashierCart = () => {
    setCashierCart({});
  };
  const toggleCatalogTrail = (item: QueueItem) => {
    setExpandedCatalogSku((current) => (current === item.sku ? null : item.sku));
  };
  const getLowStockStatus = (item: QueueItem) => (item.qty <= Math.max(1, Math.floor(stockThreshold[0] / 2)) ? 'Critical' : 'Low');
  const getLowStockSuggestion = (item: QueueItem) => Math.max(stockThreshold[0] * 2 - item.qty, stockThreshold[0]);
  const openRestockDialog = (item?: QueueItem) => {
    const target = item || restockTargetItem;
    if (!target) return;

    setRestockTargetSku(target.sku);
    setRestockQty(getLowStockSuggestion(target));
    setRestockSupplier('');
    setRestockNote('');
    setRestockError('');
    setRestockSavingSku('');
    setRestockDialogOpen(true);
  };
  const submitRestockItem = async () => {
    const target = restockTargetItem;

    if (!target) {
      const message = 'Barang restok belum dipilih.';
      setRestockError(message);
      pushStockActionMessage('danger', message);
      return;
    }

    try {
      setRestockSavingSku(target.sku);
      setRestockError('');

      const addedQty = Math.trunc(Number(restockQty));
      if (!Number.isFinite(addedQty) || addedQty <= 0) {
        throw new Error('Qty restok harus lebih dari 0.');
      }

      await posApi.restockCatalogItem(target.sku, addedQty, {
        supplier: restockSupplier,
        note: restockNote,
      });
      pushStockActionMessage('success', `Restok ${target.name} tersimpan. Stok bertambah ${addedQty} ${target.unit}.`);
      setRestockDialogOpen(false);
      setRestockTargetSku('');
      setRestockQty(0);
      setRestockSupplier('');
      setRestockNote('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal melakukan restok.';
      setRestockError(message);
      pushStockActionMessage('danger', message);
    } finally {
      setRestockSavingSku('');
    }
  };
  const getCatalogTrailRowsForItem = (item: QueueItem) => {
    const normalizedItemName = item.name.trim().toUpperCase();
    const rows = data.stockHistoryRows
      .filter((row) => row.sku === item.sku || row.item.trim().toUpperCase() === normalizedItemName)
      .map((row) => ({
        time: row.time,
        event: row.event,
        movement: row.movement,
        note: row.note || row.source || '-',
      }));

    return showSalesCatalogTrail ? rows : rows.filter((row) => row.event !== 'Penjualan');
  };
  const describeCatalogTrail = (trail: CatalogTrailRow) => `${trail.event} pada ${trail.time}${trail.note ? ` - ${trail.note}` : ''}`;
  const getStockHistoryMovementTone = (movement: string) => {
    if (movement.trim().startsWith('+')) {
      return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.3)]';
    }

    if (movement.trim().startsWith('-')) {
      return 'border-rose-400/30 bg-rose-500/15 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.34)]';
    }

    return 'border-border bg-muted/30 text-foreground';
  };
  const getStockHistoryEventVariant = (event: string) => {
    if (event === 'Restok') return 'success';
    if (event === 'Penjualan') return 'danger';
    if (event === 'Penyesuaian') return 'warning';
    return 'secondary';
  };
  const getStockHistoryMovementIcon = (movement: string) => {
    if (movement.trim().startsWith('+')) return ArrowUp;
    if (movement.trim().startsWith('-')) return ArrowDown;
    return ArrowUpDown;
  };
  const formatSignedNumber = (value: number) => `${value > 0 ? '+' : ''}${value}`;
  const toggleCatalogSort = (key: CatalogSortKey) => {
    if (catalogSortKey === key) {
      setCatalogSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
      setCatalogPage(1);
      return;
    }

    setCatalogSortKey(key);
    setCatalogSortDirection('asc');
    setCatalogPage(1);
  };
  const getCatalogSortIcon = (key: CatalogSortKey) => {
    if (catalogSortKey !== key) {
      return ArrowUpDown;
    }

    return catalogSortDirection === 'asc' ? ArrowUp : ArrowDown;
  };
  const renderCatalogSortHeader = (label: string, key: CatalogSortKey) => {
    const Icon = getCatalogSortIcon(key);

    return (
      <button
        type="button"
        onClick={() => toggleCatalogSort(key)}
        className="inline-flex items-center gap-1.5 text-left transition-colors hover:text-foreground"
        aria-label={`Sort ${label}`}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };
  const toggleTransactionSort = (key: TransactionSortKey) => {
    if (transactionSortKey === key) {
      setTransactionSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
      setTransactionPage(1);
      return;
    }

    setTransactionSortKey(key);
    setTransactionSortDirection('asc');
    setTransactionPage(1);
  };
  const getTransactionSortIcon = (key: TransactionSortKey) => {
    if (transactionSortKey !== key) {
      return ArrowUpDown;
    }

    return transactionSortDirection === 'asc' ? ArrowUp : ArrowDown;
  };
    const renderTransactionSortHeader = (label: string, key: TransactionSortKey) => {
      const Icon = getTransactionSortIcon(key);

      return (
        <button
          type="button"
          onClick={() => toggleTransactionSort(key)}
          className="inline-flex items-center gap-1.5 text-left font-semibold tracking-[0.08em] text-foreground/90 transition-colors hover:text-foreground"
          aria-label={`Sort ${label}`}
        >
          <span>{label}</span>
          <Icon className="h-3.5 w-3.5 opacity-90" />
        </button>
      );
    };
  const toggleReceivableSort = (key: ReceivableSortKey) => {
    if (receivableSortKey === key) {
      setReceivableSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
      setReceivablePage(1);
      return;
    }

    setReceivableSortKey(key);
    setReceivableSortDirection('asc');
    setReceivablePage(1);
  };
  const getReceivableSortIcon = (key: ReceivableSortKey) => {
    if (receivableSortKey !== key) {
      return ArrowUpDown;
    }

    return receivableSortDirection === 'asc' ? ArrowUp : ArrowDown;
  };
  const renderReceivableSortHeader = (label: string, key: ReceivableSortKey) => {
    const Icon = getReceivableSortIcon(key);

      return (
        <button
          type="button"
          onClick={() => toggleReceivableSort(key)}
          className="inline-flex items-center gap-1.5 text-left font-semibold tracking-[0.08em] text-foreground/90 transition-colors hover:text-foreground"
          aria-label={`Sort ${label}`}
        >
          <span>{label}</span>
          <Icon className="h-3.5 w-3.5 opacity-90" />
        </button>
      );
  };
  React.useEffect(() => {
    setCatalogPage((current) => Math.min(current, catalogPageCount));
  }, [catalogPageCount]);
  React.useEffect(() => {
    setCatalogPage(1);
  }, [catalogCategoryFilter]);
  React.useEffect(() => {
    setStockHistoryPage((current) => Math.min(current, stockHistoryPageCount));
  }, [stockHistoryPageCount]);
  React.useEffect(() => {
    setStockHistoryPage(1);
  }, [range?.from, range?.to, stockHistoryFilter, stockHistorySearch]);
  React.useEffect(() => {
    setTransactionPage(1);
  }, [range?.from, range?.to, transactionMethodFilter, transactionSearch, transactionStatusFilter]);
  React.useEffect(() => {
    setTransactionPage((current) => Math.min(current, transactionPageCount));
  }, [transactionPageCount]);
  React.useEffect(() => {
    setReceivablePage(1);
    setReceivableExpandedInvoice(null);
  }, [range?.from, range?.to, receivableMethodFilter, receivableOverdueOnly, receivableSearch, receivableStatusFilter, receivableSortDirection, receivableSortKey]);
  React.useEffect(() => {
    setReceivablePage((current) => Math.min(current, receivablePageCount));
  }, [receivablePageCount]);
  React.useEffect(() => {
    if (!localFinanceEnabled) {
      return;
    }

    let active = true;

    const syncFinanceRows = async () => {
      try {
        const [nextReceivables, nextDebts, nextBackups, nextHealth] = await Promise.all([
          posApi.listReceivableRows(),
          posApi.listSupplierDebtRows(),
          posApi.listDatabaseBackups(),
          posApi.checkDatabaseHealth(),
        ]);

        if (!active) {
          return;
        }

        setReceivableRowsData(nextReceivables);
        setSupplierDebtRowsData(nextDebts);
        setDatabaseBackupRows(nextBackups);
        setDatabaseHealth(nextHealth);
      } catch (error) {
        if (active) {
          console.error('Gagal sinkron finance rows', error);
        }
      }
    };

    void syncFinanceRows();
    const handleUpdate = () => {
      void syncFinanceRows();
    };

    window.addEventListener(posApi.eventName, handleUpdate);

    return () => {
      active = false;
      window.removeEventListener(posApi.eventName, handleUpdate);
    };
  }, [localFinanceEnabled]);
  React.useEffect(() => {
    if (!localFinanceEnabled) {
      setDatabaseBackupRows(databaseBackupFallbackRows);
    }
  }, [databaseBackupFallbackRows, localFinanceEnabled]);
  React.useEffect(() => {
    void syncAppSettings(true);
  }, [localFinanceEnabled]);
  React.useEffect(() => {
    void refreshUserAccess(true);
  }, [localFinanceEnabled]);
  React.useEffect(() => {
    if (sessionRolePermissions) {
      setRolePermissionDraft(sessionRolePermissions as Record<UserPermissionRole, PosMenuId[]>);
    }
  }, [sessionRolePermissions]);
  React.useEffect(() => {
    if (!visibleSidebarItems.some((item) => item.label === activeMenu)) {
      setActiveMenu(visibleSidebarItems[0]?.label ?? 'Dashboard');
    }
  }, [activeMenu, visibleSidebarItems]);
  React.useEffect(() => {
    if (!localFinanceEnabled) {
      setReportBackendData(null);
      return;
    }

    let active = true;

    const syncReportData = async () => {
      try {
        const nextReport = await posApi.getReportData({
          from: range?.from ? startOfDay(range.from).toISOString() : undefined,
          to: range?.to ? endOfDay(range.to).toISOString() : range?.from ? endOfDay(range.from).toISOString() : undefined,
          lowStockThreshold: stockThreshold[0],
        });

        if (active) {
          setReportBackendData(nextReport);
        }
      } catch (error) {
        if (active) {
          console.error('Gagal sinkron report data', error);
          setReportBackendData(null);
        }
      }
    };

    void syncReportData();

    return () => {
      active = false;
    };
  }, [localFinanceEnabled, range?.from, range?.to, stockThreshold]);
  React.useEffect(() => {
    const busy = Boolean(
      cashierCheckoutOpen ||
      cashierCheckoutSaving ||
      cashierSessionOpen ||
      cashierReceiptOpen ||
      catalogDialogOpen ||
      catalogDeleteOpen ||
      catalogPrintOpen ||
      categoryDialogOpen ||
      exportDialogOpen ||
      importDialogOpen ||
      importSaving ||
      batchBarcodeOpen ||
      restockDialogOpen ||
      restockSavingSku ||
      supplierDebtDialogOpen ||
      supplierDebtPaymentOpen ||
      supplierDebtReceiptPreview ||
      receivablePaymentOpen ||
      receivableReceiptPreview ||
      reportPrintPreview ||
      databaseHardResetOpen ||
      databaseHardResetSaving ||
      rolePermissionOpen ||
      userDialogOpen ||
      userDeleteOpen ||
      userDeleteSaving ||
      totpDialogOpen ||
      auditDialogOpen
    );

    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [
    auditDialogOpen,
    batchBarcodeOpen,
    cashierCheckoutOpen,
    cashierCheckoutSaving,
    cashierReceiptOpen,
    cashierSessionOpen,
    catalogDeleteOpen,
    catalogDialogOpen,
    catalogPrintOpen,
    categoryDialogOpen,
    databaseHardResetOpen,
    databaseHardResetSaving,
    exportDialogOpen,
    importDialogOpen,
    importSaving,
    onBusyChange,
    receivablePaymentOpen,
    receivableReceiptPreview,
    reportPrintPreview,
    restockDialogOpen,
    restockSavingSku,
    rolePermissionOpen,
    supplierDebtDialogOpen,
    supplierDebtPaymentOpen,
    supplierDebtReceiptPreview,
    totpDialogOpen,
    userDeleteOpen,
    userDeleteSaving,
    userDialogOpen,
  ]);
  React.useEffect(() => {
    setLowStockCategoryFilter('Semua kategori');
  }, [stockThreshold]);
  React.useEffect(() => {
    if (activeMenu !== 'Kasir') {
      clearCashierScanBuffer();
      setCashierScanError('');
      return;
    }
    const scanGapMs = 70;
    const scanResetMs = 120;
    const scanMinLength = 4;

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    };

    const flushIfIdle = (now: number) => {
      const times = cashierScanTimesRef.current;
      const lastTime = times[times.length - 1];
      if (lastTime && now - lastTime > scanResetMs) {
        clearCashierScanBuffer();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const now = performance.now();
      flushIfIdle(now);

      if (event.key === 'Escape') {
        clearCashierScanBuffer();
        return;
      }

      if (event.key === 'Enter') {
        const buffer = cashierScanBufferRef.current.trim();
        const times = cashierScanTimesRef.current;
        const isScannerBurst =
          cashierScanCandidateRef.current &&
          buffer.length >= scanMinLength &&
          times.length >= scanMinLength &&
          times.slice(1).every((time, index) => time - times[index] <= scanGapMs);

        if (isScannerBurst) {
          event.preventDefault();
          event.stopPropagation();
          processCashierScannedCode(buffer);
          clearCashierScanBuffer();
          setCashierSearch('');
          return;
        }

        clearCashierScanBuffer();
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const previousTime = cashierScanTimesRef.current.at(-1);
      if (previousTime && now - previousTime > scanResetMs) {
        clearCashierScanBuffer();
      }

      cashierScanBufferRef.current += event.key;
      cashierScanTimesRef.current.push(now);

      const times = cashierScanTimesRef.current;
      const likelyScanner =
        times.length >= 2 &&
        times.slice(1).every((time, index) => time - times[index] <= scanGapMs) &&
        cashierScanBufferRef.current.length >= scanMinLength;

      cashierScanCandidateRef.current = likelyScanner;

      if (likelyScanner) {
        event.preventDefault();
        event.stopPropagation();
      } else if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeMenu]);
  const openDeleteCatalogDialog = (item: QueueItem) => {
    setCatalogTargetSku(item.sku);
    setCatalogDraft({ ...item });
    setCatalogError('');
    setCatalogDeleteOpen(true);
  };
  const openPrintCatalogDialog = (item: QueueItem) => {
    setCatalogTargetSku(item.sku);
    setCatalogDraft({ ...item });
    setCatalogError('');
    setCatalogPrintOpen(true);
  };
  const submitCatalogDraft = async () => {
    try {
      setCatalogSaving(true);
      setCatalogError('');

      const validationError = getCatalogDraftValidationError(catalogDraft);
      if (validationError) {
        setCatalogError(validationError);
        return;
      }

      if (catalogDraftDuplicate) {
        setCatalogError(catalogDraftDuplicateMessage);
        return;
      }

      if (catalogMode === 'create') {
        await posApi.createCatalogItem({ ...catalogDraft, price: formatRupiahInput(catalogDraft.price) });
      } else {
        await posApi.updateCatalogItem(catalogTargetSku, { ...catalogDraft, price: formatRupiahInput(catalogDraft.price) });
      }

      setCatalogDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan barang.';
      setCatalogError(message);
    } finally {
      setCatalogSaving(false);
    }
  };
  const confirmDeleteCatalog = async () => {
    try {
      setCatalogSaving(true);
      setCatalogError('');
      await posApi.deleteCatalogItem(catalogTargetSku);
      setCatalogDeleteOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menghapus barang.';
      setCatalogError(message);
    } finally {
      setCatalogSaving(false);
    }
  };
  const exportCatalogToCsv = async () => {
    const fileName = getExportFileName('xlsx');
    const rows = data.posCatalog.map((item) => ({
      'Nama barang': item.name,
      Kategori: item.category,
      Qty: item.qty,
      Satuan: item.unit,
      Harga: item.price,
    }));
    await saveWorkbookFile(fileName, [{ name: 'Katalog', rows }]);
  };
  const exportStockHistoryToCsv = () => {
    const fileName = `${slugFilePart(storeName)}-riwayat-stok-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
    const rows = stockHistoryRows.map((row) => ({
      Barang: row.item,
      Event: row.event,
      Movement: row.movement,
      'Stok sebelum': row.beforeQty ?? '',
      'Stok sesudah': row.afterQty ?? '',
      Operator: row.operator ?? 'SYSTEM',
      Sumber: row.source ?? row.event,
      Jam: row.time,
      Catatan: row.note,
    }));
    void saveWorkbookFile(fileName, [{ name: 'Riwayat Stok', rows }]);
  };
  const exportTransactionsWorkbook = async (fileName: string) => {
    const summaryRows = transactionRows.map((row) => ({
      ...(() => {
        const totalNumber = getRupiahNumber(row.total);
        const paidNumber = row.paymentAmount ? getRupiahNumber(row.paymentAmount) : row.status === 'Lunas' ? totalNumber : 0;
        const remainingNumber = Math.max(0, totalNumber - paidNumber);

        return {
          Total: formatRupiahNumber(totalNumber),
          Dibayar: formatRupiahNumber(paidNumber),
          Sisa: formatRupiahNumber(remainingNumber),
        };
      })(),
      Invoice: row.invoice,
      Pelanggan: row.customerName ?? row.customer,
      Kasir: row.cashier,
      Metode: row.method,
      Status: row.status,
      Bayar: row.paymentAmount ?? '-',
      Waktu: row.time,
    }));

    const itemRows = transactionRows.flatMap((row) =>
      (row.items ?? []).map((item, index) => ({
        Invoice: row.invoice,
        No: index + 1,
        Item: item.name,
        Qty: item.qty,
        Satuan: item.unit,
        Harga: formatRupiahNumber(item.price),
        Total: formatRupiahNumber(item.subtotal),
      }))
    );

    await saveWorkbookFile(fileName, [
      { name: 'Transaksi', rows: summaryRows },
      { name: 'Item Transaksi', rows: itemRows },
    ]);
  };
  const exportDatabaseSummaryWorkbook = async (fileName: string) => {
    const rows = [
      { Metrik: 'Jumlah barang', Nilai: data.posCatalog.length },
      { Metrik: 'Jumlah transaksi', Nilai: transactionRows.length },
      { Metrik: 'Riwayat stok', Nilai: stockHistoryRows.length },
      { Metrik: 'Piutang', Nilai: receivableRowsData.length },
      { Metrik: 'Hutang supplier', Nilai: supplierDebtRowsData.length },
      { Metrik: 'Backup terbaru', Nilai: databaseBackupVisibleRows[0]?.file ?? '-' },
      { Metrik: 'Health check', Nilai: databaseHealthVisible.database },
      { Metrik: 'Schema version', Nilai: databaseHealthVisible.schemaVersion },
      { Metrik: 'Lokasi data', Nilai: databaseHealthVisible.dbPath },
    ];

    await saveWorkbookFile(fileName, [{ name: 'Ringkasan', rows }]);
  };
  const normalizeCatalogDraftPrice = () => {
    setCatalogDraft((current) => ({
      ...current,
      price: formatRupiahInput(current.price),
    }));
  };
  const submitCategoryRename = async () => {
    try {
      setCatalogSaving(true);
      setCategoryError('');
      await posApi.renameCatalogCategory(categoryTarget, categoryNextName);
      setCategoryNextName('');
      setCategoryDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengubah kategori.';
      setCategoryError(message);
    } finally {
      setCatalogSaving(false);
    }
  };
  const parseImportText = async (): Promise<QueueItem[]> => {
    const lines = importText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      throw new Error('Masukkan minimal satu baris data barang.');
    }

    const dataLines = /nama|barang|kategori|harga|stok|qty/i.test(lines[0]) ? lines.slice(1) : lines;
    const items: QueueItem[] = [];
    const existingKeys = new Set(data.posCatalog.map((item) => getCatalogDuplicateKey(item)));
    const importKeys = new Set<string>();

    for (const [index, line] of dataLines.entries()) {
      const rowNumber = index + 1;
      const [name = '', category = '', qty = '0', unit = '', price = ''] = splitImportLine(line);

      if (!name.trim() || !category.trim() || !qty.trim() || !unit.trim() || !price.trim()) {
        throw new Error(`Baris ${rowNumber} belum lengkap. Format wajib: NAMA, KATEGORI, QTY, SATUAN, HARGA.`);
      }

      const qtyValue = Number(qty.replace(/[^\d]/g, ''));
      if (!Number.isFinite(qtyValue) || qtyValue < 0) {
        throw new Error(`Baris ${rowNumber} memiliki qty tidak valid.`);
      }

      if (!price.replace(/[^\d]/g, '')) {
        throw new Error(`Baris ${rowNumber} memiliki harga tidak valid.`);
      }

      const duplicateKey = getCatalogDuplicateKey({ name, category, unit });
      if (existingKeys.has(duplicateKey)) {
        throw new Error(`Baris ${rowNumber} duplikat dengan barang yang sudah ada: ${name.trim().toUpperCase()}.`);
      }

      if (importKeys.has(duplicateKey)) {
        throw new Error(`Baris ${rowNumber} duplikat dengan baris import sebelumnya: ${name.trim().toUpperCase()}.`);
      }

      importKeys.add(duplicateKey);

      items.push({
        sku: await posApi.generateCatalogBarcode(),
        name,
        category,
        qty: qtyValue,
        unit,
        note: '',
        price: formatRupiahInput(price),
      });
    }

    if (!items.length) {
      throw new Error('Data import tidak memiliki nama barang yang valid.');
    }

    return items;
  };
  const submitImportCatalog = async () => {
    try {
      setImportSaving(true);
      setImportError('');
      const items = await parseImportText();
      await posApi.importCatalogItems(items);
      setImportText('');
      setImportFileName('');
      setImportDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal import barang.';
      setImportError(message);
    } finally {
      setImportSaving(false);
    }
  };
  const toggleBatchSku = (sku: string) => {
    setBatchSelectedSkus((current) =>
      current.includes(sku) ? current.filter((item) => item !== sku) : [...current, sku]
    );
  };
  const handleImportFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setImportError('');
    setImportFileName(file.name);

    try {
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const XLSX = await loadXlsxModule();
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;
        if (!firstSheet) {
          throw new Error('Workbook Excel tidak memiliki sheet yang bisa dibaca.');
        }

        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false, defval: '' }) as string[][];
        const normalizedText = rows
          .map((row) => row.map((cell) => String(cell ?? '').trim()).join('\t'))
          .filter((line) => line.trim().length > 0)
          .join('\n');

        if (!normalizedText.trim()) {
          throw new Error('Workbook Excel kosong.');
        }

        setImportText(normalizedText);
        return;
      }

      const text = await file.text();
      setImportText(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal membaca file import.';
      setImportError(message);
    }
  };
  const resetRangeToToday = () => {
    const today = new Date();
    setRange({
      from: today,
      to: today,
    });
  };
  const clearRangeFilter = () => {
    setRange(undefined);
  };
  const renderRangeSelector = () => (
    <div className="flex justify-end">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 min-w-[260px] justify-between rounded-lg px-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              <CalendarRange className="h-3.5 w-3.5" />
              <span className="truncate">{rangeLabel}</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 rotate-90 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Periode</div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 rounded-lg px-2 text-xs"
                onClick={clearRangeFilter}
              >
                Semua
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 rounded-lg px-2 text-xs"
                onClick={resetRangeToToday}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Hari ini
              </Button>
            </div>
          </div>
          <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
        </PopoverContent>
      </Popover>
    </div>
  );
  const renderFeatureModal = ({
    title,
    trigger,
    icon: Icon,
    tone = 'outline',
    width = '38rem',
    rows,
    primary = 'Terapkan',
  }: {
    title: string;
    trigger: string;
    icon: MenuIcon;
    tone?: 'outline' | 'primary';
    width?: string;
    rows: Array<{ label: string; value: string }>;
    primary?: string;
  }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={tone === 'primary' ? 'default' : 'outline'}
          className="h-8 rounded-xl px-4 text-xs font-semibold"
        >
          <Icon className="h-3.5 w-3.5" />
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-none" style={{ width: `min(92vw, ${width})` }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Mockup alur fitur dari aplikasi POS lama.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <ContextIcon label={`${title} ${row.label} ${row.value}`} />
              <div className="grid min-w-0 gap-1">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{row.label}</div>
                <div className="text-sm font-medium leading-relaxed">{row.value}</div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Tutup
            </Button>
          </DialogClose>
          <Button type="button">{primary}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderRolePermissionDialog = () => {
    if (!canManageRolePermissions) {
      return (
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl px-3 text-xs" disabled>
          <ShieldCheck className="h-3.5 w-3.5" />
          Hak akses
        </Button>
      );
    }

    return (
      <Dialog open={rolePermissionOpen} onOpenChange={setRolePermissionOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl px-3 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Hak akses
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[92vh] w-[min(96vw,76rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pengaturan hak akses halaman</DialogTitle>
            <DialogDescription>Hanya admin yang dapat mengubah akses halaman untuk setiap level user.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/8 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <ContextIcon label="admin hak akses role permission" className="border-sky-400/30 bg-sky-500/10" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Sesi aktif: {activeSessionUser.name}</div>
                  <div className="text-xs text-muted-foreground">@{activeSessionUser.username} / {activeSessionRole} / admin only</div>
                </div>
              </div>
              <Badge variant="success" className="w-fit rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                Diizinkan
              </Badge>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {(['Admin', 'Supervisor', 'Kasir'] as UserPermissionRole[]).map((role) => {
                const rolePermissions = rolePermissionDraft[role] ?? [];
                const locked = role === 'Admin';

                return (
                  <Card key={role} className={locked ? 'border-emerald-500/20 bg-emerald-500/8' : 'bg-muted/10'}>
                    <CardHeader className="border-b border-border py-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
                          {locked ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                          {role}
                        </CardTitle>
                        <Badge variant={locked ? 'success' : 'secondary'} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                          {locked ? 'Full access' : `${rolePermissions.length} halaman`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-2 p-3">
                      {permissionModuleRows.map((module) => {
                        const enabled = rolePermissions.includes(module.id);
                        const Icon = sidebarItems.find((item) => item.label === module.id)?.icon ?? FileText;

                        return (
                          <button
                            key={`${role}-${module.id}`}
                            type="button"
                            aria-pressed={enabled}
                            disabled={locked}
                            className={[
                              'grid gap-2 rounded-xl border p-3 text-left transition sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center',
                              enabled ? 'border-emerald-500/30 bg-emerald-500/8' : 'border-border bg-background/70 opacity-70',
                              locked ? 'cursor-not-allowed' : 'hover:border-sky-400/40 hover:bg-sky-500/5',
                            ].join(' ')}
                            onClick={() => toggleRolePermission(role, module.id)}
                          >
                            <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background/80">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">{module.id}</span>
                              <span className="block text-xs text-muted-foreground">{module.note}</span>
                            </span>
                            <Badge variant={enabled ? 'success' : 'outline'} className="w-fit rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                              {enabled ? (
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <EyeOff className="h-3 w-3" />
                                  Off
                                </span>
                              )}
                            </Badge>
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={resetRolePermissionsToDefault}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset default
            </Button>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Tutup
                </Button>
              </DialogClose>
              <Button type="button" onClick={() => setRolePermissionOpen(false)}>
                <Save className="h-3.5 w-3.5" />
                Simpan hak akses
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  const renderTotpSetupDialog = () => (
    <Dialog open={totpDialogOpen} onOpenChange={setTotpDialogOpen}>
      <DialogContent className="w-[min(94vw,34rem)]">
        <DialogHeader>
          <DialogTitle>Setup TOTP {totpSetupUser ? `@${totpSetupUser.username}` : ''}</DialogTitle>
          <DialogDescription>Masukkan manual key ke Google Authenticator, lalu verifikasi 6 digit kode.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-border bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Manual key</div>
            <div className="mt-2 break-all rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm font-semibold tracking-[0.08em]">
              {totpManualKey || '-'}
            </div>
          </div>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Kode 6 digit</span>
            <input
              value={totpCode}
              onChange={(event) => {
                setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                setTotpError('');
              }}
              className="h-11 rounded-xl border border-border bg-background px-3 text-center font-mono text-lg tracking-[0.35em] outline-none focus:border-sky-400/70"
              placeholder="000000"
              inputMode="numeric"
            />
          </label>
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Otpauth URL tersimpan untuk kompatibilitas authenticator: <span className="break-all font-mono">{totpOtpAuthUrl}</span>
          </div>
          {totpError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-200">
              {totpError}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Batal
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleTotpVerify} disabled={totpCode.length !== 6}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Verifikasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderUserEditorDialog = () => (
    <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
      <DialogContent className="w-[min(94vw,34rem)]">
        <DialogHeader>
          <DialogTitle>{userDialogMode === 'create' ? 'Tambah pengguna' : 'Edit pengguna'}</DialogTitle>
          <DialogDescription>{userDialogMode === 'create' ? 'User baru mendapat temporary password dan wajib mengganti password saat login pertama.' : 'Ubah nama, role, dan status aktif user.'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Username</span>
            <input
              value={userDraftUsername}
              onChange={(event) => setUserDraftUsername(event.target.value)}
              disabled={userDialogMode === 'edit'}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none disabled:opacity-60"
              placeholder="kasir03"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nama user</span>
            <input value={userDraftName} onChange={(event) => setUserDraftName(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none" placeholder="Kasir Toko" />
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            {(['Kasir', 'Supervisor', 'Admin'] as UserRow['role'][]).map((role) => (
              <Button key={role} type="button" variant={userDraftRole === role ? 'default' : 'outline'} className="h-9 rounded-xl text-xs" onClick={() => setUserDraftRole(role)}>
                {role}
              </Button>
            ))}
          </div>
          <Button type="button" variant={userDraftActive ? 'secondary' : 'outline'} className="h-9 rounded-xl text-xs" onClick={() => setUserDraftActive((current) => !current)}>
            {userDraftActive ? 'Status: Aktif' : 'Status: Nonaktif'}
          </Button>
          {userDraftError ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-200">{userDraftError}</div> : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Batal</Button>
          </DialogClose>
          <Button type="button" onClick={submitUserDraft}>
            <Save className="h-3.5 w-3.5" />
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderUserDeleteDialog = () => (
    <Dialog open={userDeleteOpen} onOpenChange={setUserDeleteOpen}>
      <DialogContent className="w-[min(94vw,32rem)]">
        <DialogHeader>
          <DialogTitle>Konfirmasi hapus user</DialogTitle>
          <DialogDescription>
            Aksi ini akan menghapus akun user dari aplikasi, mencabut sesi aktif user tersebut, dan tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            User yang akan dihapus
          </div>
          <div className="grid gap-1 text-xs text-rose-100/80">
            <div>{userDeleteTarget?.name || '-'}</div>
            <div>@{userDeleteTarget?.username || '-'}</div>
            <div>Role: {userDeleteTarget?.role || '-'}</div>
          </div>
        </div>

        {userDeleteError ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {userDeleteError}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={userDeleteSaving}>
              Batal
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={confirmDeleteUser} disabled={userDeleteSaving || !userDeleteTarget}>
            {userDeleteSaving ? 'Menghapus...' : 'Ya, hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderAuditDialog = () => (
    <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
      <DialogContent className="max-h-[88vh] w-[min(96vw,58rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit akses</DialogTitle>
          <DialogDescription>Log aksi penting dari login, recovery, password, TOTP, dan perubahan user.</DialogDescription>
        </DialogHeader>
        {auditError ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-200">{auditError}</div> : null}
        <div className="grid gap-2">
          <div className="hidden grid-cols-[150px_150px_150px_minmax(0,1fr)] gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground md:grid">
            <div>Waktu</div>
            <div>User</div>
            <div>Aksi</div>
            <div>Catatan</div>
          </div>
          {auditRows.length ? auditRows.map((row) => (
            <div key={row.id} className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 text-sm md:grid-cols-[150px_150px_150px_minmax(0,1fr)]">
              <div className="text-xs text-muted-foreground">{row.time}</div>
              <div className="font-medium">{row.actor}</div>
              <Badge variant="secondary" className="w-fit rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">{row.action}</Badge>
              <div className="text-xs text-muted-foreground">{row.reason}</div>
            </div>
          )) : <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Belum ada audit log.</div>}
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderCashierCalculatorModal = () => (
    <Dialog open={cashierCalculatorOpen} onOpenChange={setCashierCalculatorOpen}>
      <Button
        type="button"
        variant="outline"
        className="h-8 rounded-xl px-4 text-xs font-semibold"
        onClick={() => setCashierCalculatorOpen(true)}
      >
        <Calculator className="h-3.5 w-3.5" />
        Kalkulator
      </Button>
      <DialogContent className="w-[min(92vw,36rem)]">
        <DialogHeader>
          <DialogTitle>Kalkulator kasir</DialogTitle>
          <DialogDescription>Hitung ekspresi sederhana lalu isi hasilnya ke nominal bayar.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ekspresi</span>
            <input
              autoFocus
              type="text"
              value={cashierCalculatorExpression}
              onChange={(event) => {
                setCashierCalculatorExpression(event.target.value);
                setCashierCalculatorError('');
                setCashierCalculatorResult(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleCashierCalculatorCompute();
                }
              }}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
              placeholder="Contoh: 12 x 5 + 2"
            />
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', 'C', '+'].map((key) => (
              <Button
                key={key}
                type="button"
                variant={key === 'C' ? 'outline' : 'secondary'}
                className="h-10 rounded-lg text-sm font-semibold"
                onClick={() => {
                  if (key === 'C') {
                    setCashierCalculatorExpression('');
                    setCashierCalculatorResult(null);
                    setCashierCalculatorError('');
                    return;
                  }
                  setCashierCalculatorExpression((current) => `${current}${key}`);
                }}
              >
                {key}
              </Button>
            ))}
          </div>
          <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Hasil</span>
              <span className="text-xl font-semibold">{cashierCalculatorResult === null ? '0' : cashierCalculatorResult.toLocaleString('id-ID')}</span>
            </div>
            {cashierCalculatorError ? <div className="text-sm text-red-200">{cashierCalculatorError}</div> : null}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Tutup
            </Button>
          </DialogClose>
          <Button type="button" variant="outline" onClick={handleCashierCalculatorCompute}>
            Hitung
          </Button>
          <Button type="button" onClick={applyCashierCalculatorToPayment}>
            Pakai hasil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderCatalogEditorButton = () => (
    <Button
      type="button"
      className="h-8 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 px-4 text-xs font-semibold text-amber-950 shadow-[0_10px_24px_rgba(245,158,11,0.25)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(245,158,11,0.32)]"
      onClick={openCreateCatalogDialog}
    >
      <Plus className="h-3.5 w-3.5" />
      Tambah barang
    </Button>
  );

  const renderCatalogEditorModal = () => (
    <Dialog open={catalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
      <DialogContent className="w-[min(92vw,42rem)]">
        <DialogHeader>
          <DialogTitle>{catalogMode === 'create' ? 'Tambah barang' : 'Edit barang'}</DialogTitle>
          <DialogDescription>
            {catalogMode === 'create'
              ? 'Masukkan data katalog barang baru untuk POS.'
              : 'Ubah data barang yang sudah ada.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              label: 'Nama barang',
              key: 'name' as const,
              help: 'Nama produk yang akan tampil di kasir, laporan, dan price checker.',
              placeholder: 'Semen 50kg',
            },
            {
              label: 'Kategori',
              key: 'category' as const,
              help: 'Kelompok barang untuk filter, laporan, dan navigasi katalog.',
              placeholder: 'Semen / Cat / Besi / Pasir',
            },
            {
              label: 'Qty',
              key: 'qty' as const,
              help: 'Jumlah stok barang yang tersedia saat ini.',
              placeholder: '0',
            },
            {
              label: 'Satuan',
              key: 'unit' as const,
              help: 'Satuan barang seperti sak, batang, lembar, kaleng, atau truk.',
              placeholder: 'sak',
            },
            {
              label: 'Harga',
              key: 'price' as const,
              help: 'Isi harga jual yang akan dipakai saat transaksi.',
              placeholder: 'Rp 72.000',
            },
          ].map((field) => (
            <label key={field.key} className="grid gap-2">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <ContextIcon label={field.label} className="h-7 w-7" />
                {field.label}
              </span>
              <input
                type={field.key === 'qty' ? 'number' : 'text'}
                value={catalogDraft[field.key]}
                onChange={(event) => {
                  setCatalogError('');
                  setCatalogDraft((current) => ({
                    ...current,
                    [field.key]:
                      field.key === 'qty'
                        ? Number(event.target.value)
                        : ['name', 'category', 'unit'].includes(field.key)
                          ? event.target.value.toUpperCase()
                          : event.target.value,
                  }));
                }}
                onBlur={field.key === 'price' ? normalizeCatalogDraftPrice : undefined}
                placeholder={field.placeholder}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
              />
              <div className="text-xs leading-relaxed text-muted-foreground">{field.help}</div>
            </label>
          ))}
        </div>

        {catalogDraftDuplicateMessage ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {catalogDraftDuplicateMessage}
          </div>
        ) : null}

        {catalogError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {catalogError}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={catalogSaving}>
              Batal
            </Button>
          </DialogClose>
          <Button type="button" onClick={submitCatalogDraft} disabled={catalogSaving || Boolean(catalogDraftDuplicate)}>
            {catalogSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderCatalogDeleteModal = () => (
    <Dialog open={catalogDeleteOpen} onOpenChange={setCatalogDeleteOpen}>
      <DialogContent className="w-[min(92vw,30rem)]">
        <DialogHeader>
          <DialogTitle>Konfirmasi hapus</DialogTitle>
          <DialogDescription>
            Tindakan ini akan menghapus {catalogDraft.name || 'barang'} dari katalog lokal dan tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Barang yang akan dihapus
          </div>
          <div className="grid gap-1 text-xs text-red-100/80">
            <div>{catalogDraft.name || '-'}</div>
            <div>Barcode: {catalogDraft.sku || '-'}</div>
          </div>
        </div>

        {catalogError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {catalogError}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={catalogSaving}>
              Batal
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={confirmDeleteCatalog} disabled={catalogSaving}>
            {catalogSaving ? 'Menghapus...' : 'Ya, hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderCatalogPrintModal = () => (
    <Dialog open={catalogPrintOpen} onOpenChange={setCatalogPrintOpen}>
      <DialogContent className="w-[min(92vw,32rem)]">
        <DialogHeader>
          <DialogTitle>Cetak barcode</DialogTitle>
          <DialogDescription>
            Siapkan label barcode untuk {catalogDraft.name || 'barang'} dengan kode {catalogDraft.sku || 'otomatis'}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Barcode</div>
          <div className="text-2xl font-semibold tracking-[0.18em]">{catalogDraft.sku || '-'}</div>
          <div className="text-sm text-muted-foreground">{catalogDraft.name || 'Barang belum dipilih'}</div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Tutup
            </Button>
          </DialogClose>
          <Button type="button">Cetak</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderCategoryManagerModal = () => (
    <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-8 rounded-xl px-4 text-xs font-semibold">
          <Archive className="h-3.5 w-3.5" />
          Kategori
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,40rem)]">
        <DialogHeader>
          <DialogTitle>Kelola kategori material</DialogTitle>
          <DialogDescription>Rename kategori akan memutakhirkan semua barang yang memakai kategori tersebut.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            {categorySummary.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setCategoryTarget(item.name);
                  setCategoryNextName(item.name);
                }}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  categoryTarget === item.name ? 'border-amber-400/50 bg-amber-500/10' : 'border-border bg-muted/20 hover:bg-muted/30'
                }`}
              >
                <Badge variant="outline" className={`rounded-lg px-3 py-1 text-xs ${getCategoryBadgeClass(item.name)}`}>
                  {item.name}
                </Badge>
                <span className="text-xs text-muted-foreground">{item.count} barang</span>
              </button>
            ))}
          </div>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nama kategori baru</span>
            <input
              value={categoryNextName}
              onChange={(event) => setCategoryNextName(event.target.value.toUpperCase())}
              placeholder="CONTOH: SEMEN"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
            />
          </label>

          {categoryError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {categoryError}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={catalogSaving}>
              Tutup
            </Button>
          </DialogClose>
          <Button type="button" onClick={submitCategoryRename} disabled={catalogSaving || !categoryTarget || !categoryNextName.trim()}>
            <Save className="h-3.5 w-3.5" />
            {catalogSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderExportCatalogModal = () => (
    <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-8 rounded-xl px-4 text-xs font-semibold">
          <Download className="h-3.5 w-3.5" />
          Export Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,38rem)]">
        <DialogHeader>
          <DialogTitle>Export katalog material</DialogTitle>
        <DialogDescription>File XLSX bisa dibuka di Excel untuk backup atau edit massal.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-4 text-sm">
            {[
              ['Total barang', `${data.posCatalog.length} item`],
              ['Kategori', `${categorySummary.length} kategori`],
              ['Kolom', 'Nama, kategori, qty, satuan, harga'],
              ['Format', 'XLSX kompatibel Excel'],
              ['Nama file', getExportFileName('xlsx')],
              ['Lokasi simpan', 'Dipilih saat export bila browser mendukung'],
              ['Barcode', 'Otomatis saat import atau tambah barang'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
          <div className="max-h-48 overflow-auto rounded-xl border border-border">
            {data.posCatalog.slice(0, 6).map((item) => (
              <div key={item.sku} className="grid grid-cols-[minmax(0,1fr)_100px_110px] gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0">
                <div className="truncate font-medium">{item.name}</div>
                <div className="truncate text-muted-foreground">{item.category}</div>
                <div className="text-right">{item.price}</div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Tutup
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => void exportCatalogToCsv()}>
            <Download className="h-3.5 w-3.5" />
            Pilih lokasi & export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderImportBarangModal = () => (
    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-8 rounded-xl px-4 text-xs font-semibold">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,42rem)]">
        <DialogHeader>
          <DialogTitle>Import barang dari Excel</DialogTitle>
          <DialogDescription>Paste data dari Excel atau pilih file XLSX dengan kolom nama, kategori, qty, satuan, dan harga.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/20 p-1">
            {[
              { id: 'paste' as const, label: 'Paste Excel', icon: ClipboardList },
              { id: 'file' as const, label: 'File Excel', icon: Upload },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setImportMode(mode.id)}
                  className={`flex h-9 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors ${
                    importMode === mode.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-4 text-sm">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Format kolom</div>
            <div className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
              NAMA BARANG, KATEGORI, QTY, SATUAN, HARGA
            </div>
            <div className="text-xs text-muted-foreground">
              Barcode dibuat otomatis. Pemisah boleh koma, titik koma, atau tab hasil copy dari Excel.
            </div>
          </div>

          {importMode === 'paste' ? (
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={`SEMEN 50KG, SEMEN, 20, SAK, 72000\nBESI BETON 10MM, BESI, 12, BATANG, 98000`}
              className="min-h-36 rounded-xl border border-border bg-background p-3 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
            />
          ) : (
            <label className="grid min-h-36 cursor-pointer place-items-center gap-3 rounded-xl border border-dashed border-border bg-background p-4 text-center transition-colors hover:bg-muted/20">
              <input
                type="file"
                accept=".csv,.txt,.xls,.xlsx"
                className="sr-only"
                onChange={(event) => handleImportFile(event.target.files?.[0])}
              />
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="grid gap-1">
                <span className="text-sm font-medium">{importFileName || 'Pilih file import'}</span>
                <span className="text-xs text-muted-foreground">CSV, TXT, XLS, dan XLSX langsung diproses.</span>
              </span>
            </label>
          )}

          {importMode === 'file' && importText ? (
            <div className="max-h-32 overflow-auto rounded-xl border border-border bg-muted/10 p-3 font-mono text-xs text-muted-foreground">
              {importText.split(/\r?\n/).slice(0, 5).join('\n')}
            </div>
          ) : null}

          {importError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {importError}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={importSaving}>
              Tutup
            </Button>
          </DialogClose>
          <Button type="button" onClick={submitImportCatalog} disabled={importSaving || !importText.trim()}>
            <Upload className="h-3.5 w-3.5" />
            {importSaving ? 'Mengimport...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderBatchBarcodeModal = () => (
    <Dialog open={batchBarcodeOpen} onOpenChange={setBatchBarcodeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-8 rounded-xl px-4 text-xs font-semibold">
          <Barcode className="h-3.5 w-3.5" />
          Barcode batch
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,42rem)]">
        <DialogHeader>
          <DialogTitle>Cetak barcode batch</DialogTitle>
          <DialogDescription>Pilih barang yang akan dibuatkan label barcode untuk rak atau kemasan.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="max-h-72 overflow-auto rounded-xl border border-border">
            {data.posCatalog.map((item) => (
              <label
                key={item.sku}
                className="flex cursor-pointer items-center justify-between gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-muted/20"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={batchSelectedSkus.includes(item.sku)}
                    onChange={() => toggleBatchSku(item.sku)}
                    className="h-4 w-4 accent-amber-400"
                  />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.sku}</span>
                  </span>
                </span>
                <Badge variant="outline" className={`rounded-md px-2.5 py-0.5 text-[11px] ${getCategoryBadgeClass(item.category)}`}>
                  {item.category}
                </Badge>
              </label>
            ))}
          </div>
          <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Label dipilih</span>
              <span className="font-semibold">{selectedBatchItems.length} barang</span>
            </div>
            {selectedBatchItems.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedBatchItems.slice(0, 4).map((item) => (
                  <div key={item.sku} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="font-mono text-muted-foreground">{item.sku}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Tutup
            </Button>
          </DialogClose>
          <Button type="button" disabled={!selectedBatchItems.length}>
            <Printer className="h-3.5 w-3.5" />
            Cetak {selectedBatchItems.length || ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderStockThresholdModal = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="h-8 min-w-[220px] justify-between rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 px-4 text-xs font-semibold text-amber-950 shadow-[0_10px_24px_rgba(245,158,11,0.25)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(245,158,11,0.32)]"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Atur threshold
          </span>
          <span className="rounded-md border border-amber-950/20 bg-amber-50/80 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
            &lt; {stockThreshold[0]}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,34rem)]">
        <DialogHeader>
          <DialogTitle>Atur threshold stok rendah</DialogTitle>
          <DialogDescription>Kontrol ini dibuat ringkas seperti pengaturan volume.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <ContextIcon label="Threshold stok rendah" className="h-7 w-7" />
                Threshold
              </div>
              <div className="rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold">
                &lt; {stockThreshold[0]}
              </div>
            </div>
            <Slider
              value={stockThreshold}
              onValueChange={setStockThreshold}
              min={5}
              max={100}
              step={1}
              className="[&_[data-slot=slider-range]]:bg-amber-400"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>5</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Batal
            </Button>
          </DialogClose>
          <Button type="button">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderLowStockExportModal = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-8 rounded-xl px-4 text-xs font-semibold">
          <Download className="h-3.5 w-3.5" />
          Export restok
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,38rem)]">
        <DialogHeader>
          <DialogTitle>Export permintaan restok</DialogTitle>
          <DialogDescription>Di proyek lama data stok rendah bisa diekspor ke Excel untuk purchase request.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <ContextIcon label="Ringkasan export restok" className="h-7 w-7" />
              Ringkasan export
            </div>
            {[
              ['Item kritis', `${lowStockCount} item`],
              ['Format', 'Excel / CSV'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <ContextIcon label={label} className="h-7 w-7" />
                  {label}
                </span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Tutup
            </Button>
          </DialogClose>
          <Button type="button">Download file</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderLowStockUpdateModal = () => (
    <Dialog
      open={restockDialogOpen}
      onOpenChange={(open) => {
        if (!open && restockSavingSku) return;
        setRestockDialogOpen(open);
        if (!open) {
          setRestockError('');
        }
      }}
    >
      <DialogContent className="w-[min(94vw,40rem)] max-h-[calc(100svh-1.5rem)] overflow-hidden p-0 sm:w-[min(92vw,44rem)]">
        <div className="grid max-h-[calc(100svh-1.5rem)] gap-3 overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Restok barang</DialogTitle>
          <DialogDescription>Dialog ini fokus ke satu barang yang dipilih. Isi qty restok, lalu simpan agar stok katalog bertambah otomatis.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-3 rounded-[22px] border border-amber-400/30 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(245,158,11,0.06))] p-3 shadow-[0_0_0_1px_rgba(245,158,11,0.16),0_14px_36px_rgba(245,158,11,0.12)] sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="grid gap-1.5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-amber-100/80">
                  <Truck className="h-3.5 w-3.5" />
                  Item terpilih
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <ContextIcon label={`${restockTargetItem?.name || 'barang'} restok`} className="h-8 w-8" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-amber-50 sm:text-base">
                      {restockTargetItem?.name || 'Belum ada barang dipilih'}
                    </div>
                    <div className="truncate text-xs text-amber-100/80">
                      {restockTargetItem ? `${restockTargetItem.category} • ${restockTargetItem.unit}` : 'Pilih item dari daftar di bawah'}
                    </div>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="w-fit rounded-md border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-amber-50">
                {restockTargetItem ? `${restockTargetItem.qty} ${restockTargetItem.unit}` : '-'}
              </Badge>
            </div>
            <div className="grid gap-2 text-xs text-amber-50/80 sm:grid-cols-3">
              <div className="rounded-xl border border-amber-400/15 bg-black/10 px-2.5 py-2">Kategori: {restockTargetItem?.category || '-'}</div>
              <div className="rounded-xl border border-amber-400/15 bg-black/10 px-2.5 py-2">Stok aktif: {restockTargetItem ? `${restockTargetItem.qty} ${restockTargetItem.unit}` : '-'}</div>
              <div className="rounded-xl border border-amber-400/15 bg-black/10 px-2.5 py-2">Saran: {restockTargetItem ? `+${getLowStockSuggestion(restockTargetItem)} ${restockTargetItem.unit}` : '-'}</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Qty restok</span>
              <input
                type="number"
                min={1}
                value={restockQty}
                onChange={(event) => setRestockQty(Number(event.target.value))}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-amber-400/60"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Supplier</span>
              <input
                value={restockSupplier}
                onChange={(event) => setRestockSupplier(event.target.value.toUpperCase())}
                placeholder="NAMA SUPPLIER"
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
              />
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Catatan</span>
            <textarea
              value={restockNote}
              onChange={(event) => setRestockNote(event.target.value)}
              placeholder="Misal: barang masuk dari supplier / untuk proyek tertentu"
              className="min-h-20 rounded-xl border border-border bg-background p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
            />
          </label>

          <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stok baru</span>
              <span className="font-semibold">
                {restockTargetItem ? restockTargetItem.qty + Math.trunc(Number(restockQty) || 0) : 0}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Supplier dan catatan dicatat sebagai konteks restok. Qty final mengikuti item yang dipilih.
            </div>
          </div>
        </div>

        {restockError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {restockError}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={Boolean(restockSavingSku)}>
              Batal
            </Button>
          </DialogClose>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={submitRestockItem}
            disabled={Boolean(restockSavingSku) || !restockTargetItem}
          >
            {restockSavingSku ? 'Menyimpan...' : 'Konfirmasi restok'}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
  const updateSupplierDebtDraftItem = (index: number, field: keyof SupplierDebtItem, value: string | number) => {
    setSupplierDebtDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === 'name' || field === 'category' || field === 'unit'
                ? String(value).toUpperCase()
                : Math.max(0, Number(value) || 0),
            }
          : item
      ),
    }));
  };
  const submitSupplierDebt = async () => {
    try {
      const supplier = supplierDebtDraft.supplier.trim().toUpperCase();
      const due = supplierDebtDraft.due.trim();
      const takeDate = supplierDebtDraft.takeDate.trim() || format(new Date(), 'dd MMM yyyy');
      const validItems = supplierDebtDraft.items
        .map((item) => ({
          ...item,
          name: item.name.trim().toUpperCase(),
          category: item.category.trim().toUpperCase(),
          unit: item.unit.trim().toUpperCase() || 'PCS',
        }))
        .filter((item) => item.name && item.category && item.packQty > 0 && item.price > 0);

      if (!supplier) {
        setSupplierDebtError('Supplier wajib diisi.');
        return;
      }
      if (!validItems.length) {
        setSupplierDebtError('Minimal satu item hutang wajib lengkap: nama, kategori, qty, dan harga.');
        return;
      }

      if (localFinanceEnabled) {
        const created = await posApi.createSupplierDebt({
          supplier,
          takeDate,
          due,
          items: validItems,
        });
        await posApi.receiveSupplierDebtStock({
          supplier,
          takeDate,
          items: validItems,
        });

        setExpandedDebtId(created.id);
      } else {
        await posApi.receiveSupplierDebtStock({
          supplier,
          takeDate,
          items: validItems,
        });

        const nextNumber = supplierDebtRowsData.length + 1;
        const total = validItems.reduce((sum, item) => sum + getSupplierDebtItemSubtotal(item), 0);
        const nextRow: SupplierDebtRow = {
          id: `HS-${String(nextNumber).padStart(6, '0')}`,
          supplier,
          supplierPhone: '',
          supplierAddress: '',
          takeDate,
          due: due || '-',
          total: formatRupiahNumber(total),
          paid: 'Rp 0',
          remaining: formatRupiahNumber(total),
          status: 'Belum lunas',
          note: 'Hutang supplier dari restok barang.',
          collectionNote: 'Belum ada catatan penagihan.',
          items: validItems,
          paymentHistory: [],
          stockTrail: validItems.flatMap((item) => [{
            time: `${format(new Date(), 'dd MMM yyyy HH:mm')}`,
            item: item.name,
            movement: `+${item.packQty} ${item.unit}`,
            note: `Masuk dari hutang supplier ${supplier}`,
          }]),
        };

        setSupplierDebtRowsData((current) => [nextRow, ...current]);
        setExpandedDebtId(nextRow.id);
      }

      setSupplierDebtDraft(createDefaultSupplierDebtDraft());
      setSupplierDebtError('');
      setSupplierDebtDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan hutang supplier.';
      setSupplierDebtError(message);
    }
  };
  const openSupplierDebtPaymentModal = (row: SupplierDebtRow, settleFull = false, editIndex: number | null = null) => {
    const payment = editIndex !== null ? row.paymentHistory[editIndex] : null;
    setSupplierDebtPaymentTargetId(row.id);
    setSupplierDebtPaymentEditIndex(payment ? editIndex : null);
    setSupplierDebtPaymentAmount(payment?.amount ?? (settleFull ? row.remaining : ''));
    setSupplierDebtPaymentMethod(payment?.method ?? 'Tunai');
    setSupplierDebtPaymentNote(payment?.note ?? (settleFull ? 'Pelunasan penuh' : ''));
    setSupplierDebtPaymentError('');
    setSupplierDebtPaymentOpen(true);
    setExpandedDebtId(row.id);
  };
  const submitSupplierDebtPayment = async () => {
    const target = supplierDebtRowsData.find((item) => item.id === supplierDebtPaymentTargetId);
    if (!target) {
      setSupplierDebtPaymentError('Data hutang supplier tidak ditemukan.');
      return;
    }

    const paymentValue = getRupiahNumber(supplierDebtPaymentAmount);
    const editedPaymentValue = supplierDebtPaymentEditIndex !== null ? getRupiahNumber(target.paymentHistory[supplierDebtPaymentEditIndex]?.amount ?? '') : 0;
    const maxPaymentAmount = getRupiahNumber(target.remaining) + editedPaymentValue;
    if (paymentValue <= 0) {
      setSupplierDebtPaymentError('Nominal pembayaran wajib lebih dari 0.');
      return;
    }
    if (paymentValue > maxPaymentAmount) {
      setSupplierDebtPaymentError(`Nominal tidak boleh melebihi sisa hutang ${formatRupiahNumber(maxPaymentAmount)}.`);
      return;
    }

    const paymentNote = supplierDebtPaymentNote.trim() || (paymentValue === maxPaymentAmount ? 'Pelunasan penuh' : 'Pembayaran sebagian');

    if (localFinanceEnabled) {
      const currentPayment = supplierDebtPaymentEditIndex !== null ? target.paymentHistory[supplierDebtPaymentEditIndex] : null;
      if (currentPayment?.id) {
        await posApi.deleteSupplierDebtPayment(target.id, currentPayment.id);
      }

      await posApi.createSupplierDebtPayment(target.id, {
        amount: formatRupiahNumber(paymentValue),
        method: supplierDebtPaymentMethod,
        note: paymentNote,
      });
    } else {
      const now = format(new Date(), 'dd MMM yyyy HH:mm');
      const nextPayment: SupplierDebtPaymentEntry = {
        time: supplierDebtPaymentEditIndex !== null ? target.paymentHistory[supplierDebtPaymentEditIndex]?.time ?? now : now,
        amount: formatRupiahNumber(paymentValue),
        method: supplierDebtPaymentMethod,
        receiver: 'Admin Toko',
        note: paymentNote,
      };
      const nextHistory =
        supplierDebtPaymentEditIndex !== null
          ? target.paymentHistory.map((payment, index) => (index === supplierDebtPaymentEditIndex ? nextPayment : payment))
          : [nextPayment, ...target.paymentHistory];

      setSupplierDebtRowsData((current) =>
        current.map((row) => (row.id === target.id ? applySupplierDebtPaymentHistory(row, nextHistory) : row))
      );
    }

    setSupplierDebtPaymentOpen(false);
    setSupplierDebtPaymentTargetId('');
    setSupplierDebtPaymentAmount('');
    setSupplierDebtPaymentNote('');
    setSupplierDebtPaymentEditIndex(null);
    setSupplierDebtPaymentError('');
    setExpandedDebtId(target.id);
  };
  const deleteSupplierDebtPayment = async (row: SupplierDebtRow, paymentIndex: number) => {
    const payment = row.paymentHistory[paymentIndex];
    if (!payment || !window.confirm(`Hapus pembayaran ${payment.amount} dari ${row.id}?`)) {
      return;
    }

    if (localFinanceEnabled && payment.id) {
      await posApi.deleteSupplierDebtPayment(row.id, payment.id);
      return;
    }

    const nextHistory = row.paymentHistory.filter((_, index) => index !== paymentIndex);
    setSupplierDebtRowsData((current) =>
      current.map((item) => (item.id === row.id ? applySupplierDebtPaymentHistory(item, nextHistory) : item))
    );
  };
  const deleteSupplierDebt = async (row: SupplierDebtRow) => {
    if (!window.confirm(`Hapus hutang supplier ${row.id} - ${row.supplier}?`)) {
      return;
    }

    if (localFinanceEnabled) {
      await posApi.deleteSupplierDebt(row.id);
      return;
    }

    setSupplierDebtRowsData((current) => current.filter((item) => item.id !== row.id));
    setExpandedDebtId(null);
  };
  const openSupplierDebtPrintPreview = (row: SupplierDebtRow) => {
    setSupplierDebtReceiptPreview({ row });
  };
  const printSupplierDebtReceiptPreview = (preview: SupplierDebtReceiptPreview) => {
    const popup = window.open('', '_blank', 'width=840,height=980');
    if (!popup) {
      setSupplierDebtPaymentError('Popup cetak diblokir browser.');
      return;
    }

    const escapeHtml = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const payment = preview.payment;
    const itemsHtml = preview.row.items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.category)}</td>
            <td>${item.boxQty || '-'}</td><td>${item.packQty} ${escapeHtml(item.unit)}</td>
            <td>${formatRupiahNumber(item.price)}</td><td>${formatRupiahNumber(getSupplierDebtItemSubtotal(item))}</td>
          </tr>`
      )
      .join('');

    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(preview.row.id)}</title>
      <style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#111827}.header{display:flex;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:14px}.store{font-size:22px;font-weight:800;letter-spacing:.08em}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px}.row{display:flex;justify-content:space-between;gap:16px;border-bottom:1px dotted #d1d5db;padding:5px 0}.row span:first-child{color:#6b7280;text-transform:uppercase;font-size:10px;letter-spacing:.08em}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#0f172a;color:#fff;text-align:left;padding:8px;font-size:10px;text-transform:uppercase}td{border:1px solid #e5e7eb;padding:8px}.summary{margin-left:auto;width:320px;margin-top:16px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:36px;text-align:center}.sign div{border-top:1px solid #111827;padding-top:8px}.trail{margin-top:14px}.trail-item{border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin-top:6px}</style>
    </head><body>
      <section class="header"><div><div class="store">${escapeHtml(storeName)}</div><div>Desa Palandan Kecamatan Baebunta</div><div>Telp. 085230791657</div></div><div style="text-align:right"><h2>${payment ? 'Bukti Pembayaran Hutang Supplier' : 'Hutang Supplier'}</h2><div>${escapeHtml(preview.row.id)}</div><div>${payment ? escapeHtml(payment.time) : escapeHtml(preview.row.takeDate)}</div></div></section>
      <section class="grid"><div class="box"><div class="row"><span>Supplier</span><strong>${escapeHtml(preview.row.supplier)}</strong></div><div class="row"><span>Tanggal ambil</span><strong>${escapeHtml(preview.row.takeDate)}</strong></div><div class="row"><span>Jatuh tempo</span><strong>${escapeHtml(preview.row.due)}</strong></div></div><div class="box">${payment ? `<div class="row"><span>Metode</span><strong>${escapeHtml(payment.method)}</strong></div><div class="row"><span>Penerima</span><strong>${escapeHtml(payment.receiver)}</strong></div><div class="row"><span>Status</span><strong>${escapeHtml(preview.row.status)}</strong></div>` : `<div class="row"><span>Status</span><strong>${escapeHtml(preview.row.status)}</strong></div><div class="row"><span>Dibayar</span><strong>${escapeHtml(preview.row.paid)}</strong></div><div class="row"><span>Sisa</span><strong>${escapeHtml(preview.row.remaining)}</strong></div>`}</div></section>
      <section class="grid"><div class="box"><div class="row"><span>Telepon</span><strong>${escapeHtml(preview.row.supplierPhone || '-')}</strong></div><div class="row"><span>Alamat</span><strong>${escapeHtml(preview.row.supplierAddress || '-')}</strong></div></div><div class="box"><div class="row"><span>Catatan penagihan</span><strong>${escapeHtml(preview.row.collectionNote || '-')}</strong></div></div></section>
      <table><thead><tr><th>No</th><th>Barang</th><th>Kategori</th><th>Box</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <section class="box summary"><div class="row"><span>Total hutang</span><strong>${escapeHtml(preview.row.total)}</strong></div><div class="row"><span>Total dibayar</span><strong>${escapeHtml(preview.row.paid)}</strong></div>${payment ? `<div class="row"><span>Bayar sekarang</span><strong>${escapeHtml(payment.amount)}</strong></div>` : ''}<div class="row"><span>Sisa hutang</span><strong>${escapeHtml(preview.row.remaining)}</strong></div></section>
      <section class="trail"><div class="box"><div class="row"><span>Jejak stok</span><strong>${escapeHtml(preview.row.stockTrail.length ? `${preview.row.stockTrail.length} entri` : '-')}</strong></div></div>${preview.row.stockTrail.map((trail) => `<div class="trail-item"><div class="row"><span>${escapeHtml(trail.item)}</span><strong>${escapeHtml(trail.movement)}</strong></div><div class="row"><span>${escapeHtml(trail.time)}</span><strong>${escapeHtml(trail.note)}</strong></div></div>`).join('')}</section>
      <section class="box" style="margin-top:16px"><div class="row"><span>Catatan</span><strong>${escapeHtml(payment?.note || preview.row.note || '-')}</strong></div></section>
      <section class="sign"><div>Admin Toko</div><div>Supplier</div></section>
      <script>window.onload=function(){window.focus();window.print();}</script>
    </body></html>`);
    popup.document.close();
  };
  const openReceivablePaymentModal = (row?: ReceivableRow, settleFull = false, editIndex: number | null = null) => {
    const target = row || paginatedReceivableRows[0] || filteredReceivableRows[0] || receivableRowsData[0];
    if (!target) {
      return;
    }

    const payment = editIndex !== null ? target.paymentHistory[editIndex] : null;
    setReceivablePaymentTargetInvoice(target.invoice);
    setReceivablePaymentEditIndex(payment ? editIndex : null);
    setReceivablePaymentMethod(payment?.method ?? target.method);
    setReceivablePaymentAmount(payment?.amount ?? (settleFull ? target.remaining : ''));
    setReceivablePaymentNote(payment?.note ?? (settleFull ? 'Pelunasan penuh' : ''));
    setReceivablePaymentError('');
    setReceivablePaymentOpen(true);
    setReceivableExpandedInvoice(target.invoice);
  };
  const submitReceivablePayment = async () => {
    const target = receivableRowsData.find((item) => item.invoice === receivablePaymentTargetInvoice);
    if (!target) {
      setReceivablePaymentError('Invoice piutang tidak ditemukan.');
      return;
    }

    const paymentValue = getRupiahNumber(receivablePaymentAmount);
    const currentRemaining = getRupiahNumber(target.remaining);
    const editedPaymentValue = receivablePaymentEditIndex !== null ? getRupiahNumber(target.paymentHistory[receivablePaymentEditIndex]?.amount ?? '') : 0;
    const maxAllowedPayment = currentRemaining + editedPaymentValue;
    if (!paymentValue || paymentValue <= 0) {
      setReceivablePaymentError('Nominal pembayaran wajib diisi.');
      return;
    }
    if (paymentValue > maxAllowedPayment) {
      setReceivablePaymentError(`Nominal pembayaran tidak boleh melebihi sisa tagihan ${formatRupiahNumber(maxAllowedPayment)}.`);
      return;
    }

    const applied = paymentValue;
    const note = receivablePaymentNote.trim() || (applied === maxAllowedPayment ? 'Pelunasan penuh' : 'Pembayaran sebagian');

    if (localFinanceEnabled) {
      const currentPayment = receivablePaymentEditIndex !== null ? target.paymentHistory[receivablePaymentEditIndex] : null;
      if (currentPayment?.id) {
        await posApi.deleteReceivablePayment(target.id || target.invoice, currentPayment.id);
      }

      await posApi.createReceivablePayment(target.id || target.invoice, {
        amount: formatRupiahNumber(applied),
        method: receivablePaymentMethod,
        note,
      });
    } else {
      const now = format(new Date(), 'dd MMM yyyy HH:mm');
      const nextPayment: ReceivablePaymentEntry = {
        time: receivablePaymentEditIndex !== null ? target.paymentHistory[receivablePaymentEditIndex]?.time ?? now : now,
        amount: formatRupiahNumber(applied),
        method: receivablePaymentMethod,
        note,
      };
      const nextHistory: ReceivablePaymentEntry[] =
        receivablePaymentEditIndex !== null
          ? target.paymentHistory.map((payment, index) => (index === receivablePaymentEditIndex ? nextPayment : payment))
          : [nextPayment, ...target.paymentHistory];

      setReceivableRowsData((current) =>
        current.map((row) =>
          row.invoice === target.invoice
            ? applyReceivablePaymentHistory(row, nextHistory)
            : row
        )
      );
    }

    setReceivablePaymentOpen(false);
    setReceivablePaymentTargetInvoice('');
    setReceivablePaymentAmount('');
    setReceivablePaymentNote('');
    setReceivablePaymentError('');
    setReceivablePaymentEditIndex(null);
    setReceivableExpandedInvoice(target.invoice);
  };
  const deleteReceivablePayment = async (row: ReceivableRow, paymentIndex: number) => {
    const payment = row.paymentHistory[paymentIndex];
    if (!payment) {
      return;
    }

    const confirmed = window.confirm(`Hapus pembayaran ${payment.amount} dari ${row.invoice}?`);
    if (!confirmed) {
      return;
    }

    if (localFinanceEnabled && payment.id) {
      await posApi.deleteReceivablePayment(row.id || row.invoice, payment.id);
      return;
    }

    const nextHistory = row.paymentHistory.filter((_, index) => index !== paymentIndex);
    setReceivableRowsData((current) =>
      current.map((item) => (item.invoice === row.invoice ? applyReceivablePaymentHistory(item, nextHistory) : item))
    );
    setReceivableExpandedInvoice(row.invoice);
  };
  const openReceivableReceiptPreview = (row: ReceivableRow, payment: ReceivablePaymentEntry) => {
    setReceivableReceiptPreview({ row, payment });
  };
  const renderSupplierDebtDialog = () => {
    const draftTotal = supplierDebtDraft.items.reduce((sum, item) => sum + getSupplierDebtItemSubtotal(item), 0);

    return (
      <Dialog open={supplierDebtDialogOpen} onOpenChange={setSupplierDebtDialogOpen}>
        <DialogContent className="max-h-[92vh] w-[min(94vw,64rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah hutang supplier</DialogTitle>
            <DialogDescription>Catat barang masuk dari supplier yang belum dibayar.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-3">
              {[
                ['supplier', 'Supplier', 'CV SUMBER MATERIAL'],
                ['takeDate', 'Tanggal ambil', '28 Apr 2026'],
                ['due', 'Jatuh tempo (opsional)', 'Kosongkan bila tidak ada'],
              ].map(([field, label, placeholder]) => (
                <label key={field} className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
                  <input
                    value={supplierDebtDraft[field as keyof SupplierDebtDraft] as string}
                    onChange={(event) =>
                      setSupplierDebtDraft((current) => ({
                        ...current,
                        [field]: field === 'supplier' ? event.target.value.toUpperCase() : event.target.value,
                      }))
                    }
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60"
                    placeholder={placeholder}
                  />
                </label>
              ))}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Daftar barang</div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => setSupplierDebtDraft((current) => ({ ...current, items: [...current.items, createEmptySupplierDebtItem()] }))}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah item
                </Button>
              </div>
              <div className="grid gap-2">
                {supplierDebtDraft.items.map((item, index) => {
                  const duplicateWarning = getSupplierDebtDuplicateWarning(item, data.posCatalog);

                  return (
                    <div key={index} className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_80px_90px_112px_36px]">
                      {duplicateWarning ? (
                        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 lg:col-span-6">
                          {duplicateWarning}
                        </div>
                      ) : null}
                      <input value={item.name} onChange={(event) => updateSupplierDebtDraftItem(index, 'name', event.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none" placeholder="NAMA BARANG" />
                      <input value={item.category} onChange={(event) => updateSupplierDebtDraftItem(index, 'category', event.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none" placeholder="KATEGORI" />
                      <input value={item.packQty || ''} onChange={(event) => updateSupplierDebtDraftItem(index, 'packQty', event.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none" placeholder="QTY" />
                      <input value={item.unit} onChange={(event) => updateSupplierDebtDraftItem(index, 'unit', event.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none" placeholder="UNIT" />
                      <input value={item.price || ''} onChange={(event) => updateSupplierDebtDraftItem(index, 'price', event.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none" placeholder="HARGA" />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg px-2 text-xs text-red-200"
                        onClick={() => setSupplierDebtDraft((current) => ({ ...current, items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index) }))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total hutang</span>
              <span className="text-lg font-semibold">{formatRupiahNumber(draftTotal)}</span>
            </div>

            {supplierDebtError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{supplierDebtError}</div> : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Batal</Button>
            </DialogClose>
            <Button type="button" onClick={submitSupplierDebt}>Simpan hutang</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  const renderSupplierDebtPaymentModal = () => {
    const target = supplierDebtRowsData.find((item) => item.id === supplierDebtPaymentTargetId);
    const editedPaymentValue = target && supplierDebtPaymentEditIndex !== null ? getRupiahNumber(target.paymentHistory[supplierDebtPaymentEditIndex]?.amount ?? '') : 0;
    const maxPaymentAmount = target ? getRupiahNumber(target.remaining) + editedPaymentValue : 0;
    const currentPaymentAmount = getRupiahNumber(supplierDebtPaymentAmount);
    const remainingAfterPayment = Math.max(0, maxPaymentAmount - currentPaymentAmount);
    const quickAmounts = Array.from(new Set([500000, 1000000, 2000000, maxPaymentAmount].filter((amount) => amount > 0 && amount <= maxPaymentAmount)));

    return (
      <Dialog
        open={supplierDebtPaymentOpen}
        onOpenChange={(open) => {
          setSupplierDebtPaymentOpen(open);
          if (!open) {
            setSupplierDebtPaymentEditIndex(null);
            setSupplierDebtPaymentError('');
          }
        }}
      >
        <DialogContent className="w-[min(92vw,42rem)]">
          <DialogHeader>
            <DialogTitle>{supplierDebtPaymentEditIndex !== null ? 'Edit pembayaran hutang' : 'Catat pembayaran hutang'}</DialogTitle>
            <DialogDescription>Nominal boleh parsial sampai sisa hutang menjadi nol.</DialogDescription>
          </DialogHeader>

          {target ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-amber-100/75">Supplier</div>
                    <div className="text-base font-semibold text-amber-50">{target.supplier}</div>
                    <div className="text-sm text-amber-100/80">{target.id} / Sisa {formatRupiahNumber(maxPaymentAmount)}</div>
                  </div>
                  <Badge variant={isSupplierDebtOverdue(target) ? 'danger' : target.status === 'Lunas' ? 'success' : 'warning'} className="rounded-md px-3 py-1">
                    {isSupplierDebtOverdue(target) ? 'Overdue' : target.status}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nominal pembayaran</span>
                    <input
                      autoFocus
                      value={supplierDebtPaymentAmount}
                      onChange={(event) => {
                        setSupplierDebtPaymentAmount(formatRupiahInput(event.target.value));
                        setSupplierDebtPaymentError('');
                      }}
                      placeholder={formatRupiahNumber(maxPaymentAmount)}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60"
                    />
                  </label>
                  <div className="grid gap-2">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Metode</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Tunai', 'Transfer', 'QRIS'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setSupplierDebtPaymentMethod(method)}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${supplierDebtPaymentMethod === method ? 'border-amber-400/50 bg-amber-500/15 text-amber-50' : 'border-border bg-muted/20 text-foreground'}`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Catatan</span>
                    <input
                      value={supplierDebtPaymentNote}
                      onChange={(event) => setSupplierDebtPaymentNote(event.target.value)}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60"
                      placeholder="Catatan pembayaran..."
                    />
                  </label>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Quick amount</div>
                    <div className="flex flex-wrap gap-2">
                      {quickAmounts.map((amount) => (
                        <Button key={amount} type="button" variant="secondary" className="h-8 rounded-lg px-3 text-xs" onClick={() => setSupplierDebtPaymentAmount(formatRupiahNumber(amount))}>
                          {amount === maxPaymentAmount ? 'Lunasi sisa' : formatRupiahNumber(amount)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 text-sm">
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Bayar</span><strong>{formatRupiahNumber(currentPaymentAmount)}</strong></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Sisa setelah bayar</span><strong>{formatRupiahNumber(remainingAfterPayment)}</strong></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Jatuh tempo</span><strong>{target.due}</strong></div>
                  </div>
                </div>
              </div>

              {supplierDebtPaymentError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{supplierDebtPaymentError}</div> : null}
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Batal</Button>
            </DialogClose>
            <Button type="button" onClick={submitSupplierDebtPayment} disabled={!target}>
              {supplierDebtPaymentEditIndex !== null ? 'Simpan perubahan' : 'Simpan pembayaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  const renderSupplierDebtReceiptPreviewModal = () => {
    if (!supplierDebtReceiptPreview) return null;

    const preview = supplierDebtReceiptPreview;
    const hasPayment = Boolean(preview.payment);

    return (
      <Dialog open={Boolean(supplierDebtReceiptPreview)} onOpenChange={(open) => !open && setSupplierDebtReceiptPreview(null)}>
        <DialogContent className="max-h-[92vh] w-[min(94vw,54rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{hasPayment ? 'Preview bukti pembayaran hutang' : 'Preview hutang supplier'}</DialogTitle>
            <DialogDescription>
              {hasPayment
                ? 'Format A4 untuk bukti pembayaran supplier sebelum dicetak.'
                : 'Format A4 untuk ringkasan hutang supplier sebelum dicetak.'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl bg-zinc-200/80 p-4">
            <div className="mx-auto grid max-w-[760px] gap-4 rounded-xl bg-white p-6 text-xs text-zinc-900 shadow-[0_18px_48px_rgba(15,23,42,0.2)]">
              <div className="flex items-start justify-between gap-6 border-b-2 border-zinc-900 pb-4">
                <div className="grid gap-1">
                  <div className="text-2xl font-black uppercase tracking-[0.12em]">{storeName}</div>
                  <div>Desa Palandan Kecamatan Baebunta</div>
                  <div>Telp. 085230791657</div>
                </div>
                <div className="grid gap-1 text-right">
                  <div className="text-base font-bold uppercase">{hasPayment ? 'Bukti Pembayaran Hutang Supplier' : 'Hutang Supplier'}</div>
                  <div className="font-semibold">{preview.row.id}</div>
                  <div>{hasPayment ? preview.payment?.time : preview.row.takeDate}</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  [
                    ['Supplier', preview.row.supplier],
                    ['Tanggal ambil', preview.row.takeDate],
                    ['Jatuh tempo', preview.row.due],
                  ],
                  hasPayment
                    ? [
                        ['Metode', preview.payment?.method ?? '-'],
                        ['Penerima', preview.payment?.receiver ?? '-'],
                        ['Status', preview.row.status],
                      ]
                    : [
                        ['Status', preview.row.status],
                        ['Dibayar', preview.row.paid],
                        ['Sisa', preview.row.remaining],
                      ],
                ].map((group, groupIndex) => (
                  <div key={groupIndex} className="grid gap-2 rounded-xl border border-zinc-300 p-3">
                    {group.map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 border-b border-dotted border-zinc-300 pb-1">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</span>
                        <strong className="text-right">{value}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2 rounded-xl border border-zinc-300 p-3">
                  {[
                    ['Telepon', preview.row.supplierPhone || '-'],
                    ['Alamat', preview.row.supplierAddress || '-'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-dotted border-zinc-300 pb-1">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</span>
                      <strong className="text-right">{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 rounded-xl border border-zinc-300 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Catatan penagihan</div>
                  <div className="font-semibold">{preview.row.collectionNote || '-'}</div>
                </div>
              </div>

              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    {['No', 'Barang', 'Kategori', 'Box', 'Qty', 'Harga', 'Subtotal'].map((label) => (
                      <th key={label} className="sticky top-0 z-20 bg-slate-900 px-2 py-2 text-[10px] uppercase tracking-[0.12em]">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.row.items.map((item, index) => (
                    <tr key={`${preview.row.id}-${item.name}`} className="border border-zinc-200">
                      <td className="border border-zinc-200 px-2 py-2">{index + 1}</td>
                      <td className="border border-zinc-200 px-2 py-2 font-semibold">{item.name}</td>
                      <td className="border border-zinc-200 px-2 py-2">{item.category}</td>
                      <td className="border border-zinc-200 px-2 py-2">{item.boxQty || '-'}</td>
                      <td className="border border-zinc-200 px-2 py-2">{item.packQty} {item.unit}</td>
                      <td className="border border-zinc-200 px-2 py-2">{formatRupiahNumber(item.price)}</td>
                      <td className="border border-zinc-200 px-2 py-2">{formatRupiahNumber(getSupplierDebtItemSubtotal(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="ml-auto grid w-full max-w-[320px] gap-2 rounded-xl border border-zinc-300 p-3">
                {[
                  ['Total hutang', preview.row.total],
                  ['Total dibayar', preview.row.paid],
                  ...(hasPayment ? [['Bayar sekarang', preview.payment?.amount ?? '-']] : []),
                  ['Sisa hutang', preview.row.remaining],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-dotted border-zinc-300 pb-1">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 rounded-xl border border-zinc-300 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Jejak stok</div>
                <div className="grid gap-2">
                  {preview.row.stockTrail.length ? preview.row.stockTrail.map((trail) => (
                    <div key={`${preview.row.id}-${trail.time}-${trail.item}`} className="rounded-lg border border-dotted border-zinc-300 px-3 py-2">
                      <div className="flex justify-between gap-4">
                        <strong>{trail.item}</strong>
                        <span>{trail.movement}</span>
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{trail.time} / {trail.note}</div>
                    </div>
                  )) : <div className="text-zinc-500">Belum ada jejak stok.</div>}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Tutup</Button>
            </DialogClose>
            <Button type="button" onClick={() => printSupplierDebtReceiptPreview(preview)}>
              <Printer className="h-3.5 w-3.5" />
              {hasPayment ? 'Cetak bukti' : 'Cetak hutang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  const renderReceivablePaymentModal = () => {
    const target = receivableRowsData.find((item) => item.invoice === receivablePaymentTargetInvoice) || paginatedReceivableRows[0] || filteredReceivableRows[0] || receivableRowsData[0];
    const editedPaymentValue = target && receivablePaymentEditIndex !== null ? getRupiahNumber(target.paymentHistory[receivablePaymentEditIndex]?.amount ?? '') : 0;
    const maxPaymentAmount = target ? getRupiahNumber(target.remaining) + editedPaymentValue : 0;
    const currentPaymentAmount = getRupiahNumber(receivablePaymentAmount);
    const remainingAfterPayment = target ? Math.max(0, maxPaymentAmount - currentPaymentAmount) : 0;
    const quickAmounts = Array.from(new Set([500000, 1000000, 2000000, maxPaymentAmount].filter((amount) => amount > 0 && amount <= maxPaymentAmount)));

    return (
      <Dialog
        open={receivablePaymentOpen}
        onOpenChange={(open) => {
          setReceivablePaymentOpen(open);
          if (!open) {
            setReceivablePaymentEditIndex(null);
            setReceivablePaymentError('');
          }
        }}
      >
        <DialogContent className="w-[min(92vw,44rem)]">
          <DialogHeader>
            <DialogTitle>{receivablePaymentEditIndex !== null ? 'Edit pembayaran piutang' : 'Catat pembayaran piutang'}</DialogTitle>
            <DialogDescription>Pilih nominal, metode, lalu simpan untuk memperbarui sisa tagihan.</DialogDescription>
          </DialogHeader>

          {target ? (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-2xl border border-amber-400/25 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(245,158,11,0.06))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-1">
                    <div className="text-xs uppercase tracking-[0.16em] text-amber-100/75">Invoice</div>
                    <div className="truncate text-base font-semibold text-amber-50">{target.invoice}</div>
                    <div className="truncate text-sm text-amber-100/80">{target.customerName}</div>
                  </div>
                  <Badge variant="secondary" className="rounded-md border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-amber-50">
                    {target.status}
                  </Badge>
                </div>
                <div className="grid gap-2 text-xs text-amber-50/80 sm:grid-cols-3">
                  <div>Total: {target.total}</div>
                  <div>Dibayar: {target.paid}</div>
                  <div>Sisa: {formatRupiahNumber(maxPaymentAmount)}</div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nominal pembayaran</span>
                    <input
                      autoFocus
                      value={receivablePaymentAmount}
                      onChange={(event) => {
                        setReceivablePaymentAmount(formatRupiahInput(event.target.value));
                        setReceivablePaymentError('');
                      }}
                      placeholder={target.remaining}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
                    />
                  </label>

                  <div className="grid gap-2">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Metode pembayaran</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Tunai', 'Transfer', 'QRIS', 'Cicilan'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setReceivablePaymentMethod(method)}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-colors ${
                            receivablePaymentMethod === method
                              ? 'border-amber-400/50 bg-amber-500/15 text-amber-50'
                              : 'border-border bg-muted/20 text-foreground hover:bg-muted/30'
                          }`}
                        >
                          <ContextIcon label={method} className="h-7 w-7" />
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Catatan</span>
                    <textarea
                      value={receivablePaymentNote}
                      onChange={(event) => setReceivablePaymentNote(event.target.value)}
                      placeholder="Misal: cicilan tahap 2 / pelunasan penuh / transfer bank"
                      className="min-h-24 rounded-xl border border-border bg-background p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
                    />
                  </label>

                  {receivablePaymentError ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {receivablePaymentError}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Quick amount</div>
                    <div className="flex flex-wrap gap-2">
                      {quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant="secondary"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => setReceivablePaymentAmount(formatRupiahNumber(amount))}
                        >
                          {formatRupiahNumber(amount)}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => setReceivablePaymentAmount(formatRupiahNumber(maxPaymentAmount))}
                      >
                        Lunasi sisa
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ringkasan</div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Nominal bayar</span>
                        <span className="font-medium">{formatRupiahNumber(currentPaymentAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Sisa setelah bayar</span>
                        <span className="font-medium">{formatRupiahNumber(remainingAfterPayment)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Jatuh tempo</span>
                        <span className="font-medium">{target.due}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Pembayaran terakhir</span>
                        <span className="font-medium">{target.lastPayment}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Tutup
              </Button>
            </DialogClose>
            <Button type="button" onClick={submitReceivablePayment} disabled={!target}>
              {receivablePaymentEditIndex !== null ? 'Simpan perubahan' : 'Simpan pembayaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  const getReportTabTitle = (tab: ReportTab) => {
    const titles: Record<ReportTab, string> = {
      sales: 'Ringkasan Penjualan',
      profit: 'Laporan Laba',
      cashflow: 'Rekonsiliasi Kas',
      comparison: 'Perbandingan Periode',
      comprehensive: 'Laporan Lengkap',
    };

    return titles[tab];
  };
  const buildReportPrintHtml = (tab: ReportTab) => {
    const escapeHtml = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const tableRows = (rows: string[][]) =>
      rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
        .join('');
    const section = (title: string, headers: string[], rows: string[][]) => `
      <section>
        <h2>${escapeHtml(title)}</h2>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>${rows.length ? tableRows(rows) : `<tr><td colspan="${headers.length}">Data belum tersedia.</td></tr>`}</tbody>
        </table>
      </section>
    `;
    const comparisonRows = reportDataset.comparisonRows.map((row) => {
      const current = row.format === 'currency' ? formatRupiahNumber(row.current) : String(row.current);
      const previous = row.format === 'currency' ? formatRupiahNumber(row.previous) : String(row.previous);
      const diff = row.current - row.previous;
      const diffText = row.format === 'currency' ? formatRupiahNumber(Math.abs(diff)) : String(Math.abs(diff));

      return [row.label, current, previous, `${diff >= 0 ? '+' : '-'}${diffText}`];
    });
    const transactionRowsForPrint = reportDataset.transactionLog.slice(0, 20).map((row) => [
      row.invoice,
      row.customerName,
      row.items.length
        ? row.items.map((item) => `${item.name} (${item.qty} ${item.unit})`).join(', ')
        : 'Detail item belum tersedia',
      row.method,
      row.status,
      formatRupiahNumber(row.totalNumber),
    ]);
    const topProductRows = reportDataset.topProducts.map((item) => [
      item.name,
      item.category,
      `${item.qty} item`,
      formatRupiahNumber(item.total),
    ]);
    const stockAuditRows = reportDataset.stockAuditRows.map((row) => [
      row.category,
      `${row.items} barang`,
      `${row.qty} stok`,
      `${row.low} rendah`,
      formatRupiahNumber(row.value),
    ]);
    const stockMovementCategoryRows = reportDataset.stockMovementCategoryRows.map((row) => [
      row.category,
      `${row.movementCount} mutasi`,
      formatSignedNumber(row.netMovement),
    ]);
    const stockTrailRows = reportDataset.stockTrailRows.map((row) => [
      row.time,
      row.item,
      row.event,
      formatSignedNumber(Number(row.movement) || 0),
      row.operator || '-',
    ]);
    const customerRows = reportDataset.customerByName.map((row) => [
      row.label,
      `${row.count} transaksi`,
      formatRupiahNumber(row.total),
    ]);
    const addressRows = reportDataset.customerByAddress.map((row) => [
      row.label,
      `${row.count} transaksi`,
      formatRupiahNumber(row.total),
    ]);
    const cashFlowRows = reportDataset.cashFlowRows.map((row) => [
      row.date,
      formatRupiahNumber(row.cashSales),
      formatRupiahNumber(row.adjustmentOut),
      formatRupiahNumber(row.estimatedCash),
      formatRupiahNumber(row.diff),
      row.status,
    ]);
    const summaryHtml = section('Ringkasan utama', ['Metrik', 'Nilai'], [
      ['Omzet', formatRupiahNumber(reportSummary.omzet)],
      ['Kas masuk', formatRupiahNumber(reportSummary.paid)],
      ['Piutang terbuka', formatRupiahNumber(reportSummary.receivableRemaining)],
      ['Hutang supplier', formatRupiahNumber(reportSummary.debtRemaining)],
      ['Transaksi', `${reportSummary.transactionCount} invoice`],
      ['Stok rendah', `${reportSummary.lowStockCount} barang`],
    ]);
    const bodyByTab: Record<ReportTab, string> = {
      sales: [
        summaryHtml,
        section('Produk teratas', ['Barang', 'Kategori', 'Qty', 'Omzet'], topProductRows),
        section('Pelanggan teratas', ['Pelanggan', 'Transaksi', 'Omzet'], customerRows),
        section('Log transaksi', ['Invoice', 'Pelanggan', 'Item dibeli', 'Metode', 'Status', 'Total'], transactionRowsForPrint),
      ].join(''),
      profit: [
        summaryHtml,
        section('Estimasi laba', ['Metrik', 'Nilai'], [
          ['Pendapatan', formatRupiahNumber(reportSummary.omzet)],
          ['Estimasi modal', formatRupiahNumber(reportDataset.estimatedCost)],
          ['Estimasi laba kotor', formatRupiahNumber(reportDataset.grossProfit)],
          ['Estimasi margin', `${reportDataset.margin}%`],
        ]),
        section('Kontributor omzet', ['Barang', 'Kategori', 'Qty', 'Omzet'], topProductRows),
      ].join(''),
      cashflow: [
        summaryHtml,
        section('Rekonsiliasi kas', ['Periode', 'Kas masuk', 'Kas keluar', 'Estimasi kas', 'Selisih', 'Status'], cashFlowRows),
      ].join(''),
      comparison: [
        summaryHtml,
        section('Perbandingan periode', ['Metrik', 'Periode aktif', 'Pembanding internal', 'Perubahan'], comparisonRows),
      ].join(''),
      comprehensive: [
        summaryHtml,
        section('Produk teratas', ['Barang', 'Kategori', 'Qty', 'Omzet'], topProductRows),
        section('Top 5 pelanggan', ['Pelanggan', 'Transaksi', 'Omzet'], customerRows),
        section('Top 5 alamat pelanggan', ['Alamat', 'Transaksi', 'Omzet'], addressRows),
        section('Top 5 kategori aktif', ['Kategori', 'Frekuensi mutasi', 'Mutasi bersih'], stockMovementCategoryRows),
        section('Trail stok terbaru', ['Waktu', 'Barang', 'Tipe', 'Mutasi', 'Operator'], stockTrailRows),
        section('Log transaksi', ['Invoice', 'Pelanggan', 'Item dibeli', 'Metode', 'Status', 'Total'], transactionRowsForPrint),
      ].join(''),
    };
    const title = getReportTabTitle(tab);

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { margin:0; background:#f4f5f7; color:#111827; font-family: Arial, sans-serif; }
            .page { min-height: calc(297mm - 28mm); background:#fff; padding:22px; display:grid; gap:16px; }
            header { display:flex; justify-content:space-between; gap:24px; border-bottom:2px solid #111827; padding-bottom:14px; }
            .store { display:grid; gap:4px; }
            .store strong { font-size:22px; letter-spacing:.1em; text-transform:uppercase; }
            .doc { text-align:right; display:grid; gap:5px; }
            .doc strong { font-size:18px; text-transform:uppercase; letter-spacing:.08em; }
            h2 { margin:0 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:.12em; color:#374151; }
            section { display:grid; gap:6px; break-inside:avoid; }
            table { width:100%; border-collapse:collapse; font-size:11px; }
            th { background:#0f172a; color:#fff; text-align:left; padding:8px; text-transform:uppercase; letter-spacing:.08em; font-size:9px; }
            td { border:1px solid #e5e7eb; padding:7px 8px; vertical-align:top; }
            tbody tr:nth-child(even) td { background:#f8fafc; }
          </style>
        </head>
        <body>
          <main class="page">
            <header>
              <div class="store">
                <strong>${escapeHtml(storeName)}</strong>
                <span>Desa Palandan Kecamatan Baebunta</span>
                <span>Telp. 085230791657</span>
              </div>
              <div class="doc">
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(rangeLabel)}</span>
                <span>Dicetak: ${escapeHtml(format(new Date(), 'dd MMM yyyy HH:mm'))}</span>
              </div>
            </header>
            ${bodyByTab[tab]}
          </main>
          <script>
            window.onload = function() {
              window.focus();
            };
          </script>
        </body>
      </html>
    `;
  };
  const openReportPrintPreview = () => {
    setReportPrintPreview({
      title: getReportTabTitle(reportTab),
      tab: reportTab,
      html: buildReportPrintHtml(reportTab),
    });
  };
  const printReportPreviewHtml = (preview: ReportPrintPreview) => {
    const popup = window.open('', '_blank', 'width=980,height=1080');

    if (!popup) return;

    popup.document.open();
    popup.document.write(preview.html.replace('window.focus();', 'window.focus(); window.print();'));
    popup.document.close();
  };
  const renderReportPrintPreviewModal = () => {
    if (!reportPrintPreview) return null;

    return (
      <Dialog open={Boolean(reportPrintPreview)} onOpenChange={(open) => !open && setReportPrintPreview(null)}>
        <DialogContent className="max-h-[94vh] w-[min(96vw,64rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview {reportPrintPreview.title}</DialogTitle>
            <DialogDescription>Format A4 dari data halaman aktif sebelum dicetak.</DialogDescription>
          </DialogHeader>
          <div className="h-[68vh] overflow-hidden rounded-2xl bg-zinc-200/80 p-3">
            <iframe title={reportPrintPreview.title} srcDoc={reportPrintPreview.html} className="h-full w-full rounded-xl border border-zinc-300 bg-white" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Tutup
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => printReportPreviewHtml(reportPrintPreview)}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderReceivableReceiptPreviewModal = () => {
    if (!receivableReceiptPreview) return null;

    const preview = receivableReceiptPreview;
    const saleRow = transactionRows.find((item) => item.invoice === preview.row.invoice);
    const items = (saleRow?.items ?? []).map(normalizeTransactionLineItem);

    return (
      <Dialog open={Boolean(receivableReceiptPreview)} onOpenChange={(open) => !open && setReceivableReceiptPreview(null)}>
        <DialogContent className="max-h-[92vh] w-[min(94vw,54rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview bukti pembayaran piutang</DialogTitle>
            <DialogDescription>Format A4 untuk bukti pembayaran customer sebelum dicetak.</DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl bg-zinc-200/80 p-4">
            <div className="mx-auto grid max-w-[760px] gap-4 rounded-xl bg-white p-6 text-xs text-zinc-900 shadow-[0_18px_48px_rgba(15,23,42,0.2)]">
              <div className="flex items-start justify-between gap-6 border-b-2 border-zinc-900 pb-4">
                <div className="grid gap-1">
                  <div className="text-2xl font-black uppercase tracking-[0.12em]">{storeName}</div>
                  <div>Desa Palandan Kecamatan Baebunta</div>
                  <div>Telp. 085230791657</div>
                </div>
                <div className="grid gap-1 text-right">
                  <div className="text-base font-bold uppercase">Bukti Pembayaran Piutang</div>
                  <div className="font-semibold">{preview.row.invoice}</div>
                  <div>{preview.payment.time}</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2 rounded-xl border border-zinc-300 p-3">
                  {[
                    ['Pelanggan', preview.row.customerName],
                    ['Telepon', preview.row.phone || '-'],
                    ['Alamat', preview.row.address || '-'],
                    ['Proyek', preview.row.projectName || '-'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-dotted border-zinc-300 pb-1">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</span>
                      <strong className="text-right">{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 rounded-xl border border-zinc-300 p-3">
                  {[
                    ['Kasir', preview.row.cashier],
                    ['Metode', preview.payment.method],
                    ['Jatuh tempo', preview.row.due],
                    ['Status', preview.row.status],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-dotted border-zinc-300 pb-1">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</span>
                      <strong className="text-right">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    {['No', 'Item', 'Qty', 'Harga', 'Total'].map((label) => (
                      <th key={label} className="sticky top-0 z-20 bg-slate-900 px-2 py-2 text-[10px] uppercase tracking-[0.12em]">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length ? (
                    items.map((item, index) => (
                      <tr key={`${item.sku}-${item.name}`} className="border border-zinc-200">
                        <td className="border border-zinc-200 px-2 py-2">{index + 1}</td>
                        <td className="border border-zinc-200 px-2 py-2 font-semibold">{item.name}</td>
                        <td className="border border-zinc-200 px-2 py-2">{item.qty} {item.unit}</td>
                        <td className="border border-zinc-200 px-2 py-2">{formatRupiahNumber(item.price)}</td>
                        <td className="border border-zinc-200 px-2 py-2">{formatRupiahNumber(item.subtotal)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border border-zinc-200 px-2 py-6 text-center text-zinc-500">
                        Detail item belum tersedia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="ml-auto grid w-full max-w-[320px] gap-2 rounded-xl border border-zinc-300 p-3">
                {[
                  ['Total tagihan', preview.row.total],
                  ['Total terbayar', preview.row.paid],
                  ['Bayar sekarang', preview.payment.amount],
                  ['Sisa pembayaran', preview.row.remaining],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-dotted border-zinc-300 pb-1">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-zinc-300 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Keterangan pembayaran</div>
                <div className="mt-1 font-semibold">{preview.payment.note || '-'}</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Tutup
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => printReceivableReceiptPreview(preview)}>
              <Printer className="h-3.5 w-3.5" />
              Cetak bukti pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderCashierReceiptPreviewModal = () => {
    if (!cashierReceiptPreview) return null;

    const preview = cashierReceiptPreview;
    const receiptDimensions = getReceiptPreviewDimensions(settingReceiptPreviewPaper);
    const receiptPaperLabel =
      settingReceiptPreviewPaper === '58' ? '58mm thermal' : settingReceiptPreviewPaper === '80' ? '80mm thermal' : 'continuous form';
    const receiptHtml = buildCashierReceiptHtml(preview);
    const receiptScreenScale = settingReceiptPreviewPaper === 'cf' ? 1 : 1.45;

    return (
      <Dialog open={cashierReceiptOpen} onOpenChange={setCashierReceiptOpen}>
        <DialogContent className="max-h-[92vh] w-[min(96vw,64rem)] overflow-hidden rounded-[28px] border-border bg-background p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle>Preview invoice</DialogTitle>
            <DialogDescription>Preview mengikuti template struk aktif di Pengaturan.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto bg-zinc-200/80 px-4 py-4">
            <ReceiptPreviewFrame
              title={preview.invoice}
              subtitle={`${receiptPaperLabel} / ${settingReceiptLayout.template}`}
              html={receiptHtml}
              widthPx={receiptDimensions.widthPx}
              heightPx={receiptDimensions.heightPx}
              scale={receiptScreenScale}
              badge="setting aktif"
              className="mx-auto w-fit bg-background/80"
            />
          </div>

          <DialogFooter className="border-t border-border/70 px-5 py-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Tutup
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => printCashierReceiptPreview(preview)}>
              Cetak invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderSaleRevisionModal = () => {
    if (!saleRevisionTarget) return null;

    const oldTotal = getRupiahNumber(saleRevisionTarget.total);
    const paid = saleRevisionTarget.paymentAmount ? getRupiahNumber(saleRevisionTarget.paymentAmount) : saleRevisionTarget.status === 'Lunas' ? oldTotal : 0;
    const newTotal = saleRevisionItems.reduce((total, item) => total + item.price * Math.max(0, item.qty), 0);
    const remaining = Math.max(0, newTotal - paid);
    const overpaid = Math.max(0, paid - newTotal);
    const stockIn = saleRevisionItems.reduce((total, item) => total + Math.max(0, item.oldQty - item.qty), 0);
    const stockOut = saleRevisionItems.reduce((total, item) => total + Math.max(0, item.qty - item.oldQty), 0);

    return (
      <Dialog open={saleRevisionOpen} onOpenChange={(open) => {
        setSaleRevisionOpen(open);
        if (!open) setSaleRevisionTarget(null);
      }}>
        <DialogContent className="max-h-[92vh] w-[min(96vw,72rem)] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit / Retur Barang</DialogTitle>
            <DialogDescription>{saleRevisionTarget.invoice} / {saleRevisionTarget.customerName || saleRevisionTarget.customer}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3">
              <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_110px] gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Barang</span>
                  <span>Lama</span>
                  <span>Baru</span>
                  <span>Dampak</span>
                </div>
                {saleRevisionItems.map((item) => {
                  const delta = item.oldQty - item.qty;
                  return (
                    <div key={item.sku} className="grid grid-cols-[minmax(0,1fr)_80px_80px_110px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sku} / {formatRupiahNumber(item.price)}</div>
                      </div>
                      <div>{item.oldQty} {item.unit}</div>
                      <input
                        type="number"
                        min={0}
                        value={item.qty}
                        onChange={(event) => {
                          const qty = Math.max(0, Math.trunc(Number(event.target.value) || 0));
                          setSaleRevisionItems((current) => current.map((entry) => entry.sku === item.sku ? { ...entry, qty } : entry));
                        }}
                        className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-amber-400/60"
                        aria-invalid={item.qty < 0}
                      />
                      <Badge variant={delta > 0 ? 'success' : delta < 0 ? 'warning' : 'outline'} className="justify-center rounded-md">
                        {delta > 0 ? `Retur +${delta}` : delta < 0 ? `Jual +${Math.abs(delta)}` : 'Tetap'}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Alasan edit</span>
                <textarea
                  value={saleRevisionReason}
                  onChange={(event) => setSaleRevisionReason(event.target.value)}
                  className="min-h-24 rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-amber-400/60"
                  placeholder="Contoh: retur 2 sak karena barang dikembalikan pelanggan"
                  aria-invalid={saleRevisionReason.trim().length > 0 && saleRevisionReason.trim().length < 5}
                />
              </label>

              {saleRevisionRows.length ? (
                <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Riwayat edit</div>
                  {saleRevisionRows.slice(0, 3).map((row) => (
                    <div key={row.id} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                      <div className="font-semibold">Revisi #{row.revisionNo} / {formatRupiahNumber(row.totalBefore)} &rarr; {formatRupiahNumber(row.totalAfter)}</div>
                      <div className="text-muted-foreground">{row.reason}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid content-start gap-3">
              {[
                ['Total lama', formatRupiahNumber(oldTotal)],
                ['Total baru', formatRupiahNumber(newTotal)],
                ['Selisih', `${newTotal >= oldTotal ? '+' : '-'}${formatRupiahNumber(Math.abs(newTotal - oldTotal))}`],
                ['Dibayar', formatRupiahNumber(paid)],
                ['Sisa baru', formatRupiahNumber(remaining)],
                ['Kelebihan bayar', formatRupiahNumber(overpaid)],
                ['Stok masuk', `${stockIn} item`],
                ['Stok keluar', `${stockOut} item`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              {overpaid > 0 ? (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Kelebihan bayar harus dicatat manual sebagai refund atau titipan. Sistem tidak menghapus payment.
                </div>
              ) : null}
              {saleRevisionError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{saleRevisionError}</div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Batal</Button>
            </DialogClose>
            <Button type="button" onClick={() => void submitSaleRevision()} disabled={saleRevisionSaving || saleRevisionReason.trim().length < 5 || !saleRevisionItems.some((item) => item.qty > 0)}>
              {saleRevisionSaving ? 'Menyimpan...' : 'Simpan revisi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderCashierCheckoutModal = () => (
    <Dialog open={cashierCheckoutOpen} onOpenChange={setCashierCheckoutOpen}>
      <Button className="rounded-xl" type="button" disabled={!cashierCartItems.length} onClick={() => setCashierCheckoutOpen(true)}>
        <Banknote className="h-4 w-4" />
        Bayar
      </Button>
      <DialogContent className="max-h-[92vh] w-[min(94vw,72rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bayar transaksi</DialogTitle>
          <DialogDescription>Lengkapi pelanggan, pembayaran, dan catatan transaksi.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {renderFeatureModal({
            title: 'Data pelanggan / proyek',
            trigger: 'Pelanggan',
            icon: UserPlus,
            rows: [
              { label: 'Nama', value: 'Proyek Perumahan Asri' },
              { label: 'Telepon', value: '0812-0000-1122' },
              { label: 'Alamat', value: 'Gudang Timur, Jl. Raya Material No. 18' },
              { label: 'Tipe harga', value: 'Harga proyek' },
            ],
            primary: 'Pilih pelanggan',
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 xl:col-span-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              Data pelanggan
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['customerName', 'Nama pelanggan'],
                ['phone', 'Nomor telepon'],
              ].map(([field, label]) => (
                <label key={field} className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
                  <input
                    type="text"
                    value={cashierCheckoutForm[field as keyof CashierCheckoutForm]}
                    onChange={(event) => setCashierFormField(field as keyof CashierCheckoutForm, event.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
                    placeholder={label}
                  />
                </label>
              ))}
            </div>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Alamat pengiriman</span>
              <textarea
                value={cashierCheckoutForm.address}
                onChange={(event) => setCashierFormField('address', event.target.value)}
                rows={3}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
                placeholder="Alamat lengkap, patokan, dan area drop barang"
              />
            </label>
          </div>

          <div className="grid gap-3 rounded-xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Metode pembayaran
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cashierPaymentMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setCashierPaymentMethod(method)}
                  className={`flex min-h-11 items-center justify-start gap-2 rounded-lg border px-3 py-2 text-left text-sm leading-tight transition-colors ${
                    cashierPaymentMethod === method
                      ? 'border-amber-400/60 bg-amber-500/10 text-amber-200'
                      : 'border-border bg-muted/20 text-foreground hover:bg-muted/40'
                  }`}
                >
                  <span className="whitespace-normal">{method}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <HandCoins className="h-4 w-4" />
              Status pembayaran
            </div>
            <div className="grid grid-cols-3 gap-2">
              {cashierPaymentStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setCashierPaymentStatus(status)}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold leading-tight transition-colors ${
                    cashierPaymentStatus === status
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                      : 'border-border bg-muted/20 text-foreground hover:bg-muted/40'
                  }`}
                >
                  <span className="block whitespace-normal text-center">{status}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={cashierCheckoutForm.dueDate}
              onChange={(event) => setCashierFormField('dueDate', event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60"
              placeholder="Jatuh tempo"
            />
          </div>

          <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 xl:col-span-1 xl:max-w-[24rem]">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Percent className="h-4 w-4" />
              Penyesuaian
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/70 px-3 py-2">
                <div className="grid gap-0.5">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Mode diskon</span>
                  <span className="text-sm font-medium">{cashierDiscountMode === 'nominal' ? 'Nominal' : 'Persen'}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={cashierDiscountMode === 'percent'}
                  onClick={() => {
                    const nextMode = cashierDiscountMode === 'nominal' ? 'percent' : 'nominal';
                    setCashierDiscountMode(nextMode);
                    setCashierDiscount((current) => formatCashierDiscountInput(current, nextMode));
                  }}
                  className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors ${
                    cashierDiscountMode === 'percent'
                      ? 'border-emerald-400/60 bg-emerald-500/20'
                      : 'border-border bg-muted/40'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
                      cashierDiscountMode === 'percent' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Diskon transaksi</span>
                <input
                  type="text"
                  value={cashierDiscount}
                  onChange={(event) => setCashierDiscount(event.target.value)}
                  onBlur={() => setCashierDiscount(formatCashierDiscountInput(cashierDiscount, cashierDiscountMode))}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
                  placeholder={cashierDiscountMode === 'percent' ? '10%' : 'Rp 0'}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Referensi / invoice manual</span>
                <input
                  type="text"
                  value={cashierCheckoutForm.reference}
                  onChange={(event) => setCashierFormField('reference', event.target.value)}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
                  placeholder="Nomor transfer / DO / PO"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Keterangan</span>
                <textarea
                  value={cashierCheckoutForm.note}
                  onChange={(event) => setCashierFormField('note', event.target.value)}
                  rows={3}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
                  placeholder="Catatan pembayaran atau permintaan pelanggan"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 xl:col-span-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Receipt className="h-4 w-4" />
              Ringkasan
            </div>
            <div className="grid gap-2 rounded-xl border border-dashed border-border bg-background/50 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pelanggan</span>
                <span className="font-medium">{cashierCheckoutForm.customerName.trim() || 'PELANGGAN UMUM'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Telepon</span>
                <span className="font-medium">{cashierCheckoutForm.phone.trim() || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Alamat</span>
                <span className="max-w-[18rem] truncate text-right font-medium">
                  {cashierCheckoutForm.address.trim() || '-'}
                </span>
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium">{formatRupiahNumber(cashierSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Diskon</span>
                <span className="font-medium">- {formatRupiahNumber(cashierDiscountValue)}</span>
              </div>
              <Separator />
              <div className="flex items-end justify-between">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total</span>
                <div className="text-2xl font-semibold tracking-tight">{formatRupiahNumber(cashierGrandTotal)}</div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Dibayar</span>
                <span className="font-medium text-foreground">{formatRupiahNumber(cashierPaidValue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{cashierRemaining > 0 ? 'Sisa' : 'Kembalian'}</span>
                <span className={cashierRemaining > 0 ? 'font-medium text-rose-200' : 'font-medium text-emerald-200'}>
                  {formatRupiahNumber(cashierRemaining > 0 ? cashierRemaining : cashierChange)}
                </span>
              </div>
            </div>
          </div>

        </div>

          {cashierCheckoutError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {cashierCheckoutError}
            </div>
          ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={cashierCheckoutSaving}>
              Batal
            </Button>
          </DialogClose>
          <Button type="button" variant="outline" onClick={() => void persistCashierSession('Draft')} disabled={cashierCheckoutSaving || !cashierCartItems.length}>
            {cashierCheckoutSaving ? 'Menyimpan...' : 'Simpan draft'}
          </Button>
          <Button type="button" onClick={() => void submitCashierCheckout()} disabled={cashierCheckoutSaving || !cashierCartItems.length}>
            {cashierCheckoutSaving ? 'Memproses...' : 'Proses bayar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderCashierSessionModal = () => {
    const sessionRows = [...cashierDraftRows, ...cashierHoldRows];

    return (
      <Dialog open={cashierSessionOpen} onOpenChange={setCashierSessionOpen}>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-xl px-4 text-xs font-semibold"
          onClick={() => {
            if (cashierCartItems.length) {
              void persistCashierSession('Tertahan');
              return;
            }

            setCashierSessionOpen(true);
          }}
        >
          <Save className="h-3.5 w-3.5" />
          Hold
        </Button>
        <DialogContent className="w-[min(94vw,52rem)]">
          <DialogHeader>
            <DialogTitle>Transaksi tertahan</DialogTitle>
            <DialogDescription>Draft dan order tertahan yang disimpan dari kasir akan muncul di sini.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Draft', cashierDraftRows.length, 'Sesi simpan cepat sebelum checkout'],
                ['Tertahan', cashierHoldRows.length, 'Order yang bisa dilanjutkan kembali'],
                ['Total', sessionRows.length, 'Sesi tersimpan di workstation'],
              ].map(([label, value, note]) => (
                <div key={label} className="grid gap-1.5 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
                  <div className="text-2xl font-semibold tracking-tight">{value as number}</div>
                  <div className="text-xs text-muted-foreground">{note as string}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              {sessionRows.length ? (
                sessionRows.map((session) => (
                  <div key={session.id} className="grid gap-3 rounded-xl border border-border bg-background/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={session.kind === 'Draft' ? 'secondary' : 'warning'} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                            {session.kind}
                          </Badge>
                          <div className="text-sm font-semibold">{session.customer}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {session.cashier} • {session.time} • {session.itemsCount} item
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-amber-300">{session.total}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{session.method}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => restoreCashierSession(session.id)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Lanjutkan
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => void posApi.deleteCashierSession(session.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada sesi kasir yang tertahan.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Tutup
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderSettingView = () => (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Profil toko', value: 'Siap nota', icon: Store, className: 'border-emerald-500/20 bg-emerald-500/8' },
          { label: 'Printer', value: 'Preview dulu', icon: Printer, className: 'border-amber-500/20 bg-amber-500/8' },
          { label: 'LAN server', value: 'Host lokal', icon: Monitor, className: 'border-sky-500/20 bg-sky-500/8' },
          { label: 'Keamanan', value: 'TOTP admin', icon: ShieldCheck, className: 'border-rose-500/20 bg-rose-500/8' },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className={`flex min-w-0 items-center gap-3 rounded-2xl border-0 p-3.5 ${item.className}`}>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-background/80 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                <div className="truncate text-sm font-semibold">{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="border-b border-border py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                <Settings2 className="h-4 w-4" />
                Setting
              </CardTitle>
              <Badge variant="outline" className="rounded-lg px-2 py-1 text-[10px] uppercase tracking-[0.14em]">
                Portable / local-first
              </Badge>
            </div>
            <div className="flex flex-nowrap items-center gap-2">
              <Button type="button" title="Refresh setting" aria-label="Refresh setting" variant="outline" className="h-7 w-7 rounded-lg p-0" onClick={() => void syncAppSettings()}>
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button type="button" title="Simpan setting" aria-label="Simpan setting" className="h-7 w-7 rounded-lg p-0" onClick={() => void saveAppSettings()}>
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-3">
          {settingActionMessage ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <Badge
                  variant={settingActionMessage.tone === 'danger' ? 'danger' : settingActionMessage.tone === 'warning' ? 'warning' : 'success'}
                  className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
                >
                  {settingActionMessage.tone === 'danger' ? 'Admin' : settingActionMessage.tone === 'warning' ? 'Perhatian' : 'Siap'}
                </Badge>
                <span className="truncate text-muted-foreground">{settingActionMessage.text}</span>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={() => setSettingActionMessage(null)}>
                Tutup
              </Button>
            </div>
          ) : null}

          <Tabs value={settingTab} onValueChange={(value) => setSettingTab(value as SettingTab)} className="grid gap-3">
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/35 p-1">
              {[
                ['store', 'Toko'],
                ['printer', 'Printer'],
                ['receipt', 'Struk'],
                ['cashier', 'Kasir'],
                ['lan', 'LAN'],
                ['priceChecker', 'Price checker'],
                ['security', 'Keamanan'],
                ['appearance', 'Tampilan'],
              ].map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="h-8 rounded-lg px-3 text-xs">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="store" className="m-0">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card/70 p-3">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Store className="h-4 w-4" />
                      Identitas toko
                    </div>
                    <div className="grid gap-3">
                      {[
                        ['Nama toko', settingStoreName],
                        ['Alamat', settingStoreAddress],
                        ['Telepon / WA', settingStorePhone],
                      ].map(([label, value]) => (
                        <label key={label} className="grid gap-1.5">
                          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
                          <input
                            value={value}
                            onChange={(event) => {
                              if (label === 'Nama toko') setSettingStoreName(event.target.value);
                              if (label === 'Alamat') setSettingStoreAddress(event.target.value);
                              if (label === 'Telepon / WA') setSettingStorePhone(event.target.value);
                            }}
                            className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60"
                          />
                        </label>
                      ))}
                      <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid gap-1">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Logo toko</div>
                            <div className="text-xs leading-relaxed text-muted-foreground">
                              PNG, JPG, atau WEBP. Maksimal {storeLogoMaxSizeKb} KB.
                            </div>
                          </div>
                          <Badge variant={storeLogoPreview ? 'success' : 'outline'} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                            {storeLogoPreview ? 'Siap' : 'Kosong'}
                          </Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[84px_minmax(0,1fr)] sm:items-center">
                          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-background/70">
                            {storeLogoPreview ? (
                              <img src={storeLogoPreview} alt="Preview logo toko" className="h-full w-full object-contain p-2" />
                            ) : (
                              <Store className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="grid gap-2">
                            <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold transition hover:border-amber-400/60">
                              <Upload className="h-3.5 w-3.5" />
                              Upload logo
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleStoreLogoUpload} />
                            </label>
                            {storeLogoFileName ? (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                                <span className="min-w-0 truncate text-muted-foreground">{storeLogoFileName}</span>
                                <span className="font-semibold">{storeLogoFileSizeKb} KB</span>
                              </div>
                            ) : null}
                            {storeLogoPreview ? (
                              <Button type="button" variant="outline" className="h-8 rounded-lg text-xs" onClick={clearStoreLogo}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus logo
                              </Button>
                            ) : null}
                            {storeLogoError ? <div className="text-xs text-rose-300">{storeLogoError}</div> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/70 p-3">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Receipt className="h-4 w-4" />
                      Konten nota
                    </div>
                    <div className="grid gap-3">
                      {[
                        ['Header nota', 'Nota penjualan bahan bangunan'],
                        ['Footer nota', 'Barang yang sudah dibeli tidak dapat dikembalikan tanpa nota.'],
                      ].map(([label, value]) => (
                        <label key={label} className="grid gap-1.5">
                          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
                          <input defaultValue={value} className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60" />
                        </label>
                      ))}
                      <div className="grid gap-2">
                        <Button type="button" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => handleSettingAction('Preview nota diperbarui di panel kanan.')}>
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid content-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    Pajak & harga
                  </div>
                  <div className="grid gap-2">
                    {[
                      ['PPN', 'Nonaktif default'],
                      ['Tarif pajak', '11% jika diaktifkan'],
                      ['Margin default', '10.5% untuk item baru'],
                      ['Pembulatan', 'Rupiah tanpa desimal'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => handleSettingAction('Perubahan pajak dan margin harus memengaruhi transaksi baru saja.', 'warning')}>
                    <Wrench className="h-3.5 w-3.5" />
                    Atur aturan harga
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="printer" className="m-0">
              <div className="grid gap-3">
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-border bg-card/70 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <Printer className="h-4 w-4" />
                          Printer & kertas
                        </div>
                      <Badge variant="warning" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                        Device
                      </Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        ['Printer aktif', settingPrinterName],
                        ['Lebar kertas', settingReceiptPreviewPaper === '58' ? '58mm' : settingReceiptPreviewPaper === '80' ? '80mm' : 'Continuous form'],
                        ['Perilaku cetak', settingPrinterBehavior],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-border bg-background px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                          <div className="mt-1 truncate text-sm font-medium">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['58mm', '80mm', 'Continuous form'].map((paper) => (
                        <Button
                          key={paper}
                          type="button"
                          variant={
                            paper === (settingReceiptPreviewPaper === '58' ? '58mm' : settingReceiptPreviewPaper === '80' ? '80mm' : 'Continuous form')
                              ? 'default'
                              : 'outline'
                          }
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => {
                            if (paper === '58mm') setSettingReceiptPreviewPaper('58');
                            if (paper === '80mm') setSettingReceiptPreviewPaper('80');
                            if (paper === 'Continuous form') setSettingReceiptPreviewPaper('cf');
                            handleSettingAction(`Lebar kertas dipilih: ${paper}.`);
                          }}
                        >
                          {paper}
                        </Button>
                      ))}
                      <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => handleSettingAction('Test print dikirim ke printer aktif.')}>
                        <Printer className="h-3.5 w-3.5" />
                        Test print
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/70 p-3">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <SlidersHorizontal className="h-4 w-4" />
                      Koreksi cetak
                    </div>
                    <div className="grid gap-2 md:grid-cols-4">
                      {[
                        ['Atas', '10mm'],
                        ['Bawah', '10mm'],
                        ['Kiri', '5mm'],
                        ['Kanan', '5mm'],
                      ].map(([label, value]) => (
                        <label key={label} className="grid gap-1">
                          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
                          <input defaultValue={value} className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-amber-400/60" />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {[
                        ['Line height', '1.2 rapat'],
                        ['Jarak item', 'Compact'],
                        ['Jarak struk', 'Minimal'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                          <div className="mt-1 text-sm font-medium">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </TabsContent>

            <TabsContent value="receipt" className="m-0">
              <div className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="grid content-start gap-3">
                  <div className="rounded-2xl border border-border bg-card/70 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <ReceiptText className="h-4 w-4" />
                        Template struk
                      </div>
                      <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                        {settingReceiptLayout.template}
                      </Badge>
                    </div>
                    <div className="grid gap-2">
                      {[
                        { id: 'compact', label: 'Compact', icon: Minus },
                        { id: 'standard', label: 'Standar', icon: Receipt },
                        { id: 'detail', label: 'Detail', icon: FileText },
                      ].map((item) => {
                        const Icon = item.icon;
                        const active = settingReceiptLayout.template === item.id;

                        return (
                          <Button
                            key={item.id}
                            type="button"
                            variant={active ? 'default' : 'outline'}
                            className="h-9 justify-start rounded-lg text-xs"
                            onClick={() => applyReceiptTemplatePreset(item.id as SettingReceiptTemplate)}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {item.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/70 p-3">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      Bagian struk
                    </div>
                    <div className="grid gap-2">
                      {[
                        ['logo', 'Logo'],
                        ['storeIdentity', 'Identitas toko'],
                        ['transactionInfo', 'Info transaksi'],
                        ['customerInfo', 'Data pelanggan'],
                        ['itemMeta', 'Qty item'],
                        ['discount', 'Diskon'],
                        ['payment', 'Pembayaran'],
                        ['footer', 'Footer'],
                      ].map(([section, label]) => {
                        const key = section as SettingReceiptSectionKey;
                        const active = settingReceiptLayout.sections[key];

                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            className={`flex h-9 items-center justify-between gap-3 rounded-lg border px-3 text-left text-xs transition ${
                              active
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground'
                                : 'border-border bg-background text-muted-foreground'
                            }`}
                            onClick={() => toggleReceiptSection(key)}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {active ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 shrink-0" />}
                              <span className="truncate">{label}</span>
                            </span>
                            <span className={`relative h-4 w-7 shrink-0 rounded-full border transition ${active ? 'border-emerald-500 bg-emerald-500' : 'border-border bg-muted'}`}>
                              <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-background transition ${active ? 'left-3.5' : 'left-0.5'}`} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/70 p-3">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <SlidersHorizontal className="h-4 w-4" />
                      Format
                    </div>
                    <div className="grid gap-3">
                      <div className="grid gap-1.5">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Font</div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            ['small', 'S'],
                            ['medium', 'M'],
                            ['large', 'L'],
                          ].map(([value, label]) => (
                            <Button
                              key={value}
                              type="button"
                              variant={settingReceiptLayout.fontSize === value ? 'default' : 'outline'}
                              className="h-8 rounded-lg px-2 text-xs"
                              onClick={() => setSettingReceiptLayout((current) => ({ ...current, fontSize: value as SettingReceiptFontSize }))}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Kerapatan</div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            ['compact', 'Padat'],
                            ['normal', 'Normal'],
                            ['loose', 'Lega'],
                          ].map(([value, label]) => (
                            <Button
                              key={value}
                              type="button"
                              variant={settingReceiptLayout.density === value ? 'default' : 'outline'}
                              className="h-8 rounded-lg px-2 text-xs"
                              onClick={() => setSettingReceiptLayout((current) => ({ ...current, density: value as SettingReceiptDensity }))}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-lg text-xs"
                          onClick={() => {
                            setSettingReceiptLayout(defaultSettingReceiptLayout);
                            handleSettingAction('Template struk dikembalikan ke standar.');
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </Button>
                        <Button type="button" className="h-8 rounded-lg text-xs" onClick={() => handleSettingAction('Template struk disimpan ke pengaturan.')}>
                          <Save className="h-3.5 w-3.5" />
                          Simpan
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <ReceiptText className="h-4 w-4" />
                      Live preview
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
                        {settingReceiptPreviewModels.map((model) => (
                          <Button
                            key={model.paper}
                            type="button"
                            variant={settingReceiptPreviewPaper === model.paper ? 'default' : 'ghost'}
                            className="h-6 rounded-md px-2 text-[10px]"
                            onClick={() => setSettingReceiptPreviewPaper(model.paper)}
                          >
                            {model.label === 'Continuous form' ? 'CF' : model.label}
                          </Button>
                        ))}
                      </div>
                      <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                        {settingReceiptLayout.fontSize}
                      </Badge>
                      <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                        {settingReceiptLayout.density}
                      </Badge>
                      <Button type="button" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => handleSettingAction('Test print struk menggunakan template aktif.')}>
                        <Printer className="h-3.5 w-3.5" />
                        Test
                      </Button>
                    </div>
                  </div>

                  <div className="grid justify-items-center overflow-x-auto rounded-xl border border-border bg-background/50 p-3">
                    <ReceiptPreviewFrame
                      key={activeSettingReceiptPreview.paper}
                      title={activeSettingReceiptPreview.label}
                      subtitle={`${activeSettingReceiptPreview.note} / ${activeSettingReceiptPreview.paperWidth}`}
                      html={activeSettingReceiptPreview.html}
                      widthPx={activeSettingReceiptPreview.widthPx}
                      heightPx={activeSettingReceiptPreview.heightPx}
                      badge={activeSettingReceiptPreview.badge}
                      className="w-fit max-w-full shrink-0"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cashier" className="m-0">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { title: 'Kas awal', value: 'Aktif saat login hari baru', icon: Banknote, tone: 'success' as const },
                    { title: 'Wajib input', value: 'Admin bisa memaksa sebelum transaksi', icon: KeyRound, tone: 'warning' as const },
                    { title: 'Pengingat', value: '06.00 setiap hari kerja', icon: Clock3, tone: 'success' as const },
                    { title: 'Selisih abnormal', value: 'Alert di atas Rp 10.000', icon: AlertTriangle, tone: 'warning' as const },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="grid gap-3 rounded-2xl border border-border bg-card/70 p-3">
                        <div className="flex items-start gap-3">
                          <ContextIcon label={`${item.title} ${item.value}`} />
                          <div className="grid min-w-0 gap-1">
                            <div className="text-sm font-semibold">{item.title}</div>
                            <div className="text-xs leading-relaxed text-muted-foreground">{item.value}</div>
                          </div>
                        </div>
                        <Button type="button" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => handleSettingAction(`${item.title} diterapkan ke pengaturan operasional kasir.`, item.tone)}>
                          <Icon className="h-3.5 w-3.5" />
                          Atur
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="grid content-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Keyboard className="h-4 w-4" />
                    Shortcut kasir
                  </div>
                  {[
                    ['F2', 'Fokus pencarian barang'],
                    ['Enter', 'Tambah barang jika hasil search tunggal'],
                    ['F8', 'Mode scanner barcode'],
                    ['F9', 'Hold transaksi'],
                    ['Space', 'Buka modal bayar'],
                  ].map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                      <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono">{key}</span>
                      <span className="text-right text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="lan" className="m-0">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-2xl border border-border bg-card/70 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Monitor className="h-4 w-4" />
                      Server lokal
                    </div>
                    <Badge variant="success" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                      Aktif saat POS menyala
                    </Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {[ 
                      ['POS host', '127.0.0.1:5173'],
                      ['LAN host', '192.168.1.20:5173'],
                      ['Admin web', adminUrl],
                      ['Price checker', priceCheckerUrl],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-border bg-background px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                        <div className="mt-1 truncate text-sm font-medium">{value}</div>
                        {label === 'Admin web' ? <div className="mt-1 text-xs text-muted-foreground">{lanAdminUrl}</div> : null}
                        {label === 'Price checker' ? <div className="mt-1 text-xs text-muted-foreground">{lanPriceCheckerUrl}</div> : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => void copyAdminUrl()}>
                      <ClipboardList className="h-3.5 w-3.5" />
                      Salin URL admin
                    </Button>
                    <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => handleSettingAction('QR akses LAN siap dibagikan ke device toko.')}>
                      <Barcode className="h-3.5 w-3.5" />
                      QR akses
                    </Button>
                  </div>
                </div>

                <div className="grid content-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    Aturan akses
                  </div>
                  {[
                    ['Admin web', 'Login admin wajib username/password'],
                    ['Price checker', 'Read-only katalog harga'],
                    ['Realtime', 'SSE/WebSocket hanya untuk perubahan penting'],
                    ['Internet', 'Tidak wajib untuk operasional LAN'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border bg-background px-3 py-2">
                      <div className="text-xs font-semibold">{label}</div>
                      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="priceChecker" className="m-0">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-2xl border border-border bg-card/70 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Barcode className="h-4 w-4" />
                      Price checker publik
                    </div>
                    <Badge variant="success" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                      Read-only
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    <div className="rounded-xl border border-border bg-background px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">URL perangkat ini</div>
                      <div className="mt-1 break-all font-mono text-sm font-semibold">{priceCheckerUrl}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-background px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Format URL LAN</div>
                      <div className="mt-1 break-all font-mono text-sm font-semibold">{lanPriceCheckerUrl}</div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      {[
                        ['API publik', '/public/price-checker/*'],
                        ['Route UI', '/price-checker'],
                        ['Data tampil', 'Harga, kategori, satuan, status stok'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                          <div className="mt-1 text-sm font-medium">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => void copyPriceCheckerUrl()}>
                      <ClipboardList className="h-3.5 w-3.5" />
                      Copy URL
                    </Button>
                    <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => window.open(priceCheckerUrl, '_blank', 'noopener,noreferrer')}>
                      <Monitor className="h-3.5 w-3.5" />
                      Buka
                    </Button>
                    <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => handleSettingAction('QR price checker belum memakai dependency khusus. Gunakan URL LAN untuk tahap ini.', 'warning')}>
                      <Barcode className="h-3.5 w-3.5" />
                      QR
                    </Button>
                  </div>
                </div>

                <div className="grid content-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    Operasional
                  </div>
                  {[
                    ['Akses', 'Tidak perlu login dan tidak bisa ubah data.'],
                    ['Scanner', 'USB scanner, input manual, keypad, kamera browser jika tersedia.'],
                    ['Firewall', 'Izinkan port API lokal dari jaringan toko.'],
                    ['Cache', 'Service worker tidak cache response API.'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border bg-background px-3 py-2">
                      <div className="text-xs font-semibold">{label}</div>
                      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="m-0">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { title: 'TOTP admin', note: 'Google Authenticator untuk aksi sensitif dan recovery user.', icon: ShieldCheck, action: 'Setup TOTP', tone: 'warning' as const },
                    { title: 'Backup codes', note: 'Kode cadangan hanya ditampilkan sekali dan harus dicatat admin.', icon: KeyRound, action: 'Lihat status', tone: 'warning' as const },
                    { title: 'Recovery user', note: 'Admin membuat temporary password untuk kasir yang lupa password.', icon: UserPlus, action: 'Buka recovery', tone: 'warning' as const },
                    { title: 'Session timeout', note: 'Logout otomatis setelah tidak aktif untuk mengurangi risiko terminal terbuka.', icon: Clock3, action: 'Atur timeout', tone: 'success' as const },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="grid gap-3 rounded-2xl border border-border bg-card/70 p-3">
                        <div className="flex items-start gap-3">
                          <ContextIcon label={`${item.title} ${item.note}`} />
                          <div className="grid min-w-0 gap-1">
                            <div className="text-sm font-semibold">{item.title}</div>
                            <div className="text-xs leading-relaxed text-muted-foreground">{item.note}</div>
                          </div>
                        </div>
                        <Button type="button" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => handleSettingAction(`${item.title} wajib admin-gated dan masuk audit log.`, item.tone)}>
                          <Icon className="h-3.5 w-3.5" />
                          {item.action}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="grid content-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    Security rule
                  </div>
                  {[
                    'Password tidak pernah disimpan plaintext.',
                    'TOTP bukan pengganti password permanen.',
                    'Recovery user wajib force change password.',
                    'Restore database dan reset setting harus tercatat di audit log.',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs leading-relaxed">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="m-0">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card/70 p-3">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Monitor className="h-4 w-4" />
                    Mode tampilan
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {settingAppearanceModeOptions.map((item) => (
                      <Button
                        key={item.value}
                        type="button"
                        variant={settingAppearanceMode === item.value ? 'default' : 'outline'}
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => {
                          setSettingAppearanceMode(item.value);
                          handleSettingAction(`Mode tampilan dipilih: ${item.label}.`);
                        }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {settingAppearanceModeOptions.find((item) => item.value === settingAppearanceMode)?.note}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/70 p-3">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Settings2 className="h-4 w-4" />
                    Ukuran font
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {settingAppearanceScaleOptions.map((item) => (
                      <Button
                        key={item.value}
                        type="button"
                        variant={settingAppearanceScale === item.value ? 'default' : 'outline'}
                        className="h-8 rounded-lg px-2 text-xs"
                        onClick={() => {
                          setSettingAppearanceScale(item.value);
                          handleSettingAction(`Ukuran font dipilih: ${item.label}.`);
                        }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {settingAppearanceScaleOptions.find((item) => item.value === settingAppearanceScale)?.note}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/70 p-3 md:col-span-2">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Palette className="h-4 w-4" />
                    Tema user
                  </div>
                  <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
                    {posThemeOptions.map((item) => {
                      const active = settingAppearanceTheme === item.value;

                      return (
                        <Button
                          key={item.value}
                          type="button"
                          variant="outline"
                          className="relative h-24 overflow-hidden rounded-2xl border p-0 text-left shadow-sm transition duration-200 hover:-translate-y-0.5"
                          style={{
                            backgroundImage: item.swatch,
                            borderColor: active ? 'color-mix(in oklch, var(--primary) 66%, transparent)' : 'color-mix(in oklch, var(--border) 86%, transparent)',
                            boxShadow: active ? '0 0 0 1px color-mix(in oklch, var(--primary) 30%, transparent), 0 18px 34px rgba(2, 6, 23, 0.24)' : '0 16px 30px rgba(2, 6, 23, 0.18)',
                          }}
                          onClick={() => {
                            void handleAppearanceThemeChange(item.value);
                          }}
                        >
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/45 to-transparent" />
                          <span className="relative z-10 flex h-full flex-col justify-between p-3 text-white">
                            <span className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{item.label}</span>
                              {active ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
                            </span>
                            <span className="text-[10px] leading-tight text-white/72">{item.note}</span>
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );


  const legacyViewContext = {
    LazyDatabaseView,
    LazySettingView,
    activeSessionRole,
    activeSessionUser,
    activeSettingReceiptPreview,
    activeUserCount,
    addCashierCartItem,
    adminUrl,
    applyAppSettings,
    applyAppearanceSettings,
    applyCashierCalculatorToPayment,
    applyReceiptTemplatePreset,
    applyReceivablePaymentHistory,
    applySupplierDebtItems,
    applySupplierDebtPaymentHistory,
    buildAppSettingsPayload,
    buildCashierReceiptDocumentData,
    buildCashierReceiptHtml,
    buildCashierReceiptPreview,
    buildReportPrintHtml,
    buildSettingReceiptPreviewHtml,
    buildTransactionReceiptPreview,
    canReviseSale,
    canManageRolePermissions,
    cashierCartItems,
    cashierCatalog,
    cashierCategories,
    cashierCategoryFilter,
    cashierCategoryFilterOpen,
    cashierChange,
    cashierDiscountModes,
    cashierDiscountValue,
    cashierDraftRows,
    cashierGrandTotal,
    cashierHoldRows,
    cashierPaidValue,
    cashierPaymentAmount,
    cashierPaymentMethods,
    cashierPaymentStatus,
    cashierPaymentStatuses,
    cashierRecentItems,
    cashierRemaining,
    cashierScanBufferRef,
    cashierScanCandidateRef,
    cashierScanError,
    cashierScanTimesRef,
    cashierSearch,
    cashierSubtotal,
    catalogCategories,
    catalogPageCount,
    catalogPageEnd,
    catalogPageSize,
    catalogPageStart,
    catalogRows,
    categoryBadgeClasses,
    categorySummary,
    cleanResetStorageKey,
    clearCashierScanBuffer,
    clearStoreLogo,
    compareCatalogValues,
    compareReceivableValues,
    compareTransactionValues,
    confirmDeleteCatalog,
    confirmDeleteUser,
    copyAdminUrl,
    copyPriceCheckerUrl,
    createDefaultSupplierDebtDraft,
    createEmptySupplierDebtItem,
    criticalLowStockCount,
    dashboardChartConfig,
    dashboardKpis,
    dashboardLatestTransactions,
    dashboardOperations,
    databaseBackupFallbackRows,
    databaseBackupVisibleRows,
    databaseEntityStats,
    databaseExportStamp,
    databaseHealthFallback,
    databaseHealthVisible,
    databaseMutationCount,
    databaseNextBackupLabel,
    databaseSizeEstimate,
    debtSearch,
    debtStatusFilter,
    debtSummary,
    decrementCashierCartItem,
    defaultCashierCheckoutForm,
    defaultReceiptPreviewDocument,
    defaultRolePermissions,
    defaultSettingAppearance,
    defaultSettingReceiptLayout,
    defaultSettingReceiptSections,
    deferredCashierSearch,
    deferredCatalogSearch,
    deferredDebtSearch,
    deferredLowStockSearch,
    deferredReceivableSearch,
    deferredStockHistorySearch,
    deferredTransactionSearch,
    deferredUserSearch,
    deleteReceivablePayment,
    deleteSupplierDebt,
    deleteSupplierDebtPayment,
    describeCatalogTrail,
    escapeCsvValue,
    escapeReceiptHtml,
    evaluateCashierExpression,
    expandedDebtId,
    expandedTransactionInvoice,
    exportCatalogToCsv,
    exportDatabaseSummaryWorkbook,
    exportStockHistoryToCsv,
    exportTransactionsWorkbook,
    filteredDebtRows,
    filteredReceivableRows,
    filteredTransactionRows,
    filteredUserRows,
    findCashierCatalogItem,
    formatCashierDiscountInput,
    formatReceiptAmount,
    formatRupiahInput,
    formatRupiahNumber,
    formatSignedNumber,
    getCashierDiscountValue,
    getCatalogDraftValidationError,
    getCatalogDuplicateKey,
    getCatalogSortIcon,
    getCatalogTrailRowsForItem,
    getCategoryBadgeClass,
    getExportFileName,
    getLowStockStatus,
    getLowStockSuggestion,
    getReceiptPreviewDimensions,
    getReceivableProgress,
    getReceivableSortIcon,
    getReportTabTitle,
    getRupiahNumber,
    getStockHistoryEventVariant,
    getStockHistoryMovementIcon,
    getStockHistoryMovementTone,
    getSupplierDebtDuplicateWarning,
    getSupplierDebtItemSubtotal,
    getSupplierDebtProgress,
    getTransactionSortIcon,
    handleCashierCalculatorCompute,
    handleCashierSearchKeyDown,
    handleDatabaseAction,
    handleImportFile,
    handleSettingAction,
    handleStoreLogoUpload,
    handleTotpDisable,
    handleTotpSetup,
    handleTotpVerify,
    handleUserPasswordReset,
    hasCleanResetFlag,
    isDateInBounds,
    isReceivableOverdue,
    isSupplierDebtOverdue,
    lanAdminUrl,
    lanPriceCheckerUrl,
    loadXlsxModule,
    localFinanceEnabled,
    localReportCategoryDistribution,
    localReportDataset,
    localReportDecisionRows,
    localReportPaymentDistribution,
    localReportReceivableDebtChart,
    localReportStockMovementChart,
    localReportSummary,
    localReportTransactionTrend,
    lowStockCategoryOptions,
    lowStockCount,
    lowStockItems,
    mockSettingsStorageKey,
    mockUsersStorageKey,
    mockWorkspaceStorageKey,
    navigateMenu,
    normalizeCatalogDraftPrice,
    normalizeTransactionLineItem,
    openAuditDialog,
    openCreateCatalogDialog,
    openCreateUserDialog,
    openDebtCount,
    openDeleteCatalogDialog,
    openDeleteUserDialog,
    openEditCatalogDialog,
    openEditUserDialog,
    openPrintCatalogDialog,
    openReceivableCount,
    openReceivablePaymentModal,
    openReceivableReceiptPreview,
    openReportPrintPreview,
    openSaleRevisionModal,
    openRestockDialog,
    openSupplierDebtPaymentModal,
    openSupplierDebtPrintPreview,
    paginatedCatalogRows,
    paginatedReceivableRows,
    paginatedStockHistoryRows,
    paginatedTransactionRows,
    parseDisplayDate,
    parseImportText,
    parseReceivableDueDate,
    performDatabaseBackup,
    performDatabaseDelete,
    performDatabaseHardReset,
    performDatabaseMaintenance,
    performDatabaseRestore,
    permissionModuleRows,
    persistCashierSession,
    persistRolePermissions,
    priceCheckerUrl,
    printCashierReceiptPreview,
    printReceivableReceiptPreview,
    printReportPreviewHtml,
    printSupplierDebtReceiptPreview,
    processCashierScannedCode,
    pushStockActionMessage,
    rangeLabel,
    rangedReceivableRowsData,
    rangedStockHistoryRows,
    rangedSupplierDebtRows,
    rangedTransactionRows,
    receivableExpandedInvoice,
    receivableMethodFilter,
    receivableOverdueOnly,
    receivablePage,
    receivablePageCount,
    receivablePageEnd,
    receivablePageSize,
    receivablePageStart,
    receivableRows,
    receivableSearch,
    receivableSeedRows,
    receivableStatusFilter,
    receivableSummary,
    refreshDatabaseBackups,
    refreshUserAccess,
    removeCashierCartItem,
    renderAuditDialog,
    renderBatchBarcodeModal,
    renderCashierCalculatorModal,
    renderCashierCheckoutModal,
    renderCashierReceiptPreviewModal,
    renderSaleRevisionModal,
    renderCashierSessionModal,
    renderCatalogDeleteModal,
    renderCatalogEditorButton,
    renderCatalogEditorModal,
    renderCatalogPrintModal,
    renderCatalogSortHeader,
    renderCategoryManagerModal,
    renderExportCatalogModal,
    renderFeatureModal,
    renderImportBarangModal,
    renderLowStockExportModal,
    renderLowStockUpdateModal,
    renderRangeSelector,
    renderReceivablePaymentModal,
    renderReceivableReceiptPreviewModal,
    renderReceivableSortHeader,
    renderReportPrintPreviewModal,
    renderRolePermissionDialog,
    renderSettingView,
    renderStockThresholdModal,
    renderSupplierDebtDialog,
    renderSupplierDebtPaymentModal,
    renderSupplierDebtReceiptPreviewModal,
    renderTotpSetupDialog,
    renderTransactionSortHeader,
    renderUserDeleteDialog,
    renderUserEditorDialog,
    replaceUserRow,
    reportCashFlow,
    reportCategoryDistribution,
    reportCategorySales,
    reportDataset,
    reportDecisionRows,
    reportPaymentDistribution,
    reportPaymentMix,
    reportReceivableDebtChart,
    reportSalesTrend,
    reportStockMovementChart,
    reportSummary,
    reportTab,
    reportTransactionTrend,
    resetCashierCart,
    resetCashierTransactionState,
    resetHardResetDialog,
    resetRangeToToday,
    resetRequiredUserCount,
    resetRolePermissionsToDefault,
    resetSettingsToDefault,
    restockTargetItem,
    restoreCashierSession,
    sales7Days: dashboardSales7Days,
    salesByHour: dashboardSalesByHour,
    saveAppSettings,
    saveBinaryFile,
    saveWorkbookFile,
    selectedBatchItems,
    selectedRangeBounds,
    setCashierCartItemQty,
    setCashierCategoryFilter,
    setCashierCategoryFilterOpen,
    setCashierFormField,
    setCashierPaymentAmount,
    setCashierReceiptOpen,
    setCashierReceiptPreview,
    setCashierSearch,
    setDebtSearch,
    setDebtStatusFilter,
    setExpandedDebtId,
    setExpandedTransactionInvoice,
    setReceivableExpandedInvoice,
    setReceivableMethodFilter,
    setReceivableOverdueOnly,
    setReceivablePage,
    setReceivableSearch,
    setReceivableStatusFilter,
    setReportTab,
    setStockHistoryFilter,
    setStockHistoryFilterOpen,
    setStockHistoryPage,
    setStockHistorySearch,
    setSupplierDebtDialogOpen,
    setSupplierDebtReceiptPreview,
    setTransactionMethodFilter,
    setTransactionPage,
    setTransactionSearch,
    setTransactionStatusFilter,
    setUserRoleFilter,
    setUserSearch,
    settingAppearanceModeOptions,
    settingAppearanceScaleOptions,
    settingReceiptPreviewModels,
    settingReceiptSampleDocument,
    showOperationalPanel,
    showRangeFilter,
    sidebarItems,
    slugFilePart,
    splitImportLine,
    stockActionMessageTimer,
    stockHistoryFilter,
    stockHistoryFilterLabel,
    stockHistoryFilterOpen,
    stockHistoryFilterOptions,
    stockHistoryPage,
    stockHistoryPageCount,
    stockHistoryPageEnd,
    stockHistoryPageSize,
    stockHistoryPageStart,
    stockHistoryRows,
    stockHistorySearch,
    stockHistorySummary,
    storeLogoAcceptedTypes,
    storeLogoMaxSizeBytes,
    storeLogoMaxSizeKb,
    storeName,
    submitCashierCheckout,
    submitCatalogDraft,
    submitCategoryRename,
    submitImportCatalog,
    submitReceivablePayment,
    submitRestockItem,
    submitSupplierDebt,
    submitSupplierDebtPayment,
    submitUserDraft,
    supplierDebtSeedRows,
    syncAppSettings,
    toggleBatchSku,
    toggleCatalogSort,
    toggleCatalogTrail,
    toggleReceiptSection,
    toggleReceivableSort,
    toggleRolePermission,
    toggleTransactionSort,
    totpUserCount,
    transactionMethodFilter,
    transactionMethodOptions,
    transactionPage,
    transactionPageCount,
    transactionPageEnd,
    transactionPageSize,
    transactionPageStart,
    transactionRows,
    transactionSearch,
    transactionSeedRows,
    transactionStatusFilter,
    transactionSummary,
    updateSupplierDebtDraftItem,
    userActionMessage,
    userRoleFilter,
    userRoleOptions,
    userRowsData,
    userSearch,
    userSeedRows,
    visibleSidebarItems,
  };

  const renderCenter = () => {
    switch (activeMenu) {
      case 'Dashboard':
        return (
          <DashboardView
            rangeLabel={rangeLabel}
            catalogCount={data.posCatalog.length}
            criticalLowStockCount={criticalLowStockCount}
            dashboardKpis={dashboardKpis}
            dashboardOperations={dashboardOperations}
            sales7Days={dashboardSales7Days}
            salesByHour={dashboardSalesByHour}
            dashboardChartConfig={dashboardChartConfig}
            onNavigate={navigateMenu}
          />
        );

      case 'Kasir':
        return <CashierView view={legacyViewContext} />;

      case 'Barang':
        return <CatalogView view={legacyViewContext} />;

      case 'Stok rendah':
        return <LowStockView view={legacyViewContext} />;

      case 'Riwayat stok':
        return <StockHistoryView view={legacyViewContext} />;

      case 'Transaksi':
        return <TransactionsView view={legacyViewContext} />;

      case 'Hutang':
        return <SupplierDebtView view={legacyViewContext} />;

      case 'Piutang':
        return <ReceivablesView view={legacyViewContext} />;

      case 'Laporan':
        return <ReportsView view={legacyViewContext} />;

      case 'Insight':
        return (
          <InsightView
            generateInsightModal={renderFeatureModal({
              title: 'Generate insight',
              trigger: 'Generate ulang',
              icon: Sparkles,
              tone: 'primary',
              rows: [
                { label: 'Sumber data', value: 'Penjualan, stok, piutang, hutang' },
                { label: 'Output', value: 'Rekomendasi restok dan produk lambat' },
                { label: 'Mode', value: 'Local first / opsional AI' },
                { label: 'Catatan', value: 'Tidak mengirim data tanpa izin' },
              ],
              primary: 'Generate',
            })}
          />
        );

      case 'Pengguna':
        return <UsersView view={legacyViewContext} />;

      case 'Database':
        return (
          <React.Suspense fallback={<div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">Memuat database...</div>}>
            <LazyDatabaseView
              databaseActionMessage={databaseActionMessage}
              databaseAutoBackupEnabled={databaseAutoBackupEnabled}
              databaseBackupVisibleRows={databaseBackupVisibleRows}
              databaseEntityStats={databaseEntityStats}
              databaseExportStamp={databaseExportStamp}
              databaseHardResetConfirmation={databaseHardResetConfirmation}
              databaseHardResetError={databaseHardResetError}
              databaseHardResetOpen={databaseHardResetOpen}
              databaseHardResetReason={databaseHardResetReason}
              databaseHardResetSaving={databaseHardResetSaving}
              databaseHealthVisible={databaseHealthVisible}
              databaseMutationCount={databaseMutationCount}
              databaseNextBackupLabel={databaseNextBackupLabel}
              databaseSizeEstimate={databaseSizeEstimate}
              databaseTab={databaseTab}
              exportCatalogToCsv={exportCatalogToCsv}
              exportDatabaseSummaryWorkbook={exportDatabaseSummaryWorkbook}
              exportStockHistoryToCsv={exportStockHistoryToCsv}
              exportTransactionsWorkbook={exportTransactionsWorkbook}
              handleDatabaseAction={handleDatabaseAction}
              performDatabaseBackup={performDatabaseBackup}
              performDatabaseDelete={performDatabaseDelete}
              performDatabaseHardReset={performDatabaseHardReset}
              performDatabaseMaintenance={performDatabaseMaintenance}
              performDatabaseRestore={performDatabaseRestore}
              refreshDatabaseBackups={refreshDatabaseBackups}
              resetHardResetDialog={resetHardResetDialog}
              resetSettingsToDefault={resetSettingsToDefault}
              setActiveMenu={setActiveMenu}
              setDatabaseActionMessage={setDatabaseActionMessage}
              setDatabaseAutoBackupEnabled={setDatabaseAutoBackupEnabled}
              setDatabaseHardResetConfirmation={setDatabaseHardResetConfirmation}
              setDatabaseHardResetOpen={setDatabaseHardResetOpen}
              setDatabaseHardResetReason={setDatabaseHardResetReason}
              setDatabaseTab={setDatabaseTab}
            />
          </React.Suspense>
        );

      case 'Setting':
        return (
          <React.Suspense fallback={<div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">Memuat setting...</div>}>
            <LazySettingView
              adminUrl={adminUrl}
              handleSettingAction={handleSettingAction}
              lanAdminUrl={lanAdminUrl}
              lanPriceCheckerUrl={lanPriceCheckerUrl}
              priceCheckerUrl={priceCheckerUrl}
              saveAppSettings={saveAppSettings}
              settingActionMessage={settingActionMessage}
              settingAppearanceMode={settingAppearanceMode}
              settingAppearanceModeOptions={settingAppearanceModeOptions}
              settingAppearanceScale={settingAppearanceScale}
              settingAppearanceScaleOptions={settingAppearanceScaleOptions}
              settingAppearanceTheme={settingAppearanceTheme}
              settingCashDrawerConnectionMode={settingCashDrawerConnectionMode}
              settingCashDrawerEnabled={settingCashDrawerEnabled}
              settingCashDrawerNetworkInterface={settingCashDrawerNetworkInterface}
              settingCashDrawerOpenOnCashCheckout={settingCashDrawerOpenOnCashCheckout}
              settingCashDrawerOpenOnReceivablePayment={settingCashDrawerOpenOnReceivablePayment}
              settingCashDrawerPrinterName={settingCashDrawerPrinterName}
              settingCashDrawerPrinterType={settingCashDrawerPrinterType}
              settingPrinterBehavior={settingPrinterBehavior}
              settingPrinterName={settingPrinterName}
              settingReceiptLayout={settingReceiptLayout}
              settingReceiptPreviewPaper={settingReceiptPreviewPaper}
              settingStoreAddress={settingStoreAddress}
              settingStoreName={settingStoreName}
              settingStorePhone={settingStorePhone}
              settingTab={settingTab}
              syncAppSettings={syncAppSettings}
              setSettingActionMessage={setSettingActionMessage}
              setSettingAppearanceMode={setSettingAppearanceMode}
              setSettingAppearanceScale={setSettingAppearanceScale}
              onSettingAppearanceThemeChange={handleAppearanceThemeChange}
              setSettingCashDrawerConnectionMode={setSettingCashDrawerConnectionMode}
              setSettingCashDrawerEnabled={setSettingCashDrawerEnabled}
              setSettingCashDrawerNetworkInterface={setSettingCashDrawerNetworkInterface}
              setSettingCashDrawerOpenOnCashCheckout={setSettingCashDrawerOpenOnCashCheckout}
              setSettingCashDrawerOpenOnReceivablePayment={setSettingCashDrawerOpenOnReceivablePayment}
              setSettingCashDrawerPrinterName={setSettingCashDrawerPrinterName}
              setSettingCashDrawerPrinterType={setSettingCashDrawerPrinterType}
              setSettingPrinterBehavior={setSettingPrinterBehavior}
              setSettingPrinterName={setSettingPrinterName}
              setSettingReceiptLayout={setSettingReceiptLayout}
              setSettingReceiptPreviewPaper={setSettingReceiptPreviewPaper}
              setSettingStoreAddress={setSettingStoreAddress}
              setSettingStoreName={setSettingStoreName}
              setSettingStorePhone={setSettingStorePhone}
              setSettingTab={setSettingTab}
              testCashDrawer={testCashDrawer}
            />
          </React.Suspense>
        );
    }
  };

  return (
    <div
      className={[
        'grid h-full min-h-0 gap-3',
        showOperationalPanel ? 'xl:grid-cols-[240px_minmax(0,1fr)_340px]' : 'xl:grid-cols-[240px_minmax(0,1fr)]',
      ].join(' ')}
    >
      <PosNavigationSidebar
        activeMenu={activeMenu}
        alerts={alerts}
        items={visibleSidebarItems}
        onNavigate={navigateMenu}
      />

      <section className="grid min-h-0 gap-4">
        <div className="min-w-0">{renderCenter()}</div>
      </section>

      {renderCashierReceiptPreviewModal()}
      {renderSaleRevisionModal()}
      {renderSupplierDebtDialog()}
      {renderSupplierDebtPaymentModal()}
      {renderSupplierDebtReceiptPreviewModal()}
      {renderReceivablePaymentModal()}
      {renderReceivableReceiptPreviewModal()}
      {renderReportPrintPreviewModal()}

      {showOperationalPanel ? (
        <PosOperationalPanel
          rows={dashboardLatestTransactions}
          onNavigate={navigateMenu}
          onOpenTransaction={(invoice) => {
            setExpandedTransactionInvoice(invoice);
            navigateMenu('Transaksi');
          }}
        />
      ) : null}
    </div>
  );
}
