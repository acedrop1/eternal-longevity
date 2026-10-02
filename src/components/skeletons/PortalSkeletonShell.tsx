import { Shimmer } from './Shimmer';
import { Wordmark } from '@/components/nav/Wordmark';

/** Same frosted bar as PortalShell. */
const GLASS_BAR =
  'rounded-inner bg-white/70 text-ink shadow-[0_10px_40px_-16px_rgba(17,17,17,0.22)] ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150';

/**
 * Skeleton chrome that mirrors PortalShell's layout (frosted glass top bar +
 * milk sidebar on a white ground) with placeholder blocks. Used by loading.tsx
 * files inside /portal/* so the user sees the correct page shape immediately
 * while the server renders the real page.
 */
export function PortalSkeletonShell({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-ink">
      {/* ============ TOP BAR ============ */}
      <header className="sticky top-0 z-40 px-3 pt-3 md:px-5">
        <div className={GLASS_BAR}>
          <div className="flex h-14 items-center gap-3 px-3 md:px-4">
            <div className="flex items-center gap-2.5 px-1">
              <Wordmark href={null} className="text-[26px] text-[#F2D060] md:text-[30px]" />
              <span className="hidden text-[13px] font-medium text-ink/65 sm:inline">Portal</span>
            </div>
            {/* role chip + log out placeholders */}
            <span className="ml-auto h-7 w-20 animate-pulse rounded-full bg-ink/[0.06]" />
            <span className="h-9 w-9 animate-pulse rounded-full bg-ink/[0.06] sm:w-20" />
          </div>
        </div>
        {/* mobile nav strip */}
        <div className={`${GLASS_BAR} mt-2 flex h-14 items-center gap-2 px-2 md:hidden`}>
          {[80, 56, 64, 84].map((w) => (
            <span key={w} className="h-11 animate-pulse rounded-full bg-ink/[0.05]" style={{ width: w }} />
          ))}
        </div>
      </header>

      {/* ============ BODY. Sidebar + content ============ */}
      <div className="px-3 md:flex md:items-start md:gap-6 md:px-5">
        <aside className="mt-6 hidden rounded-shell bg-milk p-2 md:block md:w-56 md:flex-shrink-0 lg:w-60">
          <div className="space-y-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Shimmer key={i} className="h-11 w-full rounded-full" />
            ))}
          </div>
        </aside>

        {/* Content area. The per-route loading.tsx passes children here */}
        <div className="min-h-[60vh] min-w-0 flex-1 px-2 py-8 md:px-2 md:py-6 lg:px-4">
          {children}
          <span className="sr-only">Loading…</span>
        </div>
      </div>
    </div>
  );
}
