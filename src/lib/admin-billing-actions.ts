'use server';

/**
 * Admin billing actions. Called from the admin billing panel.
 *
 * Every action verifies the caller is an admin and that billing is configured.
 * No raw card data is ever accepted — customers add cards on Stripe-hosted
 * pages; these actions work purely with Stripe IDs.
 */
import { revalidatePath } from 'next/cache';
import { getSession } from './auth-server';
import {
  billingConfigured,
  chargeOnce,
  createCardSetupSession,
  createSubscription,
  refundPayment,
  type BillingInterval,
} from './billing';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from './supabase/admin';
import { noticeEmail, refundedEmail, sendEmail } from './email';

export interface AdminBillingResult {
  ok: boolean;
  message: string;
  /** Set by adminSendCardLink — the Stripe-hosted card-collection URL. */
  url?: string;
}

/** Verify Stripe/Supabase are connected and the caller is an admin. */
async function guard(): Promise<AdminBillingResult | null> {
  if (!billingConfigured()) {
    return {
      ok: false,
      message: 'Connect Stripe and Supabase to enable billing.',
    };
  }
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { ok: false, message: 'Admin access is required.' };
  }
  return null;
}

async function memberContact(
  userId: string,
): Promise<{ email: string; name: string } | null> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (!data?.email) return null;
  return { email: data.email, name: data.full_name ?? 'Member' };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}

const CADENCE: Record<
  'monthly' | 'quarterly' | 'annual',
  { interval: BillingInterval; intervalCount: number; label: string }
> = {
  monthly: { interval: 'month', intervalCount: 1, label: 'Monthly' },
  quarterly: { interval: 'month', intervalCount: 3, label: 'Quarterly' },
  annual: { interval: 'year', intervalCount: 1, label: 'Annual' },
};

/* -------------------------------------------------------------------------- */

/** Create a Stripe-hosted card link and email it to the customer. */
export async function adminSendCardLink(
  userId: string,
): Promise<AdminBillingResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const contact = await memberContact(userId);
  if (!contact) return { ok: false, message: 'Member not found.' };

  try {
    const { url } = await createCardSetupSession({
      userId,
      email: contact.email,
      name: contact.name,
    });
    await sendEmail({
      to: contact.email,
      subject: 'Add a card to your Eternal Longevity account',
      html: noticeEmail({
        eyebrow: 'Payment method',
        heading: 'Add a card to your account',
        body: 'Your care team has asked you to add a payment method so your treatment can be dispatched once it is approved.',
        cta: { label: 'Add your card securely', href: url },
        footnote:
          'This opens a page hosted by Stripe. Your card details go straight to them and are never seen by our team.',
      }),
    });
    return {
      ok: true,
      message: `Secure card link created and emailed to ${contact.email}.`,
      url,
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

/** Create a recurring subscription for a customer. */
export async function adminCreateSubscription(input: {
  userId: string;
  productName: string;
  amountDollars: number;
  cadence: 'monthly' | 'quarterly' | 'annual';
}): Promise<AdminBillingResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const contact = await memberContact(input.userId);
  if (!contact) return { ok: false, message: 'Member not found.' };

  const amountCents = Math.round(input.amountDollars * 100);
  if (!input.productName.trim() || amountCents < 50) {
    return {
      ok: false,
      message: 'Enter a product name and an amount of at least $0.50.',
    };
  }

  const cadence = CADENCE[input.cadence];
  try {
    const { subscriptionId, status } = await createSubscription({
      userId: input.userId,
      email: contact.email,
      name: contact.name,
      productName: input.productName.trim(),
      amountCents,
      interval: cadence.interval,
      intervalCount: cadence.intervalCount,
    });

    const db = createSupabaseAdminClient();
    await db.from('subscriptions').insert({
      user_id: input.userId,
      product_id: 'custom',
      product_name: input.productName.trim(),
      stripe_subscription_id: subscriptionId,
      status: status === 'active' ? 'active' : 'pending_review',
      cadence_label: cadence.label,
      per_cycle_cents: amountCents,
    });

    return {
      ok: true,
      message: `${cadence.label} subscription created for ${contact.email} (Stripe status: ${status}).`,
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

/** Charge a customer's saved card a one-off amount. */
export async function adminChargeOnce(input: {
  userId: string;
  amountDollars: number;
  description: string;
}): Promise<AdminBillingResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const contact = await memberContact(input.userId);
  if (!contact) return { ok: false, message: 'Member not found.' };

  const amountCents = Math.round(input.amountDollars * 100);
  if (amountCents < 50) {
    return { ok: false, message: 'Amount must be at least $0.50.' };
  }

  try {
    const { status } = await chargeOnce({
      userId: input.userId,
      email: contact.email,
      name: contact.name,
      amountCents,
      description: input.description.trim() || 'Eternal Longevity charge',
    });
    const dollars = input.amountDollars.toFixed(2);
    return status === 'succeeded'
      ? { ok: true, message: `Charged ${contact.email} $${dollars}.` }
      : { ok: false, message: `Charge did not complete (status: ${status}).` };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

/** Refund a payment in full, or partially when an amount is given. */
export async function adminRefund(input: {
  paymentIntentId: string;
  amountDollars?: number;
}): Promise<AdminBillingResult> {
  const blocked = await guard();
  if (blocked) return blocked;

  const id = input.paymentIntentId.trim();
  if (!id.startsWith('pi_')) {
    return {
      ok: false,
      message: 'Enter a valid Stripe payment ID (it starts with "pi_").',
    };
  }

  try {
    const { status } = await refundPayment(
      id,
      input.amountDollars ? Math.round(input.amountDollars * 100) : undefined,
    );
    return { ok: true, message: `Refund ${status}.` };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

/**
 * Refund an order by its order number.
 *
 * The panel that takes a raw `pi_...` id is fine for a one-off, but it makes
 * the operator go to Stripe, find the payment, copy the id and come back —
 * which is most of the work they were trying to avoid. The order already
 * carries its PaymentIntent, so refunding from the order is one click.
 *
 * The refund is recorded on the order timeline and the paid flag is cleared on
 * a full refund, so the member's own order page tells the same story as Stripe.
 */
export async function adminRefundOrder(input: {
  orderNumber: string;
  amountDollars?: number;
  reason?: string;
}): Promise<AdminBillingResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Database is not configured.' };
  }

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select(
      'id, order_number, total_cents, member_email, member_name, stripe_payment_intent_id, paid_confirmed_at',
    )
    .eq('order_number', input.orderNumber.trim())
    .maybeSingle();

  if (!order) return { ok: false, message: 'No order with that number.' };
  if (!order.stripe_payment_intent_id) {
    return {
      ok: false,
      message: 'That order has no payment to refund — nothing was ever charged.',
    };
  }
  if (!order.paid_confirmed_at) {
    return {
      ok: false,
      message: 'That order is not marked paid. Check Stripe before refunding.',
    };
  }

  const cents = input.amountDollars
    ? Math.round(input.amountDollars * 100)
    : undefined;
  if (cents !== undefined && (cents <= 0 || cents > (order.total_cents ?? 0))) {
    return { ok: false, message: 'Refund amount must be between $0 and the order total.' };
  }

  try {
    const { status } = await refundPayment(order.stripe_payment_intent_id, cents);
    const full = cents === undefined || cents === order.total_cents;

    await db.from('order_updates').insert({
      order_id: order.id,
      label: full ? 'Refunded in full' : `Refunded $${(cents! / 100).toFixed(2)}`,
      body: input.reason?.trim() || null,
      author: 'Admin',
      author_role: 'admin',
    });

    // Only a full refund un-pays the order; a partial one leaves it paid.
    if (full) {
      await db
        .from('orders')
        .update({ paid_confirmed_at: null })
        .eq('id', order.id);
    }

    if (order.member_email) {
      const msg = refundedEmail({
        firstName: (order.member_name ?? '').trim().split(/\s+/)[0] || 'there',
        orderNumber: order.order_number,
        amount: cents ?? order.total_cents ?? 0,
        full,
        reason: input.reason?.trim() || undefined,
      });
      try {
        await sendEmail({ to: order.member_email, subject: msg.subject, html: msg.html });
      } catch {
        // The money has already moved — a failed receipt must not look like a
        // failed refund.
      }
    }

    revalidatePath('/portal/admin/fulfillment');
    revalidatePath('/portal/orders');
    return {
      ok: true,
      message: `Refund ${status} for ${order.order_number}.`,
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}
