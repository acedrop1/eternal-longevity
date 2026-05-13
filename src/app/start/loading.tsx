import { Shimmer } from '@/components/skeletons/Shimmer';

/**
 * Intake wizard skeleton — shows the progress bar + step heading + a few
 * pill/grid placeholders + Continue button so the page feels live as soon
 * as the user clicks "Start Your Assessment".
 */
export default function StartLoading() {
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Top: progress bar + step counter */}
      <header className="fixed top-0 inset-x-0 z-30 bg-background/85 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-3xl px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-3 w-24" />
          </div>
          <Shimmer className="h-1 w-1/3 rounded-full" />
        </div>
      </header>

      {/* Body: eyebrow, headline, fields */}
      <div className="mx-auto max-w-2xl px-6 pt-32 pb-32">
        <Shimmer className="mb-3 h-3 w-24" />
        <Shimmer className="mb-4 h-10 w-3/4" />
        <Shimmer className="mb-12 h-4 w-2/3" />

        {/* Pill-grid placeholders */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 mb-12">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Shimmer key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>

        {/* CTA row */}
        <div className="flex items-center justify-between">
          <Shimmer className="h-10 w-24 rounded-full" />
          <Shimmer className="h-12 w-32 rounded-full" />
        </div>
      </div>
    </main>
  );
}
