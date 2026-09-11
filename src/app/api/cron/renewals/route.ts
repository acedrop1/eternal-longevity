import { NextRequest, NextResponse } from 'next/server';
import {
  dueSubscriptionIds,
  renewSubscription,
  type RenewalOutcome,
} from '@/lib/refills';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';

/**
 * Ship and charge the plans that are due today.
 *
 * A refill does not go back to the prescriber — he already decided, and the
 * prescription he signed is still in date. What this job checks is exactly
 * that: in date, and refills left. A plan that has run out pauses and goes
 * back for review rather than quietly charging on an expired prescription.
 *
 * Triggered by the Vercel cron entry in vercel.json.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Ceiling per run, so one bad query cannot charge the whole table. */
const MAX_PER_RUN = 50;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ skipped: 'supabase_not_configured' });
  }

  const ids = await dueSubscriptionIds(MAX_PER_RUN);
  const outcomes: RenewalOutcome[] = [];

  // Sequential on purpose: each one takes a payment, and a burst of parallel
  // off-session charges is exactly what a fraud rule is built to stop.
  for (const id of ids) {
    try {
      outcomes.push(await renewSubscription(id));
    } catch (err) {
      outcomes.push({
        subscriptionId: id,
        result: 'error',
        detail: err instanceof Error ? err.message : 'threw',
      });
    }
  }

  const tally = outcomes.reduce<Record<string, number>>((acc, o) => {
    acc[o.result] = (acc[o.result] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ due: ids.length, ...tally, outcomes });
}
