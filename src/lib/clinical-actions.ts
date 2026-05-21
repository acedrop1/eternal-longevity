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
    const { error } = await db
      .from('intake_submissions')
      .update({ status: 'approved' })
      .eq('id', intakeId);
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      message: 'Approved. It is now in the physician queue.',
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
    const { error } = await db
      .from('intake_submissions')
      .update({ status: 'needs_info', review_notes: input.note.trim() })
      .eq('id', input.intakeId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Marked as needing more information.' };
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
    const { error } = await db
      .from('intake_submissions')
      .update({ status: 'declined', review_notes: input.note.trim() })
      .eq('id', input.intakeId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Intake declined.' };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}
