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

import { revalidatePath } from 'next/cache';
import { refundDeclinedOrder } from '@/lib/order-payment';
import { chargeOnApproval } from '@/lib/pay-on-approval';
import { autoSubmitToPharmacy } from '@/lib/auto-pharmacy';
import {
  orderReceivedEmail,
  prescriberQuestionEmail,
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
import { checkPromoAction, redeemPromo } from '@/lib/promo-db';
import { releaseToDoctor } from '@/lib/release-to-doctor';
import { canOrder } from '@/lib/intake-status';
import { SITE_URL } from '@/lib/site';
import { writePrescriptionForOrder } from '@/lib/refills';
import { passwordMatches } from '@/lib/reauth';
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
    paidAt: row.paid_at ? new Date(String(row.paid_at)).getTime() : undefined,
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

/** Resolve an order_number to its uuid. */
async function orderIdFor(orderNumber: string): Promise<string | null> {
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
export async function placeOrderAction(input: {
  lines: OrderLine[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  shippingAddress: Order['shippingAddress'];
  cardLast4?: string;
  /** Promotion code the member entered, if any. */
  promoCode?: string;
  /** The saved card this order will be charged against on approval. */
  authIntentId?: string;
}): Promise<ActionResult & { orderNumber?: string }> {
  const { user, error } = await requireRole(['member']);
  if (error || !user) return { ok: false, error: 'not_authorized' };

  /*
   * Geofence, enforced server-side. The shipping dropdown only offers
   * serviceable states, but a dropdown is not a control — this is the check
   * that actually holds, and it is the one the processor is relying on.
   */
  const shipState = (input.shippingAddress.state || '').toUpperCase();
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

  if (!input.lines.length) return { ok: false, error: 'empty_cart' };

  const db = createSupabaseAdminClient();

  const lineSubtotal = (l: OrderLine) =>
    Math.round(l.perCycle * 100) * (l.quantity ?? 1);
  const cartSubtotalCents = input.lines.reduce((s, l) => s + lineSubtotal(l), 0);
  if (cartSubtotalCents <= 0) return { ok: false, error: 'empty_cart' };

  /*
   * Re-check the code here rather than trusting the total the client sent.
   * The browser computes a discounted total to display it; this is the number
   * that gets charged, so it is derived server-side from the code itself.
   */
  let cartDiscountCents = 0;
  let appliedCode: string | null = null;
  if (input.promoCode) {
    const check = await checkPromoAction(input.promoCode, cartSubtotalCents);
    if (check.ok && check.discountCents) {
      cartDiscountCents = check.discountCents;
      appliedCode = check.code ?? null;
    }
  }

  const cartShippingCents = Math.round(input.shippingCost * 100);
  const cartTaxCents = Math.round(input.tax * 100);

  // Shipping and tax belong to the basket, so they are split across it by
  // value, and the rounding remainder lands on the first order.
  const share = (total: number, i: number) => {
    if (i < input.lines.length - 1) {
      return Math.round((total * lineSubtotal(input.lines[i])) / cartSubtotalCents);
    }
    let taken = 0;
    for (let j = 0; j < input.lines.length - 1; j++) {
      taken += Math.round((total * lineSubtotal(input.lines[j])) / cartSubtotalCents);
    }
    return total - taken;
  };

  const created: string[] = [];

  for (const [i, line] of input.lines.entries()) {
    const subtotalCents = lineSubtotal(line);
    const shippingCents = share(cartShippingCents, i);
    const taxCents = share(cartTaxCents, i);
    const discountCents = share(cartDiscountCents, i);
    const totalCents = Math.max(
      0,
      subtotalCents + shippingCents + taxCents - discountCents,
    );

    const orderNumber = `EL-${Date.now().toString(36).toUpperCase()}${
      input.lines.length > 1 ? String.fromCharCode(65 + i) : ''
    }`;

    const { data: order, error: insErr } = await db
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: user.id,
        status: 'pending-admin',
        member_name: user.name,
        member_email: user.email,
        ship_state: input.shippingAddress.state,
        subtotal_cents: subtotalCents,
        shipping_cents: shippingCents,
        tax_cents: taxCents,
        discount_cents: discountCents,
        promo_code: appliedCode,
        total_cents: totalCents,
        shipping_address: input.shippingAddress,
        card_last4: input.cardLast4 ?? null,
        stripe_payment_intent_id: input.authIntentId ?? null,
      })
      .select('id')
      .single();

    if (insErr || !order) {
      console.error('[orders-db] placeOrder:', insErr?.message);
      // Earlier lines already exist; report rather than pretend it all failed.
      if (created.length) break;
      return { ok: false, error: insErr?.message ?? 'insert_failed' };
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
  }

  if (!created.length) return { ok: false, error: 'insert_failed' };

  if (appliedCode) await redeemPromo(appliedCode);

  // One email for the basket, however many orders it became.
  if (user.email) {
    const msg = orderReceivedEmail({
      firstName: (user.name ?? '').trim().split(/\s+/)[0] || 'there',
      orderNumber: created.join(', '),
      items: input.lines.map((l) => ({
        name: l.productName,
        qty: l.quantity,
        amount: Math.round(l.perCycle * 100),
      })),
      total: Math.round(input.total * 100),
    });
    await sendEmail({ to: user.email, subject: msg.subject, html: msg.html });
  }

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

  const db = createSupabaseAdminClient();
  await db
    .from('orders')
    .update({
      status: 'assigned',
      assigned_physician_id: physicianId ?? null,
      admin_note: note ?? null,
    })
    .eq('id', id);

  await appendUpdate(id, user.name, 'admin', 'Confirmed', note ?? 'Released for compounding.', 'assigned');
  revalidatePortal();
  return { ok: true };
}

/** Admin declines the order. */
export async function denyOrderAction(
  orderNumber: string,
  note: string,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  await db.from('orders').update({ status: 'denied-admin', admin_note: note }).eq('id', id);
  await appendUpdate(id, user.name, 'admin', 'Declined', note, 'denied-admin');
  // Denied before review — return the money now.
  await refundDeclinedOrder(orderNumber);
  revalidatePortal();
  return { ok: true };
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
    const msg = prescriberQuestionEmail({
      firstName: (order.member_name ?? '').trim().split(/\s+/)[0] || 'there',
      question: text,
      portalUrl: `${SITE_URL}/portal/messages`,
    });
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

export async function signRxAction(
  orderNumber: string,
  note: string | undefined,
  firstChargeAmount: number,
  password: string,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['doctor']);
  if (error || !user) return { ok: false, error: 'not_authorized' };

  /*
   * The signature, not the session, is what a board asks about. Thirty idle
   * minutes is comfortable for reading a chart and far too long to accept as
   * evidence that the prescriber is the one signing it.
   */
  if (!(await passwordMatches(user.email, password))) {
    return { ok: false, error: 'bad_password' };
  }

  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  await db
    .from('orders')
    .update({
      status: 'signed',
      physician_note: note ?? null,
      paid_at: new Date().toISOString(),
      first_charge_cents: Math.round(firstChargeAmount * 100),
    })
    .eq('id', id);

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
  await writePrescriptionForOrder(orderNumber);

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
  await db.from('orders').update({ status: 'declined-clinical', physician_note: note }).eq('id', id);
  await appendUpdate(id, user.name, 'physician', 'Declined', note, 'declined-clinical');

  // Refund in full, immediately. The checkout copy promises exactly this, and
  // a promise that waits on someone remembering to click refund is not one.
  await refundDeclinedOrder(orderNumber);
  revalidatePortal();
  return { ok: true };
}

/** Pharmacy (or admin) moves the order through compounding and shipping. */
export async function advanceOrderAction(
  orderNumber: string,
  to: Extract<OrderStatus, 'compounding' | 'shipped' | 'delivered'>,
  opts?: { note?: string; carrier?: string; tracking?: string },
): Promise<ActionResult> {
  const { user, error } = await requireRole(['pharmacy', 'admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  const patch: {
    status: OrderStatus;
    tracking_carrier?: string;
    tracking_number?: string;
  } = { status: to };
  if (opts?.carrier) patch.tracking_carrier = opts.carrier;
  if (opts?.tracking) patch.tracking_number = opts.tracking;
  await db.from('orders').update(patch).eq('id', id);

  const label =
    to === 'compounding' ? 'Compounding' : to === 'shipped' ? 'Shipped' : 'Delivered';
  const body =
    opts?.note ??
    (to === 'shipped' && opts?.tracking
      ? `${opts.carrier ?? 'Carrier'} · ${opts.tracking}`
      : undefined);

  await appendUpdate(id, user.name, 'pharmacy', label, body, to);
  revalidatePortal();
  return { ok: true };
}
