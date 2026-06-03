import { Boxes, Eye, EyeOff, Filter, Package, PencilLine, Printer, RefreshCw, Search, Trash2, Truck } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { ContextIcon } from './ContextIcon';

type CatalogStockViewProps = { view: Record<string, any> };
type AnyItem = any;
type AnyTrail = any;

export function CatalogView({ view }: CatalogStockViewProps) {
  const { renderCategoryManagerModal, renderExportCatalogModal, renderImportBarangModal, renderBatchBarcodeModal, renderCatalogEditorButton, renderCatalogEditorModal, renderCatalogDeleteModal, renderCatalogPrintModal, catalogSearch, setCatalogSearch, setCatalogPage, catalogCategoryFilterOpen, setCatalogCategoryFilterOpen, catalogCategoryFilter, catalogCategories, setCatalogCategoryFilter, renderCatalogSortHeader, paginatedCatalogRows, toggleCatalogTrail, getCategoryBadgeClass, openEditCatalogDialog, openPrintCatalogDialog, openDeleteCatalogDialog, expandedCatalogSku, showSalesCatalogTrail, setShowSalesCatalogTrail, getCatalogTrailRowsForItem, describeCatalogTrail, catalogPageStart, catalogPageEnd, catalogRows, catalogPage, catalogPageCount } = view;

  return (
          <div className="grid gap-4">
            <div className="flex flex-wrap justify-end gap-2">
              {renderCategoryManagerModal()}
              {renderExportCatalogModal()}
              {renderImportBarangModal()}
              {renderBatchBarcodeModal()}
              {renderCatalogEditorButton()}
            </div>
            {renderCatalogEditorModal()}
            {renderCatalogDeleteModal()}
            {renderCatalogPrintModal()}
            <Card className="min-h-0">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                    <Package className="h-4 w-4" />
                    Katalog material
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex min-w-[240px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        value={catalogSearch}
                        onChange={(event) => {
                          setCatalogSearch(event.target.value);
                          setCatalogPage(1);
                        }}
                        placeholder="Search barang..."
                        className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <Popover open={catalogCategoryFilterOpen} onOpenChange={setCatalogCategoryFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs">
                          <Filter className="h-3.5 w-3.5" />
                          {catalogCategoryFilter}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-72">
                        <div className="grid gap-1.5">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Filter kategori</div>
                          <div className="grid gap-1">
                            {catalogCategories.map((category: string) => (
                              <Button
                                key={category}
                                type="button"
                                variant={catalogCategoryFilter === category ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 justify-start rounded-lg px-3 text-xs"
                                onClick={() => {
                                  setCatalogCategoryFilter(category);
                                  setCatalogCategoryFilterOpen(false);
                                }}
                              >
                                {category}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <div className="min-w-[1020px] grid gap-2">
                    <div className="grid grid-cols-[minmax(0,0.92fr)_132px_84px_88px_118px_minmax(220px,1fr)] gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <div>{renderCatalogSortHeader('Barang', 'name')}</div>
                      <div>{renderCatalogSortHeader('Kategori', 'category')}</div>
                      <div>{renderCatalogSortHeader('Qty', 'qty')}</div>
                      <div>{renderCatalogSortHeader('Satuan', 'unit')}</div>
                      <div>{renderCatalogSortHeader('Harga', 'price')}</div>
                      <div className="justify-self-end pr-1">Aksi</div>
                    </div>
                    {paginatedCatalogRows.map((item: AnyItem) => (
                      <div key={item.sku} className="grid gap-2">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleCatalogTrail(item)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              toggleCatalogTrail(item);
                            }
                          }}
                          className="grid cursor-pointer grid-cols-[minmax(0,0.92fr)_132px_84px_88px_118px_minmax(220px,1fr)] gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <ContextIcon label={item.name} className="h-7 w-7" />
                            <div className="min-w-0">
                              <div className="truncate font-medium">{item.name}</div>
                            </div>
                          </div>
                          <div>
                            <Badge
                              variant="outline"
                              className={`rounded-lg px-3.5 py-1 text-xs font-semibold ${getCategoryBadgeClass(item.category)}`}
                            >
                              {item.category}
                            </Badge>
                          </div>
                          <div>
                            <div className="font-medium">{item.qty}</div>
                          </div>
                          <div>
                            <div className="font-medium">{item.unit}</div>
                          </div>
                          <div>
                            <div className="font-medium">{item.price}</div>
                          </div>
                          <div className="flex justify-end">
                            <div className="grid min-w-[220px] gap-2 rounded-xl border border-border bg-background/40 p-2">
                              <div className="grid grid-cols-3 gap-1.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg px-2 text-xs whitespace-nowrap"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEditCatalogDialog(item);
                                  }}
                                >
                                  <PencilLine className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg px-2 text-xs whitespace-nowrap"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openPrintCatalogDialog(item);
                                  }}
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  Cetak barcode
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg px-2 text-xs whitespace-nowrap"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openDeleteCatalogDialog(item);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Hapus
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {expandedCatalogSku === item.sku ? (
                            <div className="grid gap-2 rounded-xl border border-border bg-background/50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <span>Stok trail</span>
                                <span>{item.sku}</span>
                              </div>
                              <Button
                                type="button"
                                variant={showSalesCatalogTrail ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 rounded-lg px-3 text-[11px]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setShowSalesCatalogTrail((current: boolean) => !current);
                                }}
                              >
                                {showSalesCatalogTrail ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                Penjualan {showSalesCatalogTrail ? 'ON' : 'OFF'}
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Default hanya trail manual. Aktifkan penjualan bila ingin melihat mutasi dari transaksi.
                            </div>
                            <div className="grid gap-2">
                              {getCatalogTrailRowsForItem(item).length ? (
                                getCatalogTrailRowsForItem(item).map((trail: AnyTrail) => (
                                  <div
                                    key={`${item.sku}-${trail.time}-${trail.event}`}
                                    className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                                  >
                                    <div className="grid gap-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                                          {trail.event}
                                        </Badge>
                                        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{trail.time}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">{describeCatalogTrail(trail)}</div>
                                    </div>
                                    <div className="text-sm font-semibold">{trail.movement}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                                  Belum ada trail manual.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Menampilkan {catalogPageStart}-{catalogPageEnd} dari {catalogRows.length} barang
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={() => setCatalogPage((current: number) => Math.max(1, current - 1))}
                      disabled={catalogPage <= 1}
                    >
                      Sebelumnya
                    </Button>
                    <div className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium">
                      Hal {catalogPage} / {catalogPageCount}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={() => setCatalogPage((current: number) => Math.min(catalogPageCount, current + 1))}
                      disabled={catalogPage >= catalogPageCount}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
  );
}

export function LowStockView({ view }: CatalogStockViewProps) {
  const { stockActionMessage, lowStockItems, lowStockSearch, setLowStockSearch, lowStockCategoryFilterOpen, setLowStockCategoryFilterOpen, lowStockCategoryFilter, lowStockCategoryOptions, setLowStockCategoryFilter, getCategoryBadgeClass, getLowStockStatus, getLowStockSuggestion, restockSavingSku, openRestockDialog, renderStockThresholdModal, renderLowStockExportModal, renderLowStockUpdateModal } = view;

  return (
          <div className="grid gap-4">
            {stockActionMessage ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  stockActionMessage.tone === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                    : stockActionMessage.tone === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-100'
                }`}
              >
                {stockActionMessage.text}
              </div>
            ) : null}
            <Card>
              <CardHeader className="border-b border-border pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                    <Boxes className="h-4 w-4" />
                    Item kritis
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-md px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]">
                      {lowStockItems.length} item
                    </Badge>
                    <div className="flex min-w-[240px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        value={lowStockSearch}
                        onChange={(event) => setLowStockSearch(event.target.value)}
                        placeholder="Search stok rendah..."
                        className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <Popover open={lowStockCategoryFilterOpen} onOpenChange={setLowStockCategoryFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs">
                          <Filter className="h-3.5 w-3.5" />
                          {lowStockCategoryFilter}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-72">
                        <div className="grid gap-1.5">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Filter kategori</div>
                          <div className="grid gap-1">
                            {lowStockCategoryOptions.map((category: string) => (
                              <Button
                                key={category}
                                type="button"
                                variant={lowStockCategoryFilter === category ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 justify-start rounded-lg px-3 text-xs"
                                onClick={() => {
                                  setLowStockCategoryFilter(category);
                                  setLowStockCategoryFilterOpen(false);
                                }}
                              >
                                {category}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <div className="grid min-w-[980px] gap-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_132px_86px_88px_118px_118px_minmax(190px,0.8fr)] gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <div>Barang</div>
                      <div>Kategori</div>
                      <div>Qty</div>
                      <div>Satuan</div>
                      <div>Harga</div>
                      <div>Status</div>
                      <div className="justify-self-end pr-1">Aksi</div>
                    </div>

                    {lowStockItems.length ? (
                      lowStockItems.map((item: AnyItem) => {
                        const status = getLowStockStatus(item);
                        const badgeVariant = status === 'Critical' ? 'danger' : 'warning';

                        return (
                          <div key={item.sku} className="grid gap-2">
                            <div className="grid grid-cols-[minmax(0,1fr)_132px_86px_88px_118px_118px_minmax(190px,0.8fr)] gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
                              <div className="flex min-w-0 items-center gap-2">
                                <ContextIcon label={`${item.name} stok rendah`} className="h-7 w-7" />
                                <div className="truncate font-medium">{item.name}</div>
                              </div>
                              <div>
                                <Badge
                                  variant="outline"
                                  className={`rounded-lg px-3.5 py-1 text-xs font-semibold ${getCategoryBadgeClass(item.category)}`}
                                >
                                  {item.category}
                                </Badge>
                              </div>
                              <div className="font-medium">{item.qty}</div>
                              <div className="font-medium">{item.unit}</div>
                              <div className="font-medium">{item.price}</div>
                              <div>
                                <Badge
                                  variant={badgeVariant}
                                  className={`rounded-md px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                                    status === 'Low'
                                      ? 'border border-red-400/40 bg-red-500/15 text-red-100 shadow-[0_0_12px_rgba(248,113,113,0.55)]'
                                      : 'border border-red-500/30 bg-red-500/20 text-red-50 shadow-[0_0_14px_rgba(239,68,68,0.35)]'
                                  }`}
                                >
                                  {status}
                                </Badge>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-full rounded-lg px-3 text-xs"
                                  disabled={Boolean(restockSavingSku)}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openRestockDialog(item);
                                  }}
                                >
                                  {restockSavingSku === item.sku ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                                  {restockSavingSku === item.sku ? 'Menyimpan...' : 'Restok'}
                                </Button>
                              </div>
                            </div>

                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                        Tidak ada barang di bawah threshold aktif.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
  );
}
