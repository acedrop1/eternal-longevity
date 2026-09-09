'use server';

/**
 * Hold the money at checkout, take it when the prescriber approves.
 *
 * A saved card proves the card exists. It does not prove the money is there —
 * which meant a prescriber could sign a prescription and only then discover
 * the charge failed. This places a real authorisation for the full order
 * amount at checkout, so the funds are confirmed and reserved *before* the
 * order is ever put in front of Dr. Elder.
 *
 *   approve → capture the hold. The money was already set aside.
 *   decline → cancel the hold. It disappears from their statement.
 *
 * The tradeoff, stated plainly: the member sees a pending line for the full
 * amount until one of those happens. That is the price of guaranteeing the
 * charge will not fail later, and it is what the checkout copy now says.
 *
 * Authorisations expire. Card networks give roughly seven days, and an expired
 * auth cannot be captured — so `staleAuthorizations` below reports the holds
 * getting close, rather than letting one quietly die.
 */

import Stripe from 'stripe';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/billing';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

/*
 * Card networks void an uncaptured authorisation at about seven days, so a
 * hold older than five wants dealing with before the network kills it. These
 * are plain constants rather than exports because a 'use server' module may
 * only export async functions.
 */
const AUTH_WARN_DAYS = 5;

/**
 * Create the authorisation the member confirms at checkout.
 *
 * `capture_method: 'manual'` is the whole point — it reserves the funds
 * without taking them. `setup_future_usage` saves the card in the same step so
 * refills do not need a second card entry.
 */
export async function createOrderAuthAction(amountCents: number): Promise<{
  ok: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  if (!stripeConfigured()) return { ok: false, error: 'not_configured' };
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, error: 'invalid_amount' };
  }

  const customerId = await getOrCreateStripeCustomer({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const intent = await getStripe().paymentIntents.create({
    amount: Math.round(amountCents),
    currency: 'usd',
    customer: customerId,
    capture_method: 'manual',
    setup_future_usage: 'off_session',
    description: 'Care program — pending prescriber approval',
    automatic_payment_methods: { enabled: true },
  });

  return {
    ok: true,
    clientSecret: intent.client_secret ?? undefined,
    paymentIntentId: intent.id,
  };
}

/**
 * Take the money the hold reserved. Called when the prescriber signs.
 *
 * Capturing an authorisation cannot fail for insufficient funds — that was
 * settled at checkout. It can fail if the hold expired, which is what the
 * daily job exists to prevent.
 */
export async function captureOrderAuth(orderNumber: string): Promise<{
  ok: boolean;
  captured?: boolean;
  error?: string;
}> {
  if (!stripeConfigured() || !supabaseAdminConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, total_cents, stripe_payment_intent_id, paid_confirmed_at')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) return { ok: false, error: 'not_found' };
  if (order.paid_confirmed_at) return { ok: true, captured: false };
  if (!order.stripe_payment_intent_id) return { ok: false, error: 'no_authorization' };

  try {
    const pi = await getStripe().paymentIntents.capture(
      order.stripe_payment_intent_id,
    );
    // The webhook flips the order to paid — one code path owns that.
    return { ok: true, captured: pi.status === 'succeeded' };
  } catch (err) {
    const reason =
      err instanceof Stripe.errors.StripeError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'capture_failed';
    await db.from('order_updates').insert({
      order_id: order.id,
      label: 'Could not capture the authorisation',
      body: reason,
      author: 'System',
      author_role: 'system',
    });
    return { ok: false, error: reason };
  }
}

/**
 * Release the hold. Called when the prescriber declines, so the pending line
 * comes off the member's statement immediately rather than ageing out.
 */
export async function releaseOrderAuth(orderNumber: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!stripeConfigured() || !supabaseAdminConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, stripe_payment_intent_id, paid_confirmed_at')
    .eq('order_number', orderNumber)
    .maybeSingle();

  // Never cancel something already captured — that is a refund, not a release.
  if (!order?.stripe_payment_intent_id || order.paid_confirmed_at) {
    return { ok: true };
  }

  try {
    await getStripe().paymentIntents.cancel(order.stripe_payment_intent_id);
    await db.from('order_updates').insert({
      order_id: order.id,
      label: 'Authorisation released',
      body: 'The hold has been removed from the card. Nothing was charged.',
      author: 'System',
      author_role: 'system',
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'release_failed',
    };
  }
}

/**
 * Holds that are getting old enough to worry about. Read by the daily cron so
 * a signed-but-uncapturable order cannot appear out of nowhere.
 */
export async function staleAuthorizations(): Promise<
  { orderNumber: string; ageDays: number }[]
> {
  if (!supabaseAdminConfigured()) return [];
  const db = createSupabaseAdminClient();
  const cutoff = new Date(
    Date.now() - AUTH_WARN_DAYS * 86400_000,
  ).toISOString();

  const { data } = await db
    .from('orders')
    .select('order_number, created_at')
    .not('stripe_payment_intent_id', 'is', null)
    .is('paid_confirmed_at', null)
    .lt('created_at', cutoff)
    .limit(50);

  return (data ?? []).map((o) => ({
    orderNumber: o.order_number,
    ageDays: Math.floor(
      (Date.now() - new Date(o.created_at).getTime()) / 86400_000,
    ),
  }));
}
