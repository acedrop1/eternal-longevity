import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

/**
 * Product PDP skeleton — full-bleed gallery placeholder on top (mobile),
 * info panel below with name + tagline + price + plan radios + CTA.
 */
export default function PdpLoading() {
  return (
    <PortalSkeletonShell>
      {/* Mobile + tablet: gallery on top, info panel below */}
      <div className="md:hidden -mx-4 -mt-6 relative">
        <Shimmer
          className="w-full"
          style={{ height: '70svh', minHeight: 460 }}
        />
        <div className="px-6 -mt-7 pb-32 relative bg-background rounded-t-[1.5rem]">
          <Shimmer className="mx-auto mb-5 h-1 w-10 rounded-full" />
          <Shimmer className="mb-4 h-6 w-2/3 rounded-full" />
          <Shimmer className="mb-2 h-10 w-1/2" />
          <Shimmer className="mb-5 h-4 w-2/3" />
          <Shimmer className="mb-6 h-7 w-40" />
          <Shimmer className="mb-3 h-4 w-20" />
          <div className="space-y-2 mb-6">
            <Shimmer className="h-16 w-full rounded-2xl" />
            <Shimmer className="h-16 w-full rounded-2xl" />
            <Shimmer className="h-16 w-full rounded-2xl" />
          </div>
          <Shimmer className="h-14 w-full rounded-2xl" />
        </div>
      </div>

      {/* Desktop: two-column */}
      <div className="hidden md:grid grid-cols-[1.1fr_1fr] gap-16">
        <div>
          <Shimmer className="aspect-[4/5] w-full rounded-[2.5rem]" />
        </div>
        <div>
          <div className="mb-4 flex gap-2">
            <Shimmer className="h-5 w-20 rounded-full" />
            <Shimmer className="h-5 w-24 rounded-full" />
          </div>
          <Shimmer className="mb-2 h-12 w-2/3" />
          <Shimmer className="mb-6 h-5 w-1/3" />
          <Shimmer className="mb-6 h-4 w-32" />
          <Shimmer className="mb-2 h-4 w-full" />
          <Shimmer className="mb-2 h-4 w-full" />
          <Shimmer className="mb-8 h-4 w-3/4" />
          <Shimmer className="mb-3 h-4 w-20" />
          <div className="space-y-2 mb-6">
            <Shimmer className="h-20 w-full rounded-2xl" />
            <Shimmer className="h-20 w-full rounded-2xl" />
            <Shimmer className="h-20 w-full rounded-2xl" />
          </div>
          <Shimmer className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </PortalSkeletonShell>
  );
}
