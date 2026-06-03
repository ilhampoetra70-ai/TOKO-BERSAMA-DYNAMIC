import type { AppSettings, MobileAdminInventorySort, UserAppearancePreference, UserThemeAccent } from '../services/posApi.types';

export type AdminSection = 'overview' | 'transactions' | 'inventory' | 'receivables' | 'settings';
export type LoadState = 'idle' | 'loading' | 'ready' | 'error';
export type ReportRange = 'today' | '7d' | '30d';
export type InventorySort = MobileAdminInventorySort;

export const fallbackStore: AppSettings['store'] = {
  name: 'TOKO BERSAMA MATERIAL',
  address: '',
  phone: '',
  logoDataUrl: null,
  logoFileName: '',
  logoFileSizeKb: null,
};

export const adminSections: Array<{ value: AdminSection; label: string; glyph: AdminSection }> = [
  { value: 'overview', label: 'Dasbor', glyph: 'overview' },
  { value: 'transactions', label: 'Jual', glyph: 'transactions' },
  { value: 'inventory', label: 'Stok', glyph: 'inventory' },
  { value: 'receivables', label: 'Tagih', glyph: 'receivables' },
  { value: 'settings', label: 'Akun', glyph: 'settings' },
];

export const defaultAppearancePreference: UserAppearancePreference = {
  mode: 'auto',
  accent: 'amber',
  theme: 'obsidian-gold',
};

export const accentOptions: Array<{ value: UserThemeAccent; label: string; swatch: string }> = [
  { value: 'amber', label: 'Amber', swatch: 'bg-amber-400' },
  { value: 'emerald', label: 'Emerald', swatch: 'bg-emerald-400' },
  { value: 'sky', label: 'Sky', swatch: 'bg-sky-400' },
  { value: 'rose', label: 'Rose', swatch: 'bg-rose-400' },
];

export const reportRangeOptions: Array<{ value: ReportRange; label: string }> = [
  { value: 'today', label: '1H' },
  { value: '7d', label: '7H' },
  { value: '30d', label: '30H' },
];

export const adminThemeColor: Record<UserThemeAccent, string> = {
  amber: '#f59e0b',
  emerald: '#10b981',
  sky: '#0ea5e9',
  rose: '#f43f5e',
};

export const paymentPalette = ['#ff6b57', '#14b8a6', '#38bdf8', '#f59e0b'];
export const categoryPalette = ['#ff6b57', '#14b8a6', '#38bdf8', '#f59e0b'];
