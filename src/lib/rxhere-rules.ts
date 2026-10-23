/**
 * Pure rules for the pharmacy's practice API (RxHere Integration Guide, Oct 2026).
 *
 * No I/O and no server imports, so the payload, the webhook mapping and the
 * signature check can be asserted in isolation (scripts/check-rxhere.mjs). The HTTP client is rxhere.ts; the orchestration is auto-pharmacy.ts
 * and the webhook route.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { monthsPerCycle } from '@/lib/order-rules';
import type { PharmacyItem } from '@/lib/pharmacy-catalog';

/* --------------------------------- orders --------------------------------- */

/** One catalog product (guide §2). `id` is the platform_product_id we order by. */
export interface RxHereCatalogItem {
  id: string;
  name: string;
  type?: string;
  category?: string;
  strengths?: unknown;
  dosage_form?: string;
  price_cents?: number;
  controlled_substance?: boolean;
}

/** The catalog page as returned: an array, or an object carrying one. */
export function catalogItems(data: unknown): RxHereCatalogItem[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? Object.values(data as Record<string, unknown>).find(Array.isArray) ?? []
      : [];
  return (list as Record<string, unknown>[]).filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string') as unknown as RxHereCatalogItem[];
}

export interface RxHerePrescriptionPayload {
  patient: {
    external_patient_id: string;
    first_name: string;
    last_name: string;
    dob: string;
    email?: string;
    phone?: string;
    gender?: string;
    allergies?: string[];
    address: { line1: string; line2?: string; city: string; state: string; postal_code: string };
  };
  prescriber: {
    full_name: string;
    npi_number: string;
    dea_number?: string;
    licenses: { state: string; number: string }[];
  };
  prescriptions: {
    platform_product_id: string;
    order_quantity: number;
    drug_name: string;
    strength?: string;
    dosage_form?: string;
    sig: string;
    quantity?: number;
    days_supply?: number;
  }[];
  shipping_destination_type: 'patient_direct';
  external_order_id: string;
}

/** POST /prescriptions answer (guide §3). */
export interface RxHerePlaced {
  patient_id?: string;
  prescriber_id?: string;
  order_id?: string;
  order_number?: string;
  status?: string;
  billing?: 'card' | 'invoice';
  payment_status?: 'paid' | 'awaiting_payment' | 'not_required' | 'refunded';
  payment_message?: string;
  total_cents?: number;
  sandbox?: boolean;
  idempotent_replay?: boolean;
}

/** YYYY-MM-DD from what we store (date column, ISO timestamp, or US M/D/YYYY). */
export function toIsoDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  let y: number, m: number, d: number;
  let hit = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (hit) [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  else if ((hit = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) [m, d, y] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Rejects 1990-02-31 and the like rather than rolling it into March.
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  if (y < 1900 || dt.getTime() > Date.now()) return null;
  return dt.toISOString().slice(0, 10);
}

const GENDER: Record<string, string> = { m: 'male', f: 'female', intersex: 'other' };

/**
 * Only an explicit "no" is NKDA. An intake that never asked is not the same as
 * a patient with no allergies, so it is left out for the pharmacist to see.
 */
export function allergiesFrom(answers: Record<string, unknown>): string[] | undefined {
  if (answers.allergies_any === 'no') return ['No Known Drug Allergies (NKDA)'];
  if (answers.allergies_any === 'yes') {
    const detail = typeof answers.allergies_detail === 'string' ? answers.allergies_detail.trim() : '';
    return [(detail || 'Reports drug allergies; details not given').slice(0, 500)];
  }
  return undefined;
}

/**
 * Units on the order: a month's supply × the months in the plan × the line
 * quantity. Every plan is one order for the whole cycle: a 12 month plan is 12.
 */
export function pharmacyQuantity(item: Pick<PharmacyItem, 'quantity'>, cadence: string, lineQty: number): number {
  return Math.max(1, item.quantity) * monthsPerCycle(cadence) * Math.max(1, lineQty);
}

/** The catalog id: a UUID. An old partner-API SKU (AA-NAD-02…) is not one and is never sent. */
export const isCatalogId = (v: string | null | undefined) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((v ?? '').trim());

/** DEA: 2 letters then 7 digits passing the DEA checksum (guide §4). */
export function validDea(v: string): boolean {
  const m = v.trim().toUpperCase().match(/^[A-Z]{2}(\d{7})$/);
  if (!m) return false;
  const d = m[1].split('').map(Number);
  return (d[0] + d[2] + d[4] + 2 * (d[1] + d[3] + d[5])) % 10 === d[6];
}

export type PayloadError =
  | 'sku_missing'
  | 'no_directions'
  | 'patient_incomplete'
  | 'no_address'
  | 'no_npi'
  | 'no_license';

export interface PayloadInput {
  orderNumber: string;
  patientId: string;
  item: PharmacyItem | null;
  cadence: string;
  lineQty: number;
  sig: string | null;
  patient: {
    firstName: string | null;
    lastName: string | null;
    dob: unknown;
    answers: Record<string, unknown>;
    phone: string | null;
    email: string | null;
  };
  address: Record<string, unknown> | null;
  prescriber: {
    name: string;
    npi: string;
    dea: string;
    /** state → licence number, the primary licence included. */
    licenses: Record<string, string>;
  };
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
/** Leave a field out rather than send it empty. */
const opt = (v: unknown) => str(v) || undefined;

/**
 * The prescription we post. Refuses rather than guesses: no catalog id, no
 * directions, no real patient identity, no full address, no NPI or no licence
 * at all means it is not sent and stays on the board for a person.
 */
export function buildPrescriptionPayload(
  input: PayloadInput,
): { ok: true; payload: RxHerePrescriptionPayload } | { ok: false; error: PayloadError } {
  const { item, patient, prescriber } = input;
  if (!item || !isCatalogId(item.sku)) return { ok: false, error: 'sku_missing' };

  const sig = str(input.sig);
  if (!sig) return { ok: false, error: 'no_directions' };

  const firstName = str(patient.firstName);
  const lastName = str(patient.lastName);
  const dob = toIsoDate(patient.dob);
  if (!firstName || !lastName || !dob) return { ok: false, error: 'patient_incomplete' };

  const a = input.address ?? {};
  const state = str(a.state).toUpperCase();
  const postal = str(a.zip) || str(a.zipCode) || str(a.postal_code);
  if (!str(a.line1) || !str(a.city) || !/^[A-Z]{2}$/.test(state) || !postal) return { ok: false, error: 'no_address' };

  if (!/^\d{10}$/.test(str(prescriber.npi))) return { ok: false, error: 'no_npi' };

  // Every licence we hold goes. RxHere keeps the ones already on its file, so a
  // state missing here is RxHere's call (license_state_mismatch), not a block.
  const licenses = Object.entries(prescriber.licenses)
    .map(([st, number]) => ({ state: st.trim().toUpperCase(), number: str(number) }))
    .filter((l) => /^[A-Z]{2}$/.test(l.state) && l.number);
  if (!licenses.length) return { ok: false, error: 'no_license' };

  const dea = str(prescriber.dea).toUpperCase();
  const quantity = pharmacyQuantity(item, input.cadence, input.lineQty);

  return {
    ok: true,
    payload: {
      patient: {
        external_patient_id: input.patientId,
        first_name: firstName,
        last_name: lastName,
        dob,
        email: opt(patient.email),
        phone: (opt(patient.phone) ?? opt(a.phone))?.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''),
        gender: GENDER[str(patient.answers.sex)],
        allergies: allergiesFrom(patient.answers),
        address: { line1: str(a.line1), line2: opt(a.line2), city: str(a.city), state, postal_code: postal },
      },
      prescriber: {
        full_name: str(prescriber.name),
        npi_number: str(prescriber.npi),
        // Required only for controlled substances; a malformed one would reject the whole order.
        dea_number: validDea(dea) ? dea : undefined,
        licenses,
      },
      prescriptions: [
        {
          platform_product_id: str(item.sku),
          order_quantity: quantity,
          drug_name: item.name,
          strength: opt(item.strength),
          dosage_form: opt(item.dosageForm),
          sig,
          quantity,
          days_supply: 30 * monthsPerCycle(input.cadence),
        },
      ],
      shipping_destination_type: 'patient_direct',
      external_order_id: input.orderNumber,
    },
  };
}

/* -------------------------------- webhooks -------------------------------- */

/** Our names for the guide's events (§7). */
export const RXHERE_EVENTS = ['PAID', 'INVOICED', 'FULFILLED', 'SHIPPED', 'DELIVERED', 'EXCEPTION', 'CANCELLED', 'PAYMENT_FAILED'] as const;
export type RxHereEvent = (typeof RXHERE_EVENTS)[number];
const EVENT_MAP: Record<string, RxHereEvent> = {
  'order.paid': 'PAID',
  'order.invoiced': 'INVOICED',
  'order.shipped': 'SHIPPED',
  'order.delivered': 'DELIVERED',
  'order.exception': 'EXCEPTION',
  // Sent too (Peter Sporn, Oct 22 2026), beyond the guide's five.
  'order.fulfilled': 'FULFILLED',
  'order.cancelled': 'CANCELLED',
  'order.payment_failed': 'PAYMENT_FAILED',
};

export interface RxHereWebhook {
  /** RxHere's order_id (we store it as orders.pharmacy_order_id). */
  reference: string;
  event: RxHereEvent;
  occurredAt: string;
  trackingNumber: string | null;
  carrier: string | null;
  reason: string | null;
}

/** The documented payload, or null. Unknown events and malformed bodies are dropped. */
export function parseWebhook(body: unknown): RxHereWebhook | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const reference = str(b.order_id);
  const event = EVENT_MAP[str(b.event)];
  const occurredAt = str(b.occurred_at);
  if (!reference || reference.length > 100 || !event) return null;
  if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) return null;
  return {
    reference,
    event,
    occurredAt: new Date(occurredAt).toISOString(),
    trackingNumber: opt(b.tracking_number)?.slice(0, 64) ?? null,
    carrier: opt(b.tracking_carrier)?.slice(0, 40) ?? null,
    reason: (opt(b.message) ?? opt(b.reason) ?? opt(b.status))?.slice(0, 2000) ?? null,
  };
}

/**
 * X-Webhook-Signature: "sha256=" + hex HMAC-SHA256 of the exact raw body,
 * keyed with the signing secret. Constant-time; a wrong length is just false.
 */
export function signatureValid(rawBody: string, header: string | null | undefined, secret: string | undefined): boolean {
  if (!header || !secret) return false;
  const hex = header.trim().replace(/^sha256=/i, '');
  if (!/^[0-9a-f]+$/i.test(hex)) return false;
  const received = Buffer.from(hex, 'hex');
  // The guide keys with the secret as issued (whsec_…); accept the bare part after the prefix too.
  const keys = [secret, secret.replace(/^whsec_/, '')].filter((k, i, a) => k && a.indexOf(k) === i);
  return keys.some((k) => {
    const expected = createHmac('sha256', k).update(rawBody, 'utf8').digest();
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

type RowStatus = 'draft' | 'submitted' | 'accepted' | 'shipped' | 'delivered' | 'canceled';
type Step = 'placed' | 'shipped' | 'delivered';

export interface WebhookPlan {
  /** Board steps to run, in order, through advanceFulfillment. */
  steps: Step[];
  /** A member-timeline entry beyond what the steps write. */
  timeline: { label: string; body: string } | null;
  alert: 'exception' | 'no_tracking' | 'cancelled' | 'payment_failed' | null;
}

const PRE_SHIP: RowStatus[] = ['draft', 'submitted'];

/**
 * What an event does to our order. Steps only ever move forward: each one is
 * offered only from a board status it can follow, and advanceFulfillment's
 * conditional update refuses anything else, so a late or replayed event never
 * moves an order back. PAID and INVOICED are RxHere billing us; they only
 * update the staff status.
 */
export function planWebhookEvent(w: RxHereWebhook, row: RowStatus): WebhookPlan {
  const none: WebhookPlan = { steps: [], timeline: null, alert: null };
  if (row === 'canceled') return none;

  switch (w.event) {
    case 'PAID':
    case 'INVOICED':
    case 'FULFILLED':
      return none;
    case 'PAYMENT_FAILED':
      return { ...none, alert: 'payment_failed' };
    case 'CANCELLED':
      // Ours to decide (refund, re-place): a person looks; nothing moves on its own.
      return { ...none, alert: 'cancelled' };
    case 'SHIPPED':
      if (!w.trackingNumber) return { ...none, alert: 'no_tracking' };
      return { ...none, steps: [...PRE_SHIP, 'accepted'].includes(row) ? ['shipped'] : [] };
    case 'DELIVERED':
      // A DELIVERED that overtakes its SHIPPED (retries arrive out of order)
      // still lands: ship it with the tracking it carries, then deliver.
      return {
        ...none,
        steps: row === 'shipped' ? ['delivered'] : row !== 'delivered' && w.trackingNumber ? ['shipped', 'delivered'] : [],
      };
    case 'EXCEPTION':
      return {
        steps: [],
        timeline: { label: 'Delivery update', body: 'The carrier reported a delay or a delivery problem. We are following it up.' },
        alert: 'exception',
      };
  }
}

/*
 * The pharmacy status shown to staff. Phases only move forward, and DELIVERED
 * and CANCELLED are final. AWAITING_PAYMENT is ours: RxHere could not charge our card
 * when the order was placed; PAYMENT_FAILED is the same, reported later.
 */
const PHASE: Record<string, number> = {
  SENDING: 0,
  ERROR: 0,
  MANUAL: 0,
  DRY_RUN: 0,
  AWAITING_PAYMENT: 1,
  PAID: 1,
  INVOICED: 1,
  PAYMENT_FAILED: 1,
  FULFILLED: 1.5,
  SHIPPED: 2,
  EXCEPTION: 2,
  DELIVERED: 3,
  CANCELLED: 3,
};

/** The new status, or null to leave it. Unknown current values (the API's own words) count as just sent. */
export function nextPharmacyStatus(current: string | null, incoming: RxHereEvent): string | null {
  const from = current ? PHASE[current] ?? 1 : 0;
  if (from === 3) return null;
  return PHASE[incoming] >= from ? incoming : null;
}
