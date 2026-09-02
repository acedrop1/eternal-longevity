/**
 * Cart types shared between the client provider and the server actions.
 *
 * These live outside CartProvider so `lib/profile-db.ts` ('use server') can
 * reference them without importing a 'use client' module.
 */

export type Cadence = 'monthly' | 'quarterly' | 'annual' | 'once';

export interface CartItem {
  productId: string;
  cadence: Cadence;
  quantity: number;
  addedAt: number;
}
