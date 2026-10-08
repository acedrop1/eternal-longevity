/**
 * Pure rules for orders, plans and renewals.
 *
 * No I/O and no server imports, so the checkout can read the same plan math
 * the renewals cron bills on, and the rules can be checked in isolation.
 */

import type { OrderStatus, SubscriptionStatus } from '@/lib/database.types';
import { shipmentsPerCycle } from '@/lib/shopProducts';
import { shippingChargeCents } from '@/lib/shipping';

/* --------------------------------- orders --------------------------------- */

/**
 * The statuses each order action may start from. Every action updates on this
 * condition, so a double click, a stale screen or a crafted request against an
 * order that has moved on changes nothing.
 */
export const ORDER_FROM: Record<
  'approve' | 'sign' | 'declineClinical' | 'deny',
  OrderStatus[]
> = {
  approve: ['pending-admin', 'assigned'],
  sign: ['pending-admin', 'assigned'],
  declineClinical: ['pending-admin', 'assigned'],
  // Matches the admin board: anything not yet shipped can be cancelled.
  deny: ['pending-admin', 'assigned', 'signed', 'paid', 'compounding'],
};

/** Signed and waiting on money: the only state a pay link may charge. */
export const AWAITING_PAYMENT: OrderStatus[] = ['signed'];

/** Finished without shipping. Money that lands here goes straight back. */
export const TERMINAL_ORDER: OrderStatus[] = [
  'denied-admin',
  'declined-clinical',
  'canceled',
  'refunded',
];

/**
 * Whether a PaymentIntent was minted for this order. Every intent our server
 * creates carries the order in its metadata, and nothing in the browser can
 * set metadata — so this is what stops a stored intent id from some other
 * order (or one supplied by a request) being reused, trusted as paid, or
 * refunded.
 */
export function intentBelongsTo(
  pi: { metadata?: Record<string, string> | null },
  order: { id: string; order_number: string },
): boolean {
  const m = pi.metadata ?? {};
  if (m.order_id) return m.order_id === order.id;
  return m.order_number === order.order_number;
}

export const MAX_ORDER_LINES = 5;
export const MAX_LINE_QUANTITY = 1;

/** Server-side shipping address check. Returns an error code, or null. */
export function shippingAddressError(a: unknown): string | null {
  if (!a || typeof a !== 'object') return 'invalid_address';
  const r = a as Record<string, unknown>;
  const str = (k: string, min: number, max: number) => {
    const v = r[k];
    if (v === undefined || v === null || v === '') return min === 0;
    return typeof v === 'string' && v.trim().length >= min && v.length <= max;
  };
  const ok =
    str('fullName', 2, 100) &&
    str('line1', 3, 100) &&
    str('line2', 0, 100) &&
    str('city', 2, 60) &&
    typeof r.state === 'string' &&
    /^[A-Za-z]{2}$/.test(r.state) &&
    typeof r.zip === 'string' &&
    /^\d{5}(-\d{4})?$/.test(r.zip.trim());
  return ok ? null : 'invalid_address';
}

/* ---------------------------------- plans --------------------------------- */

/** Months one billing cycle covers. A 12-month plan bills once a year. */
export function monthsPerCycle(cadence: string): number {
  if (cadence === 'annual') return 12;
  return cadence === 'sixMonth' ? 6 : cadence === 'quarterly' ? 3 : 1;
}

/**
 * Months one box covers: the cycle split over its boxes. A 12-month plan
 * ships two 6-month boxes, so the pharmacy is sent 6 months at a time.
 */
export function monthsPerShipment(cadence: string): number {
  return monthsPerCycle(cadence) / shipmentsPerCycle(cadence);
}

/**
 * What one renewal charges, in cents: the plan's total plus shipping on
 * every box in the cycle (a renewal never ships free; a 12-month plan pays
 * both boxes up front). `planDollars` is the tier total, whole dollars.
 */
export function perCycleCents(planDollars: number, cadence: string, pricePerShipment: number): number {
  return (
    Math.round(planDollars * 100) +
    shippingChargeCents({ pricePerShipment, shipments: shipmentsPerCycle(cadence), firstOrder: false })
  );
}

/**
 * Whether a prescription covers the next `boxes` shipments, `monthsApart`
 * apart, starting today: a refill for each, and still in date on the last.
 * A renewal checks the whole cycle (both boxes of a 12-month plan), so a year
 * is never billed on a prescription that cannot ship its second box.
 */
export function rxCovers(
  rx: { expires_at: string | null; refills_remaining: number | null } | null,
  todayIso: string,
  boxes = 1,
  monthsApart = 0,
): boolean {
  if (!rx) return false;
  const last = addMonthsIso(todayIso, monthsApart * (boxes - 1));
  return (rx.refills_remaining ?? 0) >= boxes && (rx.expires_at === null || rx.expires_at >= last);
}

/**
 * The cadence a subscription bills on now. A member can switch plans in the
 * portal, which rewrites the subscription's label and price but cannot touch
 * the prescription (RLS), so the label is the current plan and the
 * prescription's cadence is only the plan it was first bought on.
 */
export function cadenceOfLabel(label: string | null, fallback: string): string {
  const l = (label ?? '').toLowerCase();
  // '12-month' before '1…'/'6…'; 'Annual' on rows written before it was renamed.
  if (l.startsWith('12') || l.startsWith('annual')) return 'annual';
  if (l.startsWith('6')) return 'sixMonth';
  if (l.startsWith('quarter')) return 'quarterly';
  if (l.startsWith('month')) return 'monthly';
  return fallback;
}

/** YYYY-MM-DD plus whole months, clamped to the month's last day (Jan 31 → Feb 28). */
export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/**
 * Shipments a prescription still covers: box dates from `nextIso`, `months`
 * apart (monthsPerShipment), that fall before it expires. Same count the prescription is
 * written with (a 12-month monthly prescription: first shipment + 11).
 */
export function refillsBetween(
  nextIso: string,
  expiresIso: string,
  months: number,
): number {
  let n = 0;
  while (n < 120 && addMonthsIso(nextIso, n * months) < expiresIso) n++;
  return n;
}

/** Statuses a member may move a plan out of, per destination. */
const MEMBER_MOVES: Partial<Record<SubscriptionStatus, SubscriptionStatus[]>> = {
  paused: ['active'],
  active: ['paused'],
  canceled: ['active', 'paused', 'pending_review'],
};

/** Where a member may move a plan to `to` from, or null if never. */
export function memberMoveFrom(to: string): SubscriptionStatus[] | null {
  return MEMBER_MOVES[to as SubscriptionStatus] ?? null;
}
