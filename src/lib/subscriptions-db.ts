'use server';

/**
 * Member subscription self-service: change the billing plan (monthly /
 * quarterly / 6-month), pause, resume, cancel, skip a cycle. Ownership is
 * always checked as the caller through RLS, so a member can only touch their
 * own rows. Dosage and product are NOT editable here — clinical changes go
 * through the prescriber.
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { supabaseConfigured } from '@/lib/env';
import { getSession } from '@/lib/auth-server';
import { cadenceTiersForProduct } from '@/lib/shopProducts';
import { getLiveProduct } from '@/lib/catalog';
import {
  addMonthsIso,
  cadenceOfLabel,
  memberMoveFrom,
  monthsPerCycle,
  refillsBetween,
} from '@/lib/order-rules';

type Result = { ok: boolean; error?: string };

export type PlanKey = 'monthly' | 'quarterly' | 'sixMonth';
// 'once' is a tier too, but a one-time order is not a plan to switch onto.
const PLAN_KEYS: string[] = ['monthly', 'quarterly', 'sixMonth'];

const today = () => new Date().toISOString().slice(0, 10);

/*
 * Ownership is read through the caller's own session (RLS), and the write then
 * goes through the service role: members may only change a plan's status
 * themselves (migration 0018), so price, cadence and dates are set here from
 * the catalogue and never from the request.
 */
async function ownSubscription(subId: string) {
  const user = await getSession();
  if (!user || !supabaseConfigured) return null;
  const db = await createSupabaseServerClient();
  const { data } = await db
    .from('subscriptions')
    .select('id, product_id, status, cadence_label, next_billing_date, prescription_id')
    .eq('id', subId)
    .eq('user_id', user.id)
    .maybeSingle();
  return data;
}

async function prescriptionFor(id: string | null) {
  if (!id) return null;
  const { data } = await createSupabaseAdminClient()
    .from('prescriptions')
    .select('id, cadence, expires_at')
    .eq('id', id)
    .maybeSingle();
  return data;
}

/** Switch a subscription to a different billing cadence. */
export async function changeSubscriptionPlanAction(
  subId: string,
  plan: PlanKey
): Promise<Result> {
  if (!PLAN_KEYS.includes(plan)) return { ok: false, error: 'Invalid plan.' };
  const sub = await ownSubscription(subId);
  if (!sub) return { ok: false, error: 'Subscription not found.' };
  if (sub.status !== 'active' && sub.status !== 'paused') {
    return { ok: false, error: 'This plan can no longer be changed.' };
  }

  const product = await getLiveProduct(sub.product_id);
  if (!product) return { ok: false, error: 'Product no longer available.' };
  const tier = cadenceTiersForProduct(product).find((t) => t.key === plan);
  if (!tier) return { ok: false, error: 'Invalid plan.' };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('subscriptions')
    .update({
      cadence_label: tier.label,
      per_cycle_cents: Math.round(tier.total * 100),
    })
    .eq('id', sub.id);
  if (error) return { ok: false, error: error.message };

  /*
   * Refills were counted for the plan the prescription was written on. A
   * monthly plan moved to quarterly would otherwise keep eleven refills it can
   * never use; quarterly moved to monthly would run out months early. Recount
   * the shipments that still fit before it expires on the new cadence.
   */
  const rx = await prescriptionFor(sub.prescription_id);
  if (rx?.expires_at) {
    await admin
      .from('prescriptions')
      .update({
        refills_remaining: refillsBetween(
          sub.next_billing_date ?? today(),
          rx.expires_at,
          monthsPerCycle(plan),
        ),
      })
      .eq('id', rx.id);
  }

  revalidatePath('/portal/subscriptions');
  return { ok: true };
}

/**
 * Pause, resume, or cancel — the only status moves a member can make:
 * active ↔ paused, and anything still open → canceled. A plan paused for
 * review or cancelled is not the member's to switch back on.
 */
export async function setSubscriptionStatusAction(
  subId: string,
  status: 'active' | 'paused' | 'canceled'
): Promise<Result> {
  const user = await getSession();
  if (!user || !supabaseConfigured) return { ok: false, error: 'Not signed in.' };
  const from = memberMoveFrom(status);
  if (!from) return { ok: false, error: 'Invalid status.' };

  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('subscriptions')
    .update({ status })
    .eq('id', subId)
    .eq('user_id', user.id)
    .in('status', from)
    .select('id');
  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    return { ok: false, error: 'That change is not available for this plan.' };
  }
  revalidatePath('/portal/subscriptions');
  return { ok: true };
}

/**
 * Skip the next cycle: the next charge and shipment move out by one cycle of
 * the plan the member is on. Never past the prescription's expiry — that
 * cycle could not ship anyway, and pushing a date past it only hides that the
 * plan needs a new review.
 */
export async function skipNextCycleAction(subscriptionId: string): Promise<Result> {
  const sub = await ownSubscription(subscriptionId);
  if (!sub) return { ok: false, error: 'Subscription not found.' };
  if (sub.status !== 'active') {
    return { ok: false, error: 'Only an active plan can skip a cycle.' };
  }
  if (!sub.next_billing_date) return { ok: false, error: 'No upcoming cycle to skip.' };

  const rx = await prescriptionFor(sub.prescription_id);
  const cadence = cadenceOfLabel(sub.cadence_label, rx?.cadence ?? 'monthly');
  const next = addMonthsIso(sub.next_billing_date, monthsPerCycle(cadence));
  if (rx?.expires_at && next >= rx.expires_at) {
    return {
      ok: false,
      error: 'Skipping would run past your prescription. Message your prescriber to renew it.',
    };
  }

  // Conditional on the date just read, so a double click skips once.
  const { data, error } = await createSupabaseAdminClient()
    .from('subscriptions')
    .update({ next_billing_date: next })
    .eq('id', sub.id)
    .eq('status', 'active')
    .eq('next_billing_date', sub.next_billing_date)
    .select('id');
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: 'This plan changed. Refresh and try again.' };

  revalidatePath('/portal/subscriptions');
  return { ok: true };
}
