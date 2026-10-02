import 'server-only';
import { heldProducts, type Held } from '@/lib/purchase-rules';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

/** What this member already has, by product (lib/purchase-rules). Empty in local demo. */
export async function heldProductsFor(userId: string): Promise<Map<string, Held>> {
  if (!supabaseAdminConfigured()) return new Map();
  const db = createSupabaseAdminClient();
  const [orders, plans] = await Promise.all([
    db.from('orders').select('id, status').eq('user_id', userId),
    db.from('subscriptions').select('status, product_id').eq('user_id', userId),
  ]);
  const ids = (orders.data ?? []).map((o) => o.id);
  const { data: items } = ids.length
    ? await db.from('order_items').select('order_id, product_id').in('order_id', ids)
    : { data: [] };
  return heldProducts(
    (orders.data ?? []).map((o) => ({
      status: o.status,
      productIds: (items ?? []).filter((i) => i.order_id === o.id).map((i) => i.product_id),
    })),
    (plans.data ?? []).map((p) => ({ status: p.status, productId: p.product_id })),
  );
}
