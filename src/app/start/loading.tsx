/**
 * Intake wizard skeleton, laid out like the wizard itself (progress row,
 * section line, heading, option tiles, action bar) so nothing jumps when the
 * real step arrives.
 */
const block = 'animate-pulse bg-ink/[0.06] motion-reduce:animate-none';

export default function StartLoading() {
  return (
    <main className="min-h-screen bg-white" aria-busy="true" aria-label="Loading your assessment">
      {/* Focused header: logo, step, close + progress bar */}
      <div className="flex h-14 items-center justify-between px-4 md:h-16 md:px-10">
        <div className={`${block} h-6 w-20 rounded-thumb`} />
        <div className={`${block} h-3 w-20 rounded-thumb`} />
        <div className="h-10 w-10 rounded-full bg-milk" />
      </div>
      <div className="px-4 pb-2 md:px-10">
        <div className="h-1.5 w-full rounded-full bg-milk">
          <div className="h-full w-1/6 rounded-full bg-butter" />
        </div>
      </div>
      <div className="mx-auto flex h-[calc(100svh-80px)] max-w-2xl flex-col px-4 pb-3 pt-6 md:px-6 md:pt-12">

        <div className="flex-1 px-1">
          <div className={`${block} mb-4 h-3 w-24 rounded-thumb`} />
          <div className={`${block} mb-3 h-10 w-3/4 rounded-inner`} />
          <div className={`${block} mb-8 h-4 w-2/3 rounded-thumb`} />

          <div className="grid gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${block} h-12 w-full rounded-inner`} />
            ))}
          </div>
        </div>

        {/* Action bar: sticky on phones, inline on desktop */}
        <div className="flex items-center justify-between rounded-shell bg-white/85 p-2 ring-1 ring-ink/10 md:hidden">
          <div className="h-11 w-20 rounded-full bg-milk" />
          <div className="h-11 w-32 rounded-full bg-butter/60" />
        </div>
      </div>
    </main>
  );
}
