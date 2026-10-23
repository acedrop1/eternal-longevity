/**
 * Pure rules for orders, plans and renewals.
 *
 * No I/O and no server imports, so the checkout can read the same plan math
 * the renewals cron bills on, and the rules can be checked in isolation.
 */

import type { OrderStatus, SubscriptionStatus } from '@/lib/database.types';
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
  declineClinical: ['pending-admin', 'assigned', 'awaiting-visit'],
  // Matches the admin board: anything not yet shipped can be cancelled.
  deny: ['awaiting-visit', 'pending-admin', 'assigned', 'signed', 'paid', 'compounding'],
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

/** Months one billing cycle covers. A 12 month plan bills once a year. */
export function monthsPerCycle(cadence: string): number {
  if (cadence === 'annual') return 12;
  return cadence === 'sixMonth' ? 6 : cadence === 'quarterly' ? 3 : 1;
}

/**
 * What one renewal charges, in cents: the plan's total plus shipping on its
 * one box (a renewal never ships free). `planDollars` is the tier total,
 * whole dollars.
 */
export function perCycleCents(planDollars: number, pricePerShipment: number): number {
  return Math.round(planDollars * 100) + shippingChargeCents({ pricePerShipment, firstOrder: false });
}

/**
 * Whether a prescription covers the next shipment: a refill left, and still
 * in date today. Every plan ships once per cycle, a 12 month plan included.
 */
export function rxCovers(
  rx: { expires_at: string | null; refills_remaining: number | null } | null,
  todayIso: string,
): boolean {
  if (!rx) return false;
  return (rx.refills_remaining ?? 0) >= 1 && (rx.expires_at === null || rx.expires_at >= todayIso);
}

/**
 * The cadence a subscription bills on now. A member can switch plans in the
 * portal, which rewrites the subscription's label and price but cannot touch
 * the prescription (RLS), so the label is the current plan and the
 * prescription's cadence is only the plan it was first bought on.
 */
export function cadenceOfLabel(label: string | null, fallback: string): string {
  const l = (label ?? '').toLowerCase();
  // Current names are '1 month plan' … '12 month plan'; older rows say
  // 'Monthly', 'Quarterly', '6-month', '12-month' or 'Annual'. '12…' first, before '1…'.
  if (l.startsWith('12') || l.startsWith('annual')) return 'annual';
  if (l.startsWith('6')) return 'sixMonth';
  if (l.startsWith('3') || l.startsWith('quarter')) return 'quarterly';
  if (l.startsWith('1') || l.startsWith('month')) return 'monthly';
  return fallback;
}

/** What members see for a plan: '1 month plan' … '12 month plan', whatever a stored row calls it. */
export const PLAN_NAME: Record<string, string> = {
  monthly: '1 month plan',
  quarterly: '3 month plan',
  sixMonth: '6 month plan',
  annual: '12 month plan',
};

/** A stored cadence label (old or new wording) as the plan's current name. One-time and unknown labels pass through. */
export function planName(label: string | null): string {
  return PLAN_NAME[cadenceOfLabel(label, '')] ?? (label || 'Plan');
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
 * apart (monthsPerCycle), that fall before it expires. Same count the prescription is
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
