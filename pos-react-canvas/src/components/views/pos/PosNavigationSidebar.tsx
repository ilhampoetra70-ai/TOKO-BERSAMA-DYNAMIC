import { ChevronRight } from 'lucide-react';
import type { MenuIcon, PosMenuId } from '../../../contracts/pos-ui';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

type PosNavigationSidebarProps = {
  alerts: boolean;
  activeMenu: PosMenuId;
  items: Array<{ label: PosMenuId; icon: MenuIcon }>;
  onNavigate: (menu: PosMenuId) => void;
};

export function PosNavigationSidebar({ alerts, activeMenu, items, onNavigate }: PosNavigationSidebarProps) {
  return (
    <Card className="min-h-0 xl:sticky xl:top-0 xl:h-full xl:overflow-hidden">
      <CardHeader className="border-b border-border px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Navigation</CardTitle>
          <Badge variant={alerts ? 'warning' : 'success'} className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
            {alerts ? '2 warnings' : 'online'}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">Toko material</div>
      </CardHeader>
      <CardContent className="grid gap-1.5 px-2.5 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeMenu === item.label;

          return (
            <Button
              key={item.label}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              className="h-9 justify-between rounded-lg px-3 text-left text-xs font-semibold"
              onClick={() => onNavigate(item.label)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
