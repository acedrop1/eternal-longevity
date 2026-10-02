import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The admin index pattern (Shopify's Orders / Customers lists) in the site's
 * own tokens: compact header, one white card with filter tabs, a search row,
 * a dense table, and a count footer. Presentational only.
 */

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink/55">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </header>
  );
}

export const indexCard =
  'overflow-hidden rounded-inner border border-ink/10 bg-white shadow-[0_1px_2px_rgba(17,17,17,0.05)]';

/** Small header button, Shopify-sized. */
export const headerButton =
  'inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink/85 md:min-h-[34px]';

export function IndexTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-ink/10 px-2 py-2 scrollbar-hide">
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={cn(
              'inline-flex min-h-[36px] flex-none items-center gap-1.5 rounded-thumb px-3 text-[13px] font-medium transition-colors md:min-h-[30px]',
              on ? 'bg-ink/[0.07] text-ink' : 'text-ink/60 hover:bg-ink/[0.04] hover:text-ink',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn('tabular-nums text-[12px]', on ? 'text-ink/60' : 'text-ink/40')}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Search field plus whatever filter/sort selects the page passes in. */
export function IndexToolbar({
  query,
  onQuery,
  placeholder,
  children,
}: {
  query: string;
  onQuery: (q: string) => void;
  placeholder: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-ink/10 px-3 py-2.5 sm:flex-row sm:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{placeholder}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3 3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-thumb bg-white pl-8 pr-3 text-[16px] text-ink ring-1 ring-ink/15 placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink/30 md:h-9 md:text-[13px]"
        />
      </label>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export const toolbarSelect =
  'h-10 min-w-0 flex-1 rounded-thumb bg-white px-2.5 text-[16px] text-ink ring-1 ring-ink/15 focus:outline-none focus:ring-2 focus:ring-ink/30 sm:flex-none md:h-9 md:text-[13px]';

export function IndexFooter({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <div className="border-t border-ink/10 px-4 py-2.5 text-[12px] tabular-nums text-ink/55">
      Showing {shown} of {total} {noun}
    </div>
  );
}

/*
 * Table pieces. Below md every row stacks as a wrapped flex card (no
 * horizontal page scroll); from md up it is a real table.
 */
export const table = 'block w-full text-[13px] md:table';
export const thead = 'hidden md:table-header-group';
export const th = 'whitespace-nowrap bg-milk/60 px-2.5 py-2 text-left text-[12px] font-medium text-ink/55 first:pl-4 last:pr-4';
export const tbody = 'block md:table-row-group';
export const row =
  'relative flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-ink/10 py-3 pl-4 pr-12 transition-colors first:border-t-0 hover:bg-milk/70 md:table-row md:px-0 md:py-0';
export const td = 'md:table-cell md:h-11 md:px-2.5 md:py-2 md:align-middle md:first:pl-4 md:last:pr-4';
/** The expanded detail under a row. */
export const detailRow = 'block border-t border-ink/10 bg-milk/50 md:table-row';
export const detailCell = 'block px-4 py-4 md:table-cell md:px-4';

/** Ignore row clicks that land on a control inside the row. */
export function fromControl(target: EventTarget): boolean {
  return !!(target as HTMLElement).closest('a,button,input,select,textarea,label');
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m5.5 8 4.5 4.5L14.5 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Status badges: a dot and a label, so meaning never rides on colour alone. */
export type BadgeTone = 'neutral' | 'attention' | 'success' | 'critical' | 'info';

const BADGE: Record<BadgeTone, [string, string]> = {
  neutral: ['bg-ink/[0.06] text-ink/75', 'bg-ink/40'],
  attention: ['bg-butter text-ink', 'bg-amber-500'],
  success: ['bg-emerald-50 text-emerald-900', 'bg-emerald-600'],
  critical: ['bg-red-50 text-red-800', 'bg-red-600'],
  info: ['bg-sky/45 text-ink', 'bg-[#3d7fae]'],
};

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const [chip, dot] = BADGE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium leading-5',
        chip,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 flex-none rounded-full', dot)} />
      {children}
    </span>
  );
}

export function shortDate(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '—';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}
