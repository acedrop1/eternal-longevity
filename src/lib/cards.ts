'use server';

/**
 * Cards on file, through Stripe.
 *
 * The previous version of this took a card number typed into an ordinary text
 * input, kept the last four digits in our own table, and never contacted
 * Stripe at all. Two problems with that, and the second is worse than the
 * first: the full number was passing through our form and our JavaScript,
 * which drags the whole site into PCI scope — and no card was ever actually
 * saved, so "card on file" did nothing when a refill came due.
 *
 * Now a SetupIntent does the work. The card is entered inside Stripe's own
 * iframe, Stripe attaches it to the customer, and we only ever see the brand,
 * the last four and the expiry that come back on the PaymentMethod.
 */

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth-server';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/billing';

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

/** Client secret for the Stripe Elements card form. */
export async function createSetupIntentAction(): Promise<{
  ok: boolean;
  clientSecret?: string;
  error?: string;
}> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'not_authenticated' };
  if (!stripeConfigured()) return { ok: false, error: 'not_configured' };

  const customerId = await getOrCreateStripeCustomer({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const intent = await getStripe().setupIntents.create({
    customer: customerId,
    // Cards saved here are charged later without the member present, when a
    // prescriber approves a refill. Stripe needs to know that up front so it
    // collects the right authentication now rather than failing the refill.
    usage: 'off_session',
    automatic_payment_methods: { enabled: true },
  });

  return { ok: true, clientSecret: intent.client_secret ?? undefined };
}

/** Cards Stripe currently holds for this member. Stripe is the source of truth. */
export async function listCardsAction(): Promise<SavedCard[]> {
  const user = await getSession();
  if (!user || !stripeConfigured()) return [];

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const [methods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
    stripe.customers.retrieve(customerId),
  ]);

  const defaultId =
    customer && !('deleted' in customer)
      ? (customer.invoice_settings?.default_payment_method as string | null)
      : null;

  return methods.data
    .filter((m) => m.card)
    .map((m) => ({
      id: m.id,
      brand: m.card!.brand,
      last4: m.card!.last4,
      expMonth: m.card!.exp_month,
      expYear: m.card!.exp_year,
      isDefault: m.id === defaultId,
    }));
}

export async function removeCardAction(
  paymentMethodId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSession();
  if (!user || !stripeConfigured()) return { ok: false, error: 'not_authenticated' };

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  // Confirm the card belongs to this customer before detaching it — the id
  // arrives from the browser, and one member must not be able to remove
  // another's card by guessing at ids.
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== customerId) return { ok: false, error: 'not_found' };

  await stripe.paymentMethods.detach(paymentMethodId);
  revalidatePath('/portal/account');
  return { ok: true };
}

export async function setDefaultCardAction(
  paymentMethodId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSession();
  if (!user || !stripeConfigured()) return { ok: false, error: 'not_authenticated' };

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== customerId) return { ok: false, error: 'not_found' };

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  revalidatePath('/portal/account');
  return { ok: true };
}
