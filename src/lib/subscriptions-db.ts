'use server';

/**
 * Member subscription self-service: change the billing plan (monthly /
 * quarterly / annual), pause, resume, cancel. Runs as the caller through RLS
 * so a member can only touch their own rows. Dosage and product are NOT
 * editable here — clinical changes go through the prescriber.
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth-server';
import { getShopProduct, cadenceTiersForProduct } from '@/lib/shopProducts';

type Result = { ok: boolean; error?: string };

export type PlanKey = 'monthly' | 'quarterly' | 'annual';

/** Switch a subscription to a different billing cadence. */
export async function changeSubscriptionPlanAction(
  subId: string,
  plan: PlanKey
): Promise<Result> {
  const user = await getSession();
  if (!user || !supabaseConfigured) return { ok: false, error: 'Not signed in.' };

  const db = await createSupabaseServerClient();
  const { data: sub } = await db
    .from('subscriptions')
    .select('id, product_id')
    .eq('id', subId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!sub) return { ok: false, error: 'Subscription not found.' };

  const product = getShopProduct(sub.product_id);
  if (!product) return { ok: false, error: 'Product no longer available.' };
  const tier = cadenceTiersForProduct(product).find((t) => t.key === plan);
  if (!tier) return { ok: false, error: 'Invalid plan.' };

  const { error } = await db
    .from('subscriptions')
    .update({
      cadence_label: tier.label,
      per_cycle_cents: tier.total * 100,
    })
    .eq('id', subId)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/portal/subscriptions');
  return { ok: true };
}

/** Pause, resume, or cancel — the only status moves a member can make. */
export async function setSubscriptionStatusAction(
  subId: string,
  status: 'active' | 'paused' | 'canceled'
): Promise<Result> {
  const user = await getSession();
  if (!user || !supabaseConfigured) return { ok: false, error: 'Not signed in.' };

  const db = await createSupabaseServerClient();
  const { error } = await db
    .from('subscriptions')
    .update({ status })
    .eq('id', subId)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/portal/subscriptions');
  return { ok: true };
}
