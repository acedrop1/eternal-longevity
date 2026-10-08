import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cron-auth';
import { dueSecondBoxIds, shipSecondBox, type BoxOutcome } from '@/lib/annual-shipments';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import { noticeEmail, sendEmail, SUPPORT_EMAIL } from '@/lib/email';
import { orderRef } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

/**
 * Ship the second box of every 12-month plan that is due (lib/annual-shipments).
 * Charges nothing. Runs daily before /api/cron/renewals, which waits on a
 * plan whose box 2 is still owed. Triggered by vercel.json.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ skipped: 'supabase_not_configured' });
  }

  // ponytail: one batch of 200 a day; loop like the renewals cron if 12-month plans ever outgrow it.
  const outcomes: BoxOutcome[] = [];
  for (const id of await dueSecondBoxIds()) {
    try {
      outcomes.push(await shipSecondBox(id));
    } catch (err) {
      outcomes.push({ subscriptionId: id, result: 'error', detail: err instanceof Error ? err.message : 'threw' });
    }
  }
  const tally = outcomes.reduce<Record<string, number>>((acc, o) => {
    acc[o.result] = (acc[o.result] ?? 0) + 1;
    return acc;
  }, {});

  // Paid-for boxes that did not ship. Each is reported once: its date is cleared.
  const problems = outcomes.filter((o) => o.result === 'review' || o.result === 'drop' || o.result === 'error');
  if (problems.length) {
    try {
      await sendEmail({
        to: SUPPORT_EMAIL,
        subject: `${problems.length} 12-month ${problems.length === 1 ? 'box' : 'boxes'} did not ship today`,
        html: noticeEmail({
          eyebrow: '12-month plans',
          heading: `${problems.length} second ${problems.length === 1 ? 'box needs' : 'boxes need'} a look`,
          body: 'These members paid for a year. Plans needing review are paused until someone acts; nothing was charged.',
          rows: problems.map((o) => [
            o.orderNumber ? orderRef(o.orderNumber) : `Plan ${o.subscriptionId.slice(0, 8)}`,
            [o.result, o.detail].filter(Boolean).join(' · '),
          ]),
          cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin/fulfillment` },
        }),
      });
    } catch {
      // The outcomes are in the response.
    }
  }

  return NextResponse.json({ due: outcomes.length, ...tally, outcomes });
}
