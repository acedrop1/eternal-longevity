import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Which prescriber takes this order.
 *
 * Medicine is practiced where the patient is, so the licence decides — not
 * whoever happens to hold the doctor role. With one prescriber in one state
 * that is a formality; with a contracted network it is the whole problem, and
 * it is the same code either way.
 *
 * Until a licence state is recorded against anybody, this falls back to the
 * single active prescriber and says so on the order, so recording licences
 * turns real routing on rather than being the thing that first makes orders
 * work.
 */
export interface Routed {
  id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  /** Set when the choice was not made on a licence. */
  caveat?: string;
}

export async function prescriberForState(state: string): Promise<Routed | null> {
  const db = createSupabaseAdminClient();
  const { data: doctors } = await db
    .from('profiles')
    .select('id, full_name, email, phone, license_state')
    .eq('role', 'doctor')
    .eq('account_status', 'active');

  const roster = doctors ?? [];
  if (!roster.length) return null;

  const want = (state || '').trim().toUpperCase();
  const licensed = roster.filter(
    (d) => (d.license_state ?? '').trim().toUpperCase() === want,
  );

  if (licensed.length) {
    // ponytail: first match wins. Add load balancing when a state has several.
    const d = licensed[0];
    return { id: d.id, name: d.full_name, email: d.email, phone: d.phone };
  }

  // Nobody is recorded as licensed anywhere yet — the pre-licence state of the
  // world, not a routing failure.
  const anyLicence = roster.some((d) => (d.license_state ?? '').trim());
  if (!anyLicence && roster.length === 1) {
    const d = roster[0];
    return {
      id: d.id,
      name: d.full_name,
      email: d.email,
      phone: d.phone,
      caveat: `Assigned without a licence check — no licence state is on file for the prescriber. Record it in Admin → Settings.`,
    };
  }

  return null;
}
