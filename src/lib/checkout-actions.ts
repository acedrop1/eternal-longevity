'use server';

import { redirect } from 'next/navigation';

/**
 * Stripe checkout starter (stub).
 *
 * In production this should:
 *   1. Look up the authenticated user + their physician-signed protocol.
 *   2. Resolve the price ID for their cycle from Stripe.
 *   3. stripe.checkout.sessions.create({ ... })
 *   4. redirect(session.url)
 *
 * For the demo we skip Stripe and jump straight to the success page.
 */
export async function startCheckoutAction(): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));
  redirect('/checkout/success?demo=1');
}
