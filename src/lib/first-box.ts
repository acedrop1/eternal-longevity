import 'server-only';

/**
 * Whether a member's next order ships its first box free. Checkout shows it
 * and placeOrder charges it, both through here, so the two agree.
 *
 * Free when the setting is on, the member has never had an order paid, and no
 * order of theirs still open (unpaid, not closed) already took the free box.
 * The last part stops two orders placed before either is paid from both
 * shipping free. placeOrder runs under the per-member checkout lock, so two
 * checkouts can't both see "none yet".
 */

import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { getShippingSettings, isFirstPaidOrder } from '@/lib/shipping-settings';
import { TERMINAL_ORDER } from '@/lib/order-rules';

/** Timeline label on the order that took the free box (orders-db placeOrder). */
export const FIRST_BOX_FREE = 'First box ships free';

export async function firstBoxFree(userId: string): Promise<boolean> {
  if (!(await getShippingSettings()).firstOrderFree) return false;
  if (!(await isFirstPaidOrder(userId))) return false;
  if (!supabaseAdminConfigured()) return true;
  const db = createSupabaseAdminClient();
  const { data: open, error } = await db
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .is('paid_confirmed_at', null)
    .not('status', 'in', `(${TERMINAL_ORDER.join(',')})`);
  // Unknown: charge shipping rather than give the box away twice.
  if (error) return false;
  if (!open?.length) return true;
  const { count, error: e2 } = await db
    .from('order_updates')
    .select('id', { count: 'exact', head: true })
    .in('order_id', open.map((o) => o.id))
    .eq('label', FIRST_BOX_FREE);
  if (e2) return false;
  return (count ?? 0) === 0;
}
