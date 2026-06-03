import type { AdminSection } from '../types';

export function MetricGlyph({ id, className = 'h-5 w-5' }: { id: 'revenue' | 'transactions' | 'receivables' | 'stock' | 'alert'; className?: string }) {
  if (id === 'revenue') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
        <path d="M10 16h28v18a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V16Z" stroke="currentColor" strokeWidth="2.4" />
        <path d="M10 20h28" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="24" cy="29" r="5.5" stroke="currentColor" strokeWidth="2.4" />
        <path d="M24 25.5v7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'transactions') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
        <rect x="10" y="9" width="28" height="30" rx="4" stroke="currentColor" strokeWidth="2.4" />
        <path d="M17 18h14M17 24h14M17 30h9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'receivables') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
        <path d="M14 15h20a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H18l-8 5V19a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="2.4" />
        <path d="M19 24h10M24 19v10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'alert') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
        <path d="M24 9.5 40.5 36H7.5L24 9.5Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M24 18v10M24 31.5h.02" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M12 34h24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 34V20M24 34V14M32 34V24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 19.5 24 14l8 10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminNavGlyph({ id, className = 'h-4 w-4' }: { id: AdminSection; className?: string }) {
  if (id === 'overview') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1v-7.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === 'transactions') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.9" />
        <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'inventory') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 4 18.5 7.5v9L12 20l-6.5-3.5v-9L12 4Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M5.5 7.5 12 11l6.5-3.5M12 11v9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === 'receivables') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="4.5" y="6" width="15" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
        <path d="M8 12h8M12 9v6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.9" />
      <path d="M6.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
