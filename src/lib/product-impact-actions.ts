'use server';

import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

/**
 * What pulling a product off sale would strand: orders waiting on the
 * prescriber (he cannot sign them once it is not live) and plans renewing on
 * it. Admin only; counts, nothing else.
 */
export async function productImpactAction(
  productId: string,
): Promise<{ waiting: number; plans: number } | null> {
  const user = await getSession();
  if (!user || user.role !== 'admin' || !supabaseAdminConfigured()) return null;
  if (typeof productId !== 'string' || !productId) return null;
  const db = createSupabaseAdminClient();
  const [waiting, plans] = await Promise.all([
    db
      .from('order_items')
      .select('order_id, orders!inner(status)', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('orders.status', 'assigned'),
    db
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('status', 'active'),
  ]);
  if (waiting.error || plans.error) return null;
  return { waiting: waiting.count ?? 0, plans: plans.count ?? 0 };
}
