import type { QueueItem, StockHistoryItem } from '@/contracts/pos';

export function getStockHistoryTime(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function normalizeStockHistoryRow(rawItem: {
  item: string;
  movement: string;
  note: string;
  time: string;
  event: string;
  beforeQty?: number;
  afterQty?: number;
  operator?: string;
  source?: string;
}): StockHistoryItem {
  const movementValue = Number(rawItem.movement);
  const afterQty = Number.isFinite(rawItem.afterQty) ? Number(rawItem.afterQty) : undefined;
  const beforeQty = Number.isFinite(rawItem.beforeQty)
    ? Number(rawItem.beforeQty)
    : afterQty !== undefined && Number.isFinite(movementValue)
      ? Math.max(0, afterQty - movementValue)
      : undefined;

  return {
    item: typeof rawItem.item === 'string' ? rawItem.item.trim().toUpperCase() : '',
    movement: typeof rawItem.movement === 'string' ? rawItem.movement.trim() : '',
    note: typeof rawItem.note === 'string' ? rawItem.note.trim() : '',
    time: typeof rawItem.time === 'string' ? rawItem.time.trim() : '',
    event: typeof rawItem.event === 'string' ? rawItem.event.trim() : '',
    beforeQty,
    afterQty,
    operator: typeof rawItem.operator === 'string' && rawItem.operator.trim() ? rawItem.operator.trim().toUpperCase() : 'SYSTEM',
    source: typeof rawItem.source === 'string' && rawItem.source.trim() ? rawItem.source.trim() : rawItem.event || 'Manual',
  };
}

export function createStockMovementEntry({
  item,
  beforeQty,
  afterQty,
  event,
  note,
  operator = 'ADMIN TOKO',
  source = event,
  time = getStockHistoryTime(),
}: {
  item: QueueItem;
  beforeQty: number;
  afterQty: number;
  event: string;
  note: string;
  operator?: string;
  source?: string;
  time?: string;
}): StockHistoryItem | null {
  const movement = afterQty - beforeQty;

  if (movement === 0) {
    return null;
  }

  return normalizeStockHistoryRow({
    item: item.name,
    movement: `${movement > 0 ? '+' : ''}${movement}`,
    note,
    time,
    event,
    beforeQty,
    afterQty,
    operator,
    source,
  });
}
