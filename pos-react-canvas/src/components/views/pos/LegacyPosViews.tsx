// @ts-nocheck
import { format } from 'date-fns';
import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  BarChart3,
  Boxes,
  Calculator,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  Database,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderOpen,
  Gauge,
  HandCoins,
  History,
  Keyboard,
  KeyRound,
  Landmark,
  Minus,
  Package,
  Percent,
  PencilLine,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Separator } from '../../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart';
import { ContextIcon } from './ContextIcon';

type LegacyViewProps = { view: Record<string, any> };

const gradientStatToneClasses = {
  slate: 'border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50',
  emerald: 'border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-emerald-50',
  sky: 'border-sky-500/30 bg-gradient-to-br from-sky-950 via-slate-900 to-sky-900 text-sky-50',
  rose: 'border-rose-500/30 bg-gradient-to-br from-rose-950 via-slate-900 to-rose-900 text-rose-50',
  amber: 'border-amber-500/30 bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 text-amber-50',
} as const;

function GradientStatCard({
  title,
  value,
  note,
  icon: Icon,
  tone = 'slate',
  valueClassName = '',
}: {
  title: string;
  value: string;
  note?: string;
  icon: any;
  tone?: keyof typeof gradientStatToneClasses;
  valueClassName?: string;
}) {
  return (
    <div className={`group relative isolate overflow-hidden rounded-2xl border-0 p-3.5 shadow-[0_18px_34px_rgba(2,6,23,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(2,6,23,0.34)] ${gradientStatToneClasses[tone]}`}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent" />
      <div className="relative z-10 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-current/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.16em] text-current/68">{title}</div>
          <div className={`mt-1 text-lg font-semibold tracking-tight ${valueClassName}`}>{value}</div>
          {note ? <div className="text-xs text-current/66">{note}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function CashierView({ view }: LegacyViewProps) {
  const {
    LazyDatabaseView,
    LazySettingView,
    activeSessionRole,
    activeSessionUser,
    activeSettingReceiptPreview,
    activeUserCount,
    addCashierCartItem,
    adminUrl,
    applyAppSettings,
    applyAppearanceSettings,
    applyCashierCalculatorToPayment,
    applyReceiptTemplatePreset,
    applyReceivablePaymentHistory,
    applySupplierDebtItems,
    applySupplierDebtPaymentHistory,
    buildAppSettingsPayload,
    buildCashierReceiptDocumentData,
    buildCashierReceiptHtml,
    buildCashierReceiptPreview,
    buildReportPrintHtml,
    buildSettingReceiptPreviewHtml,
    buildTransactionReceiptPreview,
    canReviseSale,
    canManageRolePermissions,
    cashierCartItems,
    cashierCatalog,
    cashierCategories,
    cashierCategoryFilter,
    cashierCategoryFilterOpen,
    cashierChange,
    cashierDiscountModes,
    cashierDiscountValue,
    cashierDraftRows,
    cashierGrandTotal,
    cashierHoldRows,
    cashierPaidValue,
    cashierPaymentAmount,
    cashierPaymentMethods,
    cashierPaymentStatus,
    cashierPaymentStatuses,
    cashierRecentItems,
    cashierRemaining,
    cashierScanBufferRef,
    cashierScanCandidateRef,
    cashierScanError,
    cashierScanTimesRef,
    cashierSearch,
    cashierSubtotal,
    catalogCategories,
    catalogPageCount,
    catalogPageEnd,
    catalogPageSize,
    catalogPageStart,
    catalogRows,
    categoryBadgeClasses,
    categorySummary,
    cleanResetStorageKey,
    clearCashierScanBuffer,
    clearStoreLogo,
    compareCatalogValues,
    compareReceivableValues,
    compareTransactionValues,
    confirmDeleteCatalog,
    confirmDeleteUser,
    copyAdminUrl,
    copyPriceCheckerUrl,
    createDefaultSupplierDebtDraft,
    createEmptySupplierDebtItem,
    criticalLowStockCount,
    dashboardChartConfig,
    dashboardKpis,
    dashboardLatestTransactions,
    dashboardOperations,
    databaseBackupFallbackRows,
    databaseBackupVisibleRows,
    databaseEntityStats,
    databaseExportStamp,
    databaseHealthFallback,
    databaseHealthVisible,
    databaseMutationCount,
    databaseNextBackupLabel,
    databaseSizeEstimate,
    debtSearch,
    debtStatusFilter,
    debtSummary,
    decrementCashierCartItem,
    defaultCashierCheckoutForm,
    defaultReceiptPreviewDocument,
    defaultRolePermissions,
    defaultSettingAppearance,
    defaultSettingReceiptLayout,
    defaultSettingReceiptSections,
    deferredCashierSearch,
    deferredCatalogSearch,
    deferredDebtSearch,
    deferredLowStockSearch,
    deferredReceivableSearch,
    deferredStockHistorySearch,
    deferredTransactionSearch,
    deferredUserSearch,
    deleteReceivablePayment,
    deleteSupplierDebt,
    deleteSupplierDebtPayment,
    describeCatalogTrail,
    escapeCsvValue,
    escapeReceiptHtml,
    evaluateCashierExpression,
    expandedDebtId,
    expandedTransactionInvoice,
    exportCatalogToCsv,
    exportDatabaseSummaryWorkbook,
    exportStockHistoryToCsv,
    exportTransactionsWorkbook,
    filteredDebtRows,
    filteredReceivableRows,
    filteredTransactionRows,
    filteredUserRows,
    findCashierCatalogItem,
    formatCashierDiscountInput,
    formatReceiptAmount,
    formatRupiahInput,
    formatRupiahNumber,
    formatSignedNumber,
    getCashierDiscountValue,
    getCatalogDraftValidationError,
    getCatalogDuplicateKey,
    getCatalogSortIcon,
    getCatalogTrailRowsForItem,
    getCategoryBadgeClass,
    getExportFileName,
    getLowStockStatus,
    getLowStockSuggestion,
    getReceiptPreviewDimensions,
    getReceivableProgress,
    getReceivableSortIcon,
    getReportTabTitle,
    getRupiahNumber,
    getStockHistoryEventVariant,
    getStockHistoryMovementIcon,
    getStockHistoryMovementTone,
    getSupplierDebtDuplicateWarning,
    getSupplierDebtItemSubtotal,
    getSupplierDebtProgress,
    getTransactionSortIcon,
    handleCashierCalculatorCompute,
    handleCashierSearchKeyDown,
    handleDatabaseAction,
    handleImportFile,
    handleSettingAction,
    handleStoreLogoUpload,
    handleTotpDisable,
    handleTotpSetup,
    handleTotpVerify,
    handleUserPasswordReset,
    hasCleanResetFlag,
    isDateInBounds,
    isReceivableOverdue,
    isSupplierDebtOverdue,
    lanAdminUrl,
    lanPriceCheckerUrl,
    loadXlsxModule,
    localFinanceEnabled,
    localReportCategoryDistribution,
    localReportDataset,
    localReportDecisionRows,
    localReportPaymentDistribution,
    localReportReceivableDebtChart,
    localReportStockMovementChart,
    localReportSummary,
    localReportTransactionTrend,
    lowStockCategoryOptions,
    lowStockCount,
    lowStockItems,
    mockSettingsStorageKey,
    mockUsersStorageKey,
    mockWorkspaceStorageKey,
    navigateMenu,
    normalizeCatalogDraftPrice,
    normalizeTransactionLineItem,
    openAuditDialog,
    openCreateCatalogDialog,
    openCreateUserDialog,
    openDebtCount,
    openDeleteCatalogDialog,
    openDeleteUserDialog,
    openEditCatalogDialog,
    openEditUserDialog,
    openPrintCatalogDialog,
    openReceivableCount,
    openReceivablePaymentModal,
    openReceivableReceiptPreview,
    openReportPrintPreview,
    openSaleRevisionModal,
    openRestockDialog,
    openSupplierDebtPaymentModal,
    openSupplierDebtPrintPreview,
    paginatedCatalogRows,
    paginatedReceivableRows,
    paginatedStockHistoryRows,
    paginatedTransactionRows,
    parseDisplayDate,
    parseImportText,
    parseReceivableDueDate,
    performDatabaseBackup,
    performDatabaseDelete,
    performDatabaseHardReset,
    performDatabaseMaintenance,
    performDatabaseRestore,
    permissionModuleRows,
    persistCashierSession,
    persistRolePermissions,
    priceCheckerUrl,
    printCashierReceiptPreview,
    printReceivableReceiptPreview,
    printReportPreviewHtml,
    printSupplierDebtReceiptPreview,
    processCashierScannedCode,
    pushStockActionMessage,
    rangeLabel,
    rangedReceivableRowsData,
    rangedStockHistoryRows,
    rangedSupplierDebtRows,
    rangedTransactionRows,
    receivableExpandedInvoice,
    receivableMethodFilter,
    receivableOverdueOnly,
    receivablePage,
    receivablePageCount,
    receivablePageEnd,
    receivablePageSize,
    receivablePageStart,
    receivableRows,
    receivableSearch,
    receivableSeedRows,
    receivableStatusFilter,
    receivableSummary,
    refreshDatabaseBackups,
    refreshUserAccess,
    removeCashierCartItem,
    renderAuditDialog,
    renderBatchBarcodeModal,
    renderCashierCalculatorModal,
    renderCashierCheckoutModal,
    renderCashierReceiptPreviewModal,
    renderCashierSessionModal,
    renderCatalogDeleteModal,
    renderCatalogEditorButton,
    renderCatalogEditorModal,
    renderCatalogPrintModal,
    renderCatalogSortHeader,
    renderCategoryManagerModal,
    renderExportCatalogModal,
    renderFeatureModal,
    renderImportBarangModal,
    renderLowStockExportModal,
    renderLowStockUpdateModal,
    renderRangeSelector,
    renderReceivablePaymentModal,
    renderReceivableReceiptPreviewModal,
    renderReceivableSortHeader,
    renderReportPrintPreviewModal,
    renderRolePermissionDialog,
    renderSettingView,
    renderStockThresholdModal,
    renderSupplierDebtDialog,
    renderSupplierDebtPaymentModal,
    renderSupplierDebtReceiptPreviewModal,
    renderTotpSetupDialog,
    renderTransactionSortHeader,
    renderUserDeleteDialog,
    renderUserEditorDialog,
    replaceUserRow,
    reportCashFlow,
    reportCategoryDistribution,
    reportCategorySales,
    reportDataset,
    reportDecisionRows,
    reportPaymentDistribution,
    reportPaymentMix,
    reportReceivableDebtChart,
    reportSalesTrend,
    reportStockMovementChart,
    reportSummary,
    reportTab,
    reportTransactionTrend,
    resetCashierCart,
    resetCashierTransactionState,
    resetHardResetDialog,
    resetRangeToToday,
    resetRequiredUserCount,
    resetRolePermissionsToDefault,
    resetSettingsToDefault,
    restockTargetItem,
    restoreCashierSession,
    sales7Days,
    salesByHour,
    saveAppSettings,
    saveBinaryFile,
    saveWorkbookFile,
    selectedBatchItems,
    selectedRangeBounds,
    setCashierCartItemQty,
    setCashierCategoryFilter,
    setCashierCategoryFilterOpen,
    setCashierFormField,
    setCashierPaymentAmount,
    setCashierReceiptOpen,
    setCashierReceiptPreview,
    setCashierSearch,
    setDebtSearch,
    setDebtStatusFilter,
    setExpandedDebtId,
    setExpandedTransactionInvoice,
    setReceivableExpandedInvoice,
    setReceivableMethodFilter,
    setReceivableOverdueOnly,
    setReceivablePage,
    setReceivableSearch,
    setReceivableStatusFilter,
    setReportTab,
    setStockHistoryFilter,
    setStockHistoryFilterOpen,
    setStockHistoryPage,
    setStockHistorySearch,
    setSupplierDebtDialogOpen,
    setSupplierDebtReceiptPreview,
    setTransactionMethodFilter,
    setTransactionPage,
    setTransactionSearch,
    setTransactionStatusFilter,
    setUserRoleFilter,
    setUserSearch,
    settingAppearanceModeOptions,
    settingAppearanceScaleOptions,
    settingReceiptPreviewModels,
    settingReceiptSampleDocument,
    showOperationalPanel,
    showRangeFilter,
    sidebarItems,
    slugFilePart,
    splitImportLine,
    stockActionMessageTimer,
    stockHistoryFilter,
    stockHistoryFilterLabel,
    stockHistoryFilterOpen,
    stockHistoryFilterOptions,
    stockHistoryPage,
    stockHistoryPageCount,
    stockHistoryPageEnd,
    stockHistoryPageSize,
    stockHistoryPageStart,
    stockHistoryRows,
    stockHistorySearch,
    stockHistorySummary,
    storeLogoAcceptedTypes,
    storeLogoMaxSizeBytes,
    storeLogoMaxSizeKb,
    storeName,
    submitCashierCheckout,
    submitCatalogDraft,
    submitCategoryRename,
    submitImportCatalog,
    submitReceivablePayment,
    submitRestockItem,
    submitSupplierDebt,
    submitSupplierDebtPayment,
    submitUserDraft,
    supplierDebtSeedRows,
    syncAppSettings,
    toggleBatchSku,
    toggleCatalogSort,
    toggleCatalogTrail,
    toggleReceiptSection,
    toggleReceivableSort,
    toggleRolePermission,
    toggleTransactionSort,
    totpUserCount,
    transactionMethodFilter,
    transactionMethodOptions,
    transactionPage,
    transactionPageCount,
    transactionPageEnd,
    transactionPageSize,
    transactionPageStart,
    transactionRows,
    transactionSearch,
    transactionSeedRows,
    transactionStatusFilter,
    transactionSummary,
    updateSupplierDebtDraftItem,
    userActionMessage,
    userRoleFilter,
    userRoleOptions,
    userRowsData,
    userSearch,
    userSeedRows,
    visibleSidebarItems,
  } = view;

  return (
          <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(600px,640px)]">
            <Card className="min-h-0">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="grid gap-1">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      <ShoppingCart className="h-4 w-4" />
                      Kasir
                    </CardTitle>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {cashierCatalog.length} barang tersedia
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {renderFeatureModal({
                      title: 'Shortcut kasir',
                      trigger: 'Shortcut',
                      icon: Keyboard,
                      rows: [
                        { label: 'Cari barang', value: 'F2' },
                        { label: 'Bayar', value: 'Space' },
                        { label: 'Scan', value: 'Barcode scanner' },
                        { label: 'Tahan order', value: 'F9' },
                      ],
                      primary: 'Tutup bantuan',
                    })}
                    {renderCashierSessionModal()}
                    {renderCashierCalculatorModal()}
                  </div>
              </div>
            </CardHeader>
              <CardContent className="grid gap-4 pt-4">
                {cashierScanError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {cashierScanError}
                  </div>
                ) : null}

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={cashierSearch}
                      onChange={(e) => setCashierSearch(e.target.value)}
                      onKeyDown={handleCashierSearchKeyDown}
                      placeholder="Cari barang, barcode, atau catatan..."
                      className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
                    />
                  </div>
                  <Popover open={cashierCategoryFilterOpen} onOpenChange={setCashierCategoryFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="h-11 rounded-xl px-3 text-xs">
                        <Filter className="h-3.5 w-3.5" />
                        {cashierCategoryFilter}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72">
                      <div className="grid gap-1.5">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Filter kategori</div>
                        <div className="grid gap-1">
                          {cashierCategories.map((category) => (
                            <Button
                              key={category}
                              type="button"
                              variant={cashierCategoryFilter === category ? 'default' : 'outline'}
                              size="sm"
                              className="h-8 justify-start rounded-lg px-3 text-xs"
                              onClick={() => {
                                setCashierCategoryFilter(category);
                                setCashierCategoryFilterOpen(false);
                              }}
                            >
                              {category}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div className="flex min-w-[220px] items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      value={debtSearch}
                      onChange={(event) => setDebtSearch(event.target.value)}
                      placeholder="Search supplier / barang..."
                      className="h-5 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="grid gap-2 rounded-xl border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Clock3 className="h-3.5 w-3.5" />
                      Sering dipilih
                    </span>
                    <span>{cashierRecentItems.length} cepat</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {cashierRecentItems.length ? (
                      cashierRecentItems.map((item) => (
                        <button
                          key={item.sku}
                          type="button"
                          onClick={() => addCashierCartItem(item)}
                          className="min-w-[170px] rounded-xl border border-border bg-muted/30 px-3 py-2 text-left transition-colors hover:border-amber-400/40 hover:bg-muted/40"
                        >
                          <div className="truncate text-sm font-medium">{item.name}</div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>{item.category}</span>
                            <span className="font-semibold text-amber-300">{item.price}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                        Belum ada item cepat.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid max-h-[58vh] gap-2 overflow-y-auto pr-1">
                  {cashierCatalog.length > 0 ? (
                    cashierCatalog.map((item) => (
                      <button
                        key={item.sku}
                        type="button"
                        onClick={() => addCashierCartItem(item)}
                        className="group grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-muted/30 p-2.5 text-left transition-colors hover:border-amber-400/40 hover:bg-muted/40"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.22),transparent_40%),linear-gradient(145deg,rgba(245,158,11,0.18),rgba(125,211,252,0.12))]">
                          <Package className="h-5 w-5 text-amber-200" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={`rounded-md px-2 py-0.5 text-[10px] ${getCategoryBadgeClass(item.category)}`}>
                              {item.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Stok {item.qty} {item.unit}</span>
                          </div>
                        </div>
                        <div className="grid min-w-[118px] justify-items-end gap-1">
                          <div className="text-sm font-semibold text-amber-300">{item.price}</div>
                          <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-amber-200">
                            <Plus className="h-3 w-3" />
                            Klik / Enter
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                      <ContextIcon label="Barang tidak ditemukan pencarian" />
                      Barang tidak ditemukan.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-0">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                    <ShoppingCart className="h-4 w-4" />
                    Keranjang
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[11px]">
                      {cashierCartItems.length} item
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={resetCashierCart}
                      disabled={!cashierCartItems.length}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid min-h-0 gap-4 pt-4">
                <div className="grid max-h-[42vh] min-h-[180px] gap-2 overflow-y-auto pr-1">
                  {cashierCartItems.length ? (
                    cashierCartItems.map(({ item, qty }) => (
                      <div key={item.sku} className="grid gap-2 rounded-xl border border-border bg-muted/40 p-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2">
                            <ContextIcon label={`${item.name} barang cart`} className="h-8 w-8" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.price} / {item.unit}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm font-semibold text-amber-300">
                            {formatRupiahNumber(getRupiahNumber(item.price) * qty)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center rounded-lg border border-border bg-background/60">
                            <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2" onClick={() => decrementCashierCartItem(item.sku)}>
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={qty}
                              onChange={(event) => setCashierCartItemQty(item.sku, event.target.value)}
                              className="h-7 w-14 border-x border-border bg-transparent px-1 text-center text-xs font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2" onClick={() => addCashierCartItem(item)}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={() => removeCashierCartItem(item.sku)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                      Keranjang kosong.
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid gap-2 rounded-xl border border-border bg-background/40 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <ContextIcon label="Ringkasan pembayaran total" className="h-7 w-7" />
                    Ringkasan pembayaran
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-medium text-foreground">{formatRupiahNumber(cashierSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Diskon</span>
                    <span className="font-medium text-foreground">- {formatRupiahNumber(cashierDiscountValue)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-end justify-between">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total</span>
                    <div className="text-3xl font-semibold tracking-tight">{formatRupiahNumber(cashierGrandTotal)}</div>
                  </div>
                  <div className="grid gap-2 rounded-xl border border-dashed border-border bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <span>Nominal bayar</span>
                      <span>{cashierPaymentStatus}</span>
                    </div>
                    <input
                      type="text"
                      value={cashierPaymentAmount}
                      onChange={(event) => setCashierPaymentAmount(event.target.value)}
                      onBlur={() => setCashierPaymentAmount(formatRupiahInput(cashierPaymentAmount))}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-400/60"
                      placeholder={cashierPaymentStatus === 'Lunas' ? formatRupiahNumber(cashierGrandTotal) : 'Rp 0'}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{cashierRemaining > 0 ? 'Sisa' : 'Kembalian'}</span>
                      <span className={cashierRemaining > 0 ? 'text-rose-200' : 'text-emerald-200'}>
                        {formatRupiahNumber(cashierRemaining > 0 ? cashierRemaining : cashierChange)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {renderCashierCheckoutModal()}
                  <Button variant="outline" className="rounded-xl" type="button" disabled={!cashierCartItems.length} onClick={() => void persistCashierSession('Draft')}>
                    Simpan
                  </Button>
                  <Button variant="outline" className="rounded-xl" type="button" disabled={!cashierCartItems.length} onClick={() => void persistCashierSession('Tertahan')}>
                    Tahan
                  </Button>
                  <Button variant="outline" className="rounded-xl" type="button" disabled={!cashierCartItems.length} onClick={() => window.print()}>
                    Cetak
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

  );
}

export function StockHistoryView({ view }: LegacyViewProps) {
  const {
    LazyDatabaseView,
    LazySettingView,
    activeSessionRole,
    activeSessionUser,
    activeSettingReceiptPreview,
    activeUserCount,
    addCashierCartItem,
    adminUrl,
    applyAppSettings,
    applyAppearanceSettings,
    applyCashierCalculatorToPayment,
    applyReceiptTemplatePreset,
    applyReceivablePaymentHistory,
    applySupplierDebtItems,
    applySupplierDebtPaymentHistory,
    buildAppSettingsPayload,
    buildCashierReceiptDocumentData,
    buildCashierReceiptHtml,
    buildCashierReceiptPreview,
    buildReportPrintHtml,
    buildSettingReceiptPreviewHtml,
    buildTransactionReceiptPreview,
    canManageRolePermissions,
    cashierCartItems,
    cashierCatalog,
    cashierCategories,
    cashierCategoryFilter,
    cashierCategoryFilterOpen,
    cashierChange,
    cashierDiscountModes,
    cashierDiscountValue,
    cashierDraftRows,
    cashierGrandTotal,
    cashierHoldRows,
    cashierPaidValue,
    cashierPaymentAmount,
    cashierPaymentMethods,
    cashierPaymentStatus,
    cashierPaymentStatuses,
    cashierRecentItems,
    cashierRemaining,
    cashierScanBufferRef,
    cashierScanCandidateRef,
    cashierScanError,
    cashierScanTimesRef,
    cashierSearch,
    cashierSubtotal,
    catalogCategories,
    catalogPageCount,
    catalogPageEnd,
    catalogPageSize,
    catalogPageStart,
    catalogRows,
    categoryBadgeClasses,
    categorySummary,
    cleanResetStorageKey,
    clearCashierScanBuffer,
    clearStoreLogo,
    compareCatalogValues,
    compareReceivableValues,
    compareTransactionValues,
    confirmDeleteCatalog,
    confirmDeleteUser,
    copyAdminUrl,
    copyPriceCheckerUrl,
    createDefaultSupplierDebtDraft,
    createEmptySupplierDebtItem,
    criticalLowStockCount,
    dashboardChartConfig,
    dashboardKpis,
    dashboardLatestTransactions,
    dashboardOperations,
    databaseBackupFallbackRows,
    databaseBackupVisibleRows,
    databaseEntityStats,
    databaseExportStamp,
    databaseHealthFallback,
    databaseHealthVisible,
    databaseMutationCount,
    databaseNextBackupLabel,
    databaseSizeEstimate,
    debtSearch,
    debtStatusFilter,
    debtSummary,
    decrementCashierCartItem,
    defaultCashierCheckoutForm,
    defaultReceiptPreviewDocument,
    defaultRolePermissions,
    defaultSettingAppearance,
    defaultSettingReceiptLayout,
    defaultSettingReceiptSections,
    deferredCashierSearch,
    deferredCatalogSearch,
    deferredDebtSearch,
    deferredLowStockSearch,
    deferredReceivableSearch,
    deferredStockHistorySearch,
    deferredTransactionSearch,
    deferredUserSearch,
    deleteReceivablePayment,
    deleteSupplierDebt,
    deleteSupplierDebtPayment,
    describeCatalogTrail,
    escapeCsvValue,
    escapeReceiptHtml,
    evaluateCashierExpression,
    expandedDebtId,
    expandedTransactionInvoice,
    exportCatalogToCsv,
    exportDatabaseSummaryWorkbook,
    exportStockHistoryToCsv,
    exportTransactionsWorkbook,
    filteredDebtRows,
    filteredReceivableRows,
    filteredTransactionRows,
    filteredUserRows,
    findCashierCatalogItem,
    formatCashierDiscountInput,
    formatReceiptAmount,
    formatRupiahInput,
    formatRupiahNumber,
    formatSignedNumber,
    getCashierDiscountValue,
    getCatalogDraftValidationError,
    getCatalogDuplicateKey,
    getCatalogSortIcon,
    getCatalogTrailRowsForItem,
    getCategoryBadgeClass,
    getExportFileName,
    getLowStockStatus,
    getLowStockSuggestion,
    getReceiptPreviewDimensions,
    getReceivableProgress,
    getReceivableSortIcon,
    getReportTabTitle,
    getRupiahNumber,
    getStockHistoryEventVariant,
    getStockHistoryMovementIcon,
    getStockHistoryMovementTone,
    getSupplierDebtDuplicateWarning,
    getSupplierDebtItemSubtotal,
    getSupplierDebtProgress,
    getTransactionSortIcon,
    handleCashierCalculatorCompute,
    handleCashierSearchKeyDown,
    handleDatabaseAction,
    handleImportFile,
    handleSettingAction,
    handleStoreLogoUpload,
    handleTotpDisable,
    handleTotpSetup,
    handleTotpVerify,
    handleUserPasswordReset,
    hasCleanResetFlag,
    isDateInBounds,
    isReceivableOverdue,
    isSupplierDebtOverdue,
    lanAdminUrl,
    lanPriceCheckerUrl,
    loadXlsxModule,
    localFinanceEnabled,
    localReportCategoryDistribution,
    localReportDataset,
    localReportDecisionRows,
    localReportPaymentDistribution,
    localReportReceivableDebtChart,
    localReportStockMovementChart,
    localReportSummary,
    localReportTransactionTrend,
    lowStockCategoryOptions,
    lowStockCount,
    lowStockItems,
    mockSettingsStorageKey,
    mockUsersStorageKey,
    mockWorkspaceStorageKey,
    navigateMenu,
    normalizeCatalogDraftPrice,
    normalizeTransactionLineItem,
    openAuditDialog,
    openCreateCatalogDialog,
    openCreateUserDialog,
    openDebtCount,
    openDeleteCatalogDialog,
    openDeleteUserDialog,
    openEditCatalogDialog,
    openEditUserDialog,
    openPrintCatalogDialog,
    openReceivableCount,
    openReceivablePaymentModal,
    openReceivableReceiptPreview,
    openReportPrintPreview,
    openRestockDialog,
    openSupplierDebtPaymentModal,
    openSupplierDebtPrintPreview,
    paginatedCatalogRows,
    paginatedReceivableRows,
    paginatedStockHistoryRows,
    paginatedTransactionRows,
    parseDisplayDate,
    parseImportText,
    parseReceivableDueDate,
    performDatabaseBackup,
    performDatabaseDelete,
    performDatabaseHardReset,
    performDatabaseMaintenance,
    performDatabaseRestore,
    permissionModuleRows,
    persistCashierSession,
    persistRolePermissions,
    priceCheckerUrl,
    printCashierReceiptPreview,
    printReceivableReceiptPreview,
    printReportPreviewHtml,
    printSupplierDebtReceiptPreview,
    processCashierScannedCode,
    pushStockActionMessage,
    rangeLabel,
    rangedReceivableRowsData,
    rangedStockHistoryRows,
    rangedSupplierDebtRows,
    rangedTransactionRows,
    receivableExpandedInvoice,
    receivableMethodFilter,
    receivableOverdueOnly,
    receivablePage,
    receivablePageCount,
    receivablePageEnd,
    receivablePageSize,
    receivablePageStart,
    receivableRows,
    receivableSearch,
    receivableSeedRows,
    receivableStatusFilter,
    receivableSummary,
    refreshDatabaseBackups,
    refreshUserAccess,
    removeCashierCartItem,
    renderAuditDialog,
    renderBatchBarcodeModal,
    renderCashierCalculatorModal,
    renderCashierCheckoutModal,
    renderCashierReceiptPreviewModal,
    renderCashierSessionModal,
    renderCatalogDeleteModal,
    renderCatalogEditorButton,
    renderCatalogEditorModal,
    renderCatalogPrintModal,
    renderCatalogSortHeader,
    renderCategoryManagerModal,
    renderExportCatalogModal,
    renderFeatureModal,
    renderImportBarangModal,
    renderLowStockExportModal,
    renderLowStockUpdateModal,
    renderRangeSelector,
    renderReceivablePaymentModal,
    renderReceivableReceiptPreviewModal,
    renderReceivableSortHeader,
    renderReportPrintPreviewModal,
    renderRolePermissionDialog,
    renderSettingView,
    renderStockThresholdModal,
    renderSupplierDebtDialog,
    renderSupplierDebtPaymentModal,
    renderSupplierDebtReceiptPreviewModal,
    renderTotpSetupDialog,
    renderTransactionSortHeader,
    renderUserDeleteDialog,
    renderUserEditorDialog,
    replaceUserRow,
    reportCashFlow,
    reportCategoryDistribution,
    reportCategorySales,
    reportDataset,
    reportDecisionRows,
    reportPaymentDistribution,
    reportPaymentMix,
    reportReceivableDebtChart,
    reportSalesTrend,
    reportStockMovementChart,
    reportSummary,
    reportTab,
    reportTransactionTrend,
    resetCashierCart,
    resetCashierTransactionState,
    resetHardResetDialog,
    resetRangeToToday,
    resetRequiredUserCount,
    resetRolePermissionsToDefault,
    resetSettingsToDefault,
    restockTargetItem,
    restoreCashierSession,
    sales7Days,
    salesByHour,
    saveAppSettings,
    saveBinaryFile,
    saveWorkbookFile,
    selectedBatchItems,
    selectedRangeBounds,
    setCashierCartItemQty,
    setCashierCategoryFilter,
    setCashierCategoryFilterOpen,
    setCashierFormField,
    setCashierPaymentAmount,
    setCashierReceiptOpen,
    setCashierReceiptPreview,
    setCashierSearch,
    setDebtSearch,
    setDebtStatusFilter,
    setExpandedDebtId,
    setExpandedTransactionInvoice,
    setReceivableExpandedInvoice,
    setReceivableMethodFilter,
    setReceivableOverdueOnly,
    setReceivablePage,
    setReceivableSearch,
    setReceivableStatusFilter,
    setReportTab,
    setStockHistoryFilter,
    setStockHistoryFilterOpen,
    setStockHistoryPage,
    setStockHistorySearch,
    setSupplierDebtDialogOpen,
    setSupplierDebtReceiptPreview,
    setTransactionMethodFilter,
    setTransactionPage,
    setTransactionSearch,
    setTransactionStatusFilter,
    setUserRoleFilter,
    setUserSearch,
    settingAppearanceModeOptions,
    settingAppearanceScaleOptions,
    settingReceiptPreviewModels,
    settingReceiptSampleDocument,
    showOperationalPanel,
    showRangeFilter,
    sidebarItems,
    slugFilePart,
    splitImportLine,
    stockActionMessageTimer,
    stockHistoryFilter,
    stockHistoryFilterLabel,
    stockHistoryFilterOpen,
    stockHistoryFilterOptions,
    stockHistoryPage,
    stockHistoryPageCount,
    stockHistoryPageEnd,
    stockHistoryPageSize,
    stockHistoryPageStart,
    stockHistoryRows,
    stockHistorySearch,
    stockHistorySummary,
    storeLogoAcceptedTypes,
    storeLogoMaxSizeBytes,
    storeLogoMaxSizeKb,
    storeName,
    submitCashierCheckout,
    submitCatalogDraft,
    submitCategoryRename,
    submitImportCatalog,
    submitReceivablePayment,
    submitRestockItem,
    submitSupplierDebt,
    submitSupplierDebtPayment,
    submitUserDraft,
    supplierDebtSeedRows,
    syncAppSettings,
    toggleBatchSku,
    toggleCatalogSort,
    toggleCatalogTrail,
    toggleReceiptSection,
    toggleReceivableSort,
    toggleRolePermission,
    toggleTransactionSort,
    totpUserCount,
    transactionMethodFilter,
    transactionMethodOptions,
    transactionPage,
    transactionPageCount,
    transactionPageEnd,
    transactionPageSize,
    transactionPageStart,
    transactionRows,
    transactionSearch,
    transactionSeedRows,
    transactionStatusFilter,
    transactionSummary,
    updateSupplierDebtDraftItem,
    userActionMessage,
    userRoleFilter,
    userRoleOptions,
    userRowsData,
    userSearch,
    userSeedRows,
    visibleSidebarItems,
  } = view;

  return (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <GradientStatCard title="Total riwayat" value={`${stockHistorySummary.total}`} note="Semua entri" icon={History} tone="slate" />
              <GradientStatCard title="Restok masuk" value={`${stockHistorySummary.restokCount}`} note="Barang naik stok" icon={ArrowUp} tone="emerald" />
              <GradientStatCard title="Penjualan keluar" value={`${stockHistorySummary.salesCount}`} note="Barang turun stok" icon={ArrowDown} tone="rose" />
              <GradientStatCard
                title="Net mutasi"
                value={formatSignedNumber(stockHistorySummary.netMovement)}
                note={stockHistorySummary.netMovement >= 0 ? 'Stok bersih naik' : 'Stok bersih turun'}
                icon={ArrowUpDown}
                tone="amber"
                valueClassName={stockHistorySummary.netMovement >= 0 ? 'text-emerald-950 dark:text-emerald-50' : 'text-rose-950 dark:text-rose-50'}
              />
            </div>

            <Card>
              <CardHeader className="border-b border-border py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      <ReceiptText className="h-4 w-4" />
                      Riwayat stok
                    </CardTitle>
                    {renderRangeSelector()}
                  </div>
                  <div className="flex flex-nowrap items-center gap-2">
                    <div className="flex min-w-[180px] max-w-[230px] items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={stockHistorySearch}
                        onChange={(event) => setStockHistorySearch(event.target.value)}
                        placeholder="Search riwayat stok..."
                        className="h-5 w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      title="Reset"
                      aria-label="Reset"
                      className="h-7 w-7 rounded-lg p-0"
                      onClick={() => {
                        setStockHistoryFilter('Semua');
                        setStockHistorySearch('');
                      }}
                      disabled={stockHistoryFilter === 'Semua' && !stockHistorySearch}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Popover open={stockHistoryFilterOpen} onOpenChange={setStockHistoryFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" title="Filter jenis mutasi" aria-label="Filter jenis mutasi" variant="outline" className="h-7 w-7 rounded-lg p-0">
                          <Filter className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-72">
                        <div className="grid gap-1.5">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Filter jenis mutasi</div>
                          <div className="grid gap-1">
                            {stockHistoryFilterOptions.map((item) => (
                              <Button
                                key={item}
                                type="button"
                                variant={stockHistoryFilter === item ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 justify-start rounded-lg px-3 text-xs"
                                onClick={() => {
                                  setStockHistoryFilter(item);
                                  setStockHistoryFilterOpen(false);
                                }}
                              >
                                {item}
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
                {stockHistoryRows.length ? (
                  <div className="overflow-x-auto">
                    <div className="grid min-w-[1020px] gap-2">
                      <div className="sticky top-0 z-20 grid grid-cols-[minmax(220px,1.2fr)_96px_112px_118px_130px_120px_120px] gap-2 rounded-xl border border-dashed border-border bg-background/95 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
                        <div className="border-r border-dashed border-border/70 pr-2">Barang</div>
                        <div className="border-r border-dashed border-border/70 pr-2">Event</div>
                        <div className="border-r border-dashed border-border/70 pr-2">Mutasi</div>
                        <div className="border-r border-dashed border-border/70 pr-2">Stok</div>
                        <div className="border-r border-dashed border-border/70 pr-2">Operator</div>
                        <div className="border-r border-dashed border-border/70 pr-2">Sumber</div>
                        <div className="text-right">Jam</div>
                      </div>
                      {paginatedStockHistoryRows.map((row) => {
                        const MovementIcon = getStockHistoryMovementIcon(row.movement);
                        return (
                          <div
                            key={`${row.item}-${row.time}-${row.event}-${row.movement}`}
                            className={`grid grid-cols-[minmax(220px,1.2fr)_96px_112px_118px_130px_120px_120px] items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                              row.movement.trim().startsWith('+')
                                ? 'border-emerald-500/20 bg-emerald-500/8'
                                : row.movement.trim().startsWith('-')
                                  ? 'border-rose-500/20 bg-rose-500/8'
                                  : 'border-border bg-muted/30'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <ContextIcon label={`${row.item} ${row.event} ${row.note}`} className="h-8 w-8" />
                              <div className="min-w-0">
                                <div className="truncate font-semibold">{row.item}</div>
                                <div className="truncate text-xs text-muted-foreground">{row.note}</div>
                              </div>
                            </div>
                            <div>
                              <Badge variant={getStockHistoryEventVariant(row.event)} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                                {row.event}
                              </Badge>
                            </div>
                            <div>
                              <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${getStockHistoryMovementTone(row.movement)}`}>
                                <MovementIcon className="h-3 w-3" />
                                {row.movement}
                              </div>
                            </div>
                            <div className="text-xs font-medium">
                              {row.beforeQty ?? '-'} <span className="text-muted-foreground">-&gt;</span> {row.afterQty ?? '-'}
                            </div>
                            <div className="truncate text-xs font-medium">{row.operator ?? 'SYSTEM'}</div>
                            <div className="truncate text-xs text-muted-foreground">{row.source ?? row.event}</div>
                            <div className="text-right text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{row.time}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Menampilkan {stockHistoryPageStart}-{stockHistoryPageEnd} dari {stockHistoryRows.length} mutasi
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => setStockHistoryPage((current) => Math.max(1, current - 1))}
                          disabled={stockHistoryPage <= 1}
                        >
                          Sebelumnya
                        </Button>
                        <div className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium">
                          Hal {stockHistoryPage} / {stockHistoryPageCount}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => setStockHistoryPage((current) => Math.min(stockHistoryPageCount, current + 1))}
                          disabled={stockHistoryPage >= stockHistoryPageCount}
                        >
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                    Tidak ada mutasi yang cocok dengan filter saat ini.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

  );
}

export function TransactionsView({ view }: LegacyViewProps) {
  const {
    LazyDatabaseView,
    LazySettingView,
    activeSessionRole,
    activeSessionUser,
    activeSettingReceiptPreview,
    activeUserCount,
    addCashierCartItem,
    adminUrl,
    applyAppSettings,
    applyAppearanceSettings,
    applyCashierCalculatorToPayment,
    applyReceiptTemplatePreset,
    applyReceivablePaymentHistory,
    applySupplierDebtItems,
    applySupplierDebtPaymentHistory,
    buildAppSettingsPayload,
    buildCashierReceiptDocumentData,
    buildCashierReceiptHtml,
    buildCashierReceiptPreview,
    buildReportPrintHtml,
    buildSettingReceiptPreviewHtml,
    buildTransactionReceiptPreview,
    canReviseSale,
    canManageRolePermissions,
    cashierCartItems,
    cashierCatalog,
    cashierCategories,
    cashierCategoryFilter,
    cashierCategoryFilterOpen,
    cashierChange,
    cashierDiscountModes,
    cashierDiscountValue,
    cashierDraftRows,
    cashierGrandTotal,
    cashierHoldRows,
    cashierPaidValue,
    cashierPaymentAmount,
    cashierPaymentMethods,
    cashierPaymentStatus,
    cashierPaymentStatuses,
    cashierRecentItems,
    cashierRemaining,
    cashierScanBufferRef,
    cashierScanCandidateRef,
    cashierScanError,
    cashierScanTimesRef,
    cashierSearch,
    cashierSubtotal,
    catalogCategories,
    catalogPageCount,
    catalogPageEnd,
    catalogPageSize,
    catalogPageStart,
    catalogRows,
    categoryBadgeClasses,
    categorySummary,
    cleanResetStorageKey,
    clearCashierScanBuffer,
    clearStoreLogo,
    compareCatalogValues,
    compareReceivableValues,
    compareTransactionValues,
    confirmDeleteCatalog,
    confirmDeleteUser,
    copyAdminUrl,
    copyPriceCheckerUrl,
    createDefaultSupplierDebtDraft,
    createEmptySupplierDebtItem,
    criticalLowStockCount,
    dashboardChartConfig,
    dashboardKpis,
    dashboardLatestTransactions,
    dashboardOperations,
    databaseBackupFallbackRows,
    databaseBackupVisibleRows,
    databaseEntityStats,
    databaseExportStamp,
    databaseHealthFallback,
    databaseHealthVisible,
    databaseMutationCount,
    databaseNextBackupLabel,
    databaseSizeEstimate,
    debtSearch,
    debtStatusFilter,
    debtSummary,
    decrementCashierCartItem,
    defaultCashierCheckoutForm,
    defaultReceiptPreviewDocument,
    defaultRolePermissions,
    defaultSettingAppearance,
    defaultSettingReceiptLayout,
    defaultSettingReceiptSections,
    deferredCashierSearch,
    deferredCatalogSearch,
    deferredDebtSearch,
    deferredLowStockSearch,
    deferredReceivableSearch,
    deferredStockHistorySearch,
    deferredTransactionSearch,
    deferredUserSearch,
    deleteReceivablePayment,
    deleteSupplierDebt,
    deleteSupplierDebtPayment,
    describeCatalogTrail,
    escapeCsvValue,
    escapeReceiptHtml,
    evaluateCashierExpression,
    expandedDebtId,
    expandedTransactionInvoice,
    exportCatalogToCsv,
    exportDatabaseSummaryWorkbook,
    exportStockHistoryToCsv,
    exportTransactionsWorkbook,
    filteredDebtRows,
    filteredReceivableRows,
    filteredTransactionRows,
    filteredUserRows,
    findCashierCatalogItem,
    formatCashierDiscountInput,
    formatReceiptAmount,
    formatRupiahInput,
    formatRupiahNumber,
    formatSignedNumber,
    getCashierDiscountValue,
    getCatalogDraftValidationError,
    getCatalogDuplicateKey,
    getCatalogSortIcon,
    getCatalogTrailRowsForItem,
    getCategoryBadgeClass,
    getExportFileName,
    getLowStockStatus,
    getLowStockSuggestion,
    getReceiptPreviewDimensions,
    getReceivableProgress,
    getReceivableSortIcon,
    getReportTabTitle,
    getRupiahNumber,
    getStockHistoryEventVariant,
    getStockHistoryMovementIcon,
    getStockHistoryMovementTone,
    getSupplierDebtDuplicateWarning,
    getSupplierDebtItemSubtotal,
    getSupplierDebtProgress,
    getTransactionSortIcon,
    handleCashierCalculatorCompute,
    handleCashierSearchKeyDown,
    handleDatabaseAction,
    handleImportFile,
    handleSettingAction,
    handleStoreLogoUpload,
    handleTotpDisable,
    handleTotpSetup,
    handleTotpVerify,
    handleUserPasswordReset,
    hasCleanResetFlag,
    isDateInBounds,
    isReceivableOverdue,
    isSupplierDebtOverdue,
    lanAdminUrl,
    lanPriceCheckerUrl,
    loadXlsxModule,
    localFinanceEnabled,
    localReportCategoryDistribution,
    localReportDataset,
    localReportDecisionRows,
    localReportPaymentDistribution,
    localReportReceivableDebtChart,
    localReportStockMovementChart,
    localReportSummary,
    localReportTransactionTrend,
    lowStockCategoryOptions,
    lowStockCount,
    lowStockItems,
    mockSettingsStorageKey,
    mockUsersStorageKey,
    mockWorkspaceStorageKey,
    navigateMenu,
    normalizeCatalogDraftPrice,
    normalizeTransactionLineItem,
    openAuditDialog,
    openCreateCatalogDialog,
    openCreateUserDialog,
    openDebtCount,
    openDeleteCatalogDialog,
    openDeleteUserDialog,
    openEditCatalogDialog,
    openEditUserDialog,
    openPrintCatalogDialog,
    openReceivableCount,
    openReceivablePaymentModal,
    openReceivableReceiptPreview,
    openReportPrintPreview,
    openSaleRevisionModal,
    openRestockDialog,
    openSupplierDebtPaymentModal,
    openSupplierDebtPrintPreview,
    paginatedCatalogRows,
    paginatedReceivableRows,
    paginatedStockHistoryRows,
    paginatedTransactionRows,
    parseDisplayDate,
    parseImportText,
    parseReceivableDueDate,
    performDatabaseBackup,
    performDatabaseDelete,
    performDatabaseHardReset,
    performDatabaseMaintenance,
    performDatabaseRestore,
    permissionModuleRows,
    persistCashierSession,
    persistRolePermissions,
    priceCheckerUrl,
    printCashierReceiptPreview,
    printReceivableReceiptPreview,
    printReportPreviewHtml,
    printSupplierDebtReceiptPreview,
    processCashierScannedCode,
    pushStockActionMessage,
    rangeLabel,
    rangedReceivableRowsData,
    rangedStockHistoryRows,
    rangedSupplierDebtRows,
    rangedTransactionRows,
    receivableExpandedInvoice,
    receivableMethodFilter,
    receivableOverdueOnly,
    receivablePage,
    receivablePageCount,
    receivablePageEnd,
    receivablePageSize,
    receivablePageStart,
    receivableRows,
    receivableSearch,
    receivableSeedRows,
    receivableStatusFilter,
    receivableSummary,
    refreshDatabaseBackups,
    refreshUserAccess,
    removeCashierCartItem,
    renderAuditDialog,
    renderBatchBarcodeModal,
    renderCashierCalculatorModal,
    renderCashierCheckoutModal,
    renderCashierReceiptPreviewModal,
    renderCashierSessionModal,
    renderCatalogDeleteModal,
    renderCatalogEditorButton,
    renderCatalogEditorModal,
    renderCatalogPrintModal,
    renderCatalogSortHeader,
    renderCategoryManagerModal,
    renderExportCatalogModal,
    renderFeatureModal,
    renderImportBarangModal,
    renderLowStockExportModal,
    renderLowStockUpdateModal,
    renderRangeSelector,
    renderReceivablePaymentModal,
    renderReceivableReceiptPreviewModal,
    renderReceivableSortHeader,
    renderReportPrintPreviewModal,
    renderRolePermissionDialog,
    renderSettingView,
    renderStockThresholdModal,
    renderSupplierDebtDialog,
    renderSupplierDebtPaymentModal,
    renderSupplierDebtReceiptPreviewModal,
    renderTotpSetupDialog,
    renderTransactionSortHeader,
    renderUserDeleteDialog,
    renderUserEditorDialog,
    replaceUserRow,
    reportCashFlow,
    reportCategoryDistribution,
    reportCategorySales,
    reportDataset,
    reportDecisionRows,
    reportPaymentDistribution,
    reportPaymentMix,
    reportReceivableDebtChart,
    reportSalesTrend,
    reportStockMovementChart,
    reportSummary,
    reportTab,
    reportTransactionTrend,
    resetCashierCart,
    resetCashierTransactionState,
    resetHardResetDialog,
    resetRangeToToday,
    resetRequiredUserCount,
    resetRolePermissionsToDefault,
    resetSettingsToDefault,
    restockTargetItem,
    restoreCashierSession,
    sales7Days,
    salesByHour,
    saveAppSettings,
    saveBinaryFile,
    saveWorkbookFile,
    selectedBatchItems,
    selectedRangeBounds,
    setCashierCartItemQty,
    setCashierCategoryFilter,
    setCashierCategoryFilterOpen,
    setCashierFormField,
    setCashierPaymentAmount,
    setCashierReceiptOpen,
    setCashierReceiptPreview,
    setCashierSearch,
    setDebtSearch,
    setDebtStatusFilter,
    setExpandedDebtId,
    setExpandedTransactionInvoice,
    setReceivableExpandedInvoice,
    setReceivableMethodFilter,
    setReceivableOverdueOnly,
    setReceivablePage,
    setReceivableSearch,
    setReceivableStatusFilter,
    setReportTab,
    setStockHistoryFilter,
    setStockHistoryFilterOpen,
    setStockHistoryPage,
    setStockHistorySearch,
    setSupplierDebtDialogOpen,
    setSupplierDebtReceiptPreview,
    setTransactionMethodFilter,
    setTransactionPage,
    setTransactionSearch,
    setTransactionStatusFilter,
    setUserRoleFilter,
    setUserSearch,
    settingAppearanceModeOptions,
    settingAppearanceScaleOptions,
    settingReceiptPreviewModels,
    settingReceiptSampleDocument,
    showOperationalPanel,
    showRangeFilter,
    sidebarItems,
    slugFilePart,
    splitImportLine,
    stockActionMessageTimer,
    stockHistoryFilter,
    stockHistoryFilterLabel,
    stockHistoryFilterOpen,
    stockHistoryFilterOptions,
    stockHistoryPage,
    stockHistoryPageCount,
    stockHistoryPageEnd,
    stockHistoryPageSize,
    stockHistoryPageStart,
    stockHistoryRows,
    stockHistorySearch,
    stockHistorySummary,
    storeLogoAcceptedTypes,
    storeLogoMaxSizeBytes,
    storeLogoMaxSizeKb,
    storeName,
    submitCashierCheckout,
    submitCatalogDraft,
    submitCategoryRename,
    submitImportCatalog,
    submitReceivablePayment,
    submitRestockItem,
    submitSupplierDebt,
    submitSupplierDebtPayment,
    submitUserDraft,
    supplierDebtSeedRows,
    syncAppSettings,
    toggleBatchSku,
    toggleCatalogSort,
    toggleCatalogTrail,
    toggleReceiptSection,
    toggleReceivableSort,
    toggleRolePermission,
    toggleTransactionSort,
    totpUserCount,
    transactionMethodFilter,
    transactionMethodOptions,
    transactionPage,
    transactionPageCount,
    transactionPageEnd,
    transactionPageSize,
    transactionPageStart,
    transactionRows,
    transactionSearch,
    transactionSeedRows,
    transactionStatusFilter,
    transactionSummary,
    updateSupplierDebtDraftItem,
    userActionMessage,
    userRoleFilter,
    userRoleOptions,
    userRowsData,
    userSearch,
    userSeedRows,
    visibleSidebarItems,
  } = view;

  return (
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: 'Transaksi',
                  value: `${transactionSummary.count}`,
                  icon: ReceiptText,
                  className: 'border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50',
                },
                {
                  label: 'Omzet',
                  value: formatRupiahNumber(transactionSummary.omzet),
                  icon: CircleDollarSign,
                  className: 'border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-emerald-50',
                },
                {
                  label: 'Dibayar',
                  value: formatRupiahNumber(transactionSummary.paid),
                  icon: Banknote,
                  className: 'border-sky-500/30 bg-gradient-to-br from-sky-950 via-slate-900 to-sky-900 text-sky-50',
                },
                {
                  label: 'Sisa tagihan',
                  value: formatRupiahNumber(transactionSummary.remaining),
                  icon: HandCoins,
                  className: 'border-amber-500/30 bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 text-amber-50',
                },
                {
                  label: 'Lunas',
                  value: `${transactionSummary.lunas}`,
                  icon: CheckCircle2,
                  className: 'border-rose-500/30 bg-gradient-to-br from-rose-950 via-slate-900 to-rose-900 text-rose-50',
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className={`group relative isolate overflow-hidden flex min-w-0 items-center gap-3 rounded-2xl border-0 p-3.5 shadow-[0_18px_34px_rgba(2,6,23,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(2,6,23,0.34)] ${item.className}`}
                  >
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent" />
                    <div className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/20 text-current/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="relative z-10 min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-current/68">{item.label}</div>
                      <div className="truncate text-sm font-semibold text-current/96">{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Card>
              <CardHeader className="border-b border-border py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      <ClipboardList className="h-4 w-4" />
                      Riwayat transaksi
                    </CardTitle>
                    {renderRangeSelector()}
                  </div>
                  <div className="flex flex-nowrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" title="Filter status" aria-label="Filter status" variant="outline" className="h-7 w-7 rounded-lg p-0">
                          <Filter className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-72">
                        <div className="grid gap-1.5">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status transaksi</div>
                          <div className="grid gap-1">
                            {(['Semua', 'Lunas', 'Cicilan', 'DP', 'Void'] as const).map((item) => (
                              <Button
                                key={item}
                                type="button"
                                variant={transactionStatusFilter === item ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 justify-start rounded-lg px-3 text-xs"
                                onClick={() => setTransactionStatusFilter(item)}
                              >
                                {item}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" title="Filter metode" aria-label="Filter metode" variant="outline" className="h-7 w-7 rounded-lg p-0">
                          <CreditCard className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64">
                        <div className="grid gap-1.5">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Metode bayar</div>
                          <div className="grid gap-1">
                            {transactionMethodOptions.map((item) => (
                              <Button
                                key={item}
                                type="button"
                                variant={transactionMethodFilter === item ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 justify-start rounded-lg px-3 text-xs"
                                onClick={() => setTransactionMethodFilter(item)}
                              >
                                {item}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="flex min-w-[180px] max-w-[230px] items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.25">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={transactionSearch}
                        onChange={(event) => setTransactionSearch(event.target.value)}
                        placeholder="Search transaksi..."
                        className="h-5 w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
                </CardHeader>
              <CardContent className="overflow-x-auto pt-4">
                  <div className="grid min-w-[900px] gap-2">
                    <div className="grid grid-cols-[180px_minmax(0,0.94fr)_180px_104px_124px_110px] gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-foreground/80">
                      <div className="border-r border-dashed border-border/70 pr-2">{renderTransactionSortHeader('Invoice', 'invoice')}</div>
                      <div className="border-r border-dashed border-border/70 pr-3">{renderTransactionSortHeader('Pelanggan', 'customer')}</div>
                      <div className="border-r border-dashed border-border/70 pr-2">Item</div>
                      <div className="border-r border-dashed border-border/70 pr-2">{renderTransactionSortHeader('Jam', 'time')}</div>
                      <div className="border-r border-dashed border-border/70 pr-2">{renderTransactionSortHeader('Total', 'total')}</div>
                      <div>{renderTransactionSortHeader('Status', 'status')}</div>
                    </div>
                    {paginatedTransactionRows.map((row) => {
                      const isExpanded = expandedTransactionInvoice === row.invoice;
                      const previewCustomer = row.customerName?.trim() || row.customer;
                      const transactionItems = (row.items ?? []).map(normalizeTransactionLineItem);

                    return (
                      <div key={row.invoice} className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedTransactionInvoice((current) => (current === row.invoice ? null : row.invoice))}
                            className="grid cursor-pointer grid-cols-[180px_minmax(0,0.94fr)_180px_104px_124px_110px] items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-center gap-2 border-r border-dashed border-border/70 pr-2 font-semibold">
                              <ContextIcon label={`${row.invoice} transaksi`} className="h-7 w-7" />
                              {row.invoice}
                              {row.revised || row.revisionCount ? (
                                <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">
                                  Rev {row.revisionCount ?? 1}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="min-w-0 border-r border-dashed border-border/70 pr-3">
                              <div className="truncate font-medium">{previewCustomer}</div>
                              <div className="text-xs text-muted-foreground">
                                {row.cashier} / {row.method}
                              </div>
                            </div>
                            <div className="min-w-0 border-r border-dashed border-border/70 pr-2">
                              <div className="truncate font-medium text-foreground/90">
                                {transactionItems.length
                                  ? transactionItems
                                      .slice(0, 2)
                                      .map((item) => `${item.qty}x ${item.name}`)
                                      .join(' · ')
                                  : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {transactionItems.length > 2 ? `+${transactionItems.length - 2} item lagi` : `${transactionItems.length} item`}
                              </div>
                            </div>
                            <div className="border-r border-dashed border-border/70 pr-2 text-muted-foreground">{row.time}</div>
                            <div className="border-r border-dashed border-border/70 pr-2 font-medium">{row.total}</div>
                            <Badge variant={row.status === 'Lunas' ? 'success' : 'warning'} className="w-fit rounded-md px-2 py-0.5">
                              {row.status}
                            </Badge>
                        </button>

                        {isExpanded ? (
                          <div className="grid gap-2 rounded-xl border border-border bg-background/60 p-2">
                            <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)]">
                              <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-2.5">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  <Eye className="h-4 w-4" />
                                  Detail transaksi
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  {[
                                    ['Invoice', row.invoice],
                                    ['Pelanggan', previewCustomer],
                                    ['Kasir', row.cashier],
                                    ['Metode', row.method],
                                    ['Status', row.status],
                                    ['Jam', row.time],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg border border-border bg-background px-3 py-1.5">
                                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                                      <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {[
                                    ['Telepon', row.phone?.trim() || '-'],
                                    ['Alamat', row.address?.trim() || '-'],
                                    ['Referensi', row.reference?.trim() || '-'],
                                    ['Catatan', row.note?.trim() || '-'],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg border border-border bg-background px-3 py-1.5">
                                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                                      <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid gap-2 sm:grid-cols-4">
                                  {[
                                    ['Dibayar', row.paymentAmount?.trim() || (row.status === 'Lunas' ? row.total : 'Rp 0')],
                                    [
                                      'Sisa',
                                      formatRupiahNumber(Math.max(0, getRupiahNumber(row.total) - getRupiahNumber(row.paymentAmount?.trim() || (row.status === 'Lunas' ? row.total : 'Rp 0')))),
                                    ],
                                    ['Diskon', row.discount?.trim() || 'Rp 0'],
                                    ['Jatuh tempo', row.dueDate?.trim() || '-'],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg border border-border bg-background px-3 py-1.5">
                                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                                      <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-2.5 xl:self-start">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  <Package className="h-4 w-4" />
                                  Item dibeli
                                </div>
                                <div className="grid max-h-48 gap-1.5 overflow-y-auto pr-1">
                                  {transactionItems.length ? (
                                    transactionItems.map((item) => {
                                      const unitPrice = item.price > 0 ? item.price : item.qty > 0 && item.subtotal > 0 ? Math.round(item.subtotal / item.qty) : 0;

                                      return (
                                        <div key={`${row.invoice}-${item.sku}`} className="grid gap-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="truncate font-medium text-foreground">{item.name}</div>
                                              <div className="text-[10px] text-muted-foreground">
                                                {item.qty} x {unitPrice > 0 ? formatRupiahNumber(unitPrice) : 'harga unit belum tercatat'}
                                                {item.unit ? ` / ${item.unit}` : ''}
                                              </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                              <div className="text-sm font-semibold tabular-nums text-foreground">{formatRupiahNumber(item.subtotal)}</div>
                                              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Subtotal</div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                                      Detail item belum tersedia dari data transaksi ini.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  {transactionItems.length} item
                                </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 rounded-lg px-3 text-xs"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void openSaleRevisionModal(row);
                                  }}
                                  disabled={!canReviseSale || row.status === 'Void'}
                                >
                                  <PencilLine className="h-3.5 w-3.5" />
                                  Edit / Retur Barang
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 rounded-lg px-3 text-xs"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const preview = buildTransactionReceiptPreview(row);
                                    setCashierReceiptPreview(preview);
                                    setCashierReceiptOpen(true);
                                  }}
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  Print ulang struk
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {!filteredTransactionRows.length ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada transaksi pada filter ini.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Menampilkan {transactionPageStart}-{transactionPageEnd} dari {filteredTransactionRows.length} transaksi
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => setTransactionPage((current) => Math.max(1, current - 1))}
                          disabled={transactionPage <= 1}
                        >
                          Sebelumnya
                        </Button>
                        <div className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                          Hal {transactionPage} / {transactionPageCount}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => setTransactionPage((current) => Math.min(transactionPageCount, current + 1))}
                          disabled={transactionPage >= transactionPageCount}
                        >
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

  );
}

export function SupplierDebtView({ view }: LegacyViewProps) {
  const {
    LazyDatabaseView,
    LazySettingView,
    activeSessionRole,
    activeSessionUser,
    activeSettingReceiptPreview,
    activeUserCount,
    addCashierCartItem,
    adminUrl,
    applyAppSettings,
    applyAppearanceSettings,
    applyCashierCalculatorToPayment,
    applyReceiptTemplatePreset,
    applyReceivablePaymentHistory,
    applySupplierDebtItems,
    applySupplierDebtPaymentHistory,
    buildAppSettingsPayload,
    buildCashierReceiptDocumentData,
    buildCashierReceiptHtml,
    buildCashierReceiptPreview,
    buildReportPrintHtml,
    buildSettingReceiptPreviewHtml,
    buildTransactionReceiptPreview,
    canManageRolePermissions,
    cashierCartItems,
    cashierCatalog,
    cashierCategories,
    cashierCategoryFilter,
    cashierCategoryFilterOpen,
    cashierChange,
    cashierDiscountModes,
    cashierDiscountValue,
    cashierDraftRows,
    cashierGrandTotal,
    cashierHoldRows,
    cashierPaidValue,
    cashierPaymentAmount,
    cashierPaymentMethods,
    cashierPaymentStatus,
    cashierPaymentStatuses,
    cashierRecentItems,
    cashierRemaining,
    cashierScanBufferRef,
    cashierScanCandidateRef,
    cashierScanError,
    cashierScanTimesRef,
    cashierSearch,
    cashierSubtotal,
    catalogCategories,
    catalogPageCount,
    catalogPageEnd,
    catalogPageSize,
    catalogPageStart,
    catalogRows,
    categoryBadgeClasses,
    categorySummary,
    cleanResetStorageKey,
    clearCashierScanBuffer,
    clearStoreLogo,
    compareCatalogValues,
    compareReceivableValues,
    compareTransactionValues,
    confirmDeleteCatalog,
    confirmDeleteUser,
    copyAdminUrl,
    copyPriceCheckerUrl,
    createDefaultSupplierDebtDraft,
    createEmptySupplierDebtItem,
    criticalLowStockCount,
    dashboardChartConfig,
    dashboardKpis,
    dashboardLatestTransactions,
    dashboardOperations,
    databaseBackupFallbackRows,
    databaseBackupVisibleRows,
    databaseEntityStats,
    databaseExportStamp,
    databaseHealthFallback,
    databaseHealthVisible,
    databaseMutationCount,
    databaseNextBackupLabel,
    databaseSizeEstimate,
    debtSearch,
    debtStatusFilter,
    debtSummary,
    decrementCashierCartItem,
    defaultCashierCheckoutForm,
    defaultReceiptPreviewDocument,
    defaultRolePermissions,
    defaultSettingAppearance,
    defaultSettingReceiptLayout,
    defaultSettingReceiptSections,
    deferredCashierSearch,
    deferredCatalogSearch,
    deferredDebtSearch,
    deferredLowStockSearch,
    deferredReceivableSearch,
    deferredStockHistorySearch,
    deferredTransactionSearch,
    deferredUserSearch,
    deleteReceivablePayment,
    deleteSupplierDebt,
    deleteSupplierDebtPayment,
    describeCatalogTrail,
    escapeCsvValue,
    escapeReceiptHtml,
    evaluateCashierExpression,
    expandedDebtId,
    expandedTransactionInvoice,
    exportCatalogToCsv,
    exportDatabaseSummaryWorkbook,
    exportStockHistoryToCsv,
    exportTransactionsWorkbook,
    filteredDebtRows,
    filteredReceivableRows,
    filteredTransactionRows,
    filteredUserRows,
    findCashierCatalogItem,
    formatCashierDiscountInput,
    formatReceiptAmount,
    formatRupiahInput,
    formatRupiahNumber,
    formatSignedNumber,
    getCashierDiscountValue,
    getCatalogDraftValidationError,
    getCatalogDuplicateKey,
    getCatalogSortIcon,
    getCatalogTrailRowsForItem,
    getCategoryBadgeClass,
    getExportFileName,
    getLowStockStatus,
    getLowStockSuggestion,
    getReceiptPreviewDimensions,
    getReceivableProgress,
    getReceivableSortIcon,
    getReportTabTitle,
    getRupiahNumber,
    getStockHistoryEventVariant,
    getStockHistoryMovementIcon,
    getStockHistoryMovementTone,
    getSupplierDebtDuplicateWarning,
    getSupplierDebtItemSubtotal,
    getSupplierDebtProgress,
    getTransactionSortIcon,
    handleCashierCalculatorCompute,
    handleCashierSearchKeyDown,
    handleDatabaseAction,
    handleImportFile,
    handleSettingAction,
    handleStoreLogoUpload,
    handleTotpDisable,
    handleTotpSetup,
    handleTotpVerify,
    handleUserPasswordReset,
    hasCleanResetFlag,
    isDateInBounds,
    isReceivableOverdue,
    isSupplierDebtOverdue,
    lanAdminUrl,
    lanPriceCheckerUrl,
    loadXlsxModule,
    localFinanceEnabled,
    localReportCategoryDistribution,
    localReportDataset,
    localReportDecisionRows,
    localReportPaymentDistribution,
    localReportReceivableDebtChart,
    localReportStockMovementChart,
    localReportSummary,
    localReportTransactionTrend,
    lowStockCategoryOptions,
    lowStockCount,
    lowStockItems,
    mockSettingsStorageKey,
    mockUsersStorageKey,
    mockWorkspaceStorageKey,
    navigateMenu,
    normalizeCatalogDraftPrice,
    normalizeTransactionLineItem,
    openAuditDialog,
    openCreateCatalogDialog,
    openCreateUserDialog,
    openDebtCount,
    openDeleteCatalogDialog,
    openDeleteUserDialog,
    openEditCatalogDialog,
    openEditUserDialog,
    openPrintCatalogDialog,
    openReceivableCount,
    openReceivablePaymentModal,
    openReceivableReceiptPreview,
    openReportPrintPreview,
    openRestockDialog,
    openSupplierDebtPaymentModal,
    openSupplierDebtPrintPreview,
    paginatedCatalogRows,
    paginatedReceivableRows,
    paginatedStockHistoryRows,
    paginatedTransactionRows,
    parseDisplayDate,
    parseImportText,
    parseReceivableDueDate,
    performDatabaseBackup,
    performDatabaseDelete,
    performDatabaseHardReset,
    performDatabaseMaintenance,
    performDatabaseRestore,
    permissionModuleRows,
    persistCashierSession,
    persistRolePermissions,
    priceCheckerUrl,
    printCashierReceiptPreview,
    printReceivableReceiptPreview,
    printReportPreviewHtml,
    printSupplierDebtReceiptPreview,
    processCashierScannedCode,
    pushStockActionMessage,
    rangeLabel,
    rangedReceivableRowsData,
    rangedStockHistoryRows,
    rangedSupplierDebtRows,
    rangedTransactionRows,
    receivableExpandedInvoice,
    receivableMethodFilter,
    receivableOverdueOnly,
    receivablePage,
    receivablePageCount,
    receivablePageEnd,
    receivablePageSize,
    receivablePageStart,
    receivableRows,
    receivableSearch,
    receivableSeedRows,
    receivableStatusFilter,
    receivableSummary,
    refreshDatabaseBackups,
    refreshUserAccess,
    removeCashierCartItem,
    renderAuditDialog,
    renderBatchBarcodeModal,
    renderCashierCalculatorModal,
    renderCashierCheckoutModal,
    renderCashierReceiptPreviewModal,
    renderCashierSessionModal,
    renderCatalogDeleteModal,
    renderCatalogEditorButton,
    renderCatalogEditorModal,
    renderCatalogPrintModal,
    renderCatalogSortHeader,
    renderCategoryManagerModal,
    renderExportCatalogModal,
    renderFeatureModal,
    renderImportBarangModal,
    renderLowStockExportModal,
    renderLowStockUpdateModal,
    renderRangeSelector,
    renderReceivablePaymentModal,
    renderReceivableReceiptPreviewModal,
    renderReceivableSortHeader,
    renderReportPrintPreviewModal,
    renderRolePermissionDialog,
    renderSettingView,
    renderStockThresholdModal,
    renderSupplierDebtDialog,
    renderSupplierDebtPaymentModal,
    renderSupplierDebtReceiptPreviewModal,
    renderTotpSetupDialog,
    renderTransactionSortHeader,
    renderUserDeleteDialog,
    renderUserEditorDialog,
    replaceUserRow,
    reportCashFlow,
    reportCategoryDistribution,
    reportCategorySales,
    reportDataset,
    reportDecisionRows,
    reportPaymentDistribution,
    reportPaymentMix,
    reportReceivableDebtChart,
    reportSalesTrend,
    reportStockMovementChart,
    reportSummary,
    reportTab,
    reportTransactionTrend,
    resetCashierCart,
    resetCashierTransactionState,
    resetHardResetDialog,
    resetRangeToToday,
    resetRequiredUserCount,
    resetRolePermissionsToDefault,
    resetSettingsToDefault,
    restockTargetItem,
    restoreCashierSession,
    sales7Days,
    salesByHour,
    saveAppSettings,
    saveBinaryFile,
    saveWorkbookFile,
    selectedBatchItems,
    selectedRangeBounds,
    setCashierCartItemQty,
    setCashierCategoryFilter,
    setCashierCategoryFilterOpen,
    setCashierFormField,
    setCashierPaymentAmount,
    setCashierReceiptOpen,
    setCashierReceiptPreview,
    setCashierSearch,
    setDebtSearch,
    setDebtStatusFilter,
    setExpandedDebtId,
    setExpandedTransactionInvoice,
    setReceivableExpandedInvoice,
    setReceivableMethodFilter,
    setReceivableOverdueOnly,
    setReceivablePage,
    setReceivableSearch,
    setReceivableStatusFilter,
    setReportTab,
    setStockHistoryFilter,
    setStockHistoryFilterOpen,
    setStockHistoryPage,
    setStockHistorySearch,
    setSupplierDebtDialogOpen,
    setSupplierDebtReceiptPreview,
    setTransactionMethodFilter,
    setTransactionPage,
    setTransactionSearch,
    setTransactionStatusFilter,
    setUserRoleFilter,
    setUserSearch,
    settingAppearanceModeOptions,
    settingAppearanceScaleOptions,
    settingReceiptPreviewModels,
    settingReceiptSampleDocument,
    showOperationalPanel,
    showRangeFilter,
    sidebarItems,
    slugFilePart,
    splitImportLine,
    stockActionMessageTimer,
    stockHistoryFilter,
    stockHistoryFilterLabel,
    stockHistoryFilterOpen,
    stockHistoryFilterOptions,
    stockHistoryPage,
    stockHistoryPageCount,
    stockHistoryPageEnd,
    stockHistoryPageSize,
    stockHistoryPageStart,
    stockHistoryRows,
    stockHistorySearch,
    stockHistorySummary,
    storeLogoAcceptedTypes,
    storeLogoMaxSizeBytes,
    storeLogoMaxSizeKb,
    storeName,
    submitCashierCheckout,
    submitCatalogDraft,
    submitCategoryRename,
    submitImportCatalog,
    submitReceivablePayment,
    submitRestockItem,
    submitSupplierDebt,
    submitSupplierDebtPayment,
    submitUserDraft,
    supplierDebtSeedRows,
    syncAppSettings,
    toggleBatchSku,
    toggleCatalogSort,
    toggleCatalogTrail,
    toggleReceiptSection,
    toggleReceivableSort,
    toggleRolePermission,
    toggleTransactionSort,
    totpUserCount,
    transactionMethodFilter,
    transactionMethodOptions,
    transactionPage,
    transactionPageCount,
    transactionPageEnd,
    transactionPageSize,
    transactionPageStart,
    transactionRows,
    transactionSearch,
    transactionSeedRows,
    transactionStatusFilter,
    transactionSummary,
    updateSupplierDebtDraftItem,
    userActionMessage,
    userRoleFilter,
    userRoleOptions,
    userRowsData,
    userSearch,
    userSeedRows,
    visibleSidebarItems,
  } = view;

  return (
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Hutang', value: `${debtSummary.count}`, icon: Landmark, tone: 'slate' as const },
                { label: 'Total', value: formatRupiahNumber(debtSummary.total), icon: CircleDollarSign, tone: 'emerald' as const },
                { label: 'Dibayar', value: formatRupiahNumber(debtSummary.paid), icon: Banknote, tone: 'sky' as const },
                { label: 'Sisa', value: formatRupiahNumber(debtSummary.remaining), icon: AlertTriangle, tone: 'amber' as const },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <GradientStatCard key={item.label} title={item.label} value={item.value} icon={Icon} tone={item.tone} />
                );
              })}
            </div>
            <Card>
              <CardHeader className="border-b border-border py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      <Landmark className="h-4 w-4" />
                      Hutang
                    </CardTitle>
                    {renderRangeSelector()}
                  </div>
                  <div className="flex flex-nowrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" title="Filter hutang" aria-label="Filter hutang" variant="outline" className="h-7 w-7 rounded-lg p-0">
                          <Filter className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64">
                        <div className="grid gap-1.5">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status hutang</div>
                          <div className="grid gap-1">
                            {(['Semua', 'Belum lunas', 'Lunas', 'Overdue'] as const).map((status) => (
                              <Button
                                key={status}
                                type="button"
                                variant={debtStatusFilter === status ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 justify-start rounded-lg px-3 text-xs"
                                onClick={() => setDebtStatusFilter(status)}
                              >
                                {status}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="flex min-w-[190px] max-w-[220px] items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={debtSearch}
                        onChange={(event) => setDebtSearch(event.target.value)}
                        placeholder="Search supplier / barang..."
                        className="h-5 w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button type="button" title="Tambah hutang" aria-label="Tambah hutang" className="h-7 w-7 rounded-lg p-0" onClick={() => setSupplierDebtDialogOpen(true)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button type="button" title="Export laporan" aria-label="Export laporan" variant="outline" className="h-7 w-7 rounded-lg p-0">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                  {filteredDebtRows.map((row) => {
                    const isExpanded = expandedDebtId === row.id;
                    const isOverdue = isSupplierDebtOverdue(row);
                    const progress = getSupplierDebtProgress(row);

                    return (
                    <div key={row.id} className="grid gap-2 rounded-xl border border-border bg-muted/30 p-3">
                      <button type="button" onClick={() => setExpandedDebtId((current) => (current === row.id ? null : row.id))} className="flex items-start gap-3 text-left">
                        <ContextIcon label={`${row.supplier} hutang ${row.status}`} />
                        <div className="grid min-w-0 flex-1 gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{row.supplier}</div>
                              <div className="text-xs text-muted-foreground">{row.id} / {row.items.length} item</div>
                            </div>
                            <Badge variant={isOverdue ? 'danger' : row.status === 'Lunas' ? 'success' : 'warning'} className="rounded-md px-2 py-0.5">
                              {isOverdue ? 'Overdue' : row.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Sisa {row.remaining}</span>
                            <span>Jatuh tempo {row.due}</span>
                          </div>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="grid gap-3 border-t border-border pt-3">
                          <div className="grid gap-2 sm:grid-cols-3">
                            {[['Total', row.total], ['Dibayar', row.paid], ['Tanggal ambil', row.takeDate], ['Jatuh tempo', row.due]].map(([label, value]) => (
                              <div key={label} className="rounded-lg border border-border bg-background px-3 py-1.5">
                                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                                <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
                              </div>
                            ))}
                          </div>
                          <div className="grid gap-2 rounded-lg border border-border bg-background px-3 py-2">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              Data supplier
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {[
                                ['Nama', row.supplier],
                                ['Telepon', row.supplierPhone || '-'],
                                ['Alamat', row.supplierAddress || '-'],
                                ['Catatan penagihan', row.collectionNote || '-'],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                                  <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(220px,0.58fr)_minmax(0,1fr)]">
                            <div className="grid gap-1.5 rounded-lg border border-border bg-background px-2 py-2">
                              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Barang dari supplier</div>
                              <div className="grid gap-1.5">
                                {row.items.map((item) => (
                                  <div key={`${row.id}-${item.name}`} className="grid grid-cols-[minmax(0,1fr)_76px_100px] gap-2 rounded-md border border-border/80 bg-muted/10 px-2 py-1 text-xs">
                                    <div className="min-w-0">
                                      <div className="truncate font-medium">{item.name}</div>
                                      <div className="text-[10px] text-muted-foreground">{item.category}</div>
                                    </div>
                                    <div className="text-muted-foreground">{item.packQty} {item.unit}</div>
                                    <div className="text-right font-medium">{formatRupiahNumber(getSupplierDebtItemSubtotal(item))}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid content-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="uppercase tracking-[0.14em] text-muted-foreground">Progress pembayaran</span>
                                <span className="font-semibold">{progress}%</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#22c55e)]" style={{ width: `${progress}%` }} />
                              </div>
                              <div className="grid gap-2 rounded-md border border-border/80 bg-muted/10 px-2 py-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">Total</span>
                                  <span className="font-medium">{row.total}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">Dibayar</span>
                                  <span className="font-medium">{row.paid}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-muted-foreground">Sisa</span>
                                  <span className="font-medium">{row.remaining}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-1.5 rounded-lg border border-border bg-background px-2 py-2">
                              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Riwayat pembayaran</div>
                              {row.paymentHistory.length ? row.paymentHistory.map((payment, paymentIndex) => (
                                <div key={`${row.id}-${payment.time}`} className="grid gap-1 rounded-md border border-border/80 bg-muted/10 px-2 py-2 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="font-medium">{payment.amount}</div>
                                      <div className="text-[10px] text-muted-foreground">{payment.time} / {payment.receiver}</div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px]">{payment.method}</Badge>
                                      <Button type="button" variant="outline" size="sm" className="h-7 rounded-md px-2 text-[10px]" onClick={(event) => { event.stopPropagation(); setSupplierDebtReceiptPreview({ row, payment }); }}><Printer className="h-3 w-3" />Print</Button>
                                      <Button type="button" variant="outline" size="sm" className="h-7 rounded-md px-2 text-[10px]" onClick={(event) => { event.stopPropagation(); openSupplierDebtPaymentModal(row, false, paymentIndex); }}><PencilLine className="h-3 w-3" />Edit</Button>
                                      <Button type="button" variant="outline" size="sm" className="h-7 rounded-md px-2 text-[10px] text-red-200" onClick={(event) => { event.stopPropagation(); deleteSupplierDebtPayment(row, paymentIndex); }}><Trash2 className="h-3 w-3" /></Button>
                                    </div>
                                  </div>
                                  <div className="text-muted-foreground">{payment.note}</div>
                                </div>
                              )) : <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">Belum ada pembayaran.</div>}
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-2">
                            <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={(event) => { event.stopPropagation(); openSupplierDebtPrintPreview(row); }}>
                              <Printer className="h-3.5 w-3.5" />
                              Print hutang
                            </Button>
                            <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={(event) => { event.stopPropagation(); openSupplierDebtPaymentModal(row); }} disabled={row.status === 'Lunas'}><Banknote className="h-3.5 w-3.5" />Catat pembayaran</Button>
                            <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={(event) => { event.stopPropagation(); openSupplierDebtPaymentModal(row, true); }} disabled={row.status === 'Lunas'}><CheckCircle2 className="h-3.5 w-3.5" />Tandai lunas</Button>
                            <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs text-red-200" onClick={(event) => { event.stopPropagation(); deleteSupplierDebt(row); }}><Trash2 className="h-3.5 w-3.5" />Hapus</Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    );
                  })}
                  {!filteredDebtRows.length ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada hutang pada filter ini.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
  
  );
}

export function ReceivablesView({ view }: LegacyViewProps) {
  const {
    LazyDatabaseView,
    LazySettingView,
    activeSessionRole,
    activeSessionUser,
    activeSettingReceiptPreview,
    activeUserCount,
    addCashierCartItem,
    adminUrl,
    applyAppSettings,
    applyAppearanceSettings,
    applyCashierCalculatorToPayment,
    applyReceiptTemplatePreset,
    applyReceivablePaymentHistory,
    applySupplierDebtItems,
    applySupplierDebtPaymentHistory,
    buildAppSettingsPayload,
    buildCashierReceiptDocumentData,
    buildCashierReceiptHtml,
    buildCashierReceiptPreview,
    buildReportPrintHtml,
    buildSettingReceiptPreviewHtml,
    buildTransactionReceiptPreview,
    canManageRolePermissions,
    cashierCartItems,
    cashierCatalog,
    cashierCategories,
    cashierCategoryFilter,
    cashierCategoryFilterOpen,
    cashierChange,
    cashierDiscountModes,
    cashierDiscountValue,
    cashierDraftRows,
    cashierGrandTotal,
    cashierHoldRows,
    cashierPaidValue,
    cashierPaymentAmount,
    cashierPaymentMethods,
    cashierPaymentStatus,
    cashierPaymentStatuses,
    cashierRecentItems,
    cashierRemaining,
    cashierScanBufferRef,
    cashierScanCandidateRef,
    cashierScanError,
    cashierScanTimesRef,
    cashierSearch,
    cashierSubtotal,
    catalogCategories,
    catalogPageCount,
    catalogPageEnd,
    catalogPageSize,
    catalogPageStart,
    catalogRows,
    categoryBadgeClasses,
    categorySummary,
    cleanResetStorageKey,
    clearCashierScanBuffer,
    clearStoreLogo,
    compareCatalogValues,
    compareReceivableValues,
    compareTransactionValues,
    confirmDeleteCatalog,
    confirmDeleteUser,
    copyAdminUrl,
    copyPriceCheckerUrl,
    createDefaultSupplierDebtDraft,
    createEmptySupplierDebtItem,
    criticalLowStockCount,
    dashboardChartConfig,
    dashboardKpis,
    dashboardLatestTransactions,
    dashboardOperations,
    databaseBackupFallbackRows,
    databaseBackupVisibleRows,
    databaseEntityStats,
    databaseExportStamp,
    databaseHealthFallback,
    databaseHealthVisible,
    databaseMutationCount,
    databaseNextBackupLabel,
    databaseSizeEstimate,
    debtSearch,
    debtStatusFilter,
    debtSummary,
    decrementCashierCartItem,
    defaultCashierCheckoutForm,
    defaultReceiptPreviewDocument,
    defaultRolePermissions,
    defaultSettingAppearance,
    defaultSettingReceiptLayout,
    defaultSettingReceiptSections,
    deferredCashierSearch,
    deferredCatalogSearch,
    deferredDebtSearch,
    deferredLowStockSearch,
    deferredReceivableSearch,
    deferredStockHistorySearch,
    deferredTransactionSearch,
    deferredUserSearch,
    deleteReceivablePayment,
    deleteSupplierDebt,
    deleteSupplierDebtPayment,
    describeCatalogTrail,
    escapeCsvValue,
    escapeReceiptHtml,
    evaluateCashierExpression,
    expandedDebtId,
    expandedTransactionInvoice,
    exportCatalogToCsv,
    exportDatabaseSummaryWorkbook,
    exportStockHistoryToCsv,
    exportTransactionsWorkbook,
    filteredDebtRows,
    filteredReceivableRows,
    filteredTransactionRows,
    filteredUserRows,
    findCashierCatalogItem,
    formatCashierDiscountInput,
    formatReceiptAmount,
    formatRupiahInput,
    formatRupiahNumber,
    formatSignedNumber,
    getCashierDiscountValue,
    getCatalogDraftValidationError,
    getCatalogDuplicateKey,
    getCatalogSortIcon,
    getCatalogTrailRowsForItem,
    getCategoryBadgeClass,
    getExportFileName,
    getLowStockStatus,
    getLowStockSuggestion,
    getReceiptPreviewDimensions,
    getReceivableProgress,
    getReceivableSortIcon,
    getReportTabTitle,
    getRupiahNumber,
    getStockHistoryEventVariant,
    getStockHistoryMovementIcon,
    getStockHistoryMovementTone,
    getSupplierDebtDuplicateWarning,
    getSupplierDebtItemSubtotal,
    getSupplierDebtProgress,
    getTransactionSortIcon,
    handleCashierCalculatorCompute,
    handleCashierSearchKeyDown,
    handleDatabaseAction,
    handleImportFile,
    handleSettingAction,
    handleStoreLogoUpload,
    handleTotpDisable,
    handleTotpSetup,
    handleTotpVerify,
    handleUserPasswordReset,
    hasCleanResetFlag,
    isDateInBounds,
    isReceivableOverdue,
    isSupplierDebtOverdue,
    lanAdminUrl,
    lanPriceCheckerUrl,
    loadXlsxModule,
    localFinanceEnabled,
    localReportCategoryDistribution,
    localReportDataset,
    localReportDecisionRows,
    localReportPaymentDistribution,
    localReportReceivableDebtChart,
    localReportStockMovementChart,
    localReportSummary,
    localReportTransactionTrend,
    lowStockCategoryOptions,
    lowStockCount,
    lowStockItems,
    mockSettingsStorageKey,
    mockUsersStorageKey,
    mockWorkspaceStorageKey,
    navigateMenu,
    normalizeCatalogDraftPrice,
    normalizeTransactionLineItem,
    openAuditDialog,
    openCreateCatalogDialog,
    openCreateUserDialog,
    openDebtCount,
    openDeleteCatalogDialog,
    openDeleteUserDialog,
    openEditCatalogDialog,
    openEditUserDialog,
    openPrintCatalogDialog,
    openReceivableCount,
    openReceivablePaymentModal,
    openReceivableReceiptPreview,
    openReportPrintPreview,
    openRestockDialog,
    openSupplierDebtPaymentModal,
    openSupplierDebtPrintPreview,
    paginatedCatalogRows,
    paginatedReceivableRows,
    paginatedStockHistoryRows,
    paginatedTransactionRows,
    parseDisplayDate,
    parseImportText,
    parseReceivableDueDate,
    performDatabaseBackup,
    performDatabaseDelete,
    performDatabaseHardReset,
    performDatabaseMaintenance,
    performDatabaseRestore,
    permissionModuleRows,
    persistCashierSession,
    persistRolePermissions,
    priceCheckerUrl,
    printCashierReceiptPreview,
    printReceivableReceiptPreview,
    printReportPreviewHtml,
    printSupplierDebtReceiptPreview,
    processCashierScannedCode,
    pushStockActionMessage,
    rangeLabel,
    rangedReceivableRowsData,
    rangedStockHistoryRows,
    rangedSupplierDebtRows,
    rangedTransactionRows,
    receivableExpandedInvoice,
    receivableMethodFilter,
    receivableOverdueOnly,
    receivablePage,
    receivablePageCount,
    receivablePageEnd,
    receivablePageSize,
    receivablePageStart,
    receivableRows,
    receivableSearch,
    receivableSeedRows,
    receivableStatusFilter,
    receivableSummary,
    refreshDatabaseBackups,
    refreshUserAccess,
    removeCashierCartItem,
    renderAuditDialog,
    renderBatchBarcodeModal,
    renderCashierCalculatorModal,
    renderCashierCheckoutModal,
    renderCashierReceiptPreviewModal,
    renderCashierSessionModal,
    renderCatalogDeleteModal,
    renderCatalogEditorButton,
    renderCatalogEditorModal,
    renderCatalogPrintModal,
    renderCatalogSortHeader,
    renderCategoryManagerModal,
    renderExportCatalogModal,
    renderFeatureModal,
    renderImportBarangModal,
    renderLowStockExportModal,
    renderLowStockUpdateModal,
    renderRangeSelector,
    renderReceivablePaymentModal,
    renderReceivableReceiptPreviewModal,
    renderReceivableSortHeader,
    renderReportPrintPreviewModal,
    renderRolePermissionDialog,
    renderSettingView,
    renderStockThresholdModal,
    renderSupplierDebtDialog,
    renderSupplierDebtPaymentModal,
    renderSupplierDebtReceiptPreviewModal,
    renderTotpSetupDialog,
    renderTransactionSortHeader,
    renderUserDeleteDialog,
    renderUserEditorDialog,
    replaceUserRow,
    reportCashFlow,
    reportCategoryDistribution,
    reportCategorySales,
    reportDataset,
    reportDecisionRows,
    reportPaymentDistribution,
    reportPaymentMix,
    reportReceivableDebtChart,
    reportSalesTrend,
    reportStockMovementChart,
    reportSummary,
    reportTab,
    reportTransactionTrend,
    resetCashierCart,
    resetCashierTransactionState,
    resetHardResetDialog,
    resetRangeToToday,
    resetRequiredUserCount,
    resetRolePermissionsToDefault,
    resetSettingsToDefault,
    restockTargetItem,
    restoreCashierSession,
    sales7Days,
    salesByHour,
    saveAppSettings,
    saveBinaryFile,
    saveWorkbookFile,
    selectedBatchItems,
    selectedRangeBounds,
    setCashierCartItemQty,
    setCashierCategoryFilter,
    setCashierCategoryFilterOpen,
    setCashierFormField,
    setCashierPaymentAmount,
    setCashierReceiptOpen,
    setCashierReceiptPreview,
    setCashierSearch,
    setDebtSearch,
    setDebtStatusFilter,
    setExpandedDebtId,
    setExpandedTransactionInvoice,
    setReceivableExpandedInvoice,
    setReceivableMethodFilter,
    setReceivableOverdueOnly,
    setReceivablePage,
    setReceivableSearch,
    setReceivableStatusFilter,
    setReportTab,
    setStockHistoryFilter,
    setStockHistoryFilterOpen,
    setStockHistoryPage,
    setStockHistorySearch,
    setSupplierDebtDialogOpen,
    setSupplierDebtReceiptPreview,
    setTransactionMethodFilter,
    setTransactionPage,
    setTransactionSearch,
    setTransactionStatusFilter,
    setUserRoleFilter,
    setUserSearch,
    settingAppearanceModeOptions,
    settingAppearanceScaleOptions,
    settingReceiptPreviewModels,
    settingReceiptSampleDocument,
    showOperationalPanel,
    showRangeFilter,
    sidebarItems,
    slugFilePart,
    splitImportLine,
    stockActionMessageTimer,
    stockHistoryFilter,
    stockHistoryFilterLabel,
    stockHistoryFilterOpen,
    stockHistoryFilterOptions,
    stockHistoryPage,
    stockHistoryPageCount,
    stockHistoryPageEnd,
    stockHistoryPageSize,
    stockHistoryPageStart,
    stockHistoryRows,
    stockHistorySearch,
    stockHistorySummary,
    storeLogoAcceptedTypes,
    storeLogoMaxSizeBytes,
    storeLogoMaxSizeKb,
    storeName,
    submitCashierCheckout,
    submitCatalogDraft,
    submitCategoryRename,
    submitImportCatalog,
    submitReceivablePayment,
    submitRestockItem,
    submitSupplierDebt,
    submitSupplierDebtPayment,
    submitUserDraft,
    supplierDebtSeedRows,
    syncAppSettings,
    toggleBatchSku,
    toggleCatalogSort,
    toggleCatalogTrail,
    toggleReceiptSection,
    toggleReceivableSort,
    toggleRolePermission,
    toggleTransactionSort,
    totpUserCount,
    transactionMethodFilter,
    transactionMethodOptions,
    transactionPage,
    transactionPageCount,
    transactionPageEnd,
    transactionPageSize,
    transactionPageStart,
    transactionRows,
    transactionSearch,
    transactionSeedRows,
    transactionStatusFilter,
    transactionSummary,
    updateSupplierDebtDraftItem,
    userActionMessage,
    userRoleFilter,
    userRoleOptions,
    userRowsData,
    userSearch,
    userSeedRows,
    visibleSidebarItems,
  } = view;

  return (
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Piutang', value: `${receivableSummary.count}`, icon: HandCoins, tone: 'slate' as const },
                { label: 'Tagihan', value: formatRupiahNumber(receivableSummary.total), icon: CircleDollarSign, tone: 'emerald' as const },
                { label: 'Dibayar', value: formatRupiahNumber(receivableSummary.paid), icon: Banknote, tone: 'sky' as const },
                { label: 'Sisa', value: formatRupiahNumber(receivableSummary.remaining), icon: AlertTriangle, tone: 'amber' as const },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <GradientStatCard key={item.label} title={item.label} value={item.value} icon={Icon} tone={item.tone} />
                );
              })}
            </div>

            <Card>
              <CardHeader className="border-b border-border py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      <HandCoins className="h-4 w-4" />
                      Piutang
                    </CardTitle>
                    {renderRangeSelector()}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" title="Filter piutang" aria-label="Filter piutang" variant="outline" className="h-7 w-7 rounded-lg p-0">
                          <Filter className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-68">
                        <div className="grid gap-1.5">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status piutang</div>
                          <div className="grid gap-1">
                            {(['Semua', 'Belum dibayar', 'Cicilan', 'Tertagih sebagian', 'Tagihan terbuka'] as const).map((status) => (
                              <Button
                                key={status}
                                type="button"
                                variant={receivableStatusFilter === status ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 justify-start rounded-lg px-3 text-xs"
                                onClick={() => setReceivableStatusFilter(status)}
                              >
                                {status}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" title="Filter metode" aria-label="Filter metode" variant="outline" className="h-7 rounded-lg px-3 text-[11px] font-semibold">
                          <CreditCard className="h-3 w-3" />
                          {receivableMethodFilter}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-60">
                        <div className="grid gap-1.5">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Metode</div>
                          <div className="grid gap-1">
                            {(['Semua metode', 'Tunai', 'Transfer', 'QRIS', 'Cicilan'] as const).map((method) => (
                              <Button
                                key={method}
                                type="button"
                                variant={receivableMethodFilter === method ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 justify-start rounded-lg px-3 text-xs"
                                onClick={() => setReceivableMethodFilter(method)}
                              >
                                {method}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant={receivableOverdueOnly ? 'default' : 'outline'}
                      className="h-7 rounded-lg px-3 text-[11px] font-semibold"
                      onClick={() => setReceivableOverdueOnly((current) => !current)}
                    >
                      <Clock3 className="h-3 w-3" />
                      Overdue
                    </Button>
                    <div className="flex min-w-[200px] items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={receivableSearch}
                        onChange={(event) => setReceivableSearch(event.target.value)}
                        placeholder="Search..."
                        className="h-5 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto pt-4">
                <div className="grid min-w-[980px] gap-2">
                    <div className="grid grid-cols-[164px_minmax(0,1fr)_88px_94px_86px_94px] gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-foreground/80">
                    <div className="border-r border-dashed border-border/70 pr-2">{renderReceivableSortHeader('Invoice', 'invoice')}</div>
                    <div className="border-r border-dashed border-border/70 pr-2">{renderReceivableSortHeader('Pelanggan', 'customer')}</div>
                    <div className="border-r border-dashed border-border/70 pr-2">{renderReceivableSortHeader('Jatuh tempo', 'due')}</div>
                    <div className="border-r border-dashed border-border/70 pr-2">{renderReceivableSortHeader('Dibayar', 'remaining')}</div>
                    <div className="border-r border-dashed border-border/70 pr-2">{renderReceivableSortHeader('Metode', 'method')}</div>
                    <div>{renderReceivableSortHeader('Status', 'status')}</div>
                  </div>
                  {paginatedReceivableRows.map((row) => {
                    const isExpanded = receivableExpandedInvoice === row.invoice;
                    const isOverdue = isReceivableOverdue(row);
                    const paymentProgress = getReceivableProgress(row);
                    const saleRow = transactionRows.find((item) => item.invoice === row.invoice);

                    return (
                      <div key={row.invoice} className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => setReceivableExpandedInvoice((current) => (current === row.invoice ? null : row.invoice))}
                          className="grid cursor-pointer grid-cols-[164px_minmax(0,1fr)_88px_94px_86px_94px] items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
                          aria-expanded={isExpanded}
                        >
                          <div className="grid gap-1 border-r border-dashed border-border/70 pr-2">
                            <div className="flex items-center gap-2 font-semibold">
                              <ContextIcon label={`${row.invoice} piutang`} className="h-7 w-7" />
                              {row.invoice}
                            </div>
                            <div className="text-xs text-muted-foreground">{row.cashier}</div>
                          </div>
                          <div className="min-w-0 border-r border-dashed border-border/70 pr-2">
                            <div className="truncate font-medium">{row.customerName}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.projectName} / {row.method}
                            </div>
                          </div>
                          <div className="border-r border-dashed border-border/70 pr-2">
                            <div className={isOverdue ? 'font-medium text-red-300' : 'text-muted-foreground'}>{row.due}</div>
                            {isOverdue ? <div className="text-xs text-red-300/80">Lewat tempo</div> : null}
                          </div>
                          <div className="grid gap-0.5 border-r border-dashed border-border/70 pr-2">
                            <div className="font-medium">{row.remaining}</div>
                            <div className="text-xs text-muted-foreground">Dibayar {row.paid}</div>
                          </div>
                          <div className="text-muted-foreground border-r border-dashed border-border/70 pr-2">{row.method}</div>
                          <Badge
                            variant={isOverdue ? 'danger' : row.status === 'Belum dibayar' ? 'warning' : row.status === 'Cicilan' ? 'secondary' : 'outline'}
                            className="w-fit rounded-md px-2 py-0.5"
                          >
                            {isOverdue ? 'Overdue' : row.status}
                          </Badge>
                        </button>

                        {isExpanded ? (
                          <div className="grid gap-2 rounded-xl border border-border bg-background/60 p-2">
                            <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)]">
                              <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-2.5">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  <Eye className="h-4 w-4" />
                                  Detail tagihan
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  {[
                                    ['Invoice', row.invoice],
                                    ['Pelanggan', row.customerName],
                                    ['Kasir', row.cashier],
                                    ['Metode', row.method],
                                    ['Status', row.status],
                                    ['Jatuh tempo', row.due],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg border border-border bg-background px-3 py-1.5">
                                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                                      <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid gap-2 rounded-lg border border-border bg-background px-3 py-2">
                                  <div className="flex items-center justify-between gap-3 text-xs">
                                    <span className="uppercase tracking-[0.14em] text-muted-foreground">Progress pembayaran</span>
                                    <span className="font-semibold">{paymentProgress}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e,#facc15)] transition-all"
                                      style={{ width: `${paymentProgress}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {[
                                    ['Telepon', row.phone || '-'],
                                    ['Alamat', row.address || '-'],
                                    ['Referensi', row.reference || '-'],
                                    ['Catatan', row.note || '-'],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg border border-border bg-background px-3 py-1.5">
                                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                                      <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid gap-1.5">
                                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Item dibeli</div>
                                  <div className="grid max-h-32 gap-1.5 overflow-y-auto pr-1">
                                    {saleRow?.items?.length ? (
                                      saleRow.items.map((item) => {
                                        const normalizedItem = normalizeTransactionLineItem(item);

                                        return (
                                          <div key={`${row.invoice}-${normalizedItem.sku}`} className="grid grid-cols-[minmax(0,1fr)_56px_82px] gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
                                            <div className="min-w-0">
                                              <div className="truncate font-medium">{normalizedItem.name}</div>
                                              <div className="text-[10px] text-muted-foreground">
                                                {normalizedItem.qty} x {normalizedItem.price > 0 ? formatRupiahNumber(normalizedItem.price) : 'harga unit belum tercatat'}
                                                {normalizedItem.unit ? ` / ${normalizedItem.unit}` : ''}
                                              </div>
                                            </div>
                                            <div className="text-muted-foreground">{normalizedItem.qty} {normalizedItem.unit}</div>
                                            <div className="text-right font-medium">{formatRupiahNumber(normalizedItem.subtotal)}</div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                                        Detail item belum tersedia.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-2.5 xl:self-start">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  <ReceiptText className="h-4 w-4" />
                                  Pembayaran
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {[
                                    ['Total', row.total],
                                    ['Dibayar', row.paid],
                                    ['Sisa', row.remaining],
                                    ['Terakhir', row.lastPayment],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg border border-border bg-background px-3 py-1.5">
                                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                                      <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid gap-1.5">
                                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Riwayat pembayaran</div>
                                  <div className="grid max-h-36 gap-1.5 overflow-y-auto pr-1">
                                    {row.paymentHistory.length ? (
                                      row.paymentHistory.map((payment, paymentIndex) => (
                                        <div key={`${row.invoice}-${payment.time}`} className="grid gap-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="grid gap-0.5">
                                              <div className="font-medium">{payment.amount}</div>
                                              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{row.invoice}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px]">
                                                {payment.method}
                                              </Badge>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 rounded-md px-2 text-[10px]"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  openReceivableReceiptPreview(row, payment);
                                                }}
                                              >
                                                <Printer className="h-3 w-3" />
                                                Print
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 rounded-md px-2 text-[10px]"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  openReceivablePaymentModal(row, false, paymentIndex);
                                                }}
                                              >
                                                <PencilLine className="h-3 w-3" />
                                                Edit
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 rounded-md px-2 text-[10px] text-red-200 hover:text-red-100"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  deleteReceivablePayment(row, paymentIndex);
                                                }}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                          <div className="text-muted-foreground">
                                            {payment.time} / {payment.note}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                                        Belum ada pembayaran.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {row.paymentHistory.length} pembayaran tercatat
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 rounded-lg px-3 text-xs"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openReceivablePaymentModal(row);
                                  }}
                                >
                                  <HandCoins className="h-3.5 w-3.5" />
                                  Catat pembayaran
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 rounded-lg px-3 text-xs"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openReceivablePaymentModal(row, true);
                                  }}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Tandai lunas
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {!filteredReceivableRows.length ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada piutang pada filter ini.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Menampilkan {receivablePageStart}-{receivablePageEnd} dari {filteredReceivableRows.length} piutang
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => setReceivablePage((current) => Math.max(1, current - 1))}
                          disabled={receivablePage <= 1}
                        >
                          Sebelumnya
                        </Button>
                        <div className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium">
                          Hal {receivablePage} / {receivablePageCount}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => setReceivablePage((current) => Math.min(receivablePageCount, current + 1))}
                          disabled={receivablePage >= receivablePageCount}
                        >
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

  );
}

export function ReportsView({ view }: LegacyViewProps) {
  const {
    LazyDatabaseView,
    LazySettingView,
    activeSessionRole,
    activeSessionUser,
    activeSettingReceiptPreview,
    activeUserCount,
    addCashierCartItem,
    adminUrl,
    applyAppSettings,
    applyAppearanceSettings,
    applyCashierCalculatorToPayment,
    applyReceiptTemplatePreset,
    applyReceivablePaymentHistory,
    applySupplierDebtItems,
    applySupplierDebtPaymentHistory,
    buildAppSettingsPayload,
    buildCashierReceiptDocumentData,
    buildCashierReceiptHtml,
    buildCashierReceiptPreview,
    buildReportPrintHtml,
    buildSettingReceiptPreviewHtml,
    buildTransactionReceiptPreview,
    canManageRolePermissions,
    cashierCartItems,
    cashierCatalog,
    cashierCategories,
    cashierCategoryFilter,
    cashierCategoryFilterOpen,
    cashierChange,
    cashierDiscountModes,
    cashierDiscountValue,
    cashierDraftRows,
    cashierGrandTotal,
    cashierHoldRows,
    cashierPaidValue,
    cashierPaymentAmount,
    cashierPaymentMethods,
    cashierPaymentStatus,
    cashierPaymentStatuses,
    cashierRecentItems,
    cashierRemaining,
    cashierScanBufferRef,
    cashierScanCandidateRef,
    cashierScanError,
    cashierScanTimesRef,
    cashierSearch,
    cashierSubtotal,
    catalogCategories,
    catalogPageCount,
    catalogPageEnd,
    catalogPageSize,
    catalogPageStart,
    catalogRows,
    categoryBadgeClasses,
    categorySummary,
    cleanResetStorageKey,
    clearCashierScanBuffer,
    clearStoreLogo,
    compareCatalogValues,
    compareReceivableValues,
    compareTransactionValues,
    confirmDeleteCatalog,
    confirmDeleteUser,
    copyAdminUrl,
    copyPriceCheckerUrl,
    createDefaultSupplierDebtDraft,
    createEmptySupplierDebtItem,
    criticalLowStockCount,
    dashboardChartConfig,
    dashboardKpis,
    dashboardLatestTransactions,
    dashboardOperations,
    databaseBackupFallbackRows,
    databaseBackupVisibleRows,
    databaseEntityStats,
    databaseExportStamp,
    databaseHealthFallback,
    databaseHealthVisible,
    databaseMutationCount,
    databaseNextBackupLabel,
    databaseSizeEstimate,
    debtSearch,
    debtStatusFilter,
    debtSummary,
    decrementCashierCartItem,
    defaultCashierCheckoutForm,
    defaultReceiptPreviewDocument,
    defaultRolePermissions,
    defaultSettingAppearance,
    defaultSettingReceiptLayout,
    defaultSettingReceiptSections,
    deferredCashierSearch,
    deferredCatalogSearch,
    deferredDebtSearch,
    deferredLowStockSearch,
    deferredReceivableSearch,
    deferredStockHistorySearch,
    deferredTransactionSearch,
    deferredUserSearch,
    deleteReceivablePayment,
    deleteSupplierDebt,
    deleteSupplierDebtPayment,
    describeCatalogTrail,
    escapeCsvValue,
    escapeReceiptHtml,
    evaluateCashierExpression,
    expandedDebtId,
    expandedTransactionInvoice,
    exportCatalogToCsv,
    exportDatabaseSummaryWorkbook,
    exportStockHistoryToCsv,
    exportTransactionsWorkbook,
    filteredDebtRows,
    filteredReceivableRows,
    filteredTransactionRows,
    filteredUserRows,
    findCashierCatalogItem,
    formatCashierDiscountInput,
    formatReceiptAmount,
    formatRupiahInput,
    formatRupiahNumber,
    formatSignedNumber,
    getCashierDiscountValue,
    getCatalogDraftValidationError,
    getCatalogDuplicateKey,
    getCatalogSortIcon,
    getCatalogTrailRowsForItem,
    getCategoryBadgeClass,
    getExportFileName,
    getLowStockStatus,
    getLowStockSuggestion,
    getReceiptPreviewDimensions,
    getReceivableProgress,
    getReceivableSortIcon,
    getReportTabTitle,
    getRupiahNumber,
    getStockHistoryEventVariant,
    getStockHistoryMovementIcon,
    getStockHistoryMovementTone,
    getSupplierDebtDuplicateWarning,
    getSupplierDebtItemSubtotal,
    getSupplierDebtProgress,
    getTransactionSortIcon,
    handleCashierCalculatorCompute,
    handleCashierSearchKeyDown,
    handleDatabaseAction,
    handleImportFile,
    handleSettingAction,
    handleStoreLogoUpload,
    handleTotpDisable,
    handleTotpSetup,
    handleTotpVerify,
    handleUserPasswordReset,
    hasCleanResetFlag,
    isDateInBounds,
    isReceivableOverdue,
    isSupplierDebtOverdue,
    lanAdminUrl,
    lanPriceCheckerUrl,
    loadXlsxModule,
    localFinanceEnabled,
    localReportCategoryDistribution,
    localReportDataset,
    localReportDecisionRows,
    localReportPaymentDistribution,
    localReportReceivableDebtChart,
    localReportStockMovementChart,
    localReportSummary,
    localReportTransactionTrend,
    lowStockCategoryOptions,
    lowStockCount,
    lowStockItems,
    mockSettingsStorageKey,
    mockUsersStorageKey,
    mockWorkspaceStorageKey,
    navigateMenu,
    normalizeCatalogDraftPrice,
    normalizeTransactionLineItem,
    openAuditDialog,
    openCreateCatalogDialog,
    openCreateUserDialog,
    openDebtCount,
    openDeleteCatalogDialog,
    openDeleteUserDialog,
    openEditCatalogDialog,
    openEditUserDialog,
    openPrintCatalogDialog,
    openReceivableCount,
    openReceivablePaymentModal,
    openReceivableReceiptPreview,
    openReportPrintPreview,
    openRestockDialog,
    openSupplierDebtPaymentModal,
    openSupplierDebtPrintPreview,
    paginatedCatalogRows,
    paginatedReceivableRows,
    paginatedStockHistoryRows,
    paginatedTransactionRows,
    parseDisplayDate,
    parseImportText,
    parseReceivableDueDate,
    performDatabaseBackup,
    performDatabaseDelete,
    performDatabaseHardReset,
    performDatabaseMaintenance,
    performDatabaseRestore,
    permissionModuleRows,
    persistCashierSession,
    persistRolePermissions,
    priceCheckerUrl,
    printCashierReceiptPreview,
    printReceivableReceiptPreview,
    printReportPreviewHtml,
    printSupplierDebtReceiptPreview,
    processCashierScannedCode,
    pushStockActionMessage,
    rangeLabel,
    rangedReceivableRowsData,
    rangedStockHistoryRows,
    rangedSupplierDebtRows,
    rangedTransactionRows,
    receivableExpandedInvoice,
    receivableMethodFilter,
    receivableOverdueOnly,
    receivablePage,
    receivablePageCount,
    receivablePageEnd,
    receivablePageSize,
    receivablePageStart,
    receivableRows,
    receivableSearch,
    receivableSeedRows,
    receivableStatusFilter,
    receivableSummary,
    refreshDatabaseBackups,
    refreshUserAccess,
    removeCashierCartItem,
    renderAuditDialog,
    renderBatchBarcodeModal,
    renderCashierCalculatorModal,
    renderCashierCheckoutModal,
    renderCashierReceiptPreviewModal,
    renderCashierSessionModal,
    renderCatalogDeleteModal,
    renderCatalogEditorButton,
    renderCatalogEditorModal,
    renderCatalogPrintModal,
    renderCatalogSortHeader,
    renderCategoryManagerModal,
    renderExportCatalogModal,
    renderFeatureModal,
    renderImportBarangModal,
    renderLowStockExportModal,
    renderLowStockUpdateModal,
    renderRangeSelector,
    renderReceivablePaymentModal,
    renderReceivableReceiptPreviewModal,
    renderReceivableSortHeader,
    renderReportPrintPreviewModal,
    renderRolePermissionDialog,
    renderSettingView,
    renderStockThresholdModal,
    renderSupplierDebtDialog,
    renderSupplierDebtPaymentModal,
    renderSupplierDebtReceiptPreviewModal,
    renderTotpSetupDialog,
    renderTransactionSortHeader,
    renderUserDeleteDialog,
    renderUserEditorDialog,
    replaceUserRow,
    reportCashFlow,
    reportCategoryDistribution,
    reportCategorySales,
    reportDataset,
    reportDecisionRows,
    reportPaymentDistribution,
    reportPaymentMix,
    reportReceivableDebtChart,
    reportSalesTrend,
    reportStockMovementChart,
    reportSummary,
    reportTab,
    reportTransactionTrend,
    resetCashierCart,
    resetCashierTransactionState,
    resetHardResetDialog,
    resetRangeToToday,
    resetRequiredUserCount,
    resetRolePermissionsToDefault,
    resetSettingsToDefault,
    restockTargetItem,
    restoreCashierSession,
    sales7Days,
    salesByHour,
    saveAppSettings,
    saveBinaryFile,
    saveWorkbookFile,
    selectedBatchItems,
    selectedRangeBounds,
    setCashierCartItemQty,
    setCashierCategoryFilter,
    setCashierCategoryFilterOpen,
    setCashierFormField,
    setCashierPaymentAmount,
    setCashierReceiptOpen,
    setCashierReceiptPreview,
    setCashierSearch,
    setDebtSearch,
    setDebtStatusFilter,
    setExpandedDebtId,
    setExpandedTransactionInvoice,
    setReceivableExpandedInvoice,
    setReceivableMethodFilter,
    setReceivableOverdueOnly,
    setReceivablePage,
    setReceivableSearch,
    setReceivableStatusFilter,
    setReportTab,
    setStockHistoryFilter,
    setStockHistoryFilterOpen,
    setStockHistoryPage,
    setStockHistorySearch,
    setSupplierDebtDialogOpen,
    setSupplierDebtReceiptPreview,
    setTransactionMethodFilter,
    setTransactionPage,
    setTransactionSearch,
    setTransactionStatusFilter,
    setUserRoleFilter,
    setUserSearch,
    settingAppearanceModeOptions,
    settingAppearanceScaleOptions,
    settingReceiptPreviewModels,
    settingReceiptSampleDocument,
    showOperationalPanel,
    showRangeFilter,
    sidebarItems,
    slugFilePart,
    splitImportLine,
    stockActionMessageTimer,
    stockHistoryFilter,
    stockHistoryFilterLabel,
    stockHistoryFilterOpen,
    stockHistoryFilterOptions,
    stockHistoryPage,
    stockHistoryPageCount,
    stockHistoryPageEnd,
    stockHistoryPageSize,
    stockHistoryPageStart,
    stockHistoryRows,
    stockHistorySearch,
    stockHistorySummary,
    storeLogoAcceptedTypes,
    storeLogoMaxSizeBytes,
    storeLogoMaxSizeKb,
    storeName,
    submitCashierCheckout,
    submitCatalogDraft,
    submitCategoryRename,
    submitImportCatalog,
    submitReceivablePayment,
    submitRestockItem,
    submitSupplierDebt,
    submitSupplierDebtPayment,
    submitUserDraft,
    supplierDebtSeedRows,
    syncAppSettings,
    toggleBatchSku,
    toggleCatalogSort,
    toggleCatalogTrail,
    toggleReceiptSection,
    toggleReceivableSort,
    toggleRolePermission,
    toggleTransactionSort,
    totpUserCount,
    transactionMethodFilter,
    transactionMethodOptions,
    transactionPage,
    transactionPageCount,
    transactionPageEnd,
    transactionPageSize,
    transactionPageStart,
    transactionRows,
    transactionSearch,
    transactionSeedRows,
    transactionStatusFilter,
    transactionSummary,
    updateSupplierDebtDraftItem,
    userActionMessage,
    userRoleFilter,
    userRoleOptions,
    userRowsData,
    userSearch,
    userSeedRows,
    visibleSidebarItems,
  } = view;

  return (
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: 'Omzet periode', value: formatRupiahNumber(reportSummary.omzet), icon: CircleDollarSign, tone: 'emerald' as const },
                { label: 'Transaksi', value: `${reportSummary.transactionCount} invoice`, icon: ReceiptText, tone: 'slate' as const },
                { label: 'Kas masuk', value: formatRupiahNumber(reportSummary.paid), icon: Banknote, tone: 'sky' as const },
                { label: 'Estimasi laba', value: formatRupiahNumber(reportDataset.grossProfit), icon: Calculator, tone: 'amber' as const },
                { label: 'Piutang terbuka', value: formatRupiahNumber(reportSummary.receivableRemaining), icon: HandCoins, tone: 'rose' as const },
                { label: 'Hutang supplier', value: formatRupiahNumber(reportSummary.debtRemaining), icon: Landmark, tone: 'slate' as const },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <GradientStatCard key={item.label} title={item.label} value={item.value} icon={Icon} tone={item.tone} />
                );
              })}
            </div>

            <Card>
              <CardHeader className="border-b border-border py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      Laporan
                    </CardTitle>
                    {renderRangeSelector()}
                  </div>
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <Button type="button" variant="outline" className="h-8 rounded-xl px-3 text-xs font-semibold" onClick={openReportPrintPreview}>
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    {renderFeatureModal({
                      title: 'Konfigurasi cetak laporan',
                      trigger: 'Config',
                      icon: Printer,
                      rows: [
                        { label: 'Output', value: 'Preview A4 dan printer' },
                        { label: 'Lampiran', value: 'Log transaksi, audit stok, dan cashflow' },
                        { label: 'Format', value: 'A4 ringkas' },
                        { label: 'Footer', value: 'Nama toko dan waktu cetak' },
                      ],
                      primary: 'Simpan konfigurasi',
                    })}
                    {renderFeatureModal({
                      title: 'Export laporan',
                      trigger: 'Export',
                      icon: Download,
                      rows: [
                        { label: 'PDF', value: 'Ringkasan siap cetak' },
                        { label: 'Excel', value: 'Data transaksi detail' },
                        { label: 'TXT', value: 'Laporan plain text' },
                        { label: 'Periode', value: rangeLabel },
                      ],
                      primary: 'Export file',
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <Tabs value={reportTab} onValueChange={(value) => setReportTab(value as ReportTab)} className="grid gap-3">
                  <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/35 p-1">
                    {[
                      ['sales', 'Penjualan'],
                      ['profit', 'Laba'],
                      ['cashflow', 'Kas'],
                      ['comparison', 'Perbandingan'],
                      ['comprehensive', 'Lengkap'],
                    ].map(([value, label]) => (
                      <TabsTrigger key={value} value={value} className="h-8 rounded-lg px-3 text-xs">
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="sales" className="m-0 grid gap-3">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                      <div className="grid gap-3">
                        <div className="rounded-2xl border border-border bg-card/70 p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              <BarChart3 className="h-4 w-4" />
                              Tren penjualan
                            </div>
                            <Badge variant="secondary" className="rounded-lg">{reportDataset.transactionLog.length} transaksi</Badge>
                          </div>
                          <ChartContainer config={dashboardChartConfig} className="h-[220px] min-h-[220px] w-full">
                            <LineChart accessibilityLayer data={reportTransactionTrend} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                              <CartesianGrid vertical={false} />
                              <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={12}
                                angle={-35}
                                textAnchor="end"
                                tick={{ fontSize: 11, fontStyle: 'italic' }}
                                height={58}
                              />
                              <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `Rp ${value} jt`} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line type="monotone" dataKey="omzet" stroke="var(--color-omzet)" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} />
                              <Line type="monotone" dataKey="masuk" stroke="var(--color-masuk)" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} />
                            </LineChart>
                          </ChartContainer>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-muted/20 p-3">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              <CreditCard className="h-4 w-4" />
                              Metode bayar
                            </div>
                            <ChartContainer config={dashboardChartConfig} className="h-[170px] min-h-[170px] w-full">
                              <BarChart accessibilityLayer data={reportPaymentDistribution} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="method" tickLine={false} axisLine={false} tickMargin={10} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `Rp ${value} jt`} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="total" fill="var(--color-total)" radius={6} />
                              </BarChart>
                            </ChartContainer>
                          </div>
                          <div className="rounded-2xl border border-border bg-muted/20 p-3">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              <Clock3 className="h-4 w-4" />
                              Frekuensi jam
                            </div>
                            <ChartContainer config={dashboardChartConfig} className="h-[170px] min-h-[170px] w-full">
                              <BarChart accessibilityLayer data={reportDataset.hourlyChart} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={10} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="var(--color-count)" radius={6} />
                              </BarChart>
                            </ChartContainer>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="grid gap-2 rounded-2xl border border-border bg-muted/20 p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Keputusan cepat</div>
                          {reportDecisionRows.map((item) => {
                            const Icon = item.icon;

                            return (
                              <div key={item.label} className="grid grid-cols-[30px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-border bg-background/70 px-2.5 py-2">
                                <div className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground">
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                                  <div className="truncate text-sm font-semibold">{item.value}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="rounded-2xl border border-border bg-card/70 p-3">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <Package className="h-4 w-4" />
                            Produk teratas
                          </div>
                          <div className="grid gap-1.5">
                            {reportDataset.topProducts.slice(0, 5).map((item) => (
                              <div key={item.sku || item.name} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">{item.name}</div>
                                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.category} / {item.qty} item</div>
                                </div>
                                <div className="text-right text-xs font-semibold">{formatRupiahNumber(item.total)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="profit" className="m-0 grid gap-3">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        ['Pendapatan', formatRupiahNumber(reportSummary.omzet), 'border-emerald-500/20 bg-emerald-500/8'],
                        ['Estimasi modal', formatRupiahNumber(reportDataset.estimatedCost), 'border-slate-500/20 bg-slate-500/8'],
                        ['Estimasi laba', formatRupiahNumber(reportDataset.grossProfit), 'border-sky-500/20 bg-sky-500/8'],
                        ['Margin', `${reportDataset.margin}%`, 'border-amber-500/20 bg-amber-500/8'],
                      ].map(([label, value, className]) => (
                        <div key={label} className={`rounded-2xl border p-3 ${className}`}>
                          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
                          <div className="mt-1 text-lg font-semibold">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
                      <div className="rounded-2xl border border-border bg-card/70 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <Tags className="h-4 w-4" />
                          Kategori penjualan
                        </div>
                        <ChartContainer config={dashboardChartConfig} className="h-[220px] min-h-[220px] w-full">
                          <BarChart accessibilityLayer data={reportCategoryDistribution} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={10} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `Rp ${value} jt`} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" fill="var(--color-value)" radius={6} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-border">
                        <div className="border-b border-border bg-muted/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Kontributor omzet</div>
                        <div className="max-h-[284px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-card text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2 text-left">Barang</th>
                                <th className="px-3 py-2 text-left">Qty</th>
                                <th className="px-3 py-2 text-right">Omzet</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportDataset.topProducts.map((item) => (
                                <tr key={item.sku || item.name} className="border-t border-border">
                                  <td className="px-3 py-2 font-medium">{item.name}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{item.qty}</td>
                                  <td className="px-3 py-2 text-right font-semibold">{formatRupiahNumber(item.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="cashflow" className="m-0 grid gap-3">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(420px,1.2fr)]">
                      <div className="rounded-2xl border border-border bg-card/70 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <Banknote className="h-4 w-4" />
                          Arus kas
                        </div>
                        <ChartContainer config={dashboardChartConfig} className="h-[220px] min-h-[220px] w-full">
                          <BarChart accessibilityLayer data={reportDataset.cashFlowChart} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `Rp ${value} jt`} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" fill="var(--color-total)" radius={6} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-border">
                        <div className="border-b border-border bg-muted/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rekonsiliasi periode</div>
                        <table className="w-full text-sm">
                          <thead className="bg-card text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left">Periode</th>
                              <th className="px-3 py-2 text-right">Masuk</th>
                              <th className="px-3 py-2 text-right">Keluar</th>
                              <th className="px-3 py-2 text-right">Estimasi</th>
                              <th className="px-3 py-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportDataset.cashFlowRows.map((row) => (
                              <tr key={row.date} className="border-t border-border">
                                <td className="px-3 py-2 font-medium">{row.date}</td>
                                <td className="px-3 py-2 text-right text-emerald-600">{formatRupiahNumber(row.cashSales)}</td>
                                <td className="px-3 py-2 text-right text-rose-600">{formatRupiahNumber(row.adjustmentOut)}</td>
                                <td className="px-3 py-2 text-right font-semibold">{formatRupiahNumber(row.estimatedCash)}</td>
                                <td className="px-3 py-2"><Badge variant="secondary" className="rounded-lg">{row.status}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="comparison" className="m-0 grid gap-3">
                    <div className="overflow-hidden rounded-2xl border border-border">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/25 px-3 py-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Perbandingan internal</div>
                        <Badge variant="secondary" className="rounded-lg">Periode aktif vs pembanding data</Badge>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-card text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left">Metrik</th>
                            <th className="px-3 py-2 text-right">Periode aktif</th>
                            <th className="px-3 py-2 text-right">Pembanding</th>
                            <th className="px-3 py-2 text-right">Perubahan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportDataset.comparisonRows.map((row) => {
                            const diff = row.current - row.previous;
                            const positive = diff >= 0;
                            const current = row.format === 'currency' ? formatRupiahNumber(row.current) : row.current;
                            const previous = row.format === 'currency' ? formatRupiahNumber(row.previous) : row.previous;
                            const diffText = row.format === 'currency' ? formatRupiahNumber(Math.abs(diff)) : Math.abs(diff);

                            return (
                              <tr key={row.label} className="border-t border-border">
                                <td className="px-3 py-2 font-medium">{row.label}</td>
                                <td className="px-3 py-2 text-right font-semibold">{current}</td>
                                <td className="px-3 py-2 text-right text-muted-foreground">{previous}</td>
                                <td className={`px-3 py-2 text-right font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {positive ? '+' : '-'}{diffText}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="comprehensive" className="m-0 grid gap-3">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
                      <div className="rounded-2xl border border-border bg-card/70 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <Boxes className="h-4 w-4" />
                          Top 5 kategori aktif
                        </div>
                        <div className="max-h-[260px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-card text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2 text-left">Kategori</th>
                                <th className="px-3 py-2 text-right">Mutasi</th>
                                <th className="px-3 py-2 text-right">Bersih</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportDataset.stockMovementCategoryRows.map((row) => (
                                <tr key={row.category} className="border-t border-border">
                                  <td className="px-3 py-2 font-medium">{row.category}</td>
                                  <td className="px-3 py-2 text-right">{row.movementCount}</td>
                                  <td className={`px-3 py-2 text-right font-semibold ${row.netMovement >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatSignedNumber(row.netMovement)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          Berdasarkan frekuensi mutasi stok tertinggi.
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/70 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <History className="h-4 w-4" />
                          Trail stok terbaru
                        </div>
                        <div className="grid max-h-[260px] gap-1.5 overflow-y-auto">
                          {reportDataset.stockTrailRows.map((row, index) => {
                            const movement = Number(row.movement) || 0;
                            const positive = movement >= 0;

                            return (
                              <div key={`${row.time}-${row.item}-${index}`} className="grid grid-cols-[minmax(0,1fr)_80px] items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">{row.item}</div>
                                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{row.event} / {row.time}</div>
                                </div>
                                <div className={`text-right text-sm font-bold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formatSignedNumber(movement)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-border bg-card/70">
                <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top 5 pelanggan</div>
                  <Badge variant="secondary" className="rounded-lg">{reportDataset.customerByName.length} data</Badge>
                </div>
                <div className="max-h-[220px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Pelanggan</th>
                        <th className="px-3 py-2 text-right">Transaksi</th>
                        <th className="px-3 py-2 text-right">Omzet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportDataset.customerByName.map((row) => (
                        <tr key={row.label} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{row.label}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{row.count}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatRupiahNumber(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card/70">
                <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top 5 alamat pelanggan</div>
                  <Badge variant="secondary" className="rounded-lg">{reportDataset.customerByAddress.length} data</Badge>
                </div>
                <div className="max-h-[220px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-card text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Alamat</th>
                        <th className="px-3 py-2 text-right">Transaksi</th>
                        <th className="px-3 py-2 text-right">Omzet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportDataset.customerByAddress.map((row) => (
                        <tr key={row.label} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{row.label}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{row.count}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatRupiahNumber(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
}

export function UsersView({ view }: LegacyViewProps) {
  const {
    LazyDatabaseView,
    LazySettingView,
    activeSessionRole,
    activeSessionUser,
    activeSettingReceiptPreview,
    activeUserCount,
    addCashierCartItem,
    adminUrl,
    applyAppSettings,
    applyAppearanceSettings,
    applyCashierCalculatorToPayment,
    applyReceiptTemplatePreset,
    applyReceivablePaymentHistory,
    applySupplierDebtItems,
    applySupplierDebtPaymentHistory,
    buildAppSettingsPayload,
    buildCashierReceiptDocumentData,
    buildCashierReceiptHtml,
    buildCashierReceiptPreview,
    buildReportPrintHtml,
    buildSettingReceiptPreviewHtml,
    buildTransactionReceiptPreview,
    canManageRolePermissions,
    cashierCartItems,
    cashierCatalog,
    cashierCategories,
    cashierCategoryFilter,
    cashierCategoryFilterOpen,
    cashierChange,
    cashierDiscountModes,
    cashierDiscountValue,
    cashierDraftRows,
    cashierGrandTotal,
    cashierHoldRows,
    cashierPaidValue,
    cashierPaymentAmount,
    cashierPaymentMethods,
    cashierPaymentStatus,
    cashierPaymentStatuses,
    cashierRecentItems,
    cashierRemaining,
    cashierScanBufferRef,
    cashierScanCandidateRef,
    cashierScanError,
    cashierScanTimesRef,
    cashierSearch,
    cashierSubtotal,
    catalogCategories,
    catalogPageCount,
    catalogPageEnd,
    catalogPageSize,
    catalogPageStart,
    catalogRows,
    categoryBadgeClasses,
    categorySummary,
    cleanResetStorageKey,
    clearCashierScanBuffer,
    clearStoreLogo,
    compareCatalogValues,
    compareReceivableValues,
    compareTransactionValues,
    confirmDeleteCatalog,
    confirmDeleteUser,
    copyAdminUrl,
    copyPriceCheckerUrl,
    createDefaultSupplierDebtDraft,
    createEmptySupplierDebtItem,
    criticalLowStockCount,
    dashboardChartConfig,
    dashboardKpis,
    dashboardLatestTransactions,
    dashboardOperations,
    databaseBackupFallbackRows,
    databaseBackupVisibleRows,
    databaseEntityStats,
    databaseExportStamp,
    databaseHealthFallback,
    databaseHealthVisible,
    databaseMutationCount,
    databaseNextBackupLabel,
    databaseSizeEstimate,
    debtSearch,
    debtStatusFilter,
    debtSummary,
    decrementCashierCartItem,
    defaultCashierCheckoutForm,
    defaultReceiptPreviewDocument,
    defaultRolePermissions,
    defaultSettingAppearance,
    defaultSettingReceiptLayout,
    defaultSettingReceiptSections,
    deferredCashierSearch,
    deferredCatalogSearch,
    deferredDebtSearch,
    deferredLowStockSearch,
    deferredReceivableSearch,
    deferredStockHistorySearch,
    deferredTransactionSearch,
    deferredUserSearch,
    deleteReceivablePayment,
    deleteSupplierDebt,
    deleteSupplierDebtPayment,
    describeCatalogTrail,
    escapeCsvValue,
    escapeReceiptHtml,
    evaluateCashierExpression,
    expandedDebtId,
    expandedTransactionInvoice,
    exportCatalogToCsv,
    exportDatabaseSummaryWorkbook,
    exportStockHistoryToCsv,
    exportTransactionsWorkbook,
    filteredDebtRows,
    filteredReceivableRows,
    filteredTransactionRows,
    filteredUserRows,
    findCashierCatalogItem,
    formatCashierDiscountInput,
    formatReceiptAmount,
    formatRupiahInput,
    formatRupiahNumber,
    formatSignedNumber,
    getCashierDiscountValue,
    getCatalogDraftValidationError,
    getCatalogDuplicateKey,
    getCatalogSortIcon,
    getCatalogTrailRowsForItem,
    getCategoryBadgeClass,
    getExportFileName,
    getLowStockStatus,
    getLowStockSuggestion,
    getReceiptPreviewDimensions,
    getReceivableProgress,
    getReceivableSortIcon,
    getReportTabTitle,
    getRupiahNumber,
    getStockHistoryEventVariant,
    getStockHistoryMovementIcon,
    getStockHistoryMovementTone,
    getSupplierDebtDuplicateWarning,
    getSupplierDebtItemSubtotal,
    getSupplierDebtProgress,
    getTransactionSortIcon,
    handleCashierCalculatorCompute,
    handleCashierSearchKeyDown,
    handleDatabaseAction,
    handleImportFile,
    handleSettingAction,
    handleStoreLogoUpload,
    handleTotpDisable,
    handleTotpSetup,
    handleTotpVerify,
    handleUserPasswordReset,
    hasCleanResetFlag,
    isDateInBounds,
    isReceivableOverdue,
    isSupplierDebtOverdue,
    lanAdminUrl,
    lanPriceCheckerUrl,
    loadXlsxModule,
    localFinanceEnabled,
    localReportCategoryDistribution,
    localReportDataset,
    localReportDecisionRows,
    localReportPaymentDistribution,
    localReportReceivableDebtChart,
    localReportStockMovementChart,
    localReportSummary,
    localReportTransactionTrend,
    lowStockCategoryOptions,
    lowStockCount,
    lowStockItems,
    mockSettingsStorageKey,
    mockUsersStorageKey,
    mockWorkspaceStorageKey,
    navigateMenu,
    normalizeCatalogDraftPrice,
    normalizeTransactionLineItem,
    openAuditDialog,
    openCreateCatalogDialog,
    openCreateUserDialog,
    openDebtCount,
    openDeleteCatalogDialog,
    openDeleteUserDialog,
    openEditCatalogDialog,
    openEditUserDialog,
    openPrintCatalogDialog,
    openReceivableCount,
    openReceivablePaymentModal,
    openReceivableReceiptPreview,
    openReportPrintPreview,
    openRestockDialog,
    openSupplierDebtPaymentModal,
    openSupplierDebtPrintPreview,
    paginatedCatalogRows,
    paginatedReceivableRows,
    paginatedStockHistoryRows,
    paginatedTransactionRows,
    parseDisplayDate,
    parseImportText,
    parseReceivableDueDate,
    performDatabaseBackup,
    performDatabaseDelete,
    performDatabaseHardReset,
    performDatabaseMaintenance,
    performDatabaseRestore,
    permissionModuleRows,
    persistCashierSession,
    persistRolePermissions,
    priceCheckerUrl,
    printCashierReceiptPreview,
    printReceivableReceiptPreview,
    printReportPreviewHtml,
    printSupplierDebtReceiptPreview,
    processCashierScannedCode,
    pushStockActionMessage,
    rangeLabel,
    rangedReceivableRowsData,
    rangedStockHistoryRows,
    rangedSupplierDebtRows,
    rangedTransactionRows,
    receivableExpandedInvoice,
    receivableMethodFilter,
    receivableOverdueOnly,
    receivablePage,
    receivablePageCount,
    receivablePageEnd,
    receivablePageSize,
    receivablePageStart,
    receivableRows,
    receivableSearch,
    receivableSeedRows,
    receivableStatusFilter,
    receivableSummary,
    refreshDatabaseBackups,
    refreshUserAccess,
    removeCashierCartItem,
    renderAuditDialog,
    renderBatchBarcodeModal,
    renderCashierCalculatorModal,
    renderCashierCheckoutModal,
    renderCashierReceiptPreviewModal,
    renderCashierSessionModal,
    renderCatalogDeleteModal,
    renderCatalogEditorButton,
    renderCatalogEditorModal,
    renderCatalogPrintModal,
    renderCatalogSortHeader,
    renderCategoryManagerModal,
    renderExportCatalogModal,
    renderFeatureModal,
    renderImportBarangModal,
    renderLowStockExportModal,
    renderLowStockUpdateModal,
    renderRangeSelector,
    renderReceivablePaymentModal,
    renderReceivableReceiptPreviewModal,
    renderReceivableSortHeader,
    renderReportPrintPreviewModal,
    renderRolePermissionDialog,
    renderSettingView,
    renderStockThresholdModal,
    renderSupplierDebtDialog,
    renderSupplierDebtPaymentModal,
    renderSupplierDebtReceiptPreviewModal,
    renderTotpSetupDialog,
    renderTransactionSortHeader,
    renderUserDeleteDialog,
    renderUserEditorDialog,
    replaceUserRow,
    reportCashFlow,
    reportCategoryDistribution,
    reportCategorySales,
    reportDataset,
    reportDecisionRows,
    reportPaymentDistribution,
    reportPaymentMix,
    reportReceivableDebtChart,
    reportSalesTrend,
    reportStockMovementChart,
    reportSummary,
    reportTab,
    reportTransactionTrend,
    resetCashierCart,
    resetCashierTransactionState,
    resetHardResetDialog,
    resetRangeToToday,
    resetRequiredUserCount,
    resetRolePermissionsToDefault,
    resetSettingsToDefault,
    restockTargetItem,
    restoreCashierSession,
    sales7Days,
    salesByHour,
    saveAppSettings,
    saveBinaryFile,
    saveWorkbookFile,
    selectedBatchItems,
    selectedRangeBounds,
    setCashierCartItemQty,
    setCashierCategoryFilter,
    setCashierCategoryFilterOpen,
    setCashierFormField,
    setCashierPaymentAmount,
    setCashierReceiptOpen,
    setCashierReceiptPreview,
    setCashierSearch,
    setDebtSearch,
    setDebtStatusFilter,
    setExpandedDebtId,
    setExpandedTransactionInvoice,
    setReceivableExpandedInvoice,
    setReceivableMethodFilter,
    setReceivableOverdueOnly,
    setReceivablePage,
    setReceivableSearch,
    setReceivableStatusFilter,
    setReportTab,
    setStockHistoryFilter,
    setStockHistoryFilterOpen,
    setStockHistoryPage,
    setStockHistorySearch,
    setSupplierDebtDialogOpen,
    setSupplierDebtReceiptPreview,
    setTransactionMethodFilter,
    setTransactionPage,
    setTransactionSearch,
    setTransactionStatusFilter,
    setUserRoleFilter,
    setUserSearch,
    settingAppearanceModeOptions,
    settingAppearanceScaleOptions,
    settingReceiptPreviewModels,
    settingReceiptSampleDocument,
    showOperationalPanel,
    showRangeFilter,
    sidebarItems,
    slugFilePart,
    splitImportLine,
    stockActionMessageTimer,
    stockHistoryFilter,
    stockHistoryFilterLabel,
    stockHistoryFilterOpen,
    stockHistoryFilterOptions,
    stockHistoryPage,
    stockHistoryPageCount,
    stockHistoryPageEnd,
    stockHistoryPageSize,
    stockHistoryPageStart,
    stockHistoryRows,
    stockHistorySearch,
    stockHistorySummary,
    storeLogoAcceptedTypes,
    storeLogoMaxSizeBytes,
    storeLogoMaxSizeKb,
    storeName,
    submitCashierCheckout,
    submitCatalogDraft,
    submitCategoryRename,
    submitImportCatalog,
    submitReceivablePayment,
    submitRestockItem,
    submitSupplierDebt,
    submitSupplierDebtPayment,
    submitUserDraft,
    supplierDebtSeedRows,
    syncAppSettings,
    toggleBatchSku,
    toggleCatalogSort,
    toggleCatalogTrail,
    toggleReceiptSection,
    toggleReceivableSort,
    toggleRolePermission,
    toggleTransactionSort,
    totpUserCount,
    transactionMethodFilter,
    transactionMethodOptions,
    transactionPage,
    transactionPageCount,
    transactionPageEnd,
    transactionPageSize,
    transactionPageStart,
    transactionRows,
    transactionSearch,
    transactionSeedRows,
    transactionStatusFilter,
    transactionSummary,
    updateSupplierDebtDraftItem,
    userActionMessage,
    userRoleFilter,
    userRoleOptions,
    userRowsData,
    userSearch,
    userSeedRows,
    visibleSidebarItems,
  } = view;

  return (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { label: 'User aktif', value: `${activeUserCount}`, note: `${userRowsData.length} akun terdaftar`, icon: Users, tone: 'emerald' as const },
                { label: 'Admin TOTP', value: `${totpUserCount}`, note: 'Proteksi aksi sensitif', icon: ShieldCheck, tone: 'sky' as const },
                { label: 'Reset password', value: `${resetRequiredUserCount}`, note: 'Perlu bantuan admin', icon: KeyRound, tone: 'amber' as const },
                { label: 'Role kasir', value: `${userRowsData.filter((row) => row.role === 'Kasir').length}`, note: 'Akses transaksi harian', icon: ShoppingCart, tone: 'rose' as const },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <GradientStatCard key={item.label} title={item.label} value={item.value} note={item.note} icon={Icon} tone={item.tone} valueClassName="text-2xl" />
                );
              })}
            </div>

            {userActionMessage ? (
              <div className={[
                'rounded-xl border px-3 py-2 text-xs font-medium',
                userActionMessage.tone === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
              ].join(' ')}>
                {userActionMessage.text}
              </div>
            ) : null}
            {renderTotpSetupDialog()}

            <Card className="overflow-hidden">
              <CardHeader className="sticky top-0 z-10 border-b border-border bg-card/95 pb-3 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Manajemen Pengguna
                    </CardTitle>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{filteredUserRows.length} akun tampil</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-8 items-center gap-2 rounded-xl border border-border bg-background px-2.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        className="h-full w-44 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                        placeholder="Cari user..."
                      />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl px-3 text-xs">
                          <Filter className="h-3.5 w-3.5" />
                          {userRoleFilter}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-44 p-2">
                        <div className="grid gap-1">
                          {userRoleOptions.map((role) => (
                            <Button
                              key={role}
                              type="button"
                              variant={userRoleFilter === role ? 'default' : 'ghost'}
                              size="sm"
                              className="h-8 justify-start rounded-lg text-xs"
                              onClick={() => setUserRoleFilter(role)}
                            >
                              {role}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {renderRolePermissionDialog()}
                    <Button type="button" size="sm" className="h-8 gap-1.5 rounded-xl px-3 text-xs" onClick={openCreateUserDialog}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Tambah
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl px-3 text-xs" onClick={() => void openAuditDialog()}>
                      <History className="h-3.5 w-3.5" />
                      Audit
                    </Button>
                    {renderUserEditorDialog()}
                    {renderUserDeleteDialog()}
                    {renderAuditDialog()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 p-3">
                <div className="hidden grid-cols-[minmax(230px,1.15fr)_120px_150px_150px_minmax(180px,1fr)_180px] gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground xl:grid">
                  <div>User</div>
                  <div>Role</div>
                  <div>Keamanan</div>
                  <div>Login terakhir</div>
                  <div>Akses</div>
                  <div className="text-right">Aksi</div>
                </div>

                {filteredUserRows.length ? (
                  filteredUserRows.map((row) => (
                    <div key={row.id} className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 xl:grid-cols-[minmax(230px,1.15fr)_120px_150px_150px_minmax(180px,1fr)_180px] xl:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <ContextIcon label={`${row.name} ${row.role} ${row.status}`} className={row.status === 'Aktif' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{row.name}</div>
                          <div className="truncate text-xs text-muted-foreground">@{row.username} / {row.device}</div>
                        </div>
                      </div>
                      <Badge variant={row.role === 'Admin' ? 'default' : row.role === 'Supervisor' ? 'secondary' : 'outline'} className="w-fit rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                        {row.role}
                      </Badge>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={row.security.includes('TOTP') ? 'success' : row.security.includes('Reset') ? 'warning' : 'secondary'} className="w-fit rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                          {row.security}
                        </Badge>
                        <Badge variant={row.status === 'Aktif' ? 'success' : 'warning'} className="w-fit rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                          {row.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{row.lastLogin}</div>
                      <div className="text-sm text-muted-foreground">{row.scope}</div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-2 text-[10px]" onClick={() => void handleUserPasswordReset(row)}>
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset
                        </Button>
                        {row.security.includes('TOTP') ? (
                          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-2 text-[10px]" onClick={() => void handleTotpDisable(row)}>
                            <EyeOff className="h-3.5 w-3.5" />
                            TOTP
                          </Button>
                        ) : (
                          <Button type="button" variant="default" size="sm" className="h-8 rounded-lg px-2 text-[10px]" onClick={() => void handleTotpSetup(row)}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            TOTP
                          </Button>
                        )}
                        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-2 text-[10px]" onClick={() => openEditUserDialog(row)}>
                          <Wrench className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-[10px]"
                          disabled={row.id === activeSessionUser.id}
                          title={row.id === activeSessionUser.id ? 'User aktif saat ini tidak bisa dihapus.' : 'Hapus user'}
                          onClick={() => openDeleteUserDialog(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid place-items-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    Tidak ada pengguna yang cocok dengan filter.
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

  );
}
