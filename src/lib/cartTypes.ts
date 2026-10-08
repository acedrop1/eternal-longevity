/**
 * Cart types shared between the client provider and the server actions.
 *
 * These live outside CartProvider so `lib/profile-db.ts` ('use server') can
 * reference them without importing a 'use client' module.
 */

export type Cadence = 'monthly' | 'quarterly' | 'sixMonth' | 'annual';

const CADENCES: readonly string[] = ['monthly', 'quarterly', 'sixMonth', 'annual'];

/**
 * A stored cart line's plan. Carts saved before one-time purchases were
 * retired can still say 'once'; that (or anything unknown) reads as monthly.
 */
export function cartCadence(c: unknown): Cadence {
  return typeof c === 'string' && CADENCES.includes(c) ? (c as Cadence) : 'monthly';
}

export interface CartItem {
  productId: string;
  cadence: Cadence;
  quantity: number;
  addedAt: number;
}

/** Demo-mode cart in the browser (the assessment writes to it too). */
export const CART_STORAGE_KEY = 'el_cart_v1';

/** The cart with this product on this plan, replacing any other plan of the same product. */
export function withCartItem(items: CartItem[], productId: string, cadence: Cadence): CartItem[] {
  return [
    ...items.filter((it) => it.productId !== productId).map((it) => ({ ...it, cadence: cartCadence(it.cadence) })),
    { productId, cadence, quantity: 1, addedAt: Date.now() },
  ];
}
