/** Checkout's shape while it streams: form sections left, summary panel right. */
export default function Loading() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 md:px-8 md:py-12">
        <div className="mb-8 h-6 w-32 rounded-[2px] bg-black/[0.07]" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div className="space-y-3">
            <div className="mb-6 h-12 w-2/3 max-w-sm rounded-[2px] bg-black/[0.07]" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-[4px] ring-1 ring-black/10" />
            ))}
          </div>
          <div className="h-72 rounded-[4px] bg-[#F2F2F0]" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </main>
  );
}
