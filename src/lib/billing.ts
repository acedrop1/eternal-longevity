/**
 * Admin billing helpers — server-only.
 *
 * Card data NEVER touches this code or the database. Members type their card
 * into the processor's own field (lib/cards); here we only ever work with the
 * processor's ids and the brand / last-4 it returns.
 *
 * Plans are rows in `subscriptions`, renewed by our own cron (lib/refills);
 * nothing here creates a recurring charge at the processor.
 */
import 'server-only';
import { confirmTransfer, createCharge } from './frame';
import { cardOnFile, frameAccountFor, paymentsConfigured } from './payments';

/** True when both the processor and the Supabase service role are available. */
export function billingConfigured(): boolean {
  return paymentsConfigured();
}

/**
 * Charge a member's card on file a one-off amount (a merchant-initiated
 * charge tied to no order). Tagged `admin_charge` so the webhook's order
 * bookkeeping leaves it alone. Messages are for the admin who pressed it.
 */
export async function chargeOnce(params: {
  userId: string;
  amountCents: number;
  description: string;
}): Promise<{ ok: true; status: string; transferId: string } | { ok: false; message: string }> {
  const [accountId, card] = await Promise.all([frameAccountFor(params.userId), cardOnFile(params.userId)]);
  if (!accountId) return { ok: false, message: 'Could not set up payment for this member.' };
  if (!card) {
    return { ok: false, message: 'This customer has no card on file. Send them an add-a-card link first.' };
  }

  // Two steps, like every charge (lib/frame): nothing moves until confirmed.
  const created = await createCharge({
    accountId,
    paymentMethodId: card.id,
    amountCents: params.amountCents,
    description: params.description,
    metadata: { admin_charge: 'true', user_id: params.userId },
  });
  if (!created.ok) {
    return created.code === 'declined'
      ? { ok: false, message: `Declined: ${created.decline?.message ?? 'the card was declined'}.` }
      : { ok: false, message: `The charge could not start (${created.code}). Nothing was charged.` };
  }
  const res = await confirmTransfer(created.data.id);
  if (!res.ok) {
    return res.code === 'declined'
      ? { ok: false, message: `Declined: ${res.decline?.message ?? 'the card was declined'}.` }
      : {
          ok: false,
          message: `No answer from the processor (${res.code}). Check transfer ${created.data.id} in the Frame dashboard before charging again.`,
        };
  }
  return { ok: true, status: res.data.status, transferId: res.data.id };
}
