'use client';

import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  href: string;
  /** Optional count pill — pending tasks waiting on this tab. */
  badge?: number;
  /** Other path prefixes that belong to this tab (e.g. an order's own page). */
  also?: string[];
}

interface PortalNavProps {
  nav: NavItem[];
  /** 'sidebar' = vertical desktop rail · 'mobile' = horizontal scrolling pills. */
  variant: 'sidebar' | 'mobile';
}

/**
 * The dot beside a nav item, and what it does while the page is fetching.
 *
 * A tab that only highlights once the new page has rendered leaves the click
 * feeling unregistered for however long the server takes. useLinkStatus knows
 * the navigation is in flight the instant it starts, which is the difference
 * between an app that feels immediate and one that feels slow.
 */
/** A thin butter bar across the top of the screen while a tab's page loads. */
function TopBar() {
  return (
    <span aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden bg-butter/40">
      <span className="block h-full w-1/3 animate-[navload_1.1s_ease-in-out_infinite] rounded-full bg-butter-deep" />
    </span>
  );
}

const pillOn = 'bg-white text-ink shadow-sm ring-1 ring-ink/5';

/**
 * The desktop item's visible body. Inside the Link so useLinkStatus sees the
 * click: a pending tab looks selected at once (white pill, spinner) instead
 * of waiting for the server.
 */
function RailItem({ isActive, label, badge }: { isActive: boolean; label: string; badge?: number }) {
  const { pending } = useLinkStatus();
  const on = isActive || pending;
  return (
    <span
      className={cn(
        'flex min-h-[44px] items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-medium tracking-[-0.01em] transition-colors',
        on ? pillOn : 'text-ink/65 group-hover:bg-white/60 group-hover:text-ink',
      )}
    >
      {pending ? (
        <span aria-hidden className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-[1.5px] border-butter-deep border-t-transparent" />
      ) : (
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors', isActive ? 'bg-butter-deep' : 'bg-ink/20 group-hover:bg-ink/40')}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      {!!badge && (
        <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-ink px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white tabular-nums">
          {badge}
        </span>
      )}
      {pending && <TopBar />}
    </span>
  );
}

/** Same for the mobile strip. */
function PillItem({ isActive, label, badge }: { isActive: boolean; label: string; badge?: number }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        'flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold tracking-[-0.01em] transition-colors',
        isActive || pending ? pillOn : 'text-ink/60 group-hover:bg-white/60 group-hover:text-ink',
      )}
    >
      {label}
      {!!badge && (
        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-butter px-1 text-[11px] font-semibold leading-[1.25rem] text-ink tabular-nums">
          {badge}
        </span>
      )}
      {pending && <TopBar />}
    </span>
  );
}

/**
 * Portal navigation. Renders a vertical left rail on desktop and a swipeable
 * glass strip under the top bar on mobile. Active state is derived from the
 * current pathname, with longest-prefix-match so that e.g. /portal/orders/EL-1001
 * still highlights the "Orders" tab.
 */
export function PortalNav({ nav, variant }: PortalNavProps) {
  const pathname = usePathname() ?? '';

  // Find the best-matching nav item (longest prefix) so deep routes like
  // /portal/orders/EL-1001 stay highlighted under "Orders".
  const activeHref = (() => {
    const under = (base: string) => pathname === base || pathname.startsWith(base + '/');
    const matches = nav
      .flatMap((item) => [item.href, ...(item.also ?? [])].filter(under).map((p) => ({ href: item.href, len: p.length })))
      .sort((a, b) => b.len - a.len);
    return matches[0]?.href;
  })();

  if (variant === 'mobile') {
    // Sits on the frosted glass strip. Scrolls sideways inside itself, so the
    // page never does; each item is a 44px-tall tap target.
    return (
      <nav aria-label="Portal">
        <div className="flex gap-1 overflow-x-auto p-1.5 scrollbar-hide">
          {nav.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className="group flex-shrink-0 rounded-full"
              >
                <PillItem isActive={isActive} label={item.label} badge={item.badge} />
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Desktop sidebar (vertical rail), on a milk panel; active item is a white pill.
  return (
    <nav aria-label="Portal">
      <ul className="space-y-0.5">
        {nav.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={isActive ? 'page' : undefined} className="group block rounded-full">
                <RailItem isActive={isActive} label={item.label} badge={item.badge} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
