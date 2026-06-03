import type { SettingAppearanceMode, SettingAppearanceScale, SettingAppearanceTheme } from '../contracts/pos-ui';
import type { UserThemeAccent } from '../services/posApi.types';

export type AppearanceScope = 'pos' | 'mobile-admin';

export type DocumentAppearance = {
  mode: SettingAppearanceMode;
  scale?: SettingAppearanceScale;
  theme?: SettingAppearanceTheme;
  accent?: UserThemeAccent;
};

type ThemePreset = {
  value: SettingAppearanceTheme;
  label: string;
  note: string;
  swatch: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    accent: string;
  };
};

const APPEARANCE_STORAGE_KEYS: Record<AppearanceScope, string> = {
  pos: 'tokobersama.pos.appearance',
  'mobile-admin': 'tokobersama.mobile-admin.appearance',
};

const USER_THEME_STORAGE_PREFIX = 'tokobersama.pos.user-theme';

const SCALE_CLASS_NAMES: Array<`ui-scale-${SettingAppearanceScale}`> = [
  'ui-scale-xs',
  'ui-scale-sm',
  'ui-scale-md',
  'ui-scale-lg',
  'ui-scale-xl',
];

const ROOT_CLASS_NAMES = [
  'dark',
  'theme-light',
  'theme-dark',
  ...SCALE_CLASS_NAMES,
  'admin-accent-amber',
  'admin-accent-emerald',
  'admin-accent-sky',
  'admin-accent-rose',
] as const;

const POS_THEME_VARIABLES = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--border',
  '--input',
  '--ring',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
] as const;

export const defaultPosTheme: SettingAppearanceTheme = 'obsidian-gold';

export const posThemeOptions: ThemePreset[] = [
  {
    value: 'obsidian-gold',
    label: 'Obsidian Gold',
    note: 'Hitam emas klasik',
    swatch: 'linear-gradient(135deg, #040507 0%, #111827 44%, #f59e0b 100%)',
    colors: { background: '#040507', surface: '#0b1220', primary: '#f59e0b', accent: '#38bdf8' },
  },
  {
    value: 'midnight-emerald',
    label: 'Midnight Emerald',
    note: 'Zamrud dalam',
    swatch: 'linear-gradient(135deg, #040707 0%, #0f1f1a 44%, #10b981 100%)',
    colors: { background: '#040707', surface: '#0d1715', primary: '#10b981', accent: '#34d399' },
  },
  {
    value: 'midnight-sapphire',
    label: 'Midnight Sapphire',
    note: 'Biru mewah',
    swatch: 'linear-gradient(135deg, #04060a 0%, #101a2e 44%, #3b82f6 100%)',
    colors: { background: '#04060a', surface: '#0f172a', primary: '#3b82f6', accent: '#38bdf8' },
  },
  {
    value: 'midnight-ruby',
    label: 'Midnight Ruby',
    note: 'Merah premium',
    swatch: 'linear-gradient(135deg, #050509 0%, #1d1020 44%, #ef4444 100%)',
    colors: { background: '#050509', surface: '#15111e', primary: '#ef4444', accent: '#fb7185' },
  },
  {
    value: 'midnight-amethyst',
    label: 'Midnight Amethyst',
    note: 'Ungu halus',
    swatch: 'linear-gradient(135deg, #05040a 0%, #16122a 44%, #8b5cf6 100%)',
    colors: { background: '#05040a', surface: '#151127', primary: '#8b5cf6', accent: '#c084fc' },
  },
  {
    value: 'midnight-teal',
    label: 'Midnight Teal',
    note: 'Teal dingin',
    swatch: 'linear-gradient(135deg, #040909 0%, #0f2025 44%, #14b8a6 100%)',
    colors: { background: '#040909', surface: '#0e1f23', primary: '#14b8a6', accent: '#2dd4bf' },
  },
  {
    value: 'midnight-copper',
    label: 'Midnight Copper',
    note: 'Tembaga gelap',
    swatch: 'linear-gradient(135deg, #050504 0%, #20140e 44%, #c08457 100%)',
    colors: { background: '#050504', surface: '#20140e', primary: '#c08457', accent: '#f59e0b' },
  },
  {
    value: 'midnight-cyan',
    label: 'Midnight Cyan',
    note: 'Cyan tajam',
    swatch: 'linear-gradient(135deg, #04070a 0%, #0a1d2e 44%, #06b6d4 100%)',
    colors: { background: '#04070a', surface: '#0a1d2e', primary: '#06b6d4', accent: '#38bdf8' },
  },
  {
    value: 'midnight-rose',
    label: 'Midnight Rose',
    note: 'Rose luxe',
    swatch: 'linear-gradient(135deg, #05050a 0%, #1d1120 44%, #fb7185 100%)',
    colors: { background: '#05050a', surface: '#1d1120', primary: '#fb7185', accent: '#f472b6' },
  },
  {
    value: 'midnight-lime',
    label: 'Midnight Lime',
    note: 'Lime kuat',
    swatch: 'linear-gradient(135deg, #040804 0%, #15210c 44%, #84cc16 100%)',
    colors: { background: '#040804', surface: '#16210c', primary: '#84cc16', accent: '#a3e635' },
  },
  {
    value: 'midnight-indigo',
    label: 'Midnight Indigo',
    note: 'Indigo kalem',
    swatch: 'linear-gradient(135deg, #04050a 0%, #11192c 44%, #6366f1 100%)',
    colors: { background: '#04050a', surface: '#12192c', primary: '#6366f1', accent: '#818cf8' },
  },
  {
    value: 'midnight-bronze',
    label: 'Midnight Bronze',
    note: 'Bronze panas',
    swatch: 'linear-gradient(135deg, #050504 0%, #23180e 44%, #b45309 100%)',
    colors: { background: '#050504', surface: '#23180e', primary: '#b45309', accent: '#fbbf24' },
  },
  {
    value: 'midnight-onyx',
    label: 'Midnight Onyx',
    note: 'Netral tajam',
    swatch: 'linear-gradient(135deg, #040507 0%, #10141b 44%, #94a3b8 100%)',
    colors: { background: '#040507', surface: '#10141b', primary: '#94a3b8', accent: '#f59e0b' },
  },
  {
    value: 'midnight-mint',
    label: 'Midnight Mint',
    note: 'Mint bersih',
    swatch: 'linear-gradient(135deg, #040908 0%, #0d1f19 44%, #34d399 100%)',
    colors: { background: '#040908', surface: '#0d1f19', primary: '#34d399', accent: '#6ee7b7' },
  },
  {
    value: 'midnight-plum',
    label: 'Midnight Plum',
    note: 'Plum elegan',
    swatch: 'linear-gradient(135deg, #050409 0%, #1c1023 44%, #d946ef 100%)',
    colors: { background: '#050409', surface: '#1c1023', primary: '#d946ef', accent: '#a855f7' },
  },
];

const POS_THEME_LOOKUP = new Map<SettingAppearanceTheme, ThemePreset>(posThemeOptions.map((item) => [item.value, item]));

function getSystemMode(): Exclude<SettingAppearanceMode, 'auto'> {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getThemeStyleValue(base: string, mix: string, ratio: string) {
  return `color-mix(in oklch, ${base} ${ratio}, ${mix})`;
}

function isPosTheme(value: unknown): value is SettingAppearanceTheme {
  return typeof value === 'string' && POS_THEME_LOOKUP.has(value as SettingAppearanceTheme);
}

function getUserThemeStorageKey(username: string) {
  return `${USER_THEME_STORAGE_PREFIX}:${username.trim().toLowerCase()}`;
}

function clearPosThemeStyles(root: HTMLElement) {
  POS_THEME_VARIABLES.forEach((name) => {
    root.style.removeProperty(name);
  });
}

function applyPosThemeStyles(root: HTMLElement, theme: ThemePreset) {
  const { background, surface, primary, accent } = theme.colors;
  const card = getThemeStyleValue(surface, primary, '88%');
  const popover = getThemeStyleValue(surface, primary, '86%');
  const secondary = getThemeStyleValue(surface, primary, '80%');
  const muted = getThemeStyleValue(surface, primary, '74%');
  const border = getThemeStyleValue(surface, primary, '68%');
  const input = getThemeStyleValue(surface, primary, '62%');
  const sidebar = getThemeStyleValue(background, primary, '82%');
  const sidebarAccent = getThemeStyleValue(surface, accent, '80%');
  const chart3 = getThemeStyleValue(surface, primary, '58%');
  const chart4 = getThemeStyleValue(surface, accent, '58%');
  const chart5 = getThemeStyleValue(primary, accent, '52%');

  root.style.setProperty('--background', background);
  root.style.setProperty('--foreground', 'oklch(0.985 0.002 197.1)');
  root.style.setProperty('--card', card);
  root.style.setProperty('--card-foreground', 'oklch(0.985 0.002 197.1)');
  root.style.setProperty('--popover', popover);
  root.style.setProperty('--popover-foreground', 'oklch(0.985 0.002 197.1)');
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-foreground', 'oklch(0.16 0.012 85)');
  root.style.setProperty('--secondary', secondary);
  root.style.setProperty('--secondary-foreground', 'oklch(0.985 0.002 197.1)');
  root.style.setProperty('--muted', muted);
  root.style.setProperty('--muted-foreground', 'oklch(0.76 0.012 96)');
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-foreground', 'oklch(0.16 0.012 85)');
  root.style.setProperty('--destructive', 'oklch(0.64 0.2 25)');
  root.style.setProperty('--destructive-foreground', 'oklch(0.985 0.01 96)');
  root.style.setProperty('--border', border);
  root.style.setProperty('--input', input);
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--sidebar', sidebar);
  root.style.setProperty('--sidebar-foreground', 'oklch(0.985 0.002 197.1)');
  root.style.setProperty('--sidebar-primary', primary);
  root.style.setProperty('--sidebar-primary-foreground', 'oklch(0.16 0.012 85)');
  root.style.setProperty('--sidebar-accent', sidebarAccent);
  root.style.setProperty('--sidebar-accent-foreground', 'oklch(0.985 0.002 197.1)');
  root.style.setProperty('--sidebar-border', border);
  root.style.setProperty('--sidebar-ring', primary);
  root.style.setProperty('--chart-1', primary);
  root.style.setProperty('--chart-2', accent);
  root.style.setProperty('--chart-3', chart3);
  root.style.setProperty('--chart-4', chart4);
  root.style.setProperty('--chart-5', chart5);
}

export function resolveAppearanceMode(mode: SettingAppearanceMode): Exclude<SettingAppearanceMode, 'auto'> {
  return mode === 'auto' ? getSystemMode() : mode;
}

export function readStoredAppearance(scope: AppearanceScope): DocumentAppearance | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEYS[scope]);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DocumentAppearance>;
    if (parsed.mode !== 'auto' && parsed.mode !== 'light' && parsed.mode !== 'dark') {
      return null;
    }

    return {
      mode: parsed.mode,
      scale: parsed.scale === 'xs' || parsed.scale === 'sm' || parsed.scale === 'md' || parsed.scale === 'lg' || parsed.scale === 'xl' ? parsed.scale : undefined,
      theme: scope === 'pos' && isPosTheme(parsed.theme) ? parsed.theme : undefined,
      accent: parsed.accent === 'amber' || parsed.accent === 'emerald' || parsed.accent === 'sky' || parsed.accent === 'rose' ? parsed.accent : undefined,
    };
  } catch {
    return null;
  }
}

export function writeStoredAppearance(scope: AppearanceScope, appearance: DocumentAppearance): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(APPEARANCE_STORAGE_KEYS[scope], JSON.stringify(appearance));
}

export function readStoredPosThemeForUsername(username: string): SettingAppearanceTheme | null {
  if (typeof window === 'undefined') return null;

  const key = getUserThemeStorageKey(username);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { theme?: unknown };
    return isPosTheme(parsed.theme) ? parsed.theme : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function writeStoredPosThemeForUsername(username: string, theme: SettingAppearanceTheme): void {
  if (typeof window === 'undefined') return;

  const key = getUserThemeStorageKey(username);
  window.localStorage.setItem(key, JSON.stringify({ theme }));
}

export function applyDocumentAppearance(scope: AppearanceScope, appearance: DocumentAppearance): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const resolvedMode = resolveAppearanceMode(appearance.mode);

  root.classList.remove(...ROOT_CLASS_NAMES);
  root.classList.toggle('dark', resolvedMode === 'dark');
  root.classList.toggle('theme-dark', resolvedMode === 'dark');
  root.classList.toggle('theme-light', resolvedMode === 'light');

  const nextScale = appearance.scale ?? 'md';
  root.classList.add(`ui-scale-${nextScale}`);

  if (appearance.accent) {
    root.classList.add(`admin-accent-${appearance.accent}`);
  }

  clearPosThemeStyles(root);
  if (scope === 'pos' && resolvedMode === 'dark') {
    const nextTheme = POS_THEME_LOOKUP.get(appearance.theme ?? defaultPosTheme) ?? POS_THEME_LOOKUP.get(defaultPosTheme)!;
    applyPosThemeStyles(root, nextTheme);
    root.dataset.posTheme = nextTheme.value;
  } else {
    delete root.dataset.posTheme;
  }

  root.dataset.appearanceMode = appearance.mode;
  root.dataset.appearanceScale = nextScale;
  root.dataset.appearanceScope = scope;
  if (appearance.accent) {
    root.dataset.mobileAdminAccent = appearance.accent;
  } else {
    delete root.dataset.mobileAdminAccent;
  }
}

export function hydrateDocumentAppearance(scope: AppearanceScope, fallback: DocumentAppearance): DocumentAppearance {
  const stored = readStoredAppearance(scope);
  const nextAppearance = stored ?? fallback;
  applyDocumentAppearance(scope, nextAppearance);
  return nextAppearance;
}
