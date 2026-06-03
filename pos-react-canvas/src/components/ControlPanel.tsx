import { type ViewControls } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

const viewOptions = [
  { id: 'pos', label: 'POS' },
  { id: 'admin', label: 'Admin' },
  { id: 'price', label: 'Price' },
] as const;

const viewportOptions = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'mobile', label: 'Mobile' },
] as const;

export function ControlPanel({
  view,
  viewport,
  density,
  alerts,
  contrast,
  onViewChange,
  onViewportChange,
  onDensityChange,
  onAlertsToggle,
  onContrastToggle,
}: ViewControls) {
  return (
    <Card className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:min-h-0 xl:overflow-hidden">
      <CardHeader className="space-y-2 border-b border-border pb-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Controls</CardTitle>
          <Badge variant="secondary" className="rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]">
            Canvas
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground">Workspace and viewport presets.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5 pt-5 xl:h-[calc(100%-5.5rem)] xl:overflow-y-auto">
        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
          <Tabs value={view} onValueChange={(value) => onViewChange(value as ViewControls['view'])}>
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-muted p-1">
              {viewOptions.map((option) => (
                <TabsTrigger key={option.id} value={option.id} className="rounded-lg">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Separator />

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Viewport</div>
          <div className="grid grid-cols-2 gap-2">
            {viewportOptions.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant={viewport === option.id ? 'default' : 'outline'}
                onClick={() => onViewportChange(option.id)}
                className="justify-start rounded-xl"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Density</div>
            <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[11px]">
              {density}
            </Badge>
          </div>
          <Slider
            value={[density]}
            min={0}
            max={100}
            step={1}
            onValueChange={(value) => onDensityChange(value[0] ?? 0)}
          />
        </div>

        <Separator />

        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">States</div>
          <div className="grid gap-2">
            <Button
              type="button"
              variant={alerts ? 'default' : 'outline'}
              className="justify-between rounded-xl"
              onClick={onAlertsToggle}
            >
              <span>Alerts</span>
              <Badge variant={alerts ? 'secondary' : 'outline'} className="rounded-md px-2 py-0.5">
                {alerts ? 'On' : 'Off'}
              </Badge>
            </Button>
            <Button
              type="button"
              variant={contrast ? 'default' : 'outline'}
              className="justify-between rounded-xl"
              onClick={onContrastToggle}
            >
              <span>Contrast</span>
              <Badge variant={contrast ? 'secondary' : 'outline'} className="rounded-md px-2 py-0.5">
                {contrast ? 'On' : 'Off'}
              </Badge>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
