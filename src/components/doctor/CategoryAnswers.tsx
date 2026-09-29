import { ago, type CategorySection, type ThreadStatus } from '@/lib/prescriber-view';
import { cn } from '@/lib/utils';

/** Amber "Review" chip for answers that match a field's flagOn. */
export function ReviewChip({ children = 'Review' }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-600/25 bg-amber-50 px-2.5 py-1 text-[12px] font-medium leading-none text-amber-800">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {children}
    </span>
  );
}

/**
 * Category answers (hair, skin, ...) as question + chosen labels, with photos
 * and lab files. Plain markup so it renders in server and client trees; a
 * photo opens full size in a new tab.
 */
export function CategoryAnswers({ sections }: { sections: CategorySection[] }) {
  if (!sections.length) return null;
  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <div key={s.key}>
          <div className="mb-1.5 text-[13px] font-semibold text-ink">{s.title}</div>
          {s.items.length > 0 && (
            <dl>
              {s.items.map((i) => (
                <div
                  key={i.label}
                  className="flex flex-col gap-1 border-b border-ink/[0.06] py-2 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <dt className="text-[13px] leading-snug text-ink/70">{i.label}</dt>
                  <dd
                    className={cn(
                      'flex flex-wrap items-center gap-2 text-[13px] font-semibold leading-snug sm:max-w-[55%] sm:justify-end sm:text-right',
                      i.flag ? 'text-amber-800' : 'text-ink/90',
                    )}
                  >
                    <span className="whitespace-pre-wrap break-words">{i.value}</span>
                    {i.flag && <ReviewChip />}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {s.photos.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-3">
              {s.photos.map((p) => (
                <li key={p.path} className="w-28">
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${s.title} photo: ${p.label} (opens full size in a new tab)`}
                      className="block overflow-hidden rounded-thumb ring-1 ring-ink/10 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                    >
                      {/* Signed, short-lived URL from a private bucket: not for next/image. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="aspect-square w-full bg-white object-cover" />
                    </a>
                  ) : (
                    <div className="grid aspect-square w-full place-items-center rounded-thumb bg-white p-2 text-center text-[12px] text-ink/55 ring-1 ring-ink/10">
                      Photo unavailable
                    </div>
                  )}
                  <p className="mt-1 text-[12px] leading-snug text-ink/60">{p.label}</p>
                </li>
              ))}
            </ul>
          )}

          {s.files.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {s.files.map((f) => (
                <li key={f.path} className="text-[13px]">
                  {f.url ? (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
                    >
                      {f.label}
                    </a>
                  ) : (
                    <span className="text-ink/55">{f.label} (unavailable)</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/** "Waiting on patient · asked 3h ago" or "Patient replied 20m ago". */
export function ThreadChip({ status }: { status?: ThreadStatus }) {
  if (!status) return null;
  const waiting = status.state === 'waiting';
  return (
    <span
      suppressHydrationWarning
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-medium leading-none',
        waiting
          ? 'border-ink/15 bg-white text-ink/80'
          : 'border-emerald-600/25 bg-emerald-50 text-emerald-800',
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', waiting ? 'bg-ink/40' : 'bg-emerald-500')} />
      {waiting
        ? `Waiting on patient · asked ${ago(status.since)} ago`
        : `Patient replied ${ago(status.at)} ago`}
    </span>
  );
}
