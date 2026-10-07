/**
 * The card processor's API (Frame): accounts, saved cards, charges, refunds.
 *
 * Server-only. Configured entirely from env and never logged:
 *   FRAME_SECRET_KEY                   sk_sandbox_… or sk_production_… (the
 *                                      prefix picks the environment; same URL)
 *   NEXT_PUBLIC_FRAME_PUBLISHABLE_KEY  pk_… for Frame.js in the browser
 *   FRAME_WEBHOOK_SECRET               signs X-Frame-Signature
 *
 * Model (docs.framepayments.com, "accept a payment"):
 *   member  → one Frame Account (type individual, capability card_send)
 *   card    → a PaymentMethod bound to that account. Frame.js encrypts the
 *             number and CVC in the browser; we forward the ciphertext.
 *   charge  → a Transfer from the saved PaymentMethod. Charges settle inside
 *             the create call, so the response is usually final.
 *
 * Frame has no idempotency header (V1). Charges therefore go in two steps:
 * create with confirm:false, store the transfer id on the order, then
 * confirm. A retry finds the stored id and reads it instead of creating a
 * second charge (see chargeOnce in lib/payments).
 *
 * Like lib/rxhere, nothing from a request or response body goes into a log
 * line or a thrown error: failures come back as a code plus the HTTP status.
 */
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

const BASE = 'https://api.framepayments.com/v1';
const TIMEOUT_MS = 20_000;

export function frameConfigured(): boolean {
  return Boolean(process.env.FRAME_SECRET_KEY);
}

export type FrameErrorCode =
  | 'declined'
  | 'bad_request'
  | 'auth'
  | 'not_found'
  | 'unavailable'
  | 'not_configured';

export type FrameResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: FrameErrorCode;
      status: number;
      /** Declines only: Frame's decline code and the buyer-facing reason. */
      decline?: { code: string; message: string; category: string };
    };

export interface FrameAccount {
  id: string;
  external_id?: string | null;
}

export interface FramePaymentMethod {
  id: string;
  status: string;
  account_id: string | null;
  card?: { brand: string; last_four: string; exp_month: string; exp_year: string } | null;
}

export type TransferStatus =
  | 'requires_confirmation'
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'requires_3d_secure'
  | 'fraud_review'
  | 'fraud_declined'
  | string;

export interface FrameTransfer {
  id: string;
  status: TransferStatus;
  amount: number;
  frame_fee: number | null;
  total_fees: number | null;
  net_amount: number | null;
  failure_code: string | null;
  failure_message: string | null;
  account_id: string;
  source_payment_method?: { id: string } | null;
  metadata: Record<string, string>;
  /** Set when status is requires_3d_secure: Frame.js confirmCardPayment takes it. */
  client_secret?: string | null;
}

export interface FrameRefund {
  id: string;
  amount: number;
  status: string;
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<FrameResult<T>> {
  const key = process.env.FRAME_SECRET_KEY;
  if (!key) return { ok: false, code: 'not_configured', status: 0 };
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
    } catch {
      json = null;
    }
    if (res.ok) {
      return json ? { ok: true, data: json as T } : { ok: false, code: 'unavailable', status: res.status };
    }
    // A declined charge: 422 with code charge_declined and the decline in error_details.data.
    const details = (json?.error_details ?? null) as { data?: Record<string, unknown> } | null;
    if (res.status === 422 && json?.code === 'charge_declined') {
      const d = details?.data ?? {};
      return {
        ok: false,
        code: 'declined',
        status: 422,
        decline: {
          code: String(d.failure_code ?? 'declined'),
          message: String(d.failure_message ?? 'Your card was declined.'),
          category: String(d.failure_category ?? 'unknown'),
        },
      };
    }
    if (res.status === 401 || res.status === 403) return { ok: false, code: 'auth', status: res.status };
    if (res.status === 404) return { ok: false, code: 'not_found', status: 404 };
    if (res.status >= 400 && res.status < 500) return { ok: false, code: 'bad_request', status: res.status };
    return { ok: false, code: 'unavailable', status: res.status };
  } catch {
    // Timeout or network: a charge may or may not have landed. Callers that
    // charge read the stored transfer back before trying again.
    return { ok: false, code: 'unavailable', status: 0 };
  }
}

const id = (s: string) => encodeURIComponent(s);

/* --------------------------------- Accounts -------------------------------- */

export function createAccount(input: {
  email: string;
  firstName: string;
  lastName: string;
  /** Our user id, so the account can be traced back. */
  externalId: string;
}): Promise<FrameResult<FrameAccount>> {
  return call('POST', '/accounts', {
    type: 'individual',
    capabilities: ['card_send'],
    profile: {
      individual: {
        email: input.email,
        name: { first_name: input.firstName || 'Member', last_name: input.lastName || '-' },
      },
    },
    external_id: input.externalId,
  });
}

/* ----------------------------- Payment methods ----------------------------- */

/** The encrypted card fields Frame.js emits on a complete `change` payload. */
export interface EncryptedCard {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
}

export function createCard(accountId: string, card: EncryptedCard): Promise<FrameResult<FramePaymentMethod>> {
  return call('POST', '/payment_methods', {
    type: 'card',
    // `account`, not `account_id`: the latter is silently ignored.
    account: accountId,
    card_number: card.number,
    cvc: card.cvc,
    exp_month: card.expMonth,
    exp_year: card.expYear,
  });
}

export async function listCards(accountId: string): Promise<FrameResult<FramePaymentMethod[]>> {
  const res = await call<{ data: FramePaymentMethod[] }>('GET', `/accounts/${id(accountId)}/payment_methods`);
  if (!res.ok) return res;
  return { ok: true, data: (res.data.data ?? []).filter((m) => m.card && m.status === 'active') };
}

export function getPaymentMethod(paymentMethodId: string): Promise<FrameResult<FramePaymentMethod>> {
  return call('GET', `/payment_methods/${id(paymentMethodId)}`);
}

export function detachCard(paymentMethodId: string): Promise<FrameResult<FramePaymentMethod>> {
  return call('POST', `/payment_methods/${id(paymentMethodId)}/detach`);
}

/* -------------------------------- Transfers -------------------------------- */

/** Step one of a charge: nothing moves until confirmTransfer. */
export function createCharge(input: {
  accountId: string;
  paymentMethodId: string;
  amountCents: number;
  description: string;
  metadata: Record<string, string>;
}): Promise<FrameResult<FrameTransfer>> {
  return call('POST', '/transfers', {
    amount: input.amountCents,
    currency: 'USD',
    account_id: input.accountId,
    source_payment_method_id: input.paymentMethodId,
    description: input.description,
    metadata: input.metadata,
    confirm: false,
  });
}

export function confirmTransfer(transferId: string): Promise<FrameResult<FrameTransfer>> {
  return call('POST', `/transfers/${id(transferId)}/confirm`);
}

export function getTransfer(transferId: string): Promise<FrameResult<FrameTransfer>> {
  return call('GET', `/transfers/${id(transferId)}`);
}

/* --------------------------------- Refunds --------------------------------- */

/** Omit amount for a full refund. Several partial refunds may follow one charge. */
export function createRefund(input: {
  transferId: string;
  amountCents?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}): Promise<FrameResult<FrameRefund>> {
  return call('POST', '/refunds', {
    transfer: input.transferId,
    ...(input.amountCents ? { amount: input.amountCents } : {}),
    reason: input.reason ?? 'requested_by_customer',
  });
}

export async function listRefunds(transferId: string): Promise<FrameResult<FrameRefund[]>> {
  const res = await call<{ data: FrameRefund[] }>('GET', `/refunds?transfer=${id(transferId)}`);
  if (!res.ok) return res;
  return { ok: true, data: res.data.data ?? [] };
}

/* --------------------------------- Webhooks -------------------------------- */

/**
 * X-Frame-Signature is `sha256=<hex>`: HMAC-SHA256 of the raw body with the
 * endpoint's secret. There is no timestamp in it, so callers dedupe on the
 * event id (Frame delivers at least once).
 */
export function verifyWebhook(rawBody: string, header: string | null): boolean {
  const secret = process.env.FRAME_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const given = header.startsWith('sha256=') ? header.slice(7) : header;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(given, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
