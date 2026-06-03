import { spawn } from 'node:child_process';
import type { DbClient } from '../db/client.js';
import { getSettings } from '../routes/settings.routes.js';
import { PrinterTypes, ThermalPrinter } from 'node-thermal-printer';

export type CashDrawerTrigger = 'manual' | 'cash-checkout' | 'receivable-payment';

const printerTypeMap = {
  EPSON: PrinterTypes.EPSON,
  STAR: PrinterTypes.STAR,
  TANCA: PrinterTypes.TANCA,
  DARUMA: PrinterTypes.DARUMA,
  BROTHER: PrinterTypes.BROTHER,
  CUSTOM: PrinterTypes.CUSTOM,
} as const;

export type CashDrawerResult = {
  opened: boolean;
  skipped: boolean;
  message: string;
};

export class CashDrawerService {
  constructor(private readonly db: DbClient) {}

  private openWindowsPrinter(printerName: string): Promise<void> {
    const drawerPulseBase64 = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]).toString('base64');
    const script = `
$printerName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${Buffer.from(printerName, 'utf8').toString('base64')}'))
$bytes = [System.Convert]::FromBase64String('${drawerPulseBase64}')
$source = @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, Int32 dwCount, out Int32 dwWritten);
}
"@
Add-Type -TypeDefinition $source
$handle = [IntPtr]::Zero
if (-not [RawPrinterHelper]::OpenPrinter($printerName, [ref]$handle, [IntPtr]::Zero)) { throw "Printer tidak ditemukan atau tidak bisa dibuka: $printerName" }
try {
  $doc = New-Object RawPrinterHelper+DOCINFOA
  $doc.pDocName = 'TOKOBERSAMA cash drawer'
  $doc.pDataType = 'RAW'
  if ([RawPrinterHelper]::StartDocPrinter($handle, 1, $doc) -eq 0) { throw "StartDocPrinter gagal." }
  try {
    if (-not [RawPrinterHelper]::StartPagePrinter($handle)) { throw "StartPagePrinter gagal." }
    try {
      $written = 0
      if (-not [RawPrinterHelper]::WritePrinter($handle, $bytes, $bytes.Length, [ref]$written)) { throw "WritePrinter gagal." }
      if ($written -ne $bytes.Length) { throw "RAW command tidak terkirim penuh." }
    } finally {
      [void][RawPrinterHelper]::EndPagePrinter($handle)
    }
  } finally {
    [void][RawPrinterHelper]::EndDocPrinter($handle)
  }
} finally {
  [void][RawPrinterHelper]::ClosePrinter($handle)
}
`;
    const encoded = Buffer.from(script, 'utf16le').toString('base64');

    return new Promise((resolve, reject) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
        windowsHide: true,
      });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(stderr.trim() || `PowerShell RAW print gagal dengan exit code ${code}.`));
      });
    });
  }

  async open(trigger: CashDrawerTrigger, options: { force?: boolean } = {}): Promise<CashDrawerResult> {
    const settings = getSettings(this.db);
    const drawer = settings.cashDrawer;
    const connectionMode = drawer.connectionMode ?? 'windows';
    const printerInterface = connectionMode === 'network'
      ? (drawer.networkInterface || drawer.interface).trim()
      : drawer.printerName.trim();

    if (!options.force && !drawer.enabled) {
      return { opened: false, skipped: true, message: 'Cash drawer nonaktif.' };
    }
    if (!printerInterface) {
      return { opened: false, skipped: true, message: 'Printer cash drawer belum diisi.' };
    }
    if (trigger === 'cash-checkout' && !drawer.openOnCashCheckout) {
      return { opened: false, skipped: true, message: 'Trigger checkout tunai nonaktif.' };
    }
    if (trigger === 'receivable-payment' && !drawer.openOnReceivablePayment) {
      return { opened: false, skipped: true, message: 'Trigger pembayaran piutang nonaktif.' };
    }

    if (connectionMode === 'windows') {
      await this.openWindowsPrinter(printerInterface);
      return { opened: true, skipped: false, message: 'Cash drawer berhasil dibuka lewat printer Windows/USB.' };
    }

    const printer = new ThermalPrinter({
      type: printerTypeMap[drawer.printerType],
      interface: printerInterface,
      options: {
        timeout: 3000,
      },
    });

    printer.openCashDrawer();
    await printer.execute({ docname: `TOKOBERSAMA-cash-drawer-${trigger}` });

    return { opened: true, skipped: false, message: 'Cash drawer berhasil dibuka.' };
  }

  async openBestEffort(trigger: CashDrawerTrigger): Promise<void> {
    try {
      const result = await this.open(trigger);
      if (!result.opened && !result.skipped) {
        console.warn(`[cash-drawer] ${trigger}: ${result.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[cash-drawer] ${trigger} gagal: ${message}`);
    }
  }
}
