import {
  AlertTriangle,
  Barcode,
  Boxes,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Database,
  FileText,
  Gauge,
  History,
  MapPin,
  Monitor,
  Phone,
  Printer,
  Receipt,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Tags,
  UserPlus,
  Wrench,
} from 'lucide-react';
import type { MenuIcon } from '../../../contracts/pos-ui';

const iconRules: Array<{ terms: string[]; icon: MenuIcon }> = [
  { terms: ['backup', 'restore', 'database', 'db', 'snapshot'], icon: Database },
  { terms: ['printer', 'print', 'cetak', 'struk', 'thermal'], icon: Printer },
  { terms: ['barcode', 'scan', 'qr', 'qris'], icon: Barcode },
  { terms: ['pelanggan', 'customer', 'kontak', 'telepon', 'nama'], icon: UserPlus },
  { terms: ['alamat', 'kirim', 'pengiriman', 'armada', 'supir'], icon: MapPin },
  { terms: ['telepon', 'phone', 'kontak'], icon: Phone },
  { terms: ['tunai', 'bayar', 'pembayaran', 'kas', 'cash', 'nominal', 'total', 'subtotal', 'omzet', 'laba', 'profit', 'margin'], icon: CircleDollarSign },
  { terms: ['tempo', 'jatuh', 'jam', 'waktu', 'tanggal', 'periode', 'hari'], icon: Clock3 },
  { terms: ['hutang', 'piutang', 'cicilan', 'debit', 'transfer'], icon: CreditCard },
  { terms: ['stok', 'restok', 'stock', 'produk', 'barang', 'material', 'supplier', 'pemasok'], icon: Boxes },
  { terms: ['kategori', 'tag', 'satuan', 'tipe', 'role', 'status'], icon: Tags },
  { terms: ['laporan', 'report', 'pdf', 'excel', 'export', 'file', 'txt', 'format'], icon: FileText },
  { terms: ['insight', 'ai', 'rekomendasi', 'abnormal', 'analisis'], icon: Sparkles },
  { terms: ['security', 'aman', 'totp', 'password', 'recovery', 'otorisasi', 'audit'], icon: ShieldCheck },
  { terms: ['warning', 'peringatan', 'kritis', 'rendah', 'void', 'hapus', 'reset', 'error'], icon: AlertTriangle },
  { terms: ['aktif', 'lunas', 'selesai', 'validasi', 'berhasil'], icon: CheckCircle2 },
  { terms: ['shortcut', 'keyboard', 'terminal', 'host', 'lan', 'endpoint'], icon: Monitor },
  { terms: ['riwayat', 'history', 'log', 'mutasi'], icon: History },
  { terms: ['setting', 'konfigurasi', 'template'], icon: Settings2 },
  { terms: ['toko', 'profil', 'logo'], icon: Store },
  { terms: ['kalkulator', 'hitung', 'volume', 'luas', 'berat'], icon: Calculator },
  { terms: ['performa', 'optimasi', 'integritas', 'vacuum'], icon: Gauge },
  { terms: ['invoice', 'transaksi', 'receipt'], icon: Receipt },
  { terms: ['backup lokal', 'cloud', 'drive', 'integrasi'], icon: Wrench },
];

function getContextIcon(text: string): MenuIcon {
  const normalized = text.toLowerCase();
  return iconRules.find((rule) => rule.terms.some((term) => normalized.includes(term)))?.icon ?? FileText;
}

export function ContextIcon({ label, className = '' }: { label: string; className?: string }) {
  const Icon = getContextIcon(label);

  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/70 text-foreground ${className}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
