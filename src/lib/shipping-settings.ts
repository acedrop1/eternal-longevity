import 'server-only';

/**
 * What customers pay for shipping, editable in Admin → Settings.
 *
 *   pricePerShipment  whole dollars per box, 2-day and overnight alike
 *   firstOrderFree    a member's first paid order ships its first box free
 *
 * Stored as one row in `site_settings` (migration 0027; admin-only, read here
 * with the service role). Missing row, missing table or no database: the
 * defaults below, which are what the site launched with (2026-10-08).
 * Everything that charges or shows shipping reads this, never SHIPPING_PRICE
 * directly: checkout, order placement, renewals, product pages.
 */

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { SHIPPING_PRICE } from '@/lib/shipping';

export interface ShippingSettings {
  pricePerShipment: number;
  firstOrderFree: boolean;
}

export const DEFAULT_SHIPPING: ShippingSettings = {
  pricePerShipment: SHIPPING_PRICE['2_DAY'],
  firstOrderFree: true,
};

const KEY = 'shipping';
// The generated types predate site_settings.
const db = () => createSupabaseAdminClient() as unknown as SupabaseClient;

function clean(v: unknown): ShippingSettings {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const price = Number(o.pricePerShipment);
  return {
    pricePerShipment: Number.isFinite(price) && price >= 0 && price <= 200 ? Math.round(price) : DEFAULT_SHIPPING.pricePerShipment,
    firstOrderFree: typeof o.firstOrderFree === 'boolean' ? o.firstOrderFree : DEFAULT_SHIPPING.firstOrderFree,
  };
}

/** Current settings, once per request. Never throws. */
export const getShippingSettings = cache(async (): Promise<ShippingSettings> => {
  if (!supabaseAdminConfigured()) return DEFAULT_SHIPPING;
  try {
    const { data, error } = await db().from('site_settings').select('value').eq('key', KEY).maybeSingle();
    if (error || !data) return DEFAULT_SHIPPING;
    return clean(data.value);
  } catch {
    return DEFAULT_SHIPPING;
  }
});

/** Admin only: the caller checks the role and writes the audit entry. */
export async function saveShippingSettings(next: ShippingSettings): Promise<ShippingSettings> {
  const value = clean(next);
  if (!supabaseAdminConfigured()) throw new Error('Connect Supabase to save settings.');
  const { error } = await db()
    .from('site_settings')
    .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  return value;
}

/**
 * Has this member had an order paid before? Their first order ships free
 * when firstOrderFree is on. Counts only paid orders, so an abandoned or
 * declined first order doesn't use up the free box.
 */
export async function isFirstPaidOrder(userId: string, excludeOrderId?: string): Promise<boolean> {
  if (!supabaseAdminConfigured()) return true;
  let q = createSupabaseAdminClient()
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('paid_confirmed_at', 'is', null);
  if (excludeOrderId) q = q.neq('id', excludeOrderId);
  const { count, error } = await q;
  // Unknown: charge shipping rather than give away a box twice.
  if (error) return false;
  return (count ?? 0) === 0;
}
