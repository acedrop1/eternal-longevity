/**
 * Intake wizard skeleton, laid out like the wizard itself (progress row,
 * section line, heading, option tiles, action bar) so nothing jumps when the
 * real step arrives.
 */
const block = 'animate-pulse bg-black/[0.06] motion-reduce:animate-none';

export default function StartLoading() {
  return (
    <main className="min-h-screen bg-white" aria-busy="true" aria-label="Loading your assessment">
      <div className="mx-auto flex h-[100svh] max-w-2xl flex-col px-4 pb-3 pt-[100px] md:px-6 md:pb-5 md:pt-[120px]">
        {/* Progress row + bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className={`${block} h-3 w-20 rounded-[2px]`} />
          <div className={`${block} h-3 w-8 rounded-[2px]`} />
        </div>
        <div className="mb-8 h-1 w-full rounded-[2px] bg-black/10">
          <div className="h-full w-1/6 bg-accent/60" />
        </div>

        <div className="flex-1 px-1">
          <div className={`${block} mb-4 h-3 w-24 rounded-[2px]`} />
          <div className={`${block} mb-3 h-10 w-3/4 rounded-[4px]`} />
          <div className={`${block} mb-8 h-4 w-2/3 rounded-[2px]`} />

          <div className="grid gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${block} h-12 w-full rounded-[4px]`} />
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between rounded-[4px] bg-black/75 p-2">
          <div className="h-11 w-20 rounded-full ring-1 ring-white/25" />
          <div className="h-11 w-32 rounded-full bg-white/15" />
        </div>
      </div>
    </main>
  );
}
