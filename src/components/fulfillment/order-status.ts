import type { BoardRow } from '@/lib/fulfillment-core';
import type { PaymentState } from '@/lib/order-health';
import { STATUS_LABEL, type Order } from '@/lib/orders';
import type { BadgeTone } from '@/components/admin/IndexTable';
import { sentenceCase } from '@/components/portal/ui';

/**
 * The words and tones the Orders index and the order page share, so a row
 * and its page never disagree about where an order is.
 */

export const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL'];

export type Stage = 'review' | 'place' | 'placed' | 'shipped' | 'delivered' | 'other';

export const STAGE: Record<BoardRow['status'], Stage> = {
  draft: 'place',
  submitted: 'place',
  accepted: 'placed',
  shipped: 'shipped',
  delivered: 'delivered',
  canceled: 'other',
};

/** Per stage: when a row counts as late, and the one-line instruction for that tab. */
export const STAGE_INFO: Record<Stage, { lateAfter: number; note: string }> = {
  review: { lateAfter: Infinity, note: 'With the prescriber. They join To place once signed and paid.' },
  place: {
    lateAfter: 1,
    note: 'Paid and approved. Orders with a pharmacy SKU are sent automatically. Place any others in the pharmacy portal, then mark them placed.',
  },
  placed: {
    lateAfter: 3,
    note: 'Add the tracking number when the pharmacy ships it. The patient is emailed automatically.',
  },
  shipped: { lateAfter: 7, note: 'Mark delivered once the carrier shows it arrived. The patient is emailed.' },
  delivered: { lateAfter: Infinity, note: 'Delivered in the last 14 days.' },
  other: { lateAfter: Infinity, note: '' },
};

export const STATUS: Record<BoardRow['status'], [string, BadgeTone]> = {
  draft: ['To place', 'attention'],
  submitted: ['To place', 'attention'],
  accepted: ['Placed', 'info'],
  shipped: ['Shipped', 'success'],
  delivered: ['Delivered', 'neutral'],
  canceled: ['Canceled', 'neutral'],
};

/** The Fulfillment badge: the shipment's step, or the order's own status before it has one. */
export function fulfillmentBadge(b?: BoardRow, o?: Order): [string, BadgeTone] | null {
  if (b) return STATUS[b.status];
  if (o) return [sentenceCase(STATUS_LABEL[o.status] ?? o.status), o.status === 'assigned' ? 'info' : 'neutral'];
  return null;
}

/** The pharmacy API's status words (and our own: SENDING, ERROR, MANUAL, DRY_RUN). */
const PHARMACY: Record<string, [string, BadgeTone]> = {
  SENDING: ['Sending to pharmacy', 'info'],
  COMPOUNDING: ['Compounding', 'info'],
  QA_PENDING: ['Pharmacy QA', 'info'],
  SHIPPED: ['Shipped by pharmacy', 'success'],
  IN_TRANSIT: ['In transit', 'success'],
  OUT_FOR_DELIVERY: ['Out for delivery', 'success'],
  DELIVERED: ['Delivered', 'neutral'],
  HOLD: ['Pharmacy hold', 'critical'],
  EXCEPTION: ['Carrier exception', 'critical'],
  CANCELLED: ['Pharmacy cancelled', 'critical'],
  ERROR: ['Pharmacy error', 'critical'],
  MANUAL: ['Place by hand', 'attention'],
  DRY_RUN: ['Dry run · not sent', 'attention'],
};
const RETRYABLE = ['ERROR', 'MANUAL', 'DRY_RUN'];

/** Anything the pharmacy says before verification (AWAITING_VERIFICATION…) reads as sent. */
export const pharmacyBadge = (p: NonNullable<BoardRow['pharmacy']>): [string, BadgeTone] =>
  PHARMACY[p.status] ?? ['Sent to pharmacy', 'info'];

/** "Send to pharmacy" applies: still to place, never accepted by the API, and a retryable failure. */
export const canRetry = (row: BoardRow) =>
  (row.status === 'submitted' || row.status === 'draft') &&
  !!row.pharmacy &&
  !row.pharmacy.orderId &&
  RETRYABLE.includes(row.pharmacy.status);

export function trackingHref(carrier: string | null, n: string): string | null {
  return /fedex/i.test(carrier ?? '') ? `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}` : null;
}

export const displayRef = (n: string) => (/^\d+$/.test(n) ? `#${n}` : n.toUpperCase());

/** The order page. `ref` is the order number, or the shipment ref for rows that have none. */
export const orderHref = (ref: string) => `/portal/admin/orders/${encodeURIComponent(ref)}`;

/** Paid is paid_confirmed_at and nothing else (lib/order-health). */
export const PAYMENT: Record<PaymentState, [string, BadgeTone]> = {
  paid: ['Paid', 'neutral'],
  pending: ['Pending', 'attention'],
  awaiting: ['Awaiting payment', 'attention'],
  failed: ['Payment failed', 'critical'],
};

/** What the pharmacy needs to place the order, in the order their form asks for it. */
export function pharmacyDetails(b: BoardRow): [string, string][] {
  return [
    ['Patient', b.patientName],
    ['Date of birth', b.patientDob ?? '—'],
    ['Phone', b.phone ?? '—'],
    ['Ship to', b.address || '—'],
    ['Items', b.items.join('; ') || '—'],
    ['Plan', b.cycleLabel ?? '—'],
    ['Prescriber', b.prescriber ? `${b.prescriber}${b.npi ? ` · NPI ${b.npi}` : ''}` : '—'],
  ];
}
