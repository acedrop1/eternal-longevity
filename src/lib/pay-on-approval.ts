import 'server-only';

/**
 * Pay-on-approval.
 *
 * Orders are placed with no payment method and no charge. When the prescriber
 * signs, we mint a single-use token, email the member a secure pay link, and
 * only then take money — so "you are only charged if a prescriber approves
 * your treatment" is enforced here, not just promised in the copy.
 *
 * The token is the credential: it is unguessable, single-use, expires in
 * seven days, and is cleared the moment payment is confirmed.
 */

import { randomBytes } from 'crypto';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { SITE_URL } from '@/lib/site';
import {
  approvedPayNowEmail,
  chargeFailedInternalEmail,
  emailConfigured,
  orderConfirmationEmail,
  sendEmail,
  SUPPORT_EMAIL,
} from '@/lib/email';
import { cardOnFile, chargeOrder, paymentsConfigured, saveCard, type CardOnFile } from '@/lib/payments';
import { getTransfer, type EncryptedCard } from '@/lib/frame';
import { allow, LIMITS } from '@/lib/rate-limit';
import { AWAITING_PAYMENT } from '@/lib/order-rules';
import { snapshotOrderCosts } from '@/lib/profit-data';
import { REFILL_CHARGE_FAILED } from '@/lib/orders';

export const TOKEN_TTL_DAYS = 7;

export interface PayableOrder {
  orderNumber: string;
  /** Server-side only: whose card pays it. */
  userId: string;
  memberName: string;
  totalCents: number;
  /** Part of totalCents. */
  shippingCents: number;
  items: { name: string; qty: number }[];
  /** 'Monthly' | 'Quarterly' | '6-month' | 'Annual' | 'One-time' — drives the billing consent copy. */
  cadenceLabel: string;
  alreadyPaid: boolean;
}

/**
 * Issue a pay link for a signed order and email it to the member. Called from
 * the prescriber's sign action; safe to call again to re-send. `email: false`
 * when the member is already in the portal and is sent straight to it.
 */
export async function issuePayLink(
  orderNumber: string,
  opts: { email?: boolean } = {},
): Promise<{
  ok: boolean;
  payUrl?: string;
  token?: string;
  error?: string;
}> {
  if (!supabaseAdminConfigured()) return { ok: false, error: 'not_configured' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, member_name, member_email, total_cents, paid_confirmed_at, status')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (!order) return { ok: false, error: 'not_found' };
  if (order.paid_confirmed_at) return { ok: false, error: 'already_paid' };
  if (!AWAITING_PAYMENT.includes(order.status)) return { ok: false, error: 'not_payable' };

  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 86400_000).toISOString();

  const { error } = await db
    .from('orders')
    .update({ pay_token: token, pay_token_expires: expires })
    .eq('id', order.id);
  if (error) return { ok: false, error: error.message };

  const payUrl = `${SITE_URL}/pay/${token}`;

  if (order.member_email && opts.email !== false) {
    const firstName = (order.member_name ?? '').trim().split(/\s+/)[0] || 'there';
    const msg = approvedPayNowEmail({
      firstName,
      orderNumber: order.order_number,
      total: order.total_cents ?? 0,
      payUrl,
    });
    await sendEmail({
      to: order.member_email,
      subject: msg.subject,
      html: msg.html,
    });
  }

  return { ok: true, payUrl, token };
}

/**
 * The member's own "Complete payment" button: their live pay link if it has
 * an hour or more left, else a fresh one (not emailed: they are already here).
 * Scoped to their own order. A refill whose charge failed is not paid here:
 * paying it would ship the cycle while its plan stays paused, and restarting
 * the plan would then charge for it again. It restarts from a fixed card.
 */
export async function payPathForMember(
  userId: string,
  orderNumber: string,
): Promise<{ path?: string; error?: 'not_configured' | 'not_found' | 'paid' | 'closed' | 'not_payable' | 'refill' }> {
  if (!supabaseAdminConfigured()) return { error: 'not_configured' };
  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, status, paid_confirmed_at, pay_token, pay_token_expires')
    .eq('order_number', orderNumber)
    .eq('user_id', userId)
    .maybeSingle();
  if (!order) return { error: 'not_found' };
  if (order.paid_confirmed_at) return { error: 'paid' };
  if (!AWAITING_PAYMENT.includes(order.status)) return { error: 'closed' };
  const { data: failed } = await db
    .from('order_updates')
    .select('id')
    .eq('order_id', order.id)
    .eq('label', REFILL_CHARGE_FAILED)
    .limit(1);
  if (failed?.length) return { error: 'refill' };

  const live =
    order.pay_token &&
    order.pay_token_expires &&
    new Date(order.pay_token_expires).getTime() > Date.now() + 3600_000;
  if (live) return { path: `/pay/${order.pay_token}` };

  const fresh = await issuePayLink(orderNumber, { email: false });
  return fresh.token ? { path: `/pay/${fresh.token}` } : { error: 'not_payable' };
}

/** Look up an order by its pay token. Returns null for expired/unknown tokens. */
export async function getOrderByPayToken(token: string): Promise<PayableOrder | null> {
  if (!supabaseAdminConfigured() || !token) return null;

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, user_id, member_name, total_cents, shipping_cents, pay_token_expires, paid_confirmed_at, status')
    .eq('pay_token', token)
    .maybeSingle();
  if (!order) return null;
  // A link outlives the order it was minted for: cancelled or declined since,
  // it is dead, not payable.
  if (!AWAITING_PAYMENT.includes(order.status) && !order.paid_confirmed_at) {
    return null;
  }

  const expired =
    order.pay_token_expires !== null &&
    new Date(order.pay_token_expires).getTime() < Date.now();
  if (expired) return null;

  const { data: items } = await db
    .from('order_items')
    .select('product_name, quantity, cadence_label')
    .eq('order_id', order.id);

  return {
    orderNumber: order.order_number,
    userId: order.user_id,
    memberName: order.member_name ?? '',
    totalCents: order.total_cents ?? 0,
    shippingCents: order.shipping_cents ?? 0,
    items: (items ?? []).map((i) => ({
      name: i.product_name,
      qty: i.quantity ?? 1,
    })),
    cadenceLabel: items?.[0]?.cadence_label ?? 'Monthly',
    alreadyPaid: Boolean(order.paid_confirmed_at),
  };
}

/* ----------------------------- card payment ------------------------------ */

type Db = ReturnType<typeof createSupabaseAdminClient>;

/** A payment that did not go through, with a message fit to show the member. */
export type PayFailure = { ok: false; error: string; message: string };

export type PayResult =
  | { ok: true; paid: true }
  /** Still being processed; the order confirms on its own when it settles. */
  | { ok: true; pending: true }
  /** The bank wants the member to approve it in the browser, then finishPaymentAction. */
  | { ok: true; requiresAction: true; clientSecret: string; transferId: string }
  | PayFailure;

const TRY_LATER: PayFailure = {
  ok: false,
  error: 'unavailable',
  message: 'We could not take the payment just now. Please try again in a minute. You will not be charged twice.',
};
const NOT_SET_UP: PayFailure = {
  ok: false,
  error: 'not_configured',
  message: 'Card payment is not available right now. Message us and we will help you pay.',
};
const FAILED_TRANSFER = new Set(['failed', 'fraud_declined', 'canceled', 'cancelled']);

/**
 * The order behind a pay link, on the rules getOrderByPayToken shows the page
 * by: known, still open, not expired. The token is the authorization, so no
 * session is required; the member clicks through from their email.
 */
async function orderForToken(
  db: Db,
  token: string,
): Promise<{ id: string; userId: string; paid: boolean; transferId: string | null } | PayFailure> {
  const dead: PayFailure = {
    ok: false,
    error: 'invalid_link',
    message: 'This payment link is no longer valid. Message us and we will send a fresh one.',
  };
  if (typeof token !== 'string' || !token) return dead;
  const { data: order } = await db
    .from('orders')
    .select('id, user_id, status, paid_confirmed_at, pay_token_expires, frame_transfer_id')
    .eq('pay_token', token)
    .maybeSingle();
  if (!order) return dead;
  const found = { id: order.id, userId: order.user_id, transferId: order.frame_transfer_id };
  if (order.paid_confirmed_at) return { ...found, paid: true };
  if (!AWAITING_PAYMENT.includes(order.status)) return dead;
  if (order.pay_token_expires && new Date(order.pay_token_expires).getTime() < Date.now()) {
    return { ok: false, error: 'expired', message: 'This payment link has expired. Message us and we will send a fresh one.' };
  }
  return { ...found, paid: false };
}

/**
 * Pay an order from its link. With a card, the member just typed it: it is
 * saved on their account (and charged for refills from now on, which the pay
 * form asks them to agree to) and charged. Without one, the card on file is
 * charged.
 *
 * chargeOrder is idempotent per order, so a double click, a reload, or the
 * approval charge still in flight reports the one charge instead of making a
 * second. Wrapped for the browser in lib/checkout-payment-actions.
 */
export async function payOrderAction(token: string, card: EncryptedCard | null): Promise<PayResult> {
  if (!paymentsConfigured()) return NOT_SET_UP;
  // The link is the only credential here, so this is where card testing would happen.
  if (!(await allow('pay', LIMITS.form, token))) {
    return { ok: false, error: 'rate_limited', message: 'Too many attempts. Please wait a few minutes and try again.' };
  }
  const db = createSupabaseAdminClient();
  const order = await orderForToken(db, token);
  if ('ok' in order) return order;
  if (order.paid) return { ok: true, paid: true };

  let paymentMethodId: string | undefined;
  if (card) {
    const saved = await saveCard(order.userId, card);
    if (!saved.ok) return { ok: false, error: saved.error, message: saved.message };
    paymentMethodId = saved.card.id;
  }
  const c = await chargeOrder(order.id, { paymentMethodId });
  switch (c.status) {
    case 'paid':
      return { ok: true, paid: true };
    case 'pending':
      return { ok: true, pending: true };
    case 'requires_action':
      return { ok: true, requiresAction: true, clientSecret: c.clientSecret, transferId: c.transferId };
    case 'declined':
      return { ok: false, error: 'declined', message: c.message };
    case 'no_card':
      return { ok: false, error: 'no_card', message: 'Enter your card details to pay.' };
    default:
      return c.code === 'not_configured' ? NOT_SET_UP : TRY_LATER;
  }
}

/**
 * The browser finished the bank's approval step: read the charge back and
 * report it. `transferId` (from payOrderAction) is how a payment that landed
 * in the meantime is still found: recording a payment burns its link.
 */
export async function finishPaymentAction(
  token: string,
  transferId?: string,
): Promise<{ ok: true; paid: boolean } | PayFailure> {
  if (!paymentsConfigured()) return NOT_SET_UP;
  const db = createSupabaseAdminClient();
  const order = await orderForToken(db, token);
  if ('ok' in order) {
    if (typeof transferId === 'string' && transferId) {
      const { data: paid } = await db
        .from('orders')
        .select('id')
        .eq('frame_transfer_id', transferId)
        .not('paid_confirmed_at', 'is', null)
        .maybeSingle();
      if (paid) return { ok: true, paid: true };
    }
    return order;
  }
  if (order.paid) return { ok: true, paid: true };
  if (!order.transferId) return { ok: false, error: 'no_payment', message: 'We could not find that payment. Please try again.' };

  /*
   * The bank said no: report it. chargeOrder would treat a failed charge as
   * room for a new attempt and charge the card on file, which the member did
   * not just ask for.
   */
  const t = await getTransfer(order.transferId);
  if (t.ok && FAILED_TRANSFER.has(t.data.status)) {
    return {
      ok: false,
      error: 'declined',
      message: t.data.failure_message ?? 'Your bank did not approve the payment. Try again or use another card.',
    };
  }
  const c = await chargeOrder(order.id);
  switch (c.status) {
    case 'paid':
      return { ok: true, paid: true };
    case 'pending':
      return { ok: true, paid: false };
    case 'requires_action':
      return { ok: false, error: 'authentication_required', message: 'Your bank still needs you to approve this payment. Please try again.' };
    case 'declined':
      return { ok: false, error: 'declined', message: c.message };
    default:
      return TRY_LATER;
  }
}

/** "Visa •••• 4242". */
function describeCard(c: CardOnFile): string {
  const brand = c.brand ? c.brand.charAt(0).toUpperCase() + c.brand.slice(1) : 'Card';
  return c.last4 ? `${brand} •••• ${c.last4}` : brand;
}

/**
 * The card the approval charge will use, as a person would describe it, or
 * null when there is none.
 *
 * `orders.card_last4` is only filled by the old manual card form. A
 * prescriber reading "no card on file" off it would be told the charge will
 * fail on every order that is actually fine, so ask the processor.
 */
export async function cardSummaryFor(userId: string): Promise<string | null> {
  try {
    const card = await cardOnFile(userId);
    return card ? describeCard(card) : null;
  } catch {
    return null;
  }
}

/**
 * The order confirmation for an order a code covered in full. Mirrors
 * lib/payment-record's sendOrderConfirmation, looked up by order id. Never
 * throws: the order is confirmed whether or not the email goes.
 */
async function sendCompedConfirmation(
  db: ReturnType<typeof createSupabaseAdminClient>,
  orderId: string,
): Promise<void> {
  if (!emailConfigured()) return;
  try {
    const { data: order } = await db
      .from('orders')
      .select('order_number, total_cents, shipping_cents, discount_cents, subtotal_cents, user_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return;
    const [{ data: profile }, { data: items }] = await Promise.all([
      db.from('profiles').select('email, full_name').eq('id', order.user_id).maybeSingle(),
      db.from('order_items').select('product_name, quantity, unit_price_cents').eq('order_id', orderId),
    ]);
    if (!profile?.email) return;
    const mail = orderConfirmationEmail({
      firstName: (profile.full_name || '').split(' ')[0] || 'there',
      orderNumber: order.order_number,
      total: order.total_cents ?? 0,
      shipping: order.shipping_cents ?? 0,
      discount: Math.min(order.discount_cents ?? 0, (order.subtotal_cents ?? 0) + (order.shipping_cents ?? 0)),
      items: (items ?? []).map((i) => ({
        name: i.product_name,
        qty: i.quantity ?? 1,
        amount: (i.unit_price_cents ?? 0) * (i.quantity ?? 1),
      })),
    });
    await sendEmail({ to: profile.email, subject: mail.subject, html: mail.html });
  } catch (err) {
    console.error('[pay-on-approval] comped confirmation email failed:', err);
  }
}

/**
 * Charge the card the member saved at checkout, now that a prescriber has
 * approved. Called from signRxAction.
 *
 * The card is the one on the member's profile rather than on the order, so a
 * member who replaced their card between ordering and approval is charged the
 * current one rather than a dead token.
 *
 * If the charge fails — expired card, insufficient funds, a bank that wants
 * the cardholder present — we fall back to emailing the pay link. A failed
 * charge must not dead-end an approved prescription.
 */
export async function chargeOnApproval(orderNumber: string): Promise<{
  ok: boolean;
  charged?: boolean;
  error?: string;
}> {
  if (!paymentsConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, member_email, member_name, total_cents, paid_confirmed_at, promo_code')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) return { ok: false, error: 'not_found' };
  if (order.paid_confirmed_at) return { ok: true, charged: false };

  /*
   * A code that covers the items and the shipping leaves nothing to charge,
   * and a card charge cannot be $0. Settle it here with the same claim
   * recordPayment makes, so it goes to the pharmacy like any paid order.
   */
  if ((order.total_cents ?? 0) === 0 && order.promo_code) {
    const { data: claimed } = await db
      .from('orders')
      .update({ paid_confirmed_at: new Date().toISOString(), pay_token: null, pay_token_expires: null })
      .eq('id', order.id)
      .is('paid_confirmed_at', null)
      .select('id');
    if (!claimed?.length) return { ok: true, charged: false };
    await db.from('orders').update({ status: 'paid' }).eq('id', order.id).in('status', AWAITING_PAYMENT);
    // Profit (admin only): no card charge, so no fee.
    await snapshotOrderCosts(db, order.id, { processor_fee_cents: 0 });
    await db.from('order_updates').insert({
      order_id: order.id,
      label: 'Order confirmed',
      body: `Covered in full by code ${order.promo_code}. Nothing was charged.`,
      author: 'System',
      author_role: 'system',
    });
    // No card payment, so nothing else sends the confirmation: send it here.
    await sendCompedConfirmation(db, order.id);
    return { ok: true, charged: true };
  }

  const amount = order.total_cents ?? 0;
  if (amount <= 0) return { ok: false, error: 'invalid_amount' };

  /*
   * One charge per order, however many times this runs: a double click, a
   * retried request, or the pay link racing it all read back the charge
   * already started (lib/payments). A charge that succeeds is recorded there,
   * the one place an order becomes paid.
   */
  const charge = await chargeOrder(order.id);
  if (charge.status === 'paid') return { ok: true, charged: true };
  // Still deciding (a fraud review): the webhook settles it either way.
  if (charge.status === 'pending') return { ok: true, charged: false };
  if (charge.status === 'no_card') {
    // Nothing saved — the emailed link is the only way through.
    await issuePayLink(orderNumber);
    return { ok: true, charged: false, error: 'no_card_on_file' };
  }

  /*
   * Declined, or the bank wants the member present to approve it (they are
   * not: the pay page handles that step), or the processor could not be
   * reached. A charge left half-way is stored on the order, so paying from the
   * link finishes it rather than charging twice.
   */
  const reason =
    charge.status === 'declined'
      ? charge.message
      : charge.status === 'requires_action'
        ? 'The bank asked the member to approve the charge.'
        : `The charge could not complete (${charge.code}).`;

  // The member gets a way to pay. The prescriber does not hear about this —
  // his work is finished and a declined card is not a clinical matter.
  await issuePayLink(orderNumber);

  await db.from('order_updates').insert({
    order_id: order.id,
    label: 'Charge failed after approval',
    body: `${reason} Member emailed a payment link. Will not ship until paid.`,
    author: 'System',
    author_role: 'system',
  });

  // Somebody has to know a signed prescription is sitting unpaid.
  const alert = chargeFailedInternalEmail({
    orderNumber: order.order_number,
    memberName: order.member_name ?? 'Member',
    memberEmail: order.member_email ?? '',
    amount,
    reason,
  });
  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: alert.subject,
      html: alert.html,
    });
  } catch {
    // The order timeline already records it.
  }

  return { ok: true, charged: false, error: reason };
}
