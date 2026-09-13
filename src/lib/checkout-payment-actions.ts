'use server';

/**
 * The only two payment functions the browser is allowed to call.
 *
 * Every export of a `'use server'` file is a live, unauthenticated endpoint —
 * Next.js publishes an action id for each one, and those ids are in the client
 * bundle. `order-payment.ts` and `pay-on-approval.ts` each held one
 * browser-facing action beside a set of internal, service-role functions, so
 * the directive at the top of those files was publishing "refund this order",
 * "charge this card" and "mint a payment link" to anyone holding an order
 * number. Those files are plain server modules again; this is the doorway.
 */

import { createOrderAuthAction as authorise } from '@/lib/order-payment';
import { createPayIntentAction as payIntent } from '@/lib/pay-on-approval';

/** Save a card at checkout. Authorises the caller itself. */
export async function createOrderAuthAction(amountCents: number) {
  return authorise(amountCents);
}

/** Pay an order from an emailed link. The token is the authorisation. */
export async function createPayIntentAction(token: string) {
  return payIntent(token);
}
