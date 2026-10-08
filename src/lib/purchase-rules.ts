/**
 * Pure rules for what a member may buy: no I/O, so the start page, the portal
 * product page and placeOrderAction share one copy, and it can be checked in
 * isolation.
 */

import { cartCadence, type Cadence, type CartItem } from '@/lib/cartTypes';
import { PRODUCT_CATEGORY } from '@/lib/intake-categories';
import { intakeProductIds } from '@/lib/intake-rules';
import { MAX_LINE_QUANTITY, TERMINAL_ORDER } from '@/lib/order-rules';

/** How a member already has a product: an order still in flight, or a plan. */
export type Held = 'order' | 'plan';

/**
 * Products the member already has. An order counts until it ends (declined,
 * cancelled, refunded) or arrives; a plan while it is active or paused. A plan
 * back in review (lapsed prescription) does not: a new order is how it renews.
 */
export function heldProducts(
  orders: { status: string; productIds: string[] }[],
  plans: { status: string; productId: string }[],
): Map<string, Held> {
  const held = new Map<string, Held>();
  for (const o of orders) {
    if ((TERMINAL_ORDER as string[]).includes(o.status) || o.status === 'delivered') continue;
    for (const id of o.productIds) held.set(id, 'order');
  }
  // A plan wins: "Manage your plan" is the more useful place to send them.
  for (const p of plans) if (p.status === 'active' || p.status === 'paused') held.set(p.productId, 'plan');
  return held;
}

/**
 * Whether the member's intake answered this product's questions. A product
 * with no category has no questions of its own. An intake that names no
 * product (one filed before products were recorded) covers nothing: that
 * member answers the product's questions once, like anyone else. Local demo
 * stores no intakes, so callers skip this check there.
 */
export function intakeCovers(answers: Record<string, unknown>, productId: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(PRODUCT_CATEGORY, productId)) return true;
  // Only server-written ids count. visitProductIds is what the browser said it
  // showed, so it never covers anything; a visit records what it asked in
  // assessedProductIds.
  return intakeProductIds(answers).includes(productId);
}

/**
 * One line per product, quantity 1. A prescription's amount is set by its
 * plan, not by ordering several, and one product can't be on two plans at
 * once: the newest line for a product wins. Every cart read passes through
 * here, so a legacy 'once' line becomes monthly (cartCadence).
 */
export function oneEach(items: CartItem[]): CartItem[] {
  const latest = new Map<string, CartItem>();
  for (const it of items) {
    const prev = latest.get(it.productId);
    if (!prev || (it.addedAt ?? 0) >= (prev.addedAt ?? 0)) latest.set(it.productId, it);
  }
  return items
    .filter((it) => latest.get(it.productId) === it)
    .map((it) => ({ ...it, cadence: cartCadence(it.cadence), quantity: 1 }));
}

/** The cart with one line moved to another plan, merged into that plan's line if there is one. */
export function withCadence(items: CartItem[], productId: string, from: Cadence, to: Cadence): CartItem[] {
  const at = (it: CartItem, c: Cadence) => it.productId === productId && it.cadence === c;
  const moving = items.find((it) => at(it, from));
  if (!moving || from === to) return items;
  if (!items.some((it) => at(it, to))) return items.map((it) => (at(it, from) ? { ...it, cadence: to } : it));
  return items
    .filter((it) => !at(it, from))
    .map((it) => (at(it, to) ? { ...it, quantity: Math.min(MAX_LINE_QUANTITY, it.quantity + moving.quantity) } : it));
}
