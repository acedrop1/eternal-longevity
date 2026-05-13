import { Shimmer } from '@/components/skeletons/Shimmer';

export default function CheckoutLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-8 grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Left — flow */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-line bg-surface p-6"
            >
              <Shimmer className="mb-3 h-3 w-20" />
              <Shimmer className="mb-4 h-6 w-1/2" />
              <Shimmer className="mb-2 h-10 w-full rounded-xl" />
              <Shimmer className="h-10 w-3/4 rounded-xl" />
            </div>
          ))}
        </div>

        {/* Right — order summary */}
        <aside>
          <div className="rounded-2xl border border-line bg-surface p-6 sticky top-6">
            <Shimmer className="mb-4 h-4 w-32" />
            <Shimmer className="mb-3 h-16 w-full rounded-xl" />
            <Shimmer className="mb-2 h-3 w-full" />
            <Shimmer className="mb-2 h-3 w-full" />
            <Shimmer className="my-4 h-px w-full" />
            <Shimmer className="h-5 w-1/3 mb-4" />
            <Shimmer className="h-12 w-full rounded-full" />
          </div>
        </aside>
      </div>
    </main>
  );
}
