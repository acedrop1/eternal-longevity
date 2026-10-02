import { getPrescriber } from '@/lib/prescriber';
import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cron-auth';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import type { Database } from '@/lib/database.types';
import {
  SUPPORT_EMAIL,
  emailConfigured,
  noticeEmail,
  sendEmail,
} from '@/lib/email';
import { formatMoney } from '@/lib/format';
import { paidRevenue } from '@/lib/revenue';
import { SITE_URL } from '@/lib/site';

/**
 * Daily operations report, emailed to the support inbox.
 *
 * Triggered by the Vercel cron entry in vercel.json. Vercel signs cron
 * requests with CRON_SECRET; we also accept it as a bearer token so the
 * report can be fired manually for testing.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30;


type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
/** Table names the typed Supabase client accepts. */
type TableName = keyof Database['public']['Tables'];

/** Count rows created in a window, without pulling the rows themselves. */
async function countSince(
  db: AdminClient,
  table: TableName,
  column: string,
  since: string,
  extra?: { column: string; value: string },
): Promise<number> {
  let q = db
    .from(table)
    .select('*', { count: 'exact', head: true })
    .gte(column, since);
  if (extra) q = q.eq(extra.column, extra.value);

  const { count, error } = await q;
  if (error) {
    console.error(`[daily-report] count ${table} failed:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 503 });
  }

  const db = createSupabaseAdminClient();
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    signups,
    intakes,
    orders,
    prescriptionsSigned,
    shipmentsSent,
    pendingFulfillment,
  ] = await Promise.all([
    countSince(db, 'profiles', 'created_at', since),
    countSince(db, 'intake_submissions', 'created_at', since),
    countSince(db, 'orders', 'created_at', since),
    countSince(db, 'prescriptions', 'created_at', since, {
      column: 'status',
      value: 'signed',
    }),
    countSince(db, 'fulfillment_orders', 'created_at', since, {
      column: 'status',
      value: 'shipped',
    }),
    // 'submitted' = paid and on the board, not yet placed with the pharmacy.
    countSince(db, 'fulfillment_orders', 'created_at', '1970-01-01', {
      column: 'status',
      value: 'submitted',
    }),
  ]);

  // What still needs a person: with the prescriber, approved but unpaid,
  // placed but no tracking yet, stuck in transit, and tomorrow's refills
  // (they land on the board after the renewal run).
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400_000).toISOString();
  const tomorrow = new Date(now.getTime() + 86400_000).toISOString().slice(0, 10);
  const head = { count: 'exact', head: true } as const;
  const [awaitingPrescriber, approvedUnpaid, awaitingTracking, trackingLate, refillsTomorrow, pausedPlans] =
    await Promise.all([
      count(db.from('orders').select('*', head).eq('status', 'assigned')),
      count(db.from('orders').select('*', head).eq('status', 'signed').is('paid_confirmed_at', null)),
      count(db.from('fulfillment_orders').select('*', head).eq('status', 'accepted')),
      count(
        db
          .from('fulfillment_orders')
          .select('*', head)
          .eq('status', 'accepted')
          .lte('updated_at', threeDaysAgo),
      ),
      count(
        db
          .from('subscriptions')
          .select('*', head)
          .eq('status', 'active')
          .lte('next_billing_date', tomorrow),
      ),
      count(db.from('subscriptions').select('*', head).eq('status', 'paused')),
    ]);

  // Revenue: money that landed in the window, the same definition Billing uses.
  const revenueCents = (await paidRevenue(db, since)).cents;

  const stats = {
    dateLabel: now.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/New_York',
    }),
    signups,
    intakes,
    orders,
    revenueCents,
    prescriptionsSigned,
    shipmentsSent,
    awaitingPrescriber,
    approvedUnpaid,
    pendingFulfillment,
    awaitingTracking,
    trackingLate,
    refillsTomorrow,
    pausedPlans,
  };

  if (!emailConfigured()) {
    // Still return the numbers so the route is useful (and testable) before
    // Resend is wired up.
    return NextResponse.json({ ok: false, reason: 'email_not_configured', stats });
  }

  const mail = {
    subject: `Daily report — ${stats.dateLabel} · ${orders} orders, ${signups} signups`,
    html: noticeEmail({
      eyebrow: 'Daily report',
      heading: stats.dateLabel,
      rows: [
        ['Orders', String(orders)],
        ['Revenue (payments landed)', formatMoney(revenueCents)],
        ['New signups', String(signups)],
        ['Intakes', String(intakes)],
        ['Rx signed', String(prescriptionsSigned)],
        ['Shipments', String(shipmentsSent)],
        ['Awaiting prescriber', String(awaitingPrescriber)],
        ['Approved, unpaid', String(approvedUnpaid)],
        ['Orders to place', String(pendingFulfillment)],
        ['Placed, waiting for tracking', `${awaitingTracking}${trackingLate ? ` (${trackingLate} for 3+ days)` : ''}`],
        ['Refills charging by tomorrow', String(refillsTomorrow)],
        ['Plans paused (card failed or no card)', String(pausedPlans)],
      ],
      cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin/fulfillment` },
    }),
  };
  // The prescriber shares the orders board, so he gets the summary too.
  const prescriber = await getPrescriber().catch(() => null);
  const results = await Promise.all(
    [...new Set([SUPPORT_EMAIL, prescriber?.email].filter(Boolean) as string[])].map((to) =>
      sendEmail({ to, subject: mail.subject, html: mail.html }),
    ),
  );

  return NextResponse.json({ ok: results.every((r) => r.ok), stats });
}
