import Link from 'next/link';
import { logoutAction } from '@/lib/auth-actions';
import { type Role, type SessionUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Wordmark } from '@/components/nav/Wordmark';
import { CartButton } from '@/components/cart/CartButton';
import { PortalNav, type NavItem } from '@/components/portal/PortalNav';
import { enrichNavWithCounts } from '@/lib/pending-counts';
import { IdleTimeout } from '@/components/portal/IdleTimeout';
import { PortalContent } from '@/components/portal/PortalContent';
import { IDLE_MINUTES } from '@/lib/session-policy';

/** Role chip in the top bar: a label and a dot, so no role reads on colour alone. */
/** Frosted bar, as the public header (src/components/nav/Header.tsx) wears it once scrolled. */
const GLASS_BAR =
  'rounded-inner bg-white/70 text-ink shadow-[0_10px_40px_-16px_rgba(17,17,17,0.22)] ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150';

const ROLE_THEME: Record<Role, { label: string; shortLabel: string; dot: string }> = {
  member: { label: 'Member', shortLabel: 'Member', dot: 'bg-butter-deep' },
  doctor: { label: 'Doctor · Clinical', shortLabel: 'Doctor', dot: 'bg-sky-400' },
  admin: { label: 'Admin · Operations', shortLabel: 'Admin', dot: 'bg-ink/60' },
  pharmacy: { label: 'Pharmacy · Fulfillment', shortLabel: 'Pharmacy', dot: 'bg-emerald-400' },
};

interface PortalShellProps {
  user: SessionUser;
  /** Optional nav links rendered in the left sidebar (desktop) and the
   *  horizontal scroll row (mobile, inside the top bar). */
  nav?: NavItem[];
  /** Body theme. 'light' (default) gives the content area the white ground;
   *  the top bar is always the frosted glass of the public header. */
  bodyTheme?: 'dark' | 'light';
  children: React.ReactNode;
}

/**
 * Shared chrome for /portal/*, every role.
 *
 *   Top bar (frosted glass, like the public header):
 *     logo · role chip · cart (member) · name · log out
 *     + on mobile, a swipeable glass nav strip underneath
 *
 *   Desktop (md+): left sidebar nav · main content on the right
 *   Mobile (<md):  main content full width
 */
export async function PortalShell({
  user,
  nav = [],
  bodyTheme = 'light',
  children,
}: PortalShellProps) {
  const theme = ROLE_THEME[user.role];
  const lightBody = bodyTheme !== 'dark';
  // Staff screens are dense tables and cards: white cards on a light grey
  // page (the Shopify admin pattern) so each card reads as its own surface.
  const staff = user.role !== 'member';

  // Attach pending-task count badges to the nav.
  const navItems = await enrichNavWithCounts(nav, user.role);

  return (
    <>
      {/* Staff can reach other people's records, so their session is cut
          sooner. See session-policy.ts. */}
      <IdleTimeout
        idleMinutes={
          user.role === 'member' ? IDLE_MINUTES.member : IDLE_MINUTES.staff
        }
      />
      <div className={cn('min-h-screen', lightBody ? (staff ? 'bg-[#ECECE8] text-ink' : 'bg-white text-ink') : 'bg-ink text-white')}>
        {/* ============ TOP BAR ============ */}
        {/* The public header's frosted glass: a floating rounded bar, milky
            white so it reads over anything scrolling beneath it. */}
        <header className="sticky top-0 z-40 px-3 pt-3 md:px-5">
          <div className={GLASS_BAR}>
            <div className="flex h-14 items-center gap-2 px-2 sm:gap-3 sm:px-3 md:px-4">
              <Link
                href={user.redirectTo}
                className="flex min-h-[44px] flex-shrink-0 items-center gap-2.5 rounded-full px-1 transition-opacity hover:opacity-80"
              >
                {/* Same mark and deep-butter tint as the public header. */}
                <Wordmark href={null} className="text-[26px] text-[#F2D060] md:text-[30px]" />
                <span className="hidden text-[13px] font-medium text-ink/65 sm:inline">Portal</span>
              </Link>

              <span className="ml-auto inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-medium leading-none text-ink/80 ring-1 ring-ink/5">
                <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} />
                <span className="sm:hidden">{theme.shortLabel}</span>
                <span className="hidden sm:inline">{theme.label}</span>
              </span>

              {user.role === 'member' && <CartButton />}

              <span className="hidden max-w-[10rem] truncate text-[13px] font-medium text-ink/70 md:inline">
                {user.name}
              </span>

              <form action={logoutAction} className="flex-shrink-0">
                <button
                  type="submit"
                  aria-label="Log out"
                  className="grid h-11 w-11 place-items-center rounded-full bg-white/70 text-[13px] font-semibold text-ink ring-1 ring-ink/5 transition-colors hover:bg-white sm:flex sm:h-auto sm:w-auto sm:px-4 sm:py-2"
                >
                  <svg
                    className="sm:hidden"
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </form>
            </div>
          </div>

          {/* Mobile-only nav strip, swipeable, same glass as the bar */}
          {navItems.length > 0 && (
            <div className={cn(GLASS_BAR, 'mt-2 md:hidden')}>
              <PortalNav nav={navItems} variant="mobile" />
            </div>
          )}
        </header>

        {/* ============ CONTENT. Sidebar + main ============ */}
        {/* theme-light stays on the content wrapper: staff pages (admin,
            doctor, pharmacy) still colour themselves through the theme
            tokens (text-foreground, bg-surface, border-line), and this is
            what resolves those to ink on white. */}
        <div className={cn(lightBody && 'theme-light')}>
          <div className="px-3 md:flex md:items-start md:gap-6 md:px-5">
            {/* Left sidebar. Desktop only */}
            {navItems.length > 0 && (
              <aside className="sticky top-[5.5rem] mt-6 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto rounded-shell bg-milk p-2 md:block md:w-56 md:flex-shrink-0 lg:w-60">
                <PortalNav nav={navItems} variant="sidebar" />
              </aside>
            )}

            {/* Main content */}
            <main className="min-h-[calc(100vh-5rem)] min-w-0 flex-1">
              <PortalContent>{children}</PortalContent>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
