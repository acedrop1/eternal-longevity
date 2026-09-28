'use client';

import { usePathname } from 'next/navigation';

/**
 * The content column of every portal page.
 *
 * Two jobs. It replays a short entrance on each route change — keyed on the
 * path, so it fires on navigation rather than only on first mount. And it owns
 * the vertical rhythm between top-level blocks, because pages were each
 * inventing their own and sections from different components ended up touching.
 */
export function PortalContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="anim-route portal-stack px-2 py-8 md:px-2 md:py-6 lg:px-4"
    >
      {children}
    </div>
  );
}
