import { Activity, BarChart3, Boxes, ChevronRight, Clock3, FileText, Gauge, HandCoins, ShoppingCart, Store } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from '../../ui/chart';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart';
import type { MenuIcon, PosMenuId } from '../../../contracts/pos-ui';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

type DashboardMetric = {
  label: string;
  value: string;
  note: string;
  className: string;
  icon: MenuIcon;
};

type DashboardOperation = {
  title: string;
  value: string;
  note: string;
  tone: string;
  icon: MenuIcon;
  target: PosMenuId;
};

type DashboardViewProps = {
  rangeLabel: string;
  catalogCount: number;
  criticalLowStockCount: number;
  dashboardKpis: DashboardMetric[];
  dashboardOperations: DashboardOperation[];
  sales7Days: Array<Record<string, string | number>>;
  salesByHour: Array<Record<string, string | number>>;
  dashboardChartConfig: ChartConfig;
  onNavigate: (menu: PosMenuId) => void;
};

export function DashboardView({
  rangeLabel,
  catalogCount,
  criticalLowStockCount,
  dashboardKpis,
  dashboardOperations,
  sales7Days,
  salesByHour,
  dashboardChartConfig,
  onNavigate,
}: DashboardViewProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-2xl border border-border bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(14,165,233,0.08)_45%,rgba(16,185,129,0.10))] p-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-background/75 text-amber-300">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">TOKO BERSAMA MATERIAL</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">Dashboard operasional</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{rangeLabel}</span>
              <span>Kasir utama aktif</span>
              <span>{catalogCount} barang katalog</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Badge variant={criticalLowStockCount > 0 ? 'danger' : 'success'} className="rounded-md px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]">
            {criticalLowStockCount > 0 ? `${criticalLowStockCount} kritis` : 'Stok aman'}
          </Badge>
          <Button type="button" className="h-8 rounded-lg px-3 text-xs" onClick={() => onNavigate('Kasir')}>
            <ShoppingCart className="h-3.5 w-3.5" />
            Kasir
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className={`group relative isolate overflow-hidden rounded-2xl border-0 p-3.5 shadow-[0_18px_34px_rgba(2,6,23,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(2,6,23,0.34)] ${metric.className}`}>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent" />
              <div className="flex items-start justify-between gap-3">
                <div className="grid min-w-0 gap-1">
                  <div className="relative z-10 text-[10px] uppercase tracking-[0.16em] text-current/68">{metric.label}</div>
                  <div className="relative z-10 truncate text-xl font-semibold tracking-tight">{metric.value}</div>
                  <div className="relative z-10 truncate text-xs text-current/66">{metric.note}</div>
                </div>
                <div className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/20 text-current/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Penjualan 7 Hari
              </CardTitle>
              <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                Juta rupiah
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {sales7Days.length ? (
              <ChartContainer config={dashboardChartConfig} className="h-[260px] min-h-[260px] w-full">
                <LineChart accessibilityLayer data={sales7Days} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `${value} jt`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="grid h-[260px] place-items-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                Belum ada data penjualan.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                Jam Ramai
              </CardTitle>
              <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                Transaksi
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {salesByHour.length ? (
              <ChartContainer config={dashboardChartConfig} className="h-[260px] min-h-[260px] w-full">
                <BarChart accessibilityLayer data={salesByHour} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 2, 2]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="grid h-[260px] place-items-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                Belum ada data transaksi.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <Activity className="h-4 w-4" />
              Prioritas Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 pt-3">
            {dashboardOperations.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  type="button"
                  className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 text-left transition hover:border-amber-400/40 hover:bg-amber-500/5 md:grid-cols-[auto_minmax(0,1fr)_auto]"
                  onClick={() => onNavigate(item.target)}
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background/80 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="mt-0.5 truncate text-sm text-foreground">{item.value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
                  </div>
                  <Badge variant={item.tone === 'danger' ? 'danger' : item.tone === 'warning' ? 'warning' : 'success'} className="w-fit rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                    {item.tone === 'danger' ? 'Cek' : item.tone === 'warning' ? 'Pantau' : 'Aman'}
                  </Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <Gauge className="h-4 w-4" />
              Aksi Cepat
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 pt-3">
            {[
              { label: 'Buka kasir', icon: ShoppingCart, target: 'Kasir' as PosMenuId, variant: 'default' as const },
              { label: 'Restok barang', icon: Boxes, target: 'Stok rendah' as PosMenuId, variant: 'outline' as const },
              { label: 'Cek piutang', icon: HandCoins, target: 'Piutang' as PosMenuId, variant: 'outline' as const },
              { label: 'Lihat laporan', icon: FileText, target: 'Laporan' as PosMenuId, variant: 'outline' as const },
            ].map((action) => {
              const Icon = action.icon;

              return (
                <Button key={action.label} type="button" variant={action.variant} className="h-9 justify-between rounded-lg text-xs" onClick={() => onNavigate(action.target)}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {action.label}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
