import * as React from 'react';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { CircleCheckBig, LogOut, SignalHigh, UserRound, Warehouse } from 'lucide-react';
import type { AppSettings, UserRow } from '@/services/posApi.types';

export function Topbar({
  user,
  store,
  onSignOut,
}: {
  user?: UserRow | null;
  store?: AppSettings['store'] | null;
  onSignOut?: () => void;
}) {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const label = `Hari ini | ${format(now, 'dd MMM yyyy')} | ${format(now, 'HH:mm')}`;
  const storeName = store?.name?.trim() || 'Toko material';
  const storeDetail = [store?.address, store?.phone].map((item) => item?.trim()).filter(Boolean).join(' / ');
  const userLabel = user ? `${user.role} / @${user.username}` : 'Belum login';
  const userSecurity = user?.security ? ` / ${user.security}` : '';

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-card/70 px-4 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 shadow-[0_16px_32px_rgba(0,0,0,0.35)]">
          {store?.logoDataUrl ? (
            <img src={store.logoDataUrl} alt={storeName} className="h-full w-full object-cover" />
          ) : (
            <Warehouse className="h-5 w-5 text-background" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{storeName}</h1>
          {storeDetail ? <div className="truncate text-xs text-muted-foreground">{storeDetail}</div> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Badge variant="success" className="gap-1.5 rounded-lg px-3 py-1">
          <CircleCheckBig className="h-3.5 w-3.5" />
          Host ready
        </Badge>
        <Separator orientation="vertical" className="hidden h-6 lg:block" />
        <Badge variant="secondary" className="rounded-lg px-3 py-1">
          Single-host
        </Badge>
        <Badge variant="warning" className="gap-1.5 rounded-lg px-3 py-1">
          <SignalHigh className="h-3.5 w-3.5" />
          LAN
        </Badge>
        <Separator orientation="vertical" className="hidden h-6 lg:block" />
        <Badge variant="secondary" className="rounded-lg px-3 py-1">
          {label}
        </Badge>
        <div className="grid min-w-[220px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-background/55 px-3 py-2 shadow-[0_14px_30px_rgba(0,0,0,0.18)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60">
            <UserRound className="h-4 w-4 text-amber-200" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{userLabel}{userSecurity}</div>
            <div className="truncate text-sm font-semibold">{user?.name ?? 'Belum login'}</div>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs font-semibold" onClick={onSignOut} disabled={!user}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
