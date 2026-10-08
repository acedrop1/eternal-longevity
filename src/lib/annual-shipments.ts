import 'server-only';

/**
 * The second box of a 12-month plan.
 *
 * A 12-month plan is billed once and shipped in two 6-month boxes. Box 1 goes
 * with the charge (first order or renewal); billing it sets
 * subscriptions.next_shipment_date six months out, and next_shipment_order_id
 * to the order that paid for the year (lib/refills, migration 0028).
 *
 * When that date comes, the daily cron (/api/cron/annual-shipments) makes box
 * 2 a real order, the way a renewal does, but uncharged: a $0 paid order that
 * flows through the pharmacy submission, the board, tracking and the shipped
 * email exactly like any other. Same checks as a renewal: the plan is active,
 * the prescription is in date with a refill left, the product is still sold,
 * there is an address we ship to. If not, nothing ships and admin is told.
 *
 * Once a year: the date is claimed (set to null, conditional on its value)
 * before the order exists, so overlapping runs create one box.
 */

import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import type { Json } from '@/lib/database.types';
import { autoSubmitToPharmacy } from '@/lib/auto-pharmacy';
import { getLiveProduct } from '@/lib/catalog';
import { nextOrderNumber } from '@/lib/order-number';
import { TERMINAL_ORDER, rxCovers } from '@/lib/order-rules';
import { snapshotOrderCosts } from '@/lib/profit-data';
import { shipToFor } from '@/lib/refills';

export type BoxPlan = 'wait' | 'ship' | 'review' | 'drop';

/**
 * What to do with an owed box today. Pure, for checks.
 *   wait    not due, the year's charge not landed yet, or paused by the member
 *   drop    the order that was to pay for the year closed unpaid: nothing owed
 *   review  owed, but the plan is not active or the prescription/product lapsed
 *   ship    send it
 */
export function planSecondBox(input: {
  due: string | null;
  today: string;
  /** The paying order: paid, still waiting, or closed (cancelled/refunded/declined). */
  payment: 'paid' | 'unpaid' | 'closed';
  subStatus: string;
  /** Prescription in date with a refill left, product still sold, an address we ship to. */
  canShip: boolean;
}): BoxPlan {
  if (!input.due || input.due > input.today) return 'wait';
  if (input.payment === 'closed') return 'drop';
  if (input.payment === 'unpaid' || input.subStatus === 'paused') return 'wait';
  if (input.subStatus !== 'active' || !input.canShip) return 'review';
  return 'ship';
}

export interface BoxOutcome {
  subscriptionId: string;
  result: BoxPlan | 'error';
  orderNumber?: string;
  detail?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Plans with a box due today or earlier. */
export async function dueSecondBoxIds(limit = 200): Promise<string[]> {
  if (!supabaseAdminConfigured()) return [];
  const { data } = await createSupabaseAdminClient()
    .from('subscriptions')
    .select('id')
    .not('next_shipment_date', 'is', null)
    .lte('next_shipment_date', today())
    .limit(limit);
  return (data ?? []).map((r) => r.id);
}

export async function shipSecondBox(subscriptionId: string): Promise<BoxOutcome> {
  const db = createSupabaseAdminClient();
  const { data: sub } = await db
    .from('subscriptions')
    .select('id, user_id, product_id, product_name, status, prescription_id, next_shipment_date, next_shipment_order_id')
    .eq('id', subscriptionId)
    .maybeSingle();
  if (!sub) return { subscriptionId, result: 'error', detail: 'not_found' };

  const [{ data: paidBy }, { data: rx }, product, address] = await Promise.all([
    sub.next_shipment_order_id
      ? db.from('orders').select('status, paid_confirmed_at').eq('id', sub.next_shipment_order_id).maybeSingle()
      : Promise.resolve({ data: null }),
    sub.prescription_id
      ? db.from('prescriptions').select('id, expires_at, refills_remaining').eq('id', sub.prescription_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getLiveProduct(String(sub.product_id)),
    shipToFor(sub.user_id),
  ]);

  const now = today();
  const payment = paidBy?.paid_confirmed_at
    ? 'paid'
    : // No paying order on record (deleted): treat as closed, a person decides.
      !paidBy || TERMINAL_ORDER.includes(paidBy.status)
      ? 'closed'
      : 'unpaid';
  const canShip = rxCovers(rx, now) && Boolean(product) && Boolean(address.shipTo);
  const plan = planSecondBox({ due: sub.next_shipment_date, today: now, payment, subStatus: sub.status, canShip });
  if (plan === 'wait') return { subscriptionId, result: 'wait', detail: payment === 'unpaid' ? 'year_unpaid' : sub.status };

  // Claim the box: whoever clears the date is the one run that acts on it.
  const { data: claimed } = await db
    .from('subscriptions')
    .update({ next_shipment_date: null })
    .eq('id', sub.id)
    .eq('next_shipment_date', sub.next_shipment_date!)
    .select('id');
  if (!claimed?.length) return { subscriptionId, result: 'error', detail: 'already_claimed' };

  if (plan === 'drop') return { subscriptionId, result: 'drop', detail: 'year_never_paid' };

  if (plan === 'review') {
    // Paid for, but can't ship: a person decides (renew the prescription and ship by hand, or refund).
    const why =
      sub.status !== 'active'
        ? `plan ${sub.status.replace('_', ' ')}`
        : !rxCovers(rx, now)
          ? 'prescription expired or out of refills'
          : !product
            ? 'product no longer sold'
            : 'no address in a state we serve';
    if (sub.status === 'active') await db.from('subscriptions').update({ status: 'pending_review' }).eq('id', sub.id);
    return { subscriptionId, result: 'review', detail: `${why}. Box 2 of a paid year did not ship: renew and ship by hand, or refund.` };
  }

  const { data: profile } = await db.from('profiles').select('email, full_name').eq('id', sub.user_id).maybeSingle();
  const orderNumber = await nextOrderNumber();
  const at = new Date().toISOString();
  const { data: order, error } = await db
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: sub.user_id,
      // Already approved and already paid for with the year: nothing to charge.
      status: 'paid',
      member_name: profile?.full_name ?? null,
      member_email: profile?.email ?? null,
      ship_state: address.shipState,
      subtotal_cents: 0,
      shipping_cents: 0,
      tax_cents: 0,
      total_cents: 0,
      shipping_address: address.shipTo as unknown as Json,
      card_last4: address.cardLast4,
      paid_at: at,
      paid_confirmed_at: at,
    })
    .select('id')
    .single();
  if (error || !order) {
    // Put the box back so tomorrow's run tries again.
    await db.from('subscriptions').update({ next_shipment_date: sub.next_shipment_date }).eq('id', sub.id);
    return { subscriptionId, result: 'error', detail: error?.message ?? 'order_insert_failed' };
  }

  await db.from('order_items').insert({
    order_id: order.id,
    product_id: String(sub.product_id),
    product_name: sub.product_name,
    quantity: 1,
    unit_price_cents: 0,
    // 'annual' whatever the plan is now: the pharmacy is sent a 6-month box.
    cadence: 'annual',
    cadence_label: '12-month',
  });

  await Promise.all([
    db.from('prescriptions').update({ refills_remaining: (rx!.refills_remaining ?? 1) - 1 }).eq('id', rx!.id),
    db.from('order_updates').insert({
      order_id: order.id,
      label: 'Second box of your 12-month plan',
      body: 'Already paid for with your year, so nothing was charged. It’s being sent to the pharmacy now, and you’ll get tracking when it ships.',
      author: 'System',
      author_role: 'system',
    }),
    // Profit: box 2 costs product and shipping with no revenue of its own.
    snapshotOrderCosts(db, order.id),
  ]);

  await autoSubmitToPharmacy(orderNumber, { refill: true, prescriptionId: rx!.id });
  return { subscriptionId, result: 'ship', orderNumber };
}
