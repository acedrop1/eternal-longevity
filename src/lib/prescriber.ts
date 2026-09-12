import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import type { PrescriberRecord } from '@/lib/prescriberTypes';

export { CREDENTIALS } from '@/lib/prescriberTypes';
export type { PrescriberRecord } from '@/lib/prescriberTypes';

const EMPTY: PrescriberRecord = {
  id: null,
  name: '',
  credential: '',
  display: '',
  npi: '',
  licenseState: '',
  licenseNumber: '',
  licenseExpires: '',
  email: '',
  phone: '',
};

/**
 * The prescriber of record, from the database.
 *
 * His credential used to live inside `full_name` and his state licence was a
 * constant in a page file, so correcting either meant a deploy — and the legal
 * pages quoting them could drift from the profile without anyone noticing. One
 * row now feeds the portal, the prescription and the published policies.
 */
export async function getPrescriber(
  doctorId?: string,
): Promise<PrescriberRecord> {
  if (!supabaseAdminConfigured()) return EMPTY;
  try {
    const db = createSupabaseAdminClient();
    const q = db
      .from('profiles')
      .select(
        'id, full_name, credential, npi, license_state, license_number, license_expires, email, phone',
      );
    const { data } = doctorId
      ? await q.eq('id', doctorId).maybeSingle()
      : await q
          .eq('role', 'doctor')
          .eq('account_status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
    if (!data) return EMPTY;

    /*
     * Historically the credential was typed into the name ("Bader Elder, MD").
     * Strip it so the two never render twice, and fall back to it while the
     * credential column is still empty.
     */
    const raw = (data.full_name ?? '').trim();
    const suffixed = raw.match(/^(.*?),\s*([A-Za-z.]{2,7})$/);
    const name = suffixed ? suffixed[1].trim() : raw;
    const credential = (data.credential ?? suffixed?.[2] ?? '').trim();

    return {
      id: data.id,
      name,
      credential,
      display: credential ? `${name}, ${credential}` : name,
      npi: data.npi ?? '',
      licenseState: data.license_state ?? '',
      licenseNumber: data.license_number ?? '',
      licenseExpires: data.license_expires ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
    };
  } catch {
    return EMPTY;
  }
}

/** Append-only. Nothing in the app updates or deletes an audit row. */
export async function recordAudit(
  entries: {
    actorId: string | null;
    actorName: string;
    actorRole: string;
    entity: string;
    entityId: string | null;
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }[],
): Promise<void> {
  const changed = entries.filter((e) => (e.oldValue ?? '') !== (e.newValue ?? ''));
  if (!changed.length || !supabaseAdminConfigured()) return;
  try {
    const db = createSupabaseAdminClient();
    await db.from('audit_log').insert(
      changed.map((e) => ({
        actor_id: e.actorId,
        actor_name: e.actorName,
        actor_role: e.actorRole,
        entity: e.entity,
        entity_id: e.entityId,
        field: e.field,
        old_value: e.oldValue,
        new_value: e.newValue,
      })),
    );
  } catch {
    // A failed audit write must not roll back the change it describes; the
    // gap is visible in the trail, which is itself the signal.
  }
}

export interface AuditEntry {
  at: string;
  actor: string;
  role: string;
  entity: string;
  field: string;
  from: string;
  to: string;
}

export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  if (!supabaseAdminConfigured()) return [];
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from('audit_log')
      .select('created_at, actor_name, actor_role, entity, field, old_value, new_value')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      at: r.created_at,
      actor: r.actor_name,
      role: r.actor_role,
      entity: r.entity,
      field: r.field,
      from: r.old_value ?? '—',
      to: r.new_value ?? '—',
    }));
  } catch {
    return [];
  }
}
