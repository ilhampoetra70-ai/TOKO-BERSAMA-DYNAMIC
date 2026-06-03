import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import type { CanvasViewData } from '../../contracts/pos';
import { Barcode, Search, Tags } from 'lucide-react';

export function PriceView({
  alerts,
  data,
}: {
  alerts: boolean;
  data: CanvasViewData;
}) {
  return (
    <div className="grid h-full min-h-0 gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Price checker</div>
          <div className="text-sm text-muted-foreground">Scan / price</div>
        </div>
        <Badge variant={alerts ? 'warning' : 'secondary'} className="rounded-lg px-3 py-1 text-xs uppercase tracking-[0.16em]">
          {alerts ? 'LAN ready' : 'Kiosk idle'}
        </Badge>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="min-h-0 overflow-hidden">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <Search className="h-4 w-4" />
              Scan or search
            </CardTitle>
          </CardHeader>
          <CardContent className="grid h-full gap-4 bg-[radial-gradient(circle_at_18%_28%,rgba(245,158,11,0.12),transparent_20%),radial-gradient(circle_at_82%_22%,rgba(125,211,252,0.08),transparent_18%),linear-gradient(180deg,rgba(15,17,21,0.9),rgba(11,13,17,0.98))] p-5">
            <div className="rounded-2xl border border-border bg-background/50 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Barcode</div>
              <div className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-[0.18em]">
                <Barcode className="h-7 w-7 text-amber-300" />
                899-123-045-8
              </div>
              <div className="mt-2 text-sm text-muted-foreground">Scan input</div>
            </div>
            <div className="max-w-[420px] rounded-2xl border border-border bg-card/80 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Interaction note</div>
              <div className="mt-2 text-sm font-medium">Focused utility</div>
              <div className="text-sm text-muted-foreground">Low-friction surface for quick lookup.</div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <Tags className="h-4 w-4" />
              Active price
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-amber-500 to-amber-800 p-5 text-white shadow-[0_24px_48px_rgba(245,158,11,0.22)]">
              <div className="text-xs uppercase tracking-[0.18em] text-white/70">Active price</div>
              <div className="mt-3 text-5xl font-semibold tracking-tight">Rp 72.000</div>
              <div className="mt-2 text-sm text-white/80">Semen 50kg</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button className="rounded-xl" type="button">
                Search again
              </Button>
              <Button variant="outline" className="rounded-xl" type="button">
                Show details
              </Button>
            </div>

            <Separator />

            <div className="grid gap-2">
              {data.priceHistory.map((entry) => (
                <div key={entry.label} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{entry.label}</span>
                  <span className="font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
