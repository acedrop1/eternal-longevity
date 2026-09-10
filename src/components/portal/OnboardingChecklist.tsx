import Link from 'next/link';
import type { OnboardingStep } from '@/lib/onboarding';

/**
 * The whole data-collection requirement on one screen, with the member's own
 * progress against it. Rendered collapsed-by-default via <details> once there
 * is nothing outstanding, so a returning member is not made to scroll past a
 * finished checklist to reach their orders.
 */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const done = steps.filter((s) => s.done).length;
  const complete = done === steps.length;

  return (
    <details
      open={!complete}
      className="mb-6 rounded-3xl border border-line bg-surface [&[open]>summary_.chev]:rotate-180"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6">
        <div>
          <p className="mb-1 text-[11px] tracking-widest text-foreground/50">
            BEFORE A PRESCRIBER CAN REVIEW YOU
          </p>
          <p className="text-lg font-semibold text-foreground">
            {complete
              ? 'Everything we need is on file'
              : `${done} of ${steps.length} steps complete`}
          </p>
        </div>
        <span
          aria-hidden
          className="chev flex-none text-foreground/40 transition-transform"
        >
          ▾
        </span>
      </summary>

      <ol className="border-t border-line">
        {steps.map((step, i) => (
          <li
            key={step.key}
            className="flex gap-4 px-6 py-5 [&+&]:border-t [&+&]:border-line"
          >
            <span
              aria-hidden
              className={`mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full text-[11px] font-semibold tabular-nums ${
                step.done
                  ? 'bg-accent text-black'
                  : 'border border-line text-foreground/45'
              }`}
            >
              {step.done ? '✓' : i + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-medium text-foreground">{step.title}</p>
                <span
                  className={`text-[10px] font-semibold tracking-widest ${
                    step.done ? 'text-accent' : 'text-foreground/40'
                  }`}
                >
                  {step.done ? 'DONE' : 'NEEDED'}
                </span>
              </div>

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
                  className="mt-3 inline-block text-[11px] font-medium tracking-widest text-accent hover:text-accent-soft"
                >
                  {(step.action ?? 'Continue').toUpperCase()} →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
