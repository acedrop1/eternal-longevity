import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * Shopify record header: a back arrow to the index, the record title with its
 * status badges beside it, a meta line, and header actions on the right.
 */
export function DetailHeader({
  backHref,
  backLabel,
  title,
  badges,
  meta,
  actions,
}: {
  backHref: string;
  backLabel: string;
  title: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <Link
          href={backHref}
          aria-label={`Back to ${backLabel}`}
          className="mt-0.5 inline-flex h-8 flex-none items-center gap-1 rounded-thumb px-1.5 text-[13px] font-medium text-ink/65 transition-colors hover:bg-ink/[0.06] hover:text-ink"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5 7 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">{backLabel}</span>
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
              {title}
            </h1>
            {badges}
          </div>
          {meta && <p className="mt-1 text-[13px] text-ink/65">{meta}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Label / value line inside a sidebar card. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
      <dt className="flex-none text-ink/60">{label}</dt>
      <dd className="min-w-0 break-words text-right text-ink">{children}</dd>
    </div>
  );
}

/** Main column plus a 300px right sidebar; stacks below lg. */
export const detailGrid = 'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]';
