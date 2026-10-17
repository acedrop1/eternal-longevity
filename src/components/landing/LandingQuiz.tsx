'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { cn } from '@/lib/utils';
import { saveQuiz } from '@/lib/attribution';
import type { QuizQuestion } from '@/lib/landings';

/*
 * A landing page's quick questions (lib/landings), copied from /hair's quiz
 * (components/hair/HairQuiz, which stays as it is). One at a time, Hims-style.
 * Answers with a `field` travel to /start as ?key=value and pre-fill the
 * assessment; every answer is saved in words for Admin → Marketing.
 */

/**
 * The quiz card, Hims-style: numbered step pills, one big centred question,
 * full-width answer buttons. Picking an answer moves on; the last one opens
 * the assessment.
 */
export function LandingQuiz({ questions, href, className }: { questions: QuizQuestion[]; href: string; className?: string }) {
  const QUESTIONS = questions;
  const router = useRouter();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [leaving, startLeaving] = useTransition();
  const q = QUESTIONS[i];

  // Warm the assessment (and its loading screen) so the last tap moves at once.
  useEffect(() => router.prefetch(href), [router, href]);

  const go = (answers: Record<string, string>) => {
    // In words, for Admin → Marketing's quiz breakdown.
    saveQuiz({
      page: window.location.pathname,
      answers: Object.fromEntries(
        QUESTIONS.flatMap((qq) => {
          const o = qq.options.find((x) => x.value === answers[qq.key]);
          return o ? [[qq.label, o.label]] : [];
        }),
      ),
    });
    const qs = new URLSearchParams();
    for (const qq of QUESTIONS) if (qq.field && answers[qq.key]) qs.set(qq.key, answers[qq.key]);
    startLeaving(() => router.push(qs.toString() ? `${href}&${qs}` : href));
  };

  const choose = (value: string) => {
    const next = { ...picked, [q.key]: value };
    setPicked(next);
    if (i < QUESTIONS.length - 1) setI(i + 1);
    else go(next);
  };

  return (
    <div
      id="quiz"
      aria-busy={leaving}
      className={cn(
        'relative w-full scroll-mt-28 rounded-shell bg-white p-5 md:max-w-[480px] shadow-[0_24px_60px_-34px_rgba(17,17,17,0.35)] ring-1 ring-ink/5 md:p-7',
        className,
      )}
    >
      {/* The tap registered: a soft veil while the assessment opens. */}
      {leaving && (
        <div className="anim-route absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-shell bg-white/85 backdrop-blur-sm">
          <LoadingDots label="Opening your assessment" />
          <p className="text-[14px] font-medium text-ink">Getting your questions ready…</p>
        </div>
      )}

      <ol className="mx-auto flex w-fit rounded-full bg-milk p-1" aria-label={`Question ${i + 1} of ${QUESTIONS.length}`}>
        {QUESTIONS.map((x, n) => (
          <li
            key={x.key}
            aria-current={n === i ? 'step' : undefined}
            className={cn(
              'grid h-8 w-11 place-items-center rounded-full text-[13px] font-semibold transition-colors duration-300',
              n <= i ? 'bg-ink text-white' : 'text-ink/50',
            )}
          >
            {n + 1}
          </li>
        ))}
      </ol>

      <fieldset key={q.key} className="anim-route mt-5">
        <legend className="mx-auto mb-5 max-w-[320px] text-center text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] text-ink md:text-[28px]">
          {q.label}
        </legend>
        <div className="grid gap-2.5">
          {q.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => choose(o.value)}
              aria-pressed={picked[q.key] === o.value}
              className={cn(
                'min-h-[52px] rounded-full px-5 text-center text-[16px] font-semibold ring-1 transition-colors',
                picked[q.key] === o.value ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-ink/15 hover:ring-ink/50',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex min-h-[24px] items-center justify-between gap-3 text-[13px] font-medium text-ink-soft">
        {i > 0 ? (
          <button type="button" onClick={() => setI(i - 1)} className="flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => go(picked)} className="underline-offset-2 hover:text-ink hover:underline">
          Skip to the full assessment
        </button>
      </div>
    </div>
  );
}

/**
 * Phones: once the quiz has scrolled out of view, a small bar at the bottom
 * brings them back to it (Hims does the same).
 */
export function QuizStickyBar({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const quiz = document.getElementById('quiz');
    if (!quiz) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(quiz);
    return () => io.disconnect();
  }, []);
  if (!show) return null;
  return (
    <div className="anim-route fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-shell bg-white p-3 pl-5 shadow-[0_-8px_40px_rgba(17,17,17,0.16)] ring-1 ring-ink/10 md:hidden">
      <p className="text-[15px] font-semibold leading-tight text-ink">{label}</p>
      <button
        type="button"
        onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        className="min-h-[44px] shrink-0 rounded-full bg-ink px-5 text-[14px] font-semibold text-white"
      >
        Take the quiz
      </button>
    </div>
  );
}
