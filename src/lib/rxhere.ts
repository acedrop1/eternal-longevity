/**
 * The pharmacy's practice ordering API (RxHere, run by VitaRelay, Inc.):
 * read the catalog, post prescriptions, read an order. The Oct 18 2026
 * Integration Guide, plus POST /orders/{id}/cancel (works until the order
 * ships; Peter Sporn, Oct 22 2026). There is no shipping-rate endpoint.
 *
 * Server-only. Configured entirely from env and never logged:
 *   RXHERE_API_TOKEN       the practice API key. vr_test_… is the sandbox: every
 *                          check runs, nothing is created, shipped or charged.
 *   RXHERE_WEBHOOK_SECRET  the signing secret RxHere shows once when it
 *                          registers our webhook address (HMAC-SHA256).
 *
 * Every request carries patient data, so nothing from a request or a response
 * body is put into a thrown error or a log line: failures come back as the
 * API's error code plus the HTTP status.
 */
import 'server-only';
import type { RxHereCatalogItem, RxHerePlaced, RxHerePrescriptionPayload } from '@/lib/rxhere-rules';

const BASE = 'https://portal.rxhere.com/api/public/practice/v1';
const TIMEOUT_MS = 15_000;

export function rxhereConfigured(): boolean {
  return Boolean(process.env.RXHERE_API_TOKEN && process.env.RXHERE_WEBHOOK_SECRET);
}

/** A vr_test_ key: the API checks everything and creates nothing. */
export function rxhereSandbox(): boolean {
  return (process.env.RXHERE_API_TOKEN ?? '').startsWith('vr_test_');
}

/** The API's own error codes (guide §8), plus our two for no answer and no key. */
export type RxHereErrorCode =
  | 'invalid_body'
  | 'product_unavailable'
  | 'unauthorized'
  | 'account_not_open'
  | 'forbidden'
  | 'not_found'
  | 'duplicate_request'
  | 'validation_failed'
  | 'invalid_npi'
  | 'invalid_dea'
  | 'controlled_requires_dea'
  | 'license_state_mismatch'
  | 'prescriber_required'
  | 'prescriber_not_found'
  | 'shipping_address_required'
  | 'prescriptions_required'
  | 'order_rejected'
  | 'rate_limited'
  | 'unavailable'
  | 'not_configured';

const KNOWN = new Set<string>([
  'invalid_body', 'product_unavailable', 'unauthorized', 'account_not_open', 'not_found', 'duplicate_request',
  'validation_failed', 'invalid_npi', 'invalid_dea', 'controlled_requires_dea', 'license_state_mismatch',
  'prescriber_required', 'prescriber_not_found', 'shipping_address_required', 'prescriptions_required', 'order_rejected',
]);

export type RxHereResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; code: RxHereErrorCode; status: number; retryable: boolean };

function codeFor(status: number, code: string): RxHereErrorCode {
  if (KNOWN.has(code)) return code as RxHereErrorCode;
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'duplicate_request';
  if (status === 429) return 'rate_limited';
  if (status === 422) return 'validation_failed';
  return 'unavailable';
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<RxHereResult<T>> {
  const token = process.env.RXHERE_API_TOKEN;
  if (!token) return { ok: false, code: 'not_configured', status: 0, retryable: false };
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    const text = await res.text();
    let json: { data?: T; error?: { code?: unknown } } = {};
    try {
      json = JSON.parse(text);
    } catch {
      // Not JSON: an outage page or a proxy error.
    }
    if (res.ok && json.data !== undefined) return { ok: true, data: json.data, status: res.status };
    const code = res.ok ? 'unavailable' : codeFor(res.status, String(json.error?.code ?? ''));
    return { ok: false, code, status: res.status, retryable: ['unavailable', 'rate_limited', 'duplicate_request'].includes(code) };
  } catch {
    // Timeout or network: the order may or may not have landed. The retry
    // resends the same external_order_id, which returns the original order.
    return { ok: false, code: 'unavailable', status: 0, retryable: true };
  }
}

/** One page of the catalog (limit max 100). */
export function listCatalog(opts: { q?: string; page?: number; limit?: number } = {}): Promise<RxHereResult<RxHereCatalogItem[]>> {
  const p = new URLSearchParams();
  if (opts.q) p.set('q', opts.q);
  p.set('page', String(opts.page ?? 1));
  p.set('limit', String(Math.min(100, opts.limit ?? 100)));
  return call<RxHereCatalogItem[]>('GET', `/catalog?${p}`);
}

/** Patient + prescriber + lines in one call; creates nothing unless every check passes. */
export function postPrescription(payload: RxHerePrescriptionPayload): Promise<RxHereResult<RxHerePlaced>> {
  return call<RxHerePlaced>('POST', '/prescriptions', payload);
}

/** By RxHere's order_id. */
export function getPharmacyOrder(orderId: string): Promise<RxHereResult<Record<string, unknown>>> {
  return call('GET', `/orders/${encodeURIComponent(orderId)}`);
}

/** Cancel at the pharmacy, by RxHere's order_id. Refused once the order has shipped. */
export function cancelPharmacyOrder(orderId: string): Promise<RxHereResult<Record<string, unknown>>> {
  return call('POST', `/orders/${encodeURIComponent(orderId)}/cancel`);
}
