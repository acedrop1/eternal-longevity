import Link from 'next/link';
import type { OnboardingStep } from '@/lib/onboarding';
import { btnCta } from '@/components/portal/ui';

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
    <section className="overflow-hidden rounded-shell bg-milk">
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 md:px-6">
        <h2 className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]">
          Before a prescriber can review you
        </h2>
        <p className="flex-none text-[13px] font-medium text-ink/55 tabular-nums">
          {done} / {steps.length}
        </p>
      </div>

      {/* Progress. One bar reads faster than counting ticks. */}
      <div
        className="mx-5 mb-2 h-1.5 overflow-hidden rounded-full bg-ink/10 md:mx-6"
        role="progressbar"
        aria-label="Steps complete"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
      >
        <div
          className="h-full rounded-full bg-butter-deep"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>

      <ol className="px-2 pb-2">
        {steps.map((step) => {
          const current = step.key === currentKey;
          return (
            <li
              key={step.key}
              aria-current={current ? 'step' : undefined}
              className={
                current
                  ? 'm-1 rounded-inner bg-white px-4 py-4 ring-1 ring-ink/5'
                  : 'mx-1 flex items-center gap-3 px-4 py-2.5'
              }
            >
              {current ? (
                <>
                  <p className="text-[16px] font-medium text-ink">
                    {step.title}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {step.collects.map((c) => (
                      <li
                        key={c}
                        className="flex gap-2 text-[14px] leading-relaxed text-ink/65"
                      >
                        <span aria-hidden className="flex-none text-ink/30">
                          ·
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                  {step.href && (
                    <Link href={step.href} className={`${btnCta} mt-4`}>
                      {step.action ?? 'Continue'} →
                    </Link>
                  )}
                </>
              ) : (
                <>
                  {/* Done steps get a tick, not just a colour. */}
                  {step.done ? (
                    <svg
                      aria-hidden
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="flex-none text-emerald-600"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span
                      aria-hidden
                      className="mx-[3px] h-1.5 w-1.5 flex-none rounded-full bg-ink/25"
                    />
                  )}
                  <span
                    className={`min-w-0 truncate text-[15px] ${
                      step.done ? 'text-ink/45 line-through' : 'text-ink/65'
                    }`}
                  >
                    {step.title}
                    {step.done && <span className="sr-only"> (done)</span>}
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
