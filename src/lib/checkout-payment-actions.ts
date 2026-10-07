'use server';

/**
 * The only payment functions the browser is allowed to call from the pay link.
 *
 * Every export of a `'use server'` file is a live, unauthenticated endpoint —
 * Next.js publishes an action id for each one, and those ids are in the client
 * bundle. `pay-on-approval.ts` holds these beside internal, service-role
 * functions ("charge this order", "mint a payment link"), so it stays a plain
 * server module; this is the doorway. Saving a card at checkout goes through
 * lib/cards.
 */

import type { EncryptedCard } from '@/lib/frame';
import { finishPaymentAction as finish, payOrderAction as pay, type PayResult } from '@/lib/pay-on-approval';

/** Pay an order from an emailed link. The token is the authorisation. */
export async function payOrderAction(token: string, card: EncryptedCard | null): Promise<PayResult> {
  return pay(token, card);
}

/**
 * After the bank's approval step in the browser. Pass the `transferId`
 * payOrderAction returned: it still finds a payment that landed meanwhile.
 */
export async function finishPaymentAction(token: string, transferId?: string) {
  return finish(token, transferId);
}
