import { useEffect, useState } from 'react';
import { Check, ChevronDown, HardDrive, LogOut, Palette, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import type { AppSettings, AuthSession, UserAppearancePreference } from '../../services/posApi.types';
import { accentOptions, adminThemeColor } from '../types';

interface SettingsPageProps {
  session: AuthSession;
  storeIdentity: AppSettings['store'];
  adminUrl: string;
  lanAdminUrl: string;
  appearancePreference: UserAppearancePreference;
  appearanceSaving: boolean;
  appearanceError: string;
  saveAppearancePreference: (next: UserAppearancePreference) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export function SettingsPage({
  session,
  storeIdentity,
  adminUrl,
  lanAdminUrl,
  appearancePreference,
  appearanceSaving,
  appearanceError,
  saveAppearancePreference,
  onRefresh,
  onLogout,
}: SettingsPageProps) {
  const [cacheLabel, setCacheLabel] = useState('Tidak tersedia');
  const [accentOpen, setAccentOpen] = useState(false);
  const currentAccent = accentOptions.find((option) => option.value === appearancePreference.accent) ?? accentOptions[0];

  useEffect(() => {
    if (!('caches' in window)) return;
    let active = true;
    const calculateCache = async () => {
      const keys = await caches.keys();
      let total = 0;
      for (const key of keys) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        total += requests.length;
      }
      if (active) setCacheLabel(`${total} item cache`);
    };
    calculateCache().catch(() => {
      if (active) setCacheLabel('Tidak tersedia');
    });
    return () => { active = false; };
  }, []);

  return (
    <div data-mobile-admin-scroll-root="settings" className="grid gap-3 lg:max-h-[calc(100dvh-14.25rem)] lg:overflow-auto lg:pr-1">
      <Card className="border-border/70 bg-card/95">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
            <Palette className="h-4 w-4" />
            Tampilan akun
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1.5 rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mode</span>
            <div className="relative">
              <select
                value={appearancePreference.mode}
                disabled={appearanceSaving}
                onChange={(event) => void saveAppearancePreference({
                  ...appearancePreference,
                  mode: event.target.value as UserAppearancePreference['mode'],
                })}
                className="h-10 w-full appearance-none rounded-xl border border-border/70 bg-background px-3 pr-8 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="auto">Auto</option>
                <option value="dark">Gelap</option>
                <option value="light">Terang</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
          <div className="grid gap-1.5 rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-full ${currentAccent.swatch}`} />
              Warna aksen
            </span>
            <Popover open={accentOpen} onOpenChange={setAccentOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={appearanceSaving}
                  className="h-10 w-full justify-between rounded-xl border-border/70 bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${currentAccent.swatch}`} />
                    <span className="truncate">{currentAccent.label}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,16rem)] rounded-2xl p-2">
                {accentOptions.map((option) => {
                  const active = appearancePreference.accent === option.value;
                  const color = adminThemeColor[option.value];
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      disabled={appearanceSaving}
                      className="h-11 w-full justify-between rounded-xl border px-3 text-sm font-medium text-foreground"
                      style={{
                        backgroundColor: active ? `${color}2E` : `${color}18`,
                        borderColor: active ? color : `${color}44`,
                      }}
                      onClick={() => {
                        void saveAppearancePreference({
                          ...appearancePreference,
                          accent: option.value,
                        });
                        setAccentOpen(false);
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{option.label}</span>
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </Button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
          {appearanceError ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 sm:col-span-2">
              {appearanceError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Sesi aktif
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pengguna</div>
            <div className="mt-1 text-sm font-semibold">{session?.user.name}</div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Role</div>
              <div className="mt-1 text-sm">{session?.user.role}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Scope</div>
              <div className="mt-1 text-sm">{session?.user.scope}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl px-4 text-sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Segarkan
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-xl px-4 text-sm" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            Info aplikasi
          </CardTitle>
          <CardDescription>Data ini membantu memastikan PWA terpasang dan cache aktif.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cache</div>
              <div className="mt-1 text-sm font-semibold">{cacheLabel}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mode install</div>
              <div className="mt-1 text-sm font-semibold">{window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser'}</div>
            </div>
          </div>
          <Button type="button" variant="destructive" className="h-12 rounded-2xl font-semibold" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Keluar dari admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
