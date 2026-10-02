'use server';

/**
 * Clinical workflow actions on the Supabase tables.
 *
 * Admin actions on an `intake_submissions` row: ask the member for more
 * information, or close it. The prescriber works from orders, not intakes.
 */
import { getSession } from './auth-server';
import {
  intakeClosedByTeamEmail,
  intakeNeedsInfoEmail,
  sendEmail,
} from './email';
import { SITE_URL } from './site';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from './supabase/admin';

export interface ClinicalResult {
  ok: boolean;
  message: string;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}

async function adminGuard(): Promise<ClinicalResult | null> {
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Connect Supabase to manage the queue.' };
  }
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { ok: false, message: 'Admin access is required.' };
  }
  return null;
}

/** Send an intake back for more information. */
export async function requestIntakeInfo(input: {
  intakeId: string;
  note: string;
}): Promise<ClinicalResult> {
  const blocked = await adminGuard();
  if (blocked) return blocked;
  if (!input.note.trim()) {
    return { ok: false, message: 'Add a note describing what is needed.' };
  }
  try {
    const db = createSupabaseAdminClient();
    const { data: intake, error } = await db
      .from('intake_submissions')
      .update({ status: 'needs_info', review_notes: input.note.trim() })
      .eq('id', input.intakeId)
      .select('email, answers, user_id')
      .maybeSingle();
    if (error) return { ok: false, message: error.message };

    /*
     * The question goes where they can answer it: their support thread, which
     * is the admin inbox. The email then only says where to look, so the note
     * itself stays behind the sign-in.
     */
    const session = await getSession();
    let inThread = false;
    if (intake?.user_id && session) {
      const { error: msgErr } = await db.from('messages').insert({
        thread_user_id: intake.user_id,
        sender_id: session.id,
        channel: 'support',
        body: input.note.trim(),
      });
      inThread = !msgErr;
    }

    // Asking for information nobody is told about is just a stalled case.
    const sent = await notifyNeedsInfo(intake, input.note.trim(), inThread);
    return {
      ok: true,
      message: sent
        ? 'Member emailed and asked for more information.'
        : 'Marked as needing information, but the email could not be sent.',
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

/** Decline an intake with a reason. */
export async function declineIntake(input: {
  intakeId: string;
  note: string;
}): Promise<ClinicalResult> {
  const blocked = await adminGuard();
  if (blocked) return blocked;
  if (!input.note.trim()) {
    return { ok: false, message: 'Add a reason for the decline.' };
  }
  try {
    const db = createSupabaseAdminClient();
    const { data: intake, error } = await db
      .from('intake_submissions')
      .update({ status: 'declined', review_notes: input.note.trim() })
      .eq('id', input.intakeId)
      .select('email, answers')
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    await notifyClosedByTeam(intake, input.note.trim());
    return { ok: true, message: 'Closed, and the member was told why.' };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}


function firstNameOf(answers: unknown): string {
  const a = (answers ?? {}) as Record<string, unknown>;
  return (typeof a.first_name === 'string' && a.first_name.trim()) || 'there';
}

/** Emails the member what admin needs. Returns whether it actually went. */
async function notifyNeedsInfo(
  intake: { email?: string | null; answers?: unknown } | null,
  note: string,
  inThread: boolean,
): Promise<boolean> {
  const email = intake?.email;
  if (!email) return false;
  const msg = intakeNeedsInfoEmail({
    firstName: firstNameOf(intake?.answers),
    note,
    inThread,
    portalUrl: inThread ? `${SITE_URL}/portal/messages?thread=support` : `${SITE_URL}/portal`,
  });
  try {
    const res = await sendEmail({ to: email, subject: msg.subject, html: msg.html });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * An admin closing a visit is an administrative act, not a clinical one, so the
 * member must not be told a prescriber decided anything.
 */
async function notifyClosedByTeam(
  intake: { email?: string | null; answers?: unknown } | null,
  reason: string,
): Promise<void> {
  const email = intake?.email;
  if (!email) return;
  const msg = intakeClosedByTeamEmail({
    firstName: firstNameOf(intake?.answers),
    reason,
  });
  try {
    await sendEmail({ to: email, subject: msg.subject, html: msg.html });
  } catch {
    // A failed notification must not roll back the decision.
  }
}
