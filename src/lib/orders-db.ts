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
  declinedEmail,
  noticeEmail,
  orderCancelledByTeamEmail,
  orderReceivedEmail,
  sendEmail,
  unfinishedVisitEmail,
} from '@/lib/email';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth-server';
import { allow, clientKey, LIMITS } from '@/lib/rate-limit';
import type { Order, OrderLine, OrderStatus, OrderUpdate, UpdateAuthorRole } from '@/lib/orders';
import { SERVICEABLE_STATES } from '@/lib/intakeSchema';
import { zipInState } from '@/lib/intake-rules';
import { cadenceTiersForProduct } from '@/lib/shopProducts';
import { getLiveProducts } from '@/lib/catalog';
import { orderTotalCents, shippingChargeCents } from '@/lib/shipping';
import { getShippingSettings } from '@/lib/shipping-settings';
import { FIRST_BOX_FREE, firstBoxFree } from '@/lib/first-box';
import { checkPromoAction } from '@/lib/promo-db';
import { redeemPromo } from '@/lib/promo-redeem';
import {
  MAX_LINE_QUANTITY,
  MAX_ORDER_LINES,
  ORDER_FROM,
  TERMINAL_ORDER,
  shippingAddressError,
} from '@/lib/order-rules';
import type { Database } from '@/lib/database.types';
import { releaseToDoctor } from '@/lib/release-to-doctor';
import { canOrder, intakeStateFor, latestIntakeAnswers, reassessNeeded } from '@/lib/intake-status';
import { heldProductsFor } from '@/lib/held-products';
import { intakeCovers } from '@/lib/purchase-rules';
import { claimCheckout, releaseCheckout } from '@/lib/order-lock';
import { SITE_URL } from '@/lib/site';
import { memberTextsAllowed, sendSms } from '@/lib/sms';
import { getHiddenOrders, setOrderVisibility, type OrderVisibility } from '@/lib/order-visibility';
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
    cadenceLabel: String(row.cadence_label ?? '1 month plan'),
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

/*
 * Staff read through the server (service role) only after getSession(), which
 * enforces their sign-in code; their database role grants nothing on its own
 * (migration 0032), so a staff password alone can't read charts through the
 * REST API. Members read their own rows with their session, under RLS, and
 * the query names them too.
 */
async function ordersReader() {
  const user = await getSession();
  if (!user) return null;
  if (user.role === 'admin' || user.role === 'doctor') return { db: createSupabaseAdminClient(), userId: null };
  return { db: await createSupabaseServerClient(), userId: user.id };
}

/** Every order the caller is allowed to see: their own, or all of them for doctor/admin. */
export async function listOrders(): Promise<Order[]> {
  if (!supabaseConfigured) return [];
  const r = await ordersReader();
  if (!r) return [];
  let q = r.db.from('orders').select(SELECT);
  if (r.userId) q = q.eq('user_id', r.userId);
  const [{ data, error }, hidden] = await Promise.all([q.order('created_at', { ascending: false }), getHiddenOrders()]);
  if (error) {
    console.error('[orders-db] listOrders:', error.message);
    return [];
  }
  return (data ?? [])
    .map((r) => mapOrder(r as OrderRow))
    .filter((o) => hidden[o.id] !== 'deleted')
    .map((o) => (hidden[o.id] === 'archived' ? { ...o, archived: true } : o));
}

/** One order by its human-readable order number. */
export async function getOrder(orderNumber: string): Promise<Order | null> {
  if (!supabaseConfigured) return null;
  const r = await ordersReader();
  if (!r) return null;
  let q = r.db.from('orders').select(SELECT).eq('order_number', String(orderNumber));
  if (r.userId) q = q.eq('user_id', r.userId);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  // A deleted (test) order is gone for members; staff can still open it to restore it.
  if (r.userId && (await getHiddenOrders())[String(orderNumber)] === 'deleted') return null;
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
/** "About order #1055 (Enclomiphene)": heads his messages, so a patient with two orders knows which one. */
async function orderLabel(orderId: string): Promise<string> {
  const db = createSupabaseAdminClient();
  const [{ data: o }, { data: items }] = await Promise.all([
    db.from('orders').select('order_number').eq('id', orderId).maybeSingle(),
    db.from('order_items').select('product_name').eq('order_id', orderId),
  ]);
  const names = (items ?? []).map((i) => i.product_name).filter(Boolean).join(', ');
  return o ? `About order #${o.order_number}${names ? ` (${names})` : ''}:` : '';
}

/** A doctor acts only on orders assigned to them, or not yet assigned to anyone. */
async function assignedToMe(orderId: string, doctorId: string): Promise<boolean> {
  const { data } = await createSupabaseAdminClient().from('orders').select('assigned_physician_id').eq('id', orderId).maybeSingle();
  return Boolean(data) && (!data!.assigned_physician_id || data!.assigned_physician_id === doctorId);
}

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
  /** The terms and recurring-charge agreements, as rendered at checkout. */
  consent?: { terms: string; charges: string };
}): Promise<ActionResult & { orderNumber?: string; productId?: string }> {
  const { user, error } = await requireRole(['member']);
  if (error || !user) return { ok: false, error: 'not_authorized' };

  // ROSCA / NY GBL 527-a: no recurring order without the express agreement, and a record of what was agreed.
  const consent = {
    terms: String(input.consent?.terms ?? '').replace(/\s+/g, ' ').trim().slice(0, 4000),
    charges: String(input.consent?.charges ?? '').replace(/\s+/g, ' ').trim().slice(0, 4000),
  };
  if (supabaseAdminConfigured() && (!consent.terms || !consent.charges)) return { ok: false, error: 'consent_required' };

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
  // The ZIP must belong to that state too: carriers route by ZIP, so "NJ" with a California ZIP ships to California.
  if (!zipInState(shippingAddress.zip, shipState)) {
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
  // Declined, cancelled since, or answers too old: back through its questions first (pre-filled).
  const redo = supabaseAdminConfigured() ? await reassessNeeded(user.id) : new Map();
  const reassess = ids.find((id) => redo.has(id));
  if (reassess) return { ok: false, error: 'reassess', productId: reassess };

  /*
   * Name, plan and price come from the catalogue, never from the request.
   * The browser sends what it displayed; this is what gets charged, so an
   * edited request can't set its own price, and a price changed in
   * Admin → Products applies from the next order.
   */
  const shipSettings = await getShippingSettings();
  const lines: OrderLine[] = input.lines.map((l) => {
    const product = live.get(l.productId)!;
    const tiers = cadenceTiersForProduct(product, shipSettings.pricePerShipment);
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
  // One use per member: a shared code isn't a discount on every order and refill.
  if (appliedCode) {
    const { count } = await createSupabaseAdminClient()
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('promo_code', appliedCode)
      .not('status', 'in', '(canceled,refunded,denied-admin,declined-clinical)');
    if ((count ?? 0) > 0) return { ok: false, error: 'promo_unavailable' };
  }

  if (appliedCode && !(await redeemPromo(appliedCode))) {
    return { ok: false, error: 'promo_unavailable' };
  }

  /*
   * Shipping and tax are set here, not taken from the request. Shipping is per
   * box at the price in Admin → Settings (one box per order, a 12 month plan
   * included). A member's first order ships its first box free: the first line of the basket takes it (lib/first-box), the rest
   * pay. The promo only touches shipping when it waives it. No sales tax is charged: prescription
   * drugs are exempt in every state we serve (NJ, NY, PA, MI). If a taxable
   * item is ever sold, compute it here (with a tax-rate service) rather
   * than trusting a number the browser sent.
   */
  const cartTaxCents = 0;
  const freeBox = await firstBoxFree(user.id);

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
    const firstOrder = freeBox && i === 0;
    const shippingCents = shippingChargeCents({ pricePerShipment: shipSettings.pricePerShipment, firstOrder });
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
    // Marks the order that took the free box, so another open order can't (lib/first-box).
    if (firstOrder) {
      await appendUpdate(order.id, 'System', 'system', FIRST_BOX_FREE, 'Free shipping on your first order.');
    }

    if (consent.terms) {
      await recordAudit([
        {
          actorId: user.id,
          actorName: user.name,
          actorRole: 'member',
          entity: 'order',
          entityId: orderNumber,
          field: 'checkout consent',
          oldValue: null,
          newValue: JSON.stringify({ at: new Date().toISOString(), ip: await clientKey(), terms: consent.terms, charges: consent.charges }),
        },
      ]);
    }

    created.push(orderNumber);
    bookedTotalCents += totalCents;
    bookedShippingCents += shippingCents;
    bookedDiscountCents += Math.min(itemDiscountCents, subtotalCents) + (freeShipping ? shippingCents : 0);
  }

  // ponytail: a code claimed for a basket that then failed to insert stays
  // spent; hand it back here if that ever happens outside a database outage.
  if (!created.length) return { ok: false, error: 'insert_failed' };

  // One email for the basket, however many orders it became. When the health
  // questions still follow, it carries the link to them: if the browser dies
  // between checkout and the questions, the member still has the way back.
  const healthQuestions = (await intakeStateFor(user.id)) === 'awaiting_visit';
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
      healthQuestions,
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

  // Ordered items leave the saved cart here, in the same request: the browser then does a
  // plain page load to the confirmation instead of a cart-save action racing the navigation.
  const { data: prof } = await db.from('profiles').select('cart').eq('id', user.id).maybeSingle();
  if (Array.isArray(prof?.cart)) {
    const left = (prof.cart as { productId?: string }[]).filter((it) => !ids.includes(String(it?.productId)));
    await db.from('profiles').update({ cart: left as unknown as Json }).eq('id', user.id);
  }

  // No revalidatePath here: it makes the reply carry a fresh page tree, and a
  // phone dropping signal mid-reply crashed checkout (order #110006). The
  // browser does a full page load next, and every portal page reads per request.
  return { ok: true, orderNumber: created[0] };
}

/**
 * True while this order's member still owes the health questions that follow
 * checkout (newest intake 'awaiting_visit'). Approving or signing then would
 * skip them. Errors count as open: fail closed.
 */
async function healthQuestionsOpen(orderId: string): Promise<boolean> {
  const db = createSupabaseAdminClient();
  const { data: order, error } = await db.from('orders').select('user_id, created_at').eq('id', orderId).maybeSingle();
  if (error) return true;
  if (!order?.user_id) return false;
  const { data: intake, error: intakeErr } = await db
    .from('intake_submissions')
    .select('status, created_at')
    .eq('user_id', order.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (intakeErr) return true;
  // Only this order's own questions hold it: an assessment started after the order is for another product.
  return intake?.status === 'awaiting_visit' && Date.parse(intake.created_at) <= Date.parse(order.created_at);
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
  if (await healthQuestionsOpen(id)) return { ok: false, error: 'health_questions_open' };

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
  /** False: cancel quietly, so admin can write the member their own email. */
  notify = true,
  /** False: cancel only and keep the payment (refund it separately with Refund, or not at all). */
  refund = true,
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
    .select('member_name, member_email, paid_confirmed_at')
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

  // Whatever was charged goes back (unless admin chose to keep it), described the way it actually happened.
  const refunded = refund
    ? await refundDeclinedOrder(orderNumber, 'Our team cancelled this order.')
    : { ok: true, refunded: false as const };

  if (notify && order?.member_email) {
    const msg = orderCancelledByTeamEmail({
      firstName: (order.member_name ?? '').trim().split(/\s+/)[0] || 'there',
      orderNumber,
      reason,
      refunded: refunded.refunded === true,
      chargeKept: !refund && Boolean(order.paid_confirmed_at),
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
    refunded: refunded.refunded === true,
    refundError: refunded.ok ? undefined : 'error' in refunded ? refunded.error : undefined,
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
    body: [await orderLabel(id), text].filter(Boolean).join('\n\n'),
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
 * The prescriber prescribes something other than what was ordered — a different
 * product, strength or plan — after talking it through with the patient in
 * their thread. Only before he signs: the order's line and money are rewritten
 * here from the catalogue (same rules as placeOrder: shipping per box, the free
 * first box kept, the promo's terms re-applied to the new price), so the charge
 * at signing, the prescription, the plan and the pharmacy order all follow the
 * new choice. The patient gets his note, the change and the new price in their
 * thread and by email before anything is charged.
 */
export async function changePrescriptionAction(
  orderNumber: string,
  productId: string,
  cadence: string,
  note: string,
): Promise<ActionResult & { total?: number }> {
  const { user, error } = await requireRole(['doctor']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const why = (note ?? '').trim();
  if (!why) return { ok: false, error: 'no_note' };
  if (why.length > 1000) return { ok: false, error: 'note_too_long' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, user_id, status, member_email, shipping_cents, discount_cents, promo_code, total_cents')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (!order?.user_id) return { ok: false, error: 'not_found' };
  if (!(await assignedToMe(order.id, user.id))) return { ok: false, error: 'not_authorized' };
  if (!(ORDER_FROM.sign as readonly string[]).includes(order.status)) return { ok: false, error: 'not_open' };

  const { data: items } = await db
    .from('order_items')
    .select('id, product_id, product_name, cadence, cadence_label, quantity')
    .eq('order_id', order.id);
  if (items?.length !== 1) return { ok: false, error: 'multi_line' };
  const item = items[0];

  const product = (await getLiveProducts()).find((p) => p.id === productId);
  if (!product) return { ok: false, error: 'product_unavailable' };
  // Not a second copy of something already on a plan or in another order.
  if (productId !== item.product_id && (await heldProductsFor(order.user_id)).has(productId)) {
    return { ok: false, error: 'already_ordered' };
  }

  const ship = await getShippingSettings();
  const tiers = cadenceTiersForProduct(product, ship.pricePerShipment);
  const tier = tiers.find((t) => t.key === cadence) ?? tiers[0];
  const quantity = item.quantity ?? 1;
  const subtotalCents = Math.round(tier.total * 100) * quantity;

  // The free first box stays with the order: it had one if it paid less shipping than full price.
  const fullShipBefore = shippingChargeCents({ pricePerShipment: ship.pricePerShipment, firstOrder: false });
  const firstOrder = Number(order.shipping_cents ?? 0) < fullShipBefore;
  const shippingCents = shippingChargeCents({ pricePerShipment: ship.pricePerShipment, firstOrder });

  // The code they used, on its own terms (already redeemed, so not re-checked against its limit).
  let itemDiscountCents = 0;
  let freeShipping = false;
  if (order.promo_code) {
    const { data: promo } = await db
      .from('promo_codes')
      .select('kind, value, includes_shipping')
      .eq('code', order.promo_code)
      .maybeSingle();
    if (promo) {
      freeShipping = Boolean(promo.includes_shipping);
      // A percent code re-applies to the new price. A fixed amount was split across the basket at
      // checkout, so this order keeps its own share (its discount less any waived shipping), not the whole code.
      const share = Math.max(0, Number(order.discount_cents ?? 0) - (freeShipping ? Number(order.shipping_cents ?? 0) : 0));
      const raw = promo.kind === 'percent' ? Math.round((subtotalCents * promo.value) / 100) : share;
      itemDiscountCents = Math.max(0, Math.min(raw, subtotalCents));
    }
  }
  const totalCents = orderTotalCents({ subtotalCents, shippingCents, taxCents: 0, discountCents: itemDiscountCents, freeShipping });
  const discountCents = itemDiscountCents + (freeShipping ? shippingCents : 0);

  const { error: itemErr } = await db
    .from('order_items')
    .update({
      product_id: product.id,
      product_name: product.name,
      unit_price_cents: Math.round(tier.total * 100),
      cadence: tier.key,
      cadence_label: tier.label,
      image: product.image,
      swatch: product.swatch,
    })
    .eq('id', item.id);
  if (itemErr) return { ok: false, error: 'update_failed' };
  await db
    .from('orders')
    .update({ subtotal_cents: subtotalCents, shipping_cents: shippingCents, tax_cents: 0, discount_cents: discountCents, total_cents: totalCents })
    .eq('id', order.id);

  const before = `${item.product_name}, ${item.cadence_label}`;
  const after = `${product.name}, ${tier.label}`;
  const price = `$${(totalCents / 100).toFixed(2)}`;
  await recordAudit([
    { actorId: user.id, actorName: user.name, actorRole: 'doctor', entity: 'order', entityId: orderNumber, field: 'prescription changed', oldValue: `${before} ($${(Number(order.total_cents) / 100).toFixed(2)})`, newValue: `${after} (${price})` },
  ]);
  await appendUpdate(order.id, user.name, 'physician', 'Your prescriber changed your prescription', `${after}. ${price}, charged only when he signs.`);

  // Into their thread with him, so they can answer before he signs.
  await db.from('messages').insert({
    thread_user_id: order.user_id,
    sender_id: user.id,
    channel: 'doctor',
    body: `${why}\n\nI've changed your prescription from ${before} to ${after}. The new total is ${price}, charged only when I sign. Reply here if you have any questions.`,
  });
  if (order.member_email) {
    const msg = prescriberMessageEmail();
    try {
      await sendEmail({ to: order.member_email, subject: msg.subject, html: msg.html });
    } catch {
      // The message is in their portal either way.
    }
  }

  revalidatePortal();
  return { ok: true, total: totalCents / 100 };
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
    if (!(await allow('login', LIMITS.login, user.id)) || !(await passwordMatches(user.email, password))) {
      return { ok: false, error: 'bad_password' };
    }
  }
  // Rolls forward with each signature, so a morning's queue is one password.
  await openSignWindow(user.id);

  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };
  if (!(await assignedToMe(id, user.id))) return { ok: false, error: 'not_authorized' };
  if (await healthQuestionsOpen(id)) return { ok: false, error: 'health_questions_open' };

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
  if (!(await assignedToMe(id, user.id))) return { ok: false, error: 'not_authorized' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('user_id, member_name, member_email, paid_at')
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
      body: [await orderLabel(id), note.trim()].filter(Boolean).join('\n\n'),
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
    const { data: items } = await db.from('order_items').select('product_name').eq('order_id', id);
    const msg = declinedEmail({
      firstName: (order.member_name ?? '').split(' ')[0] || 'there',
      orderNumber,
      products: (items ?? []).map((i) => i.product_name).filter(Boolean).join(', ') || undefined,
      refunded: Boolean(order.paid_at),
    });
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

const REMINDER_SMS = `Eternal Longevity: your order is waiting on a few quick health questions (about 2 min) before your doctor can review it. Nothing is charged yet. ${SITE_URL}/portal/visit Reply STOP to opt out.`;

/** The health-question reminder for one order, exactly as it would go out. */
async function healthReminderDraft(orderNumber: string) {
  const db = createSupabaseAdminClient();
  const { data: o } = await db
    .from('orders')
    .select('id, user_id, status, member_email, member_name')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (!o) return { error: 'not_found' } as const;
  if (o.status !== 'awaiting-visit') return { error: 'Their health questions are already in.' } as const;
  if (!o.member_email) return { error: 'No email on this order.' } as const;
  const firstName = (o.member_name ?? '').trim().split(/\s+/)[0] || 'there';
  const email = unfinishedVisitEmail({ firstName, visitUrl: `${SITE_URL}/portal/visit` });
  // A text only if they agreed to texts (TCPA). No name or treatment in it.
  const { data: prof } = o.user_id ? await db.from('profiles').select('phone').eq('id', o.user_id).maybeSingle() : { data: null };
  const smsBlocked = !prof?.phone
    ? 'No phone number on file.'
    : !(await memberTextsAllowed(db, o.user_id))
      ? 'They didn’t agree to texts, so we can’t text them.'
      : null;
  return { db, o, email, phone: prof?.phone ?? null, smsBlocked } as const;
}

export type HealthReminderPreview = {
  ok: boolean;
  error?: string;
  to?: string;
  subject?: string;
  html?: string;
  /** Last 4 digits only. */
  phoneLast4?: string;
  sms?: string;
  /** Why no text can go, when it can't. */
  smsBlocked?: string | null;
};

/** Admin: what the reminder email and text will say, before sending. */
export async function previewHealthReminderAction(orderNumber: string): Promise<HealthReminderPreview> {
  const { user, error } = await requireRole(['admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const d = await healthReminderDraft(orderNumber);
  if ('error' in d) return { ok: false, error: d.error };
  return {
    ok: true,
    to: d.o.member_email ?? '',
    subject: d.email.subject,
    html: d.email.html,
    phoneLast4: d.phone ? d.phone.replace(/\D/g, '').slice(-4) : undefined,
    sms: REMINDER_SMS,
    smsBlocked: d.smsBlocked,
  };
}

/**
 * Admin: send the "answer the health questions" reminder now, by email and/or
 * text, for an order still waiting on them. The email counts as the next step
 * of the daily reminder sequence (cron/recovery), so the automatic ones don't
 * double up.
 */
export async function remindHealthQuestionsAction(
  orderNumber: string,
  send: { email: boolean; text: boolean } = { email: true, text: true },
): Promise<ActionResult & { message?: string }> {
  const { user, error } = await requireRole(['admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  if (!send.email && !send.text) return { ok: false, error: 'Pick email, text or both.' };
  const d = await healthReminderDraft(orderNumber);
  if ('error' in d) return { ok: false, error: d.error };
  const { db, o } = d;
  const done: string[] = [];

  if (send.email) {
    const sent = await sendEmail({ to: o.member_email!, subject: d.email.subject, html: d.email.html });
    if (!sent.ok) return { ok: false, error: 'The email did not send. Try again in a minute.' };
    done.push('Email sent.');
    try {
      const { data: intake } = o.user_id
        ? await db
            .from('intake_submissions')
            .select('id')
            .eq('user_id', o.user_id)
            .eq('status', 'awaiting_visit')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };
      const ref = intake?.id ?? orderNumber;
      const { data: prior } = await db.from('email_sends').select('step').eq('stage', 'visit').eq('ref', ref);
      const step = Math.max(-1, ...(prior ?? []).map((r) => r.step)) + 1;
      await db.from('email_sends').insert({ email: o.member_email!.toLowerCase(), stage: 'visit', ref, step });
    } catch {
      // Best effort: at worst the daily run sends its own reminder too.
    }
  }

  let texted = false;
  if (send.text) {
    if (d.smsBlocked || !d.phone) done.push(`No text: ${d.smsBlocked ?? 'no phone number on file.'}`);
    else {
      texted = (await sendSms(d.phone, REMINDER_SMS)).ok;
      done.push(texted ? 'Text sent.' : 'The text did not send.');
    }
  }

  const how = [send.email && 'email', texted && 'text'].filter(Boolean).join(' and ');
  if (how) await appendUpdate(o.id, user.name, 'admin', 'Reminder sent', `Sent a reminder by ${how} to answer the health questions.`);
  revalidatePortal();
  return { ok: true, message: done.join(' ') };
}

/**
 * Admin: send an order still waiting on the health questions to the
 * prescriber anyway, so it isn't stuck while the member misses the email.
 * He sees it and can message them; signing still waits for the questions
 * (healthQuestionsOpen), since they carry the safety screen.
 */
export async function sendToPrescriberAnywayAction(orderNumber: string): Promise<ActionResult> {
  const { user, error } = await requireRole(['admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const db = createSupabaseAdminClient();
  const { data: o } = await db.from('orders').select('status').eq('order_number', orderNumber).maybeSingle();
  if (!o) return { ok: false, error: 'Order not found.' };
  if (o.status !== 'awaiting-visit') return { ok: false, error: 'It isn’t waiting on health questions any more.' };
  const res = await releaseToDoctor(orderNumber, { anyway: true });
  if (!res.ok) return { ok: false, error: res.error ?? 'Could not send it.' };
  await recordAudit([
    { actorId: user.id, actorName: user.name, actorRole: 'admin', entity: 'order', entityId: orderNumber, field: 'Status', oldValue: 'awaiting-visit', newValue: 'assigned (sent anyway)' },
  ]);
  revalidatePortal();
  return { ok: true };
}

/**
 * Admin: archive, delete or restore an order (Shopify style). Delete is for
 * test orders and only once an order is closed; it hides the order everywhere
 * and takes it out of revenue and profit, but keeps the record.
 */
export async function setOrderVisibilityAction(orderNumber: string, to: OrderVisibility | null): Promise<ActionResult> {
  const { user, error } = await requireRole(['admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  if (to !== null && to !== 'archived' && to !== 'deleted') return { ok: false, error: 'bad_visibility' };
  const db = createSupabaseAdminClient();
  const { data: o } = await db.from('orders').select('id, status').eq('order_number', orderNumber).maybeSingle();
  if (!o) return { ok: false, error: 'Order not found.' };
  if (to === 'deleted' && ![...TERMINAL_ORDER, 'delivered'].includes(o.status as OrderStatus)) {
    return { ok: false, error: 'Cancel it first. Only closed orders can be deleted.' };
  }
  // Archiving a live order would hide work that still needs doing.
  if (to === 'archived' && ![...TERMINAL_ORDER, 'shipped', 'delivered'].includes(o.status as OrderStatus)) {
    return { ok: false, error: 'Only orders that have shipped or closed can be archived.' };
  }
  try {
    await setOrderVisibility(orderNumber, to);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not save.' };
  }
  // Audit only: the order's timeline is the member's to read.
  await recordAudit([
    { actorId: user.id, actorName: user.name, actorRole: 'admin', entity: 'order', entityId: orderNumber, field: 'Visibility', oldValue: null, newValue: to ?? 'restored' },
  ]);
  revalidatePortal();
  revalidatePath('/portal/admin/orders');
  revalidatePath('/portal/admin/analytics');
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
