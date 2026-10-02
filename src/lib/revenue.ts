import 'server-only';
import type { createSupabaseAdminClient } from '@/lib/supabase/admin';

/*
 * Revenue, one definition for Overview, Billing and the daily report. Money
 * counts when it landed: `paid_confirmed_at`, which the Stripe webhook writes
 * and a full refund clears. Not an order status, and not the prescriber's
 * signature.
 */

type Db = ReturnType<typeof createSupabaseAdminClient>;

/** Paid orders and what they took, all time or since `since` (ISO). */
export async function paidRevenue(db: Db, since?: string): Promise<{ orders: number; cents: number }> {
  // ponytail: sums in the app, so it sees at most PostgREST's 1000-row cap;
  // move to a SQL sum (RPC) once paid orders pass that. Partial refunds are not netted.
  let q = db.from('orders').select('total_cents').not('paid_confirmed_at', 'is', null);
  if (since) q = q.gte('paid_confirmed_at', since);
  const { data, error } = await q;
  if (error) {
    console.error('[revenue] paid orders query failed:', error.message);
    return { orders: 0, cents: 0 };
  }
  return {
    orders: data.length,
    cents: data.reduce((sum, o) => sum + (Number(o.total_cents) || 0), 0),
  };
}

/** Active plans normalised to a month, in cents. */
export function monthlyRecurringCents(subs: { per_cycle_cents: number | null; cadence_label: string | null }[]): number {
  return Math.round(
    subs.reduce((sum, s) => {
      const cents = s.per_cycle_cents ?? 0;
      const label = (s.cadence_label ?? '').toLowerCase();
      const months = label.includes('quarter') ? 3 : label.startsWith('6') ? 6 : label.includes('annual') ? 12 : 1;
      return sum + cents / months;
    }, 0),
  );
}
