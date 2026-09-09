'use server';

/**
 * Charge at checkout; refund in full if the prescriber declines.
 *
 * This is the model the category runs on, and the reason for it is that every
 * alternative moves a failure later in the process. Saving a card meant the
 * charge could fail after a prescription was signed. Holding the funds fixed
 * that but put a pending line on the member's statement for days and expired
 * after seven, so a slow review left an uncapturable order.
 *
 * Paying at checkout has neither problem: the money is settled before anyone
 * looks at the order, the member gets a real receipt immediately, and there is
 * no second payment step to fail.
 *
 * What it costs is the processing fee on a decline — Stripe keeps roughly
 * 2.9% + 30c on a refund. That is the price of the simplicity, and it is only
 * worth paying while declines stay rare. If the decline rate climbs, the
 * authorisation model is the thing to go back to.
 *
 * The refund is automatic and immediate on decline. Nobody should have to
 * remember to issue it, and a member who was told 'refunded in full' should
 * not be waiting on a human.
 */

import { getStripe, stripeConfigured } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/billing';
import { getSession } from '@/lib/auth-server';
import { refundedEmail, sendEmail } from '@/lib/email';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

/**
 * Create the payment the member confirms at checkout.
 *
 * `setup_future_usage` saves the card in the same step, so refills do not
 * need a second card entry.
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
    setup_future_usage: 'off_session',
    description: 'Care program — pending prescriber review',
    automatic_payment_methods: { enabled: true },
  });

  return {
    ok: true,
    clientSecret: intent.client_secret ?? undefined,
    paymentIntentId: intent.id,
  };
}

/**
 * Refund in full. Called when the prescriber declines, or when an order is
 * denied before review.
 *
 * Automatic and immediate by design: the checkout copy promises a refund if
 * treatment is not approved, and a promise that depends on someone remembering
 * to click something is not a promise.
 */
export async function refundDeclinedOrder(orderNumber: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!stripeConfigured() || !supabaseAdminConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, member_name, member_email, total_cents, stripe_payment_intent_id')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order?.stripe_payment_intent_id) return { ok: true };

  try {
    await getStripe().refunds.create({
      payment_intent: order.stripe_payment_intent_id,
    });

    await db
      .from('orders')
      .update({ paid_confirmed_at: null })
      .eq('id', order.id);

    await db.from('order_updates').insert({
      order_id: order.id,
      label: 'Refunded in full',
      body: 'Your treatment was not approved, so your payment has been returned. Banks usually post it within 5–10 business days.',
      author: 'System',
      author_role: 'system',
    });

    if (order.member_email) {
      const msg = refundedEmail({
        firstName: (order.member_name ?? '').trim().split(/\s+/)[0] || 'there',
        orderNumber: order.order_number,
        amount: order.total_cents ?? 0,
        full: true,
        reason: 'Your prescriber determined this treatment is not right for you.',
      });
      try {
        await sendEmail({
          to: order.member_email,
          subject: msg.subject,
          html: msg.html,
        });
      } catch {
        // The money is already back; a failed receipt must not look like a
        // failed refund.
      }
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'refund_failed',
    };
  }
}
