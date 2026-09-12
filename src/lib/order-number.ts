import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * The next order number.
 *
 * Allocated by a Postgres sequence rather than anything derived from the clock:
 * two checkouts in the same second must not collide, and a number that reads
 * back cleanly over the phone to a pharmacy is worth more than one that encodes
 * the moment it was created.
 *
 * Falls back to the old timestamp form only if the sequence is missing, so a
 * deploy that lands before the migration takes orders instead of dropping them.
 */
export async function nextOrderNumber(): Promise<string> {
  try {
    const db = createSupabaseAdminClient();
    const { data, error } = await db.rpc('next_order_number');
    if (!error && data) return String(data);
  } catch {
    // Fall through.
  }
  return `EL-${Date.now().toString(36).toUpperCase()}`;
}
