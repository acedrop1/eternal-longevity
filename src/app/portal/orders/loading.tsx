import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

/**
 * Orders list skeleton. Headline, then a stack of order cards.
 */
export default function OrdersLoading() {
  return (
    <PortalSkeletonShell>
      <Shimmer className="mb-4 h-10 w-1/2 max-w-sm" />
      <Shimmer className="mb-10 h-4 w-2/3 max-w-lg" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[4px] bg-[#F2F2F0] p-5 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <Shimmer className="mb-2 h-3 w-32" />
                <Shimmer className="h-6 w-1/2" />
              </div>
              <Shimmer className="h-6 w-24" />
            </div>
            <Shimmer className="mb-3 h-4 w-full" />
            <Shimmer className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </PortalSkeletonShell>
  );
}
