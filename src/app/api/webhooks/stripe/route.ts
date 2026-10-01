/**
 * Stripe webhook handler.
 *
 * Stripe calls this endpoint when payments, subscriptions, or invoices change.
 * It verifies the signature, then mirrors the relevant state into Supabase.
 *
 * Local testing:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 * Production:
 *   add the endpoint in dashboard.stripe.com -> Developers -> Webhooks and copy
 *   the signing secret into STRIPE_WEBHOOK_SECRET.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import type { Json, SubscriptionStatus } from '@/lib/database.types';
import {
  emailConfigured,
  noticeEmail,
  orderConfirmationEmail,
  sendEmail,
  SUPPORT_EMAIL,
} from '@/lib/email';
import { autoSubmitToPharmacy } from '@/lib/auto-pharmacy';
import { AWAITING_PAYMENT, TERMINAL_ORDER } from '@/lib/order-rules';
import { orderRef } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

// Webhooks need the raw body + Node crypto.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured.' },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json(
      { error: `Signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error(`[stripe webhook] failed handling ${event.type}`, err);
    // 500 tells Stripe to retry.
    return NextResponse.json({ error: 'Handler error.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  // Without the service-role key we can verify + acknowledge but not persist.
  if (!supabaseAdminConfigured()) {
    console.warn(
      `[stripe webhook] received ${event.type} but Supabase admin is not ` +
        'configured — skipping persistence.',
    );
    return;
  }
  const db = createSupabaseAdminClient();

  switch (event.type) {
    case 'payment_intent.succeeded': {
      await recordPayment(db, event.data.object);
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await linkIntentToOrder(db, pi);
      await addOrderUpdate(
        db,
        pi.id,
        'Payment failed',
        'We could not charge your card. Please update your payment method.',
      );
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      await db
        .from('subscriptions')
        .update({
          status: mapSubStatus(sub.status),
          next_billing_date: unixToDate(sub.items.data[0]?.current_period_end),
        })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await db
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      // Only recurring renewals auto-generate a refill. The first cycle is
      // submitted manually from the signed prescription.
      if (invoice.billing_reason === 'subscription_cycle') {
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id;
        if (customerId) await createRefillDraft(db, customerId);
      }
      break;
    }

    default:
      // Unhandled event types are fine — acknowledge so Stripe stops retrying.
      break;
  }
}

type Db = ReturnType<typeof createSupabaseAdminClient>;

/**
 * A payment landed. Record it once, move the order forward only, and send it
 * to the pharmacy — or, if the order was cancelled or already paid by another
 * intent, give the money straight back.
 *
 * Stripe delivers at least once and not in order. Every write below is
 * conditional on the state it expects, so a redelivered or late event finds
 * nothing to change and does nothing: no event-id table is needed.
 */
async function recordPayment(db: Db, pi: Stripe.PaymentIntent): Promise<void> {
  const orderId = pi.metadata?.order_id;
  const orderNumber = pi.metadata?.order_number;
  if (!orderId && !orderNumber) return; // not an order charge (admin one-off)

  const cols = 'id, order_number, status, paid_confirmed_at, stripe_payment_intent_id';
  const find = () =>
    orderId
      ? db.from('orders').select(cols).eq('id', orderId).maybeSingle()
      : db.from('orders').select(cols).eq('order_number', orderNumber!).maybeSingle();
  const { data: order } = await find();
  if (!order) return;

  const stray =
    TERMINAL_ORDER.includes(order.status) ||
    (order.paid_confirmed_at !== null && order.stripe_payment_intent_id !== pi.id);
  if (stray) return refundStray(db, pi, order);

  /*
   * Claim the payment. Conditional on not yet being paid and not cancelled in
   * the meantime; a retry, or a second delivery racing this one, matches no
   * row and stops here. Burns the pay link too, so it cannot be reused.
   */
  const { data: claimed } = await db
    .from('orders')
    .update({
      stripe_payment_intent_id: pi.id,
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
    const { data: now } = await find();
    if (now && TERMINAL_ORDER.includes(now.status)) await refundStray(db, pi, now);
    return;
  }

  // Forward only: signed → paid. An order already compounding or shipped
  // keeps its status; this event is just late.
  if (AWAITING_PAYMENT.includes(order.status)) {
    await db
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id)
      .in('status', AWAITING_PAYMENT);
  }

  await addOrderUpdate(
    db,
    pi.id,
    'Payment received',
    `$${(pi.amount / 100).toFixed(2)} charged to the card on file. Your order is confirmed.`,
  );
  await sendOrderConfirmation(db, pi.id);

  /*
   * Covers the order that was signed while unpaid and settled later through
   * the emailed link. autoSubmitToPharmacy is idempotent, so the normal path —
   * where signing already submitted it — does nothing here. Only a signed
   * order goes: payment is not a prescription.
   */
  if (AWAITING_PAYMENT.includes(order.status) || order.status === 'paid') {
    await autoSubmitToPharmacy(order.order_number);
  }
}

/**
 * Money on an order that must not take it: cancelled or declined before the
 * charge settled (an old pay link, a form left open), or a second payment on
 * an order already paid. Refund in full and tell the team — nothing ships.
 */
async function refundStray(
  db: Db,
  pi: Stripe.PaymentIntent,
  order: { id: string; order_number: string; status: string },
): Promise<void> {
  const stripe = getStripe();
  // Already returned (the cancel path, or an earlier delivery): nothing to do.
  const prior = await stripe.refunds.list({ payment_intent: pi.id, limit: 1 });
  if (prior.data.length) return;
  await stripe.refunds.create(
    { payment_intent: pi.id },
    { idempotencyKey: `stray-${pi.id}` },
  );

  const amount = `$${(pi.amount / 100).toFixed(2)}`;
  await db.from('order_updates').insert({
    order_id: order.id,
    label: 'Payment refunded',
    body: `A payment of ${amount} arrived after this order was closed and was refunded in full. Nothing will ship.`,
    author: 'System',
    author_role: 'system',
  });
  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `Payment on a closed order was refunded · ${orderRef(order.order_number)}`,
      html: noticeEmail({
        eyebrow: 'Refunded',
        heading: 'A payment landed on a closed order',
        body: 'It was refunded in full automatically and nothing was sent to the pharmacy. Check the member was told.',
        rows: [
          ['Order', orderRef(order.order_number)],
          ['Status', order.status],
          ['Amount', amount],
          ['Payment', pi.id],
        ],
        cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin` },
      }),
    });
  } catch {
    // The refund and the timeline entry stand either way.
  }
}

/**
 * A paid refill cycle -> a draft fulfillment order in the admin queue. The
 * admin reviews it, then submits it to the pharmacy.
 */
/**
 * Every intent we create carries its order number in metadata. The charge code
 * writes the intent id onto the order only after Stripe answers, and this event
 * can arrive first; matching on the id alone would then update nothing and the
 * order would never be marked paid. Linking by order number closes that race.
 */
async function linkIntentToOrder(
  db: ReturnType<typeof createSupabaseAdminClient>,
  pi: Stripe.PaymentIntent,
): Promise<void> {
  const orderNumber = pi.metadata?.order_number;
  if (!orderNumber) return;
  // Never over a paid order: a stray failed attempt must not replace the
  // intent that actually settled it.
  await db
    .from('orders')
    .update({ stripe_payment_intent_id: pi.id })
    .eq('order_number', orderNumber)
    .is('paid_confirmed_at', null);
}

async function createRefillDraft(
  db: ReturnType<typeof createSupabaseAdminClient>,
  stripeCustomerId: string,
): Promise<void> {
  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, date_of_birth')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();
  if (!profile) return;

  const { data: rx } = await db
    .from('prescriptions')
    .select('id, doctor_id, items')
    .eq('user_id', profile.id)
    .eq('status', 'signed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!rx) return;

  const { data: address } = await db
    .from('addresses')
    .select('line1, line2, city, state, zip')
    .eq('user_id', profile.id)
    .eq('is_primary', true)
    .maybeSingle();

  let prescriberName: string | null = null;
  let prescriberNpi: string | null = null;
  if (rx.doctor_id) {
    const { data: doctor } = await db
      .from('profiles')
      .select('full_name, npi')
      .eq('id', rx.doctor_id)
      .maybeSingle();
    prescriberName = doctor?.full_name ?? null;
    prescriberNpi = doctor?.npi ?? null;
  }

  await db.from('fulfillment_orders').insert({
    order_ref: `FUL-${Date.now().toString(36).toUpperCase()}`,
    user_id: profile.id,
    prescription_id: rx.id,
    status: 'draft',
    patient_name: profile.full_name ?? 'Patient',
    patient_dob: profile.date_of_birth ?? null,
    shipping_address: (address ?? null) as Json | null,
    prescriber_name: prescriberName,
    prescriber_npi: prescriberNpi,
    items: rx.items,
    cycle_label: 'Refill cycle',
  });
}

/**
 * Email the customer their confirmation and copy the support inbox. Never
 * throws — a mail failure must not fail the webhook, or Stripe will retry a
 * payment that already succeeded.
 */
async function sendOrderConfirmation(
  db: ReturnType<typeof createSupabaseAdminClient>,
  paymentIntentId: string,
): Promise<void> {
  if (!emailConfigured()) return;
  try {
    const { data: order } = await db
      .from('orders')
      .select('id, order_number, total_cents, shipping_cents, discount_cents, subtotal_cents, user_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
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
      discount: Math.min(order.discount_cents ?? 0, order.subtotal_cents ?? 0),
      items: (items ?? []).map((i) => ({
        name: i.product_name,
        qty: i.quantity ?? 1,
        amount: (i.unit_price_cents ?? 0) * (i.quantity ?? 1),
      })),
    });

    await sendEmail({ to: profile.email, subject: mail.subject, html: mail.html });

    /*
     * Admin and the prescriber hear about it once, as the
     * "Ready to place" to-do that autoSubmitToPharmacy sends when the order joins the
     * board. A separate "payment cleared" note on top of that was noise.
     */
  } catch (err) {
    console.error('[stripe] order confirmation email failed:', err);
  }
}

/** Append a timeline entry to whichever order owns this payment intent. */
async function addOrderUpdate(
  db: ReturnType<typeof createSupabaseAdminClient>,
  paymentIntentId: string,
  label: string,
  bodyText: string,
): Promise<void> {
  const { data: order } = await db
    .from('orders')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  if (!order) return;
  await db
    .from('order_updates')
    .insert({ order_id: order.id, label, body: bodyText });
}

/** Map Stripe subscription status onto our narrower enum. */
function mapSubStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'unpaid':
      return 'active';
    case 'paused':
      return 'paused';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'pending_review';
  }
}

function unixToDate(seconds: number | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}
