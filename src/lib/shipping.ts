/**
 * Shipping: how each product ships and what the customer pays for it. The one
 * place to change either. Plain data with no imports, so client components
 * can use it without pulling in the catalogue.
 *
 * Cold-chain products go overnight, everything else two-day. `storage` is the
 * product's own field (Admin → Products); unset counts as room temperature.
 *
 * Price is the pharmacy's charge to us plus $5 (2-day $25, overnight $35).
 * Charged once per order (one product, one shipment) and again on every
 * renewal, because every renewal ships again.
 */

export type ShippingMethod = '2_DAY' | 'OVERNIGHT';

type Storage = 'refrigerated' | 'room' | undefined;

export function shippingMethodFor(storage: Storage): ShippingMethod {
  return storage === 'refrigerated' ? 'OVERNIGHT' : '2_DAY';
}

/** Whole dollars per shipment. */
export const SHIPPING_PRICE: Record<ShippingMethod, number> = { '2_DAY': 30, OVERNIGHT: 40 };

export const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  '2_DAY': '2-day shipping',
  OVERNIGHT: 'Overnight, cold-chain',
};

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
