'use client';

import { Suspense, type ComponentProps, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { audienceParam, countLabel, type Audience } from '@/lib/lineup';
import { cn } from '@/lib/utils';

/*
 * The shop's For men / For women filter. The choice lives in the URL
 * (?for=women), so a link or an ad can open a page already filtered and the
 * pages stay static: each piece below renders unfiltered on the server (the
 * Suspense fallback) and applies the filter in the browser. Products for
 * both always show; only the other audience's products hide.
 */

type Fors = (Audience | 'all')[];

function useWho(): Audience | null {
  return audienceParam(useSearchParams().get('for'));
}

const shows = (f: Audience | 'all', who: Audience | null) => !who || f === 'all' || f === who;

const OPTIONS: { who: Audience | null; label: string }[] = [
  { who: null, label: 'All' },
  { who: 'men', label: 'For men' },
  { who: 'women', label: 'For women' },
];

function Chips({ who }: { who: Audience | null }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Filter treatments" className="inline-flex rounded-full bg-milk p-1">
      {OPTIONS.map((o) => {
        const on = o.who === who;
        return (
          <Link
            key={o.label}
            href={o.who ? `${pathname}?for=${o.who}` : pathname}
            replace
            scroll={false}
            aria-current={on ? 'true' : undefined}
            className={cn(
              'flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-semibold transition-colors',
              on ? 'bg-ink text-white' : 'text-ink/65 hover:text-ink',
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ChipsWithParams() {
  return <Chips who={useWho()} />;
}

/** All · For men · For women. */
export function AudienceFilter() {
  return (
    <Suspense fallback={<Chips who={null} />}>
      <ChipsWithParams />
    </Suspense>
  );
}

function Shown({ fors, children }: { fors: Fors; children: ReactNode }) {
  const who = useWho();
  return fors.some((f) => shows(f, who)) ? children : null;
}

/** Hides its children when none of `fors` (a product's audience, or a section's products') matches the filter. */
export function AudienceShown({ fors, children }: { fors: Fors; children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <Shown fors={fors}>{children}</Shown>
    </Suspense>
  );
}

function Count({ fors, label }: { fors: Fors; label: boolean }) {
  const who = useWho();
  const n = fors.filter((f) => shows(f, who)).length;
  return label ? countLabel(n) : n;
}

/** How many of `fors` the filter shows: "N treatments" with `label`, else the bare number. */
export function AudienceCount({ fors, label = false }: { fors: Fors; label?: boolean }) {
  return (
    <Suspense fallback={label ? countLabel(fors.length) : fors.length}>
      <Count fors={fors} label={label} />
    </Suspense>
  );
}

function KeptLink({ href, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const who = useWho();
  return <Link href={who ? `${href}?for=${who}` : href} {...rest} />;
}

/** A shop link that keeps the current filter (the category strip). */
export function AudienceLink({ href, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  return (
    <Suspense fallback={<Link href={href} {...rest} />}>
      <KeptLink href={href} {...rest} />
    </Suspense>
  );
}
