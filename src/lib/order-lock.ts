import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/*
 * One checkout at a time per member. order_items holds the product, so the
 * database cannot index "one open order per product" directly; instead
 * placeOrderAction claims profiles.placing_order_at (migration 0024) with a
 * single conditional UPDATE. A double submit's second request matches no row
 * and stops; once the first finishes, heldProducts sees its order.
 *
 * ponytail: a claim left by a crashed request expires after STALE_SECONDS.
 */
const STALE_SECONDS = 60;

type Db = Pick<ReturnType<typeof createSupabaseAdminClient>, 'from'>;

/** True when this request holds the member's checkout. */
export async function claimCheckout(db: Db, userId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - STALE_SECONDS * 1000).toISOString();
  const { data, error } = await db
    .from('profiles')
    // Column from 0024, not yet in database.types.
    .update({ placing_order_at: new Date().toISOString() } as never)
    .eq('id', userId)
    .or(`placing_order_at.is.null,placing_order_at.lt."${cutoff}"`)
    .select('id');
  if (error) {
    // Migration not applied yet: don't stop every checkout over a missing column.
    console.error('[order-lock] claim failed:', error.message);
    return true;
  }
  return (data?.length ?? 0) > 0;
}

export async function releaseCheckout(db: Db, userId: string): Promise<void> {
  await db.from('profiles').update({ placing_order_at: null } as never).eq('id', userId);
}
