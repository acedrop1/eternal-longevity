import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

/**
 * Shop catalog skeleton. Search input, category pills, then a 3-column
 * product grid (1 on mobile, 2 on tablet, 3 on desktop).
 */
export default function ShopLoading() {
  return (
    <PortalSkeletonShell>
      {/* Hero text */}
      <div className="mb-10">
        <Shimmer className="mb-3 h-3 w-40" />
        <Shimmer className="mb-3 h-12 w-3/4" />
        <Shimmer className="mb-5 h-4 w-2/3" />

        {/* Trust chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Shimmer className="h-10 rounded-xl" />
          <Shimmer className="h-10 rounded-xl" />
          <Shimmer className="h-10 rounded-xl" />
          <Shimmer className="h-10 rounded-xl" />
        </div>
      </div>

      {/* Search bar */}
      <Shimmer className="mb-3 h-11 w-full rounded-full" />
      {/* Category pills */}
      <div className="mb-10 flex gap-2 overflow-x-auto scrollbar-hide">
        {[80, 110, 100, 90, 105].map((w, i) => (
          <Shimmer
            key={i}
            className="h-9 flex-shrink-0 rounded-full"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>

      {/* Product grid */}
      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-[2rem] border border-line bg-surface overflow-hidden"
          >
            <Shimmer className="aspect-[5/6] w-full rounded-none" />
            <div className="p-5 md:p-6">
              <div className="mb-3 flex gap-2">
                <Shimmer className="h-5 w-20 rounded-full" />
                <Shimmer className="h-5 w-24 rounded-full" />
              </div>
              <Shimmer className="mb-2 h-4 w-full" />
              <Shimmer className="mb-2 h-4 w-3/4" />
              <Shimmer className="mb-5 h-4 w-1/2" />
              <div className="flex items-end justify-between">
                <div>
                  <Shimmer className="mb-1 h-3 w-16" />
                  <Shimmer className="h-6 w-20" />
                </div>
                <Shimmer className="h-4 w-16 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PortalSkeletonShell>
  );
}
