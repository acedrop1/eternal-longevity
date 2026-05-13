import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

export default function AccountLoading() {
  return (
    <PortalSkeletonShell>
      <Shimmer className="mb-3 h-3 w-24" />
      <Shimmer className="mb-10 h-12 w-1/2" />
      {/* Account info card */}
      <div className="mb-6 rounded-3xl border border-line bg-surface p-6 md:p-8">
        <Shimmer className="mb-4 h-5 w-32" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Shimmer className="mb-1 h-3 w-16" />
            <Shimmer className="h-5 w-full" />
          </div>
          <div>
            <Shimmer className="mb-1 h-3 w-16" />
            <Shimmer className="h-5 w-full" />
          </div>
        </div>
      </div>
      {/* Saved addresses */}
      <div className="mb-6 rounded-3xl border border-line bg-surface p-6 md:p-8">
        <Shimmer className="mb-4 h-5 w-40" />
        <div className="space-y-3">
          <Shimmer className="h-20 w-full rounded-2xl" />
          <Shimmer className="h-20 w-full rounded-2xl" />
        </div>
      </div>
      {/* Saved cards */}
      <div className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <Shimmer className="mb-4 h-5 w-36" />
        <Shimmer className="h-16 w-full rounded-2xl" />
      </div>
    </PortalSkeletonShell>
  );
}
