import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

export function RecoveryModal({ open = true }: { open?: boolean }) {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open}>
      <DialogContent className="w-[min(92vw,30rem)]">
        <DialogHeader>
          <Badge variant="warning" className="w-fit rounded-md px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]">
            Recovery
          </Badge>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>Login, TOTP, and audit trail are required before recovery is granted.</DialogDescription>
        </DialogHeader>

        <Card className="border-border bg-background/50">
          <div className="grid gap-1 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Auth plan</div>
            <div className="text-sm font-medium">Username + password, admin TOTP, audit log.</div>
          </div>
        </Card>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" type="button">
            Cancel
          </Button>
          <Button type="button">Confirm action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
