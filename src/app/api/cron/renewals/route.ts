import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cron-auth';
import {
  dueSubscriptionIds,
  renewSubscription,
  type RenewalOutcome,
} from '@/lib/refills';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import { noticeEmail, sendEmail, SUPPORT_EMAIL } from '@/lib/email';
import { orderRef } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

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
const BATCH = 50;
// Stop taking new charges with a minute of the 300s budget left.
const TIME_BUDGET_MS = 240_000;


export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ skipped: 'supabase_not_configured' });
  }

  /*
   * Work through everything due today, not just the first 50. A launch-day
   * cohort renews on the same day next month; capping the run left the rest a
   * day late per 50. Each renewal moves its next_billing_date forward or
   * pauses the plan, so a re-query never returns the same plan twice; the
   * `seen` set is the guard if one ever doesn't.
   */
  const started = Date.now();
  const seen = new Set<string>();
  const outcomes: RenewalOutcome[] = [];
  let due = 0;
  while (Date.now() - started < TIME_BUDGET_MS) {
    const ids = (await dueSubscriptionIds(BATCH)).filter((id) => !seen.has(id));
    if (!ids.length) break;
    due += ids.length;
    // Sequential on purpose: each one takes a payment, and a burst of parallel
    // off-session charges is exactly what a fraud rule is built to stop.
    for (const id of ids) {
      if (Date.now() - started >= TIME_BUDGET_MS) break;
      seen.add(id);
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
  }
  const tally = outcomes.reduce<Record<string, number>>((acc, o) => {
    acc[o.result] = (acc[o.result] ?? 0) + 1;
    return acc;
  }, {});

  /*
   * Every renewal that did not charge, in one email. A failed card already
   * alerts on its own; a plan paused for review or a renewal that threw did
   * not, and nobody knew until the member asked where their refill was.
   */
  const problems = outcomes.filter((o) => o.result !== 'charged');
  if (problems.length) {
    try {
      await sendEmail({
        to: SUPPORT_EMAIL,
        subject: `${problems.length} ${problems.length === 1 ? 'renewal' : 'renewals'} did not charge today`,
        html: noticeEmail({
          eyebrow: 'Renewals',
          heading: `${problems.length} of ${outcomes.length} renewals need a look`,
          body: 'Charged renewals are not listed. Plans needing review are paused until someone acts.',
          rows: problems.map((o) => [
            o.orderNumber ? orderRef(o.orderNumber) : `Plan ${o.subscriptionId.slice(0, 8)}`,
            [o.result.replace(/_/g, ' '), o.detail].filter(Boolean).join(' · '),
          ]),
          cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin/fulfillment` },
        }),
      });
    } catch {
      // The outcomes are in the response and on each order's timeline.
    }
  }

  return NextResponse.json({ due, ...tally, outcomes });
}
