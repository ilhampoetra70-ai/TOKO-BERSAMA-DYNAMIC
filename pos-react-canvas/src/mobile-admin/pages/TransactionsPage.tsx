import { useDeferredValue, useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Copy, SlidersHorizontal } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Calendar } from '../../components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Separator } from '../../components/ui/separator';
import type { DateRange } from 'react-day-picker';
import type { SaleLineItem } from '../../contracts/pos';
import type { MobileAdminDashboardData } from '../mobileAdminApi';
import type { ReportRange } from '../types';
import { formatCompactCurrency, formatDateGroup, formatDateTime, formatLocalDate, normalizeSearch, resolveReportRange } from '../utils';
import { EmptyState, SearchBar } from '../components/MobileAdminPrimitives';

interface TransactionsPageProps {
  dashboard: MobileAdminDashboardData;
  rangeBounds: { from: string; to: string };
  setRangeBounds: (range: { from: string; to: string }) => void;
}

const transactionListLimit = 120;
const transactionGroupClass = 'grid max-h-[calc(100dvh-18rem)] gap-2 overflow-auto overscroll-contain pr-0.5 lg:max-h-none lg:overflow-visible lg:pr-0';

function limitRows<T>(rows: T[], limit: number) {
  return rows.length > limit ? rows.slice(0, limit) : rows;
}

export function TransactionsPage({ dashboard, rangeBounds, setRangeBounds }: TransactionsPageProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState('Semua');
  const [method, setMethod] = useState('Semua metode');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [sortMode, setSortMode] = useState<'latest' | 'oldest' | 'totalHigh' | 'totalLow'>('latest');
  const [expandedInvoice, setExpandedInvoice] = useState('');
  const rows = dashboard.report.dataset.transactionLog;
  const rangeOptions: Array<{ value: ReportRange; label: string }> = [
    { value: 'today', label: 'Hari ini' },
    { value: '7d', label: '7 hari' },
    { value: '30d', label: '30 hari' },
  ];
  const activePreset = rangeOptions.find((option) => {
    const preset = resolveReportRange(option.value);
    return preset.from === rangeBounds.from && preset.to === rangeBounds.to;
  });
  const activeRangeLabel = activePreset?.label || `${rangeBounds.from} - ${rangeBounds.to}`;
  const pendingCustomRangeLabel = customRange?.from || customRange?.to
    ? `${customRange.from ? formatLocalDate(customRange.from) : '...'} - ${customRange.to ? formatLocalDate(customRange.to) : '...'}`
    : '';
  const statuses = useMemo(() => ['Semua', ...Array.from(new Set(rows.map((row) => row.status))).filter(Boolean)], [rows]);
  const methods = useMemo(() => ['Semua metode', ...Array.from(new Set(rows.map((row) => row.method))).filter(Boolean)], [rows]);
  const activeStatusLabel = status;
  const activeMethodLabel = method;
  const filteredRows = useMemo(() => {
    const needle = normalizeSearch(deferredQuery);
    const { from, to } = rangeBounds;
    const sorted = rows.filter((row) => {
      const rowDate = formatLocalDate(new Date(row.time));
      const matchesRange = rowDate >= from && rowDate <= to;
      const matchesQuery = !needle || normalizeSearch(`${row.invoice} ${row.customerName} ${row.customer} ${row.method} ${row.status}`).includes(needle);
      const matchesStatus = status === 'Semua' || row.status === status;
      const matchesMethod = method === 'Semua metode' || row.method === method;
      return matchesRange && matchesQuery && matchesStatus && matchesMethod;
    });

    return sorted.sort((left, right) => {
      if (sortMode === 'oldest') return new Date(left.time).getTime() - new Date(right.time).getTime();
      if (sortMode === 'totalHigh') return Number(String(right.total).replace(/[^\d.-]/g, '')) - Number(String(left.total).replace(/[^\d.-]/g, ''));
      if (sortMode === 'totalLow') return Number(String(String(left.total).replace(/[^\d.-]/g, ''))) - Number(String(String(right.total).replace(/[^\d.-]/g, '')));
      return new Date(right.time).getTime() - new Date(left.time).getTime();
    });
  }, [deferredQuery, method, rangeBounds, rows, sortMode, status]);
  const visibleRows = useMemo(() => limitRows(filteredRows, transactionListLimit), [filteredRows]);
  const groupedRows = useMemo(() => {
    return visibleRows.reduce<Array<{ label: string; items: typeof visibleRows }>>((groups, row) => {
      const label = formatDateGroup(row.time);
      const existing = groups.find((group) => group.label === label);
      if (existing) existing.items.push(row);
      else groups.push({ label, items: [row] });
      return groups;
    }, []);
  }, [visibleRows]);

  const normalizeTransactionItem = (item: SaleLineItem & Partial<{
    name_snapshot: string;
    unit_snapshot: string;
    unit_price: number;
    subtotal_amount: number;
  }>) => {
    const price = item.price > 0
      ? item.price
      : typeof item.unit_price === 'number' && item.unit_price > 0
        ? item.unit_price
        : item.qty > 0 && typeof item.subtotal_amount === 'number' && item.subtotal_amount > 0
          ? Math.round(item.subtotal_amount / item.qty)
          : 0;

    return {
      name: item.name?.trim() || item.name_snapshot?.trim() || item.sku,
      unit: item.unit?.trim() || item.unit_snapshot?.trim() || '',
      qty: item.qty,
      price,
      subtotal: item.subtotal > 0 ? item.subtotal : typeof item.subtotal_amount === 'number' && item.subtotal_amount > 0 ? item.subtotal_amount : price * item.qty,
    };
  };

  const renderTransactionItem = (item: SaleLineItem & Partial<{
    name_snapshot: string;
    unit_snapshot: string;
    unit_price: number;
    subtotal_amount: number;
  }>, invoice: string) => {
    const normalized = normalizeTransactionItem(item);

    return (
      <div key={`${invoice}-${item.sku}`} className="grid gap-1.5 rounded-xl border border-white/10 bg-background/55 px-2.5 py-2 text-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{normalized.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {normalized.qty} x {formatCompactCurrency(normalized.price)}
              {normalized.unit ? ` / ${normalized.unit}` : ''}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold text-amber-300">{formatCompactCurrency(normalized.subtotal)}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Subtotal</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-mobile-admin-scroll-root="transactions" className="grid gap-3 lg:max-h-[calc(100dvh-14.25rem)] lg:overflow-auto lg:pr-1">
      <Card className="sticky top-0 z-20 overflow-hidden border-white/10 bg-[#08121c]/95 shadow-[0_16px_42px_rgba(0,0,0,0.26)] backdrop-blur-xl">
        <CardHeader className="border-b border-white/10 px-2.5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid gap-0.5">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Transaksi
              </CardTitle>
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {visibleRows.length}{filteredRows.length > visibleRows.length ? `/${filteredRows.length}` : ''} invoice tampil
              </div>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {activeRangeLabel}{query !== deferredQuery ? ' - memfilter...' : ''}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-2 p-2.5">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Cari invoice, customer, metode..."
            className="!h-10 rounded-xl px-2.5"
            inputClassName="text-xs"
            clearButtonClassName="h-7 w-7"
          />

          <div className="grid grid-cols-2 gap-2">
            <Popover open={sortOpen} onOpenChange={setSortOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-9 justify-between rounded-xl border-white/10 bg-white/[0.035] px-2.5 text-[11px] font-semibold text-foreground">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate">Sort</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,16rem)] rounded-2xl p-2.5">
                <div className="grid gap-1.5">
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sort transaksi</div>
                  {[
                    { value: 'latest', label: 'Terbaru' },
                    { value: 'oldest', label: 'Terlama' },
                    { value: 'totalHigh', label: 'Total tinggi' },
                    { value: 'totalLow', label: 'Total rendah' },
                  ].map((option) => {
                    const selected = sortMode === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        className="h-9 justify-between rounded-xl px-3 text-xs font-semibold"
                        onClick={() => {
                          setSortMode(option.value as typeof sortMode);
                          setSortOpen(false);
                        }}
                      >
                        <span className="truncate">{option.label}</span>
                        {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="outline" className="h-9 justify-between rounded-xl border-white/10 bg-white/[0.035] px-2.5 text-[11px] font-semibold text-foreground" onClick={() => setRangeDialogOpen(true)}>
              <span className="flex min-w-0 items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{activeRangeLabel}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-9 justify-between rounded-xl border-white/10 bg-white/[0.035] px-2.5 text-[11px] font-semibold text-foreground">
                  <span className="min-w-0 truncate">{activeStatusLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(46vw,14rem)] rounded-2xl p-2.5">
                <div className="grid gap-1.5">
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</div>
                  {statuses.map((option) => {
                    const selected = status === option;
                    return (
                      <Button
                        key={option}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        className="h-9 justify-between rounded-xl px-3 text-xs font-semibold"
                        onClick={() => {
                          setStatus(option);
                          setStatusOpen(false);
                        }}
                      >
                        <span className="truncate">{option}</span>
                        {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={methodOpen} onOpenChange={setMethodOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-9 justify-between rounded-xl border-white/10 bg-white/[0.035] px-2.5 text-[11px] font-semibold text-foreground">
                  <span className="min-w-0 truncate">{activeMethodLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(46vw,14rem)] rounded-2xl p-2.5">
                <div className="grid gap-1.5">
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Metode</div>
                  {methods.map((option) => {
                    const selected = method === option;
                    return (
                      <Button
                        key={option}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        className="h-9 justify-between rounded-xl px-3 text-xs font-semibold"
                        onClick={() => {
                          setMethod(option);
                          setMethodOpen(false);
                        }}
                      >
                        <span className="truncate">{option}</span>
                        {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rangeDialogOpen} onOpenChange={setRangeDialogOpen}>
        <DialogContent className="max-w-[min(92vw,44rem)] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Range tanggal custom</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              {rangeOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={activePreset?.value === option.value ? 'default' : 'outline'}
                  className="h-9 rounded-xl text-xs font-semibold"
                  onClick={() => {
                    setCustomRange(undefined);
                    setRangeBounds(resolveReportRange(option.value));
                    setRangeDialogOpen(false);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={setCustomRange}
                numberOfMonths={1}
                className="w-full"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {pendingCustomRangeLabel || 'Pilih dua tanggal atau pakai preset.'}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-9 rounded-xl border-white/10 bg-white/[0.035] text-xs" onClick={() => { setCustomRange(undefined); setRangeBounds(resolveReportRange('today')); }}>
                  Reset
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-xl text-xs"
                  onClick={() => {
                    if (customRange?.from || customRange?.to) {
                      const from = customRange.from ?? customRange.to ?? new Date();
                      const to = customRange.to ?? customRange.from ?? new Date();
                      setRangeBounds({ from: formatLocalDate(from), to: formatLocalDate(to) });
                    }
                    setRangeDialogOpen(false);
                  }}
                >
                  Pakai range
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {!filteredRows.length ? (
        <EmptyState title="Transaksi tidak ditemukan" description="Coba longgarkan pencarian atau pilih filter Semua untuk melihat transaksi terbaru." />
      ) : null}

      <div className={transactionGroupClass}>
        {groupedRows.map((group) => (
          <section key={group.label} className="grid gap-2">
            <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{group.label}</div>
            {group.items.map((row) => {
              const expanded = expandedInvoice === row.invoice;
              return (
                <Card key={row.invoice} className="overflow-hidden border-border/70 bg-card/95">
                  <CardContent className="grid gap-2.5 p-3 sm:p-3.5">
                    <button type="button" className="grid gap-2 text-left" onClick={() => setExpandedInvoice(expanded ? '' : row.invoice)}>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{row.invoice}</div>
                          <div className="truncate text-xs text-muted-foreground">{row.customerName || row.customer}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={row.status === 'Lunas' ? 'success' : row.status === 'Void' ? 'danger' : 'warning'} className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                            {row.status}
                          </Badge>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${expanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Metode</div>
                          <div className="mt-1 truncate text-xs font-medium text-foreground">{row.method}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Waktu</div>
                          <div className="mt-1 truncate text-xs font-medium text-foreground">{formatDateTime(row.time)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2 sm:col-span-1 col-span-2">
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Item</div>
                          <div className="mt-1 truncate text-xs font-medium text-foreground">{row.itemsCount} item</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-base font-semibold text-amber-300">{row.total}</div>
                      </div>
                    </button>

                    {expanded ? (
                      <>
                        <Separator />
                        <div className="grid gap-2 sm:grid-cols-2">
                          {row.items?.length ? row.items.map((item) => renderTransactionItem(item, row.invoice)) : (
                            <div className="text-xs text-muted-foreground">Detail item tidak tersedia.</div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl border-white/10 bg-white/[0.035] text-xs"
                          onClick={() => void navigator.clipboard?.writeText(row.invoice)}
                        >
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Salin invoice
                        </Button>
                      </>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
