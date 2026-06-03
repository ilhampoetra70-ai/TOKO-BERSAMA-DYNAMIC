import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import {
  adminAlerts,
  adminControls,
  adminMetrics,
  cashierSessionRows,
  posCatalog,
  posQueue,
  saleRows,
  priceHistory,
  stockHistoryRows,
  stockRows,
} from '../data/canvasData';
import { type ViewId, type ViewportId } from '../types';
import { AdminView } from './views/AdminView';
import { PosView } from './views/PosView';
import { PriceView } from './views/PriceView';
import type { CanvasViewData } from '../contracts/pos';
import type { ComponentType } from 'react';
import { Maximize2, Minimize2, PanelLeftClose } from 'lucide-react';

const viewportLabels: Record<ViewportId, string> = {
  desktop: '1440',
  laptop: '1280',
  tablet: '834',
  mobile: '430',
};

type ViewProps = {
  alerts: boolean;
  data: CanvasViewData;
};

const viewComponents: Record<ViewId, ComponentType<ViewProps>> = {
  pos: PosView,
  admin: AdminView,
  price: PriceView,
};

export function PreviewFrame({
  view,
  viewport,
  density,
  alerts,
}: {
  view: ViewId;
  viewport: ViewportId;
  density: number;
  alerts: boolean;
}) {
  const View = viewComponents[view];
  const screenPadding = 16 + Math.round((density / 100) * 12);
  const viewportFrameClass: Record<ViewportId, string> = {
    desktop: 'w-[min(100%,1440px)] h-[860px]',
    laptop: 'w-[min(100%,1280px)] h-[820px]',
    tablet: 'w-[min(100%,840px)] h-[980px]',
    mobile: 'w-[min(100%,420px)] h-[860px]',
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Canvas</CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="rounded-md px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]">
                {view.toUpperCase()}
              </Badge>
              <span>{viewportLabels[viewport]} px</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-lg">
              <PanelLeftClose className="h-4 w-4" />
              Hide rails
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-lg">
              <Minimize2 className="h-4 w-4" />
              Fit
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-lg">
              <Maximize2 className="h-4 w-4" />
              Full
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span>Workspace rail</span>
          <Badge variant="warning" className="rounded-md px-2.5 py-1 text-[11px]">
            {viewport.toUpperCase()}
          </Badge>
        </div>

        <div
          className="flex justify-center overflow-x-auto overflow-y-auto rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(15,17,21,0.96),rgba(9,11,14,0.98))] p-4"
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <div
            className={[
              'relative overflow-hidden rounded-[24px] border border-border bg-background shadow-[0_28px_80px_rgba(0,0,0,0.5)]',
              viewportFrameClass[viewport],
            ].join(' ')}
            data-viewport={viewport}
          >
            <div className="flex h-full min-h-0 flex-col gap-4" style={{ padding: screenPadding }}>
                <View
                  alerts={alerts}
                  data={{
                    posQueue,
                    posCatalog,
                    stockHistoryRows,
                    saleRows,
                    cashierSessionRows,
                    adminMetrics,
                    adminControls,
                    stockRows,
                  adminAlerts,
                  priceHistory,
                }}
              />
            </div>
          </div>
        </div>
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <span>Canvas only</span>
          <span>No backend</span>
          <span>Local-first</span>
        </div>
      </CardContent>
    </Card>
  );
}
