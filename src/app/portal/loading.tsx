import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

/**
 * Loading skeleton for the member dashboard (and any /portal/* page that
 * doesn't have its own loading.tsx). Mirrors the dashboard layout:
 * eyebrow + headline + welcome card, then quick-action cards on the right.
 */
export default function PortalLoading() {
  return (
    <PortalSkeletonShell>
      <div className="grid gap-10 md:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div>
          <Shimmer className="mb-4 h-3 w-32" />
          <Shimmer className="mb-3 h-12 w-3/4" />
          <Shimmer className="mb-10 h-12 w-2/3" />

          {/* Status / welcome card */}
          <div className="mb-8 rounded-3xl border border-line bg-surface p-6 md:p-8">
            <Shimmer className="mb-3 h-3 w-24" />
            <Shimmer className="mb-2 h-6 w-1/2" />
            <Shimmer className="h-4 w-3/4" />
            <div className="mt-6 flex gap-3">
              <Shimmer className="h-10 w-32 rounded-full" />
              <Shimmer className="h-10 w-28 rounded-full" />
            </div>
          </div>

          {/* Recent activity card */}
          <div className="rounded-3xl border border-line bg-surface p-6 md:p-8">
            <Shimmer className="mb-4 h-4 w-40" />
            <div className="space-y-3">
              <Shimmer className="h-10 w-full" />
              <Shimmer className="h-10 w-full" />
              <Shimmer className="h-10 w-full" />
            </div>
          </div>
        </div>

        {/* Quick-action sidebar */}
        <aside className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <Shimmer className="mb-2 h-3 w-16" />
              <Shimmer className="mb-2 h-5 w-3/4" />
              <Shimmer className="h-4 w-full" />
              <Shimmer className="mt-3 h-8 w-20 rounded-full" />
            </div>
          ))}
        </aside>
      </div>
    </PortalSkeletonShell>
  );
}
