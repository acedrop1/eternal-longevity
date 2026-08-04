import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import type { Database } from '@/lib/database.types';
import {
  SUPPORT_EMAIL,
  dailyReportEmail,
  emailConfigured,
  sendEmail,
  type DailyReportStats,
} from '@/lib/email';

/**
 * Daily operations report, emailed to the support inbox.
 *
 * Triggered by the Vercel cron entry in vercel.json. Vercel signs cron
 * requests with CRON_SECRET; we also accept it as a bearer token so the
 * report can be fired manually for testing.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // No secret configured (e.g. preview) — allow, since the route only reads
  // aggregates and emails the internal inbox.
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

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
  if (!authorized(req)) {
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
    pendingIntakes,
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
    countSince(db, 'intake_submissions', 'created_at', '1970-01-01', {
      column: 'status',
      value: 'submitted',
    }),
    // 'draft' = created from a signed Rx but not yet sent to the pharmacy.
    countSince(db, 'fulfillment_orders', 'created_at', '1970-01-01', {
      column: 'status',
      value: 'draft',
    }),
  ]);

  // Revenue: sum paid orders in the window.
  let revenueCents = 0;
  const { data: paid, error: paidErr } = await db
    .from('orders')
    .select('total_cents')
    .gte('created_at', since)
    .eq('status', 'paid');
  if (paidErr) {
    console.error('[daily-report] revenue query failed:', paidErr.message);
  } else {
    revenueCents = (paid ?? []).reduce(
      (sum, o) => sum + (Number(o.total_cents) || 0),
      0,
    );
  }

  const stats: DailyReportStats = {
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
    pendingIntakes,
    pendingFulfillment,
  };

  if (!emailConfigured()) {
    // Still return the numbers so the route is useful (and testable) before
    // Resend is wired up.
    return NextResponse.json({ ok: false, reason: 'email_not_configured', stats });
  }

  const mail = dailyReportEmail(stats);
  const res = await sendEmail({
    to: SUPPORT_EMAIL,
    subject: mail.subject,
    html: mail.html,
  });

  return NextResponse.json({ ok: res.ok, error: res.error, stats });
}
