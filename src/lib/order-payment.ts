'use server';

/**
 * Save the card at checkout; charge it when the prescriber approves.
 *
 * The member enters a card and is not charged. When Dr. Elder signs, that card
 * is billed off-session — which is exactly what they authorised at checkout.
 * A decline charges nothing, so there is nothing to refund.
 *
 * The alternative was charging up front and refunding declines. It is simpler
 * to reason about, but Stripe keeps roughly 2.9% + 30c on every refund, so
 * each decline would cost about \$5.50 with no revenue — and a visible refund
 * rate is exactly what underwriting reads as risk on a restricted business.
 * Not charging in the first place avoids both.
 *
 * `refundDeclinedOrder` stays for the case where money did move and has to
 * come back: an admin denial after payment, or a charge that succeeded on an
 * order later declined.
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
 * Create the setup the member confirms at checkout.
 *
 * A SetupIntent stores the card against the Stripe customer without moving
 * money and without a pending line on their statement. `usage: 'off_session'`
 * tells Stripe the card will be charged later with nobody at the keyboard, so
 * it collects the right authentication now rather than failing the charge
 * after a prescription has been signed.
 *
 * `amountCents` is unused by the SetupIntent itself and kept only so the
 * caller can keep passing the order total for display.
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

  const intent = await getStripe().setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    automatic_payment_methods: { enabled: true },
  });

  return {
    ok: true,
    clientSecret: intent.client_secret ?? undefined,
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
