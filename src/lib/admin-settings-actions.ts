'use server';

/**
 * Admin settings actions.
 *
 * Most settings (service keys, notification inboxes) live in environment
 * variables and are shown read-only. The prescriber on file is the one piece
 * the admin edits in-app — it flows onto every order sent to the pharmacy.
 */
import { getSession } from './auth-server';
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
  npi: string;
}): Promise<SettingsResult> {
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Connect Supabase to save settings.' };
  }
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { ok: false, message: 'Admin access is required.' };
  }

  const npi = input.npi.trim();
  if (npi && !/^\d{10}$/.test(npi)) {
    return { ok: false, message: 'An NPI is exactly 10 digits.' };
  }
  if (!input.doctorId) {
    return { ok: false, message: 'No prescriber account on file to update.' };
  }

  try {
    const db = createSupabaseAdminClient();
    const { error } = await db
      .from('profiles')
      .update({ full_name: input.name.trim() || null, npi: npi || null })
      .eq('id', input.doctorId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Prescriber details saved.' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not save.',
    };
  }
}
