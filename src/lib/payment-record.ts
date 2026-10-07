import 'server-only';

/**
 * A charge succeeded: the one place an order becomes paid.
 *
 * Called twice for most charges, on purpose: by the code that confirmed the
 * charge (Frame answers in-line) and by the transfer.succeeded webhook. Every
 * write is conditional on the state it expects, so the second call finds
 * nothing to change and does nothing; no event table is needed.
 *
 * Ported from the Stripe webhook's recordPayment with the same rules:
 *   - money on a closed order, or a second payment on a paid one → refunded
 *   - an amount that isn't the order's total → never marked paid, team alerted
 *   - otherwise: claim, move forward only, snapshot costs, confirm, pharmacy
 */

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { emailConfigured, noticeEmail, orderConfirmationEmail, sendEmail, SUPPORT_EMAIL } from '@/lib/email';
import { autoSubmitToPharmacy } from '@/lib/auto-pharmacy';
import { AWAITING_PAYMENT, TERMINAL_ORDER } from '@/lib/order-rules';
import { orderRef } from '@/lib/format';
import { SITE_URL } from '@/lib/site';
import { paymentMatchesOrder } from '@/lib/payment-match';
import { snapshotOrderCosts, syncProcessorAmounts } from '@/lib/profit-data';
import { createRefund, listRefunds, type FrameTransfer } from '@/lib/frame';

type Db = ReturnType<typeof createSupabaseAdminClient>;
type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  paid_confirmed_at: string | null;
  frame_transfer_id: string | null;
  total_cents: number | null;
};

const money = (cents: number | null) => `$${((cents ?? 0) / 100).toFixed(2)}`;

export async function recordPayment(db: Db, t: FrameTransfer): Promise<void> {
  if (t.status !== 'succeeded') return;
  const orderId = t.metadata?.order_id;
  const orderNumber = t.metadata?.order_number;
  if (!orderId && !orderNumber) return; // not an order charge

  const cols = 'id, order_number, status, paid_confirmed_at, frame_transfer_id, total_cents';
  const find = async (): Promise<OrderRow | null> => {
    const q = db.from('orders').select(cols);
    const { data } = await (orderId ? q.eq('id', orderId) : q.eq('order_number', orderNumber!)).maybeSingle();
    return (data as OrderRow | null) ?? null;
  };
  const order = await find();
  if (!order) return;

  const stray =
    TERMINAL_ORDER.includes(order.status as never) ||
    (order.paid_confirmed_at !== null && order.frame_transfer_id !== t.id);
  if (stray) return refundStray(db, t, order);

  // Paid, but not this order's amount: never mark it paid on a wrong sum.
  if (!paymentMatchesOrder({ amount: t.amount, currency: 'usd' }, order)) return alertMismatch(t, order);

  /*
   * Claim the payment. Conditional on not yet being paid and not cancelled in
   * the meantime; a retry, or the webhook racing the in-line result, matches
   * no row and stops here. Burns the pay link too, so it cannot be reused.
   */
  const { data: claimed } = await db
    .from('orders')
    .update({
      frame_transfer_id: t.id,
      paid_confirmed_at: new Date().toISOString(),
      pay_token: null,
      pay_token_expires: null,
    })
    .eq('id', order.id)
    .is('paid_confirmed_at', null)
    .not('status', 'in', `(${TERMINAL_ORDER.join(',')})`)
    .select('id');
  if (!claimed?.length) {
    // Cancelled between the read and the claim: that money goes back too.
    const now = await find();
    if (now && TERMINAL_ORDER.includes(now.status as never)) await refundStray(db, t, now);
    return;
  }

  // Forward only: signed → paid. An order already further along keeps its status.
  if (AWAITING_PAYMENT.includes(order.status as never)) {
    await db.from('orders').update({ status: 'paid' }).eq('id', order.id).in('status', AWAITING_PAYMENT);
  }

  // Profit (admin only): what it cost us, frozen now, and the processor's fee.
  await snapshotOrderCosts(db, order.id);
  await syncProcessorAmounts(db, t);

  await db.from('order_updates').insert({
    order_id: order.id,
    label: 'Payment received',
    body: `${money(t.amount)} charged to the card on file. Your order is confirmed.`,
  });
  await sendOrderConfirmation(db, order.id);

  // Only a signed order goes: payment is not a prescription. Idempotent.
  if (AWAITING_PAYMENT.includes(order.status as never) || order.status === 'paid') {
    await autoSubmitToPharmacy(order.order_number);
  }
}

/**
 * Money on an order that must not take it: closed before the charge settled,
 * or a second payment on an order already paid. Refund in full, tell the team.
 */
async function refundStray(db: Db, t: FrameTransfer, order: Pick<OrderRow, 'id' | 'order_number' | 'status'>): Promise<void> {
  // Already returned (the cancel path, or an earlier call): nothing to do.
  const prior = await listRefunds(t.id);
  if (!prior.ok || prior.data.length) return;
  const refund = await createRefund({ transferId: t.id, reason: 'duplicate' });
  if (!refund.ok) {
    console.error(`[payments] stray refund failed on ${orderRef(order.order_number)}: ${refund.code} ${refund.status}`);
  }

  await db.from('order_updates').insert({
    order_id: order.id,
    label: 'Payment refunded',
    body: `A payment of ${money(t.amount)} arrived after this order was closed and was refunded in full. Nothing will ship.`,
    author: 'System',
    author_role: 'system',
  });
  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `Payment on a closed order was ${refund.ok ? 'refunded' : 'NOT refunded'} · ${orderRef(order.order_number)}`,
      html: noticeEmail({
        eyebrow: refund.ok ? 'Refunded' : 'Refund failed',
        heading: 'A payment landed on a closed order',
        body: refund.ok
          ? 'It was refunded in full automatically and nothing was sent to the pharmacy. Check the member was told.'
          : 'The automatic refund failed. Refund it in the Frame dashboard now. Nothing was sent to the pharmacy.',
        rows: [
          ['Order', orderRef(order.order_number)],
          ['Status', order.status],
          ['Amount', money(t.amount)],
          ['Payment', t.id],
        ],
        cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin` },
      }),
    });
  } catch {
    // The refund and the timeline entry stand either way.
  }
}

/** The money arrived but does not match the order: stays unpaid, a person decides. */
async function alertMismatch(t: FrameTransfer, order: Pick<OrderRow, 'order_number' | 'total_cents'>): Promise<void> {
  console.error(`[payments] amount mismatch on ${orderRef(order.order_number)}: ${t.id}`);
  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `Payment does not match its order · ${orderRef(order.order_number)}`,
      html: noticeEmail({
        eyebrow: 'Check payment',
        heading: 'A payment did not match its order total',
        body: 'The order was not marked paid and nothing was sent to the pharmacy. Refund or adjust it in the Frame dashboard and the admin queue.',
        rows: [
          ['Order', orderRef(order.order_number)],
          ['Order total', money(order.total_cents)],
          ['Charged', money(t.amount)],
          ['Payment', t.id],
        ],
        cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin` },
      }),
    });
  } catch {
    // Logged above; the order stays unpaid either way.
  }
}

/** The member's confirmation. Never throws: the payment already stands. */
async function sendOrderConfirmation(db: Db, orderId: string): Promise<void> {
  if (!emailConfigured()) return;
  try {
    const { data: order } = await db
      .from('orders')
      .select('id, order_number, total_cents, shipping_cents, discount_cents, subtotal_cents, user_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return;
    const [{ data: profile }, { data: items }] = await Promise.all([
      db.from('profiles').select('email, full_name').eq('id', order.user_id).maybeSingle(),
      db.from('order_items').select('product_name, quantity, unit_price_cents').eq('order_id', order.id),
    ]);
    if (!profile?.email) return;
    const mail = orderConfirmationEmail({
      firstName: (profile.full_name || '').split(' ')[0] || 'there',
      orderNumber: order.order_number,
      total: order.total_cents ?? 0,
      shipping: order.shipping_cents ?? 0,
      // Up to items + shipping: a free-shipping code records the waived shipping here.
      discount: Math.min(order.discount_cents ?? 0, (order.subtotal_cents ?? 0) + (order.shipping_cents ?? 0)),
      items: (items ?? []).map((i) => ({
        name: i.product_name,
        qty: i.quantity ?? 1,
        amount: (i.unit_price_cents ?? 0) * (i.quantity ?? 1),
      })),
    });
    await sendEmail({ to: profile.email, subject: mail.subject, html: mail.html });
  } catch (err) {
    console.error('[payments] order confirmation email failed:', err);
  }
}
