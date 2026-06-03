import { useMemo, useState } from 'react';
import { Check, ChevronDown, Filter, MessageCircle, Phone, SlidersHorizontal } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import type { MobileAdminDashboardData } from '../mobileAdminApi';
import { buildWhatsAppUrl, normalizeSearch, parseCurrencyLabel } from '../utils';
import { EmptyState, SearchBar } from '../components/MobileAdminPrimitives';

interface ReceivablesPageProps {
  dashboard: MobileAdminDashboardData;
}

const receivableListLimit = 120;
const receivableListClass = 'grid max-h-[calc(100dvh-17rem)] gap-2 overflow-auto overscroll-contain pr-0.5 lg:max-h-none lg:overflow-visible lg:pr-0';

function limitRows<T>(rows: T[], limit: number) {
  return rows.length > limit ? rows.slice(0, limit) : rows;
}

export function ReceivablesPage({ dashboard }: ReceivablesPageProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Semua');
  const [sort, setSort] = useState<'remaining' | 'due' | 'customer'>('remaining');
  const [statusOpen, setStatusOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState('');

  const rows = dashboard.receivables;
  const statuses = useMemo(() => ['Semua', ...Array.from(new Set(rows.map((row) => row.status))).filter(Boolean)], [rows]);
  const sortLabel = sort === 'remaining' ? 'Sisa terbesar' : sort === 'due' ? 'Jatuh tempo' : 'Nama';

  const filteredRows = useMemo(() => {
    const needle = normalizeSearch(query);
    return rows
      .filter((row) => {
        const matchesQuery = !needle || normalizeSearch(`${row.invoice} ${row.customerName} ${row.customer} ${row.phone} ${row.address}`).includes(needle);
        const matchesStatus = status === 'Semua' || row.status === status;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === 'customer') return (a.customerName || a.customer).localeCompare(b.customerName || b.customer);
        if (sort === 'due') return new Date(a.due).getTime() - new Date(b.due).getTime();
        return parseCurrencyLabel(b.remaining) - parseCurrencyLabel(a.remaining);
      });
  }, [query, rows, sort, status]);
  const visibleRows = useMemo(() => limitRows(filteredRows, receivableListLimit), [filteredRows]);

  const totalRemaining = filteredRows.reduce((sum, row) => sum + parseCurrencyLabel(row.remaining), 0);
  const overdueCount = filteredRows.filter((row) => {
    const due = new Date(row.due);
    return !Number.isNaN(due.getTime()) && due.getTime() < Date.now() && row.status !== 'Lunas';
  }).length;

  return (
    <div data-mobile-admin-scroll-root="receivables" className="grid gap-2 lg:max-h-[calc(100dvh-14rem)] lg:overflow-auto lg:pr-1">
      <Card className="sticky top-0 z-20 overflow-hidden border-white/10 bg-[#08121c]/95 shadow-[0_16px_42px_rgba(0,0,0,0.26)] backdrop-blur-xl">
        <CardHeader className="border-b border-white/10 px-2.5 py-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="min-w-0">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Tagih
              </CardTitle>
              <div className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {visibleRows.length}{filteredRows.length > visibleRows.length ? `/${filteredRows.length}` : ''} customer - {overdueCount} lewat
              </div>
            </div>
            <div className="text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalRemaining)}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-1.5 p-2.5">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Cari customer, invoice, telepon..."
            className="!h-9 rounded-xl px-2.5"
            inputClassName="text-xs"
            clearButtonClassName="h-7 w-7"
          />

          <div className="grid grid-cols-2 gap-1.5">
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-8 justify-between rounded-xl border-white/10 bg-white/[0.035] px-2 text-[10px] font-semibold text-foreground">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate">{status}</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(46vw,14rem)] rounded-2xl p-2">
                <div className="grid gap-1">
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</div>
                  {statuses.map((option) => {
                    const selected = status === option;
                    return (
                      <Button
                        key={option}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        className="h-8 justify-between rounded-xl px-3 text-[11px] font-semibold"
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

            <Popover open={sortOpen} onOpenChange={setSortOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-8 justify-between rounded-xl border-white/10 bg-white/[0.035] px-2 text-[10px] font-semibold text-foreground">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate">{sortLabel}</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(46vw,14rem)] rounded-2xl p-2">
                <div className="grid gap-1">
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sort piutang</div>
                  {[
                    { value: 'remaining', label: 'Sisa terbesar' },
                    { value: 'due', label: 'Jatuh tempo' },
                    { value: 'customer', label: 'Nama' },
                  ].map((option) => {
                    const selected = sort === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        className="h-8 justify-between rounded-xl px-3 text-[11px] font-semibold"
                        onClick={() => {
                          setSort(option.value as typeof sort);
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
          </div>
        </CardContent>
      </Card>

      {!filteredRows.length ? (
        <EmptyState title="Tidak ada piutang terbuka" description="Filter saat ini tidak menemukan tagihan. Jika semua lunas, halaman ini akan tetap kosong." />
      ) : null}

      <div className={receivableListClass}>
        {visibleRows.map((row) => {
          const expanded = expandedInvoice === row.invoice;
          const due = new Date(row.due);
          const overdue = !Number.isNaN(due.getTime()) && due.getTime() < Date.now() && row.status !== 'Lunas';
          const waUrl = buildWhatsAppUrl(row.phone, `Halo ${row.customerName || row.customer}, kami mengingatkan tagihan ${row.invoice} dengan sisa ${row.remaining}. Terima kasih.`);

          return (
            <Card key={row.invoice} className={`overflow-hidden border-border/70 bg-card/95 ${overdue ? 'border-rose-400/45 shadow-[0_0_0_1px_rgba(251,113,133,0.16)]' : ''}`}>
              <CardContent className="grid gap-1.5 p-3">
                <button type="button" className="grid gap-1.5 text-left" onClick={() => setExpandedInvoice(expanded ? '' : row.invoice)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{row.customerName || row.customer}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{row.invoice} - {row.method}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant={row.status === 'Lunas' ? 'success' : row.status === 'Belum dibayar' ? 'warning' : 'secondary'} className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em]">
                        {overdue ? 'Overdue' : row.status}
                      </Badge>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="rounded-xl border border-border/70 bg-background/70 px-2.5 py-1.5">
                      <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Sisa</div>
                      <div className="mt-0.5 text-sm font-semibold text-rose-300">{row.remaining}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/70 px-2.5 py-1.5">
                      <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Jatuh tempo</div>
                      <div className="mt-0.5 text-sm font-semibold">{row.due}</div>
                    </div>
                  </div>
                </button>
                <div className="truncate text-[11px] text-muted-foreground">{row.phone || '-'} - {row.address || '-'}</div>
                {expanded ? (
                  <div className="grid gap-1.5 pt-0.5">
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-[11px] text-muted-foreground">
                      {row.projectName || row.reference || row.note || 'Tidak ada catatan tambahan.'}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button asChild variant="outline" className="h-9 rounded-xl border-white/10 bg-white/[0.035] text-[11px]">
                        <a href={row.phone ? `tel:${row.phone}` : undefined} aria-disabled={!row.phone}>
                          <Phone className="mr-2 h-3.5 w-3.5" />
                          Telepon
                        </a>
                      </Button>
                      <Button asChild variant="outline" className="h-9 rounded-xl border-white/10 bg-white/[0.035] text-[11px]">
                        <a href={waUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!waUrl}>
                          <MessageCircle className="mr-2 h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
