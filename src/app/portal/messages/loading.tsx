import { PortalSkeletonShell } from '@/components/skeletons/PortalSkeletonShell';
import { Shimmer } from '@/components/skeletons/Shimmer';

/** Messages while the server loads them: the inbox's shape (title, two conversation rows), and the chat beside it on desktop. */
export default function Loading() {
  return (
    <PortalSkeletonShell>
      <div className="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <Shimmer className="h-9 w-44" />
          <div className="mt-5 divide-y divide-ink/[0.06] rounded-shell bg-milk">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-4">
                <Shimmer className="h-11 w-11 flex-none rounded-full" />
                <div className="flex-1">
                  <Shimmer className="h-4 w-28" />
                  <Shimmer className="mt-2 h-3.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:block">
          <div className="flex items-center gap-3 border-b border-ink/[0.06] pb-4">
            <Shimmer className="h-11 w-11 rounded-full" />
            <Shimmer className="h-4 w-32" />
          </div>
          <Shimmer className="mt-6 h-16 w-2/3 rounded-[20px]" />
          <Shimmer className="ml-auto mt-4 h-12 w-1/2 rounded-[20px]" />
        </div>
      </div>
    </PortalSkeletonShell>
  );
}
