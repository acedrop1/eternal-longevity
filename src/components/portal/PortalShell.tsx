import Link from 'next/link';
import { logoutAction } from '@/lib/auth-actions';
import { type DemoUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { CartButton } from '@/components/cart/CartButton';
import { PortalNav, type NavItem } from '@/components/portal/PortalNav';

const ROLE_THEME: Record<
  DemoUser['role'],
  { label: string; shortLabel: string; chipClass: string }
> = {
  member: {
    label: 'MEMBER',
    shortLabel: 'MEMBER',
    chipClass: 'border-accent/40 bg-accent/10 text-accent',
  },
  doctor: {
    label: 'DOCTOR · CLINICAL',
    shortLabel: 'DOCTOR',
    chipClass: 'border-sky-400/30 bg-sky-500/10 text-sky-300',
  },
  admin: {
    label: 'ADMIN · OPERATIONS',
    shortLabel: 'ADMIN',
    chipClass: 'border-foreground/20 bg-foreground/5 text-foreground/85',
  },
};

interface PortalShellProps {
  user: DemoUser;
  /** Optional nav links rendered in the left sidebar (desktop) and the
   *  horizontal scroll row (mobile, below the top bar). */
  nav?: NavItem[];
  /** Body theme. 'light' applies the off-white treatment to the main content
   *  area (sidebar + top bar stay on the dark frame). */
  bodyTheme?: 'dark' | 'light';
  children: React.ReactNode;
}

/**
 * Shared chrome for /portal/*.
 *
 *   Top bar (always dark):
 *     logo · role chip · cart (member) · name · log out
 *
 *   Desktop (md+):
 *     left sidebar with vertical nav · main content on the right
 *
 *   Mobile (<md):
 *     top bar · horizontal scrolling nav pills · main content full-width
 */
export function PortalShell({
  user,
  nav = [],
  bodyTheme = 'dark',
  children,
}: PortalShellProps) {
  const theme = ROLE_THEME[user.role];
  const lightBody = bodyTheme === 'light';

  return (
    <div className="min-h-screen bg-background">
      {/* ============ TOP BAR. Always dark ============ */}
      <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6">
          <Link
            href={user.redirectTo}
            className="flex flex-shrink-0 items-center gap-2 text-foreground hover:text-accent transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Eternal Longevity" className="h-6 w-auto" />
            <span className="hidden sm:inline text-xs tracking-widest text-foreground/55">
              PORTAL
            </span>
          </Link>

          <span
            className={cn(
              'ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-widest flex-shrink-0',
              theme.chipClass
            )}
          >
            <span className="sm:hidden">{theme.shortLabel}</span>
            <span className="hidden sm:inline">{theme.label}</span>
          </span>

          {user.role === 'member' && <CartButton />}

          <span className="hidden md:inline text-sm text-foreground/85 truncate max-w-[10rem]">
            {user.name}
          </span>

          <form action={logoutAction} className="flex-shrink-0">
            <button
              type="submit"
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs tracking-wider text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <span className="sm:hidden" aria-label="Log out">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className="hidden sm:inline">LOG OUT</span>
            </button>
          </form>
        </div>

        {/* Mobile-only sub-nav (horizontal scrolling pills) */}
        {nav.length > 0 && (
          <div className="md:hidden border-t border-line">
            <PortalNav nav={nav} variant="mobile" />
          </div>
        )}
      </header>

      {/* ============ CONTENT. Sidebar + main ============ */}
      <div className="mx-auto max-w-7xl md:flex md:items-start">
        {/* Left sidebar. Desktop only */}
        {nav.length > 0 && (
          <aside className="hidden md:block md:flex-shrink-0 md:w-56 lg:w-60 self-start sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto px-3 lg:px-4 py-8 md:py-10 border-r border-line">
            <PortalNav nav={nav} variant="sidebar" />
          </aside>
        )}

        {/* Main content */}
        <main
          className={cn(
            'flex-1 min-w-0 min-h-[calc(100vh-3.5rem)]',
            // theme-light flips bg/text/surface/line via CSS overrides
            lightBody && 'theme-light bg-background text-foreground'
          )}
        >
          <div className="px-4 md:px-6 lg:px-8 py-8 md:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
