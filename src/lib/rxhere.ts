/**
 * The pharmacy's partner API (RXHere): place, read and cancel patient-specific
 * orders.
 *
 * Server-only. Configured entirely from env and never logged:
 *   RXHERE_API_TOKEN       bearer token from the pharmacy's Provider Portal
 *   RXHERE_WEBHOOK_SECRET  the secret shown with it, checked on every webhook
 *   RXHERE_API_BASE        optional; defaults to production
 *   RXHERE_DRY_RUN=1       optional; build every payload, send nothing
 *
 * Every request carries patient data, so nothing from a request or a response
 * body is put into a thrown error or a log line: failures come back as a fixed
 * code plus the HTTP status.
 */
import 'server-only';
import type { RxHereOrder, RxHereOrderPayload } from '@/lib/rxhere-rules';

const TIMEOUT_MS = 10_000;

export function rxhereConfigured(): boolean {
  return Boolean(process.env.RXHERE_API_TOKEN && process.env.RXHERE_WEBHOOK_SECRET);
}

export function rxhereDryRun(): boolean {
  return process.env.RXHERE_DRY_RUN === '1';
}

export type RxHereErrorCode =
  | 'sku_unknown'
  | 'patient_incomplete'
  | 'bad_request'
  | 'auth'
  | 'not_found'
  | 'conflict'
  | 'unavailable'
  | 'not_configured';

export type RxHereResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: RxHereErrorCode; status: number; retryable: boolean };

/**
 * 400s are told apart by the pharmacy's message, read here and dropped: an
 * unknown SKU is ours to fix in the catalogue map, a missing identity or
 * address is the patient record.
 */
function codeFor(status: number, message: string): RxHereErrorCode {
  if (status === 400) {
    if (/sku/i.test(message)) return 'sku_unknown';
    if (/patient|address|destination|dateOfBirth|firstName|lastName/i.test(message)) return 'patient_incomplete';
    return 'bad_request';
  }
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  return 'unavailable';
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<RxHereResult<T>> {
  const token = process.env.RXHERE_API_TOKEN;
  if (!token) return { ok: false, code: 'not_configured', status: 0, retryable: false };
  const base = (process.env.RXHERE_API_BASE || 'https://api.rxhere.com/api').replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}${path}`, {
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
    if (res.ok) {
      try {
        return { ok: true, data: JSON.parse(text) as T };
      } catch {
        return { ok: false, code: 'unavailable', status: res.status, retryable: true };
      }
    }
    let message = '';
    try {
      const j = JSON.parse(text) as { error?: unknown; message?: unknown };
      message = String(j.error ?? j.message ?? '');
    } catch {
      message = text.slice(0, 300);
    }
    const code = codeFor(res.status, message);
    return { ok: false, code, status: res.status, retryable: code === 'unavailable' };
  } catch {
    // Timeout or network: the order may or may not have landed. The retry
    // resends the same partnerOrderId, and a 409 then reconciles it.
    return { ok: false, code: 'unavailable', status: 0, retryable: true };
  }
}

const id = (s: string) => encodeURIComponent(s);

export function submitPharmacyOrder(payload: RxHereOrderPayload): Promise<RxHereResult<RxHereOrder>> {
  return call<RxHereOrder>('POST', '/logistics/orders', payload);
}

/** By the pharmacy's orderId or our partnerOrderId (our order number). */
export function getPharmacyOrder(orderIdOrRef: string): Promise<RxHereResult<RxHereOrder>> {
  return call<RxHereOrder>('GET', `/logistics/orders/${id(orderIdOrRef)}`);
}

/** Before carrier dispatch only. A partnerOrderId cancels the whole batch. */
export function cancelPharmacyOrder(
  orderIdOrRef: string,
): Promise<RxHereResult<{ success: boolean; cancelledCount?: number; failedCount?: number }>> {
  return call('POST', `/logistics/orders/${id(orderIdOrRef)}/cancel`);
}

export interface RxHereRates {
  carrier: string;
  rates: {
    serviceLevel: '2_DAY' | 'OVERNIGHT';
    label: string;
    amount: number;
    currency: string;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
    description: string;
  }[];
}

export function getShippingRates(): Promise<RxHereResult<RxHereRates>> {
  return call<RxHereRates>('GET', '/logistics/shipping-rates');
}
