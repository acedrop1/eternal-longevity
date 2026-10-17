/**
 * Shipping: how each product ships and what the customer pays for it. The one
 * place to change either. Plain data with no imports, so client components
 * can use it without pulling in the catalogue.
 *
 * Every order ships 2-day (decided 2026-10-16), cold-pack products included;
 * OVERNIGHT stays in the types so it can come back by changing
 * shippingMethodFor alone.
 *
 * One price for every shipment: $5 by default, set in Admin → Settings (the
 * pharmacy charges us $25 2-day; the plan prices carry the rest). A
 * member's first order ships free (firstOrderFree). After that every box
 * pays: renewals, and the second box of a 12 month plan (charged up front
 * with the year, see shipmentsPerCycle in lib/shopProducts).
 */

export type ShippingMethod = '2_DAY' | 'OVERNIGHT';

type Storage = 'refrigerated' | 'room' | undefined;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shippingMethodFor(_storage?: Storage): ShippingMethod {
  return '2_DAY';
}

/** Whole dollars per shipment. */
export const SHIPPING_PRICE: Record<ShippingMethod, number> = { '2_DAY': 5, OVERNIGHT: 5 };

/** What the pharmacy charges us per shipment, whole dollars. Admin-only (profit, lib/profit). */
export const SHIPPING_COST: Record<ShippingMethod, number> = { '2_DAY': 25, OVERNIGHT: 35 };

export const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  '2_DAY': '2-day shipping',
  OVERNIGHT: 'Overnight, cold-chain',
};

/**
 * Shipping on one order, in cents: per box, with the first box of a member's
 * first order free. `shipments` is boxes in this billing cycle (2 for a
 * 12 month plan), `firstOrder` whether the member has never had an order
 * paid before. Checkout, the server and renewals all charge through this.
 */
export function shippingChargeCents(input: { pricePerShipment: number; shipments: number; firstOrder: boolean }): number {
  const paidBoxes = Math.max(0, input.shipments - (input.firstOrder ? 1 : 0));
  return paidBoxes * input.pricePerShipment * 100;
}

/** What one shipment of this product costs the customer, in whole dollars. */
export function shippingPriceFor(product: { storage?: Storage } | null | undefined): number {
  return SHIPPING_PRICE[shippingMethodFor(product?.storage)];
}

/** "2-day shipping" / "Overnight, cold-chain" for this product. */
export function shippingLabelFor(product: { storage?: Storage } | null | undefined): string {
  return SHIPPING_LABEL[shippingMethodFor(product?.storage)];
}

/**
 * One order's total. The promo comes off the items only, so it can never eat
 * into tax, nor into shipping unless the code says it waives shipping
 * (freeShipping). Server and checkout both price with this.
 */
export function orderTotalCents(o: {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  discountCents: number;
  freeShipping?: boolean;
}): number {
  return Math.max(0, o.subtotalCents - o.discountCents) + (o.freeShipping ? 0 : o.shippingCents) + o.taxCents;
}

/**
 * A renewal's receipt lines. A subscription stores one per-cycle amount, and
 * from this change on that amount is plan + shipping. It counts as shipping
 * only when it is exactly the plan price plus this product's shipping; a plan
 * started before shipping was charged (or repriced since) shows it all as the
 * item. The total charged is per_cycle_cents either way.
 */
export function renewalSplit(
  perCycleCents: number,
  planCents: number,
  shippingCents: number,
): { subtotalCents: number; shippingCents: number } {
  const ship = planCents > 0 && perCycleCents === planCents + shippingCents ? shippingCents : 0;
  return { subtotalCents: perCycleCents - ship, shippingCents: ship };
}
