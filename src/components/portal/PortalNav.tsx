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
function NavDot({ isActive }: { isActive: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        'h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors',
        pending
          ? 'animate-ping bg-[#D5A850]'
          : isActive
            ? 'bg-[#D5A850]'
            : 'bg-black/20 group-hover:bg-black/40',
      )}
    />
  );
}

/** Same idea for the mobile row, which has no dot to pulse. */
function PillLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <span className={cn(pending && 'opacity-60')}>{label}</span>;
}

/**
 * Portal navigation. Renders a vertical left rail on desktop and a swipeable
 * row inside the black top bar on mobile. Active state is derived from the
 * current pathname, with longest-prefix-match so that e.g. /portal/shop/ghk-cu
 * still highlights the "Shop" tab.
 */
export function PortalNav({ nav, variant }: PortalNavProps) {
  const pathname = usePathname() ?? '';

  // Find the best-matching nav item (longest prefix) so deep routes like
  // /portal/shop/ghk-cu stay highlighted under "Shop".
  const activeHref = (() => {
    const matches = nav
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(item.href + '/')
      )
      .sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.href;
  })();

  if (variant === 'mobile') {
    // Sits on the frosted black bar. Scrolls sideways inside itself, so the
    // page never does; each item is a 44px-tall tap target.
    return (
      <nav aria-label="Portal" className="mx-auto max-w-7xl">
        <div className="flex overflow-x-auto px-1.5 scrollbar-hide">
          {nav.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-11 flex-shrink-0 items-center gap-1.5 px-3 text-[14px] transition-colors',
                  isActive ? 'text-white' : 'text-white/65 hover:text-white'
                )}
              >
                <PillLabel label={item.label} />
                {!!item.badge && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#D5A850] px-1 font-mono text-[11px] leading-[1.25rem] text-black tabular-nums">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span aria-hidden className="absolute inset-x-3 bottom-0 h-[2px] bg-[#D5A850]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Desktop sidebar (vertical rail), on the white ground.
  return (
    <nav aria-label="Portal">
      <ul className="space-y-0.5">
        {nav.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-[2px] px-3 py-2.5 text-[15px] transition-colors',
                  isActive
                    ? 'bg-[#F2F2F0] text-black'
                    : 'text-black/65 hover:bg-black/[0.03] hover:text-black'
                )}
              >
                <NavDot isActive={isActive} />
                <span className="flex-1 truncate">{item.label}</span>
                {!!item.badge && (
                  <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-black px-1.5 py-0.5 font-mono text-[11px] leading-none text-white tabular-nums">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
