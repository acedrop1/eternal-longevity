'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { FieldRenderer } from './IntakeFields';
import {
  STEPS,
  KNOCKOUT_MESSAGES,
  CONSENT_ITEMS,
  type Step,
  type Field,
} from '@/lib/intakeSchema';
import { submitIntakeAction } from '@/lib/intake-actions';
import { cn } from '@/lib/utils';

type Answers = Record<string, unknown>;

type WizardStatus =
  | { kind: 'in-progress'; stepIdx: number }
  | { kind: 'knockout'; key: string }
  | { kind: 'submitted' };

function valueIsPresent(field: Field, v: unknown): boolean {
  if (!field.required) return true;
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (field.type === 'consent-stack') {
    const consents = (v as Record<string, boolean>) ?? {};
    return CONSENT_ITEMS.filter((c) => c.required).every((c) => consents[c.id]);
  }
  if (field.type === 'account-creation') {
    const acc = (v as { password?: string; confirm?: string }) ?? {};
    return !!acc.password && acc.password.length >= 12 && acc.password === acc.confirm;
  }
  if (field.type === 'id-upload') {
    return v instanceof File || typeof v === 'string';
  }
  return true;
}

function validateStep(step: Step, answers: Answers): { ok: boolean; knockout?: string } {
  for (const f of step.fields) {
    const v = answers[f.id];
    if (!valueIsPresent(f, v)) return { ok: false };
    if (f.knockoutOn) {
      const vStr = String(v);
      if (f.knockoutOn.values.includes(vStr)) {
        return { ok: false, knockout: f.knockoutOn.key };
      }
    }
  }
  return { ok: true };
}

export function IntakeWizard() {
  const [status, setStatus] = useState<WizardStatus>({ kind: 'in-progress', stepIdx: 0 });
  const [answers, setAnswers] = useState<Answers>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = STEPS.length;
  const currentStep = status.kind === 'in-progress' ? STEPS[status.stepIdx] : null;

  const validation = useMemo(() => {
    if (!currentStep) return { ok: true };
    return validateStep(currentStep, answers);
  }, [currentStep, answers]);

  const progressPct = useMemo(() => {
    if (status.kind !== 'in-progress') return 100;
    return Math.round(((status.stepIdx + 1) / total) * 100);
  }, [status, total]);

  function setField(id: string, v: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: v }));
  }

  function handleContinue() {
    if (status.kind !== 'in-progress') return;
    const result = validateStep(STEPS[status.stepIdx], answers);
    if (result.knockout) {
      setStatus({ kind: 'knockout', key: result.knockout });
      return;
    }
    if (!result.ok) return;
    if (status.stepIdx === STEPS.length - 1) {
      // Final step — submit to the server before advancing.
      setSubmitError(null);
      // Strip File objects (which can't be sent through a server action as-is)
      // before posting. In production, upload files separately and reference
      // them by signed URL.
      const safeAnswers = Object.fromEntries(
        Object.entries(answers).filter(([, v]) => !(v instanceof File))
      );
      startTransition(async () => {
        const res = await submitIntakeAction(safeAnswers);
        if (res.ok) {
          setStatus({ kind: 'submitted' });
        } else {
          setSubmitError(res.error ?? 'Something went wrong. Please try again.');
        }
      });
      return;
    }
    setStatus({ kind: 'in-progress', stepIdx: status.stepIdx + 1 });
  }

  function handleBack() {
    if (status.kind === 'in-progress' && status.stepIdx > 0) {
      setStatus({ kind: 'in-progress', stepIdx: status.stepIdx - 1 });
    } else if (status.kind === 'knockout') {
      setStatus({ kind: 'in-progress', stepIdx: 0 });
    }
  }

  // === Knockout screen ===
  if (status.kind === 'knockout') {
    const msg = KNOCKOUT_MESSAGES[status.key];
    return (
      <Shell progressPct={100}>
        <div className="text-center max-w-xl mx-auto">
          <div className="mb-6 inline-flex items-center justify-center h-14 w-14 rounded-full bg-accent/10 text-accent">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2
            className="mb-4 font-semibold tracking-tight text-foreground"
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            {msg.title}
          </h2>
          <p className="mb-8 text-foreground/65 leading-relaxed">{msg.body}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={handleBack} className="pill glass text-foreground/80 hover:text-foreground px-6 py-3">
              Back
            </button>
            <Link href="/" className="pill bg-accent text-black font-semibold px-7 py-3 hover:bg-accent-soft">
              Return home
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // === Submitted screen ===
  if (status.kind === 'submitted') {
    return (
      <Shell progressPct={100}>
        <div className="text-center max-w-xl mx-auto">
          <div className="mb-6 inline-flex items-center justify-center h-14 w-14 rounded-full bg-accent text-black">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2
            className="mb-4 font-semibold tracking-tight text-foreground"
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            That&apos;s it — you&apos;re in.
          </h2>
          <p className="mb-8 text-foreground/65 leading-relaxed">
            Our clinical team is drafting your protocol and routing it to a licensed
            physician. You&apos;ll hear back within 24–48 hours at the email you provided.
          </p>
          <div className="grid gap-3 text-left mb-8">
            {[
              { n: '01', text: 'Clinical team drafts your recommended protocol.' },
              { n: '02', text: 'Physician reviews and signs your prescription.' },
              { n: '03', text: "We'll email you to log in — verify ID, view pricing, and check out." },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
                <span className="text-[10px] tracking-widest text-accent pt-0.5">{s.n}</span>
                <span className="text-sm text-foreground/80 leading-relaxed">{s.text}</span>
              </div>
            ))}
          </div>
          <Link href="/" className="pill bg-foreground text-background font-semibold px-7 py-3">
            Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  // === In progress — render current step ===
  if (!currentStep) return null;
  return (
    <Shell progressPct={progressPct} stepIdx={status.stepIdx} total={total}>
      <div className="mb-2">
        <p className="text-[11px] tracking-widest text-accent">{currentStep.eyebrow}</p>
      </div>
      <h2
        className="mb-3 font-semibold tracking-tight text-foreground"
        style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
      >
        {currentStep.heading}
      </h2>
      {currentStep.body && (
        <p className="mb-8 text-foreground/65 leading-relaxed max-w-xl">{currentStep.body}</p>
      )}

      {/* Disclaimer list — read-only acknowledgement statements (consent step) */}
      {currentStep.disclaimers && currentStep.disclaimers.length > 0 && (
        <ol className="mb-8 space-y-3 rounded-2xl border border-line bg-surface p-5 md:p-6">
          {currentStep.disclaimers.map((d, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent/10 text-accent text-[10px] font-semibold tabular-nums"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm text-foreground/85 leading-relaxed">
                {d}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Fields */}
      <div className="space-y-6">
        {currentStep.fields.map((f) => (
          <div key={f.id}>
            {f.label && (
              <label className="mb-2 block text-xs tracking-wider text-foreground/60">
                {f.label.toUpperCase()}
              </label>
            )}
            <FieldRenderer
              field={f}
              value={answers[f.id]}
              onChange={(v) => setField(f.id, v)}
            />
          </div>
        ))}
      </div>

      {/* Inline submit error (only on the final step) */}
      {submitError && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {submitError}
        </div>
      )}

      {/* Nav buttons */}
      <div className="mt-10 flex items-center justify-between gap-3">
        <button
          onClick={handleBack}
          disabled={status.stepIdx === 0 || isPending}
          className={cn(
            'pill glass text-foreground/70 hover:text-foreground px-6 py-3',
            (status.stepIdx === 0 || isPending) && 'opacity-30 cursor-not-allowed'
          )}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!validation.ok || isPending}
          className={cn(
            'pill font-semibold px-8 py-3.5 transition-colors inline-flex items-center gap-2',
            validation.ok && !isPending
              ? 'bg-accent text-black hover:bg-accent-soft'
              : 'bg-foreground/15 text-foreground/40 cursor-not-allowed'
          )}
        >
          {isPending && (
            <span
              aria-hidden
              className="h-4 w-4 inline-block rounded-full border-2 border-black/30 border-t-black animate-spin"
            />
          )}
          {status.stepIdx === STEPS.length - 1
            ? isPending
              ? 'Submitting…'
              : 'Submit intake →'
            : 'Continue →'}
        </button>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  progressPct,
  stepIdx,
  total,
}: {
  children: React.ReactNode;
  progressPct: number;
  stepIdx?: number;
  total?: number;
}) {
  return (
    <div className="relative mx-auto max-w-2xl px-6 pb-32 pt-28 md:pt-36">
      {/* Progress bar */}
      <div className="sticky top-20 z-10 mb-10 -mx-6 px-6 py-4 bg-background/80 backdrop-blur">
        <div className="flex items-center justify-between mb-2 text-[11px] tracking-wider text-foreground/55">
          <span>{stepIdx !== undefined && total !== undefined ? `Step ${stepIdx + 1} of ${total}` : 'Complete'}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {children}
    </div>
  );
}
