/**
 * Pure rules for what a member may buy: no I/O, so the start page, the portal
 * product page and placeOrderAction share one copy, and it can be checked in
 * isolation.
 */

import type { Cadence, CartItem } from '@/lib/cartTypes';
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
 * with no category has no questions of its own, and an intake that names no
 * product at all (local demo, or one filed before products were recorded)
 * keeps covering what it always did.
 */
export function intakeCovers(answers: Record<string, unknown>, productId: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(PRODUCT_CATEGORY, productId)) return true;
  const ids = [
    ...intakeProductIds(answers),
    ...(Array.isArray(answers.visitProductIds) ? answers.visitProductIds : []),
  ];
  return ids.length === 0 || ids.includes(productId);
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
