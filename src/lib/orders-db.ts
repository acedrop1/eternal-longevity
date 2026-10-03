'use server';

/**
 * Server-side order workflow, backed by Supabase.
 *
 * Replaces the localStorage OrdersProvider for live mode: a member places an
 * order, an admin approves it, a physician signs it (billing starts), and the
 * pharmacy compounds and ships. Every role reads the same rows, so the doctor
 * and admin queues finally reflect real member activity.
 *
 * Reads go through the caller's own session client so RLS applies (members
 * see their own orders, clinical staff see all). Writes that must cross roles
 * — appending a timeline entry authored by staff, for instance — go through
 * the service-role client after we have checked the caller's role ourselves.
 */

import type { Json } from '@/lib/database.types';
import { revalidatePath } from 'next/cache';
import { refundDeclinedOrder } from '@/lib/order-payment';
import { chargeOnApproval } from '@/lib/pay-on-approval';
import { alertCareTeam, autoSubmitToPharmacy, withdrawFromPharmacy } from '@/lib/auto-pharmacy';
import { advanceFulfillment } from '@/lib/fulfillment-core';
import {
  noticeEmail,
  orderCancelledByTeamEmail,
  orderReceivedEmail,
  sendEmail,
} from '@/lib/email';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth-server';
import type { Order, OrderLine, OrderStatus, OrderUpdate, UpdateAuthorRole } from '@/lib/orders';
import { SERVICEABLE_STATES } from '@/lib/intakeSchema';
import { cadenceTiersForProduct } from '@/lib/shopProducts';
import { getLiveProducts } from '@/lib/catalog';
import { orderTotalCents, shippingPriceFor } from '@/lib/shipping';
import { checkPromoAction } from '@/lib/promo-db';
import { redeemPromo } from '@/lib/promo-redeem';
import {
  MAX_LINE_QUANTITY,
  MAX_ORDER_LINES,
  ORDER_FROM,
  shippingAddressError,
} from '@/lib/order-rules';
import type { Database } from '@/lib/database.types';
import { releaseToDoctor } from '@/lib/release-to-doctor';
import { canOrder, latestIntakeAnswers } from '@/lib/intake-status';
import { heldProductsFor } from '@/lib/held-products';
import { intakeCovers } from '@/lib/purchase-rules';
import { claimCheckout, releaseCheckout } from '@/lib/order-lock';
import { SITE_URL } from '@/lib/site';
import { writePrescriptionForOrder } from '@/lib/refills';
import { nextOrderNumber } from '@/lib/order-number';
import { openSignWindow, passwordMatches, signWindowOpen } from '@/lib/reauth';
import { recordAudit } from '@/lib/prescriber';

/** True when the Supabase-backed workflow is available. */
export async function ordersDbConfigured(): Promise<boolean> {
  return supabaseAdminConfigured();
}

/* -------------------------------------------------------------------------- */
/*  Row -> app shape                                                          */
/* -------------------------------------------------------------------------- */

type OrderRow = Record<string, unknown>;

function centsToDollars(v: unknown): number {
  return Math.round(Number(v ?? 0)) / 100;
}

function mapLine(row: OrderRow): OrderLine {
  return {
    productId: String(row.product_id ?? ''),
    productName: String(row.product_name ?? ''),
    cadence: (row.cadence as OrderLine['cadence']) ?? 'monthly',
    cadenceLabel: String(row.cadence_label ?? 'Monthly'),
    quantity: Number(row.quantity ?? 1),
    perCycle: centsToDollars(row.unit_price_cents),
    image: String(row.image ?? '/images/9.jpg'),
    swatch: String(row.swatch ?? '#1a1a1a'),
  };
}

function mapUpdate(row: OrderRow): OrderUpdate {
  return {
    id: String(row.id ?? ''),
    at: new Date(String(row.created_at ?? Date.now())).getTime(),
    author: String(row.author ?? 'System'),
    role: (row.author_role as UpdateAuthorRole) ?? 'system',
    note: [row.label, row.body].filter(Boolean).join(' — '),
    statusChange: (row.status_change as OrderStatus) || undefined,
  };
}

function mapOrder(row: OrderRow): Order {
  const address = (row.shipping_address ?? {}) as Record<string, string>;
  const items = (row.order_items ?? []) as OrderRow[];
  const updates = (row.order_updates ?? []) as OrderRow[];

  return {
    id: String(row.order_number ?? row.id ?? ''),
    memberName: String(row.member_name ?? ''),
    memberEmail: String(row.member_email ?? ''),
    state: String(row.ship_state ?? address.state ?? ''),
    lines: items.map(mapLine),
    subtotal: centsToDollars(row.subtotal_cents),
    shippingCost: centsToDollars(row.shipping_cents),
    tax: centsToDollars(row.tax_cents),
    total: centsToDollars(row.total_cents),
    shippingAddress: {
      fullName: address.fullName ?? String(row.member_name ?? ''),
      line1: address.line1 ?? '',
      line2: address.line2 || undefined,
      city: address.city ?? '',
      state: address.state ?? String(row.ship_state ?? ''),
      zip: address.zip ?? '',
    },
    userId: (row.user_id as string) || undefined,
    cardLast4: (row.card_last4 as string) || undefined,
    placedAt: new Date(String(row.created_at ?? Date.now())).getTime(),
    status: (row.status as OrderStatus) ?? 'pending-admin',
    assignedToPhysicianId: (row.assigned_physician_id as string) || undefined,
    adminNote: (row.admin_note as string) || undefined,
    physicianNote: (row.physician_note as string) || undefined,
    // Paid means the money landed (the webhook's paid_confirmed_at), never the signature.
    paidAt: row.paid_confirmed_at ? new Date(String(row.paid_confirmed_at)).getTime() : undefined,
    firstChargeAmount: row.first_charge_cents
      ? centsToDollars(row.first_charge_cents)
      : undefined,
    tracking: (row.tracking_number as string) || undefined,
    carrier: (row.tracking_carrier as string) || undefined,
    updates: updates
      .map(mapUpdate)
      .sort((a, b) => a.at - b.at),
  };
}

const SELECT =
  '*, order_items(*), order_updates(*)';

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every order the caller is allowed to see. RLS narrows this to the member's
 * own rows, or all rows for doctor/admin.
 */
export async function listOrders(): Promise<Order[]> {
  if (!supabaseConfigured) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('orders')
    .select(SELECT)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[orders-db] listOrders:', error.message);
    return [];
  }
  return (data ?? []).map((r) => mapOrder(r as OrderRow));
}

/** One order by its human-readable order number. */
export async function getOrder(orderNumber: string): Promise<Order | null> {
  if (!supabaseConfigured) return null;
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('orders')
    .select(SELECT)
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (error || !data) return null;
  return mapOrder(data as OrderRow);
}

/* -------------------------------------------------------------------------- */
/*  Writes                                                                    */
/* -------------------------------------------------------------------------- */

type ActionResult = { ok: boolean; error?: string };

/** Guard: the caller must hold one of these roles. */
async function requireRole(roles: string[]) {
  const user = await getSession();
  if (!user || !roles.includes(user.role)) {
    return { user: null, error: 'not_authorized' as const };
  }
  return { user, error: null };
}

/** Append a timeline entry, optionally recording a status change. */
async function appendUpdate(
  orderId: string,
  author: string,
  role: UpdateAuthorRole,
  label: string,
  body?: string,
  statusChange?: OrderStatus,
): Promise<void> {
  const db = createSupabaseAdminClient();
  await db.from('order_updates').insert({
    order_id: orderId,
    label,
    body: body ?? null,
    author,
    author_role: role,
    status_change: statusChange ?? null,
  });
}

/**
 * Move an order only if it is still in one of `from`. False when it has moved
 * on — a second click, a stale screen, or a request against a finished order.
 */
async function moveOrder(
  id: string,
  from: (typeof ORDER_FROM)[keyof typeof ORDER_FROM],
  patch: Database['public']['Tables']['orders']['Update'],
): Promise<boolean> {
  const { data } = await createSupabaseAdminClient()
    .from('orders')
    .update(patch)
    .eq('id', id)
    .in('status', from)
    .select('id');
  return Boolean(data?.length);
}

/**
 * A cancelled order must not keep its plan. Signing wrote a prescription and
 * started a subscription; left alone, the renewals cron would bill a cancelled
 * order every cycle, and admin's "ready to submit" list would still offer it.
 */
async function voidPlanForOrder(orderId: string): Promise<void> {
  const db = createSupabaseAdminClient();
  const { data: rx } = await db
    .from('prescriptions')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();
  if (!rx) return;
  await Promise.all([
    db.from('prescriptions').update({ status: 'declined', refills_remaining: 0 }).eq('id', rx.id),
    db.from('subscriptions').update({ status: 'canceled' }).eq('prescription_id', rx.id),
  ]);
}

/** Resolve an order_number to its uuid. */
async function orderIdFor(orderNumber: string): Promise<string | null> {
  if (!supabaseAdminConfigured()) return null;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

function revalidatePortal() {
  for (const p of [
    '/portal',
    '/portal/orders',
    '/portal/admin',
    '/portal/admin/queue',
    '/portal/doctor',
    '/portal/pharmacy',
  ]) {
    revalidatePath(p);
  }
}

/**
 * What a member is emailed when the prescriber writes to them. No clinical
 * words in email: his text stays in the portal thread and the order timeline,
 * and this only says where to read it.
 */
function prescriberMessageEmail(): { subject: string; html: string } {
  return {
    subject: 'You have a message from your prescriber',
    html: noticeEmail({
      eyebrow: 'Your care team',
      heading: 'You have a message from your prescriber',
      body: 'Sign in to read it and reply. We keep it in your portal rather than in email, for your privacy.',
      cta: { label: 'Read it in your portal', href: `${SITE_URL}/portal/messages?thread=doctor` },
    }),
  };
}

/** Member places an order. Returns the new order number. */
/**
 * Member places an order. Returns the first order number.
 *
 * One order per product, deliberately. A prescription is written for a drug,
 * not for a basket — the prescriber may approve one thing and decline another,
 * and a single order forced him to take both or neither. Splitting here means
 * each product gets its own review, its own charge, its own prescription and
 * its own pharmacy submission, and it removes a real bug: the prescription
 * writer read the cadence off the first line, so a monthly and a quarterly item
 * bought together produced one prescription with the wrong term.
 */
export async function placeOrderAction(
  input: Parameters<typeof placeOrder>[0],
): ReturnType<typeof placeOrder> {
  const { user, error } = await requireRole(['member']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  if (!supabaseAdminConfigured()) return placeOrder(input);
  // A double submit must not become two orders for the same product.
  const db = createSupabaseAdminClient();
  if (!(await claimCheckout(db, user.id))) return { ok: false, error: 'order_in_progress' };
  try {
    return await placeOrder(input);
  } finally {
    await releaseCheckout(db, user.id);
  }
}

async function placeOrder(input: {
  lines: OrderLine[];
  subtotal: number;
  total: number;
  shippingAddress: Order['shippingAddress'];
  /** Promotion code the member entered, if any. */
  promoCode?: string;
}): Promise<ActionResult & { orderNumber?: string; productId?: string }> {
  const { user, error } = await requireRole(['member']);
  if (error || !user) return { ok: false, error: 'not_authorized' };

  // The form checks these too; this is the check a crafted request meets.
  const addressError = shippingAddressError(input.shippingAddress);
  if (addressError) return { ok: false, error: addressError };
  const shippingAddress: Order['shippingAddress'] = {
    fullName: input.shippingAddress.fullName.trim(),
    line1: input.shippingAddress.line1.trim(),
    line2: input.shippingAddress.line2?.trim() || undefined,
    city: input.shippingAddress.city.trim(),
    state: input.shippingAddress.state.toUpperCase(),
    zip: input.shippingAddress.zip.trim(),
  };

  /*
   * Geofence, enforced server-side. The shipping dropdown only offers
   * serviceable states, but a dropdown is not a control — this is the check
   * that actually holds, and it is the one the processor is relying on.
   */
  const shipState = shippingAddress.state;
  if (!SERVICEABLE_STATES.includes(shipState)) {
    return { ok: false, error: 'state_not_serviced' };
  }

  /*
   * No completed medical intake, no order. The checkout page redirects before
   * anyone gets this far, but a redirect is a convenience — this is the check
   * that holds. Without it an order reaches the prescriber as a request to
   * sign a prescription for someone he has no clinical record for.
   */
  if (!(await canOrder(user.id))) {
    return { ok: false, error: 'intake_incomplete' };
  }

  if (!Array.isArray(input.lines) || !input.lines.length) {
    return { ok: false, error: 'empty_cart' };
  }
  if (
    input.lines.length > MAX_ORDER_LINES ||
    input.lines.some(
      (l) =>
        !Number.isInteger(l.quantity) ||
        l.quantity < 1 ||
        l.quantity > MAX_LINE_QUANTITY,
    )
  ) {
    return { ok: false, error: 'invalid_quantity' };
  }

  /*
   * Catalogue gate, enforced server-side for the same reason as the geofence.
   * A withheld or draft product has no tile, no page and no route — but a
   * saved cart or a crafted request is not stopped by any of those.
   */
  const live = new Map((await getLiveProducts()).map((p) => [p.id, p]));
  if (input.lines.some((l) => !live.has(l.productId))) {
    return { ok: false, error: 'product_unavailable' };
  }

  /*
   * One of each product, and only what the intake covers. A second order for
   * something already in flight or on a plan is a duplicate charge waiting to
   * happen; a product whose questions were never asked reaches the prescriber
   * with nothing to review. The start and product pages route around both;
   * these hold for a saved cart or a crafted request.
   */
  const ids = input.lines.map((l) => l.productId);
  if (new Set(ids).size !== ids.length) return { ok: false, error: 'duplicate_product' };
  const [held, answers] = await Promise.all([heldProductsFor(user.id), latestIntakeAnswers(user.id)]);
  const heldId = ids.find((id) => held.has(id));
  if (heldId) return { ok: false, error: 'already_ordered', productId: heldId };
  // Demo stores no intakes, so there is nothing to check against there.
  const unassessed = supabaseAdminConfigured() ? ids.find((id) => !intakeCovers(answers, id)) : undefined;
  if (unassessed) return { ok: false, error: 'not_assessed', productId: unassessed };

  /*
   * Name, plan and price come from the catalogue, never from the request.
   * The browser sends what it displayed; this is what gets charged, so an
   * edited request can't set its own price, and a price changed in
   * Admin → Products applies from the next order.
   */
  const lines: OrderLine[] = input.lines.map((l) => {
    const product = live.get(l.productId)!;
    const tiers = cadenceTiersForProduct(product);
    const tier = tiers.find((t) => t.key === l.cadence) ?? tiers[0];
    return {
      ...l,
      productName: product.name,
      cadence: tier.key,
      cadenceLabel: tier.label,
      perCycle: tier.total,
      quantity: l.quantity,
      image: product.image,
      swatch: product.swatch,
    };
  });

  const db = createSupabaseAdminClient();

  const lineSubtotal = (l: OrderLine) =>
    Math.round(l.perCycle * 100) * (l.quantity ?? 1);
  const cartSubtotalCents = lines.reduce((s, l) => s + lineSubtotal(l), 0);
  if (cartSubtotalCents <= 0) return { ok: false, error: 'empty_cart' };

  /*
   * Re-check the code here rather than trusting the total the client sent.
   * The browser computes a discounted total to display it; this is the number
   * that gets charged, so it is derived server-side from the code itself.
   */
  let cartDiscountCents = 0;
  let appliedCode: string | null = null;
  let freeShipping = false;
  if (input.promoCode) {
    const check = await checkPromoAction(input.promoCode, cartSubtotalCents);
    if (check.ok && (check.discountCents || check.includesShipping)) {
      cartDiscountCents = check.discountCents ?? 0;
      appliedCode = check.code ?? null;
      freeShipping = Boolean(check.includesShipping);
    } else {
      // They were shown a discount; booking full price without a word is worse than asking.
      return { ok: false, error: 'promo_unavailable' };
    }
  }

  /*
   * Claimed before any order is written: the check above only reads the count,
   * so two checkouts racing for a code's last redemption would both pass it.
   * The claim is atomic; the loser is told, rather than charged full price
   * without warning.
   */
  if (appliedCode && !(await redeemPromo(appliedCode))) {
    return { ok: false, error: 'promo_unavailable' };
  }

  /*
   * Shipping and tax are set here, not taken from the request. Shipping is per
   * order (one product, one shipment) at the product's price (lib/shipping),
   * and the promo never touches it. No sales tax is charged: prescription
   * drugs are exempt in every state we serve (NJ, NY, PA, MI). If a taxable
   * item is ever sold, compute it here (e.g. Stripe Tax calculations) rather
   * than trusting a number the browser sent.
   */
  const cartTaxCents = 0;

  // Tax and the promo belong to the basket, so they are split across it by
  // value, and the rounding remainder lands on the last order.
  const share = (total: number, i: number) => {
    if (i < lines.length - 1) {
      return Math.round((total * lineSubtotal(lines[i])) / cartSubtotalCents);
    }
    let taken = 0;
    for (let j = 0; j < lines.length - 1; j++) {
      taken += Math.round((total * lineSubtotal(lines[j])) / cartSubtotalCents);
    }
    return total - taken;
  };

  const created: string[] = [];
  let bookedTotalCents = 0;
  let bookedShippingCents = 0;
  let bookedDiscountCents = 0;

  for (const [i, line] of lines.entries()) {
    const subtotalCents = lineSubtotal(line);
    const shippingCents = shippingPriceFor(live.get(line.productId)) * 100;
    const taxCents = share(cartTaxCents, i);
    const itemDiscountCents = share(cartDiscountCents, i);
    const totalCents = orderTotalCents({ subtotalCents, shippingCents, taxCents, discountCents: itemDiscountCents, freeShipping });
    // Waived shipping is recorded as discount, so subtotal + shipping - discount = total.
    const discountCents = itemDiscountCents + (freeShipping ? shippingCents : 0);

    /*
     * One number per order, and a multi-product cart is several orders — each
     * gets its own rather than a lettered variant of a shared one, because each
     * is signed, charged and shipped on its own.
     */
    const orderNumber = await nextOrderNumber();

    const { data: order, error: insErr } = await db
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: user.id,
        status: 'pending-admin',
        member_name: user.name,
        member_email: user.email,
        ship_state: shipState,
        subtotal_cents: subtotalCents,
        shipping_cents: shippingCents,
        tax_cents: taxCents,
        discount_cents: discountCents,
        promo_code: appliedCode,
        total_cents: totalCents,
        shipping_address: shippingAddress,
      })
      .select('id')
      .single();

    if (insErr || !order) {
      console.error('[orders-db] placeOrder:', insErr?.message);
      // Earlier lines already exist; report rather than pretend it all failed.
      if (created.length) break;
      return { ok: false, error: 'insert_failed' };
    }

    await db.from('order_items').insert({
      order_id: order.id,
      product_id: line.productId,
      product_name: line.productName,
      quantity: line.quantity,
      unit_price_cents: Math.round(line.perCycle * 100),
      cadence: line.cadence,
      cadence_label: line.cadenceLabel,
      image: line.image,
      swatch: line.swatch,
    });

    await appendUpdate(
      order.id,
      'System',
      'system',
      'Order received',
      'Nothing charged. Your prescriber is reviewing.',
      'pending-admin',
    );

    created.push(orderNumber);
    bookedTotalCents += totalCents;
    bookedShippingCents += shippingCents;
    bookedDiscountCents += Math.min(itemDiscountCents, subtotalCents) + (freeShipping ? shippingCents : 0);
  }

  // ponytail: a code claimed for a basket that then failed to insert stays
  // spent; hand it back here if that ever happens outside a database outage.
  if (!created.length) return { ok: false, error: 'insert_failed' };

  // One email for the basket, however many orders it became.
  if (user.email) {
    const msg = orderReceivedEmail({
      firstName: (user.name ?? '').trim().split(/\s+/)[0] || 'there',
      orderNumber: created.join(', '),
      items: lines.map((l) => ({
        name: l.productName,
        qty: l.quantity,
        amount: Math.round(l.perCycle * 100) * (l.quantity ?? 1),
      })),
      shipping: bookedShippingCents,
      discount: bookedDiscountCents,
      total: bookedTotalCents,
    });
    await sendEmail({ to: user.email, subject: msg.subject, html: msg.html });
  }

  // A renewal: the plan that lapsed into review is replaced by this order (and the plan it starts).
  await db
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('user_id', user.id)
    .in('product_id', ids)
    .eq('status', 'pending_review');

  // Each one goes to the prescriber as its own decision.
  for (const orderNumber of created) {
    await releaseToDoctor(orderNumber);
  }

  revalidatePortal();
  return { ok: true, orderNumber: created[0] };
}

/** Admin approves and releases the order for sign-off. */
export async function approveOrderAction(
  orderNumber: string,
  physicianId?: string,
  note?: string,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };

  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const moved = await moveOrder(id, ORDER_FROM.approve, {
    status: 'assigned',
    assigned_physician_id: physicianId ?? null,
    admin_note: note ?? null,
  });
  if (!moved) return { ok: false, error: 'order_moved_on' };

  await appendUpdate(id, user.name, 'admin', 'Confirmed', note ?? 'Released for compounding.', 'assigned');
  revalidatePortal();
  return { ok: true };
}

/** Admin declines the order. */
export async function denyOrderAction(
  orderNumber: string,
  note: string,
): Promise<ActionResult & { refunded?: boolean; refundError?: string; cancelByHand?: boolean }> {
  const { user, error } = await requireRole(['admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const reason = note.trim();
  if (!reason) return { ok: false, error: 'no_reason' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('member_name, member_email')
    .eq('id', id)
    .maybeSingle();

  // The pay link dies with the order, so it cannot be paid after the fact.
  const moved = await moveOrder(id, ORDER_FROM.deny, {
    status: 'denied-admin',
    admin_note: reason,
    pay_token: null,
    pay_token_expires: null,
  });
  if (!moved) return { ok: false, error: 'order_moved_on' };
  await appendUpdate(id, user.name, 'admin', 'Cancelled', reason, 'denied-admin');
  await voidPlanForOrder(id);
  // Off the board, and cancelled at the pharmacy if it already went and hasn't shipped.
  const { cancelByHand } = await withdrawFromPharmacy(orderNumber);

  // Whatever was charged goes back, described the way it actually happened.
  const refund = await refundDeclinedOrder(
    orderNumber,
    'Our team cancelled this order.',
  );

  if (order?.member_email) {
    const msg = orderCancelledByTeamEmail({
      firstName: (order.member_name ?? '').trim().split(/\s+/)[0] || 'there',
      orderNumber,
      reason,
      refunded: refund.refunded === true,
    });
    try {
      await sendEmail({ to: order.member_email, subject: msg.subject, html: msg.html });
    } catch {
      // The cancellation stands; the notice is best effort.
    }
  }

  revalidatePortal();
  return {
    ok: true,
    refunded: refund.refunded === true,
    refundError: refund.ok ? undefined : refund.error,
    cancelByHand,
  };
}

/** Physician signs. This is the moment billing starts. */
/**
 * The prescriber asks the patient for something before he decides.
 *
 * His only two options were sign or decline, so a case that just needed one
 * more answer had to be declined — a clinical refusal recorded against someone
 * whose only problem was an incomplete history. The order stays in his queue;
 * nothing is charged and nothing moves.
 */
export async function requestInfoFromPatientAction(
  orderNumber: string,
  question: string,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['doctor']);
  if (error || !user) return { ok: false, error: 'not_authorized' };

  const text = question.trim();
  if (!text) return { ok: false, error: 'empty' };

  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('user_id, member_name, member_email')
    .eq('id', id)
    .maybeSingle();
  if (!order?.user_id) return { ok: false, error: 'no_patient' };

  // Into their existing thread with the prescriber, so the answer comes back
  // to the same place rather than to a support inbox.
  await db.from('messages').insert({
    thread_user_id: order.user_id,
    sender_id: user.id,
    channel: 'doctor',
    body: text,
  });

  await appendUpdate(
    id,
    user.name,
    'physician',
    'Your prescriber has a question',
    text,
  );

  if (order.member_email) {
    const msg = prescriberMessageEmail();
    try {
      await sendEmail({
        to: order.member_email,
        subject: msg.subject,
        html: msg.html,
      });
    } catch {
      // The message is in their portal either way.
    }
  }

  revalidatePortal();
  return { ok: true };
}

/**
 * The prescriber asks for photos (hair, skin). Photos are never required up
 * front; this flags the member's newest intake so the portal asks for them
 * (Add your photos, /portal/visit), and tells the member in their thread with
 * him and by email. The order stays with him until he decides.
 */
export async function requestPhotosAction(orderNumber: string): Promise<ActionResult> {
  const { user, error } = await requireRole(['doctor']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('user_id, member_name, member_email')
    .eq('id', id)
    .maybeSingle();
  if (!order?.user_id) return { ok: false, error: 'no_patient' };

  const { data: intake } = await db
    .from('intake_submissions')
    .select('id, answers')
    .eq('user_id', order.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!intake) return { ok: false, error: 'no_intake' };
  const answers = (intake.answers && typeof intake.answers === 'object' && !Array.isArray(intake.answers)
    ? intake.answers
    : {}) as Record<string, unknown>;
  await db
    .from('intake_submissions')
    .update({ answers: { ...answers, photosRequested: true } as unknown as Json })
    .eq('id', intake.id);

  const text = 'Could you add a few photos so I can finish your review? It takes about two minutes on your phone, and only your care team sees them.';
  await db.from('messages').insert({
    thread_user_id: order.user_id,
    sender_id: user.id,
    channel: 'doctor',
    body: `${text} Add them here: ${SITE_URL}/portal/visit`,
  });
  await appendUpdate(id, user.name, 'physician', 'Your prescriber asked for photos', text);

  if (order.member_email) {
    const msg = prescriberMessageEmail();
    try {
      await sendEmail({ to: order.member_email, subject: msg.subject, html: msg.html });
    } catch {
      // The request is in their portal either way.
    }
  }

  revalidatePortal();
  return { ok: true };
}

export async function signRxAction(
  orderNumber: string,
  note: string | undefined,
  firstChargeAmount: number,
  password: string,
  /** The sig. The pharmacist verifies the compound against it, so it is required. */
  directions: string,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['doctor']);
  if (error || !user) return { ok: false, error: 'not_authorized' };

  const sig = (directions ?? '').trim().replace(/\s+/g, ' ');
  if (!sig) return { ok: false, error: 'no_directions' };
  if (sig.length > 1000) return { ok: false, error: 'directions_too_long' };

  /*
   * The signature, not the session, is what a board asks about. Thirty idle
   * minutes is comfortable for reading a chart and far too long to accept as
   * evidence that the prescriber is the one signing it.
   */
  if (!(await signWindowOpen(user.id))) {
    if (!(await passwordMatches(user.email, password))) {
      return { ok: false, error: 'bad_password' };
    }
  }
  // Rolls forward with each signature, so a morning's queue is one password.
  await openSignWindow(user.id);

  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  /*
   * A product withheld or pulled back to draft after the order was placed is
   * not something he can prescribe from here, whatever the queue still shows.
   */
  const db = createSupabaseAdminClient();
  const [{ data: items }, live] = await Promise.all([
    db.from('order_items').select('product_id').eq('order_id', id),
    getLiveProducts(),
  ]);
  const liveIds = new Set(live.map((p) => p.id));
  if (!items?.length || items.some((i) => !liveIds.has(String(i.product_id)))) {
    // He cannot fix this; admin can (put it back on sale, or cancel the order).
    await alertCareTeam({
      orderNumber,
      eyebrow: 'Cannot sign',
      heading: 'The prescriber cannot sign an order for a pulled product',
      body: 'A product on this order is no longer live. Put it back on sale in Admin → Products, or cancel the order.',
    });
    return { ok: false, error: 'product_unavailable' };
  }

  const moved = await moveOrder(id, ORDER_FROM.sign, {
    status: 'signed',
    physician_note: note ?? null,
    // Not paid_at: signing is not payment. The webhook writes paid_confirmed_at.
    first_charge_cents: Math.round(firstChargeAmount * 100),
  });
  if (!moved) return { ok: false, error: 'order_moved_on' };

  await appendUpdate(
    id,
    user.name,
    'physician',
    'Order approved',
    note ?? 'Your prescriber approved your treatment.',
    'signed',
  );

  /*
   * The member saved a card at checkout and authorised exactly this: charge
   * once a prescriber approves. Ship only if the money actually moved — a
   * failed charge emails a pay link and alerts the team, and the webhook
   * submits to the pharmacy once that link is used.
   */
  /*
   * The prescription is written before the money moves. It is the clinical
   * record of what he just decided, and it is what a refill ships against —
   * without it a plan reaches its second cycle with nothing to renew from.
   */
  await writePrescriptionForOrder(orderNumber, user.id, sig);

  // The signing itself belongs in the trail admin reads, not only the order.
  await recordAudit([
    {
      actorId: user.id,
      actorName: user.name,
      actorRole: 'doctor',
      entity: 'order',
      entityId: id,
      field: 'prescription signed',
      oldValue: null,
      newValue: orderNumber,
    },
  ]);

  const charge = await chargeOnApproval(orderNumber);
  if (charge.charged) await autoSubmitToPharmacy(orderNumber);
  else if (!charge.ok || charge.error === 'no_card_on_file') {
    /*
     * A declined card already alerts the team and notes the timeline. No card
     * at all, or a charge that never started, did neither: a signed order
     * just sat unpaid. (The hourly sweep catches anything left after 48h.)
     */
    if (charge.error === 'no_card_on_file') {
      await appendUpdate(
        id,
        'System',
        'system',
        'Charge failed after approval',
        'No card on file. Member emailed a payment link. Will not ship until paid.',
      );
    }
    await alertCareTeam({
      orderNumber,
      eyebrow: 'Unpaid',
      heading: 'An approved order was not charged',
      body:
        charge.error === 'no_card_on_file'
          ? 'There was no card on file. The member was emailed a payment link; it ships once they pay.'
          : `The charge could not start (${charge.error ?? 'unknown'}). Collect payment before it ships.`,
    });
  }

  revalidatePortal();
  return { ok: true };
}

/** Physician declines on clinical grounds. */
export async function declineClinicalAction(
  orderNumber: string,
  note: string,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['doctor']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('user_id, member_name, member_email')
    .eq('id', id)
    .maybeSingle();

  const moved = await moveOrder(id, ORDER_FROM.declineClinical, {
    status: 'declined-clinical',
    physician_note: note,
    pay_token: null,
    pay_token_expires: null,
  });
  if (!moved) return { ok: false, error: 'order_moved_on' };
  await appendUpdate(id, user.name, 'physician', 'Declined', note, 'declined-clinical');
  await voidPlanForOrder(id);
  // His words go to their thread with him, where they can reply; email only points there.
  if (order?.user_id && note.trim()) {
    await db.from('messages').insert({
      thread_user_id: order.user_id,
      sender_id: user.id,
      channel: 'doctor',
      body: note.trim(),
    });
  }

  // Refund in full, immediately. The checkout copy promises exactly this, and
  // a promise that waits on someone remembering to click refund is not one.
  await refundDeclinedOrder(orderNumber);

  /*
   * The member must hear about a decline, but his reason is clinical: it is in
   * their portal thread and on the order, and the email says where.
   */
  if (order?.member_email) {
    const msg = prescriberMessageEmail();
    try {
      await sendEmail({ to: order.member_email, subject: msg.subject, html: msg.html });
    } catch {
      // The note is on their order either way.
    }
  }

  revalidatePortal();
  return { ok: true };
}

/**
 * A note on the order's timeline from the prescriber or admin ("Pharmacy
 * delayed a day"). The member reads it on their order page.
 */
export async function addOrderNoteAction(orderNumber: string, note: string): Promise<ActionResult> {
  const { user, error } = await requireRole(['doctor', 'admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const text = (note ?? '').trim();
  if (!text) return { ok: false, error: 'empty' };
  if (text.length > 2000) return { ok: false, error: 'too_long' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };
  await appendUpdate(id, user.name, user.role === 'doctor' ? 'physician' : 'admin', 'Update', text);
  revalidatePortal();
  return { ok: true };
}

/**
 * Admin, the prescriber or the pharmacy moves the order through compounding,
 * shipping and delivery. Same path as the orders board, so the shipment row,
 * the member's timeline and their emails stay in step whichever portal clicks.
 */
export async function advanceOrderAction(
  orderNumber: string,
  to: Extract<OrderStatus, 'compounding' | 'shipped' | 'delivered'>,
  opts?: { note?: string; carrier?: string; tracking?: string },
): Promise<ActionResult> {
  const { user, error } = await requireRole(['pharmacy', 'admin', 'doctor']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const res = await advanceFulfillment({
    orderNumber,
    step: to === 'compounding' ? 'placed' : to,
    actorName: user.name,
    actorRole: user.role as 'admin' | 'doctor' | 'pharmacy',
    carrier: opts?.carrier,
    tracking: opts?.tracking,
    note: opts?.note,
  });
  revalidatePortal();
  return res.ok ? { ok: true } : { ok: false, error: res.message };
}
