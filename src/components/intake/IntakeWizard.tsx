'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, CircleAlert } from 'lucide-react';
import { FieldRenderer } from './IntakeFields';
import {
  KNOCKOUT_MESSAGES,
  PRODUCT_KNOCKOUT,
  buildPreSteps,
  buildVisitSteps,
  SERVICEABLE_STATES,
  STATE_NAMES,
  type IntakeProduct,
  type Step,
} from '@/lib/intakeSchema';
import {
  emailHasAccountAction,
  submitIntakeAction,
  submitVisitAction,
  declineVisitAction,
} from '@/lib/intake-actions';
import { ageFromDob, fieldComplete, fieldKnockout, fieldVisible } from '@/lib/intake-rules';
import { cn } from '@/lib/utils';

type Answers = Record<string, unknown>;

type WizardStatus =
  | { kind: 'in-progress'; stepIdx: number }
  | { kind: 'knockout'; key: string }
  | { kind: 'has-account' }
  | { kind: 'submitted' };

function validateStep(step: Step, answers: Answers): { ok: boolean; knockout?: string } {
  for (const f of step.fields) {
    if (!fieldVisible(f, answers)) continue;
    // The height slider writes two answers; both must be set.
    if (f.type === 'height') {
      if (typeof answers.height_ft !== 'number' || typeof answers.height_in !== 'number') return { ok: false };
      continue;
    }
    const v = answers[f.id];
    if (!fieldComplete(f, v)) return { ok: false };
    if (f.type === 'date' && f.knockoutOn?.values.includes('under18')) {
      const age = ageFromDob(v);
      if (age === null || age > 120) return { ok: false };
    }
    const knockout = fieldKnockout(f, v);
    if (knockout) return { ok: false, knockout };
  }
  return { ok: true };
}

interface IntakeWizardProps {
  /**
   * Product the visitor started from on the storefront. Shown as a banner and
   * submitted with the answers so the care team knows what they asked for.
   */
  product?: {
    id: string;
    name: string;
    tagline: string;
    contraindications: string[];
  };
  /**
   * 'pre'   — the short pre-checkout profile (default, rendered at /start).
   * 'visit' — the clinical visit completed in the portal before prescriber
   *           review ("Complete your visit").
   */
  mode?: 'pre' | 'visit';
  /** Visit only: every product the visit covers; their categories are all asked. */
  visitProducts?: IntakeProduct[];
}

/** One id per visit session: the storage folder for its photos and files. */
function newVisitId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function IntakeWizard({ product, mode = 'pre', visitProducts }: IntakeWizardProps = {}) {
  const compact = mode === 'visit';
  const [status, setStatus] = useState<WizardStatus>({ kind: 'in-progress', stepIdx: 0 });
  const [answers, setAnswers] = useState<Answers>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  const [visitId] = useState(newVisitId);

  /*
   * Steps for this run. When the visitor arrived from a product, its own
   * safety screen is inserted just before the consents so the questions match
   * what they are actually ordering.
   */
  const steps = useMemo(
    () =>
      mode === 'visit'
        ? buildVisitSteps(visitProducts ?? (product ? [product] : []))
        : buildPreSteps(),
    [product, mode, visitProducts]
  );

  const total = steps.length;
  const currentStep = status.kind === 'in-progress' ? steps[status.stepIdx] : null;

  const validation = useMemo((): { ok: boolean; knockout?: string } => {
    if (!currentStep) return { ok: true };
    return validateStep(currentStep, answers);
  }, [currentStep, answers]);

  const progressPct = useMemo(() => {
    if (status.kind !== 'in-progress') return 100;
    return Math.round(((status.stepIdx + 1) / total) * 100);
  }, [status, total]);

  // Scroll to the top whenever the step changes or we reach a terminal state.
  // Without this, on mobile the next step renders at the previous scroll
  // position and the user has to scroll up to see the new question.
  const scrollKey =
    status.kind === 'in-progress' ? `step-${status.stepIdx}` : status.kind;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [scrollKey]);

  /** Takes a value or an updater (uploads finish after other answers change). */
  function setField(id: string, v: unknown) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: typeof v === 'function' ? v(prev[id]) : v };
      // A field hidden by this answer loses its own answer (showIf).
      for (const f of currentStep?.fields ?? []) {
        if (f.showIf && !fieldVisible(f, next)) delete next[f.id];
      }
      return next;
    });
  }

  function handleContinue() {
    if (status.kind !== 'in-progress') return;
    const result = validateStep(steps[status.stepIdx], answers);
    if (result.knockout) {
      setStatus({ kind: 'knockout', key: result.knockout });
      if (mode === 'visit') void declineVisitAction(result.knockout);
      return;
    }
    if (!result.ok) return;
    if (status.stepIdx === steps.length - 1) {
      // Final step. Submit to the server before advancing.
      setSubmitError(null);
      // Strip File objects (which can't be sent through a server action as-is)
      // before posting. In production, upload files separately and reference
      // them by signed URL.
      const safeAnswers = {
        ...Object.fromEntries(
          Object.entries(answers).filter(([, v]) => !(v instanceof File))
        ),
        // The account step's password rides in answers.account; the server
        // creates the auth user from it and never stores it.

        ...(product
          ? { requestedProduct: product.name, requestedProductId: product.id }
          : {}),
        ...(mode === 'visit' && visitProducts?.length
          ? { visitProductIds: visitProducts.map((p) => p.id) }
          : {}),
      };
      startTransition(async () => {
        const res =
          mode === 'visit'
            ? await submitVisitAction(safeAnswers)
            : await submitIntakeAction(safeAnswers);
        if (res.ok) {
          setStatus({ kind: 'submitted' });
        } else if (res.knockout) {
          // The server re-checks every screen; show the same stop it would have.
          setStatus({ kind: 'knockout', key: res.knockout });
        } else if (res.error === 'account_exists') {
          setStatus({ kind: 'has-account' });
        } else {
          setSubmitError(res.error ?? 'Something went wrong. Please try again.');
        }
      });
      return;
    }
    /*
     * Leaving the email step. If that address already has an account, stop here
     * rather than letting them answer twenty more questions and lose them at
     * submit.
     */
    if (steps[status.stepIdx]?.isEmailCapture) {
      const typed = typeof answers.email === 'string' ? answers.email : '';
      const nextIdx = status.stepIdx + 1;
      startTransition(async () => {
        if (await emailHasAccountAction(typed)) {
          setStatus({ kind: 'has-account' });
        } else {
          setStatus({ kind: 'in-progress', stepIdx: nextIdx });
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

  // === Already has an account ===
  if (status.kind === 'has-account') {
    return (
      <Shell progressPct={100} compact={compact}>
        <div className="mx-auto max-w-xl text-center">
          <h2 className={cn(H2, 'mb-3')}>
            You already have an account.
          </h2>
          <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
            That email is registered with us. Sign in and your details are
            already there — no need to fill this in again.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/login" className={BTN_PRIMARY}>
              Sign in
            </Link>
            <Link
              href="/forgot-password"
              className="text-[14px] text-ink-soft underline decoration-ink/30 underline-offset-[3px] transition-colors hover:text-ink hover:decoration-ink"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // === Knockout screen ===
  if (status.kind === 'knockout') {
    const msg =
      status.key === 'product_contraindication'
        ? PRODUCT_KNOCKOUT
        : KNOCKOUT_MESSAGES[status.key];
    return (
      <Shell progressPct={100} compact={compact}>
        <div className="text-center max-w-xl mx-auto">
          <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-full bg-milk text-ink">
            <CircleAlert aria-hidden className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h2 className={cn(H2, 'mb-4')}>
            {msg.title}
          </h2>
          <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">{msg.body}</p>
          {status.key === 'out_of_state' && (
            <ul aria-label="States we serve" className="mb-8 flex flex-wrap justify-center gap-2">
              {SERVICEABLE_STATES.map((st) => (
                <li key={st} className="rounded-full bg-milk px-4 py-2 text-[14px] font-medium text-ink">
                  {STATE_NAMES[st] ?? st}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
            <button onClick={handleBack} className={BTN_SECONDARY}>
              {status.key === 'out_of_state' ? 'Change state' : 'Back'}
            </button>
            {status.key === 'out_of_state' ? (
              <Link href="/contact" className={BTN_PRIMARY}>
                Tell me when you launch
              </Link>
            ) : (
              <Link href="/" className={BTN_PRIMARY}>
                Return home
              </Link>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // === Submitted screen ===
  if (status.kind === 'submitted') {
    return (
      <Shell progressPct={100} compact={compact}>
        <div className="text-center max-w-xl mx-auto">
          <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-full bg-butter text-ink">
            <Check aria-hidden className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h2 className={cn(H2, 'mb-4')}>
            {mode === 'visit' ? 'Your visit is complete.' : "That's it. You're in."}
          </h2>
          <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
            {mode === 'visit'
              ? 'Your licensed prescriber will review your visit and either issue or decline your prescription. Nothing ships, and nothing is charged, until it is approved.'
              : 'Your account is ready. Log in to place your order and complete your clinical visit — your prescriber reviews it before anything ships.'}
          </p>
          <ol className="grid gap-2 text-left mb-8">
            {(mode === 'visit'
              ? [
                  { n: '01', text: 'Your prescriber reviews your visit answers.' },
                  { n: '02', text: 'If approved, your prescription is sent to the pharmacy.' },
                  { n: '03', text: 'Your order is compounded, tested, and shipped to you.' },
                ]
              : [
                  { n: '01', text: 'Log in and place your order — you are only charged if approved.' },
                  { n: '02', text: 'Complete your clinical visit in the portal.' },
                  { n: '03', text: 'Your prescriber reviews it and your order ships if approved.' },
                ]
            ).map((s) => (
              <li key={s.n} className="flex items-start gap-4 rounded-inner bg-milk p-4">
                <span className="pt-px text-[13px] font-medium tabular-nums text-ink/45">{s.n}</span>
                <span className="text-[15px] leading-relaxed text-ink">{s.text}</span>
              </li>
            ))}
          </ol>
          <Link href={mode === 'visit' ? '/portal' : '/login'} className={BTN_PRIMARY}>
            {mode === 'visit' ? 'Back to your portal' : 'Log in to continue'}
          </Link>
        </div>
      </Shell>
    );
  }

  // === In progress. Render current step ===
  if (!currentStep) return null;
  // Enter advances, the way it does in any real form. The wizard is not a
  // <form> (Continue is a click handler), so nothing did this for free.
  // Textareas keep Enter for newlines; buttons keep it for activation.
  function onKeyDownCapture(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const el = e.target as HTMLElement | null;
    const tag = el?.tagName;
    if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
    e.preventDefault();
    if (canContinue) handleContinue();
  }

  // A knockout answer must still be able to press Continue, or the knockout
  // screen (state, age, safety) can never be reached.
  const canContinue = (validation.ok || !!validation.knockout) && !isPending;

  return (
    <Shell
      onKeyDown={onKeyDownCapture}
      progressPct={progressPct}
      stepIdx={status.stepIdx}
      total={total}
      compact={compact}
      footer={
        <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleBack}
          disabled={status.stepIdx === 0 || isPending}
          className={cn(
            'min-h-[44px] rounded-full bg-milk px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-milk-deep',
            (status.stepIdx === 0 || isPending) && 'opacity-40 cursor-not-allowed hover:bg-milk'
          )}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            'inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-[transform,background-color,color]',
            canContinue
              ? 'bg-butter text-ink hover:-translate-y-0.5 hover:bg-butter-deep'
              : 'bg-ink/[0.06] text-ink/40 cursor-not-allowed'
          )}
        >
          {isPending && (
            <span
              aria-hidden
              className="h-4 w-4 inline-block rounded-full border-2 border-ink/20 border-t-ink animate-spin motion-reduce:animate-none"
            />
          )}
          {status.stepIdx === total - 1
            ? isPending
              ? 'Submitting…'
              : 'Submit intake →'
            : 'Continue →'}
        </button>
      </div>
      }
    >
      <motion.div
        key={status.stepIdx}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
      {product && (
        <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-inner bg-butter-soft px-4 py-3 ring-1 ring-butter-deep/40">
          <span className="text-[13px] font-medium text-ink/55">
            Starting
          </span>
          <span className="text-[15px] font-semibold text-ink">
            {product.name}
          </span>
          <span className="hidden sm:inline text-[13px] text-ink/55">
            {product.tagline}
          </span>
        </div>
      )}
      <p className="mb-3 text-[13px] font-medium text-ink/55">
        {sectionName(currentStep.eyebrow)}
      </p>
      <h2 className={cn(H2, 'mb-3')}>
        {currentStep.heading}
      </h2>
      {currentStep.body && (
        <p className="mb-6 max-w-xl text-[16px] leading-relaxed text-ink-soft">{currentStep.body}</p>
      )}

      {/* Disclaimer list. Read-only acknowledgement statements (consent step) */}
      {currentStep.disclaimers && currentStep.disclaimers.length > 0 && (
        <ol className="mb-5 max-h-[38svh] space-y-3 overflow-y-auto rounded-shell bg-milk p-4 md:p-5">
          {currentStep.disclaimers.map((d, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden
                className="pt-0.5 text-[12px] font-medium tabular-nums text-ink/45"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[14px] leading-relaxed text-ink">
                {d}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Carrier rules want the SMS disclosure beside the number, not buried
          in a consent stack three screens later. */}
      {currentStep.smsDisclaimer && (
        <details className="mb-6 rounded-inner bg-milk px-4 py-3">
          <summary className="cursor-pointer list-none text-[13px] leading-relaxed text-ink-soft marker:hidden">
            By continuing you agree to receive calls and texts from us. Message
            and data rates may apply. Reply STOP to opt out.{' '}
            <span className="text-[13px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px]">Read in full</span>
          </summary>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            {currentStep.smsDisclaimer}
          </p>
        </details>
      )}

      {/* Fields */}
      {/* scroll-mb keeps a focused input clear of the sticky action bar. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 [&_input]:scroll-mb-32 [&_textarea]:scroll-mb-32">
        {currentStep.fields.filter((f) => fieldVisible(f, answers)).map((f) => (
          <div key={f.id} className={f.half ? 'col-span-1 min-w-0' : 'col-span-2 min-w-0'}>
            {f.label && (
              <label
                htmlFor={`fld-${f.id}`}
                className="mb-2 block whitespace-pre-line text-[13px] font-medium leading-relaxed text-ink/70"
              >
                {f.label}
              </label>
            )}
            {f.type === 'height' ? (
              <FieldRenderer
                field={f}
                value={
                  typeof answers.height_ft === 'number' && typeof answers.height_in === 'number'
                    ? answers.height_ft * 12 + answers.height_in
                    : undefined
                }
                onChange={(v) => {
                  const total = v as number;
                  setAnswers((prev) => ({ ...prev, height_ft: Math.floor(total / 12), height_in: total % 12 }));
                }}
              />
            ) : (
              <FieldRenderer
                field={f}
                value={answers[f.id]}
                onChange={(v) => setField(f.id, v)}
                mediaFolder={visitId}
              />
            )}
          </div>
        ))}
      </div>

      {/* Inline submit error (only on the final step) */}
      {submitError && (
        <p
          role="alert"
          className="mt-6 rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-700 ring-1 ring-red-600/20"
        >
          {submitError}
        </p>
      )}
      </motion.div>

    </Shell>
  );
}

const H2 = 'text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink [text-wrap:balance] md:text-[40px]';

const BTN_PRIMARY =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-butter px-6 py-3 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5';
const BTN_SECONDARY =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-milk px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-milk-deep';

/** '03 / BODY SNAPSHOT' -> 'Body snapshot'; 'SAFETY SCREEN · X' -> 'Safety screen'
 *  (the product name is already in the heading and the banner). */
function sectionName(eyebrow: string) {
  const s = eyebrow.replace(/^\d+\s*\/\s*/, '').split(' · ')[0].trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function Shell({
  children,
  progressPct,
  stepIdx,
  total,
  compact,
  footer,
  onKeyDown,
}: {
  children: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  progressPct: number;
  stepIdx?: number;
  total?: number;
  compact?: boolean;
  /** Pinned to the foot of the viewport so Continue never scrolls away. */
  footer?: React.ReactNode;
}) {
  return (
    <div
      onKeyDown={onKeyDown}
      className={
        compact
          ? 'relative mx-auto flex w-full max-w-2xl flex-col overflow-x-clip pb-0 pt-2 text-ink'
          : 'relative mx-auto flex h-[100svh] max-w-2xl flex-col px-4 pb-3 pt-[100px] text-ink md:px-6 md:pb-5 md:pt-[120px]'
      }
    >
      {/* Progress bar */}
      <div className={compact ? 'mb-6 py-1' : 'mb-6 flex-none'}>
        <div className="mb-2.5 flex items-center justify-between text-[13px] font-medium tabular-nums text-ink/55">
          <span>{stepIdx !== undefined && total !== undefined ? `Step ${stepIdx + 1} of ${total}` : 'Complete'}</span>
          <span>{progressPct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Assessment progress"
          className="h-1.5 w-full overflow-hidden rounded-full bg-milk"
        >
          <div
            className="h-full rounded-full bg-butter-deep transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Owns the viewport at /start, so it scrolls itself; inside the portal
          the page scrolls and the footer sticks instead. */}
      <div className={compact ? 'px-1 pb-4' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 pb-4'}>
        {children}
      </div>

      {/* Frosted white action bar: inset from the edges, never docked flush. */}
      {footer && (
        <div
          className={
            compact
              ? 'sticky z-10 flex-none rounded-shell bg-white/85 p-2 text-ink ring-1 ring-ink/10 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_50px_-24px_rgba(17,17,17,0.35)]'
              : 'flex-none rounded-shell bg-white/85 p-2 text-ink ring-1 ring-ink/10 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_50px_-24px_rgba(17,17,17,0.35)]'
          }
          style={compact ? { bottom: 'max(12px, calc(env(safe-area-inset-bottom) + 8px))' } : { marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
