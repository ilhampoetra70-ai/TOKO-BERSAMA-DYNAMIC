import { type CanvasState } from '../types';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Layers3, MonitorCog, Scale } from 'lucide-react';

export function StateRail({ view, viewport, density, alerts, contrast }: CanvasState) {
  return (
    <Card className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:min-h-0 xl:overflow-hidden">
      <CardHeader className="border-b border-border pb-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm uppercase tracking-[0.24em] text-muted-foreground">State</CardTitle>
          <Badge variant="outline" className="rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]">
            Live
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground">Current canvas signals and status.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 pt-5 xl:h-[calc(100%-5.5rem)] xl:overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <article className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" />
              View
            </div>
            <div className="mt-3 text-lg font-semibold">{view.toUpperCase()}</div>
          </article>
          <article className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <MonitorCog className="h-3.5 w-3.5" />
              Viewport
            </div>
            <div className="mt-3 text-lg font-semibold">{viewport.toUpperCase()}</div>
          </article>
          <article className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Scale className="h-3.5 w-3.5" />
              Density
            </div>
            <div className="mt-3 text-lg font-semibold">{density}</div>
          </article>
        </div>

        <Separator />

        <div className="grid gap-2">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Alerts</span>
            <Badge variant={alerts ? 'warning' : 'outline'} className="rounded-md px-2 py-0.5">
              {alerts ? 'On' : 'Off'}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Contrast</span>
            <Badge variant={contrast ? 'success' : 'outline'} className="rounded-md px-2 py-0.5">
              {contrast ? 'On' : 'Off'}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Host</span>
            <Badge variant="success" className="rounded-md px-2 py-0.5">
              Ready
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
