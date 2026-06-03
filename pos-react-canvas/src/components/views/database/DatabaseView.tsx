import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gauge,
  History,
  KeyRound,
  Monitor,
  Package,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import type { DatabaseActionTone, DatabaseTab, PosMenuId } from '../../../contracts/pos-ui';
import { posApi } from '@/services/posApi';
import type { DatabaseBackupRow, DatabaseHealthPayload } from '@/services/posApi.types';

type DatabaseStatItem = {
  label: string;
  value: number;
  className: string;
};

type DatabaseActionMessage = {
  tone: DatabaseActionTone;
  text: string;
};

type DatabaseViewProps = {
  databaseActionMessage: DatabaseActionMessage | null;
  databaseAutoBackupEnabled: boolean;
  databaseBackupVisibleRows: DatabaseBackupRow[];
  databaseEntityStats: DatabaseStatItem[];
  databaseExportStamp: string;
  databaseHardResetConfirmation: string;
  databaseHardResetError: string;
  databaseHardResetOpen: boolean;
  databaseHardResetReason: string;
  databaseHardResetSaving: boolean;
  databaseHealthVisible: DatabaseHealthPayload;
  databaseMutationCount: number;
  databaseNextBackupLabel: string;
  databaseSizeEstimate: string;
  databaseTab: DatabaseTab;
  exportCatalogToCsv: () => void | Promise<void>;
  exportDatabaseSummaryWorkbook: (fileName: string) => void | Promise<void>;
  exportStockHistoryToCsv: () => void | Promise<void>;
  exportTransactionsWorkbook: (fileName: string) => void | Promise<void>;
  handleDatabaseAction: (text: string, tone?: DatabaseActionTone) => void;
  performDatabaseBackup: (mode: 'latest' | 'archive', successText: string) => void | Promise<void>;
  performDatabaseDelete: (file: string) => void | Promise<void>;
  performDatabaseHardReset: () => void | Promise<void>;
  performDatabaseMaintenance: (action: 'integrity' | 'vacuum' | 'checkpoint') => void | Promise<void>;
  performDatabaseRestore: (file: string) => void | Promise<void>;
  refreshDatabaseBackups: () => void | Promise<void>;
  resetHardResetDialog: () => void;
  resetSettingsToDefault: () => void | Promise<void>;
  setActiveMenu: (menu: PosMenuId) => void;
  setDatabaseActionMessage: (message: DatabaseActionMessage | null) => void;
  setDatabaseAutoBackupEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setDatabaseHardResetConfirmation: (value: string) => void;
  setDatabaseHardResetOpen: (open: boolean) => void;
  setDatabaseHardResetReason: (value: string) => void;
  setDatabaseTab: (tab: DatabaseTab) => void;
};

const statIcons: Record<string, LucideIcon> = {
  Barang: Package,
  Kategori: Archive,
  Transaksi: FileText,
  'Item transaksi': FileSpreadsheet,
  'Riwayat stok': History,
  'Piutang terbuka': Activity,
  'Hutang supplier': Archive,
  'Sesi kasir': Monitor,
};

function actionBadgeVariant(tone: DatabaseActionTone) {
  if (tone === 'danger') return 'danger';
  if (tone === 'warning') return 'warning';
  return 'success';
}

function actionBadgeLabel(tone: DatabaseActionTone) {
  if (tone === 'danger') return 'Butuh admin';
  if (tone === 'warning') return 'Perhatian';
  return 'Siap';
}

function ContextIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/70 text-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function DatabaseView(props: DatabaseViewProps) {
  const {
    databaseActionMessage,
    databaseAutoBackupEnabled,
    databaseBackupVisibleRows,
    databaseEntityStats,
    databaseExportStamp,
    databaseHardResetConfirmation,
    databaseHardResetError,
    databaseHardResetOpen,
    databaseHardResetReason,
    databaseHardResetSaving,
    databaseHealthVisible,
    databaseMutationCount,
    databaseNextBackupLabel,
    databaseSizeEstimate,
    databaseTab,
    exportCatalogToCsv,
    exportDatabaseSummaryWorkbook,
    exportStockHistoryToCsv,
    exportTransactionsWorkbook,
    handleDatabaseAction,
    performDatabaseBackup,
    performDatabaseDelete,
    performDatabaseHardReset,
    performDatabaseMaintenance,
    performDatabaseRestore,
    refreshDatabaseBackups,
    resetHardResetDialog,
    resetSettingsToDefault,
    setActiveMenu,
    setDatabaseActionMessage,
    setDatabaseAutoBackupEnabled,
    setDatabaseHardResetConfirmation,
    setDatabaseHardResetOpen,
    setDatabaseHardResetReason,
    setDatabaseTab,
  } = props;

  const latestBackup = databaseBackupVisibleRows[0]?.file;

  return (
    <div className="grid gap-4">
      <Dialog
        open={databaseHardResetOpen}
        onOpenChange={(open) => {
          setDatabaseHardResetOpen(open);
          if (!open) {
            resetHardResetDialog();
          }
        }}
      >
        <DialogContent className="w-[min(94vw,34rem)] border-rose-500/25">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              Hard reset database
            </DialogTitle>
            <DialogDescription>
              Reset menghapus barang, transaksi, hutang, piutang, stok, dan setting toko. Sistem membuat auto-backup terlebih dahulu.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Alasan reset</span>
              <textarea
                value={databaseHardResetReason}
                onChange={(event) => setDatabaseHardResetReason(event.target.value)}
                className="min-h-20 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-rose-400/60"
                maxLength={240}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ketik RESET</span>
              <input
                value={databaseHardResetConfirmation}
                onChange={(event) => setDatabaseHardResetConfirmation(event.target.value.toUpperCase())}
                className="h-10 rounded-xl border border-border bg-background px-3 font-mono text-sm tracking-[0.18em] outline-none focus:border-rose-400/60"
                placeholder="RESET"
              />
            </label>
            {databaseHardResetError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-200">
                {databaseHardResetError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={databaseHardResetSaving}>
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={databaseHardResetSaving || databaseHardResetConfirmation !== 'RESET'}
              onClick={() => void performDatabaseHardReset()}
            >
              <Trash2 className="h-4 w-4" />
              {databaseHardResetSaving ? 'Mereset...' : 'Jalankan hard reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Status DB', value: databaseHealthVisible.ok ? 'Sehat' : 'Periksa', icon: ShieldCheck, className: 'border-emerald-500/20 bg-emerald-500/8' },
          { label: 'Ukuran file', value: databaseSizeEstimate, icon: Database, className: 'border-sky-500/20 bg-sky-500/8' },
          { label: 'Backup terakhir', value: databaseBackupVisibleRows[0]?.time ?? 'Belum ada', icon: Save, className: 'border-amber-500/20 bg-amber-500/8' },
          { label: 'Mutasi data', value: databaseMutationCount.toLocaleString('id-ID'), icon: Activity, className: 'border-rose-500/20 bg-rose-500/8' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`flex min-w-0 items-center gap-3 rounded-2xl border-0 p-3.5 ${item.className}`}>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-background/80 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                <div className="truncate text-sm font-semibold">{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="border-b border-border py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <Database className="h-4 w-4" />
              Database
            </CardTitle>
            <div className="flex flex-nowrap items-center gap-2">
              <Button type="button" title="Cek integritas" aria-label="Cek integritas" variant="outline" className="h-7 w-7 rounded-lg p-0" onClick={() => void performDatabaseMaintenance('integrity')}>
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button type="button" title="Backup cepat" aria-label="Backup cepat" className="h-7 w-7 rounded-lg p-0" onClick={() => void performDatabaseBackup('latest', 'Backup cepat tersimpan di file latest.')}>
                <Save className="h-3 w-3" />
              </Button>
              <Button type="button" title="Restore database" aria-label="Restore database" variant="outline" className="h-7 w-7 rounded-lg p-0" onClick={() => latestBackup ? void performDatabaseRestore(latestBackup) : handleDatabaseAction('Belum ada backup yang bisa dipulihkan.', 'warning')}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-3">
          {databaseActionMessage ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <Badge variant={actionBadgeVariant(databaseActionMessage.tone)} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                  {actionBadgeLabel(databaseActionMessage.tone)}
                </Badge>
                <span className="truncate text-muted-foreground">{databaseActionMessage.text}</span>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={() => setDatabaseActionMessage(null)}>
                Tutup
              </Button>
            </div>
          ) : null}

          <Tabs value={databaseTab} onValueChange={(value) => setDatabaseTab(value as DatabaseTab)} className="grid gap-3">
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/35 p-1">
              {[
                ['health', 'Kesehatan'],
                ['backup', 'Backup'],
                ['maintenance', 'Maintenance'],
                ['export', 'Export'],
                ['advanced', 'Advanced'],
              ].map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="h-8 rounded-lg px-3 text-xs">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="health" className="m-0 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="overflow-x-auto rounded-2xl border border-border bg-card/70">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[minmax(180px,1fr)_110px_180px] gap-2 border-b border-border bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">
                    <div>Entitas</div>
                    <div className="text-right">Jumlah</div>
                    <div>Status</div>
                  </div>
                  {databaseEntityStats.map((item) => {
                    const Icon = statIcons[item.label] ?? Database;
                    return (
                      <div key={item.label} className="grid grid-cols-[minmax(180px,1fr)_110px_180px] items-center gap-2 border-b border-border/70 px-3 py-2.5 text-sm last:border-b-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${item.className}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="truncate font-medium">{item.label}</span>
                        </div>
                        <div className="text-right font-semibold">{item.value.toLocaleString('id-ID')}</div>
                        <Badge variant="success" className="w-fit rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                          Terindeks
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid content-start gap-3">
                <div className="rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    Health check
                  </div>
                  {[
                    ['Integrity check', databaseHealthVisible.database],
                    ['Schema version', databaseHealthVisible.schemaVersion],
                    ['WAL mode', databaseHealthVisible.journalMode],
                    ['Lokasi data', databaseHealthVisible.dbPath],
                  ].map(([label, value]) => (
                    <div key={label} className="mb-2 grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-lg border border-border bg-background px-3 py-2 text-xs last:mb-0">
                      <span className="truncate text-muted-foreground">{label}</span>
                      <span className="truncate text-right font-medium" title={value}>{value}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3 text-xs leading-relaxed text-muted-foreground">
                  Restore, reset, dan maintenance harus membuat backup atau mencatat audit sebelum data berubah.
                </div>
              </div>
            </TabsContent>

            <TabsContent value="backup" className="m-0 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { title: 'Backup cepat', note: 'Snapshot ke latest lokal.', icon: Save, action: () => performDatabaseBackup('latest', 'Backup cepat tersimpan di file latest.') },
                  { title: 'Arsip backup', note: 'Simpan salinan berstempel waktu.', icon: FolderOpen, action: () => performDatabaseBackup('archive', 'Backup arsip tersimpan dan latest ikut diperbarui.') },
                  { title: 'Folder aktif', note: databaseHealthVisible.backupDir, icon: Settings2, action: () => handleDatabaseAction(`Folder backup aktif: ${databaseHealthVisible.backupDir}.`) },
                  { title: 'Restore latest', note: latestBackup ?? 'Belum ada backup', icon: RotateCcw, action: () => latestBackup ? performDatabaseRestore(latestBackup) : handleDatabaseAction('Belum ada backup yang bisa dipulihkan.', 'warning') },
                ].map((item) => (
                  <div key={item.title} className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                    <div className="flex items-start gap-3">
                      <ContextIcon icon={item.icon} />
                      <div className="grid min-w-0 gap-1">
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.note}</div>
                      </div>
                    </div>
                    <Button type="button" className="h-8 rounded-lg text-xs" onClick={() => void item.action()}>
                      Jalankan
                    </Button>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card/70 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    Backup otomatis
                  </div>
                  <Badge variant={databaseAutoBackupEnabled ? 'success' : 'secondary'} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                    {databaseAutoBackupEnabled ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Jadwal: {databaseNextBackupLabel}. File latest ditimpa setelah snapshot baru valid.</div>
                  <Button
                    type="button"
                    variant={databaseAutoBackupEnabled ? 'outline' : 'default'}
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => {
                      setDatabaseAutoBackupEnabled((current) => !current);
                      handleDatabaseAction(databaseAutoBackupEnabled ? 'Backup otomatis harian dinonaktifkan.' : 'Backup otomatis harian diaktifkan.');
                    }}
                  >
                    {databaseAutoBackupEnabled ? 'Matikan' : 'Aktifkan'}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border bg-card/70">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[minmax(260px,1fr)_150px_90px_90px_150px] gap-2 border-b border-border bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">
                    <div>File backup</div>
                    <div>Waktu</div>
                    <div>Ukuran</div>
                    <div>Status</div>
                    <div className="text-right">Aksi</div>
                  </div>
                  {databaseBackupVisibleRows.map((row) => (
                    <div key={row.file} className="grid grid-cols-[minmax(260px,1fr)_150px_90px_90px_150px] items-center gap-2 border-b border-border/70 px-3 py-2.5 text-sm last:border-b-0">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{row.file}</div>
                        <div className="truncate text-xs text-muted-foreground">{row.note}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{row.time}</div>
                      <div className="text-xs font-medium">{row.size}</div>
                      <Badge variant={row.latest ? 'success' : 'outline'} className="w-fit rounded-md px-2 py-0.5 text-[10px]">
                        {row.latest ? 'Latest' : row.status}
                      </Badge>
                      <div className="flex justify-end gap-1.5">
                        <Button type="button" variant="outline" className="h-7 rounded-lg px-2 text-[10px]" onClick={() => void performDatabaseRestore(row.file)}>
                          Restore
                        </Button>
                        <Button type="button" variant="outline" className="h-7 rounded-lg px-2 text-[10px] text-red-200" onClick={() => void performDatabaseDelete(row.file)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="m-0 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { title: 'Cek integritas', note: 'PRAGMA integrity_check.', icon: ShieldCheck, action: () => performDatabaseMaintenance('integrity') },
                { title: 'Optimasi VACUUM', note: 'Kompaksi database.', icon: Gauge, action: () => performDatabaseMaintenance('vacuum') },
                { title: 'Checkpoint WAL', note: 'Pangkas file WAL/SHM.', icon: Wrench, action: () => performDatabaseMaintenance('checkpoint') },
                { title: 'Arsip transaksi', note: 'Backup arsip sebelum tutup toko.', icon: Archive, action: () => performDatabaseBackup('archive', 'Backup arsip selesai dan latest diperbarui.') },
              ].map((item) => (
                <div key={item.title} className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="flex items-start gap-3">
                    <ContextIcon icon={item.icon} />
                    <div className="grid min-w-0 gap-1">
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="text-xs leading-relaxed text-muted-foreground">{item.note}</div>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => void item.action()}>
                    Jalankan
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="export" className="m-0 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { title: 'Transaksi XLSX', file: `TOKO-BERSAMA-transaksi-${databaseExportStamp}.xlsx`, icon: FileSpreadsheet, action: () => exportTransactionsWorkbook(`TOKO-BERSAMA-transaksi-${databaseExportStamp}.xlsx`) },
                { title: 'Katalog barang', file: `TOKO-BERSAMA-katalog-${databaseExportStamp}.csv`, icon: Package, action: () => exportCatalogToCsv() },
                { title: 'Ringkasan DB', file: `TOKO-BERSAMA-database-${databaseExportStamp}.xlsx`, icon: FileText, action: () => exportDatabaseSummaryWorkbook(`TOKO-BERSAMA-database-${databaseExportStamp}.xlsx`) },
                { title: 'Audit stok', file: `TOKO-BERSAMA-audit-stok-${databaseExportStamp}.csv`, icon: History, action: () => exportStockHistoryToCsv() },
              ].map((item) => (
                <div key={item.title} className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="flex items-start gap-3">
                    <ContextIcon icon={item.icon} />
                    <div className="grid min-w-0 gap-1">
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{item.file}</div>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => void item.action()}>
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="advanced" className="m-0 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { title: 'Validasi backup', note: 'Cek integritas sebelum restore.', icon: ShieldCheck, action: () => performDatabaseMaintenance('integrity'), danger: false },
                { title: 'Reset setting', note: 'Kembalikan setting ke standar.', icon: RotateCcw, action: () => resetSettingsToDefault(), danger: false },
                { title: 'Recovery user', note: 'Buka halaman pengguna.', icon: UserPlus, action: () => setActiveMenu('Pengguna'), danger: false },
                { title: 'Hard reset', note: 'Danger zone dengan auto-backup.', icon: AlertTriangle, action: () => setDatabaseHardResetOpen(true), danger: true },
              ].map((item) => (
                <div key={item.title} className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="flex items-start gap-3">
                    <ContextIcon icon={item.icon} />
                    <div className="grid min-w-0 gap-1">
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="text-xs leading-relaxed text-muted-foreground">{item.note}</div>
                    </div>
                  </div>
                  <Button type="button" variant={item.danger ? 'destructive' : 'outline'} className="h-8 rounded-lg text-xs" onClick={() => void item.action()}>
                    Jalankan
                  </Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-border bg-muted/20 p-3">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <KeyRound className="h-4 w-4" />
          Safety rules
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {[
            'Maintenance database wajib lewat local-api.',
            'Restore dan reset mencabut sesi aktif.',
            'Backup latest ditimpa hanya setelah snapshot baru valid.',
            'Hard reset tetap membutuhkan konfirmasi RESET.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs leading-relaxed">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
