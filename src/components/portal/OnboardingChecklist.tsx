import Link from 'next/link';
import type { OnboardingStep } from '@/lib/onboarding';

/**
 * What a member still owes before a prescriber can review them.
 *
 * Only the step they are actually on carries its detail. Six expanded steps
 * made a first login look like a mountain of paperwork; the same six as single
 * lines, with one open, reads as almost done. The list disappears entirely
 * once nothing is outstanding.
 */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  const currentKey = steps.find((s) => !s.done)?.key;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-4 px-6 pb-4 pt-5">
        <p className="text-sm font-medium text-foreground">
          Before a prescriber can review you
        </p>
        <p className="flex-none text-[11px] tracking-widest text-foreground/45 tabular-nums">
          {done} / {steps.length}
        </p>
      </div>

      {/* Progress. One bar reads faster than counting ticks. */}
      <div className="mx-6 mb-1 h-px bg-foreground/10">
        <div
          className="h-px bg-accent"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>

      <ol className="px-2 pb-2">
        {steps.map((step) => {
          const current = step.key === currentKey;
          return (
            <li
              key={step.key}
              className={
                current
                  ? 'mx-1 my-1 rounded-2xl bg-background px-4 py-4'
                  : 'mx-1 flex items-center gap-3 px-4 py-2.5'
              }
            >
              {current ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    {step.title}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {step.collects.map((c) => (
                      <li
                        key={c}
                        className="flex gap-2 text-xs leading-relaxed text-foreground/55"
                      >
                        <span aria-hidden className="flex-none text-foreground/25">
                          ·
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                  {step.href && (
                    <Link
                      href={step.href}
                      className="mt-3 inline-block rounded-full bg-accent px-5 py-2 text-xs font-semibold text-black transition-colors hover:bg-accent-soft"
                    >
                      {step.action ?? 'Continue'} →
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 flex-none rounded-full ${
                      step.done ? 'bg-accent' : 'bg-foreground/20'
                    }`}
                  />
                  <span
                    className={`min-w-0 truncate text-sm ${
                      step.done
                        ? 'text-foreground/40 line-through'
                        : 'text-foreground/50'
                    }`}
                  >
                    {step.title}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
