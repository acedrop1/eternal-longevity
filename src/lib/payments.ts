import 'server-only';

/**
 * Cards on file and charges, on top of lib/frame. Everything that saves a
 * card or takes money goes through here; lib/payment-record marks orders paid.
 *
 *   saveCard     encrypted card from Frame.js → saved on the member's Frame
 *                account and made the card we charge. Charges nothing.
 *   chargeOrder  charge an order's total to the saved card, exactly once.
 *
 * Why chargeOrder is shaped the way it is: Frame has no idempotency key, and
 * a charge settles inside the API call. So the transfer is created
 * unconfirmed, its id is written onto the order (only if the order has none,
 * or still holds the failed one being replaced), and only then confirmed. Any
 * retry, a double click, a cron overlapping an approval, a timeout, reads
 * that stored transfer back instead of creating a second charge.
 */

import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import {
  confirmTransfer,
  createAccount,
  createCard,
  createCharge,
  detachCard,
  frameConfigured,
  getPaymentMethod,
  getTransfer,
  listCards,
  type EncryptedCard,
  type FramePaymentMethod,
  type FrameTransfer,
} from '@/lib/frame';
import { recordPayment } from '@/lib/payment-record';

type Db = ReturnType<typeof createSupabaseAdminClient>;

export function paymentsConfigured(): boolean {
  return frameConfigured() && supabaseAdminConfigured();
}

export interface CardOnFile {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

function toCard(pm: FramePaymentMethod, defaultId: string | null): CardOnFile | null {
  if (!pm.card) return null;
  const year = Number(pm.card.exp_year);
  return {
    id: pm.id,
    brand: pm.card.brand,
    last4: pm.card.last_four,
    expMonth: Number(pm.card.exp_month),
    // Frame stores the two digits the member typed.
    expYear: year < 100 ? 2000 + year : year,
    isDefault: pm.id === defaultId,
  };
}

/* --------------------------------- Accounts -------------------------------- */

/** The member's Frame account, created on first use and kept on their profile. */
export async function frameAccountFor(userId: string): Promise<string | null> {
  if (!paymentsConfigured()) return null;
  const db = createSupabaseAdminClient();
  const { data: profile } = await db
    .from('profiles')
    .select('frame_account_id, email, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return null;
  if (profile.frame_account_id) return profile.frame_account_id;
  if (!profile.email) return null;

  const [first, ...rest] = (profile.full_name ?? '').trim().split(/\s+/);
  const created = await createAccount({
    email: profile.email,
    firstName: first ?? '',
    lastName: rest.join(' '),
    externalId: userId,
  });
  if (!created.ok) {
    console.error(`[payments] account create failed: ${created.code} ${created.status}`);
    return null;
  }
  // Two first uses racing: the first write wins and the other is read back.
  const { data: kept } = await db
    .from('profiles')
    .update({ frame_account_id: created.data.id })
    .eq('id', userId)
    .is('frame_account_id', null)
    .select('frame_account_id');
  if (kept?.length) return created.data.id;
  const { data: again } = await db.from('profiles').select('frame_account_id').eq('id', userId).maybeSingle();
  return again?.frame_account_id ?? null;
}

/* ---------------------------------- Cards ---------------------------------- */

export type SaveCardResult =
  | { ok: true; card: CardOnFile }
  | { ok: false; error: 'not_configured' | 'no_account' | 'card_rejected' | 'unavailable'; message: string };

/** Save the card Frame.js encrypted and make it the one we charge. Charges nothing. */
export async function saveCard(userId: string, card: EncryptedCard): Promise<SaveCardResult> {
  if (!paymentsConfigured()) return { ok: false, error: 'not_configured', message: 'Payments are not set up yet.' };
  if (![card.number, card.cvc, card.expMonth, card.expYear].every((v) => typeof v === 'string' && v.length > 0)) {
    return { ok: false, error: 'card_rejected', message: 'Check your card details and try again.' };
  }
  const account = await frameAccountFor(userId);
  if (!account) return { ok: false, error: 'no_account', message: 'We could not set up payment for your account. Please try again.' };

  const pm = await createCard(account, card);
  if (!pm.ok) {
    return pm.code === 'bad_request' || pm.code === 'declined'
      ? { ok: false, error: 'card_rejected', message: pm.decline?.message ?? 'That card was not accepted. Check the details or try another card.' }
      : { ok: false, error: 'unavailable', message: 'We could not save your card just now. Please try again in a minute.' };
  }
  const db = createSupabaseAdminClient();
  await db.from('profiles').update({ frame_payment_method_id: pm.data.id }).eq('id', userId);
  const saved = toCard(pm.data, pm.data.id);
  return saved
    ? { ok: true, card: saved }
    : { ok: false, error: 'card_rejected', message: 'That card was not accepted. Try another card.' };
}

/** The card we charge for this member, if it is still active on their account. */
export async function cardOnFile(userId: string): Promise<CardOnFile | null> {
  if (!paymentsConfigured()) return null;
  const db = createSupabaseAdminClient();
  const { data: profile } = await db
    .from('profiles')
    .select('frame_account_id, frame_payment_method_id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile?.frame_account_id || !profile.frame_payment_method_id) return null;
  const pm = await getPaymentMethod(profile.frame_payment_method_id);
  if (!pm.ok || pm.data.status !== 'active' || pm.data.account_id !== profile.frame_account_id) return null;
  return toCard(pm.data, pm.data.id);
}

/** Every active card on the member's account, the charged one marked. */
export async function memberCards(userId: string): Promise<CardOnFile[]> {
  if (!paymentsConfigured()) return [];
  const db = createSupabaseAdminClient();
  const { data: profile } = await db
    .from('profiles')
    .select('frame_account_id, frame_payment_method_id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile?.frame_account_id) return [];
  const res = await listCards(profile.frame_account_id);
  if (!res.ok) return [];
  return res.data.map((pm) => toCard(pm, profile.frame_payment_method_id)).filter((c): c is CardOnFile => c !== null);
}

/**
 * The card id arrives from the browser: it must belong to this member's own
 * account, or one member could charge or remove another's card by guessing.
 */
async function ownCard(db: Db, userId: string, paymentMethodId: string): Promise<{ account: string; current: string | null } | null> {
  const { data: profile } = await db
    .from('profiles')
    .select('frame_account_id, frame_payment_method_id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile?.frame_account_id) return null;
  const pm = await getPaymentMethod(paymentMethodId);
  if (!pm.ok || pm.data.account_id !== profile.frame_account_id) return null;
  return { account: profile.frame_account_id, current: profile.frame_payment_method_id };
}

export async function setChargedCard(userId: string, paymentMethodId: string): Promise<boolean> {
  if (!paymentsConfigured()) return false;
  const db = createSupabaseAdminClient();
  if (!(await ownCard(db, userId, paymentMethodId))) return false;
  await db.from('profiles').update({ frame_payment_method_id: paymentMethodId }).eq('id', userId);
  return true;
}

export async function removeCard(userId: string, paymentMethodId: string): Promise<boolean> {
  if (!paymentsConfigured()) return false;
  const db = createSupabaseAdminClient();
  const own = await ownCard(db, userId, paymentMethodId);
  if (!own) return false;
  const res = await detachCard(paymentMethodId);
  if (!res.ok) return false;
  if (own.current === paymentMethodId) {
    // The charged card is gone: fall back to another active one, or none.
    const next = (await memberCards(userId)).find((c) => c.id !== paymentMethodId)?.id ?? null;
    await db.from('profiles').update({ frame_payment_method_id: next }).eq('id', userId);
  }
  return true;
}

/* --------------------------------- Charges --------------------------------- */

export type ChargeOutcome =
  | { status: 'paid'; transferId: string }
  /** Frame is still deciding (fraud review, processing). The webhook settles it. */
  | { status: 'pending'; transferId: string }
  /** The bank wants the member to approve it: Frame.js confirmCardPayment(clientSecret). */
  | { status: 'requires_action'; transferId: string; clientSecret: string }
  | { status: 'declined'; code: string; message: string }
  | { status: 'no_card' }
  | { status: 'error'; code: 'not_configured' | 'not_found' | 'invalid_amount' | 'no_account' | 'unavailable' };

const FAILED = new Set(['failed', 'fraud_declined', 'canceled', 'cancelled']);

/**
 * Charge an order's total, exactly once. Safe to call again for the same
 * order at any time: it reports the existing charge instead of making one.
 * `paymentMethodId` charges a specific card (the pay page, just saved);
 * otherwise the member's charged card.
 */
export async function chargeOrder(orderId: string, opts: { paymentMethodId?: string } = {}, depth = 0): Promise<ChargeOutcome> {
  if (!paymentsConfigured()) return { status: 'error', code: 'not_configured' };
  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, user_id, total_cents, paid_confirmed_at, frame_transfer_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return { status: 'error', code: 'not_found' };
  if (order.paid_confirmed_at && order.frame_transfer_id) return { status: 'paid', transferId: order.frame_transfer_id };

  const tag = (t: FrameTransfer): FrameTransfer => ({
    ...t,
    metadata: { ...(t.metadata ?? {}), order_id: order.id, order_number: order.order_number },
  });
  const settle = async (t: FrameTransfer): Promise<ChargeOutcome> => {
    if (t.status === 'succeeded') {
      await recordPayment(db, tag(t));
      return { status: 'paid', transferId: t.id };
    }
    if (t.status === 'requires_3d_secure' && t.client_secret) {
      return { status: 'requires_action', transferId: t.id, clientSecret: t.client_secret };
    }
    if (FAILED.has(t.status)) {
      return { status: 'declined', code: t.failure_code ?? 'declined', message: t.failure_message ?? 'Your card was declined.' };
    }
    return { status: 'pending', transferId: t.id };
  };

  // A charge already started for this order: finish or report it, never start a second.
  let replacing: string | null = null;
  if (order.frame_transfer_id) {
    const prior = await getTransfer(order.frame_transfer_id);
    if (!prior.ok && prior.code !== 'not_found') return { status: 'error', code: 'unavailable' };
    if (prior.ok) {
      // Waiting on the bank's approval, and the member now pays with another
      // card: no money moved on the old one, so the new card replaces it. If
      // the old one were somehow approved later, recordPayment refunds it as
      // a second payment on a paid order.
      const abandoned =
        prior.data.status === 'requires_3d_secure' &&
        !!opts.paymentMethodId &&
        opts.paymentMethodId !== prior.data.source_payment_method?.id;
      if (prior.data.status === 'requires_confirmation') return confirmAndSettle(prior.data.id);
      if (!FAILED.has(prior.data.status) && !abandoned) return settle(prior.data);
      // Declined before: a new attempt (a new card, or the same one retried) may go.
      replacing = prior.data.id;
    } else {
      replacing = order.frame_transfer_id;
    }
  }

  const amount = order.total_cents ?? 0;
  if (amount <= 0) return { status: 'error', code: 'invalid_amount' };

  const account = await frameAccountFor(order.user_id);
  if (!account) return { status: 'error', code: 'no_account' };
  let paymentMethodId = opts.paymentMethodId ?? null;
  if (paymentMethodId) {
    if (!(await ownCard(db, order.user_id, paymentMethodId))) return { status: 'no_card' };
  } else {
    paymentMethodId = (await cardOnFile(order.user_id))?.id ?? null;
  }
  if (!paymentMethodId) return { status: 'no_card' };

  const created = await createCharge({
    accountId: account,
    paymentMethodId,
    amountCents: amount,
    description: `Care program, order ${order.order_number}`,
    metadata: { order_id: order.id, order_number: order.order_number },
  });
  if (!created.ok) {
    return created.code === 'declined' && created.decline
      ? { status: 'declined', code: created.decline.code, message: created.decline.message }
      : { status: 'error', code: 'unavailable' };
  }

  // Claim the order for this charge before any money moves.
  const claim = db.from('orders').update({ frame_transfer_id: created.data.id }).eq('id', order.id);
  const { data: claimed } = await (replacing ? claim.eq('frame_transfer_id', replacing) : claim.is('frame_transfer_id', null)).select('id');
  if (!claimed?.length) {
    // Another caller started a charge first. Ours stays unconfirmed (moves no
    // money); report theirs.
    return depth === 0 ? chargeOrder(orderId, opts, 1) : { status: 'error', code: 'unavailable' };
  }
  return confirmAndSettle(created.data.id);

  async function confirmAndSettle(transferId: string): Promise<ChargeOutcome> {
    const res = await confirmTransfer(transferId);
    if (res.ok) return settle(res.data);
    if (res.code === 'declined' && res.decline) {
      return { status: 'declined', code: res.decline.code, message: res.decline.message };
    }
    // Timeout or an unclear answer: the next call reads the transfer back.
    return { status: 'error', code: 'unavailable' };
  }
}
