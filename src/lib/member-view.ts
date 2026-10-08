/**
 * Member-portal view rules: where an order is on its way to the door, and the
 * one-line status and one button each treatment card on Home shows.
 *
 * Pure: no I/O and no server imports, so the order page, Home and the check
 * script all read the same mapping.
 */

import type { Order } from '@/lib/orders';
import { isFailedRefill, trackingUrl } from '@/lib/orders';
import { TERMINAL_ORDER } from '@/lib/order-rules';

/* ------------------------------ order tracker ----------------------------- */

export const ORDER_STEPS = ['Reviewed', 'Approved', 'Being prepared', 'Shipped', 'Delivered'] as const;

export type OrderProgress =
  /** `step` is the current step's index; Delivered (4) is complete. */
  | { ended: false; step: number; paymentNeeded: boolean }
  /** Closed without shipping: an end state instead of the stepper. */
  | { ended: true; title: string; body: string };

/** Where one order is on Reviewed → Approved → Being prepared → Shipped → Delivered. */
export function orderProgress(o: Pick<Order, 'status' | 'paidAt'>): OrderProgress {
  switch (o.status) {
    case 'declined-clinical':
      return { ended: true, title: 'Not approved', body: 'Dr. Elder didn’t approve this order. You weren’t charged.' };
    case 'denied-admin':
      return { ended: true, title: 'Cancelled by our team', body: 'If you were charged, it is refunded in full.' };
    case 'canceled':
      return { ended: true, title: 'Cancelled', body: 'This order was cancelled and won’t ship.' };
    case 'refunded':
      return { ended: true, title: 'Refunded', body: 'This order was refunded in full.' };
    // Approved. Paid (paidAt) but not yet moved on is already with the pharmacy.
    case 'signed':
      return o.paidAt ? { ended: false, step: 2, paymentNeeded: false } : { ended: false, step: 1, paymentNeeded: true };
    case 'paid':
    case 'compounding':
      return { ended: false, step: 2, paymentNeeded: false };
    case 'shipped':
      return { ended: false, step: 3, paymentNeeded: false };
    case 'delivered':
      return { ended: false, step: 4, paymentNeeded: false };
    // pending, pending-admin, assigned, and anything new: still in review.
    default:
      return { ended: false, step: 0, paymentNeeded: false };
  }
}

/* ----------------------------- dates and money ---------------------------- */

/** 'Oct 30' from 'YYYY-MM-DD' (local, never the day before) or a timestamp. */
export function shortDate(value: string | number | Date): string {
  const d =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
      : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** `from` plus n weekdays (a parcel doesn't move on weekends). */
export function addBusinessDays(from: number, n: number): Date {
  const d = new Date(from);
  while (n > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n--;
  }
  return d;
}

/* ----------------------------- treatment cards ---------------------------- */

export interface PlanLike {
  id: string;
  productId: string;
  productName: string;
  cadenceLabel: string;
  /** What each renewal charges, whole dollars. */
  perMonth: number;
  nextBillingIso: string | null;
  status: 'active' | 'paused' | 'pending-review' | 'canceled';
  image: string;
  declined?: boolean;
}

export interface TreatmentCard {
  key: string;
  name: string;
  plan: string;
  image: string;
  status: string;
  /** attention: waiting on the member (reads as a warning, ink button). muted: paused or closed. */
  tone: 'ok' | 'attention' | 'muted';
  cta: { label: string; href: string; external?: boolean };
}

const thread = (t: 'doctor' | 'support') => `/portal/messages?thread=${t}`;

/** One in-flight order as a card. `overnight`: ships cold-chain (1 business day, else 2). */
export function orderCard(o: Order, image: string, overnight: boolean): TreatmentCard {
  const base = {
    key: `order-${o.id}`,
    name: o.lines.map((l) => l.productName).join(' + ') || 'Your order',
    // Orders from before plans-only still say 'once': they keep their label.
    plan: o.lines[0] && o.lines[0].cadence !== 'once' ? `${o.lines[0].cadenceLabel} plan` : 'One-time order',
    image,
    tone: 'ok' as TreatmentCard['tone'],
  };
  const track = { label: 'Track', href: `/portal/orders#order-${o.id}` };
  const p = orderProgress(o);
  if (p.ended) return { ...base, tone: 'muted', status: p.title, cta: { label: 'Message us', href: thread('support') } };
  if (p.paymentNeeded) {
    return isFailedRefill(o)
      ? { ...base, tone: 'attention', status: 'Refill payment failed', cta: { label: 'Update your card', href: '/portal/account' } }
      : {
          ...base,
          tone: 'attention',
          status: 'Approved: payment needed',
          cta: { label: 'Complete payment', href: `/portal/orders/pay/${encodeURIComponent(o.id)}` },
        };
  }
  if (p.step === 0) {
    return o.status === 'assigned'
      ? { ...base, status: 'With Dr. Elder', cta: { label: 'Message Dr. Elder', href: thread('doctor') } }
      : { ...base, status: 'In review', cta: { label: 'Message us', href: thread('support') } };
  }
  if (p.step === 2) return { ...base, status: 'Being prepared', cta: track };
  if (p.step === 3) {
    const shippedAt = o.updates?.find((u) => u.statusChange === 'shipped')?.at;
    return {
      ...base,
      status: shippedAt
        ? `Shipped, arriving around ${shortDate(addBusinessDays(shippedAt, overnight ? 1 : 2))}`
        : 'Shipped, on its way',
      cta: o.tracking
        ? { label: 'Track', href: trackingUrl(o.carrier, o.tracking), external: true }
        : track,
    };
  }
  return { ...base, status: 'Delivered', cta: track };
}

/** One plan as a card. */
export function planCard(s: PlanLike): TreatmentCard {
  const base = {
    key: `plan-${s.id}`,
    name: s.productName,
    plan: `${s.cadenceLabel} plan`,
    image: s.image,
    tone: 'ok' as TreatmentCard['tone'],
    cta: { label: 'Manage plan', href: '/portal/subscriptions' },
  };
  if (s.status === 'paused' && s.declined) {
    return { ...base, tone: 'attention', status: 'Payment failed: plan paused', cta: { label: 'Update your card', href: '/portal/account' } };
  }
  if (s.status === 'paused') return { ...base, tone: 'muted', status: 'Paused' };
  if (s.status === 'pending-review') return { ...base, tone: 'attention', status: 'Renewal needed' };
  return {
    ...base,
    status: s.nextBillingIso ? `Next refill ${shortDate(s.nextBillingIso)} · $${s.perMonth}` : 'Active',
  };
}

/**
 * Home's "Your treatments": every order still on its way (newest first), then
 * every open plan. A plan whose product has an order on its way is left out:
 * that order is the more useful card until it lands.
 */
export function treatmentCards(
  orders: Order[],
  plans: PlanLike[],
  product: (id: string) => { image?: string; overnight: boolean },
): TreatmentCard[] {
  const moving = [...orders]
    .filter((o) => !TERMINAL_ORDER.includes(o.status) && o.status !== 'delivered')
    .sort((a, b) => b.placedAt - a.placedAt);
  const busy = new Set(moving.flatMap((o) => o.lines.map((l) => l.productId)));
  return [
    ...moving.map((o) => {
      const p = product(o.lines[0]?.productId ?? '');
      return orderCard(o, p.image ?? o.lines[0]?.image ?? '/images/9.jpg', p.overnight);
    }),
    ...plans.filter((s) => s.status !== 'canceled' && !busy.has(s.productId)).map(planCard),
  ];
}

/* -------------------------------- messages -------------------------------- */

/**
 * Threads where the care team spoke last, from the member's newest messages
 * (newest first). That is a reply waiting on the member: the Messages dot.
 */
export function repliesWaiting(
  newestFirst: { channel: string; fromMember: boolean }[],
): Set<string> {
  const seen = new Set<string>();
  const waiting = new Set<string>();
  for (const m of newestFirst) {
    if (seen.has(m.channel)) continue;
    seen.add(m.channel);
    if (!m.fromMember) waiting.add(m.channel);
  }
  return waiting;
}
