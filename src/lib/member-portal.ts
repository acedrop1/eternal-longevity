import 'server-only';

/**
 * Member-portal loaders shared by Home, Treatments and the shell. Reads only,
 * as the member (RLS). Dev samples stand in when there is no database.
 */

import type { Subscription } from '@/components/portal/SubscriptionsManager';
import type { PlanKey } from '@/lib/subscriptions-db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';
import { getLiveProducts } from '@/lib/catalog';
import { paymentsOwed } from '@/lib/refills';
import { cadenceTiersForProduct } from '@/lib/shopProducts';
import { perCycleCents } from '@/lib/order-rules';
import { getShippingSettings } from '@/lib/shipping-settings';
import { repliesWaiting } from '@/lib/member-view';
import { memberSamples, SAMPLE_PLANS, SAMPLE_THREADS } from '@/lib/dev-member-samples';

/** The member's real subscriptions. Empty until they have one. */
export async function loadSubscriptions(userId: string): Promise<Subscription[]> {
  if (memberSamples) return SAMPLE_PLANS;
  if (!supabaseConfigured) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const live = new Map((await getLiveProducts()).map((p) => [p.id, p]));
  const ship = (await getShippingSettings()).pricePerShipment;
  // Plans paused by a declined refill read as that, not as a pause the member chose.
  const declined = new Set(
    (await paymentsOwed(userId).catch(() => [])).filter((o) => o.refill).map((o) => o.productId),
  );
  return data.map((r) => {
    const product = live.get(r.product_id);
    return {
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      cycleLabel: product?.cycleLength ?? '',
      cadenceLabel: r.cadence_label ?? '',
      perMonth: Math.round((r.per_cycle_cents ?? 0) / 100),
      nextShipmentIso: r.next_shipment_date ? String(r.next_shipment_date).slice(0, 10) : null,
      nextBillingIso: r.next_billing_date ? String(r.next_billing_date).slice(0, 10) : null,
      nextBillingDate: r.next_billing_date
        ? new Date(r.next_billing_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '—',
      status: r.status === 'pending_review' ? 'pending-review' : r.status,
      image: product?.image ?? '/images/9.jpg',
      swatch: product?.swatch ?? '#1a1a1a',
      declined: r.status === 'paused' && declined.has(String(r.product_id)),
      // The plans changeSubscriptionPlanAction can switch to, at the renewal
      // price: the plan plus shipping on every box in the cycle.
      tiers: product
        ? cadenceTiersForProduct(product, ship).map((t) => ({
            key: t.key as PlanKey,
            label: t.label,
            perCycle: perCycleCents(t.total, t.key, ship) / 100,
          }))
        : [],
    } as Subscription;
  });
}

/**
 * Threads where the care team spoke last (the Messages dot). One small query
 * on the member's own newest messages; quiet threads past 30 messages of the
 * other one are not counted.
 */
export async function memberRepliesWaiting(userId: string): Promise<Set<string>> {
  if (memberSamples) {
    return repliesWaiting(
      (['doctor', 'support'] as const).flatMap((channel) =>
        SAMPLE_THREADS[channel].slice(-1).map((m) => ({ channel, fromMember: m.senderRole === 'member' })),
      ),
    );
  }
  if (!supabaseConfigured) return new Set();
  try {
    const db = await createSupabaseServerClient();
    const { data } = await db
      .from('messages')
      .select('channel, sender_id')
      .eq('thread_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    return repliesWaiting((data ?? []).map((m) => ({ channel: m.channel, fromMember: m.sender_id === userId })));
  } catch {
    return new Set();
  }
}
