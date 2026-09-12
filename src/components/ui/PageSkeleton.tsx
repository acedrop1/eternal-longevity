/**
 * Shown while a page's data is still coming.
 *
 * Next streams a server component, which means the old screen simply sits
 * there until the new one is ready — indistinguishable from a click that did
 * nothing. A shape in roughly the right place reads as loading; a spinner in
 * the middle of an empty page reads as broken.
 */
export function PageSkeleton() {
  return (
    <div className="animate-pulse px-4 py-8 md:px-6 md:py-10 lg:px-8">
      <div className="h-3 w-28 rounded bg-foreground/10" />
      <div className="mt-4 h-9 w-2/3 max-w-md rounded-lg bg-foreground/10" />
      <div className="mt-3 h-4 w-full max-w-xl rounded bg-foreground/[0.07]" />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-line bg-surface" />
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-32 rounded-3xl border border-line bg-surface"
          />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
