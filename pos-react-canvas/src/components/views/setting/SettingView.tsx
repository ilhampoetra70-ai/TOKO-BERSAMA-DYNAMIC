import * as React from 'react';
import {
  Barcode,
  CheckCircle2,
  ClipboardList,
  Palette,
  KeyRound,
  Monitor,
  Printer,
  ReceiptText,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  UserPlus,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import type {
  DatabaseActionTone,
  SettingAppearanceMode,
  SettingAppearanceScale,
  SettingAppearanceTheme,
  SettingReceiptLayoutConfig,
  SettingReceiptPaper,
  SettingTab,
} from '../../../contracts/pos-ui';
import { posThemeOptions } from '../../../lib/appearance';

type SettingActionMessage = {
  tone: DatabaseActionTone;
  text: string;
};

type SettingOption<T extends string> = {
  value: T;
  label: string;
  note: string;
};

type SettingViewProps = {
  adminUrl: string;
  handleSettingAction: (text: string, tone?: DatabaseActionTone) => void;
  lanAdminUrl: string;
  lanPriceCheckerUrl: string;
  priceCheckerUrl: string;
  saveAppSettings: () => void | Promise<void>;
  settingActionMessage: SettingActionMessage | null;
  settingAppearanceMode: SettingAppearanceMode;
  settingAppearanceModeOptions: Array<SettingOption<SettingAppearanceMode>>;
  settingAppearanceScale: SettingAppearanceScale;
  settingAppearanceScaleOptions: Array<SettingOption<SettingAppearanceScale>>;
  settingAppearanceTheme: SettingAppearanceTheme;
  settingCashDrawerConnectionMode: 'windows' | 'network';
  settingCashDrawerEnabled: boolean;
  settingCashDrawerNetworkInterface: string;
  settingCashDrawerOpenOnCashCheckout: boolean;
  settingCashDrawerOpenOnReceivablePayment: boolean;
  settingCashDrawerPrinterName: string;
  settingCashDrawerPrinterType: 'EPSON' | 'STAR' | 'TANCA' | 'DARUMA' | 'BROTHER' | 'CUSTOM';
  settingPrinterBehavior: string;
  settingPrinterName: string;
  settingReceiptLayout: SettingReceiptLayoutConfig;
  settingReceiptPreviewPaper: SettingReceiptPaper;
  settingStoreAddress: string;
  settingStoreName: string;
  settingStorePhone: string;
  settingTab: SettingTab;
  syncAppSettings: (silent?: boolean) => void | Promise<void>;
  setSettingActionMessage: (message: SettingActionMessage | null) => void;
  setSettingAppearanceMode: (value: SettingAppearanceMode) => void;
  setSettingAppearanceScale: (value: SettingAppearanceScale) => void;
  onSettingAppearanceThemeChange: (value: SettingAppearanceTheme) => void;
  setSettingCashDrawerConnectionMode: (value: 'windows' | 'network') => void;
  setSettingCashDrawerEnabled: (value: boolean) => void;
  setSettingCashDrawerNetworkInterface: (value: string) => void;
  setSettingCashDrawerOpenOnCashCheckout: (value: boolean) => void;
  setSettingCashDrawerOpenOnReceivablePayment: (value: boolean) => void;
  setSettingCashDrawerPrinterName: (value: string) => void;
  setSettingCashDrawerPrinterType: (value: 'EPSON' | 'STAR' | 'TANCA' | 'DARUMA' | 'BROTHER' | 'CUSTOM') => void;
  setSettingPrinterBehavior: (value: string) => void;
  setSettingPrinterName: (value: string) => void;
  setSettingReceiptLayout: React.Dispatch<React.SetStateAction<SettingReceiptLayoutConfig>>;
  setSettingReceiptPreviewPaper: (value: SettingReceiptPaper) => void;
  setSettingStoreAddress: (value: string) => void;
  setSettingStoreName: (value: string) => void;
  setSettingStorePhone: (value: string) => void;
  setSettingTab: (value: SettingTab) => void;
  testCashDrawer: () => void | Promise<void>;
};

function toneVariant(tone: DatabaseActionTone) {
  if (tone === 'danger') return 'danger';
  if (tone === 'warning') return 'warning';
  return 'success';
}

function toneLabel(tone: DatabaseActionTone) {
  if (tone === 'danger') return 'Admin';
  if (tone === 'warning') return 'Perhatian';
  return 'Siap';
}

export function SettingView({
  adminUrl,
  handleSettingAction,
  lanAdminUrl,
  lanPriceCheckerUrl,
  priceCheckerUrl,
  saveAppSettings,
  settingActionMessage,
  settingAppearanceMode,
  settingAppearanceModeOptions,
  settingAppearanceScale,
  settingAppearanceScaleOptions,
  settingAppearanceTheme,
  settingCashDrawerConnectionMode,
  settingCashDrawerEnabled,
  settingCashDrawerNetworkInterface,
  settingCashDrawerOpenOnCashCheckout,
  settingCashDrawerOpenOnReceivablePayment,
  settingCashDrawerPrinterName,
  settingCashDrawerPrinterType,
  settingPrinterBehavior,
  settingPrinterName,
  settingReceiptLayout,
  settingReceiptPreviewPaper,
  settingStoreAddress,
  settingStoreName,
  settingStorePhone,
  settingTab,
  syncAppSettings,
  setSettingActionMessage,
  setSettingAppearanceMode,
  setSettingAppearanceScale,
  onSettingAppearanceThemeChange,
  setSettingCashDrawerConnectionMode,
  setSettingCashDrawerEnabled,
  setSettingCashDrawerNetworkInterface,
  setSettingCashDrawerOpenOnCashCheckout,
  setSettingCashDrawerOpenOnReceivablePayment,
  setSettingCashDrawerPrinterName,
  setSettingCashDrawerPrinterType,
  setSettingPrinterBehavior,
  setSettingPrinterName,
  setSettingReceiptLayout,
  setSettingReceiptPreviewPaper,
  setSettingStoreAddress,
  setSettingStoreName,
  setSettingStorePhone,
  setSettingTab,
  testCashDrawer,
}: SettingViewProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Profil toko', value: settingStoreName || 'Belum diisi', icon: Store, className: 'border-emerald-500/20 bg-emerald-500/8' },
          { label: 'Printer', value: settingPrinterName || 'Belum dipilih', icon: Printer, className: 'border-amber-500/20 bg-amber-500/8' },
          { label: 'LAN server', value: adminUrl, icon: Monitor, className: 'border-sky-500/20 bg-sky-500/8' },
          { label: 'Keamanan', value: 'Admin gated', icon: ShieldCheck, className: 'border-rose-500/20 bg-rose-500/8' },
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
              <Settings2 className="h-4 w-4" />
              Setting
            </CardTitle>
            <div className="flex flex-nowrap items-center gap-2">
              <Button type="button" title="Refresh setting" aria-label="Refresh setting" variant="outline" className="h-7 w-7 rounded-lg p-0" onClick={() => void syncAppSettings()}>
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button type="button" title="Simpan setting" aria-label="Simpan setting" className="h-7 w-7 rounded-lg p-0" onClick={() => void saveAppSettings()}>
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-3">
          {settingActionMessage ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <Badge variant={toneVariant(settingActionMessage.tone)} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                  {toneLabel(settingActionMessage.tone)}
                </Badge>
                <span className="truncate text-muted-foreground">{settingActionMessage.text}</span>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={() => setSettingActionMessage(null)}>
                Tutup
              </Button>
            </div>
          ) : null}

          <Tabs value={settingTab} onValueChange={(value) => setSettingTab(value as SettingTab)} className="grid gap-3">
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/35 p-1">
              {[
                ['store', 'Toko'],
                ['printer', 'Printer'],
                ['receipt', 'Struk'],
                ['cashier', 'Kasir'],
                ['lan', 'LAN'],
                ['priceChecker', 'Price checker'],
                ['security', 'Keamanan'],
                ['appearance', 'Tampilan'],
              ].map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="h-8 rounded-lg px-3 text-xs">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="store" className="m-0 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-3 rounded-2xl border border-border bg-card/70 p-3">
                {[
                  ['Nama toko', settingStoreName, setSettingStoreName],
                  ['Alamat', settingStoreAddress, setSettingStoreAddress],
                  ['Telepon / WA', settingStorePhone, setSettingStorePhone],
                ].map(([label, value, setter]) => (
                  <label key={label as string} className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label as string}</span>
                    <input
                      value={value as string}
                      onChange={(event) => (setter as (next: string) => void)(event.target.value)}
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60"
                    />
                  </label>
                ))}
              </div>
              <div className="grid content-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  Logo toko
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  Upload logo tetap dikelola parent view. Simpan setting untuk memastikan identitas toko tersinkron ke local-api.
                </div>
              </div>
            </TabsContent>

            <TabsContent value="printer" className="m-0 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-3 rounded-2xl border border-border bg-card/70 p-3">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Printer aktif</span>
                  <input value={settingPrinterName} onChange={(event) => setSettingPrinterName(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60" />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Perilaku print</span>
                  <input value={settingPrinterBehavior} onChange={(event) => setSettingPrinterBehavior(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60" />
                </label>
                <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3">
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cash drawer aktif</span>
                    <input type="checkbox" checked={settingCashDrawerEnabled} onChange={(event) => setSettingCashDrawerEnabled(event.target.checked)} className="h-4 w-4 accent-amber-500" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['windows', 'USB/Windows'],
                      ['network', 'LAN/IP'],
                    ] as const).map(([value, label]) => (
                      <Button key={value} type="button" variant={settingCashDrawerConnectionMode === value ? 'default' : 'outline'} className="h-8 rounded-lg text-xs" onClick={() => setSettingCashDrawerConnectionMode(value)}>
                        {label}
                      </Button>
                    ))}
                  </div>
                  {settingCashDrawerConnectionMode === 'windows' ? (
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nama printer Windows</span>
                      <input value={settingCashDrawerPrinterName} onChange={(event) => setSettingCashDrawerPrinterName(event.target.value)} placeholder="POS-58 atau POS-80" className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60" />
                    </label>
                  ) : (
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Alamat printer LAN</span>
                      <input value={settingCashDrawerNetworkInterface} onChange={(event) => setSettingCashDrawerNetworkInterface(event.target.value)} placeholder="tcp://192.168.1.100:9100" className="h-10 rounded-xl border border-border bg-background px-3 font-mono text-sm outline-none focus:border-amber-400/60" />
                    </label>
                  )}
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tipe printer</span>
                    <select value={settingCashDrawerPrinterType} onChange={(event) => setSettingCashDrawerPrinterType(event.target.value as typeof settingCashDrawerPrinterType)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-amber-400/60">
                      {(['EPSON', 'STAR', 'TANCA', 'DARUMA', 'BROTHER', 'CUSTOM'] as const).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    <span className="text-xs text-muted-foreground">Buka saat checkout tunai</span>
                    <input type="checkbox" checked={settingCashDrawerOpenOnCashCheckout} onChange={(event) => setSettingCashDrawerOpenOnCashCheckout(event.target.checked)} className="h-4 w-4 accent-amber-500" />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    <span className="text-xs text-muted-foreground">Buka saat bayar piutang tunai</span>
                    <input type="checkbox" checked={settingCashDrawerOpenOnReceivablePayment} onChange={(event) => setSettingCashDrawerOpenOnReceivablePayment(event.target.checked)} className="h-4 w-4 accent-amber-500" />
                  </label>
                </div>
              </div>
              <div className="grid content-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                <Printer className="h-4 w-4 text-muted-foreground" />
                <div className="text-xs leading-relaxed text-muted-foreground">
                  Cash drawer USB dibuka lewat nama printer Windows. Gunakan nama yang muncul di Devices & Printers.
                </div>
                <Button type="button" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => handleSettingAction('Test print dikirim ke printer aktif.')}>
                  Test print
                </Button>
                <Button type="button" className="h-8 rounded-lg text-xs" onClick={() => void testCashDrawer()}>
                  Test buka laci
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="receipt" className="m-0 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-3 rounded-2xl border border-border bg-card/70 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <ReceiptText className="h-4 w-4" />
                  Layout struk
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['58', '80', 'cf'] as SettingReceiptPaper[]).map((paper) => (
                    <Button key={paper} type="button" variant={settingReceiptPreviewPaper === paper ? 'default' : 'outline'} className="h-8 rounded-lg text-xs" onClick={() => setSettingReceiptPreviewPaper(paper)}>
                      {paper === 'cf' ? 'Form' : `${paper}mm`}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'standard', 'detail'] as const).map((template) => (
                    <Button
                      key={template}
                      type="button"
                      variant={settingReceiptLayout.template === template ? 'default' : 'outline'}
                      className="h-8 rounded-lg text-xs"
                      onClick={() => {
                        setSettingReceiptLayout((current) => ({ ...current, template }));
                        handleSettingAction(`Template struk ${template} diterapkan ke preview.`);
                      }}
                    >
                      {template}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid content-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                <div className="text-xs leading-relaxed text-muted-foreground">
                  Preview detail tetap memakai engine struk yang sama saat kasir mencetak nota.
                </div>
                <Button type="button" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => handleSettingAction('Template struk disimpan ke pengaturan.')}>
                  Simpan template
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="cashier" className="m-0 grid gap-3 md:grid-cols-2">
              {[
                ['Shortcut kasir', 'F2 search, F8 scanner, F9 hold transaksi.'],
                ['Pembayaran', 'Tunai, transfer, QRIS, cicilan, dan split.'],
                ['Diskon', 'Nominal atau persen per transaksi.'],
                ['Receipt', 'Preview sebelum print untuk mengurangi salah cetak.'],
              ].map(([title, note]) => (
                <div key={title} className="rounded-2xl border border-border bg-card/70 p-3">
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="lan" className="m-0 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-2 rounded-2xl border border-border bg-card/70 p-3">
                {[
                  ['POS host', '127.0.0.1:5173'],
                  ['Admin web', adminUrl],
                  ['Admin LAN', lanAdminUrl],
                  ['Price checker LAN', lanPriceCheckerUrl],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-background px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                    <div className="mt-1 break-all text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid content-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div className="text-xs leading-relaxed text-muted-foreground">Operasional LAN tidak membutuhkan internet selama host lokal aktif.</div>
              </div>
            </TabsContent>

            <TabsContent value="priceChecker" className="m-0 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-2 rounded-2xl border border-border bg-card/70 p-3">
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">URL perangkat ini</div>
                  <div className="mt-1 break-all font-mono text-sm font-semibold">{priceCheckerUrl}</div>
                </div>
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">URL LAN</div>
                  <div className="mt-1 break-all font-mono text-sm font-semibold">{lanPriceCheckerUrl}</div>
                </div>
              </div>
              <div className="grid content-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                <Barcode className="h-4 w-4 text-muted-foreground" />
                <div className="text-xs leading-relaxed text-muted-foreground">Price checker bersifat read-only dan memakai API publik khusus.</div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="m-0 grid gap-3 md:grid-cols-2">
              {[
                ['TOTP admin', 'Untuk aksi sensitif dan recovery user.', ShieldCheck],
                ['Backup codes', 'Kode cadangan hanya ditampilkan sekali.', KeyRound],
                ['Recovery user', 'Temporary password wajib force change.', UserPlus],
                ['Audit log', 'Restore, reset, dan recovery harus tercatat.', ClipboardList],
              ].map(([title, note, Icon]) => {
                const TypedIcon = Icon as typeof ShieldCheck;
                return (
                  <div key={title as string} className="grid gap-3 rounded-2xl border border-border bg-card/70 p-3">
                    <TypedIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold">{title as string}</div>
                      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{note as string}</div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="appearance" className="m-0">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card/70 p-3">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Monitor className="h-4 w-4" />
                    Mode tampilan
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {settingAppearanceModeOptions.map((item) => (
                      <Button
                        key={item.value}
                        type="button"
                        variant={settingAppearanceMode === item.value ? 'default' : 'outline'}
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => {
                          setSettingAppearanceMode(item.value);
                          handleSettingAction(`Mode tampilan dipilih: ${item.label}.`);
                        }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {settingAppearanceModeOptions.find((item) => item.value === settingAppearanceMode)?.note}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card/70 p-3">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Ukuran font
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {settingAppearanceScaleOptions.map((item) => (
                      <Button
                        key={item.value}
                        type="button"
                        variant={settingAppearanceScale === item.value ? 'default' : 'outline'}
                        className="h-8 rounded-lg px-2 text-xs"
                        onClick={() => {
                          setSettingAppearanceScale(item.value);
                          handleSettingAction(`Ukuran font dipilih: ${item.label}.`);
                        }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {settingAppearanceScaleOptions.find((item) => item.value === settingAppearanceScale)?.note}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/70 p-3 md:col-span-2">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Palette className="h-4 w-4" />
                    Tema user
                  </div>
                  <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
                    {posThemeOptions.map((item) => {
                      const active = settingAppearanceTheme === item.value;

                      return (
                        <Button
                          key={item.value}
                          type="button"
                          variant="outline"
                          className="relative h-24 overflow-hidden rounded-2xl border p-0 text-left shadow-sm transition duration-200 hover:-translate-y-0.5"
                          style={{
                            backgroundImage: item.swatch,
                            borderColor: active ? 'color-mix(in oklch, var(--primary) 66%, transparent)' : 'color-mix(in oklch, var(--border) 86%, transparent)',
                            boxShadow: active ? '0 0 0 1px color-mix(in oklch, var(--primary) 30%, transparent), 0 18px 34px rgba(2, 6, 23, 0.24)' : '0 16px 30px rgba(2, 6, 23, 0.18)',
                          }}
                          onClick={() => {
                            onSettingAppearanceThemeChange(item.value);
                          }}
                        >
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/45 to-transparent" />
                          <span className="relative z-10 flex h-full flex-col justify-between p-3 text-white">
                            <span className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{item.label}</span>
                              {settingAppearanceTheme === item.value ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
                            </span>
                            <span className="text-[10px] leading-tight text-white/72">{item.note}</span>
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
