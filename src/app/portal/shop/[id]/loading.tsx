import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

/**
 * Product PDP skeleton. Photo on top (mobile), name + price + plan picker +
 * CTA below; two columns from md.
 */
export default function PdpLoading() {
  return (
    <PortalSkeletonShell>
      {/* Mobile: photo, then the plan picker */}
      <div className="md:hidden">
        <Shimmer className="aspect-[4/5] w-full rounded-[4px]" />
        <Shimmer className="mt-6 h-9 w-2/3" />
        <Shimmer className="mt-3 h-4 w-1/2" />
        <Shimmer className="mt-6 h-10 w-32" />
        <div className="mt-5 grid grid-cols-3 gap-1.5">
          <Shimmer className="h-16 rounded-[4px]" />
          <Shimmer className="h-16 rounded-[4px]" />
          <Shimmer className="h-16 rounded-[4px]" />
        </div>
        <Shimmer className="mt-5 h-12 w-full rounded-full" />
      </div>

      {/* Desktop: two-column */}
      <div className="hidden grid-cols-[1.1fr_1fr] gap-12 md:grid lg:gap-16">
        <Shimmer className="aspect-[4/5] w-full rounded-[4px]" />
        <div>
          <Shimmer className="mb-3 h-12 w-2/3" />
          <Shimmer className="mb-8 h-5 w-1/3" />
          <Shimmer className="mb-2 h-4 w-full" />
          <Shimmer className="mb-2 h-4 w-full" />
          <Shimmer className="mb-8 h-4 w-3/4" />
          <Shimmer className="mb-6 h-10 w-36" />
          <div className="mb-6 space-y-2">
            <Shimmer className="h-16 w-full rounded-[4px]" />
            <Shimmer className="h-16 w-full rounded-[4px]" />
            <Shimmer className="h-16 w-full rounded-[4px]" />
          </div>
          <Shimmer className="h-12 w-full rounded-full" />
        </div>
      </div>
    </PortalSkeletonShell>
  );
}
