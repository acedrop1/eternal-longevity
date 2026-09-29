'use server';

/**
 * Receives a completed intake and submits it.
 *
 * Two modes, chosen automatically:
 *   • Demo mode  — no Supabase service-role key set. Logs + simulated delay.
 *   • Live mode  — persists to the `intake_submissions` table and emails the
 *                  patient + care team.
 *
 * Either way the wizard gets back { ok, caseId }, so the front end is identical.
 */
import { cookies } from 'next/headers';
import type { Json } from '@/lib/database.types';
import { getSession, setSession } from '@/lib/auth-server';
import {
  PLAN_FIELD,
  buildAssessmentSteps,
  buildVisitSteps,
  isCategoryKey,
  passwordValid,
  recommendationFor,
  SERVICEABLE_STATES,
  STATE_NAMES,
  type AssessmentContext,
} from '@/lib/intakeSchema';
import { PRODUCT_CATEGORY } from '@/lib/intake-categories';
import { getLiveProducts } from '@/lib/catalog';
import { cadenceTiersForProduct } from '@/lib/shopProducts';
import { withCartItem, type Cadence, type CartItem } from '@/lib/cartTypes';
import { supabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ACTIVITY_COOKIE, SESSION_START_COOKIE } from '@/lib/session-policy';
import { SERVICE_AREA_OR } from '@/lib/site';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import {
  intakeConfirmationEmail,
  intakeReceivedTeamEmail,
  sendEmail,
  SUPPORT_EMAIL,
} from '@/lib/email';
import { LIMITS, allow } from './rate-limit';
import {
  ageFromDob,
  consentsComplete,
  fieldComplete,
  firstKnockout,
  intakeProductIds,
  knownAnswerIds,
  mediaPaths,
  outstandingMedia,
  ownMediaPath,
  pruneHidden,
  stepsProblem,
  visitProblem,
  zipInState,
} from './intake-rules';
import { visitProducts } from './visit-products';
import { intakeStateFor, latestIntakeAnswers } from './intake-status';

/**
 * Is there already an account on this address?
 *
 * Called when the visitor leaves the email step, so they are sent to sign in
 * before filling in a health history they would only lose. Returns false on any
 * failure — this is a convenience, and the submit path holds the real guard.
 */
export async function emailHasAccountAction(email: string): Promise<boolean> {
  // This answers "does this person have an account here" to anyone who asks,
  // about a medical practice. Throttled rather than removed: the intake wizard
  // needs it to route someone to sign-in instead of a duplicate account.
  if (!(await allow('enumeration', LIMITS.enumeration))) return false;
  const clean = email.trim().toLowerCase();
  if (!clean.includes('@') || !supabaseAdminConfigured()) return false;
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from('profiles')
      .select('id')
      .ilike('email', clean)
      .maybeSingle();
    return Boolean(data?.id);
  } catch {
    return false;
  }
}

export interface IntakeSubmitResult {
  ok: boolean;
  /** Server-issued opaque ID used for the welcome email + portal link. */
  caseId?: string;
  error?: string;
  /** A knockout the server found when it re-checked the answers. */
  knockout?: string;
  /** Where the wizard goes next: '/checkout' once signed in with the plan in the cart. */
  next?: string;
}

const ownProduct = (id: unknown): id is string =>
  typeof id === 'string' && Object.prototype.hasOwnProperty.call(PRODUCT_CATEGORY, id);

/** The assessment as the wizard built it, rebuilt from what the server knows. */
async function assessmentFor(answers: Record<string, unknown>, known?: string[]) {
  const live = (await getLiveProducts()).filter((p) => ownProduct(p.id));
  const productId = ownProduct(answers.entryProductId) ? answers.entryProductId : undefined;
  const ctx: AssessmentContext = {
    productId,
    category: !productId && isCategoryKey(answers.entryCategory) ? answers.entryCategory : undefined,
    member: !!known,
    known,
    catalog: Object.fromEntries(live.map((p) => [p.id, { name: p.name, contraindications: p.contraindications }])),
  };
  return { ctx, live };
}

/** The recommended (or alternative) live product and one of its plans, or null. */
function chosenPlan(
  ctx: AssessmentContext,
  live: Awaited<ReturnType<typeof getLiveProducts>>,
  answers: Record<string, unknown>,
): { productId: string; name: string; cadence: Cadence } | null {
  const rec = recommendationFor(ctx, answers);
  const c = answers[PLAN_FIELD] as { productId?: unknown; cadence?: unknown } | undefined;
  if (!c || !rec?.primary || (c.productId !== rec.primary && c.productId !== rec.alternative)) return null;
  const product = live.find((p) => p.id === c.productId);
  const tier = product && cadenceTiersForProduct(product).find((t) => t.key === c.cadence);
  return product && tier ? { productId: product.id, name: product.name, cadence: tier.key } : null;
}

/** State, ZIP and age: the eligibility gate, whoever is asking. */
function eligibilityProblem(answers: Record<string, unknown>): string | null {
  if (typeof answers.state !== 'string' || !SERVICEABLE_STATES.includes(answers.state)) {
    return `We can only treat patients in ${SERVICE_AREA_OR} right now.`;
  }
  // Shipping and the prescriber's licence follow the state, so the ZIP must agree with it.
  if (!zipInState(answers.zip, answers.state)) {
    return `That ZIP doesn't look like it's in ${STATE_NAMES[answers.state]}.`;
  }
  const age = ageFromDob(answers.dob);
  if (age === null || age > 120) return 'Enter a valid date of birth.';
  return null;
}

/** Signed in straight after signup, so the assessment can go on to checkout. */
async function signIn(email: string, password: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return false;
    // A fresh session starts fresh logoff clocks (as loginAction does).
    const store = await cookies();
    const now = String(Date.now());
    const opts = { httpOnly: true, sameSite: 'lax' as const, path: '/' };
    store.set(ACTIVITY_COOKIE, now, opts);
    store.set(SESSION_START_COOKIE, now, opts);
    return true;
  } catch {
    return false;
  }
}

/** Put the chosen plan in the member's saved cart (live mode). Best-effort: the wizard also writes the browser cart. */
async function saveChosenToCart(
  db: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  plan: { productId: string; cadence: Cadence },
): Promise<void> {
  try {
    const { data } = await db.from('profiles').select('cart').eq('id', userId).maybeSingle();
    const current = Array.isArray(data?.cart) ? (data.cart as unknown as CartItem[]) : [];
    await db
      .from('profiles')
      .update({ cart: withCartItem(current, plan.productId, plan.cadence) as unknown as Json })
      .eq('id', userId);
  } catch {
    // No cart column yet: checkout falls back to the browser cart.
  }
}

export async function submitIntakeAction(
  answers: Record<string, unknown>,
): Promise<IntakeSubmitResult> {
  // --- validate -----------------------------------------------------------
  if (!answers || typeof answers !== 'object') {
    return { ok: false, error: 'Missing payload.' };
  }
  const email = answers.email;
  if (typeof email !== 'string' || !email.includes('@')) {
    return { ok: false, error: 'A valid email is required.' };
  }
  /*
   * Unauthenticated, and each call creates an account and sends two emails.
   * Limited per IP and per address, so neither a script nor one address
   * hammered from many IPs gets far.
   */
  const throttled =
    !(await allow('signup', LIMITS.signup)) ||
    !(await allow('signup', LIMITS.signup, email.trim().toLowerCase()));
  if (throttled) {
    return { ok: false, error: 'Too many attempts. Please try again in a few minutes.' };
  }
  // The wizard stops out-of-state visitors at the state question; this is the
  // same geofence (and ZIP and age check) for anything that skips the wizard.
  const ineligible = eligibilityProblem(answers);
  if (ineligible) return { ok: false, error: ineligible };

  /*
   * Everything else the wizard asked, asked again: rebuild the same screens
   * from the entry point and the answers, drop answers to questions that were
   * not shown (so a stale one can't trip a knockout), then knockouts, then
   * anything missing. Photos come later, in the portal.
   */
  const { ctx, live } = await assessmentFor(answers);
  pruneHidden(buildAssessmentSteps(ctx, answers), answers);
  const knockout = firstKnockout(answers);
  if (knockout) return { ok: false, knockout };
  const missing = stepsProblem(buildAssessmentSteps(ctx, answers), answers);
  if (missing) return { ok: false, error: missing };
  if (!consentsComplete(answers.consents)) {
    return { ok: false, error: 'Please confirm the required acknowledgements.' };
  }
  const plan = chosenPlan(ctx, live, answers);
  if (!plan) return { ok: false, error: 'Choose a treatment and plan to continue.' };
  answers.requestedProduct = plan.name;
  answers.requestedProductId = plan.productId;
  answers.assessedProductIds = [plan.productId];

  const caseId = `case_${Math.random().toString(36).slice(2, 9)}`;

  // --- demo mode ----------------------------------------------------------
  if (!supabaseAdminConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[intake] demo mode — not persisted:', caseId);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    // Local demo only: sign in as the demo member so checkout can be tried.
    if (supabaseConfigured) return { ok: true, caseId, next: '/login' };
    await setSession('member');
    return { ok: true, caseId, next: '/checkout' };
  }

  // Never persist credentials. The account object carries the password from
  // the account-creation step; pull it out before the answers are stored.
  const account = answers.account as
    | { password?: string; mfa?: boolean }
    | undefined;
  delete answers.account;
  // An intake with no account behind it could be filed against anyone's
  // address, so the password step is required here as it is in the wizard.
  if (!account?.password || !passwordValid(account.password)) {
    return {
      ok: false,
      error:
        'Password must be 8+ characters with an uppercase letter, a lowercase letter, and a special character.',
    };
  }

  const fullName = [answers.first_name, answers.last_name]
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => String(v).trim())
    .join(' ');
  const phone = typeof answers.phone === 'string' ? answers.phone.trim() : '';

  // --- live mode: create the account + persist ----------------------------
  let userId: string | null = null;
  try {
    const db = createSupabaseAdminClient();

    if (account?.password) {
      const { data: created, error: authErr } = await db.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: account.password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      });
      if (created?.user) {
        userId = created.user.id;
        await db
          .from('profiles')
          .update({
            ...(fullName ? { full_name: fullName } : {}),
            ...(phone ? { phone } : {}),
            ...(typeof answers.dob === 'string' && answers.dob
              ? { date_of_birth: answers.dob }
              : {}),
          })
          .eq('id', userId);
      } else if (authErr) {
        /*
         * Email already registered. This used to look up that account and
         * attach the intake to it — so anyone who knew your address could file
         * a medical history against your record, and the person filling in the
         * form believed they had signed up. Send them to sign in instead.
         */
        return { ok: false, error: 'account_exists' };
      }
    }

    const { error } = await db.from('intake_submissions').insert({
      case_id: caseId,
      email,
      user_id: userId,
      answers: answers as unknown as Json,
      // Every question is answered; only photos (hair, skin) or labs can follow in the portal.
      status: 'submitted',
    });
    if (error) {
      console.error('[intake] insert failed:', error.message);
      return {
        ok: false,
        error: 'We could not save your intake. Please try again.',
      };
    }
  } catch (err) {
    console.error('[intake] persistence error:', err);
    return {
      ok: false,
      error: 'We could not save your intake. Please try again.',
    };
  }

  // --- live mode: notify (best-effort, never blocks the response) ---------
  const firstName =
    typeof answers.first_name === 'string' && answers.first_name.trim()
      ? answers.first_name.trim()
      : 'there';

  const patient = intakeConfirmationEmail(firstName);
  const team = intakeReceivedTeamEmail(caseId, email, fullName);

  await Promise.allSettled([
    sendEmail({ to: email, subject: patient.subject, html: patient.html }),
    sendEmail({
      to: SUPPORT_EMAIL,
      subject: team.subject,
      html: team.html,
    }),
  ]);

  // Chosen plan into their cart, then signed in and on to checkout.
  if (userId) await saveChosenToCart(createSupabaseAdminClient(), userId, plan);
  const signedIn = userId ? await signIn(email.trim().toLowerCase(), account.password) : false;
  return { ok: true, caseId, next: signedIn ? '/checkout' : '/login' };
}

/**
 * A signed-in member starting another product. Their details, body and
 * consents are on file; the category, health and product questions are asked
 * again and filed as a new intake (the newest intake is what the prescriber
 * reads and what checkout checks), on top of what is already on file.
 */
export async function submitMemberAssessmentAction(
  answers: Record<string, unknown>,
): Promise<IntakeSubmitResult> {
  const user = await getSession();
  if (!user || user.role !== 'member') return { ok: false, error: 'Please log in to continue.' };
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, error: 'Missing payload.' };
  }
  if (!(await allow('form', LIMITS.form, user.id))) {
    return { ok: false, error: 'Too many attempts. Please try again in a few minutes.' };
  }
  if ((await intakeStateFor(user.id)) === 'declined') {
    return { ok: false, error: 'Your last visit was closed. Message your care team if something has changed.' };
  }
  delete answers.account;
  delete answers.email;

  const onFile = await latestIntakeAnswers(user.id);
  const { ctx, live } = await assessmentFor(answers, knownAnswerIds(onFile));
  const merged: Record<string, unknown> = { ...onFile, ...answers };
  // Answers on file from earlier assessments stay; this one's hidden answers go.
  pruneHidden(buildAssessmentSteps(ctx, merged), merged, Object.keys(onFile));

  const ineligible = eligibilityProblem(merged);
  if (ineligible) return { ok: false, error: ineligible };
  // A knockout here stops this product only; it doesn't close their record.
  const knockout = firstKnockout(merged);
  if (knockout) return { ok: false, knockout };
  const missing = stepsProblem(buildAssessmentSteps(ctx, merged), merged);
  if (missing) return { ok: false, error: missing };
  if (!consentsComplete(merged.consents)) {
    return { ok: false, error: 'Please confirm the required acknowledgements.' };
  }
  const plan = chosenPlan(ctx, live, merged);
  if (!plan) return { ok: false, error: 'Choose a treatment and plan to continue.' };
  merged.requestedProduct = plan.name;
  merged.requestedProductId = plan.productId;
  merged.assessedProductIds = [...new Set([...intakeProductIds(onFile), plan.productId])];

  const caseId = `case_${Math.random().toString(36).slice(2, 9)}`;
  if (!supabaseAdminConfigured()) return { ok: true, caseId, next: '/checkout' };

  const db = createSupabaseAdminClient();
  const { error } = await db.from('intake_submissions').insert({
    case_id: caseId,
    email: user.email,
    user_id: user.id,
    answers: merged as unknown as Json,
    status: 'submitted',
  });
  if (error) {
    console.error('[intake] member insert failed:', error.message);
    return { ok: false, error: 'We could not save your answers. Please try again.' };
  }
  await syncProfileFromAnswers(db, user.id, merged);
  await saveChosenToCart(db, user.id, plan);
  return { ok: true, caseId, next: '/checkout' };
}

/* ------------------------------ portal visit ----------------------------- */

export interface PendingVisit {
  intakeId: string;
  productName: string | null;
  productId: string | null;
}

/** The caller's open clinical visit, if any. */
/**
 * Copy identity out of the intake and onto the profile.
 *
 * Date of birth lived only inside the answers blob, so the member record said
 * "—" while the intake right beside it had the date. Anything reading the
 * profile — the admin page, an age check, the pharmacy submission — saw
 * nothing.
 */
async function syncProfileFromAnswers(
  db: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  answers: Record<string, unknown>,
): Promise<void> {
  const str = (k: string) =>
    typeof answers[k] === 'string' ? (answers[k] as string).trim() : '';
  const fullName = [str('first_name'), str('last_name')]
    .filter(Boolean)
    .join(' ');
  const patch: {
    full_name?: string;
    phone?: string;
    date_of_birth?: string;
  } = {};
  if (fullName) patch.full_name = fullName;
  if (str('phone')) patch.phone = str('phone');
  if (/^\d{4}-\d{2}-\d{2}$/.test(str('dob'))) patch.date_of_birth = str('dob');
  if (!Object.keys(patch).length) return;
  try {
    await db.from('profiles').update(patch).eq('id', userId);
  } catch {
    // The intake is saved either way; this is a convenience copy.
  }
}

export async function getPendingVisit(): Promise<PendingVisit | null> {
  const user = await getSession();
  if (!user || !supabaseAdminConfigured()) return null;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('intake_submissions')
    .select('id, answers')
    .eq('user_id', user.id)
    .eq('status', 'awaiting_visit')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const a = (data.answers ?? {}) as Record<string, unknown>;
  return {
    intakeId: data.id,
    productName: typeof a.requestedProduct === 'string' ? a.requestedProduct : null,
    productId: typeof a.requestedProductId === 'string' ? a.requestedProductId : null,
  };
}

/**
 * Photos and lab files after checkout: only the uploads still owed on the
 * newest intake are accepted, each must sit in the caller's own storage
 * folder, and required photo slots must be filled. Merged into that intake;
 * its status is untouched (it is already with the prescriber).
 */
async function submitMedia(
  db: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  upload: Record<string, unknown>,
): Promise<IntakeSubmitResult> {
  const { data: intake } = await db
    .from('intake_submissions')
    .select('id, case_id, answers')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!intake) return { ok: false, error: 'Nothing to add photos to yet.' };
  const answers = (intake.answers ?? {}) as Record<string, unknown>;
  const fields = outstandingMedia(answers).flatMap((st) => st.fields);
  if (!fields.length) return { ok: true, caseId: intake.case_id };
  const merged: Record<string, unknown> = { ...answers };
  for (const f of fields) {
    const paths = mediaPaths(f, upload[f.id]);
    if (!paths || !paths.every((p) => ownMediaPath(p, userId))) {
      return { ok: false, error: 'A photo or file could not be verified. Please upload it again.' };
    }
    if (!fieldComplete(f, upload[f.id])) return { ok: false, error: 'Add every required photo to continue.' };
    if (upload[f.id] !== undefined) merged[f.id] = upload[f.id];
  }
  merged.mediaCompletedAt = new Date().toISOString();
  const { error } = await db
    .from('intake_submissions')
    .update({ answers: merged as unknown as Json })
    .eq('id', intake.id);
  if (error) return { ok: false, error: 'Could not save your photos. Try again.' };
  return { ok: true, caseId: intake.case_id };
}

/**
 * The portal visit. Normally just the photos / labs left after checkout
 * (submitMedia). LEGACY: an intake opened before the assessment moved ahead of
 * checkout ('awaiting_visit') still completes its full clinical visit here.
 */
export async function submitVisitAction(
  visitAnswers: Record<string, unknown>,
): Promise<IntakeSubmitResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'Please log in to complete your visit.' };
  if (!visitAnswers || typeof visitAnswers !== 'object' || Array.isArray(visitAnswers)) {
    return { ok: false, error: 'Missing payload.' };
  }
  if (!supabaseAdminConfigured()) return { ok: true, caseId: 'demo' };

  /*
   * A closed intake stays closed. Without this, a member knocked out by the
   * safety screen — or declined by staff or the prescriber — could press Back
   * and file a fresh visit with different answers. Staff reopening the intake
   * moves it off 'declined', which lifts this.
   */
  const state = await intakeStateFor(user.id);
  if (state === 'declined') {
    return {
      ok: false,
      error: 'Your last visit was closed. Message your care team if something has changed.',
    };
  }

  const db = createSupabaseAdminClient();
  if (state === 'submitted') return submitMedia(db, user.id, visitAnswers);
  let { data: intake } = await db
    .from('intake_submissions')
    .select('id, case_id, answers')
    .eq('user_id', user.id)
    .eq('status', 'awaiting_visit')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  /*
   * Not everyone arrives through /start. An account created by an admin, or
   * one that reached the portal another way, has no open intake at all — and
   * used to hit a dead end that left them unable to give the prescriber
   * anything. Open one for them here instead.
   */
  if (!intake) {
    const { data: created, error: createErr } = await db
      .from('intake_submissions')
      .insert({
        user_id: user.id,
        email: user.email,
        case_id: `case_${Math.random().toString(36).slice(2, 9)}`,
        status: 'awaiting_visit',
        answers: {} as unknown as Json,
      })
      .select('id, case_id, answers')
      .single();
    if (createErr || !created) {
      return { ok: false, error: 'Could not start your visit. Try again.' };
    }
    intake = created;
  }

  const merged = {
    ...((intake.answers ?? {}) as Record<string, unknown>),
    ...visitAnswers,
    visitCompletedAt: new Date().toISOString(),
  };

  /*
   * Rebuild the visit's steps from what the server knows (open intake, orders,
   * cart) plus any products the wizard says it showed — extra ids only add
   * questions. visitProblem drops hidden answers first, so a stale hidden
   * answer can't trip a knockout; the missing-answer error waits until after
   * the knockout check, so a crafted submit with a knockout is still declined.
   */
  const extra = Array.isArray(visitAnswers.visitProductIds) ? visitAnswers.visitProductIds : [];
  const steps = buildVisitSteps(await visitProducts(user.id, extra));
  const problem = visitProblem(steps, merged, user.id);

  // The wizard stops a knockout in the browser; this stops one sent without it.
  const knockout = firstKnockout(merged);
  if (knockout) {
    await db
      .from('intake_submissions')
      .update({ status: 'declined', review_notes: `Safety screen: ${knockout}` })
      .eq('id', intake.id);
    return { ok: false, knockout };
  }
  if (problem) return { ok: false, error: problem };
  const { error } = await db
    .from('intake_submissions')
    .update({ answers: merged as unknown as Json, status: 'submitted' })
    .eq('id', intake.id);
  if (error) return { ok: false, error: 'Could not save your visit. Try again.' };

  await syncProfileFromAnswers(db, user.id, merged);
  return { ok: true, caseId: intake.case_id };
}

/** A knockout during the visit closes the intake as clinically declined. */
export async function declineVisitAction(knockoutKey: string): Promise<void> {
  const user = await getSession();
  if (!user || !supabaseAdminConfigured()) return;
  const db = createSupabaseAdminClient();
  await db
    .from('intake_submissions')
    .update({ status: 'declined', review_notes: `Safety screen: ${knockoutKey}` })
    .eq('user_id', user.id)
    .eq('status', 'awaiting_visit');
}
