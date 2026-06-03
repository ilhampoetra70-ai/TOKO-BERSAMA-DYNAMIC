import type { AdminSection, ReportRange } from './types';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactCurrency(value: number) {
  const numeric = Number.isFinite(value) ? value : 0;
  if (numeric >= 1_000_000_000) {
    return `Rp${(numeric / 1_000_000_000).toFixed(1)} M`;
  }
  if (numeric >= 1_000_000) {
    return `Rp${(numeric / 1_000_000).toFixed(2)} jt`;
  }
  if (numeric >= 1_000) {
    return `Rp${Math.round(numeric / 1_000)} rb`;
  }
  return formatCurrency(numeric);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateGroup(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tanggal lain';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function parseCurrencyLabel(value: string) {
  const normalized = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeSearch(value: string) {
  return value.toLowerCase().trim();
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : '';
}

export function formatLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveReportRange(range: ReportRange) {
  const today = new Date();
  const from = new Date(today);
  if (range === '7d') {
    from.setDate(today.getDate() - 6);
  } else if (range === '30d') {
    from.setDate(today.getDate() - 29);
  }

  return {
    from: formatLocalDate(from),
    to: formatLocalDate(today),
  };
}

export function resolveAdminSection(pathname: string): AdminSection {
  const raw = pathname.replace(/^\/admin\/?/, '').split('?')[0].trim();
  if (raw === 'transactions' || raw === 'inventory' || raw === 'receivables' || raw === 'settings') {
    return raw;
  }
  return 'overview';
}

export function buildAdminPath(section: AdminSection) {
  return section === 'overview' ? '/admin' : `/admin/${section}`;
}

export function describeSection(section: AdminSection) {
  if (section === 'transactions') return 'Transaksi terbaru';
  if (section === 'inventory') return 'Inspeksi stok';
  if (section === 'receivables') return 'Piutang aktif';
  if (section === 'settings') return 'Akun dan sesi';
  return 'Ringkasan harian';
}
