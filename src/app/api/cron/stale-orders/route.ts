import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { noticeEmail, sendEmail, SUPPORT_EMAIL } from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import { orderRef } from '@/lib/format';
import { cronAuthorized } from '@/lib/cron-auth';
import { pageDoctors, releaseToDoctor } from '@/lib/release-to-doctor';
import {
  selectStale,
  waited,
  type Stale,
  type StaleKind,
  type SweepOrder,
} from '@/lib/order-health';

/**
 * The hourly sweep for orders nobody is moving.
 *
 * One order sat with the prescriber for three weeks because nothing ever
 * looked twice. This does, every hour (limits in lib/order-health.ts):
 *
 *   with the prescriber > 24h     team emailed, prescriber emailed and texted
 *   signed, unpaid > 48h          team emailed (covers a failed or missing card)
 *   pending-admin > 15 min        released to the prescriber again; team told if it still fails
 *   paid, not placed > 1 day      team emailed
 *
 * Each order is alerted at most once a day: the alert is claimed in
 * email_sends (unique stage/ref/step) before anything is sent, so an
 * overlapping run or a retry cannot repeat it. Order numbers only, no
 * patient names; the details are behind the sign-in.
 *
 * Triggered by the Vercel cron entry in vercel.json.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Rows per query, so one bad query cannot mail the whole table. */
const LIMIT = 200;

const LABEL: Record<StaleKind, string> = {
  assigned: 'With the prescriber',
  unpaid: 'Approved, not paid',
  release: 'Never reached the prescriber',
  toPlace: 'Paid, not placed with the pharmacy',
};

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ skipped: 'not_configured' });
  }

  const db = createSupabaseAdminClient();
  const now = Date.now();
  const [orders, shipments] = await Promise.all([
    db
      .from('orders')
      .select('order_number, status, created_at, paid_confirmed_at, order_updates(status_change, created_at)')
      .in('status', ['pending-admin', 'assigned', 'signed'])
      .order('created_at', { ascending: true })
      .limit(LIMIT),
    db
      .from('fulfillment_orders')
      .select('order_ref, status, created_at, submitted_at')
      .eq('status', 'submitted')
      .order('created_at', { ascending: true })
      .limit(LIMIT),
  ]);
  if (orders.error || shipments.error) {
    const message = orders.error?.message ?? shipments.error?.message;
    console.error('[stale-orders] query failed:', message);
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  const stale = selectStale(
    (orders.data ?? []) as unknown as SweepOrder[],
    shipments.data ?? [],
    now,
  );

  // A failed release is retried every run: the point is to get it out. Only
  // one that still fails is worth telling anyone about.
  const stuckReleases: Stale[] = [];
  for (const s of stale.filter((x) => x.kind === 'release')) {
    const res = await releaseToDoctor(s.ref).catch(() => ({ ok: false }));
    if (!res.ok) stuckReleases.push(s);
  }

  // Claim before sending: the unique (stage, ref, step) makes a second claim today fail.
  const day = new Date(now).toISOString().slice(0, 10);
  const due: Stale[] = [];
  for (const s of [...stale.filter((x) => x.kind !== 'release'), ...stuckReleases]) {
    const { error } = await db
      .from('email_sends')
      .insert({ email: SUPPORT_EMAIL.toLowerCase(), stage: `stale-${s.kind}`, ref: `${s.ref}:${day}`, step: 0 });
    if (!error) due.push(s);
  }

  if (due.length) {
    try {
      await sendEmail({
        to: SUPPORT_EMAIL,
        subject: `${due.length} ${due.length === 1 ? 'order is' : 'orders are'} stuck`,
        html: noticeEmail({
          eyebrow: 'Stuck orders',
          heading: `${due.length} ${due.length === 1 ? 'order needs' : 'orders need'} a person`,
          body: 'Each has waited past its limit. You will hear about each one at most once a day until it moves.',
          rows: due.map((s) => [orderRef(s.ref), `${LABEL[s.kind]} · ${waited(s.hours)}`]),
          cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin/fulfillment` },
        }),
      });
    } catch {
      // Claimed for today either way; tomorrow's run tries again.
    }
  }

  const withDoctor = due.filter((s) => s.kind === 'assigned');
  if (withDoctor.length) {
    const n = withDoctor.length;
    const visits = `${n} ${n === 1 ? 'visit has' : 'visits have'}`;
    await pageDoctors(
      db,
      (firstName) => ({
        subject: `${visits} waited over a day for review`,
        html: noticeEmail({
          eyebrow: 'Waiting on you',
          heading: `${firstName}, ${visits} waited over a day`,
          body: 'Nothing is charged or shipped until you sign or decline.',
          rows: withDoctor.map((s) => [orderRef(s.ref), `Waiting ${waited(s.hours)}`]),
          cta: { label: 'Open your queue', href: `${SITE_URL}/portal/doctor` },
        }),
      }),
      // No patient name: SMS is not covered by a BAA.
      `Eternal Longevity: ${visits} waited over a day for review. ${SITE_URL}/portal/doctor`,
    );
  }

  const tally = stale.reduce<Record<string, number>>((acc, s) => {
    acc[s.kind] = (acc[s.kind] ?? 0) + 1;
    return acc;
  }, {});
  return NextResponse.json({
    stale: tally,
    released: stale.filter((s) => s.kind === 'release').length - stuckReleases.length,
    alerted: due.length,
  });
}
