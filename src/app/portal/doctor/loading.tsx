import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

/** Shown the instant a tab is clicked, while the server builds the page: a title and a list's outline. */
export default function Loading() {
  return (
    <PortalSkeletonShell>
      <Shimmer className="h-8 w-56" />
      <Shimmer className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-6 overflow-hidden rounded-inner border border-ink/[0.08] bg-white">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-ink/[0.06] px-4 py-4 last:border-0">
            <Shimmer className="h-9 w-9 flex-none rounded-full" />
            <Shimmer className="h-4 flex-1" />
            <Shimmer className="hidden h-4 w-24 sm:block" />
          </div>
        ))}
      </div>
    </PortalSkeletonShell>
  );
}
