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
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import {
  intakeConfirmationEmail,
  intakeReceivedTeamEmail,
  sendEmail,
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

  // --- live mode: persist -------------------------------------------------
  try {
    const db = createSupabaseAdminClient();
    const { error } = await db.from('intake_submissions').insert({
      case_id: caseId,
      email,
      answers: answers as unknown as Json,
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
    typeof answers.firstName === 'string' && answers.firstName.trim()
      ? answers.firstName.trim()
      : typeof answers.name === 'string'
        ? String(answers.name).trim().split(/\s+/)[0]
        : 'there';

  const patient = intakeConfirmationEmail(firstName);
  const team = intakeReceivedTeamEmail(caseId, email);

  await Promise.allSettled([
    sendEmail({ to: email, subject: patient.subject, html: patient.html }),
    process.env.CARE_TEAM_EMAIL
      ? sendEmail({
          to: process.env.CARE_TEAM_EMAIL,
          subject: team.subject,
          html: team.html,
        })
      : Promise.resolve(),
  ]);

  return { ok: true, caseId };
}
