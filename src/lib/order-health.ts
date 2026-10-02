/**
 * Two questions staff keep asking about an order, answered in one place so the
 * hourly sweep, the orders board and the nav badges cannot disagree:
 *
 *   Is it paid?   Only `paid_confirmed_at` (Order.paidAt) says so. Signing is
 *                 not payment, and neither is a status that moved on.
 *   Is it stuck?  Each wait has a limit; past it, somebody is told.
 *
 * Pure: no database, no clock of its own, so a check can run it.
 */
import type { Order, OrderStatus } from '@/lib/orders';

/** Order statuses still in motion. 'paid' is a legacy value; 'pending-admin' is a release that failed. */
export const LIVE_ORDER_STATUSES: string[] = ['pending-admin', 'assigned', 'signed', 'paid', 'compounding', 'shipped'];

export type PaymentState = 'paid' | 'pending' | 'failed' | 'awaiting';

/**
 * pending  = not charged yet, and not due to be: the prescriber has not signed.
 * awaiting = signed (or further along) and the money has not landed.
 * failed   = as awaiting, and a charge was tried and refused.
 */
export function paymentState(o: Pick<Order, 'status' | 'paidAt' | 'updates'>): PaymentState | null {
  if (o.paidAt) return 'paid';
  if (o.status === 'pending-admin' || o.status === 'assigned') return 'pending';
  if (!LIVE_ORDER_STATUSES.includes(o.status)) return null;
  return o.updates?.some((u) => /charge failed/i.test(u.note)) ? 'failed' : 'awaiting';
}

/* -------------------------------------------------------------------------- */
/*  The hourly sweep                                                          */
/* -------------------------------------------------------------------------- */

const MIN = 60_000;
const HOUR = 60 * MIN;

/** How long each wait may run before somebody is told (or, for a release, it is retried). */
export const STALE_AFTER = {
  /** With the prescriber. */
  assigned: 24 * HOUR,
  /** Signed, and the money never landed. */
  unpaid: 48 * HOUR,
  /** Never reached the prescriber: the release at checkout failed. */
  release: 15 * MIN,
  /** Paid, on the board, not placed with the pharmacy. */
  toPlace: 24 * HOUR,
} as const;

export type StaleKind = keyof typeof STALE_AFTER;

export interface SweepOrder {
  order_number: string;
  status: OrderStatus | string;
  created_at: string;
  paid_confirmed_at: string | null;
  order_updates?: { status_change: string | null; created_at: string }[] | null;
}

export interface SweepShipment {
  order_ref: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
}

export interface Stale {
  kind: StaleKind;
  /** Order number, or the shipment's order_ref when it has none. */
  ref: string;
  /** When the wait started. */
  since: string;
  hours: number;
}

/** When the order last entered `status`, from its timeline; the order's own date otherwise. */
function enteredAt(o: SweepOrder, status: string): string {
  const times = (o.order_updates ?? [])
    .filter((u) => u.status_change === status)
    .map((u) => u.created_at)
    .sort();
  return times.at(-1) ?? o.created_at;
}

/** Everything past its limit, oldest first. */
export function selectStale(orders: SweepOrder[], shipments: SweepShipment[], now: number): Stale[] {
  const waits: Omit<Stale, 'hours'>[] = [];
  for (const o of orders) {
    if (o.status === 'assigned') waits.push({ kind: 'assigned', ref: o.order_number, since: enteredAt(o, 'assigned') });
    else if (o.status === 'pending-admin') waits.push({ kind: 'release', ref: o.order_number, since: o.created_at });
    else if (o.status === 'signed' && !o.paid_confirmed_at) {
      waits.push({ kind: 'unpaid', ref: o.order_number, since: enteredAt(o, 'signed') });
    }
  }
  for (const s of shipments) {
    if (s.status !== 'submitted') continue;
    const ref = s.order_ref.startsWith('FUL-') ? s.order_ref.slice(4) : s.order_ref;
    waits.push({ kind: 'toPlace', ref, since: s.submitted_at ?? s.created_at });
  }
  return waits
    .map((w) => ({ ...w, hours: Math.floor((now - Date.parse(w.since)) / HOUR) }))
    .filter((w) => now - Date.parse(w.since) > STALE_AFTER[w.kind])
    .sort((a, b) => Date.parse(a.since) - Date.parse(b.since));
}

/** "2d", "5h": how long something has waited, for a row or an email. */
export function waited(hours: number): string {
  return hours >= 48 ? `${Math.floor(hours / 24)}d` : `${hours}h`;
}
