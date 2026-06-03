import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ReceiptPreviewFrameProps = {
  title: string;
  subtitle: string;
  html: string;
  widthPx: number;
  heightPx: number;
  scale?: number;
  badge?: string;
  className?: string;
};

export function ReceiptPreviewFrame({
  title,
  subtitle,
  html,
  widthPx,
  heightPx,
  scale = 1,
  badge,
  className,
}: ReceiptPreviewFrameProps) {
  const previewHtml = scale === 1 ? html : html.replace('</head>', `<style>html{zoom:${scale};}</style></head>`);
  const previewWidth = Math.round(widthPx * scale);
  const previewHeight = Math.round(heightPx * scale);

  return (
    <div className={cn('grid gap-2 rounded-xl border border-border bg-background/70 p-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-foreground">{title}</div>
          <div className="truncate text-[10px] text-muted-foreground">{subtitle}</div>
        </div>
        {badge ? (
          <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
            {badge}
          </Badge>
        ) : null}
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-zinc-200/80 p-2">
        <iframe
          title={title}
          srcDoc={previewHtml}
          sandbox=""
          className="block rounded-md border border-zinc-300 bg-white shadow-sm"
          style={{ width: `${previewWidth}px`, height: `${previewHeight}px` }}
        />
      </div>
    </div>
  );
}
