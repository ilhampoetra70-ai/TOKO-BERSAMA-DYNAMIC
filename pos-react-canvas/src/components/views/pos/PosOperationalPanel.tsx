import { ReceiptText } from 'lucide-react';
import type { PosMenuId } from '../../../contracts/pos-ui';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { ContextIcon } from './ContextIcon';

type LatestTransaction = {
  invoice: string;
  time: string;
  status: string;
  customer: string;
  customerName?: string;
  method: string;
  total: string;
  itemsCount: number;
  items?: Array<{ name: string; qty: number }>;
};

type PosOperationalPanelProps = {
  rows: LatestTransaction[];
  onNavigate: (menu: PosMenuId) => void;
  onOpenTransaction: (invoice: string) => void;
};

export function PosOperationalPanel({ rows, onNavigate, onOpenTransaction }: PosOperationalPanelProps) {
  return (
    <Card className="min-h-0 xl:sticky xl:top-0 xl:h-full xl:overflow-hidden">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <ReceiptText className="h-4 w-4" />
              Transaksi Terakhir
            </CardTitle>
            <div className="text-sm text-muted-foreground">10 invoice terbaru</div>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-2.5 text-xs" onClick={() => onNavigate('Transaksi')}>
            Semua
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid min-h-0 gap-2 overflow-y-auto pr-2 pt-3">
        {rows.length ? (
          rows.map((row) => {
            const itemNames = row.items?.length
              ? row.items.slice(0, 2).map((item) => `${item.name} x${item.qty}`).join(', ')
              : `${row.itemsCount} item`;
            const extraItemCount = Math.max(0, (row.items?.length ?? row.itemsCount) - 2);

            return (
              <button
                key={row.invoice}
                type="button"
                className="grid gap-2 rounded-xl border border-border bg-muted/25 p-3 text-left transition hover:border-sky-400/40 hover:bg-sky-500/5"
                onClick={() => onOpenTransaction(row.invoice)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ContextIcon label={`${row.invoice} transaksi`} className="h-7 w-7" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{row.invoice}</div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{row.time}</div>
                    </div>
                  </div>
                  <Badge variant={row.status === 'Lunas' ? 'success' : row.status === 'Void' ? 'danger' : 'warning'} className="shrink-0 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                    {row.status}
                  </Badge>
                </div>
                <div className="grid gap-1">
                  <div className="truncate text-xs font-medium text-foreground">{row.customerName?.trim() || row.customer}</div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">
                    {itemNames}{extraItemCount ? ` +${extraItemCount} item` : ''}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{row.method}</span>
                  <span className="text-sm font-semibold tabular-nums">{row.total}</span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center text-sm text-muted-foreground">
            Belum ada transaksi.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
