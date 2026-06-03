import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { ContextIcon } from './ContextIcon';

type InsightViewProps = {
  generateInsightModal: ReactNode;
};

export function InsightView({ generateInsightModal }: InsightViewProps) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        {generateInsightModal}
      </div>
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Insight operasional
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
          {[
            ['Stok lambat', 'Cat tembok warna khusus bergerak lambat 14 hari'],
            ['Rekomendasi restok', 'Semen 50kg dan besi beton perlu prioritas'],
            ['Kas abnormal', 'Selisih kas melewati batas toleransi'],
          ].map(([title, value]) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <ContextIcon label={`${title} ${value}`} />
              <div className="grid min-w-0 gap-1">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
                <div className="text-sm font-medium">{value}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
