/** Three butter dots breathing in turn: the brand's "one moment". */
export function LoadingDots({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden className="anim-breathe h-2.5 w-2.5 rounded-full bg-ink" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}
