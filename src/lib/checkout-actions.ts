'use server';

/**
 * Checkout.
 *
 *   • Demo mode  — returns { demo: true }; the CheckoutFlow runs its local
 *                  success flow (writes a localStorage order, shows success).
 *   • Live mode  — creates a Stripe Checkout Session and a pending `orders`
 *                  row, then returns the Stripe-hosted URL to redirect to.
 *                  The Stripe webhook flips the order to 'paid'.
 */
import { getSession } from './auth-server';
import {
  billingConfigured,
  createCheckoutSession,
  type CheckoutLine,
} from './billing';

export interface CheckoutResult {
  /** Stripe-hosted checkout URL — present in live mode. */
  url?: string;
  /** True in demo mode — the client should run its local success flow. */
  demo?: boolean;
  error?: string;
}

export async function createCheckoutSessionAction(input: {
  lines: CheckoutLine[];
}): Promise<CheckoutResult> {
  // No real payment backend connected — let the client do its demo flow.
  if (!billingConfigured()) {
    return { demo: true };
  }

  const user = await getSession();
  if (!user || user.role !== 'member') {
    return { error: 'Please sign in as a member to check out.' };
  }
  if (!input?.lines?.length) {
    return { error: 'Your cart is empty.' };
  }

  try {
    const { url } = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      lines: input.lines,
    });
    return { url };
  } catch (err) {
    console.error('[checkout] session creation failed:', err);
    return { error: 'We could not start checkout. Please try again.' };
  }
}
