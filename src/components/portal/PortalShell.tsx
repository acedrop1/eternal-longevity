import Link from 'next/link';
import { logoutAction } from '@/lib/auth-actions';
import { type Role, type SessionUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { CartButton } from '@/components/cart/CartButton';
import { PortalNav, type NavItem } from '@/components/portal/PortalNav';
import { enrichNavWithCounts } from '@/lib/pending-counts';
import { IdleTimeout } from '@/components/portal/IdleTimeout';
import { PortalContent } from '@/components/portal/PortalContent';
import { IDLE_MINUTES } from '@/lib/session-policy';

/** Role chip in the top bar: a label and a dot, so no role reads on colour alone. */
const ROLE_THEME: Record<Role, { label: string; shortLabel: string; dot: string }> = {
  member: { label: 'Member', shortLabel: 'Member', dot: 'bg-[#D5A850]' },
  doctor: { label: 'Doctor · Clinical', shortLabel: 'Doctor', dot: 'bg-sky-400' },
  admin: { label: 'Admin · Operations', shortLabel: 'Admin', dot: 'bg-white/70' },
  pharmacy: { label: 'Pharmacy · Fulfillment', shortLabel: 'Pharmacy', dot: 'bg-emerald-400' },
};

interface PortalShellProps {
  user: SessionUser;
  /** Optional nav links rendered in the left sidebar (desktop) and the
   *  horizontal scroll row (mobile, inside the top bar). */
  nav?: NavItem[];
  /** Body theme. 'light' (default) gives the content area the white ground;
   *  the top bar is always the frosted black of the public header. */
  bodyTheme?: 'dark' | 'light';
  children: React.ReactNode;
}

/**
 * Shared chrome for /portal/*, every role.
 *
 *   Top bar (frosted black, like the public header):
 *     logo · role chip · cart (member) · name · log out
 *     + on mobile, a swipeable nav row underneath
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
      <div className={cn('min-h-screen', lightBody ? 'bg-white text-black' : 'bg-black text-white')}>
        {/* ============ TOP BAR ============ */}
        {/* 75% black keeps white text above 7:1 over a white page. */}
        <header className="sticky top-0 z-40 bg-black/75 text-white backdrop-blur-2xl backdrop-saturate-150">
          <div className="border-b border-white/10">
            <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
              <Link
                href={user.redirectTo}
                className="flex min-h-[44px] flex-shrink-0 items-center gap-2.5 text-white/90 transition-colors hover:text-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Eternal Longevity" className="h-6 w-auto md:h-7" />
                <span className="hidden font-mono text-[13px] text-white/60 sm:inline">Portal</span>
              </Link>

              <span className="ml-auto inline-flex flex-shrink-0 items-center gap-1.5 rounded-[2px] px-2 py-1 font-mono text-[12px] leading-none text-white/85 ring-1 ring-white/20">
                <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} />
                <span className="sm:hidden">{theme.shortLabel}</span>
                <span className="hidden sm:inline">{theme.label}</span>
              </span>

              {user.role === 'member' && <CartButton />}

              <span className="hidden max-w-[10rem] truncate text-[13px] text-white/75 md:inline">
                {user.name}
              </span>

              <form action={logoutAction} className="flex-shrink-0">
                <button
                  type="submit"
                  aria-label="Log out"
                  className="grid h-11 w-11 place-items-center rounded-full font-mono text-[13px] text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:flex sm:h-auto sm:w-auto sm:px-3.5 sm:py-1.5 sm:ring-1 sm:ring-white/25"
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

          {/* Mobile-only nav row, swipeable */}
          {navItems.length > 0 && (
            <div className="border-b border-white/10 md:hidden">
              <PortalNav nav={navItems} variant="mobile" />
            </div>
          )}
        </header>

        {/* ============ CONTENT. Sidebar + main ============ */}
        {/* theme-light stays on the content wrapper: staff pages (admin,
            doctor, pharmacy) still colour themselves through the theme
            tokens (text-foreground, bg-surface, border-line), and this is
            what resolves those to black on white. */}
        <div className={cn(lightBody && 'theme-light')}>
          <div className="mx-auto max-w-7xl md:flex md:items-start">
            {/* Left sidebar. Desktop only */}
            {navItems.length > 0 && (
              <aside className="sticky top-14 hidden max-h-[calc(100vh-3.5rem)] self-start overflow-y-auto border-r border-black/10 px-3 py-8 md:block md:w-56 md:flex-shrink-0 md:py-10 lg:w-60 lg:px-4">
                <PortalNav nav={navItems} variant="sidebar" />
              </aside>
            )}

            {/* Main content */}
            <main className="min-h-[calc(100vh-3.5rem)] min-w-0 flex-1">
              <PortalContent>{children}</PortalContent>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
