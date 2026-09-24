'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, CircleAlert } from 'lucide-react';
import { FieldRenderer } from './IntakeFields';
import {
  KNOCKOUT_MESSAGES,
  passwordValid,
  PRODUCT_KNOCKOUT,
  buildPreSteps,
  buildVisitSteps,
  CONSENT_ITEMS,
  type Step,
  type Field,
} from '@/lib/intakeSchema';
import {
  emailHasAccountAction,
  submitIntakeAction,
  submitVisitAction,
  declineVisitAction,
} from '@/lib/intake-actions';
import { cn } from '@/lib/utils';

type Answers = Record<string, unknown>;

type WizardStatus =
  | { kind: 'in-progress'; stepIdx: number }
  | { kind: 'knockout'; key: string }
  | { kind: 'has-account' }
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
    return !!acc.password && passwordValid(acc.password) && acc.password === acc.confirm;
  }
  if (field.type === 'id-upload') {
    return v instanceof File || typeof v === 'string';
  }
  return true;
}

function validateStep(step: Step, answers: Answers): { ok: boolean; knockout?: string } {
  for (const f of step.fields) {
    // The height slider writes two answers; both must be set.
    if (f.type === 'height') {
      if (typeof answers.height_ft !== 'number' || typeof answers.height_in !== 'number') return { ok: false };
      continue;
    }
    const v = answers[f.id];
    if (!valueIsPresent(f, v)) return { ok: false };
    if (f.type === 'date' && f.knockoutOn?.values.includes('under18') && typeof v === 'string') {
      // Date parses loose numeric strings — new Date('0210') is year 210, not
      // NaN — so a half-typed birth date would compute an age of ~1800 and
      // walk straight through the gate. Demand a complete ISO date.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false };
      const dob = new Date(`${v}T00:00:00`);
      if (Number.isNaN(dob.getTime())) return { ok: false };
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
      if (age > 120) return { ok: false };
      if (age < 18) return { ok: false, knockout: f.knockoutOn.key };
      continue;
    }
    if (f.knockoutOn) {
      const vStr = String(v);
      if (f.knockoutOn.values.includes(vStr)) {
        return { ok: false, knockout: f.knockoutOn.key };
      }
    }
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
}

export function IntakeWizard({ product, mode = 'pre' }: IntakeWizardProps = {}) {
  const compact = mode === 'visit';
  const [status, setStatus] = useState<WizardStatus>({ kind: 'in-progress', stepIdx: 0 });
  const [answers, setAnswers] = useState<Answers>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  /*
   * Steps for this run. When the visitor arrived from a product, its own
   * safety screen is inserted just before the consents so the questions match
   * what they are actually ordering.
   */
  const steps = useMemo(
    () => (mode === 'visit' ? buildVisitSteps(product) : buildPreSteps()),
    [product, mode]
  );

  const total = steps.length;
  const currentStep = status.kind === 'in-progress' ? steps[status.stepIdx] : null;

  const validation = useMemo(() => {
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

  function setField(id: string, v: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: v }));
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
      };
      startTransition(async () => {
        const res =
          mode === 'visit'
            ? await submitVisitAction(safeAnswers)
            : await submitIntakeAction(safeAnswers);
        if (res.ok) {
          setStatus({ kind: 'submitted' });
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
          <h2 className="mb-3 font-display font-normal [text-wrap:balance]" style={H2}>
            You already have an account.
          </h2>
          <p className="mb-8 text-[15px] leading-relaxed text-black/70 md:text-[16px]">
            That email is registered with us. Sign in and your details are
            already there — no need to fill this in again.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/login" className={BTN_PRIMARY}>
              Sign in
            </Link>
            <Link
              href="/forgot-password"
              className="font-mono text-[13px] text-black/60 underline underline-offset-4 transition-colors hover:text-black"
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
          <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-[4px] bg-[#F2F2F0] text-black">
            <CircleAlert aria-hidden className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h2 className="mb-4 font-display font-normal [text-wrap:balance]" style={H2}>
            {msg.title}
          </h2>
          <p className="mb-8 text-[15px] leading-relaxed text-black/70 md:text-[16px]">{msg.body}</p>
          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
            <button onClick={handleBack} className={BTN_SECONDARY}>
              Back
            </button>
            <Link href="/" className={BTN_PRIMARY}>
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
      <Shell progressPct={100} compact={compact}>
        <div className="text-center max-w-xl mx-auto">
          <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-[4px] bg-accent text-black">
            <Check aria-hidden className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h2 className="mb-4 font-display font-normal [text-wrap:balance]" style={H2}>
            {mode === 'visit' ? 'Your visit is complete.' : "That's it. You're in."}
          </h2>
          <p className="mb-8 text-[15px] leading-relaxed text-black/70 md:text-[16px]">
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
              <li key={s.n} className="flex items-start gap-4 rounded-[4px] bg-[#F2F2F0] p-4">
                <span className="pt-px font-mono text-[13px] tabular-nums text-black/45">{s.n}</span>
                <span className="text-[15px] leading-relaxed text-black/85">{s.text}</span>
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
    if (validation.ok && !isPending) handleContinue();
  }

  const canContinue = validation.ok && !isPending;

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
            'rounded-full px-5 py-3 font-mono text-[14px] text-white ring-1 ring-white/25 transition-colors hover:bg-white/10',
            (status.stepIdx === 0 || isPending) && 'opacity-30 cursor-not-allowed hover:bg-transparent'
          )}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!validation.ok || isPending}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-5 py-3 font-mono text-[14px] transition-colors',
            canContinue
              ? 'bg-white text-black hover:bg-white/85'
              : 'bg-white/15 text-white/45 cursor-not-allowed'
          )}
        >
          {isPending && (
            <span
              aria-hidden
              className="h-4 w-4 inline-block rounded-full border-2 border-white/30 border-t-white animate-spin motion-reduce:animate-none"
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
        <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-[4px] bg-[#F2F2F0] px-4 py-3">
          <span className="font-mono text-[12px] text-black/55">
            Starting
          </span>
          <span className="text-[15px] font-medium text-black">
            {product.name}
          </span>
          <span className="hidden sm:inline text-[13px] text-black/55">
            {product.tagline}
          </span>
        </div>
      )}
      <p className="mb-3 font-mono text-[13px] text-black/55">
        {sectionName(currentStep.eyebrow)}
      </p>
      <h2 className="mb-3 font-display font-normal [text-wrap:balance]" style={H2}>
        {currentStep.heading}
      </h2>
      {currentStep.body && (
        <p className="mb-6 max-w-xl text-[15px] leading-relaxed text-black/70 md:text-[16px]">{currentStep.body}</p>
      )}

      {/* Disclaimer list. Read-only acknowledgement statements (consent step) */}
      {currentStep.disclaimers && currentStep.disclaimers.length > 0 && (
        <ol className="mb-5 max-h-[38svh] space-y-3 overflow-y-auto rounded-[4px] bg-[#F2F2F0] p-4 md:p-5">
          {currentStep.disclaimers.map((d, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden
                className="pt-0.5 font-mono text-[12px] tabular-nums text-black/45"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[14px] leading-relaxed text-black/85">
                {d}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Carrier rules want the SMS disclosure beside the number, not buried
          in a consent stack three screens later. */}
      {currentStep.smsDisclaimer && (
        <details className="mb-6 rounded-[4px] bg-[#F2F2F0] px-4 py-3">
          <summary className="cursor-pointer list-none text-[13px] leading-relaxed text-black/60 marker:hidden">
            By continuing you agree to receive calls and texts from us. Message
            and data rates may apply. Reply STOP to opt out.{' '}
            <span className="font-mono text-[12px] text-black underline underline-offset-2">Read in full</span>
          </summary>
          <p className="mt-3 text-[13px] leading-relaxed text-black/60">
            {currentStep.smsDisclaimer}
          </p>
        </details>
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {currentStep.fields.map((f) => (
          <div key={f.id} className={f.half ? 'col-span-1 min-w-0' : 'col-span-2 min-w-0'}>
            {f.label && (
              <label
                htmlFor={`fld-${f.id}`}
                className="mb-2 block whitespace-pre-line font-mono text-[13px] leading-relaxed text-black/70"
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
              />
            )}
          </div>
        ))}
      </div>

      {/* Inline submit error (only on the final step) */}
      {submitError && (
        <p
          role="alert"
          className="mt-6 rounded-[2px] bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800 ring-1 ring-red-700/20"
        >
          {submitError}
        </p>
      )}
      </motion.div>

    </Shell>
  );
}

const H2 = {
  fontSize: 'clamp(1.9rem, 2.4vw + 1rem, 3rem)',
  fontStretch: '75%',
  lineHeight: 1.05,
} as const;

const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-full bg-black px-5 py-3.5 font-mono text-[14px] text-white transition-colors hover:bg-black/85';
const BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-full px-5 py-3.5 font-mono text-[14px] text-black ring-1 ring-black/20 transition-colors hover:bg-black/[0.04]';

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
          ? 'relative mx-auto flex w-full max-w-2xl flex-col overflow-x-hidden pb-0 pt-2 text-black'
          : 'relative mx-auto flex h-[100svh] max-w-2xl flex-col px-4 pb-3 pt-[100px] text-black md:px-6 md:pb-5 md:pt-[120px]'
      }
    >
      {/* Progress bar */}
      <div className={compact ? 'mb-6 py-1' : 'mb-6 flex-none'}>
        <div className="mb-2 flex items-center justify-between font-mono text-[12px] tabular-nums text-black/55">
          <span>{stepIdx !== undefined && total !== undefined ? `Step ${stepIdx + 1} of ${total}` : 'Complete'}</span>
          <span>{progressPct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Assessment progress"
          className="h-1 w-full overflow-hidden rounded-[2px] bg-black/10"
        >
          <div
            className="h-full bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Owns the viewport at /start, so it scrolls itself; inside the portal
          the page scrolls and the footer sticks instead. */}
      <div className={compact ? 'px-1 pb-4' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 pb-4'}>
        {children}
      </div>

      {/* Frosted black action bar, the same treatment as the product page's
          BuyBar: inset from the edges, never docked flush. */}
      {footer && (
        <div
          className={
            compact
              ? 'sticky z-10 flex-none rounded-[4px] bg-black/75 p-2 text-white ring-1 ring-white/15 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.55)]'
              : 'flex-none rounded-[4px] bg-black/75 p-2 text-white ring-1 ring-white/15 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.55)]'
          }
          style={compact ? { bottom: 'max(12px, calc(env(safe-area-inset-bottom) + 8px))' } : { marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
