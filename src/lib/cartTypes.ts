/**
 * Cart types shared between the client provider and the server actions.
 *
 * These live outside CartProvider so `lib/profile-db.ts` ('use server') can
 * reference them without importing a 'use client' module.
 */

export type Cadence = 'monthly' | 'quarterly' | 'sixMonth' | 'once';

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
  return [...items.filter((it) => it.productId !== productId), { productId, cadence, quantity: 1, addedAt: Date.now() }];
}
