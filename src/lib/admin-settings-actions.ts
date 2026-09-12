'use server';

/**
 * Admin settings actions.
 *
 * Most settings (service keys, notification inboxes) live in environment
 * variables and are shown read-only. The prescriber on file is the one piece
 * the admin edits in-app — it flows onto every order sent to the pharmacy.
 */
import { revalidatePath } from 'next/cache';
import { getSession } from './auth-server';
import { CREDENTIALS, getPrescriber, recordAudit } from './prescriber';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from './supabase/admin';

export interface SettingsResult {
  ok: boolean;
  message: string;
}

/** Update the prescriber's name + NPI on their profile. */
export async function adminSavePrescriber(input: {
  doctorId: string;
  name: string;
  credential: string;
  npi: string;
  licenseState: string;
  licenseNumber: string;
  licenseExpires: string;
}): Promise<SettingsResult> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { ok: false, message: 'Admin access is required.' };
  }
  return savePrescriberFields(input, session.id, session.name, 'admin');
}

/**
 * The prescriber editing his own record.
 *
 * His credential and licence were a page constant and a suffix typed into his
 * name, so correcting "MD" to "DO" meant a deploy. He owns these facts; he
 * should be able to fix them. Every change is written to the audit trail
 * whoever makes it.
 */
export async function doctorSaveOwnDetails(input: {
  name: string;
  credential: string;
  npi: string;
  licenseState: string;
  licenseNumber: string;
  licenseExpires: string;
  phone: string;
}): Promise<SettingsResult> {
  const session = await getSession();
  if (!session || session.role !== 'doctor') {
    return { ok: false, message: 'Prescriber access is required.' };
  }
  return savePrescriberFields(
    { ...input, doctorId: session.id },
    session.id,
    session.name,
    'doctor',
  );
}

async function savePrescriberFields(
  input: {
    doctorId: string;
    name: string;
    credential: string;
    npi: string;
    licenseState: string;
    licenseNumber: string;
    licenseExpires: string;
    phone?: string;
  },
  actorId: string,
  actorName: string,
  actorRole: string,
): Promise<SettingsResult> {
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Connect Supabase to save settings.' };
  }
  if (!input.doctorId) {
    return { ok: false, message: 'No prescriber account on file to update.' };
  }

  const npi = input.npi.trim();
  if (npi && !/^\d{10}$/.test(npi)) {
    return { ok: false, message: 'An NPI is exactly 10 digits.' };
  }
  const credential = input.credential.trim().toUpperCase();
  if (credential && !CREDENTIALS.includes(credential as never)) {
    return {
      ok: false,
      message: `Credential must be one of ${CREDENTIALS.join(', ')}.`,
    };
  }
  const state = input.licenseState.trim().toUpperCase();
  if (state && state.length !== 2) {
    return { ok: false, message: 'Use the two-letter state code.' };
  }

  try {
    const db = createSupabaseAdminClient();
    const before = await getPrescriber(input.doctorId);

    const next = {
      full_name: input.name.trim() || null,
      credential: credential || null,
      npi: npi || null,
      license_state: state || null,
      license_number: input.licenseNumber.trim() || null,
      license_expires: input.licenseExpires.trim() || null,
      ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
    };

    const { error } = await db
      .from('profiles')
      .update(next)
      .eq('id', input.doctorId);
    if (error) return { ok: false, message: error.message };

    /*
     * These are the facts a board or a certifier asks you to evidence, and they
     * print on every prescription. A change to one without a record of who made
     * it is the gap an audit is looking for.
     */
    await recordAudit(
      [
        ['Name', before.name, input.name.trim()],
        ['Credential', before.credential, credential],
        ['NPI', before.npi, npi],
        ['Licence state', before.licenseState, state],
        ['Licence number', before.licenseNumber, input.licenseNumber.trim()],
        ['Licence expiry', before.licenseExpires, input.licenseExpires.trim()],
      ].map(([field, oldValue, newValue]) => ({
        actorId,
        actorName,
        actorRole,
        entity: 'prescriber',
        entityId: input.doctorId,
        field: field as string,
        oldValue: (oldValue as string) || null,
        newValue: (newValue as string) || null,
      })),
    );

    revalidatePath('/portal/admin/settings');
    revalidatePath('/portal/doctor/profile');
    return { ok: true, message: 'Saved.' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not save.',
    };
  }
}
