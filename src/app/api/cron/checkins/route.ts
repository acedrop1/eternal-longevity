import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cron-auth';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { checkinEmail, emailConfigured, sendEmail } from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import { dueCheckins, type Delivery } from '@/lib/checkins';

/**
 * The 30-day check-in.
 *
 * Finds members whose first delivery of a product, or first refill of it,
 * arrived 30 days ago, and emails them one question. The check-in row is
 * written before the send and order_id is unique, so a retry or an overlapping
 * run can never email twice for one order.
 *
 * When was it delivered: the order_updates entry with status_change
 * 'delivered' (written on every mark-delivered path), else orders.updated_at.
 *
 * Triggered by the Vercel cron entry in vercel.json.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Ceiling per run, so one bad query cannot mail the whole table. */
const MAX_PER_RUN = 100;


export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdminConfigured() || !emailConfigured()) {
    return NextResponse.json({ skipped: 'not_configured' });
  }

  const db = createSupabaseAdminClient();

  // ponytail: loads every delivered order (PostgREST caps at 1000 rows); page
  // through it once the practice passes that.
  const { data: orders, error } = await db
    .from('orders')
    .select('id, user_id, updated_at')
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!orders?.length) return NextResponse.json({ due: 0, sent: 0, skipped: 0 });

  // In chunks: a long id list in the query string is what PostgREST rejects.
  const items: { order_id: string; product_id: string; product_name: string }[] = [];
  const updates: { order_id: string; created_at: string }[] = [];
  const existing: { order_id: string }[] = [];
  for (let i = 0; i < orders.length; i += 150) {
    const ids = orders.slice(i, i + 150).map((o) => o.id);
    const [a, b, c] = await Promise.all([
      db.from('order_items').select('order_id, product_id, product_name').in('order_id', ids),
      db
        .from('order_updates')
        .select('order_id, created_at')
        .in('order_id', ids)
        .eq('status_change', 'delivered'),
      db.from('checkins').select('order_id').in('order_id', ids),
    ]);
    const err = a.error ?? b.error ?? c.error;
    if (err) return NextResponse.json({ error: err.message }, { status: 500 });
    items.push(...(a.data ?? []));
    updates.push(...(b.data ?? []));
    existing.push(...(c.data ?? []));
  }

  const deliveredAt = new Map<string, string>();
  for (const u of updates) {
    const prev = deliveredAt.get(u.order_id);
    if (!prev || u.created_at < prev) deliveredAt.set(u.order_id, u.created_at);
  }
  const deliveries: Delivery[] = orders.map((o) => ({
    orderId: o.id,
    userId: o.user_id,
    deliveredAt: deliveredAt.get(o.id) ?? o.updated_at,
    items: items
      .filter((i) => i.order_id === o.id)
      .map((i) => ({ productId: i.product_id, productName: i.product_name })),
  }));

  const due = dueCheckins(
    deliveries,
    existing.map((c) => c.order_id),
  ).slice(0, MAX_PER_RUN);

  let sent = 0;
  let skipped = 0;
  for (const c of due) {
    const { data: member } = await db
      .from('profiles')
      .select('email, full_name, notification_prefs, account_status')
      .eq('id', c.userId)
      .maybeSingle();
    const prefs = (member?.notification_prefs ?? {}) as Record<string, boolean>;
    // Turned off, closed or no address: leave no row, so turning check-ins
    // back on later still gets them one.
    if (!member?.email || member.account_status !== 'active' || prefs.checkins === false) {
      skipped += 1;
      continue;
    }

    // Claim before sending: the unique order_id makes a second claim fail.
    const token = randomBytes(32).toString('base64url');
    const { error: claimErr } = await db.from('checkins').insert({
      user_id: c.userId,
      order_id: c.orderId,
      product_id: c.productId,
      product_name: c.productName,
      kind: c.kind,
      token,
    });
    if (claimErr) {
      skipped += 1;
      continue;
    }

    const msg = checkinEmail({
      firstName: (member.full_name ?? '').trim().split(/\s+/)[0] || 'there',
      checkinUrl: `${SITE_URL}/checkin/${token}`,
    });
    const res = await sendEmail({ to: member.email, subject: msg.subject, html: msg.html });
    if (res.ok) {
      await db.from('checkins').update({ sent_at: new Date().toISOString() }).eq('order_id', c.orderId);
      sent += 1;
    } else {
      // The row stays: the member still sees it on their portal home.
      skipped += 1;
    }
  }

  return NextResponse.json({ due: due.length, sent, skipped });
}
