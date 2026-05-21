/**
 * Stripe billing helpers — server-only.
 *
 * Card data NEVER touches this code or the database. Customers enter their card
 * into Stripe-hosted fields; here we only ever work with Stripe IDs and the
 * brand / last-4 metadata Stripe returns. This keeps the app out of the
 * heavyweight PCI-DSS scope.
 *
 * Every function assumes Stripe + the Supabase service role are configured;
 * callers must guard with `billingConfigured()` first.
 */
import 'server-only';
import { getStripe, stripeConfigured } from './stripe';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from './supabase/admin';
import { SITE_URL } from './site';

/** True when both Stripe and the Supabase service role are available. */
export function billingConfigured(): boolean {
  return stripeConfigured() && supabaseAdminConfigured();
}

export interface CheckoutLine {
  productId: string;
  productName: string;
  quantity: number;
  /** Price for one unit, in cents. */
  amountCents: number;
}

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
}

/* -------------------------------------------------------------------------- */
/*  Customers                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Find or create the Stripe customer for a member, caching the id on their
 * profile row so we never create duplicates.
 */
export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
  name?: string;
}): Promise<string> {
  const stripe = getStripe();
  const db = createSupabaseAdminClient();

  const { data: profile } = await db
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', params.userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { user_id: params.userId },
  });

  await db
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', params.userId);

  return customer.id;
}

/* -------------------------------------------------------------------------- */
/*  Checkout (one-time payment for a cart)                                    */
/* -------------------------------------------------------------------------- */

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  name?: string;
  lines: CheckoutLine[];
}): Promise<{ url: string; orderNumber: string }> {
  const stripe = getStripe();
  const db = createSupabaseAdminClient();
  const customerId = await getOrCreateStripeCustomer(params);

  const orderNumber = `EL-${Date.now().toString(36).toUpperCase()}`;
  const subtotal = params.lines.reduce(
    (sum, l) => sum + l.amountCents * l.quantity,
    0,
  );

  // Pending order row — the Stripe webhook flips it to 'paid'.
  const { data: order } = await db
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: params.userId,
      status: 'pending',
      subtotal_cents: subtotal,
      total_cents: subtotal,
    })
    .select('id')
    .single();

  if (order) {
    await db.from('order_items').insert(
      params.lines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        product_name: l.productName,
        quantity: l.quantity,
        unit_price_cents: l.amountCents,
      })),
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: params.lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: l.amountCents,
        product_data: { name: l.productName },
      },
    })),
    success_url: `${SITE_URL}/checkout/success?order=${orderNumber}`,
    cancel_url: `${SITE_URL}/checkout`,
    metadata: { order_number: orderNumber, user_id: params.userId },
    payment_intent_data: { metadata: { order_number: orderNumber } },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL.');
  }
  return { url: session.url, orderNumber };
}

/* -------------------------------------------------------------------------- */
/*  Card-on-file (customer enters their own card on a Stripe-hosted page)      */
/* -------------------------------------------------------------------------- */

/**
 * A Stripe-hosted page where the customer saves a card. The resulting payment
 * method is attached to their Stripe customer — the card number never reaches
 * our servers. Hand this URL to the customer (link or email).
 */
export async function createCardSetupSession(params: {
  userId: string;
  email: string;
  name?: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(params);

  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    success_url: `${SITE_URL}/portal/account?card=added`,
    cancel_url: `${SITE_URL}/portal/account`,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a setup URL.');
  }
  return { url: session.url };
}

/** List the cards a customer has on file (display metadata only). */
export async function listPaymentMethods(
  customerId: string,
): Promise<SavedCard[]> {
  const stripe = getStripe();
  const pms = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  return pms.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand ?? 'card',
    last4: pm.card?.last4 ?? '0000',
    expMonth: pm.card?.exp_month ?? null,
    expYear: pm.card?.exp_year ?? null,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Subscriptions                                                             */
/* -------------------------------------------------------------------------- */

export type BillingInterval = 'day' | 'week' | 'month' | 'year';

/** Create a recurring subscription billed against the customer's saved card. */
export async function createSubscription(params: {
  userId: string;
  email: string;
  name?: string;
  productName: string;
  amountCents: number;
  interval: BillingInterval;
  intervalCount?: number;
}): Promise<{ subscriptionId: string; status: string }> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(params);

  const cards = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  if (cards.data.length === 0) {
    throw new Error(
      'This customer has no card on file. Send them an add-a-card link first.',
    );
  }

  const product = await stripe.products.create({ name: params.productName });
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    default_payment_method: cards.data[0].id,
    items: [
      {
        price_data: {
          currency: 'usd',
          product: product.id,
          unit_amount: params.amountCents,
          recurring: {
            interval: params.interval,
            interval_count: params.intervalCount ?? 1,
          },
        },
      },
    ],
    metadata: { user_id: params.userId },
  });

  return { subscriptionId: subscription.id, status: subscription.status };
}

export async function pauseSubscription(subscriptionId: string): Promise<void> {
  await getStripe().subscriptions.update(subscriptionId, {
    pause_collection: { behavior: 'void' },
  });
}

export async function resumeSubscription(
  subscriptionId: string,
): Promise<void> {
  await getStripe().subscriptions.update(subscriptionId, {
    pause_collection: null,
  });
}

export async function cancelSubscription(
  subscriptionId: string,
): Promise<void> {
  await getStripe().subscriptions.cancel(subscriptionId);
}

/* -------------------------------------------------------------------------- */
/*  One-off charges + refunds                                                 */
/* -------------------------------------------------------------------------- */

/** Charge a customer's saved card a one-off amount (a merchant-initiated charge). */
export async function chargeOnce(params: {
  userId: string;
  email: string;
  name?: string;
  amountCents: number;
  description: string;
}): Promise<{ paymentIntentId: string; status: string }> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(params);

  const cards = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  if (cards.data.length === 0) {
    throw new Error(
      'This customer has no card on file. Send them an add-a-card link first.',
    );
  }

  const intent = await stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: 'usd',
    customer: customerId,
    payment_method: cards.data[0].id,
    description: params.description,
    off_session: true,
    confirm: true,
  });

  return { paymentIntentId: intent.id, status: intent.status };
}

/** Refund a payment in full, or in part when `amountCents` is given. */
export async function refundPayment(
  paymentIntentId: string,
  amountCents?: number,
): Promise<{ refundId: string; status: string }> {
  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amountCents ? { amount: amountCents } : {}),
  });
  return { refundId: refund.id, status: refund.status ?? 'pending' };
}
