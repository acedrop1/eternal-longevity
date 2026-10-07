'use server';

/**
 * Cards on file, for the signed-in member.
 *
 * The card is typed into the processor's own iframe (components/payments/
 * FrameCardField); what reaches us is the encrypted number and CVC, which
 * lib/payments forwards unchanged. We only ever see the brand, the last four
 * and the expiry that come back on the saved card. lib/payments also checks
 * that any card id from the browser belongs to this member.
 */

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth-server';
import type { EncryptedCard } from '@/lib/frame';
import {
  frameAccountFor,
  memberCards,
  removeCard,
  saveCard,
  setChargedCard,
  type CardOnFile,
  type SaveCardResult,
} from '@/lib/payments';
import { allow, LIMITS } from '@/lib/rate-limit';

export type SavedCard = CardOnFile;

async function member() {
  const user = await getSession();
  return user?.role === 'member' ? user : null;
}

/**
 * Save the card the member just entered and make it the one charged on
 * approval. Charges nothing. A failure carries a message fit to show them.
 */
export async function saveCardAction(card: EncryptedCard): Promise<SaveCardResult | { ok: false; error: 'not_authenticated' | 'rate_limited'; message: string }> {
  const user = await member();
  if (!user) return { ok: false, error: 'not_authenticated', message: 'Please sign in again to save a card.' };
  // Card testing: the same account trying number after number.
  if (!(await allow('cards', LIMITS.form, user.id))) {
    return { ok: false, error: 'rate_limited', message: 'Too many attempts. Please wait a few minutes and try again.' };
  }
  const res = await saveCard(user.id, card);
  if (res.ok) revalidatePath('/portal/account');
  return res;
}

/** Every card on the member's account, the one we charge marked default. */
export async function listCardsAction(): Promise<SavedCard[]> {
  const user = await member();
  return user ? memberCards(user.id) : [];
}

export async function removeCardAction(paymentMethodId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await member();
  if (!user) return { ok: false, error: 'not_authenticated' };
  if (!(await removeCard(user.id, paymentMethodId))) return { ok: false, error: 'not_found' };
  revalidatePath('/portal/account');
  return { ok: true };
}

export async function setDefaultCardAction(paymentMethodId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await member();
  if (!user) return { ok: false, error: 'not_authenticated' };
  if (!(await setChargedCard(user.id, paymentMethodId))) return { ok: false, error: 'not_found' };
  revalidatePath('/portal/account');
  return { ok: true };
}

/** The member's processor account id, for Frame.init (fraud signals). */
export async function frameAccountIdAction(): Promise<string | null> {
  const user = await member();
  return user ? frameAccountFor(user.id) : null;
}
