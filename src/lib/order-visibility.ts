import 'server-only';

/**
 * Archived and deleted orders, Shopify style. Archived: off the open lists,
 * still in the numbers. Deleted (test orders): off every list and out of
 * revenue and profit. Nothing is removed from the database: order and
 * prescription records are kept. One `site_settings` row, keyed by order
 * number, so no migration.
 */
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

export type OrderVisibility = 'archived' | 'deleted';
const KEY = 'orders:hidden';
const db = () => createSupabaseAdminClient() as unknown as SupabaseClient;

/** Order number -> archived/deleted, once per request. Never throws. */
export const getHiddenOrders = cache(async (): Promise<Record<string, OrderVisibility>> => {
  if (!supabaseAdminConfigured()) return {};
  try {
    const { data } = await db().from('site_settings').select('value').eq('key', KEY).maybeSingle();
    const v = (data?.value ?? {}) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(v).filter(([, s]) => s === 'archived' || s === 'deleted')) as Record<string, OrderVisibility>;
  } catch {
    return {};
  }
});

/** Deleted order numbers: left out of revenue, profit and lists. */
export async function deletedOrders(): Promise<Set<string>> {
  const all = await getHiddenOrders();
  return new Set(Object.keys(all).filter((k) => all[k] === 'deleted'));
}

/** Admin only (the caller checks). null puts the order back. */
export async function setOrderVisibility(orderNumber: string, to: OrderVisibility | null): Promise<void> {
  // ponytail: read-modify-write on one row; two admins archiving in the same second can drop one.
  const { data } = await db().from('site_settings').select('value').eq('key', KEY).maybeSingle();
  const value = { ...((data?.value ?? {}) as Record<string, OrderVisibility>) };
  if (to) value[orderNumber] = to;
  else delete value[orderNumber];
  const { error } = await db()
    .from('site_settings')
    .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}
