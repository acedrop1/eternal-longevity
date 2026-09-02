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
import type { Json } from '@/lib/database.types';
import { getSession } from '@/lib/auth-server';
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

export interface IntakeSubmitResult {
  ok: boolean;
  /** Server-issued opaque ID used for the welcome email + portal link. */
  caseId?: string;
  error?: string;
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

  const caseId = `case_${Math.random().toString(36).slice(2, 9)}`;

  // --- demo mode ----------------------------------------------------------
  if (!supabaseAdminConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[intake] demo mode — not persisted:', caseId);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: true, caseId };
  }

  // Never persist credentials. The account object carries the password from
  // the account-creation step; pull it out before the answers are stored.
  const account = answers.account as
    | { password?: string; mfa?: boolean }
    | undefined;
  delete answers.account;

  // --- live mode: create the account + persist ----------------------------
  let userId: string | null = null;
  try {
    const db = createSupabaseAdminClient();

    if (account?.password) {
      const { data: created, error: authErr } = await db.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: account.password,
        email_confirm: true,
      });
      if (created?.user) {
        userId = created.user.id;
        if (account.mfa) {
          await db
            .from('profiles')
            .update({ two_factor_enabled: true })
            .eq('id', userId);
        }
      } else if (authErr) {
        // Email already registered — link the intake to the existing account.
        const { data: existing } = await db
          .from('profiles')
          .select('id')
          .ilike('email', email.trim())
          .maybeSingle();
        userId = existing?.id ?? null;
      }
    }

    const { error } = await db.from('intake_submissions').insert({
      case_id: caseId,
      email,
      user_id: userId,
      answers: answers as unknown as Json,
      // Clinical questions are answered in the portal visit before review.
      status: 'awaiting_visit',
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
    typeof answers.firstName === 'string' && answers.firstName.trim()
      ? answers.firstName.trim()
      : typeof answers.name === 'string'
        ? String(answers.name).trim().split(/\s+/)[0]
        : 'there';

  const patient = intakeConfirmationEmail(firstName);
  const team = intakeReceivedTeamEmail(caseId, email);

  await Promise.allSettled([
    sendEmail({ to: email, subject: patient.subject, html: patient.html }),
    sendEmail({
      to: SUPPORT_EMAIL,
      subject: team.subject,
      html: team.html,
    }),
  ]);

  return { ok: true, caseId };
}

/* ------------------------------ portal visit ----------------------------- */

export interface PendingVisit {
  intakeId: string;
  productName: string | null;
  productId: string | null;
}

/** The caller's open clinical visit, if any. */
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

/** Merge the visit answers into the open intake and hand it to the doctor. */
export async function submitVisitAction(
  visitAnswers: Record<string, unknown>,
): Promise<IntakeSubmitResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'Please log in to complete your visit.' };
  if (!supabaseAdminConfigured()) return { ok: true, caseId: 'demo' };

  const db = createSupabaseAdminClient();
  const { data: intake } = await db
    .from('intake_submissions')
    .select('id, case_id, answers')
    .eq('user_id', user.id)
    .eq('status', 'awaiting_visit')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!intake) return { ok: false, error: 'No open visit found.' };

  const merged = {
    ...((intake.answers ?? {}) as Record<string, unknown>),
    ...visitAnswers,
    visitCompletedAt: new Date().toISOString(),
  };
  const { error } = await db
    .from('intake_submissions')
    .update({ answers: merged as unknown as Json, status: 'submitted' })
    .eq('id', intake.id);
  if (error) return { ok: false, error: 'Could not save your visit. Try again.' };
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
