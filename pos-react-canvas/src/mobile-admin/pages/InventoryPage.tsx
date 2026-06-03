import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowDownUp, BadgeDollarSign, Boxes, Check, ChevronDown, ClipboardList, PackageCheck, Plus, Save, SlidersHorizontal, Truck } from 'lucide-react';
import type { QueueItem } from '@/contracts/pos';
import { parseCurrencyNumber } from '@/domain/catalogService';
import { posApi } from '../../services/posApi';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import type { MobileAdminDashboardData } from '../mobileAdminApi';
import type { InventorySort } from '../types';
import { formatCompactCurrency, formatDateTime, normalizeSearch } from '../utils';
import { EmptyState, SearchBar, SegmentedControl, SummaryStrip } from '../components/MobileAdminPrimitives';

interface InventoryPageProps {
  dashboard: MobileAdminDashboardData;
  query: string;
  setQuery: (value: string) => void;
  itemSort: InventorySort;
  setItemSort: (value: InventorySort) => void;
  onRefresh: () => Promise<unknown>;
  onBusyChange: (busy: boolean) => void;
}

type InventoryTab = 'items' | 'movements';

const inventoryMovementLimit = 80;
const inventoryListClass = 'grid max-h-[calc(100dvh-18rem)] gap-3 overflow-auto overscroll-contain pr-0.5 lg:max-h-none lg:overflow-visible lg:pr-0';

function limitRows<T>(rows: T[], limit: number) {
  return rows.length > limit ? rows.slice(0, limit) : rows;
}

function getItemStatus(item: QueueItem) {
  if (item.qty <= 0) return 'Critical';
  if (item.qty <= 20) return 'Low';
  return 'Healthy';
}

function getStatusBadge(status: string) {
  if (status === 'Critical') return 'danger';
  if (status === 'Low') return 'warning';
  return 'success';
}

export function InventoryPage({ dashboard, query, setQuery, itemSort, setItemSort, onRefresh, onBusyChange }: InventoryPageProps) {
  const [tab, setTab] = useState<InventoryTab>('items');
  const deferredQuery = useDeferredValue(query);
  const [sortOpen, setSortOpen] = useState(false);
  const [activeSku, setActiveSku] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [restockNote, setRestockNote] = useState('');
  const [savingSku, setSavingSku] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmItem, setConfirmItem] = useState<QueueItem | null>(null);
  const movements = dashboard.report.dataset.stockTrailRows;
  const catalog = dashboard.catalog;
  const filteredMovements = useMemo(() => {
    const needle = normalizeSearch(deferredQuery);
    return movements.filter((row) => !needle || normalizeSearch(`${row.item} ${row.event} ${row.note} ${row.source}`).includes(needle));
  }, [deferredQuery, movements]);
  const visibleCatalog = catalog;
  const visibleMovements = useMemo(() => limitRows(filteredMovements, inventoryMovementLimit), [filteredMovements]);
  const inventoryMeta = dashboard.meta?.inventory;
  const totalItems = inventoryMeta?.total ?? catalog.length;
  const filteredItems = inventoryMeta?.filtered ?? catalog.length;
  const totalValue = catalog.reduce((sum, item) => sum + (item.qty * parseCurrencyNumber(item.price)), 0);
  const totalAlerts = dashboard.report.summary.lowStockCount || catalog.filter((item) => item.qty <= 20).length;
  const sortOptions: Array<{ value: InventorySort; label: string; icon: typeof ArrowDownUp }> = [
    { value: 'priority', label: 'Prioritas', icon: ArrowDownUp },
    { value: 'stockLow', label: 'Stok tipis', icon: Boxes },
    { value: 'priceHigh', label: 'Harga tinggi', icon: BadgeDollarSign },
    { value: 'priceLow', label: 'Harga rendah', icon: BadgeDollarSign },
    { value: 'name', label: 'A-Z', icon: ArrowDownAZ },
  ];
  const activeSortLabel = sortOptions.find((option) => option.value === itemSort)?.label || 'Prioritas';

  useEffect(() => {
    onBusyChange(Boolean(activeSku || confirmItem || savingSku));
    return () => onBusyChange(false);
  }, [activeSku, confirmItem, onBusyChange, savingSku]);

  const openItemControl = (item: QueueItem) => {
    const isCurrent = activeSku === item.sku;
    setActionError('');
    setActionMessage('');
    if (isCurrent) {
      setActiveSku('');
      return;
    }

    setActiveSku(item.sku);
    setRestockQty('');
    setRestockNote('');
  };

  const adjustRestockQty = (amount: number) => {
    setRestockQty((current) => String(Math.max(0, (Number(current) || 0) + amount)));
  };

  const openSaveConfirmation = (item: QueueItem) => {
    const addedQty = Math.trunc(Number(restockQty));

    if (!Number.isFinite(addedQty) || addedQty <= 0) {
      setActionError('Qty restok wajib lebih dari 0.');
      return;
    }

    setActionError('');
    setConfirmItem(item);
  };

  const saveItemControl = async (item: QueueItem) => {
    const addedQty = Math.trunc(Number(restockQty));

    if (!Number.isFinite(addedQty) || addedQty <= 0) {
      setActionError('Qty restok wajib lebih dari 0.');
      return;
    }

    try {
      setSavingSku(item.sku);
      setActionError('');
      setActionMessage('');

      await posApi.restockCatalogItem(item.sku, addedQty, {
        note: restockNote,
      });

      setActionMessage(`Restok ${item.name} +${addedQty} ${item.unit} tersimpan.`);
      setRestockQty('');
      setRestockNote('');
      setConfirmItem(null);
      setActiveSku('');
      await onRefresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gagal menyimpan perubahan barang.');
    } finally {
      setSavingSku('');
    }
  };

  return (
    <div data-mobile-admin-scroll-root="inventory" className="grid gap-3 lg:max-h-[calc(100dvh-14.25rem)] lg:overflow-auto lg:pr-1">
      <div className="sticky top-0 z-20 grid max-w-full gap-2 rounded-[24px] border border-white/10 bg-[#08121c]/95 p-3 shadow-[0_16px_42px_rgba(0,0,0,0.26)] backdrop-blur-xl">
        <SummaryStrip
          items={[
            { label: 'Barang', value: String(catalog.length) },
            { label: 'Kategori', value: String(new Set(catalog.map((item) => item.category)).size) },
            { label: 'Nilai', value: formatCompactCurrency(totalValue) },
            { label: 'Low', value: String(totalAlerts), tone: totalAlerts ? 'text-amber-300' : 'text-emerald-300' },
          ]}
        />
        <SearchBar value={query} onChange={setQuery} placeholder="Cari kategori, item, pergerakan..." />
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="w-full min-w-0 max-w-full overflow-hidden">
            <SegmentedControl
              value={tab}
              onChange={setTab}
              className="min-h-9 w-full rounded-xl p-0.5"
              itemClassName="px-2.5 py-1.5 text-[11px]"
              items={[
                { value: 'items', label: 'Barang' },
                { value: 'movements', label: 'Pergerakan' },
              ]}
            />
          </div>
          {tab === 'items' ? (
            <Popover open={sortOpen} onOpenChange={setSortOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-9 max-w-full justify-self-end rounded-xl px-3 text-[11px] font-semibold text-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 truncate">Sort</span>
                  <span className="hidden min-w-0 truncate sm:inline">: {activeSortLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,18rem)] rounded-2xl p-2.5">
                <div className="grid gap-1.5">
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Sort barang
                  </div>
                  {sortOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = itemSort === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={selected ? 'default' : 'outline'}
                        className="h-9 justify-between rounded-xl px-3 text-xs font-semibold"
                        onClick={() => {
                          setItemSort(option.value);
                          setSortOpen(false);
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 truncate">{option.label}</span>
                        </span>
                        {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div />
          )}
        </div>
        <div className="text-[11px] text-slate-500">
          {visibleCatalog.length}{filteredItems > visibleCatalog.length ? `/${filteredItems}` : ''} dari {totalItems} item katalog{query !== deferredQuery ? ' - mencari...' : ''}.
        </div>
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{actionError}</div>
      ) : null}
      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{actionMessage}</div>
      ) : null}

      {tab === 'items' ? (
        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
              <PackageCheck className="h-4 w-4" />
              Kontrol barang
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!catalog.length ? (
              <EmptyState title="Barang tidak ditemukan" description="Tidak ada barang katalog yang cocok dengan pencarian saat ini." />
            ) : null}
            <div className={inventoryListClass}>
              {visibleCatalog.map((item) => {
                const status = getItemStatus(item);
                const isActive = activeSku === item.sku;
                return (
                  <div key={item.sku} className={`grid min-w-0 gap-3 rounded-2xl border px-3 py-3 transition-all duration-200 ${isActive ? 'border-amber-400/35 bg-amber-500/8 shadow-[0_12px_28px_rgba(245,158,11,0.10)]' : 'border-border/70 bg-background/70'}`}>
                    {!isActive ? (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="line-clamp-2 text-[15px] font-semibold leading-tight">{item.name}</div>
                            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-tight text-muted-foreground">
                              <span>{item.category}</span>
                              <span className="font-mono">{item.sku}</span>
                            </div>
                          </div>
                          <Badge variant={getStatusBadge(status)} className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                            {status}
                          </Badge>
                        </div>

                        <div className="grid min-w-0 grid-cols-2 gap-2 text-xs">
                          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Stok</div>
                            <div className="mt-1 truncate text-base font-semibold leading-tight">{item.qty} {item.unit}</div>
                          </div>
                          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Harga</div>
                            <div className="mt-1 truncate text-sm font-semibold leading-tight">{item.price}</div>
                          </div>
                          <div className="col-span-2 grid gap-1.5 sm:col-span-1">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 rounded-xl text-xs font-semibold"
                              onClick={() => openItemControl(item)}
                            >
                              <Truck className="h-3.5 w-3.5" />
                              Stok +
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="grid min-w-0 gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Restok barang</div>
                            <div className="mt-1 line-clamp-2 text-[15px] font-semibold leading-tight">{item.name}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">{item.qty} {item.unit} sekarang</div>
                          </div>
                          <Button type="button" variant="ghost" className="h-9 shrink-0 rounded-xl px-3 text-xs font-semibold" onClick={() => openItemControl(item)}>
                            Tutup
                          </Button>
                        </div>

                        <div className="grid min-w-0 gap-2">
                          <label className="grid gap-1.5">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Qty restok</span>
                            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2">
                              <Button type="button" variant="outline" className="h-11 rounded-xl px-0" onClick={() => adjustRestockQty(-1)} aria-label="Kurangi qty restok">
                                -
                              </Button>
                              <input
                                value={restockQty}
                                inputMode="numeric"
                                onChange={(event) => setRestockQty(event.target.value.replace(/[^\d]/g, ''))}
                                placeholder="0"
                                className="h-11 min-w-0 rounded-xl border border-border bg-background px-3 text-center text-sm font-semibold outline-none placeholder:text-muted-foreground focus:border-amber-400/60"
                              />
                              <Button type="button" variant="outline" className="h-11 rounded-xl px-0" onClick={() => adjustRestockQty(1)} aria-label="Tambah qty restok">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </label>

                          <div className="grid grid-cols-4 gap-2">
                            {[5, 10, 25, 50].map((amount) => (
                              <Button key={amount} type="button" variant="outline" className="h-10 min-w-0 rounded-xl px-1 text-xs font-semibold" onClick={() => adjustRestockQty(amount)}>
                                +{amount}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <label className="grid gap-1.5">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Catatan</span>
                          <textarea
                            value={restockNote}
                            onChange={(event) => setRestockNote(event.target.value)}
                            placeholder="Catatan opsional"
                            className="min-h-16 rounded-xl border border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-amber-400/60"
                          />
                        </label>

                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2 text-xs">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Stok baru</div>
                            <div className="mt-1 truncate text-base font-semibold">{item.qty + (Number(restockQty) || 0)} {item.unit}</div>
                          </div>
                          <Button
                            type="button"
                            className="h-12 w-full rounded-xl px-4 font-semibold sm:w-auto"
                            disabled={savingSku === item.sku}
                            onClick={() => openSaveConfirmation(item)}
                          >
                            {savingSku === item.sku ? <Truck className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
                            {savingSku === item.sku ? 'Menyimpan' : 'Review'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              Trail stok terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!filteredMovements.length ? (
              <EmptyState title="Pergerakan tidak ditemukan" description="Coba kata kunci item atau event stok yang berbeda." />
            ) : null}
            <div className={inventoryListClass}>
              {visibleMovements.map((row) => (
                <div key={`${row.time}-${row.item}`} className="relative rounded-2xl border border-border/70 bg-background/70 px-3 py-2 pl-9">
                  <span className={`absolute left-3 top-4 h-3 w-3 rounded-full ${Number(row.movement) >= 0 ? 'bg-emerald-300' : 'bg-rose-300'}`} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{row.item}</div>
                      <div className="text-xs text-muted-foreground">{row.event} &bull; {formatDateTime(row.time)}</div>
                    </div>
                    <div className={`text-sm font-semibold ${Number(row.movement) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {row.movement}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{row.note}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(confirmItem)} onOpenChange={(open) => {
        if (!open && !savingSku) setConfirmItem(null);
      }}>
        <DialogContent className="w-[min(94vw,28rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Konfirmasi kontrol stok</DialogTitle>
            <DialogDescription>Perubahan akan langsung tersimpan ke katalog dan dipakai di POS.</DialogDescription>
          </DialogHeader>
          {confirmItem ? (
            <div className="grid gap-3 text-sm">
              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                <div className="font-semibold">{confirmItem.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{confirmItem.category} &bull; {confirmItem.sku}</div>
              </div>
              <div className="grid gap-2">
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <div className="text-xs text-muted-foreground">Stok</div>
                  <div className="mt-1 font-semibold">{confirmItem.qty} {'->'} {confirmItem.qty + (Number(restockQty) || 0)} {confirmItem.unit}</div>
                </div>
              </div>
              {restockNote ? (
                <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <div>Catatan: {restockNote}</div>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={Boolean(savingSku)}>
                Batal
              </Button>
            </DialogClose>
            <Button type="button" className="w-full sm:w-auto" disabled={Boolean(savingSku) || !confirmItem} onClick={() => confirmItem && void saveItemControl(confirmItem)}>
              {savingSku ? 'Menyimpan...' : 'Simpan perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
