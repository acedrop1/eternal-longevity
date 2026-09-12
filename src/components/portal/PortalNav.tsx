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
      className={cn(
        'h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors',
        pending
          ? 'animate-ping bg-accent'
          : isActive
            ? 'bg-accent'
            : 'bg-foreground/20 group-hover:bg-foreground/40',
      )}
    />
  );
}

/** Same idea for the mobile pills, which have no dot to pulse. */
function PillLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span className={cn(pending && 'opacity-60')}>
      {label.toUpperCase()}
    </span>
  );
}

/**
 * Portal navigation. Renders a vertical left-rail on desktop and a horizontal
 * scrolling pill row on mobile. Active state is derived from the current
 * pathname, with longest-prefix-match so that e.g. /portal/shop/ghk-cu still
 * highlights the "Shop" tab.
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
    return (
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {nav.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-shrink-0 rounded-full border px-3 py-1.5 text-xs tracking-wider transition-colors',
                  isActive
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line bg-surface text-foreground/75 hover:text-foreground hover:border-foreground/30'
                )}
              >
                <PillLabel label={item.label} />
                {!!item.badge && (
                  <span className="ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-black">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop sidebar (vertical rail)
  return (
    <nav className="sticky top-[4.5rem]">
      <div className="mb-3 px-3 text-[10px] tracking-widest text-foreground/45">
        NAVIGATION
      </div>
      <ul className="space-y-1">
        {nav.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-foreground/10 text-foreground font-medium'
                    : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                )}
              >
                <NavDot isActive={isActive} />
                <span className="flex-1 truncate">{item.label}</span>
                {!!item.badge && (
                  <span
                    className={cn(
                      'inline-flex min-w-[1.3rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      isActive
                        ? 'bg-accent text-black'
                        : 'bg-accent/15 text-accent'
                    )}
                  >
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
