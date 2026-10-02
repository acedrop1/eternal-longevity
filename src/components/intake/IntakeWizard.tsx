'use client';

import { useState, useMemo, useTransition, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, CircleAlert, X } from 'lucide-react';
import { FieldRenderer } from './IntakeFields';
import { RecommendationPicker, type Offer } from './Recommendation';
import { Wordmark } from '@/components/nav/Wordmark';
import {
  KNOCKOUT_MESSAGES,
  PLAN_FIELD,
  PRODUCT_KNOCKOUT,
  buildAssessmentSteps,
  buildVisitSteps,
  isCategoryKey,
  recommendationFor,
  SERVICEABLE_STATES,
  STATE_NAMES,
  type AssessmentContext,
  type Field,
  type FieldType,
  type IntakeProduct,
  type Step,
} from '@/lib/intakeSchema';
import { MEDIA_STEPS, PRODUCT_CATEGORY, type CategoryKey } from '@/lib/intake-categories';
import {
  emailHasAccountAction,
  submitIntakeAction,
  submitMemberAssessmentAction,
  submitVisitAction,
  declineVisitAction,
} from '@/lib/intake-actions';
import { fieldKnockout, fieldProblem, fieldVisible, pruneHidden, stepVisible } from '@/lib/intake-rules';
import { CART_STORAGE_KEY, withCartItem, type Cadence, type CartItem } from '@/lib/cartTypes';
import { captureLeadAction } from '@/lib/lead-actions';
import { assessmentSignInAction } from '@/lib/auth-actions';
import { saveAssessmentDraftAction } from '@/lib/assessment-drafts';
import { LEAD_CONSENT } from '@/lib/followups';
import { cn } from '@/lib/utils';

type Answers = Record<string, unknown>;

type WizardStatus =
  | { kind: 'in-progress'; key: string }
  /** `from`: the screen that fired it, where Back returns. */
  | { kind: 'knockout'; key: string; from: string }
  | { kind: 'has-account' }
  | { kind: 'submitted' }
  | { kind: 'redirecting' };

/**
 * One screen of the wizard. A step's choice questions each get their own
 * screen (the Hims pattern), as does any follow-up that only appears for some
 * answers; neighbouring text inputs (name, date of birth, phone, ZIP), photos,
 * consents and the account stay together.
 */
type Screen = { key: string; step: Step; fields: Field[]; first: boolean; split: boolean };

const CHOICE: FieldType[] = ['single-select', 'pill-grid', 'select', 'multi-select', 'recommendation'];
/** Picking one of these moves straight on. */
const AUTO: FieldType[] = ['single-select', 'pill-grid'];
const AUTO_MS = 250;

function screensOf(steps: Step[], answers: Answers): Screen[] {
  const out: Screen[] = [];
  for (const step of steps) {
    if (!stepVisible(step, answers)) continue;
    const groups: Field[][] = [];
    let open = false;
    for (const f of step.fields.filter((x) => fieldVisible(x, answers))) {
      const alone = CHOICE.includes(f.type) || !!f.showIf;
      if (alone || !open) groups.push([f]);
      else groups[groups.length - 1].push(f);
      open = !alone;
    }
    if (!groups.length) {
      if (!step.kind) continue;
      groups.push([]);
    }
    groups.forEach((fields, i) =>
      out.push({ key: `${step.id}:${fields[0]?.id ?? ''}`, step, fields, first: i === 0, split: groups.length > 1 }),
    );
  }
  return out;
}

function validateFields(fields: Field[], answers: Answers): { ok: boolean; knockout?: string } {
  for (const f of fields) {
    const v = answers[f.id];
    if (fieldProblem(f, v, answers)) return { ok: false };
    const knockout = fieldKnockout(f, v);
    if (knockout) return { ok: false, knockout };
  }
  return { ok: true };
}

const isAuto = (s: Screen | undefined) => !!s && s.fields.length === 1 && AUTO.includes(s.fields[0].type);

/** Inputs that take typing; Enter / the return key moves between these. */
const TYPED = 'input:not([type=range]):not([type=file]):not([type=hidden]), select, textarea';

/* Saved progress (/start, signed out). Only these answers: never health
   answers, the password, consents or files. Cleared on a successful submit. */
const SAVED = new Set(['goal_category', 'email', 'state', 'first_name', 'last_name', 'dob', 'zip', 'phone', 'sex']);
const SAVE_DAYS = 30;
const storageKeyFor = (entry?: string) => `el-assessment:${entry ?? 'general'}`;

/** Where ✕ goes: the same-site page they came from, else the product, else home. */
function exitTarget(): string {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && !ref.pathname.startsWith('/start')) {
      return ref.pathname + ref.search + ref.hash;
    }
  } catch {
    // Unparseable referrer: fall through.
  }
  const params = new URLSearchParams(window.location.search);
  const product = params.get('product');
  const category = params.get('category');
  return product
    ? `/shop/${encodeURIComponent(product)}`
    : category
      ? `/treatments/${encodeURIComponent(category)}`
      : '/';
}

const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

/** Demo mode (and a profile without a cart column) keeps the cart in the browser. */
function addToLocalCart(productId: string, cadence: Cadence) {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const items = raw ? (JSON.parse(raw) as CartItem[]) : [];
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(withCartItem(Array.isArray(items) ? items : [], productId, cadence)));
  } catch {
    // Storage blocked: the signed-in cart (saved on the server) still has it.
  }
}

interface IntakeWizardProps {
  /**
   * Product the visitor started from on the storefront (?product=). Shown as
   * a banner; the assessment asks its category's questions and recommends it
   * unless the answers rule it out.
   */
  product?: {
    id: string;
    name: string;
    tagline: string;
    contraindications: string[];
  };
  /** ?category=: that category's questions, then the best product for them. */
  category?: CategoryKey;
  /**
   * 'pre'   — the assessment at /start: every question, then checkout.
   * 'visit' — LEGACY: the clinical visit for intakes opened before the
   *           assessment moved ahead of checkout ('awaiting_visit').
   * 'media' — the photos / lab files left after checkout (portal).
   */
  mode?: 'pre' | 'visit' | 'media';
  /** Visit only: every product the visit covers; their categories are all asked. */
  visitProducts?: IntakeProduct[];
  /** Media only: the MEDIA_STEPS still owed. */
  mediaStepIds?: string[];
  /** Pre only: live products the assessment can recommend. */
  offers?: Record<string, Offer>;
  /** Pre only, signed in: answers on file are not asked again. */
  member?: { known: string[]; prefill: Answers };
  /** Pre only, signed in: their unfinished run from this entry point, resumed where they left. */
  draft?: { answers: Answers; screen: string | null };
}

/** One id per visit session: the storage folder for its photos and files. */
function newVisitId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function IntakeWizard({
  product,
  category,
  mode = 'pre',
  visitProducts,
  mediaStepIds,
  offers,
  member,
  draft,
}: IntakeWizardProps = {}) {
  const compact = mode !== 'pre';
  const [status, setStatus] = useState<WizardStatus>({ kind: 'in-progress', key: '' });
  const [answers, setAnswers] = useState<Answers>(() => ({ ...(member?.prefill ?? {}) }));
  /** The latest answers, for auto-advance timers and uploads that finish later. */
  const answersRef = useRef<Answers>(answers);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  const [visitId] = useState(newVisitId);
  const router = useRouter();
  /** Fields the visitor has left; their errors show from then on. */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  /** Screen where Continue was pressed while incomplete: every error shows. */
  const [attempted, setAttempted] = useState<string | null>(null);
  /** Screen resumed from saved progress, for the "welcome back" note. */
  const [restored, setRestored] = useState<string | null>(null);
  /** Signed in mid-assessment: once the page knows the member, go to the first unanswered screen. */
  const [resumeAfterSignIn, setResumeAfterSignIn] = useState(false);
  const stepRef = useRef<HTMLDivElement>(null);
  const leaveRef = useRef<HTMLDialogElement>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdx = useRef(0);
  const [leaveTo, setLeaveTo] = useState('/');
  const saves = mode === 'pre' && !member;
  const entryProduct = product && PRODUCT_CATEGORY[product.id] ? product.id : undefined;
  const storageKey = storageKeyFor(entryProduct ?? category);

  const ctx = useMemo<AssessmentContext>(
    () => ({
      productId: entryProduct,
      category,
      member: !!member,
      known: member?.known,
      catalog: offers ?? {},
    }),
    [entryProduct, category, member, offers],
  );

  /* Steps for this run. The assessment's depend on the answers (goal, the
     recommendation); the portal's are fixed. */
  const fixedSteps = useMemo(
    () =>
      mode === 'visit'
        ? buildVisitSteps(visitProducts ?? (product ? [product] : []))
        : mode === 'media'
          ? MEDIA_STEPS.filter((m) => mediaStepIds?.includes(m.step.id)).map((m) => ({ ...m.step, showIf: undefined }))
          : null,
    [mode, visitProducts, product, mediaStepIds],
  );
  const stepsFor = useCallback((a: Answers) => fixedSteps ?? buildAssessmentSteps(ctx, a), [fixedSteps, ctx]);

  const screens = useMemo(() => screensOf(stepsFor(answers), answers), [stepsFor, answers]);
  const found = status.kind === 'in-progress' ? screens.findIndex((s) => s.key === status.key) : -1;
  // A screen that stops applying (an earlier answer changed) falls back to where it was.
  const idx = found !== -1 ? found : status.kind === 'in-progress' && status.key === '' ? 0 : Math.min(lastIdx.current, screens.length - 1);
  if (status.kind === 'in-progress') lastIdx.current = idx;
  const screen = status.kind === 'in-progress' ? screens[idx] : undefined;
  const rec = useMemo(() => (mode === 'pre' ? recommendationFor(ctx, answers) : null), [mode, ctx, answers]);

  // Resume saved progress once, on the first screen that isn't complete.
  useEffect(() => {
    if (!saves) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { answers?: Answers; savedAt?: number };
      const a = Object.fromEntries(Object.entries(saved.answers ?? {}).filter(([k]) => SAVED.has(k)));
      if (!Object.keys(a).length || Date.now() - (saved.savedAt ?? 0) > SAVE_DAYS * 864e5) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      const list = screensOf(stepsFor(a), a);
      const gap = list.findIndex((s) => !validateFields(s.fields, a).ok);
      const at = list[gap === -1 ? list.length - 1 : gap];
      // Resuming past the email screen skips its account check; run it now.
      const emailAt = list.findIndex((s) => s.step.isEmailCapture);
      if (emailAt !== -1 && emailAt < list.indexOf(at) && typeof a.email === 'string') {
        void emailHasAccountAction(a.email).then((has) => has && setStatus({ kind: 'has-account' }));
      }
      answersRef.current = a;
      setAnswers(a);
      setStatus({ kind: 'in-progress', key: at.key });
      setRestored(at.key);
    } catch {
      // Storage blocked or corrupt: start fresh.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signed in with an unfinished run from here: resume it on the screen they left.
  useEffect(() => {
    if (mode !== 'pre' || !member || !draft || !Object.keys(draft.answers).length) return;
    const a = { ...(member.prefill ?? {}), ...draft.answers };
    const list = screensOf(stepsFor(a), a);
    const at =
      list.find((s) => s.key === draft.screen) ??
      list.find((s) => !validateFields(s.fields, a).ok) ??
      list[list.length - 1];
    answersRef.current = a;
    setAnswers(a);
    setStatus({ kind: 'in-progress', key: at.key });
    setRestored(at.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!saves || status.kind !== 'in-progress' || !Object.keys(answers).length) return;
    try {
      const keep = Object.fromEntries(Object.entries(answers).filter(([k]) => SAVED.has(k)));
      window.localStorage.setItem(storageKey, JSON.stringify({ answers: keep, savedAt: Date.now() }));
    } catch {
      // Private mode / quota: progress just isn't saved.
    }
  }, [saves, storageKey, answers, status.kind]);

  useEffect(() => () => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
  }, []);

  /*
   * Signed in from the "you already have an account" screen. The refresh
   * brings `member`, which drops the email, details and account screens; the
   * answers given so far are still in state, so carry on from the first
   * screen that still needs one.
   */
  useEffect(() => {
    if (!resumeAfterSignIn || !member) return;
    setResumeAfterSignIn(false);
    const next = screens.find((s) => !validateFields(s.fields, answersRef.current).ok) ?? screens[screens.length - 1];
    setStatus({ kind: 'in-progress', key: next?.key ?? '' });
  }, [resumeAfterSignIn, member, screens]);

  function clearSaved() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing to clear.
    }
  }

  function startOver() {
    clearSaved();
    const fresh = { ...(member?.prefill ?? {}) };
    answersRef.current = fresh;
    setAnswers(fresh);
    setTouched({});
    setRestored(null);
    setStatus({ kind: 'in-progress', key: '' });
  }

  const validation = useMemo(
    (): { ok: boolean; knockout?: string } => (screen ? validateFields(screen.fields, answers) : { ok: true }),
    [screen, answers],
  );

  const progressPct = status.kind === 'in-progress' ? Math.round(((idx + 1) / Math.max(screens.length, 1)) * 100) : 100;

  /*
   * Signed in: save the run to their account as they go, so the portal can
   * offer to continue it from any device. Files are already stored by path.
   */
  const draftEntry = entryProduct ?? category ?? 'general';
  const screenKey = status.kind === 'in-progress' ? screen?.key ?? null : null;
  useEffect(() => {
    if (mode !== 'pre' || !member || !screenKey) return;
    const own = Object.entries(answers).filter(([k, v]) => !(v instanceof File) && !(k in (member.prefill ?? {})));
    if (!own.length) return;
    const t = setTimeout(() => {
      void saveAssessmentDraftAction(draftEntry, Object.fromEntries(own), screenKey, progressPct).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [mode, member, answers, screenKey, draftEntry, progressPct]);

  // Scroll to the top whenever the screen changes or we reach a terminal state.
  // Without this, on mobile the next screen renders at the previous scroll
  // position and the user has to scroll up to see the new question.
  const scrollKey = status.kind === 'in-progress' ? `s-${screen?.key}` : status.kind;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    // Desktop only: on a phone this would throw the keyboard up on arrival.
    if (!isDesktop() || !window.matchMedia('(pointer: fine)').matches) return;
    const first = stepRef.current?.querySelector('[data-field]');
    first?.querySelector<HTMLElement>(TYPED)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey]);

  /** ✕ and the logo. Asks first while there are answers to lose. */
  function requestLeave(to?: string) {
    const target = to ?? exitTarget();
    if (status.kind !== 'in-progress' || !Object.keys(answers).length) {
      router.push(target);
      return;
    }
    setLeaveTo(target);
    leaveRef.current?.showModal();
  }

  /**
   * Record an answer (a value, or an updater for uploads that finish after
   * other answers changed) and drop answers to anything no longer asked.
   * Returns the new answers so auto-advance can use them straight away.
   */
  function setField(id: string, v: unknown): Answers {
    const prev = answersRef.current;
    const next: Answers = { ...prev, [id]: typeof v === 'function' ? v(prev[id]) : v };
    pruneHidden(stepsFor(next), next, member?.known);
    answersRef.current = next;
    setAnswers(next);
    return next;
  }

  function goTo(key: string) {
    setAttempted(null);
    setStatus({ kind: 'in-progress', key });
  }

  /** Continue: validate this screen, then the next screen, or submit on the last. */
  function advance(a: Answers = answersRef.current) {
    if (status.kind !== 'in-progress' || isPending) return;
    const list = screensOf(stepsFor(a), a);
    const i = Math.max(0, list.findIndex((s) => s.key === screen?.key));
    const cur = list[i];
    if (!cur) return;
    const result = validateFields(cur.fields, a);
    if (result.knockout) {
      setStatus({ kind: 'knockout', key: result.knockout, from: cur.key });
      if (mode === 'visit') void declineVisitAction(result.knockout);
      return;
    }
    if (!result.ok) {
      // Show every error on this screen and put the cursor on the first one.
      setAttempted(cur.key);
      const id = cur.fields.find((f) => fieldProblem(f, a[f.id], a))?.id;
      requestAnimationFrame(() => {
        stepRef.current
          ?.querySelector(`[data-field="${id}"]`)
          ?.querySelector<HTMLElement>(`${TYPED}, button`)
          ?.focus();
      });
      return;
    }
    if (i === list.length - 1) return submit(a, list);
    /*
     * Leaving the email screen. If that address already has an account, stop
     * here rather than letting them answer twenty more questions and lose
     * them at submit.
     */
    if (cur.step.isEmailCapture) {
      const typed = typeof a.email === 'string' ? a.email : '';
      startTransition(async () => {
        if (await emailHasAccountAction(typed)) {
          setStatus({ kind: 'has-account' });
          return;
        }
        // Lead capture (consent line under the field); best effort, never blocks the flow.
        const leadCategory = category ?? (isCategoryKey(a.goal_category) ? a.goal_category : undefined);
        void captureLeadAction({ email: typed, productId: entryProduct, category: leadCategory, consent: true }).catch(() => {});
        goTo(list[i + 1].key);
      });
      return;
    }
    goTo(list[i + 1].key);
  }

  function submit(a: Answers, list: Screen[]) {
    // Every screen must be complete (a resumed run can skip ahead of a gap).
    for (const s of list) {
      const r = validateFields(s.fields, a);
      if (r.knockout) return setStatus({ kind: 'knockout', key: r.knockout, from: s.key });
      if (!r.ok) {
        setStatus({ kind: 'in-progress', key: s.key });
        setAttempted(s.key);
        return;
      }
    }
    setSubmitError(null);
    // Files can't cross a server action; uploads are already stored by path.
    const payload: Answers = {
      ...Object.fromEntries(Object.entries(a).filter(([, v]) => !(v instanceof File))),
      ...(mode === 'pre' ? { entryProductId: entryProduct, entryCategory: category } : {}),
      ...(mode === 'visit' && product ? { requestedProduct: product.name, requestedProductId: product.id } : {}),
      ...(mode === 'visit' && visitProducts?.length ? { visitProductIds: visitProducts.map((p) => p.id) } : {}),
    };
    startTransition(async () => {
      const res =
        mode === 'pre'
          ? member
            ? await submitMemberAssessmentAction(payload)
            : await submitIntakeAction(payload)
          : await submitVisitAction(payload);
      if (res.ok) {
        if (saves) clearSaved();
        const choice = a[PLAN_FIELD] as { productId: string; cadence: Cadence } | undefined;
        if (mode === 'pre' && choice && res.next === '/checkout') {
          // The server saved the cart for a signed-in account; this covers demo mode.
          addToLocalCart(choice.productId, choice.cadence);
          setStatus({ kind: 'redirecting' });
          router.push('/checkout');
          return;
        }
        setStatus({ kind: 'submitted' });
      } else if (res.knockout) {
        // The server re-checks every screen; show the same stop it would have.
        setStatus({ kind: 'knockout', key: res.knockout, from: list[list.length - 1].key });
      } else if (res.error === 'account_exists') {
        setStatus({ kind: 'has-account' });
      } else {
        setSubmitError(res.error ?? 'Something went wrong. Please try again.');
      }
    });
  }

  function handleBack() {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (status.kind === 'in-progress' && idx > 0) goTo(screens[idx - 1].key);
    else if (status.kind === 'knockout') goTo(status.from);
  }

  // === Already has an account: sign in here and carry on ===
  if (status.kind === 'has-account') {
    const email = typeof answers.email === 'string' ? answers.email : '';
    const emailScreen = screens.find((s) => s.step.isEmailCapture);
    return (
      <Shell progressPct={progressPct} compact={compact} onLeave={requestLeave}>
        <SignInToContinue
          email={email}
          onSignedIn={() => {
            clearSaved();
            setResumeAfterSignIn(true);
            router.refresh();
          }}
          onChangeEmail={emailScreen ? () => goTo(emailScreen.key) : undefined}
        />
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
      <Shell progressPct={100} compact={compact} onLeave={requestLeave}>
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

  // === On the way to checkout ===
  if (status.kind === 'redirecting') {
    return (
      <Shell progressPct={100} compact={compact} onLeave={requestLeave}>
        <div role="status" className="mx-auto max-w-xl text-center">
          <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-full bg-butter text-ink">
            <Check aria-hidden className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h2 className={cn(H2, 'mb-4')}>You&rsquo;re all set.</h2>
          <p className="text-[16px] leading-relaxed text-ink-soft">Taking you to checkout&hellip;</p>
        </div>
      </Shell>
    );
  }

  // === Submitted screen ===
  if (status.kind === 'submitted') {
    const title =
      mode === 'media' ? 'Thank you. Your physician has them.' : mode === 'visit' ? 'Your visit is complete.' : "That's it. You're in.";
    const body =
      mode === 'media'
        ? 'They go with your answers to your physician, who will review and either issue or decline your prescription. Nothing is charged unless it is approved.'
        : mode === 'visit'
          ? 'Your licensed prescriber will review your visit and either issue or decline your prescription. Nothing ships, and nothing is charged, until it is approved.'
          : 'Your account is ready. Log in to choose your plan at checkout. Your physician reviews your answers before anything ships.';
    return (
      <Shell progressPct={100} compact={compact} onLeave={requestLeave}>
        <div className="text-center max-w-xl mx-auto">
          <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-full bg-butter text-ink">
            <Check aria-hidden className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h2 className={cn(H2, 'mb-4')}>{title}</h2>
          <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">{body}</p>
          <Link href={mode === 'pre' ? '/login' : '/portal'} className={BTN_PRIMARY}>
            {mode === 'pre' ? 'Log in to continue' : 'Back to your portal'}
          </Link>
        </div>
      </Shell>
    );
  }

  // === In progress. Render the current screen ===
  if (!screen) return null;
  const { step, fields, first, split } = screen;
  const isLast = idx === screens.length - 1;
  const auto = isAuto(screen);
  // A question on its own screen becomes the heading; the step's heading sets the scene once.
  const solo = split && fields.length === 1 && fields[0].label ? fields[0] : null;
  const [question, ...detail] = solo ? solo.label.split('\n\n') : [];
  const typedIds = fields
    .filter((f) => ['text-short', 'email', 'date', 'number', 'password'].includes(f.type))
    .map((f) => f.id);

  /*
   * Enter / the keyboard's return key. The wizard is not a <form>, so nothing
   * did this for free. On desktop a complete screen advances; otherwise it
   * moves to the next input ('next'), and on a phone's last input just closes
   * the keyboard ('done'). Textareas keep Enter for newlines; buttons for activation.
   */
  function onKeyDownCapture(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    const el = e.target as HTMLElement;
    if (['TEXTAREA', 'BUTTON', 'A'].includes(el.tagName) || el.closest('dialog')) return;
    e.preventDefault();
    const desktop = isDesktop();
    if (desktop && validation.ok) return advance();
    const inputs = Array.from(stepRef.current?.querySelectorAll<HTMLElement>(TYPED) ?? []);
    const next = inputs[inputs.indexOf(el) + 1];
    if (next) next.focus();
    else if (desktop) advance();
    else el.blur();
  }

  /** The message under a field: after it was left with something in it, or after Continue. */
  function errorFor(f: Field): string | null {
    const v = answers[f.id];
    const filled = f.type === 'height' ? typeof answers.height_ft === 'number' : v !== undefined && v !== '';
    if (!(attempted === screen?.key || (touched[f.id] && filled))) return null;
    if (fieldKnockout(f, v) === 'under18') return 'You must be 18 or older.';
    return fieldProblem(f, v, answers);
  }

  function onPick(f: Field, v: unknown) {
    const next = setField(f.id, v);
    if (!auto) return;
    // Let the selected state show for a beat, then move on.
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => advance(next), AUTO_MS);
  }

  // A knockout answer must still be able to press Continue, or the knockout
  // screen (state, age, safety) can never be reached. Incomplete screens can
  // press it too: it shows what is missing.
  const ready = validation.ok || !!validation.knockout;
  const continueLabel = isLast
    ? isPending
      ? 'Submitting…'
      : mode === 'pre'
        ? 'Continue to checkout →'
        : mode === 'media'
          ? 'Send to your physician →'
          : 'Submit visit →'
    : 'Continue →';

  const backButton = idx > 0 && (
    <button
      type="button"
      onClick={handleBack}
      disabled={isPending}
      className={cn(
        'min-h-[44px] flex-none rounded-full bg-milk px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-milk-deep',
        isPending && 'cursor-not-allowed opacity-40 hover:bg-milk',
      )}
    >
      Back
    </button>
  );

  return (
    <Shell
      onKeyDown={onKeyDownCapture}
      progressPct={progressPct}
      stepIdx={idx}
      total={screens.length}
      compact={compact}
      onLeave={requestLeave}
      footer={
        auto ? undefined : (
          <div className="flex items-center justify-between gap-2 md:gap-3">
            {backButton}
            <button
              type="button"
              onClick={() => advance()}
              disabled={isPending}
              className={cn(
                'ml-auto inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-[transform,background-color,color] md:min-h-[44px] md:flex-none',
                ready && !isPending
                  ? 'bg-butter text-ink hover:-translate-y-0.5 hover:bg-butter-deep'
                  : 'bg-ink/[0.06] text-ink/40',
                isPending && 'cursor-not-allowed',
              )}
            >
              {isPending && (
                <span
                  aria-hidden
                  className="h-4 w-4 inline-block rounded-full border-2 border-ink/20 border-t-ink animate-spin motion-reduce:animate-none"
                />
              )}
              {continueLabel}
            </button>
          </div>
        )
      }
    >
      <motion.div
        key={screen.key}
        ref={stepRef}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
      {restored === screen.key && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-3 rounded-inner bg-milk px-4 py-3 text-[14px] text-ink"
        >
          <span>Welcome back, we saved your progress.</span>
          <button
            type="button"
            onClick={startOver}
            className="flex-none text-[13px] font-medium text-ink-soft underline decoration-ink/30 underline-offset-[3px] hover:text-ink hover:decoration-ink"
          >
            Start over
          </button>
        </div>
      )}
      {product && mode !== 'media' && (
        <p className="mb-4 flex w-fit max-w-full items-baseline gap-x-2 rounded-full bg-butter-soft px-3 py-1.5 ring-1 ring-butter-deep/40 md:mb-6 md:gap-x-3 md:px-4 md:py-2">
          <span className="flex-none text-[12px] font-medium text-ink/55 md:text-[13px]">Starting</span>
          <span className="truncate text-[14px] font-semibold text-ink md:text-[15px]">{product.name}</span>
          <span className="hidden truncate text-[13px] text-ink/55 md:inline">{product.tagline}</span>
        </p>
      )}

      {step.kind === 'interstitial' ? (
        <div className="py-6 md:py-10">
          <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-full bg-butter text-ink">
            <Check aria-hidden className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h2 className={cn(H2, 'mb-3')}>{step.heading}</h2>
          {step.body && <p className="max-w-xl text-[16px] leading-relaxed text-ink-soft">{step.body}</p>}
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] font-medium text-ink/55">{sectionName(step.eyebrow)}</p>
          {solo ? (
            <>
              {first && <p className="mb-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">{step.heading}</p>}
              <h2 className={cn(H2, detail.length ? 'mb-3' : 'mb-6')}>{question}</h2>
              {detail.length > 0 && (
                <p className="mb-6 max-w-xl whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{detail.join('\n\n')}</p>
              )}
            </>
          ) : (
            <>
              <h2 className={cn(H2, 'mb-3')}>{step.heading}</h2>
              {step.body && first ? (
                <p className="mb-6 max-w-xl text-[16px] leading-relaxed text-ink-soft">{step.body}</p>
              ) : (
                <div className="mb-6" />
              )}
            </>
          )}
        </>
      )}

      {/* Disclaimer list. Read-only acknowledgement statements (consent step) */}
      {step.disclaimers && step.disclaimers.length > 0 && (
        <ol className="mb-5 max-h-[38svh] space-y-3 overflow-y-auto rounded-shell bg-milk p-4 md:p-5">
          {step.disclaimers.map((d, i) => (
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

      {/* Fields */}
      {/* scroll-mb keeps a focused input clear of the sticky action bar. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 [&_input]:scroll-mb-32 [&_textarea]:scroll-mb-32">
        {fields.map((f) => {
          const error = errorFor(f);
          // Carrier rules want the SMS disclosure beside the number.
          const sms = f.id === 'phone' ? step.smsDisclaimer : undefined;
          const describedBy = [error && `err-${f.id}`, sms && 'sms-note'].filter(Boolean).join(' ');
          return (
          <div
            key={f.id}
            data-field={f.id}
            className={f.half ? 'col-span-1 min-w-0' : 'col-span-2 min-w-0'}
            onBlur={(e) => {
              // Leaving a field (not moving within it) marks it and tidies spaces.
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              setTouched((t) => (t[f.id] ? t : { ...t, [f.id]: true }));
              const v = answers[f.id];
              if (typeof v === 'string' && v !== v.trim() && (f.type === 'text-short' || f.type === 'email')) {
                setField(f.id, v.trim());
              }
            }}
          >
            {f.label && !solo && (
              <label
                htmlFor={`fld-${f.id}`}
                className="mb-2 block whitespace-pre-line text-[13px] font-medium leading-relaxed text-ink/70"
              >
                {f.label}
              </label>
            )}
            {f.type === 'recommendation' ? (
              <RecommendationPicker
                rec={rec}
                offers={offers ?? {}}
                value={answers[f.id]}
                onChange={(v) => setField(f.id, v)}
                startedName={product?.name}
              />
            ) : f.type === 'height' ? (
              <FieldRenderer
                field={f}
                value={
                  typeof answers.height_ft === 'number' && typeof answers.height_in === 'number'
                    ? answers.height_ft * 12 + answers.height_in
                    : undefined
                }
                onChange={(v) => {
                  const total = v as number;
                  setField('height_ft', Math.floor(total / 12));
                  setField('height_in', total % 12);
                }}
              />
            ) : (
              <FieldRenderer
                field={solo ? { ...f, label: question } : f}
                value={answers[f.id]}
                onChange={(v) => onPick(f, v)}
                mediaFolder={visitId}
                invalid={!!error}
                describedBy={describedBy}
                enterKeyHint={typedIds.includes(f.id) ? (f.id === typedIds.at(-1) ? 'done' : 'next') : undefined}
              />
            )}
            {error && (
              <p id={`err-${f.id}`} className="mt-2 text-[13px] leading-snug text-red-600">
                {error}
              </p>
            )}
            {step.isEmailCapture && f.type === 'email' && (
              <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
                {LEAD_CONSENT.text}{' '}
                <Link href="/legal/privacy" className="font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                  Privacy Policy
                </Link>
              </p>
            )}
            {sms && (
              <details className="mt-2">
                <summary
                  id="sms-note"
                  className="cursor-pointer list-none text-[12px] leading-relaxed text-ink/55 marker:hidden [&::-webkit-details-marker]:hidden"
                >
                  By continuing you agree to receive calls and texts from us. Message
                  and data rates may apply. Reply STOP to opt out.{' '}
                  <span className="font-medium text-ink underline decoration-ink/30 underline-offset-[3px]">Read in full</span>
                </summary>
                <p className="mt-2 text-[12px] leading-relaxed text-ink/55">{sms}</p>
              </details>
            )}
          </div>
          );
        })}
      </div>

      {/* One-tap screens have no action bar: Back (and Continue once answered) sit under the answers. */}
      {auto && (idx > 0 || validation.ok) && (
        <div className="mt-8 flex items-center gap-3">
          {backButton}
          {validation.ok && (
            <button
              type="button"
              onClick={() => advance()}
              className="min-h-[44px] rounded-full px-5 py-3 text-[14px] font-semibold text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
            >
              Continue →
            </button>
          )}
        </div>
      )}

      {/* Inline submit error (only on the final screen) */}
      {submitError && (
        <p
          role="alert"
          className="mt-6 rounded-inner bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-700 ring-1 ring-red-600/20"
        >
          {submitError}
        </p>
      )}
      </motion.div>

      <dialog
        ref={leaveRef}
        aria-labelledby="leave-title"
        onClick={(e) => e.target === e.currentTarget && leaveRef.current?.close()}
        className="w-[calc(100%-32px)] max-w-sm rounded-shell bg-white p-6 text-ink shadow-[0_24px_60px_-24px_rgba(17,17,17,0.45)] backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <h2 id="leave-title" className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em]">
          Leave your assessment?
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          {saves
            ? 'We’ll save your details so you can pick up where you left off. Health answers are never saved on this device.'
            : 'Your answers so far will be lost.'}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => leaveRef.current?.close()} className={cn(BTN_PRIMARY, 'sm:flex-1')}>
            Keep going
          </button>
          <button
            type="button"
            onClick={() => {
              leaveRef.current?.close();
              router.push(leaveTo);
            }}
            className={cn(BTN_SECONDARY, 'sm:flex-1')}
          >
            Leave
          </button>
        </div>
      </dialog>
    </Shell>
  );
}


const H2 = 'text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink [text-wrap:balance] md:text-[40px]';

const SIGN_IN_ERRORS = {
  invalid: 'That password doesn’t match. Try again, or reset it below.',
  throttled: 'Too many attempts. Wait a minute and try again.',
  use_login: 'Staff accounts sign in on the sign-in page.',
} as const;

/** The returning member signs in without leaving the assessment (the Hims pattern). */
function SignInToContinue({
  email,
  onSignedIn,
  onChangeEmail,
}: {
  email: string;
  onSignedIn: () => void;
  onChangeEmail?: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<keyof typeof SIGN_IN_ERRORS | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await assessmentSignInAction(email, password);
      if (res.ok) return onSignedIn();
      setError(res.error ?? 'invalid');
    } catch {
      setError('invalid');
    }
    setBusy(false);
  }

  const link =
    'text-[14px] text-ink-soft underline decoration-ink/30 underline-offset-[3px] transition-colors hover:text-ink hover:decoration-ink';
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md">
      <h2 className={cn(H2, 'mb-3')}>Welcome back.</h2>
      <p className="mb-6 text-[16px] leading-relaxed text-ink-soft">
        You already have an account. Enter your password and we&rsquo;ll pick up right where you are. Your answers are kept.
      </p>
      <div className="mb-4 flex items-center justify-between gap-3 rounded-inner bg-milk px-4 py-3.5 text-[15px] text-ink">
        <span className="min-w-0 truncate">{email}</span>
        {onChangeEmail && (
          <button type="button" onClick={onChangeEmail} className={cn(link, 'flex-none')}>
            Change
          </button>
        )}
      </div>
      <label htmlFor="continue-password" className="mb-1.5 block text-[14px] font-medium text-ink">
        Password
      </label>
      <input
        id="continue-password"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-invalid={error === 'invalid'}
        aria-describedby={error ? 'continue-error' : undefined}
        className="w-full min-w-0 rounded-inner bg-milk px-4 py-3.5 text-[16px] text-ink ring-1 ring-transparent placeholder:text-ink/40 transition-[box-shadow,background-color] focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink/20"
      />
      {error && (
        <p id="continue-error" role="alert" className="mt-2 text-[14px] text-red-700">
          {SIGN_IN_ERRORS[error]}{' '}
          {error === 'use_login' && (
            <Link href="/login" className="underline underline-offset-[3px]">
              Go to sign in
            </Link>
          )}
        </p>
      )}
      <button type="submit" disabled={!password || busy} className={cn(BTN_PRIMARY, 'mt-6 w-full disabled:opacity-50 disabled:hover:translate-y-0')}>
        {busy ? 'Signing in…' : 'Continue'}
      </button>
      <p className="mt-5 text-center">
        <Link href="/forgot-password" className={link}>
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}

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
  onLeave,
}: {
  children: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  progressPct: number;
  stepIdx?: number;
  total?: number;
  compact?: boolean;
  /** Under the fields on desktop; a sticky bar on phones so Continue never scrolls away. */
  footer?: React.ReactNode;
  /** ✕ / logo: leave (a path, or the page they came from). */
  onLeave?: (to?: string) => void;
}) {
  const stepLabel = stepIdx !== undefined && total !== undefined ? `Step ${stepIdx + 1} of ${total}` : null;
  const bar = (
    <div
      role="progressbar"
      aria-valuenow={progressPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={stepLabel ?? 'Complete'}
      aria-label="Assessment progress"
      className="h-1.5 w-full overflow-hidden rounded-full bg-milk"
    >
      <div
        className="h-full rounded-full bg-butter-deep transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${progressPct}%` }}
      />
    </div>
  );
  const frosted =
    'rounded-shell bg-white/85 p-2 text-ink ring-1 ring-ink/10 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_50px_-24px_rgba(17,17,17,0.35)]';

  // Portal visit: the portal owns the chrome; the page scrolls, the bar sticks.
  if (compact) {
    return (
      <div onKeyDown={onKeyDown} className="relative mx-auto flex w-full max-w-2xl flex-col overflow-x-clip pb-0 pt-2 text-ink">
        <div className="mb-6 py-1">
          <div className="mb-2.5 flex items-center justify-between text-[13px] font-medium tabular-nums text-ink/55">
            <span>{stepLabel ?? 'Complete'}</span>
            <span>{progressPct}%</span>
          </div>
          {bar}
        </div>
        <div className="px-1 pb-4">{children}</div>
        {footer && (
          <div
            className={cn('sticky z-10 flex-none', frosted)}
            style={{ bottom: 'max(12px, calc(env(safe-area-inset-bottom) + 8px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }

  // /start: a focused header (logo, progress, ✕) instead of the site nav.
  return (
    <div onKeyDown={onKeyDown} className="flex min-h-[100svh] flex-col text-ink">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-2xl backdrop-saturate-150">
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:h-16 md:px-10">
          <button
            type="button"
            onClick={() => onLeave?.('/')}
            aria-label="Eternal Longevity home"
            className="-ml-1 justify-self-start rounded-full p-1"
          >
            {/* Deeper than butter so the logo reads on white, as in the site header. */}
            <Wordmark href={null} className="text-[24px] text-[#F2D060] md:text-[28px]" />
          </button>
          <span className="text-[13px] font-medium tabular-nums text-ink/55">{stepLabel}</span>
          <button
            type="button"
            onClick={() => onLeave?.()}
            aria-label="Leave assessment"
            className="grid h-10 w-10 place-items-center justify-self-end rounded-full bg-milk text-ink transition-colors hover:bg-milk-deep"
          >
            <X aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
        <div className="px-4 pb-2 md:px-10">{bar}</div>
      </header>

      <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-4 pb-3 pt-6 md:px-6 md:pb-20 md:pt-12">
        <div className="px-1 pb-6 md:pb-0">{children}</div>
        {footer && (
          <div
            className={cn(
              'sticky z-10 mt-auto md:static md:mt-10 md:bg-transparent md:p-0 md:shadow-none md:ring-0 md:backdrop-blur-none',
              frosted
            )}
            style={{ bottom: 'max(12px, calc(env(safe-area-inset-bottom) + 8px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
