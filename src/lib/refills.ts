import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import type { Json } from '@/lib/database.types';
import { cardOnFile, chargeOrder, paymentsConfigured } from '@/lib/payments';
import { chargeOnApproval } from '@/lib/pay-on-approval';
import { autoSubmitToPharmacy } from '@/lib/auto-pharmacy';
import {
  planNeedsReviewEmail,
  renewalFailedMemberEmail,
  renewalFailedTeamEmail,
  sendEmail,
  SUPPORT_EMAIL,
} from '@/lib/email';
import { getPrescriber } from '@/lib/prescriber';
import { SERVICEABLE_STATES } from '@/lib/intakeSchema';
import { SITE_URL } from '@/lib/site';
import { nextOrderNumber } from '@/lib/order-number';
import { getLiveProduct } from '@/lib/catalog';
import { cadenceTiersForProduct, shipmentsPerCycle } from '@/lib/shopProducts';
import { getShippingSettings } from '@/lib/shipping-settings';
import {
  AWAITING_PAYMENT,
  addMonthsIso,
  cadenceOfLabel,
  monthsPerCycle,
  monthsPerShipment,
  perCycleCents,
  rxCovers,
} from '@/lib/order-rules';
import { REFILL_CHARGE_FAILED } from '@/lib/orders';

/**
 * How long a prescription written here stays good for.
 *
 * Twelve months is the usual ceiling for a non-controlled prescription. It is a
 * clinical and legal parameter, not a product decision — Dr. Elder owns the
 * number, and changing it here changes it everywhere.
 */
export const PRESCRIPTION_MONTHS = 12;

/**
 * Refills a cadence earns inside one prescription, after the first box. One
 * refill per box: a 12-month plan's second 6-month box is its one refill.
 */
export function refillsFor(cadence: string): number {
  // Legacy one-time orders (no longer sold) signed after the switch: nothing recurs.
  if (cadence === 'once') return 0;
  return Math.floor(PRESCRIPTION_MONTHS / monthsPerShipment(cadence)) - 1;
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
export async function writePrescriptionForOrder(
  orderNumber: string,
  /**
   * The prescriber who signed. Nothing sets assigned_physician_id on a new
   * order, so without this the prescription records no author at all — and the
   * author of a prescription is the person who signed it, not whoever the order
   * was routed to.
   */
  signedByDoctorId?: string,
  /** The sig he signed. Every refill on this prescription ships with it. */
  directions?: string,
): Promise<{
  ok: boolean;
  prescriptionId?: string;
  error?: string;
}> {
  if (!supabaseAdminConfigured()) return { ok: false, error: 'not_configured' };
  const db = createSupabaseAdminClient();

  const { data: order } = await db
    .from('orders')
    .select('id, user_id, assigned_physician_id, physician_note, shipping_cents')
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
      doctor_id: signedByDoctorId ?? order.assigned_physician_id,
      protocol_name: items.map((i) => i.product_name).join(' + '),
      items: items.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
      })) as unknown as Json,
      status: 'signed',
      signed_at: now.toISOString(),
      notes: order.physician_note,
      directions: directions ?? null,
      cadence,
      expires_at: isoDate(addMonths(now, PRESCRIPTION_MONTHS)),
      refills_remaining: refillsFor(cadence),
    })
    .select('id')
    .single();
  if (error || !rx) return { ok: false, error: error?.message ?? 'insert_failed' };

  // A one-time order is finished here; there is nothing to renew.
  if (cadence === 'once') return { ok: true, prescriptionId: rx.id };

  /*
   * What a renewal charges: the plan plus shipping on every box of the cycle
   * (renewals never ship free, even when this first order did). Shown in the
   * portal; renewSubscription recomputes it from the catalogue when it bills.
   */
  const { pricePerShipment } = await getShippingSettings();
  const planCents = items.reduce((sum, i) => sum + (i.unit_price_cents ?? 0) * (i.quantity ?? 1), 0);
  const annual = shipmentsPerCycle(cadence) > 1;

  await db.from('subscriptions').insert({
    user_id: order.user_id,
    product_id: String(items[0].product_id),
    product_name: items.map((i) => i.product_name).join(' + '),
    prescription_id: rx.id,
    status: 'active',
    cadence_label: String(items[0].cadence_label ?? 'Monthly'),
    per_cycle_cents: perCycleCents(planCents / 100, cadence, pricePerShipment),
    next_billing_date: isoDate(addMonths(now, monthsPerCycle(cadence))),
    last_charged_at: now.toISOString(),
    // 12-month plan: box 2 in six months, once this order is paid (lib/annual-shipments).
    ...(annual && {
      next_shipment_date: addMonthsIso(isoDate(now), monthsPerShipment(cadence)),
      next_shipment_order_id: order.id,
    }),
  });

  return { ok: true, prescriptionId: rx.id };
}

/**
 * Where a refill (or a 12-month plan's second box) ships: where they live now.
 * The primary address on their account wins over the last order's, so a
 * member who moves between cycles gets it at the new address. Null shipTo
 * when there is no address in a state we serve.
 */
export async function shipToFor(userId: string): Promise<{
  shipTo: Record<string, string | undefined> | null;
  shipState: string;
  cardLast4: string | null;
}> {
  const db = createSupabaseAdminClient();
  const [{ data: lastOrder }, { data: primary }] = await Promise.all([
    db
      .from('orders')
      .select('shipping_address, ship_state, card_last4')
      .eq('user_id', userId)
      .not('shipping_address', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('addresses')
      .select('full_name, line1, line2, city, state, zip, phone')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle(),
  ]);
  const shipTo = primary
    ? {
        fullName: primary.full_name,
        line1: primary.line1,
        line2: primary.line2 ?? undefined,
        city: primary.city,
        state: primary.state,
        zip: primary.zip,
        phone: primary.phone ?? undefined,
      }
    : ((lastOrder?.shipping_address ?? null) as Record<string, string> | null);
  const shipState = (shipTo?.state ?? lastOrder?.ship_state ?? '').toUpperCase();
  const ok = Boolean(shipTo?.line1) && SERVICEABLE_STATES.includes(shipState);
  return { shipTo: ok ? shipTo : null, shipState, cardLast4: lastOrder?.card_last4 ?? null };
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
      'id, user_id, product_id, product_name, per_cycle_cents, cadence_label, prescription_id, next_billing_date, stripe_subscription_id, next_shipment_date',
    )
    .eq('id', subscriptionId)
    .maybeSingle();
  if (!sub) return { subscriptionId, result: 'error', detail: 'not_found' };
  /*
   * Last year's second box hasn't gone yet (a plan paused past it, or its
   * charge still settling). Billing now would overwrite it, so wait: the
   * box-2 cron runs before this one, and the summary email shows the wait.
   */
  if (sub.next_shipment_date) return { subscriptionId, result: 'error', detail: 'second_box_still_owed' };
  // A custom plan the old processor billed itself (Admin → Billing, before
  // 2026-10). It has no prescription to renew against; a person decides.
  if (sub.stripe_subscription_id) {
    return { subscriptionId, result: 'error', detail: 'legacy_processor_plan' };
  }

  const { data: rx } = sub.prescription_id
    ? await db
        .from('prescriptions')
        .select('id, cadence, expires_at, refills_remaining')
        .eq('id', sub.prescription_id)
        .maybeSingle()
    : { data: null };

  const today = isoDate(new Date());
  const product = await getLiveProduct(String(sub.product_id));
  // Bill and schedule on the plan the member is on now, not the one they
  // started on: charging a 6-month total and then renewing a month later
  // would bill six times over.
  const cadence = cadenceOfLabel(sub.cadence_label, String(rx?.cadence ?? 'monthly'));
  // Every box of the cycle: a year is never billed on a prescription that
  // cannot ship its second box.
  const lapsed = !rxCovers(rx, today, shipmentsPerCycle(cadence), monthsPerShipment(cadence)) || !product;

  /*
   * Out of date, out of refills (for every box this cycle ships), or a
   * product we no longer sell (withheld or back to draft). Charging here would be dispensing without a current
   * prescription or shipping something off the catalogue, so the plan pauses
   * and goes back for review instead.
   */
  if (lapsed || !product || !rx) {
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
        // The renewal path: a signed-in member's assessment skips what is on
        // file, and a plan in review no longer blocks a new order for it.
        // ?renew= shows the renewal banner; placing the order closes this plan.
        portalUrl: `${SITE_URL}/start?product=${encodeURIComponent(String(sub.product_id))}&renew=${encodeURIComponent(sub.id)}`,
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
    .select('email, full_name')
    .eq('id', sub.user_id)
    .maybeSingle();
  if (!profile?.email) {
    return { subscriptionId, result: 'error', detail: 'no_email' };
  }

  const { shipTo, shipState, cardLast4 } = await shipToFor(sub.user_id);
  if (!shipTo) {
    // Moved out of the states we serve, or no address at all: nothing ships.
    await db.from('subscriptions').update({ status: 'pending_review' }).eq('id', sub.id);
    await notifyRenewalFailed(sub, profile, 'No shipping address in a state we serve (NJ, NY, PA, MI).');
    return { subscriptionId, result: 'needs_review', detail: 'address' };
  }

  /*
   * Members keep the price they signed up at: a renewal bills the stored
   * per-cycle amount (set at signing, and again when the member switches
   * plan, at that day's prices). Only a plan with nothing stored is priced
   * now: the plan's price plus shipping on every box of the cycle at today's
   * rate (Admin → Settings); a 12-month plan pays both boxes up front.
   */
  const { pricePerShipment } = await getShippingSettings();
  const plan = cadenceTiersForProduct(product, pricePerShipment).find((t) => t.key === cadence);
  const current = plan ? perCycleCents(plan.total, cadence, pricePerShipment) : 0;
  const amount = (sub.per_cycle_cents ?? 0) > 0 ? (sub.per_cycle_cents as number) : current;
  if (amount <= 0) return { subscriptionId, result: 'error', detail: 'zero_amount' };
  // Receipt lines: plan + shipping when the stored amount is today's, else all as the item.
  const planCents = plan && amount === current ? Math.round(plan.total * 100) : amount;
  const split = { subtotalCents: planCents, shippingCents: amount - planCents };

  /*
   * Claim this cycle before anything is created. An overlapping cron run that
   * read the same plan finds the date already moved and stops here, so one
   * cycle is one order and one charge (chargeOrder is idempotent per order,
   * not per plan). A charge that fails puts the date back.
   */
  const months = monthsPerCycle(cadence);
  const claim = db
    .from('subscriptions')
    .update({ next_billing_date: isoDate(addMonths(new Date(), months)), per_cycle_cents: amount })
    .eq('id', sub.id)
    .eq('status', 'active');
  const { data: claimed } = await (
    sub.next_billing_date ? claim.eq('next_billing_date', sub.next_billing_date) : claim.is('next_billing_date', null)
  ).select('id');
  if (!claimed?.length) return { subscriptionId, result: 'error', detail: 'already_renewing' };
  const unclaim = () =>
    db.from('subscriptions').update({ next_billing_date: sub.next_billing_date }).eq('id', sub.id);

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
      ship_state: shipState,
      subtotal_cents: split.subtotalCents,
      shipping_cents: split.shippingCents,
      tax_cents: 0,
      total_cents: amount,
      shipping_address: shipTo as unknown as Json,
      card_last4: cardLast4,
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (orderErr || !order) {
    await unclaim();
    return { subscriptionId, result: 'error', detail: orderErr?.message };
  }

  await db.from('order_items').insert({
    order_id: order.id,
    product_id: String(sub.product_id),
    product_name: sub.product_name,
    quantity: 1,
    unit_price_cents: split.subtotalCents,
    cadence,
    cadence_label: sub.cadence_label ?? 'Monthly',
  });

  /*
   * Charged like any order (lib/payments): the charge is stored on the order
   * before it is confirmed, and a success is recorded, confirmed to the
   * member and sent to the pharmacy there. No card is handled as a failed
   * charge below, so it leaves the same order and marker a declined card
   * does, and restarts the same way.
   */
  let charge = await chargeOrder(order.id);
  // A timeout leaves the charge unknown; the second call reads it back.
  if (charge.status === 'error' && charge.code === 'unavailable') charge = await chargeOrder(order.id);

  /*
   * Still unknown: the money may yet move, and the webhook records it if it
   * does. Pausing now and restarting later would charge this cycle twice, so
   * the cycle stays claimed and a person looks (the cron's summary email).
   */
  const unknown = charge.status === 'error' && charge.code === 'unavailable';
  if (charge.status !== 'paid' && charge.status !== 'pending' && !unknown) {
    const reason =
      charge.status === 'declined'
        ? charge.message
        : charge.status === 'no_card'
          ? 'No card on file.'
          : charge.status === 'requires_action'
            ? 'The bank asked the member to approve the charge.'
            : `The charge could not complete (${charge.code}).`;
    await db.from('order_updates').insert({
      order_id: order.id,
      label: REFILL_CHARGE_FAILED,
      body: `${reason} The plan is paused until the card is fixed.`,
      author: 'System',
      author_role: 'system',
    });
    // Back to the date it was due, so a restart charges it within a day.
    await db
      .from('subscriptions')
      .update({ status: 'paused', next_billing_date: sub.next_billing_date })
      .eq('id', sub.id);
    await notifyRenewalFailed({ ...sub, per_cycle_cents: amount }, profile, reason);
    return { subscriptionId, result: 'charge_failed', orderNumber, detail: reason };
  }

  // Burn a refill; the next cycle was scheduled by the claim above.
  const paid = charge.status === 'paid';
  await Promise.all([
    db
      .from('prescriptions')
      .update({ refills_remaining: (rx.refills_remaining ?? 1) - 1 })
      .eq('id', rx.id),
    db
      .from('subscriptions')
      .update({
        last_charged_at: new Date().toISOString(),
        // 12-month plan: box 2 in six months, once this charge is confirmed paid.
        ...(shipmentsPerCycle(cadence) > 1 && {
          next_shipment_date: addMonthsIso(today, monthsPerShipment(cadence)),
          next_shipment_order_id: order.id,
        }),
      })
      .eq('id', sub.id),
    paid &&
      db.from('order_updates').insert({
        order_id: order.id,
        label: 'Refill on your plan',
        body: 'Charged to your card on file and sent to the pharmacy. No new review was needed — your prescription is still in date.',
        author: 'System',
        author_role: 'system',
      }),
  ]);

  if (unknown) return { subscriptionId, result: 'error', orderNumber, detail: 'charge_unconfirmed' };
  // Recording the payment already submitted it; this is the belt to that braces.
  // A pending charge ships when it settles, never before.
  if (paid) await autoSubmitToPharmacy(orderNumber, { refill: true, prescriptionId: rx.id });

  return { subscriptionId, result: 'charged', orderNumber };
}

/* -------------------------------------------------------------------------- */
/*  After a card is fixed                                                     */
/* -------------------------------------------------------------------------- */

export interface OwedPayment {
  orderNumber: string;
  productId: string;
  productName: string;
  /** A refill whose charge failed (restarts from the card), not a first order (pays by link). */
  refill: boolean;
}

/** This member's approved orders still waiting on money. */
export async function paymentsOwed(userId: string): Promise<OwedPayment[]> {
  if (!supabaseAdminConfigured()) return [];
  const db = createSupabaseAdminClient();
  const { data: orders } = await db
    .from('orders')
    .select('id, order_number')
    .eq('user_id', userId)
    .in('status', AWAITING_PAYMENT)
    .is('paid_confirmed_at', null);
  if (!orders?.length) return [];
  const ids = orders.map((o) => o.id);
  const [{ data: items }, { data: failed }] = await Promise.all([
    db.from('order_items').select('order_id, product_id, product_name').in('order_id', ids),
    db.from('order_updates').select('order_id').in('order_id', ids).eq('label', REFILL_CHARGE_FAILED),
  ]);
  return orders.map((o) => {
    const lines = (items ?? []).filter((i) => i.order_id === o.id);
    return {
      orderNumber: o.order_number,
      productId: String(lines[0]?.product_id ?? ''),
      productName: lines.map((i) => i.product_name).join(' + ') || 'your order',
      refill: (failed ?? []).some((f) => f.order_id === o.id),
    };
  });
}

export interface ResumeResult {
  /** Plans switched back on. */
  plans: number;
  /** Approved first orders charged to the card on file. */
  charged: number;
  /** Approved first orders that didn't charge, so a pay link went out. */
  payLinks: number;
  /** Why nothing happened, when nothing did: no card saved, or no plan paused by a failed charge. */
  reason?: 'noCard' | 'notPaused';
}

/**
 * The member has saved a card: restart what a failed charge stopped. Runs only
 * from the account page's POST (a server action), never on a page load:
 * it can charge the card.
 *
 * A failed refill is closed (it never took money) and its plan switched back
 * on, so the next renewals run, within a day, charges the card on file for
 * that cycle. Paying the old order instead would ship the cycle while the
 * plan stayed paused. An approved first order gets a fresh pay link, emailed.
 */
export async function resumeAfterNewCard(user: {
  id: string;
  email: string;
  name?: string;
}): Promise<ResumeResult> {
  const done: ResumeResult = { plans: 0, charged: 0, payLinks: 0 };
  if (!paymentsConfigured()) return { ...done, reason: 'notPaused' };
  const owed = await paymentsOwed(user.id);
  if (!owed.length) return { ...done, reason: 'notPaused' };

  // Still no card: switching a plan back on would only fail again tomorrow.
  const card = owed.some((o) => o.refill) ? await cardOnFile(user.id) : null;

  const db = createSupabaseAdminClient();
  for (const o of owed) {
    if (!o.refill) {
      /*
       * Approved, never paid: charge the card they just added and send it on,
       * the same as at approval. A decline there emails the pay link itself.
       */
      const charge = await chargeOnApproval(o.orderNumber);
      if (charge.charged) {
        done.charged++;
        await autoSubmitToPharmacy(o.orderNumber);
      } else if (charge.ok) done.payLinks++;
      continue;
    }
    if (!card) continue;
    // Conditional on still being unpaid, so a double submit closes it once.
    const { data: closed } = await db
      .from('orders')
      .update({ status: 'canceled', pay_token: null, pay_token_expires: null })
      .eq('order_number', o.orderNumber)
      .in('status', AWAITING_PAYMENT)
      .is('paid_confirmed_at', null)
      .select('id')
      .maybeSingle();
    if (!closed) continue;
    await db.from('order_updates').insert({
      order_id: closed.id,
      label: 'Retrying on your updated card',
      body: 'This charge didn’t go through, so it’s closed. Your plan is back on, and this refill is charged to your card within a day.',
      author: 'System',
      author_role: 'system',
    });
    const { data: back } = await db
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('user_id', user.id)
      .eq('product_id', o.productId)
      .eq('status', 'paused')
      .select('id');
    done.plans += back?.length ?? 0;
  }
  return { ...done, reason: resumeReason(done, owed.some((o) => o.refill), Boolean(card)) };
}

/** Why a restart did nothing, or undefined when something happened. Pure, for checks. */
export function resumeReason(
  done: Pick<ResumeResult, 'plans' | 'charged' | 'payLinks'>,
  hadRefill: boolean,
  hadCard: boolean,
): ResumeResult['reason'] {
  if (done.plans || done.charged || done.payLinks) return undefined;
  return hadRefill && !hadCard ? 'noCard' : 'notPaused';
}

/** Subscriptions whose next cycle is due. */
export async function dueSubscriptionIds(limit = 100): Promise<string[]> {
  if (!supabaseAdminConfigured()) return [];
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('subscriptions')
    .select('id')
    .eq('status', 'active')
    // Custom plans the old processor billed; nothing renews them here.
    .is('stripe_subscription_id', null)
    .lte('next_billing_date', isoDate(new Date()))
    .limit(limit);
  return (data ?? []).map((r) => r.id);
}

/**
 * A refill that didn't charge is a patient who silently stops getting their
 * medication. The member gets a link to fix their card; admin and the
 * prescriber get the reason, so someone can follow up.
 */
async function notifyRenewalFailed(
  sub: { product_name: string; per_cycle_cents: number | null },
  profile: { email: string | null; full_name: string | null },
  reason: string,
): Promise<void> {
  const name = profile.full_name ?? 'Member';
  const sends: Promise<unknown>[] = [];
  if (profile.email) {
    const m = renewalFailedMemberEmail({
      firstName: name.trim().split(/\s+/)[0] || 'there',
      productName: sub.product_name,
    });
    sends.push(sendEmail({ to: profile.email, subject: m.subject, html: m.html }));
  }
  const team = renewalFailedTeamEmail({
    patientName: name,
    patientEmail: profile.email ?? '—',
    productName: sub.product_name,
    amountCents: sub.per_cycle_cents ?? 0,
    reason,
  });
  const prescriber = await getPrescriber().catch(() => null);
  for (const to of new Set([SUPPORT_EMAIL, prescriber?.email].filter(Boolean) as string[])) {
    sends.push(sendEmail({ to, subject: team.subject, html: team.html }));
  }
  await Promise.allSettled(sends);
}
