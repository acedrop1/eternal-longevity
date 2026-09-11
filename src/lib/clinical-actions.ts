'use server';

/**
 * Clinical workflow actions on the Supabase tables.
 *
 *   intake submitted -> admin triage -> physician sign-off
 *
 * Admin actions live here. They move an `intake_submissions` row through its
 * status; an approved intake is what surfaces in the physician's queue.
 */
import { getSession } from './auth-server';
import {
  declinedEmail,
  intakeClosedByTeamEmail,
  intakeNeedsInfoEmail,
  newIntakeForDoctorEmail,
  sendEmail,
} from './email';
import { sendSms } from './sms';
import { SITE_URL } from './site';
import type { Json } from './database.types';
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

/** Approve an intake — it moves into the physician's sign-off queue. */
export async function approveIntake(
  intakeId: string,
): Promise<ClinicalResult> {
  const blocked = await adminGuard();
  if (blocked) return blocked;
  try {
    const db = createSupabaseAdminClient();
    const { data: intake, error } = await db
      .from('intake_submissions')
      .update({ status: 'approved' })
      .eq('id', intakeId)
      .select('case_id, email, answers')
      .maybeSingle();
    if (error) return { ok: false, message: error.message };

    // Orders page the prescriber the moment they land. A standalone assessment
    // used to drop into his queue silently, so it sat until he happened to log in.
    await notifyDoctorOfIntake(db, intake);

    return {
      ok: true,
      message: 'Approved. The prescriber has been notified.',
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
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
      .select('email, answers')
      .maybeSingle();
    if (error) return { ok: false, message: error.message };

    // Asking for information nobody is told about is just a stalled case.
    const sent = await notifyNeedsInfo(intake, input.note.trim());
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

/* -------------------------------------------------------------------------- */
/*  Physician actions                                                         */
/* -------------------------------------------------------------------------- */

async function doctorGuard(): Promise<ClinicalResult | null> {
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Connect Supabase to sign prescriptions.' };
  }
  const session = await getSession();
  if (!session || session.role !== 'doctor') {
    return { ok: false, message: 'Physician access is required.' };
  }
  return null;
}

export interface RxItem {
  name: string;
  dose: string;
}

/**
 * Sign a prescription off an approved intake. Creates the `prescriptions` row
 * — which is what flows into the admin's fulfillment queue.
 */
export async function signPrescription(input: {
  intakeId: string;
  protocolName: string;
  items: RxItem[];
  note?: string;
}): Promise<ClinicalResult> {
  const blocked = await doctorGuard();
  if (blocked) return blocked;

  if (!input.protocolName.trim()) {
    return { ok: false, message: 'Enter a protocol name.' };
  }
  const items = input.items.filter((i) => i.name.trim());
  if (items.length === 0) {
    return { ok: false, message: 'Add at least one prescription item.' };
  }

  try {
    const session = await getSession();
    const db = createSupabaseAdminClient();

    const { data: intake } = await db
      .from('intake_submissions')
      .select('user_id')
      .eq('id', input.intakeId)
      .maybeSingle();
    if (!intake?.user_id) {
      return {
        ok: false,
        message: 'This intake has no linked patient account yet.',
      };
    }

    const { error } = await db.from('prescriptions').insert({
      user_id: intake.user_id,
      intake_id: input.intakeId,
      doctor_id: session?.id ?? null,
      protocol_name: input.protocolName.trim(),
      items: items as unknown as Json,
      status: 'signed',
      signed_at: new Date().toISOString(),
      notes: input.note?.trim() || null,
    });
    if (error) return { ok: false, message: error.message };

    return {
      ok: true,
      message: 'Prescription signed. It is now ready for fulfillment.',
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}


/**
 * Tell the member their visit was declined.
 *
 * The clinical note is written for the chart, not for the patient, so it is
 * deliberately not forwarded — the email says a prescriber decided against it
 * and that nothing was charged, and invites them to reply.
 */
function firstNameOf(answers: unknown): string {
  const a = (answers ?? {}) as Record<string, unknown>;
  return (typeof a.first_name === 'string' && a.first_name.trim()) || 'there';
}

function fullNameOf(answers: unknown): string {
  const a = (answers ?? {}) as Record<string, unknown>;
  const first = typeof a.first_name === 'string' ? a.first_name.trim() : '';
  const last = typeof a.last_name === 'string' ? a.last_name.trim() : '';
  return [first, last].filter(Boolean).join(' ') || 'A member';
}

/** Emails the member what admin needs. Returns whether it actually went. */
async function notifyNeedsInfo(
  intake: { email?: string | null; answers?: unknown } | null,
  note: string,
): Promise<boolean> {
  const email = intake?.email;
  if (!email) return false;
  const msg = intakeNeedsInfoEmail({
    firstName: firstNameOf(intake?.answers),
    note,
    portalUrl: `${SITE_URL}/portal`,
  });
  try {
    const res = await sendEmail({ to: email, subject: msg.subject, html: msg.html });
    return res.ok;
  } catch {
    return false;
  }
}

/** Email and text every active prescriber that an assessment cleared triage. */
async function notifyDoctorOfIntake(
  db: ReturnType<typeof createSupabaseAdminClient>,
  intake: { case_id?: string | null; answers?: unknown } | null,
): Promise<void> {
  const memberName = fullNameOf(intake?.answers);
  const caseId = intake?.case_id ?? '—';
  const { data: doctors } = await db
    .from('profiles')
    .select('full_name, email, phone')
    .eq('role', 'doctor')
    .eq('account_status', 'active');

  for (const doc of doctors ?? []) {
    const firstName = (doc.full_name ?? '').trim().split(/\s+/).slice(-1)[0] || 'Doctor';
    if (doc.email) {
      const msg = newIntakeForDoctorEmail({
        firstName,
        memberName,
        caseId,
        queueUrl: `${SITE_URL}/portal/doctor`,
      });
      try {
        await sendEmail({ to: doc.email, subject: msg.subject, html: msg.html });
      } catch {
        // A failed notification must not roll back the approval.
      }
    }
    if (doc.phone) {
      try {
        await sendSms(
          doc.phone,
          `Eternal Longevity: assessment ready to sign — ${memberName}, case ${caseId}. ${SITE_URL}/portal/doctor`,
        );
      } catch {
        // Same.
      }
    }
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

async function notifyDeclined(
  intake: { email?: string | null; answers?: unknown } | null,
  _clinicalNote: string,
): Promise<void> {
  const email = intake?.email;
  if (!email) return;
  const msg = declinedEmail({ firstName: firstNameOf(intake?.answers) });
  try {
    await sendEmail({ to: email, subject: msg.subject, html: msg.html });
  } catch {
    // A failed notification must not roll back the clinical decision.
  }
}

/** A physician declines an approved intake on clinical grounds. */
export async function declineClinically(input: {
  intakeId: string;
  note: string;
}): Promise<ClinicalResult> {
  const blocked = await doctorGuard();
  if (blocked) return blocked;
  if (!input.note.trim()) {
    return { ok: false, message: 'Add a clinical reason.' };
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
    await notifyDeclined(intake, input.note);
    return { ok: true, message: 'Intake declined on clinical review.' };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}
