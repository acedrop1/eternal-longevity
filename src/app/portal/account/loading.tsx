import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

export default function AccountLoading() {
  return (
    <PortalSkeletonShell>
      <Shimmer className="mb-10 h-10 w-1/2 max-w-sm" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="hidden h-72 rounded-[4px] bg-[#F2F2F0] lg:block" />
        <div className="space-y-6 lg:col-span-2">
          {/* Profile */}
          <div className="rounded-[4px] bg-[#F2F2F0] p-6 md:p-8">
            <Shimmer className="mb-6 h-6 w-32" />
            <div className="grid gap-5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <Shimmer className="mb-2 h-3 w-20" />
                  <div className="h-12 rounded-[2px] bg-white ring-1 ring-black/10" />
                </div>
              ))}
            </div>
          </div>
          {/* Payment + addresses */}
          {[0, 1].map((i) => (
            <div key={i} className="rounded-[4px] bg-[#F2F2F0] p-6 md:p-8">
              <Shimmer className="mb-6 h-6 w-40" />
              <div className="h-16 rounded-[2px] bg-white ring-1 ring-black/10" />
            </div>
          ))}
        </div>
      </div>
    </PortalSkeletonShell>
  );
}
