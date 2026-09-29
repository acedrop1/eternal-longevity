import 'server-only';
import { getCatalogProduct } from '@/lib/catalog';
import type { IntakeProduct } from '@/lib/intakeSchema';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

/** Orders the prescriber has not decided yet. */
const OPEN_ORDER_STATUSES = ['pending', 'pending-admin', 'assigned'] as const;

/**
 * The products a member's visit covers, primary first, without repeats:
 * the product their intake started from, any `extra` ids (the page's
 * ?product= param, or what the wizard says it showed), their undecided orders,
 * then their cart. The page and submitVisitAction both call this, so the
 * server requires at least the questions the member was shown. `extra` can
 * only add products (more questions), never remove the ones found here.
 */
export async function visitProducts(userId: string, extra: unknown[] = []): Promise<IntakeProduct[]> {
  const ids: unknown[] = [];
  if (supabaseAdminConfigured()) {
    const db = createSupabaseAdminClient();
    const [intake, orders, profile] = await Promise.all([
      db
        .from('intake_submissions')
        .select('answers')
        .eq('user_id', userId)
        .eq('status', 'awaiting_visit')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from('orders').select('id').eq('user_id', userId).in('status', [...OPEN_ORDER_STATUSES]),
      db.from('profiles').select('cart').eq('id', userId).maybeSingle(),
    ]);
    ids.push((intake.data?.answers as Record<string, unknown> | null)?.requestedProductId);
    ids.push(...extra);
    const orderIds = (orders.data ?? []).map((o) => o.id);
    if (orderIds.length) {
      const { data: items } = await db.from('order_items').select('product_id').in('order_id', orderIds);
      ids.push(...(items ?? []).map((i) => i.product_id));
    }
    const cart = profile.data?.cart;
    if (Array.isArray(cart)) ids.push(...cart.map((c) => (c as { productId?: unknown })?.productId));
  } else {
    ids.push(...extra);
  }

  const unique = [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length < 100))];
  const found = await Promise.all(unique.slice(0, 10).map((id) => getCatalogProduct(id)));
  return found
    .filter((p) => p !== null)
    .map((p) => ({ id: p.id, name: p.name, contraindications: p.contraindications }));
}
