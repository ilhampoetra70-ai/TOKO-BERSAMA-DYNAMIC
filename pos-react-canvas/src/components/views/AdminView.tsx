import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import type { CanvasViewData } from '../../contracts/pos';
import { AlertTriangle, Shield, SlidersHorizontal, Warehouse } from 'lucide-react';

export function AdminView({
  alerts,
  data,
}: {
  alerts: boolean;
  data: CanvasViewData;
}) {
  const metricGradients = [
    'linear-gradient(135deg, #02111d 0%, #0f172a 55%, #172554 100%)',
    'linear-gradient(135deg, #02140f 0%, #052e16 55%, #14532d 100%)',
    'linear-gradient(135deg, #1f0b10 0%, #3f1d2e 55%, #7f1d1d 100%)',
    'linear-gradient(135deg, #1f1404 0%, #422006 55%, #78350f 100%)',
  ];

  return (
    <div className="grid h-full min-h-0 gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Admin LAN</div>
          <div className="text-sm text-muted-foreground">Stock / price</div>
        </div>
        <Badge variant="success" className="rounded-lg px-3 py-1 text-xs uppercase tracking-[0.16em]">
          Connected - local API
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.adminMetrics.map((metric, index) => (
          <Card
            key={metric.label}
            className="relative isolate overflow-hidden border-white/10 text-white shadow-[0_18px_38px_rgba(2,6,23,0.34)]"
            style={{
              backgroundImage: metricGradients[index % metricGradients.length],
              borderColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/38 to-transparent" />
            <CardContent className="relative grid gap-1 p-4">
              <div className="text-2xl font-semibold tracking-tight">{metric.value}</div>
              <div className="text-xs uppercase tracking-[0.16em] text-white/68">{metric.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
        <Card className="min-h-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              Control map
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4">
            {data.adminControls.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.note}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-h-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <Warehouse className="h-4 w-4" />
              Stock table
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-4">
            <div className="min-w-[720px] grid gap-2">
              <div className="grid grid-cols-[minmax(0,1.4fr)_120px_120px_140px] gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <div>Item</div>
                <div>Stock</div>
                <div>Status</div>
                <div>Action</div>
              </div>
              {data.stockRows.map((row) => {
                const badgeVariant = row.status === 'Low' ? 'warning' : row.status === 'Critical' ? 'danger' : 'success';

                return (
                  <div
                    key={row.item}
                    className="grid grid-cols-[minmax(0,1.4fr)_120px_120px_140px] gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0 truncate">{row.item}</div>
                    <div>{row.stock}</div>
                    <div>
                      <Badge variant={badgeVariant} className="rounded-md px-2 py-0.5">
                        {row.status}
                      </Badge>
                    </div>
                    <div>
                      <Button variant="outline" size="sm" className="rounded-lg">
                        {row.action}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 bg-card/90">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4">
            {alerts ? (
              data.adminAlerts.map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.note}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  System calm
                </div>
                <div className="text-sm text-muted-foreground">Idle</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
