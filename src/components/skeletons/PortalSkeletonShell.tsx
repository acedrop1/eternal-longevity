import { Shimmer } from './Shimmer';

/**
 * Skeleton chrome that mirrors PortalShell's layout (top bar + left sidebar)
 * but with placeholder blocks. Used by loading.tsx files inside /portal/* so
 * the user sees the correct page shape immediately while the server renders
 * the real page.
 */
export function PortalSkeletonShell({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* ============ TOP BAR ============ */}
      <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 md:px-6">
          {/* logo + portal label */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-6 w-auto opacity-90" />
            <span className="hidden sm:inline text-xs tracking-widest text-foreground/40">
              PORTAL
            </span>
          </div>
          {/* role chip placeholder */}
          <Shimmer className="ml-auto h-5 w-16 rounded-full" />
          {/* name + log out */}
          <Shimmer className="hidden sm:block h-5 w-20 rounded-full" />
          <Shimmer className="h-7 w-7 rounded-full" />
        </div>
      </header>

      {/* ============ BODY — sidebar + content ============ */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-10">
          {/* Sidebar */}
          <aside className="hidden md:block">
            <Shimmer className="mb-4 h-3 w-20" />
            <div className="space-y-2">
              <Shimmer className="h-9 w-full rounded-xl" />
              <Shimmer className="h-9 w-full rounded-xl" />
              <Shimmer className="h-9 w-full rounded-xl" />
              <Shimmer className="h-9 w-full rounded-xl" />
            </div>
          </aside>

          {/* Content area — the per-route loading.tsx passes children here */}
          <div className="min-h-[60vh]">{children}</div>
        </div>
      </div>
    </div>
  );
}
