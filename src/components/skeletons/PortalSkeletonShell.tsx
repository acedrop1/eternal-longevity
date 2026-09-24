import { Shimmer } from './Shimmer';

/**
 * Skeleton chrome that mirrors PortalShell's layout (frosted black top bar +
 * left sidebar on a white ground) with placeholder blocks. Used by loading.tsx
 * files inside /portal/* so the user sees the correct page shape immediately
 * while the server renders the real page.
 */
export function PortalSkeletonShell({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* ============ TOP BAR ============ */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-6 w-auto opacity-90 md:h-7" />
            <span className="hidden font-mono text-[13px] text-white/60 sm:inline">Portal</span>
          </div>
          {/* role chip + log out placeholders */}
          <span className="ml-auto h-6 w-16 animate-pulse rounded-[2px] bg-white/15" />
          <span className="h-8 w-8 animate-pulse rounded-full bg-white/15 sm:w-20" />
        </div>
        {/* mobile nav row */}
        <div className="flex h-11 items-center gap-6 border-t border-white/10 px-4 md:hidden">
          {[64, 36, 48, 68].map((w) => (
            <span key={w} className="h-3 animate-pulse rounded-[2px] bg-white/15" style={{ width: w }} />
          ))}
        </div>
      </header>

      {/* ============ BODY. Sidebar + content ============ */}
      <div className="mx-auto max-w-7xl md:flex md:items-start">
        <aside className="hidden border-r border-black/10 px-3 py-8 md:block md:w-56 md:flex-shrink-0 md:py-10 lg:w-60 lg:px-4">
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Shimmer key={i} className="h-9 w-full" />
            ))}
          </div>
        </aside>

        {/* Content area. The per-route loading.tsx passes children here */}
        <div className="min-h-[60vh] min-w-0 flex-1 px-4 py-8 md:px-6 md:py-10 lg:px-8">
          {children}
          <span className="sr-only">Loading…</span>
        </div>
      </div>
    </div>
  );
}
