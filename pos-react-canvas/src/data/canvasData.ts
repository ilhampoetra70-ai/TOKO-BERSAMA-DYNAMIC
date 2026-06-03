import type {
  AlertItem,
  CanvasViewData,
  CashierSessionRow,
  MetricItem,
  PriceHistoryItem,
  QueueItem,
  SaleRow,
  StockHistoryItem,
  StockItem,
} from '../contracts/pos';

export const posQueue: QueueItem[] = [
  { sku: '8991204500019', name: 'Semen 50kg', category: 'Semen', qty: 18, unit: 'sak', note: 'Low stock', price: 'Rp 72.000' },
  { sku: '8991204500026', name: 'Hollow galvanis 4m', category: 'Besi', qty: 26, unit: 'batang', note: 'Promo', price: 'Rp 89.500' },
];

export const posCatalog: QueueItem[] = [
  { sku: '8991204500033', name: 'Pasir bangunan 1 truk', category: 'Pasir', qty: 14, unit: 'truk', note: 'Material', price: 'Rp 1.250.000' },
  { sku: '8991204500040', name: 'Cat tembok 5kg', category: 'Cat', qty: 42, unit: 'kaleng', note: 'Interior', price: 'Rp 145.000' },
  { sku: '8991204500057', name: 'Gypsum board 9mm', category: 'Panel', qty: 19, unit: 'lembar', note: 'Panel', price: 'Rp 78.000' },
  { sku: '8991204500064', name: 'Besi beton 12mm', category: 'Besi', qty: 31, unit: 'batang', note: 'Struktural', price: 'Rp 112.500' },
];

export const adminMetrics: MetricItem[] = [
  { value: '1,248', label: 'Stock' },
  { value: '24', label: 'Alerts' },
  { value: '14', label: 'Prices' },
  { value: '97%', label: 'Sync' },
];

export const adminControls: AlertItem[] = [
  { title: 'Inventory', note: 'Movements' },
  { title: 'Pricing', note: 'Editable' },
  { title: 'Security', note: 'TOTP' },
];

export const stockRows: StockItem[] = [
  { item: 'Semen 50kg', stock: 18, status: 'Low', action: 'Reorder' },
  { item: 'Pasir bangunan', stock: 74, status: 'Healthy', action: 'View' },
  { item: 'Paku beton', stock: 4, status: 'Critical', action: 'Pause sale' },
  { item: 'Cat tembok 5kg', stock: 31, status: 'Healthy', action: 'Edit' },
];

export const stockHistoryRows: StockHistoryItem[] = [
  { item: 'SEMEN 50KG', movement: '-24', note: 'Terjual hari ini', time: '08:42', event: 'Penjualan', beforeQty: 42, afterQty: 18, operator: 'KASIR UTAMA', source: 'Kasir' },
  { item: 'CAT TEMBOK 5KG', movement: '+12', note: 'Restok oleh user pada 09:15', time: '09:15', event: 'Restok', beforeQty: 30, afterQty: 42, operator: 'ADMIN TOKO', source: 'Restok' },
  { item: 'BESI BETON 12MM', movement: '-8', note: 'Pengambilan proyek', time: '10:05', event: 'Penyesuaian', beforeQty: 39, afterQty: 31, operator: 'SUPERVISOR GUDANG', source: 'Penyesuaian manual' },
  { item: 'PASIR BANGUNAN', movement: '+1', note: 'Stock opname', time: '11:20', event: 'Stock opname', beforeQty: 13, afterQty: 14, operator: 'SUPERVISOR GUDANG', source: 'Stock opname' },
];

export const saleRows: SaleRow[] = [
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

export const cashierSessionRows: CashierSessionRow[] = [];

export const adminAlerts: AlertItem[] = [
  { title: 'Price mismatch', note: '2 terminals' },
  { title: 'Recovery audit', note: '1 event' },
  { title: 'Sync queue', note: '3 pending' },
];

export const priceHistory: PriceHistoryItem[] = [
  { label: 'Yesterday', value: 'Rp 69.500' },
  { label: 'Promo window', value: 'Rp 72.000' },
  { label: 'Margin', value: '15.6%' },
];

export const canvasViewData = {
  posQueue,
  posCatalog,
  stockHistoryRows,
  saleRows,
  cashierSessionRows,
  adminMetrics,
  adminControls,
  stockRows,
  adminAlerts,
  priceHistory,
} satisfies CanvasViewData;
