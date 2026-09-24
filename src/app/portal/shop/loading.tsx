import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

/**
 * Shop catalog skeleton. Headline, search + category filter, then the grid
 * of tall photo cards (2 across on a phone, 3 on desktop, 4 on wide).
 */
export default function ShopLoading() {
  return (
    <PortalSkeletonShell>
      <Shimmer className="mb-4 h-10 w-2/3 max-w-md" />
      <Shimmer className="mb-10 h-4 w-2/3 max-w-xl" />

      {/* Search + category filter (sits at the bottom on a phone) */}
      <div className="mb-8 hidden rounded-[4px] bg-[#F2F2F0] p-3 md:block">
        <div className="mb-3 h-11 rounded-[2px] bg-white ring-1 ring-black/10" />
        <div className="flex gap-2">
          {[96, 110, 100, 90, 105].map((w, i) => (
            <Shimmer key={i} className="h-9 flex-shrink-0 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Shimmer key={i} className="aspect-[3/4] w-full rounded-[4px]" />
        ))}
      </div>
    </PortalSkeletonShell>
  );
}
