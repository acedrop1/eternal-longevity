import 'server-only';

/*
 * Not a server action. This lived in promo-db.ts, whose 'use server' directive
 * published "spend a redemption of this code" as a public endpoint.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Claim one redemption of a code. Called from placeOrderAction before the
 * order is written, so a code at its limit is refused rather than applied.
 *
 * The increment is a compare-and-swap on the count just read: two checkouts
 * racing for the last redemption both read n, only one update still matches n,
 * and the loser re-reads and finds the code spent.
 */
export async function redeemPromo(code: string): Promise<boolean> {
  const db = createSupabaseAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: p } = await db
      .from('promo_codes')
      .select('id, redeemed_count, max_redemptions, active, expires_at')
      .eq('code', code.toUpperCase())
      .maybeSingle();
    if (!p || !p.active) return false;
    if (p.expires_at && new Date(p.expires_at).getTime() < Date.now()) return false;
    if (p.max_redemptions !== null && p.redeemed_count >= p.max_redemptions) {
      return false;
    }
    const { data } = await db
      .from('promo_codes')
      .update({ redeemed_count: p.redeemed_count + 1 })
      .eq('id', p.id)
      .eq('redeemed_count', p.redeemed_count)
      .select('id');
    if (data?.length) return true;
  }
  return false;
}
