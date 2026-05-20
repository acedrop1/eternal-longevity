import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

/**
 * Orders list skeleton. Eyebrow + headline, then a stack of order cards.
 */
export default function OrdersLoading() {
  return (
    <PortalSkeletonShell>
      <Shimmer className="mb-3 h-3 w-24" />
      <Shimmer className="mb-10 h-12 w-1/2" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-line bg-surface p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Shimmer className="mb-2 h-3 w-32" />
                <Shimmer className="h-5 w-1/2" />
              </div>
              <Shimmer className="h-6 w-24 rounded-full" />
            </div>
            <Shimmer className="mb-3 h-4 w-full" />
            <Shimmer className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </PortalSkeletonShell>
  );
}
