/**
 * Order state machine + shared order types.
 * Demo flow:
 *   member submits order → pending-admin
 *   admin approves → assigned (awaiting physician sign-off)
 *   admin denies → denied-admin (terminal)
 *   physician signs Rx → signed (approved, first cycle charged at sign-off)
 *     → paid (charge confirmed; a failed charge stays signed until paid)
 *     → compounding → shipped → delivered
 *   physician declines → declined-clinical (terminal)
 *
 * Payment: nothing is charged until a physician signs. Sign-off is the moment
 * billing starts — the saved card is charged for the first cycle.
 */

import type { OrderStatus } from '@/lib/database.types';

/*
 * Every status the orders table can hold, not just the clinical ones. A
 * successful charge moves an order to 'paid'; a list that only knew the
 * workflow states crashed on the first paid order.
 */
export type { OrderStatus };

export interface OrderLine {
  productId: string;
  productName: string;
  cadence: 'monthly' | 'quarterly' | 'sixMonth' | 'annual' | 'once';
  cadenceLabel: string;
  quantity: number;
  perCycle: number;
  image: string;
  swatch: string;
}

/** Author shown on each timeline entry. */
export type UpdateAuthorRole = 'admin' | 'physician' | 'pharmacy' | 'system';

export interface OrderUpdate {
  id: string;
  at: number;
  author: string;       // display name e.g. "Dr. M. Reyes" or "Admin"
  role: UpdateAuthorRole;
  note: string;
  /** Optional status change recorded by this update */
  statusChange?: OrderStatus;
}

export interface Order {
  id: string;
  /** Who placed it — admin needs a route from an order to the member. */
  userId?: string;
  memberName: string;
  memberEmail: string;
  state: string;
  lines: OrderLine[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  cardLast4?: string;
  /** Promotion code applied, and what it took off. Set by the server. */
  promoCode?: string;
  discount?: number;
  placedAt: number;
  status: OrderStatus;
  assignedToPhysicianId?: string;
  adminNote?: string;
  physicianNote?: string;
  /** Set when the physician signs — the moment billing starts. */
  paidAt?: number;
  /** Amount charged for the first cycle at sign-off (USD). */
  firstChargeAmount?: number;
  tracking?: string;
  carrier?: string;
  /** Chronological log of human-readable updates on the order. */
  updates?: OrderUpdate[];
}

/**
 * Display name for an assigned physician.
 *
 * ponytail: orders carry only the prescriber's id; the name lives on the
 * profiles table. Rather than render a raw UUID at the member, we render
 * nothing until the order query joins the name through.
 */
export function getPhysicianName(_id?: string): string | null {
  return null;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'RECEIVED',
  'pending-admin': 'AWAITING ADMIN REVIEW',
  'denied-admin': 'DENIED BY ADMIN',
  assigned: 'PROTOCOL REVIEW',
  // Approved, not paid. Payment lands as 'paid'.
  signed: 'APPROVED: PAYMENT NEEDED',
  paid: 'PAID',
  'declined-clinical': 'DECLINED',
  compounding: 'COMPOUNDING',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  canceled: 'CANCELLED',
  refunded: 'REFUNDED',
};

/** A status as words, even one this file has never heard of. */
export function statusLabel(status: string): string {
  return STATUS_LABEL[status as OrderStatus] ?? status.replace(/[-_]/g, ' ').toUpperCase();
}

/**
 * Timeline label refills.ts writes when a refill's charge fails. Read back to
 * tell that order apart from an approved first order: a refill restarts from a
 * fixed card (and its plan), not from a pay link.
 */
export const REFILL_CHARGE_FAILED = 'Refill charge failed';

/** A refill whose charge failed, still waiting on money. */
export function isFailedRefill(order: Pick<Order, 'status' | 'updates'>): boolean {
  return (
    order.status === 'signed' &&
    Boolean(order.updates?.some((u) => u.note.startsWith(REFILL_CHARGE_FAILED)))
  );
}

/*
 * Staff and members read the same timeline rows. These entries carry detail
 * written for staff (card errors, setup problems); the member sees this
 * instead. Keyed on the label, which starts the note (orders-db mapUpdate).
 */
const MEMBER_NOTES: [label: string, note: string][] = [
  ['Charge failed after approval', 'Your card didn’t go through, so we sent you a secure link to complete payment.'],
  [REFILL_CHARGE_FAILED, 'Your card didn’t go through for this refill, so your plan is paused until your card is updated.'],
  ['Held before the pharmacy', 'We’re getting your order ready for the pharmacy.'],
  ['Sent to prescriber', 'Sent to Dr. Elder for review.'],
];

/** What a member sees for one timeline entry. */
export function memberNote(note: string): string {
  return MEMBER_NOTES.find(([label]) => note.startsWith(label))?.[1] ?? note;
}

/** Where to follow a parcel, by carrier, or by the number's shape when the carrier is blank. */
export function trackingUrl(carrier: string | null | undefined, tracking: string): string {
  const n = tracking.replace(/\s/g, '');
  const q = encodeURIComponent(n);
  const c = (carrier ?? '').toLowerCase();
  if (c.includes('usps') || c.includes('postal') || (!c && /^9\d{19,25}$/.test(n))) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${q}`;
  }
  if (c.includes('ups') || (!c && /^1Z/i.test(n))) {
    return `https://www.ups.com/track?tracknum=${q}`;
  }
  // FedEx, and the fallback: it is what the pharmacy ships with.
  return `https://www.fedex.com/fedextrack/?trknbr=${q}`;
}

/** No seeded orders — real orders come from Supabase. */
export const SEED_ORDERS: Order[] = [];
