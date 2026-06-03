import { useEffect, useState } from 'react';
import { ClipboardList, ReceiptText, Wallet } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import type { MobileAdminDashboardData } from '../mobileAdminApi';
import type { AdminSection, ReportRange } from '../types';
import { reportRangeOptions } from '../types';
import { formatCompactCurrency, formatDateTime } from '../utils';
import { MetricGlyph } from '../components/AdminIcons';

interface DashboardPageProps {
  dashboard: MobileAdminDashboardData;
  reportRange: ReportRange;
  setReportRange: (range: ReportRange) => void;
  lastSync: string;
  onNavigate: (section: AdminSection) => void;
}

const dashboardLimits = {
  trendDays: 7,
  topProducts: 4,
  stockAlerts: 4,
  categoryChart: 6,
  transactions: 5,
  receivables: 4,
  stockTrail: 4,
  rankedRows: 5,
} as const;

const panelListClass = 'grid max-h-[min(46dvh,24rem)] gap-2 overflow-auto p-4 overscroll-contain pt-1';
const compactPanelListClass = 'grid max-h-[min(42dvh,21rem)] gap-2 overflow-auto p-3 overscroll-contain pt-1';

function limitRows<T>(rows: T[], limit: number): T[] {
  return rows.length > limit ? rows.slice(0, limit) : rows;
}

export function DashboardPage({ dashboard, reportRange, setReportRange, lastSync, onNavigate }: DashboardPageProps) {
  const [isCompactChart, setIsCompactChart] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    const update = () => setIsCompactChart(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const summaryCards = [
    {
      label: 'Omzet',
      value: formatCompactCurrency(dashboard.report.summary.omzet),
      note: 'arus penjualan aktif',
      gradient: 'linear-gradient(135deg, #ff6a3d 0%, #ff8a5b 45%, #facc15 100%)',
      icon: 'revenue' as const,
    },
    {
      label: 'Transaksi',
      value: String(dashboard.report.summary.transactionCount),
      note: 'transaksi tercatat',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #2563eb 55%, #38bdf8 100%)',
      icon: 'transactions' as const,
    },
    {
      label: 'Piutang',
      value: formatCompactCurrency(dashboard.report.summary.receivableRemaining),
      note: 'tagihan tersisa',
      gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #a7f3d0 100%)',
      icon: 'receivables' as const,
    },
    {
      label: 'Alert',
      value: String(dashboard.report.summary.lowStockCount),
      note: 'stok di bawah batas',
      gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 45%, #ef4444 100%)',
      icon: 'alert' as const,
    },
  ];

  const trend = dashboard.report.transactionTrend.slice(-dashboardLimits.trendDays);
  const topProducts = limitRows(dashboard.report.dataset.topProducts, dashboardLimits.topProducts);
  const stockAlerts = limitRows(dashboard.report.dataset.stockAuditRows.filter((row) => row.low > 0), dashboardLimits.stockAlerts);
  const categoryDistribution = dashboard.report.categoryDistribution
    .slice()
    .sort((left, right) => right.value - left.value);
  const transactionRows = limitRows(dashboard.report.dataset.transactionLog, dashboardLimits.transactions);
  const receivableRows = limitRows(dashboard.receivables, dashboardLimits.receivables);
  const stockTrailRows = limitRows(dashboard.report.dataset.stockTrailRows, dashboardLimits.stockTrail);
  const topCustomers = limitRows(dashboard.report.dataset.customerByName, dashboardLimits.rankedRows);
  const topAddresses = limitRows(dashboard.report.dataset.customerByAddress, dashboardLimits.rankedRows);
  const hasTrend = trend.length > 0;
  const hasCategories = categoryDistribution.length > 0;
  const categoryChartLimit = dashboardLimits.categoryChart;
  const categoryValueSum = categoryDistribution.reduce((total, row) => total + row.value, 0);
  const categoryTotalValue = categoryValueSum * 1_000_000;
  const topCategory = categoryDistribution[0];
  const topCategoryShare = categoryValueSum > 0 && topCategory ? Math.round((topCategory.value / categoryValueSum) * 100) : 0;
  const categoryOverflowCount = Math.max(0, categoryDistribution.length - (categoryChartLimit - 1));
  const categoryOverflowValue = categoryDistribution
    .slice(categoryChartLimit - 1)
    .reduce((total, row) => total + row.value, 0);
  const categoryChartRows = categoryOverflowCount > 0
    ? [
        ...categoryDistribution.slice(0, categoryChartLimit - 1),
        { category: 'Lainnya', value: categoryOverflowValue },
      ]
    : categoryDistribution;
  const categoryOverflow = categoryOverflowCount > 0;
  const trendChartConfig = { omzet: { label: 'Omzet', color: '#ff6b57' } };
  const categoryBarFill = 'var(--admin-accent-solid)';
  const categoryChartConfig = { value: { label: 'Nilai', color: categoryBarFill } };
  const categoryAxisWidth = isCompactChart ? 68 : 176;
  const categoryRightMargin = isCompactChart ? 74 : 90;
  const renderCategoryAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const label = String(payload?.value ?? '');
    if (typeof x !== 'number' || typeof y !== 'number' || !label) {
      return null;
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <title>{label}</title>
        <text
          x={isCompactChart ? -6 : -10}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#f8fafc"
          fontSize={11}
          fontWeight={700}
          style={{
            paintOrder: 'stroke',
            stroke: 'rgba(15, 23, 42, 0.92)',
            strokeWidth: 2.25,
            strokeLinejoin: 'round',
          }}
        >
          {isCompactChart && label.length > 9 ? `${label.slice(0, 9)}...` : label}
        </text>
      </g>
    );
  };
  const renderCategoryValueLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || value == null) {
      return null;
    }

    const text = formatCategoryMoney(Number(value));
    const boxWidth = Math.max(64, text.length * 6.2 + 16);
    const boxHeight = 20;
    const boxY = y - boxHeight / 2 + 8;
    const boxX = width + (isCompactChart ? 6 : 10);

    return (
      <g transform={`translate(${x + boxX}, ${boxY})`}>
        <rect
          x={0}
          y={0}
          width={boxWidth}
          height={boxHeight}
          rx={8}
          ry={8}
          fill="rgba(15, 23, 42, 0.94)"
          stroke="rgba(255, 255, 255, 0.14)"
        />
        <text
          x={8}
          y={14}
          fill="#f8fafc"
          fontSize={11}
          fontWeight={700}
          letterSpacing="0.01em"
          style={{ paintOrder: 'stroke', stroke: 'rgba(15, 23, 42, 0.72)', strokeWidth: 0.5 }}
        >
          {text}
        </text>
      </g>
    );
  };
  const formatCategoryMoney = (value: number) => formatCompactCurrency(value * 1_000_000);
  const renderRankedList = (rows: Array<{ label: string; total: number; count: number }>, emptyLabel: string) => {
    if (!rows.length) {
      return <div className="text-sm text-slate-500">{emptyLabel}</div>;
    }

    return rows.map((row, index) => (
      <div key={`${row.label}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-2xl bg-white/8 text-[11px] font-semibold text-slate-100">
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-100">{row.label}</div>
              <div className="text-[11px] text-slate-500">{row.count} transaksi</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-primary">{formatCompactCurrency(row.total)}</div>
          </div>
        </div>
      </div>
    ));
  };
  const categoryChartCard = (
    <Card className="overflow-hidden border-white/10 bg-[#0f161d]/95 shadow-none lg:col-span-2">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold text-slate-100">Kategori</CardTitle>
        <CardDescription className="text-[11px] text-slate-500">
          {categoryOverflow ? 'Nilai omzet per kategori. Kategori kecil digabung ke Lainnya.' : 'Nilai omzet per kategori. Urut dari terbesar ke kecil.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 pt-1">
        {hasCategories ? (
          <ChartContainer
            config={categoryChartConfig}
            className="h-[232px] w-full aspect-auto [&_.recharts-cartesian-axis-tick_text]:fill-slate-200 [&_.recharts-cartesian-axis-tick_text]:font-medium [&_.recharts-cartesian-axis-tick_text]:text-sm"
          >
            <BarChart
              data={categoryChartRows}
              layout="vertical"
              margin={{ top: 8, right: categoryRightMargin, left: 0, bottom: 8 }}
              title="Grafik omzet per kategori barang"
            >
              <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.10)" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={{ stroke: 'rgba(148,163,184,0.18)' }}
                tickMargin={8}
                tickCount={4}
                tickFormatter={(value) => formatCategoryMoney(Number(value))}
                tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis
                dataKey="category"
                type="category"
                width={categoryAxisWidth}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={renderCategoryAxisTick}
              />
              <ChartTooltip
                cursor={false}
                content={(
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span>{String(name)}</span>
                        <span>{typeof value === 'number' ? formatCategoryMoney(value) : String(value)}</span>
                      </div>
                    )}
                  />
                )}
              />
              <Bar dataKey="value" radius={10} barSize={16}>
                <LabelList content={renderCategoryValueLabel} />
                {categoryChartRows.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={entry.category === 'Lainnya' ? 'rgba(148,163,184,0.72)' : categoryBarFill}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="grid h-[92px] place-items-center rounded-2xl border border-white/10 bg-white/[0.035] text-sm text-slate-500">
            Belum ada kategori.
          </div>
        )}
        {hasCategories ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="text-[11px] italic leading-5 text-slate-500">
              Angka di ujung bar = omzet. Sumbu X = nilai rupiah. Sumbu Y = kategori barang.
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                Total {formatCompactCurrency(categoryTotalValue)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                Teratas {topCategory?.category || '-'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                {topCategoryShare}% porsi teratas
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                {categoryDistribution.length} kategori
              </span>
              {categoryOverflow ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                  +{categoryOverflowCount} digabung
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <div data-mobile-admin-scroll-root="overview" className="grid min-w-0 gap-3 overflow-x-clip lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.96fr)]">
      <section className="grid min-w-0 gap-3 lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)]">
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {summaryCards.map((card) => (
              <Card
                key={card.label}
                className="relative isolate overflow-hidden border-white/10 shadow-[0_16px_34px_rgba(15,23,42,0.18)]"
                style={{
                  backgroundImage: card.gradient,
                  borderColor: 'rgba(255,255,255,0.14)',
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_82%_14%,rgba(255,255,255,0.12),transparent_22%)]" />
                <CardContent className="flex min-h-[76px] items-center gap-3 p-2.5 text-white sm:min-h-[82px] sm:p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-white/[0.72] sm:text-[10px]">{card.label}</div>
                    <div className="mt-1 truncate text-[18px] font-semibold leading-none tracking-tight sm:text-[20px]">{card.value}</div>
                    <div className="hidden truncate text-[10px] font-medium text-white/[0.68] sm:block">{card.note}</div>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/[0.14] ring-1 ring-white/[0.16] sm:h-10 sm:w-10">
                      <MetricGlyph id={card.icon} className="h-4 w-4 text-white" />
                    </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden border-white/10 bg-[#0f161d]/95 shadow-none">
            <CardContent className="grid gap-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Arus</div>
                  <div className="text-sm font-semibold text-slate-100">{lastSync || 'Belum sinkron'}</div>
                </div>
                <div className="grid min-w-0 grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.045] p-1">
                  {reportRangeOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant="ghost"
                      title={option.value === 'today' ? 'Hari ini' : option.value === '7d' ? '7 hari' : '30 hari'}
                      className={`h-8 rounded-xl px-2 text-[11px] font-semibold ${reportRange === option.value ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-slate-400 hover:bg-white/6 hover:text-slate-100'}`}
                      onClick={() => setReportRange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              {hasTrend ? (
                <ChartContainer
                  config={trendChartConfig}
                  className="h-[208px] w-full aspect-auto rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-2 py-3 sm:h-[188px]"
                >
                  <AreaChart data={trend} margin={{ top: 10, right: 8, left: 8, bottom: 0 }} title="Grafik tren omzet">
                    <defs>
                      <linearGradient id="mobile-admin-omzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--admin-accent-solid)" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="var(--admin-accent-solid)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
                    <ChartTooltip
                      cursor={false}
                      content={(
                        <ChartTooltipContent
                          indicator="line"
                          formatter={(value) => (
                            <div className="flex w-full items-center justify-between gap-3">
                              <span>Omzet</span>
                              <span>{typeof value === 'number' ? formatCompactCurrency(value) : String(value)}</span>
                            </div>
                          )}
                        />
                      )}
                    />
                    <Area type="monotone" dataKey="omzet" stroke="var(--admin-accent-solid)" strokeWidth={2.4} fill="url(#mobile-admin-omzet)" />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="grid h-[92px] place-items-center rounded-2xl border border-white/10 bg-white/[0.035] text-sm text-slate-500">
                  Belum ada tren.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 lg:min-h-0 xl:grid-cols-[minmax(0,1.02fr)_minmax(300px,0.98fr)]">
          <div className="grid gap-2 min-[420px]:grid-cols-2">
            <Card className="overflow-hidden border-white/10 bg-[#0f161d]/95 shadow-none">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-sm font-semibold text-slate-100">Top 5 Pelanggan</CardTitle>
              </CardHeader>
              <CardContent className={compactPanelListClass}>
                {renderRankedList(topCustomers, 'Belum ada pelanggan.')}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/10 bg-[#0f161d]/95 shadow-none">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-sm font-semibold text-slate-100">Top 5 Alamat</CardTitle>
              </CardHeader>
              <CardContent className={compactPanelListClass}>
                {renderRankedList(topAddresses, 'Belum ada alamat.')}
              </CardContent>
            </Card>

          </div>

          <div className="grid gap-3 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="overflow-hidden border-white/10 bg-[#0f161d]/95 shadow-none lg:min-h-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-100">Top</CardTitle>
              </CardHeader>
              <CardContent className={panelListClass}>
                {topProducts.length ? topProducts.map((item, index) => (
                  <div key={`${item.sku}-${item.name}`} className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-white/8 text-xs font-semibold text-slate-100">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100">{item.name}</div>
                          <div className="text-[11px] text-slate-500">{item.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary">{formatCompactCurrency(item.total)}</div>
                        <div className="text-[11px] text-slate-500">{item.qty} pcs</div>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-sm text-slate-500">Belum ada produk teratas.</div>}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/10 bg-[#0f161d]/95 shadow-none lg:min-h-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-100">Stok</CardTitle>
              </CardHeader>
              <CardContent className={panelListClass}>
                {stockAlerts.length ? stockAlerts.map((row) => (
                  <div key={row.category} className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100">{row.category}</div>
                        <div className="text-[11px] text-slate-500">{row.items} item - {row.qty}</div>
                      </div>
                      <Badge variant="warning" className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                        {row.low}
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-500">Aman.</div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </section>

      <section className="grid gap-3 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="overflow-hidden border-white/10 bg-slate-950/90 shadow-none lg:min-h-0">
              <CardHeader className="border-b border-white/10 pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm uppercase tracking-[0.18em] text-slate-400">
              <span className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-primary" />
                Transaksi terbaru
              </span>
              <button type="button" className="text-[11px] font-semibold normal-case tracking-normal text-primary" onClick={() => onNavigate('transactions')}>
                Lihat semua
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className={panelListClass}>
            {transactionRows.length ? transactionRows.map((row) => (
              <div key={row.invoice} className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{row.invoice}</div>
                    <div className="text-[11px] text-slate-500">{row.customerName || row.customer}</div>
                  </div>
                  <Badge variant={row.status === 'Lunas' ? 'success' : row.status === 'Void' ? 'danger' : 'warning'} className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                    {row.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>{row.method}</span>
                  <span>&bull;</span>
                  <span>{formatDateTime(row.time)}</span>
                  <span>&bull;</span>
                  <span>{row.itemsCount} item</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">Total</span>
                  <span className="text-sm font-semibold text-primary">{row.total}</span>
                </div>
              </div>
            )) : <div className="text-sm text-slate-500">Belum ada transaksi terbaru.</div>}
          </CardContent>
        </Card>

        <div className="grid gap-3 lg:min-h-0 xl:grid-cols-2">
          <Card className="overflow-hidden border-white/10 bg-slate-950/90 shadow-none lg:min-h-0">
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-sm uppercase tracking-[0.18em] text-slate-400">
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Piutang aktif
                </span>
                <button type="button" className="text-[11px] font-semibold normal-case tracking-normal text-primary" onClick={() => onNavigate('receivables')}>
                  Lihat semua
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className={panelListClass}>
              {receivableRows.length ? receivableRows.map((row) => (
                <div key={row.invoice} className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <div className="truncate text-sm font-semibold text-slate-100">{row.customerName || row.customer}</div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                    <span className="truncate">{row.invoice}</span>
                    <span>{row.due}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-rose-300">{row.remaining}</div>
                </div>
              )) : <div className="text-sm text-slate-500">Tidak ada piutang aktif.</div>}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/10 bg-slate-950/90 shadow-none lg:min-h-0">
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-slate-400">
                <ClipboardList className="h-4 w-4 text-primary" />
                Trail stok
              </CardTitle>
            </CardHeader>
            <CardContent className={panelListClass}>
              {stockTrailRows.length ? stockTrailRows.map((row) => (
                <div key={`${row.time}-${row.item}`} className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-100">{row.item}</div>
                      <div className="text-[11px] text-slate-500">{row.event} &bull; {formatDateTime(row.time)}</div>
                    </div>
                    <div className={`text-sm font-semibold ${Number(row.movement) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {row.movement}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{row.note}</div>
                </div>
              )) : <div className="text-sm text-slate-500">Belum ada pergerakan stok.</div>}
            </CardContent>
          </Card>
        </div>
      </section>

      {categoryChartCard}
    </div>
  );
}
