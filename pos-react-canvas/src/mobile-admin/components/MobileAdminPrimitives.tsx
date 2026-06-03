import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

export function AdminSkeletonGrid({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="mobile-admin-skeleton rounded-[24px] border border-white/10 p-4">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="mt-4 h-7 w-2/3 rounded-full bg-white/10" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="h-10 rounded-2xl bg-white/10" />
            <div className="h-10 rounded-2xl bg-white/10" />
            <div className="h-10 rounded-2xl bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/15 bg-white/[0.035] px-4 py-6 text-center">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--admin-accent-solid)]" />
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mx-auto mt-1 max-w-[24rem] text-xs leading-5 text-slate-500">{description}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  clearButtonClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  clearButtonClassName?: string;
}) {
  return (
    <label className={cn('mobile-admin-search flex h-12 items-center gap-2 rounded-2xl border px-3', className)}>
      <Search className="h-4 w-4 shrink-0 text-slate-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn('h-full min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500', inputClassName)}
      />
      {value ? (
        <button
          type="button"
          className={cn('grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-slate-500 hover:bg-white/10 hover:text-slate-100', clearButtonClassName)}
          onClick={() => onChange('')}
          aria-label="Bersihkan pencarian"
        >
          X
        </button>
      ) : null}
    </label>
  );
}

export function FilterChips<T extends string>({
  items,
  value,
  onChange,
  className,
  itemClassName,
}: {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn('mobile-admin-chip-row -mx-1 flex gap-2 overflow-x-auto px-1 pb-1', className)}>
      {items.map((item) => (
        <Button
          key={item}
          type="button"
          variant={value === item ? 'default' : 'outline'}
          className={cn(
            'h-10 shrink-0 rounded-full px-4 text-xs font-semibold',
            value === item ? '' : 'border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/10',
            itemClassName
          )}
          onClick={() => onChange(item)}
        >
          {item}
        </Button>
      ))}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  className,
  itemClassName,
}: {
  items: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn('inline-grid min-h-11 grid-flow-col rounded-2xl border border-white/10 bg-white/[0.035] p-1', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={cn(
            'rounded-xl px-3 text-xs font-semibold transition',
            value === item.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground/70 hover:bg-white/10 hover:text-foreground',
            itemClassName
          )}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function SummaryStrip({ items }: { items: Array<{ label: string; value: string; tone?: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
          <div className={`mt-1 truncate text-sm font-semibold ${item.tone || 'text-slate-100'}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
