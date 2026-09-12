import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import type { Json } from '@/lib/database.types';
import { getStripe } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/billing';
import { defaultCardFor } from '@/lib/pay-on-approval';
import { autoSubmitToPharmacy } from '@/lib/auto-pharmacy';
import { planNeedsReviewEmail, sendEmail } from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import { nextOrderNumber } from '@/lib/order-number';

/**
 * How long a prescription written here stays good for.
 *
 * Twelve months is the usual ceiling for a non-controlled prescription. It is a
 * clinical and legal parameter, not a product decision — Dr. Elder owns the
 * number, and changing it here changes it everywhere.
 */
export const PRESCRIPTION_MONTHS = 12;

/** Refills a cadence earns inside one prescription, after the first shipment. */
function refillsFor(cadence: string): number {
  if (cadence === 'monthly') return PRESCRIPTION_MONTHS - 1;
  if (cadence === 'quarterly') return Math.floor(PRESCRIPTION_MONTHS / 3) - 1;
  return 0; // one-time: dispensed once, nothing recurring
}

/** Months between shipments. */
export function monthsPerCycle(cadence: string): number {
  return cadence === 'quarterly' ? 3 : 1;
}

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Write the prescription a signed order represents, and start the plan it was
 * bought on.
 *
 * Before this, signing an order charged the card and sent the pharmacy a
 * fulfilment record, but never recorded a prescription — so a monthly plan
 * reached its second cycle with nothing to ship against. The prescription is
 * the thing a refill checks: is it still in date, are there refills left.
 */
export async function writePrescriptionForOrder(orderNumber: string): Promise<{
  ok: boolean;
  prescriptionId?: string;
  error?: string;
}> {
  if (!supabaseAdminConfigured()) return { ok: false, error: 'not_configured' };
  const db = createSupabaseAdminClient();

  const { data: order } = await db
    .from('orders')
    .select('id, user_id, assigned_physician_id, physician_note')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (!order?.user_id) return { ok: false, error: 'not_found' };

  // One prescription per order, however many times this runs.
  const { data: existing } = await db
    .from('prescriptions')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle();
  if (existing) return { ok: true, prescriptionId: existing.id };

  const { data: items } = await db
    .from('order_items')
    .select('product_id, product_name, quantity, cadence, cadence_label, unit_price_cents')
    .eq('order_id', order.id);
  if (!items?.length) return { ok: false, error: 'no_items' };

  // A cart is one cadence in practice; the first line decides the plan.
  const cadence = String(items[0].cadence ?? 'monthly');
  const now = new Date();

  const { data: rx, error } = await db
    .from('prescriptions')
    .insert({
      user_id: order.user_id,
      order_id: order.id,
      doctor_id: order.assigned_physician_id,
      protocol_name: items.map((i) => i.product_name).join(' + '),
      items: items.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
      })) as unknown as Json,
      status: 'signed',
      signed_at: now.toISOString(),
      notes: order.physician_note,
      cadence,
      expires_at: isoDate(addMonths(now, PRESCRIPTION_MONTHS)),
      refills_remaining: refillsFor(cadence),
    })
    .select('id')
    .single();
  if (error || !rx) return { ok: false, error: error?.message ?? 'insert_failed' };

  // A one-time order is finished here; there is nothing to renew.
  if (cadence === 'once') return { ok: true, prescriptionId: rx.id };

  const perCycleCents = items.reduce(
    (sum, i) => sum + (i.unit_price_cents ?? 0) * (i.quantity ?? 1),
    0,
  );

  await db.from('subscriptions').insert({
    user_id: order.user_id,
    product_id: String(items[0].product_id),
    product_name: items.map((i) => i.product_name).join(' + '),
    prescription_id: rx.id,
    status: 'active',
    cadence_label: String(items[0].cadence_label ?? 'Monthly'),
    per_cycle_cents: perCycleCents,
    next_billing_date: isoDate(addMonths(now, monthsPerCycle(cadence))),
    last_charged_at: now.toISOString(),
  });

  return { ok: true, prescriptionId: rx.id };
}

/* -------------------------------------------------------------------------- */
/*  Renewals                                                                  */
/* -------------------------------------------------------------------------- */

export interface RenewalOutcome {
  subscriptionId: string;
  result: 'charged' | 'needs_review' | 'charge_failed' | 'no_card' | 'error';
  orderNumber?: string;
  detail?: string;
}

/**
 * Ship the next cycle of one subscription.
 *
 * A refill becomes a real order rather than a parallel code path, so it flows
 * through everything a first order already does — charge, pharmacy submission,
 * tracking, the member's order history — without any of it being rebuilt. The
 * only difference is that no prescriber sees it: he already decided, and the
 * prescription he signed is still in date.
 */
export async function renewSubscription(
  subscriptionId: string,
): Promise<RenewalOutcome> {
  const db = createSupabaseAdminClient();

  const { data: sub } = await db
    .from('subscriptions')
    .select(
      'id, user_id, product_id, product_name, per_cycle_cents, cadence_label, prescription_id, next_billing_date',
    )
    .eq('id', subscriptionId)
    .maybeSingle();
  if (!sub) return { subscriptionId, result: 'error', detail: 'not_found' };

  const { data: rx } = sub.prescription_id
    ? await db
        .from('prescriptions')
        .select('id, cadence, expires_at, refills_remaining')
        .eq('id', sub.prescription_id)
        .maybeSingle()
    : { data: null };

  const today = isoDate(new Date());
  const lapsed =
    !rx ||
    (rx.expires_at !== null && rx.expires_at < today) ||
    (rx.refills_remaining ?? 0) <= 0;

  /*
   * Out of date or out of refills. Charging here would be dispensing without a
   * current prescription, so the plan pauses and goes back for review instead.
   */
  if (lapsed) {
    await db
      .from('subscriptions')
      .update({ status: 'pending_review' })
      .eq('id', sub.id);

    // Pausing a plan silently is how a member finds out by noticing nothing
    // arrived. Tell them, and tell them nothing was charged.
    const { data: who } = await db
      .from('profiles')
      .select('email, full_name')
      .eq('id', sub.user_id)
      .maybeSingle();
    if (who?.email) {
      const msg = planNeedsReviewEmail({
        firstName: (who.full_name ?? '').trim().split(/\s+/)[0] || 'there',
        productName: sub.product_name,
        portalUrl: `${SITE_URL}/portal/subscriptions`,
      });
      try {
        await sendEmail({ to: who.email, subject: msg.subject, html: msg.html });
      } catch {
        // The plan is paused either way; a failed email is not a reason to charge.
      }
    }
    return { subscriptionId, result: 'needs_review' };
  }

  const { data: profile } = await db
    .from('profiles')
    .select('email, full_name, stripe_customer_id')
    .eq('id', sub.user_id)
    .maybeSingle();
  if (!profile?.email) {
    return { subscriptionId, result: 'error', detail: 'no_email' };
  }

  // Reuse the shipping address from their most recent order.
  const { data: lastOrder } = await db
    .from('orders')
    .select('shipping_address, ship_state, card_last4')
    .eq('user_id', sub.user_id)
    .not('shipping_address', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const amount = sub.per_cycle_cents ?? 0;
  if (amount <= 0) return { subscriptionId, result: 'error', detail: 'zero_amount' };

  const customerId = await getOrCreateStripeCustomer({
    userId: sub.user_id,
    email: profile.email,
    name: profile.full_name ?? undefined,
  });
  const paymentMethodId = await defaultCardFor(customerId);
  if (!paymentMethodId) {
    await db
      .from('subscriptions')
      .update({ status: 'paused' })
      .eq('id', sub.id);
    return { subscriptionId, result: 'no_card' };
  }

  const orderNumber = await nextOrderNumber();
  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: sub.user_id,
      // A refill is already approved. It never goes near the prescriber queue.
      status: 'signed',
      member_name: profile.full_name,
      member_email: profile.email,
      ship_state: lastOrder?.ship_state ?? null,
      subtotal_cents: amount,
      shipping_cents: 0,
      tax_cents: 0,
      total_cents: amount,
      shipping_address: lastOrder?.shipping_address ?? null,
      card_last4: lastOrder?.card_last4 ?? null,
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (orderErr || !order) {
    return { subscriptionId, result: 'error', detail: orderErr?.message };
  }

  await db.from('order_items').insert({
    order_id: order.id,
    product_id: String(sub.product_id),
    product_name: sub.product_name,
    quantity: 1,
    unit_price_cents: amount,
    cadence: rx.cadence ?? 'monthly',
    cadence_label: sub.cadence_label ?? 'Monthly',
  });

  const addr = (lastOrder?.shipping_address ?? {}) as Record<string, string>;
  try {
    const intent = await getStripe().paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Refill — order ${orderNumber}`,
      receipt_email: profile.email,
      shipping: addr.line1
        ? {
            name: addr.fullName || profile.full_name || 'Member',
            address: {
              line1: addr.line1,
              line2: addr.line2 || undefined,
              city: addr.city || undefined,
              state: addr.state || undefined,
              postal_code: addr.zip || undefined,
              country: 'US',
            },
          }
        : undefined,
      metadata: { order_number: orderNumber, refill: 'true' },
    });
    await db
      .from('orders')
      .update({ stripe_payment_intent_id: intent.id })
      .eq('id', order.id);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'charge_failed';
    await db.from('order_updates').insert({
      order_id: order.id,
      label: 'Refill charge failed',
      body: `${reason} The plan is paused until the card is fixed.`,
      author: 'System',
      author_role: 'system',
    });
    await db.from('subscriptions').update({ status: 'paused' }).eq('id', sub.id);
    return { subscriptionId, result: 'charge_failed', orderNumber, detail: reason };
  }

  // Burn a refill and schedule the next cycle.
  const months = monthsPerCycle(String(rx.cadence ?? 'monthly'));
  await Promise.all([
    db
      .from('prescriptions')
      .update({ refills_remaining: (rx.refills_remaining ?? 1) - 1 })
      .eq('id', rx.id),
    db
      .from('subscriptions')
      .update({
        next_billing_date: isoDate(addMonths(new Date(), months)),
        last_charged_at: new Date().toISOString(),
      })
      .eq('id', sub.id),
    db.from('order_updates').insert({
      order_id: order.id,
      label: 'Refill on your plan',
      body: 'Charged to your card on file and sent to the pharmacy. No new review was needed — your prescription is still in date.',
      author: 'System',
      author_role: 'system',
    }),
  ]);

  // The webhook marks it paid and submits it; this is the belt to that braces.
  await autoSubmitToPharmacy(orderNumber);

  return { subscriptionId, result: 'charged', orderNumber };
}

/** Subscriptions whose next cycle is due. */
export async function dueSubscriptionIds(limit = 100): Promise<string[]> {
  if (!supabaseAdminConfigured()) return [];
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('subscriptions')
    .select('id')
    .eq('status', 'active')
    .lte('next_billing_date', isoDate(new Date()))
    .limit(limit);
  return (data ?? []).map((r) => r.id);
}
