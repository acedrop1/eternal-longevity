/**
 * Stripe server client.
 *
 * Lazily constructed so the app builds and runs as a demo with no Stripe key.
 * Never import this from a client component — the secret key is server-only.
 *
 * Usage:
 *   const stripe = getStripe();
 *   const customer = await stripe.customers.create({ email });
 */
import 'server-only';
import Stripe from 'stripe';

let cached: Stripe | null = null;

/** True when STRIPE_SECRET_KEY is present. */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Returns a singleton Stripe client. Throws if STRIPE_SECRET_KEY is missing. */
export function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }

  cached = new Stripe(key, {
    // Pin the SDK's bundled API version. Omitting `apiVersion` keeps this in
    // lockstep with the installed `stripe` package.
    typescript: true,
    appInfo: { name: 'Eternal Longevity' },
  });
  return cached;
}
