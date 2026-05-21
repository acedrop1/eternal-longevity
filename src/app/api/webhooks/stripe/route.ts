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
      const pi = event.data.object;
      await db
        .from('orders')
        .update({ status: 'paid' })
        .eq('stripe_payment_intent_id', pi.id);
      await addOrderUpdate(db, pi.id, 'Payment received', 'Your card was charged successfully.');
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await addOrderUpdate(
        db,
        pi.id,
        'Payment failed',
        'We could not charge your card. Please update your payment method.',
      );
      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object;
      // The order row is created by the checkout server action; here we just
      // confirm payment if the session carried our order_number in metadata.
      const orderNumber = session.metadata?.order_number;
      if (orderNumber) {
        await db
          .from('orders')
          .update({ status: 'paid' })
          .eq('order_number', orderNumber);
      }
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

/**
 * A paid refill cycle -> a draft fulfillment order in the admin queue. The
 * admin reviews it, then submits it to the pharmacy.
 */
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
