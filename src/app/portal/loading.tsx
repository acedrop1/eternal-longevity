import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

export default function Loading() {
  return (
    <PortalSkeletonShell>
      <Shimmer className="h-10 w-2/3 max-w-md" />
      <Shimmer className="mt-4 h-4 w-full max-w-xl" />
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-[4px] bg-[#F2F2F0]" />
        ))}
      </div>
      <div className="mt-3 h-40 rounded-[4px] bg-[#F2F2F0]" />
    </PortalSkeletonShell>
  );
}
