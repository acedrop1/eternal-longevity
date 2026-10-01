/**
 * Pure rules for the pharmacy's partner API.
 *
 * No I/O and no server imports, so the order payload, the webhook mapping and
 * the secret check can be asserted in isolation (see the scratchpad check
 * script). The HTTP client is rxhere.ts; the orchestration is auto-pharmacy.ts
 * and the webhook route.
 */

import { createHash, timingSafeEqual } from 'crypto';
import { monthsPerCycle } from '@/lib/order-rules';
import type { PharmacyItem } from '@/lib/pharmacy-catalog';

/* --------------------------------- orders --------------------------------- */

export interface RxHereAddress {
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: 'US';
}

export interface RxHereOrderPayload {
  partnerOrderId: string;
  shippingMethod: '2_DAY' | 'OVERNIGHT';
  sku: string;
  name?: string;
  strength?: string;
  size?: string;
  dosageForm?: string;
  quantity: number;
  sig: string;
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: 'Male' | 'Female' | 'Other';
    phone?: string;
    email?: string;
    allergies?: string;
    height?: string;
    weight?: string;
    address: RxHereAddress;
  };
  prescriber: {
    npiNumber: string;
    firstName?: string;
    lastName?: string;
    title?: string;
    practiceName?: string;
    stateLicenseNumber?: string;
    phone?: string;
    email?: string;
  };
}

export interface RxHereOrder {
  orderId: string;
  orderIds?: string[];
  partnerOrderId?: string;
  batchId?: string | null;
  orderFlowType?: string;
  isRuo?: boolean;
  status?: string;
  departmentQueue?: string;
  totalAmount?: string;
}

/**
 * Patient-specific (503A) only. A research-use order ships with no patient to
 * the provider: that is never what we mean, so anything other than an
 * explicit NORMAL, non-RUO answer is treated as wrong and cancelled.
 */
export function isPatientSpecific(o: Pick<RxHereOrder, 'isRuo' | 'orderFlowType'>): boolean {
  // Only an explicit research-use marker trips this; a response that omits the field is not RUO.
  return o.isRuo !== true && (o.orderFlowType === undefined || o.orderFlowType === 'NORMAL');
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

const GENDER: Record<string, 'Male' | 'Female' | 'Other'> = { m: 'Male', f: 'Female', intersex: 'Other' };

/**
 * Only an explicit "no" is NKDA. An intake that never asked is not the same as
 * a patient with no allergies, so it is left blank for the pharmacist to see.
 */
export function allergiesFrom(answers: Record<string, unknown>): string | undefined {
  if (answers.allergies_any === 'no') return 'No Known Drug Allergies (NKDA)';
  if (answers.allergies_any === 'yes') {
    const detail = typeof answers.allergies_detail === 'string' ? answers.allergies_detail.trim() : '';
    return (detail || 'Reports drug allergies; details not given').slice(0, 500);
  }
  return undefined;
}

/** Units on the order: a month's supply × the months a shipment covers × the line quantity. */
export function pharmacyQuantity(item: Pick<PharmacyItem, 'quantity'>, cadence: string, lineQty: number): number {
  return Math.max(1, item.quantity) * monthsPerCycle(cadence) * Math.max(1, lineQty);
}

export type PayloadError = 'sku_missing' | 'no_directions' | 'patient_incomplete' | 'no_address' | 'no_npi';

export interface PayloadInput {
  orderNumber: string;
  item: PharmacyItem | null;
  cadence: string;
  lineQty: number;
  sig: string | null;
  shippingMethod: '2_DAY' | 'OVERNIGHT';
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
    credential: string;
    npi: string;
    licenseState: string;
    licenseNumber: string;
    phone: string;
    email: string;
  };
  practiceName: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
/** Leave a field out rather than send it empty. */
const opt = (v: unknown) => str(v) || undefined;

/**
 * The order we send. Refuses rather than guesses: no SKU, no directions, no
 * real patient identity, no address or no NPI means it is not sent at all and
 * stays on the board for a person.
 */
export function buildOrderPayload(
  input: PayloadInput,
): { ok: true; payload: RxHereOrderPayload } | { ok: false; error: PayloadError } {
  const { item, patient, prescriber } = input;
  if (!item?.sku) return { ok: false, error: 'sku_missing' };

  const sig = str(input.sig);
  if (!sig) return { ok: false, error: 'no_directions' };

  const firstName = str(patient.firstName);
  const lastName = str(patient.lastName);
  const dateOfBirth = toIsoDate(patient.dob);
  if (!firstName || !lastName || !dateOfBirth) return { ok: false, error: 'patient_incomplete' };

  const a = input.address ?? {};
  if (!str(a.line1)) return { ok: false, error: 'no_address' };
  const state = str(a.state).toUpperCase();

  if (!/^\d{10}$/.test(str(prescriber.npi))) return { ok: false, error: 'no_npi' };

  const ans = patient.answers;
  const ft = Number(ans.height_ft);
  const inch = Number(ans.height_in);
  const lb = Number(ans.weight_lb);
  const [pFirst, ...pRest] = str(prescriber.name).split(/\s+/);

  return {
    ok: true,
    payload: {
      partnerOrderId: input.orderNumber,
      shippingMethod: input.shippingMethod,
      sku: item.sku,
      name: opt(item.name),
      strength: opt(item.strength),
      size: opt(item.size),
      dosageForm: opt(item.dosageForm),
      quantity: pharmacyQuantity(item, input.cadence, input.lineQty),
      sig,
      patient: {
        firstName,
        lastName,
        dateOfBirth,
        gender: GENDER[str(ans.sex)],
        phone: opt(patient.phone) ?? opt(a.phone),
        email: opt(patient.email),
        allergies: allergiesFrom(ans),
        height: Number.isFinite(ft) && ft > 0 ? `${ft}'${Number.isFinite(inch) ? inch : 0}"` : undefined,
        weight: Number.isFinite(lb) && lb > 0 ? `${lb} lb` : undefined,
        address: {
          line1: str(a.line1),
          line2: opt(a.line2),
          city: opt(a.city),
          state: state || undefined,
          zipCode: opt(a.zip) ?? opt(a.zipCode),
          country: 'US',
        },
      },
      prescriber: {
        npiNumber: str(prescriber.npi),
        firstName: opt(pFirst),
        lastName: opt(pRest.join(' ')),
        title: opt(prescriber.credential) ?? 'DO',
        practiceName: opt(input.practiceName),
        // One licence is on file. It goes only when it is the patient's state;
        // another state's number on this prescription would be wrong.
        stateLicenseNumber:
          state && str(prescriber.licenseState).toUpperCase() === state ? opt(prescriber.licenseNumber) : undefined,
        phone: opt(prescriber.phone),
        email: opt(prescriber.email),
      },
    },
  };
}

/* -------------------------------- webhooks -------------------------------- */

export const RXHERE_EVENTS = [
  'COMPOUNDING',
  'QA_PENDING',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'HOLD',
  'EXCEPTION',
  'CANCELLED',
] as const;
export type RxHereEvent = (typeof RXHERE_EVENTS)[number];

export interface RxHereWebhook {
  reference: string;
  event: RxHereEvent;
  occurredAt: string;
  trackingNumber: string | null;
  carrier: string | null;
  reason: string | null;
  location: { city?: string; state?: string } | null;
  proofOfDelivery: { signedBy?: string; deliveredAt?: string } | null;
}

/** The documented payload, or null. Unknown events and malformed bodies are dropped. */
export function parseWebhook(body: unknown): RxHereWebhook | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const reference = str(b.reference);
  const event = str(b.event) as RxHereEvent;
  const occurredAt = str(b.occurredAt);
  if (!reference || reference.length > 100 || !RXHERE_EVENTS.includes(event)) return null;
  if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) return null;
  const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);
  const loc = obj(b.location);
  const pod = obj(b.proofOfDelivery);
  return {
    reference,
    event,
    occurredAt: new Date(occurredAt).toISOString(),
    trackingNumber: opt(b.trackingNumber)?.slice(0, 64) ?? null,
    carrier: opt(b.carrier)?.slice(0, 40) ?? null,
    reason: opt(b.reason)?.slice(0, 2000) ?? null,
    location: loc ? { city: opt(loc.city), state: opt(loc.state) } : null,
    proofOfDelivery: pod ? { signedBy: opt(pod.signedBy)?.slice(0, 100), deliveredAt: opt(pod.deliveredAt) } : null,
  };
}

/** The documented idempotency key: reference + event + occurredAt (unique in pharmacy_events). */
export function eventKey(w: Pick<RxHereWebhook, 'reference' | 'event' | 'occurredAt'>): string {
  return `${w.reference}|${w.event}|${w.occurredAt}`;
}

/**
 * Constant-time check of either header against our secret. Both sides are
 * hashed first so a length difference leaks nothing and timingSafeEqual never
 * throws.
 */
export function secretMatches(headerValues: (string | null | undefined)[], secret: string | undefined): boolean {
  if (!secret) return false;
  const want = createHash('sha256').update(secret).digest();
  let ok = false;
  for (const v of headerValues) {
    if (!v) continue;
    const got = createHash('sha256').update(v).digest();
    if (timingSafeEqual(got, want)) ok = true;
  }
  return ok;
}

type RowStatus = 'draft' | 'submitted' | 'accepted' | 'shipped' | 'delivered' | 'canceled';
type Step = 'placed' | 'shipped' | 'delivered';

export interface WebhookPlan {
  /** Board steps to run, in order, through advanceFulfillment. */
  steps: Step[];
  /** A member-timeline entry beyond what the steps write. */
  timeline: { label: string; body: string } | null;
  alert: 'hold' | 'exception' | 'cancelled' | 'no_tracking' | null;
}

const PRE_SHIP: RowStatus[] = ['draft', 'submitted'];

/**
 * What an event does to our order. Steps only ever move forward: each one is
 * offered only from a board status it can follow, and advanceFulfillment's
 * conditional update refuses anything else, so a late or replayed event never
 * moves an order back.
 */
export function planWebhookEvent(w: RxHereWebhook, row: RowStatus): WebhookPlan {
  const none: WebhookPlan = { steps: [], timeline: null, alert: null };
  if (row === 'canceled') return none;
  const place: Step[] = PRE_SHIP.includes(row) ? ['placed'] : [];
  const where = [w.location?.city, w.location?.state].filter(Boolean).join(', ');

  switch (w.event) {
    case 'COMPOUNDING':
      return {
        ...none,
        steps: place,
        timeline: { label: 'Compounding', body: 'A pharmacist verified your prescription and compounding has started.' },
      };
    case 'QA_PENDING':
      return {
        ...none,
        steps: place,
        timeline: { label: 'Quality check', body: 'Compounding is finished. Your order is in the pharmacy’s quality check before it ships.' },
      };
    case 'SHIPPED':
      if (!w.trackingNumber) return { ...none, alert: 'no_tracking' };
      return { ...none, steps: [...PRE_SHIP, 'accepted'].includes(row) ? ['shipped'] : [] };
    case 'IN_TRANSIT':
      return { ...none, timeline: { label: 'In transit', body: where ? `Scanned in ${where}.` : 'Moving through the carrier network.' } };
    case 'OUT_FOR_DELIVERY':
      return { ...none, timeline: { label: 'Out for delivery', body: 'Your order is on the delivery truck today.' } };
    case 'DELIVERED': {
      // A DELIVERED that overtakes its SHIPPED (retries arrive out of order)
      // still lands: ship it with the tracking it carries, then deliver.
      const steps: Step[] =
        row === 'shipped' ? ['delivered'] : row !== 'delivered' && w.trackingNumber ? ['shipped', 'delivered'] : [];
      const pod = w.proofOfDelivery;
      return {
        ...none,
        steps,
        timeline: pod?.signedBy
          ? { label: 'Proof of delivery', body: `Signed for by ${pod.signedBy}${pod.deliveredAt ? ` · ${pod.deliveredAt}` : ''}.` }
          : null,
      };
    }
    case 'HOLD':
      return {
        steps: [],
        timeline: {
          label: 'Pharmacy review',
          body: 'The pharmacist has a question for your prescriber. Your care team is on it; nothing is needed from you unless we reach out.',
        },
        alert: 'hold',
      };
    case 'EXCEPTION':
      return {
        steps: [],
        timeline: { label: 'Delivery update', body: 'The carrier reported a delay or a delivery problem. We are following it up.' },
        alert: 'exception',
      };
    case 'CANCELLED':
      // Staff decide what happens next (re-place, refund); the member hears from them.
      return { ...none, alert: 'cancelled' };
  }
}

/*
 * The pharmacy status shown to staff. Phases only move forward — a late
 * COMPOUNDING never covers a SHIPPED — and DELIVERED / CANCELLED are final.
 * Within a phase the newest event wins (HOLD, then COMPOUNDING again once it
 * is cleared).
 */
const PHASE: Record<string, number> = {
  SENDING: 0,
  ERROR: 0,
  MANUAL: 0,
  DRY_RUN: 0,
  COMPOUNDING: 1,
  QA_PENDING: 1,
  HOLD: 1,
  SHIPPED: 2,
  IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 2,
  EXCEPTION: 2,
  DELIVERED: 3,
  CANCELLED: 3,
};

/** The new status, or null to leave it. Unknown current values (the 201's own words) count as just sent. */
export function nextPharmacyStatus(current: string | null, incoming: RxHereEvent): string | null {
  const from = current ? PHASE[current] ?? 1 : 0;
  if (from === 3) return null;
  return PHASE[incoming] >= from ? incoming : null;
}
