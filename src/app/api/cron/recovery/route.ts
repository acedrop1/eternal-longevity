import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cron-auth';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import {
  abandonedCartEmail,
  emailConfigured,
  followupEmail,
  sendEmail,
  unfinishedVisitEmail,
} from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import { getLiveProducts } from '@/lib/catalog';
import type { CartItem } from '@/lib/cartTypes';
import { GAP_HOURS, MAX_AGE_HOURS, selectDue, type Candidate } from '@/lib/followups';
import { pendingMediaFor } from '@/lib/intake-status';
import { TOKEN_TTL_DAYS } from '@/lib/pay-on-approval';

/**
 * Abandoned-funnel recovery.
 *
 * Follow-up sequences (timing and stop rules in lib/followups.ts), most
 * urgent first:
 *   pay    — approved, the card failed, the pay link is still open
 *   photos — order placed, hair/skin photos still missing
 *   plan   — assessment done, no order placed
 *   lead   — email given at the assessment, no account yet
 * then the two older one-shot nudges:
 *   visit  — signup done, medical questions never answered (legacy flow)
 *   cart   — a returning member left a cart (first-timers are the plan stage)
 *
 * One email per person per 20 hours across all of it. Every send is claimed in
 * email_sends (or its own reminder column) before it goes out, so a failure or
 * a retry can never produce a second copy: a missed reminder costs a
 * conversion, a duplicate costs trust.
 *
 * Triggered daily by the Vercel cron entry in vercel.json, so "2 hours after"
 * means "on the first daily run at least 2 hours after".
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** How long a cart or visit has to sit still before it counts as abandoned. */
const QUIET_HOURS = 24;
/** Older than this and a cart or visit nudge is just noise. */
const STALE_DAYS = 30;
/** Rows scanned per query, so one bad query cannot mail the whole table. */
const MAX_PER_RUN = 100;
/** Emails per run, all stages together. Paced for Resend's default 2 requests/second. */
const SEND_BUDGET = 80;
const PACE_MS = 500;

const HOUR = 3_600_000;
const COMPLETE_INTAKE = ['submitted', 'in_review', 'needs_info', 'approved'];
const OPEN_ORDER = ['pending-admin', 'assigned'] as const;

type Db = ReturnType<typeof createSupabaseAdminClient>;

/** A candidate plus what it takes to write its email. */
type Followup = Candidate & {
  firstName?: string;
  url: string;
  unsubscribeUrl?: string;
  order?: { number: string; totalCents: number; expires: string };
  leadEmailsSent?: number;
};


function firstNameOf(full?: string | null, fallback = 'there'): string {
  const n = (full ?? '').trim().split(/\s+/)[0];
  return n || fallback;
}

const unsubscribeUrl = (token?: string | null) =>
  token ? `${SITE_URL}/unsubscribe/${token}` : undefined;

/** Shared across every stage in one run: addresses already mailed, and sends left. */
interface Run {
  recent: Set<string>;
  budget: number;
}

/** Send one email, paced, and count it against the run. */
async function deliver(
  run: Run,
  to: string,
  msg: { subject: string; html: string },
  unsubscribe?: string,
): Promise<boolean> {
  await new Promise((r) => setTimeout(r, PACE_MS));
  run.budget -= 1;
  run.recent.add(to.toLowerCase());
  const res = await sendEmail({
    to,
    subject: msg.subject,
    html: msg.html,
    headers: unsubscribe ? { 'List-Unsubscribe': `<${unsubscribe}>` } : undefined,
  });
  return res.ok;
}

/** Log a one-shot nudge so the daily cap sees it tomorrow. Best effort. */
async function logSend(db: Db, email: string, stage: string, ref: string): Promise<void> {
  try {
    await db.from('email_sends').insert({ email: email.toLowerCase(), stage, ref, step: 0 });
  } catch {
    // Table not migrated yet: the in-run cap still holds.
  }
}

/* -------------------------------- candidates ------------------------------- */

async function leadCandidates(db: Db, since: string, nowIso: string): Promise<Followup[]> {
  const { data } = await db
    .from('leads')
    .select('id, email, product_id, category, last_seen_at, emails_sent, unsubscribe_token')
    .is('converted_at', null)
    .is('unsubscribed_at', null)
    .gt('last_seen_at', since)
    .limit(MAX_PER_RUN);
  if (!data?.length) return [];

  // An account on the address means they moved forward: mark it and stop.
  // ponytail: exact match on the lower-cased address; profiles.email comes lower-cased from auth.
  const { data: members } = await db.from('profiles').select('email').in('email', data.map((l) => l.email));
  const has = new Set((members ?? []).map((m) => (m.email ?? '').toLowerCase()));
  const converted = data.filter((l) => has.has(l.email)).map((l) => l.id);
  if (converted.length) await db.from('leads').update({ converted_at: nowIso }).in('id', converted);

  return data.map((l) => {
    const q = l.product_id
      ? `?product=${encodeURIComponent(l.product_id)}`
      : l.category
        ? `?category=${encodeURIComponent(l.category)}`
        : '';
    return {
      stage: 'lead' as const,
      ref: l.id,
      email: l.email,
      anchor: l.last_seen_at,
      lastStep: -1,
      movedOn: has.has(l.email),
      url: `${SITE_URL}/start${q}`,
      unsubscribeUrl: unsubscribeUrl(l.unsubscribe_token),
      leadEmailsSent: l.emails_sent,
    };
  });
}

/** Members whose newest intake is complete and who have not ordered since. */
async function planCandidates(
  db: Db,
  since: string,
): Promise<{ list: Followup[]; owned: Set<string> }> {
  const { data: intakes } = await db
    .from('intake_submissions')
    .select('id, user_id, status, created_at')
    .not('user_id', 'is', null)
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(MAX_PER_RUN);
  const latest = new Map<string, { id: string; status: string; created_at: string }>();
  for (const r of intakes ?? []) if (r.user_id && !latest.has(r.user_id)) latest.set(r.user_id, r);
  const done = [...latest].filter(([, r]) => COMPLETE_INTAKE.includes(r.status));
  if (!done.length) return { list: [], owned: new Set() };
  const ids = done.map(([uid]) => uid);

  const [{ data: profiles }, { data: orders }] = await Promise.all([
    db
      .from('profiles')
      .select('id, email, full_name, account_status, notification_prefs, unsubscribe_token')
      .in('id', ids),
    db.from('orders').select('user_id, created_at').in('user_id', ids).gt('created_at', since),
  ]);
  const emails = (profiles ?? []).map((p) => (p.email ?? '').toLowerCase()).filter(Boolean);
  const { data: optedOut } = emails.length
    ? await db.from('leads').select('email').in('email', emails).not('unsubscribed_at', 'is', null)
    : { data: [] };
  const leadUnsub = new Set((optedOut ?? []).map((l) => l.email));

  const list: Followup[] = [];
  const owned = new Set<string>();
  for (const [uid, intake] of done) {
    const p = profiles?.find((x) => x.id === uid);
    if (!p?.email) continue;
    const ordered = (orders ?? []).some((o) => o.user_id === uid && o.created_at >= intake.created_at);
    if (!ordered) owned.add(uid);
    const prefs = (p.notification_prefs ?? {}) as Record<string, unknown>;
    list.push({
      stage: 'plan',
      ref: intake.id,
      email: p.email,
      anchor: intake.created_at,
      lastStep: -1,
      movedOn: ordered,
      suspended: p.account_status !== 'active',
      // No token, no unsubscribe link — and no reminder without one.
      unsubscribed:
        prefs.reminders === false || leadUnsub.has(p.email.toLowerCase()) || !p.unsubscribe_token,
      firstName: firstNameOf(p.full_name, ''),
      url: `${SITE_URL}/checkout`,
      unsubscribeUrl: unsubscribeUrl(p.unsubscribe_token),
    });
  }
  return { list, owned };
}

/** The earliest open order per member, while its hair/skin photos are missing. */
async function photoCandidates(db: Db, since: string): Promise<Followup[]> {
  const { data: orders } = await db
    .from('orders')
    .select('id, user_id, member_email, member_name, created_at')
    .in('status', [...OPEN_ORDER])
    .gt('created_at', since)
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN);
  const first = new Map<string, NonNullable<typeof orders>[number]>();
  for (const o of orders ?? []) if (!first.has(o.user_id)) first.set(o.user_id, o);
  if (!first.size) return [];

  const { data: profiles } = await db
    .from('profiles')
    .select('id, email, account_status')
    .in('id', [...first.keys()]);

  const list: Followup[] = [];
  for (const [uid, o] of first) {
    const p = profiles?.find((x) => x.id === uid);
    const email = o.member_email ?? p?.email;
    if (!email) continue;
    const suspended = p?.account_status !== 'active';
    // One query per member; skipped for anyone who could not be mailed anyway.
    const photosMissing = suspended ? false : (await pendingMediaFor(uid)).photos;
    list.push({
      stage: 'photos',
      ref: o.id,
      email,
      anchor: o.created_at,
      lastStep: -1,
      movedOn: !photosMissing,
      suspended,
      firstName: firstNameOf(o.member_name, ''),
      url: `${SITE_URL}/portal`,
    });
  }
  return list;
}

/** Approved orders whose card failed and whose pay link is still open. */
async function payCandidates(db: Db, nowIso: string): Promise<Followup[]> {
  const { data: orders } = await db
    .from('orders')
    .select('id, user_id, order_number, member_email, member_name, total_cents, pay_token, pay_token_expires')
    .eq('status', 'signed')
    .is('paid_confirmed_at', null)
    .not('pay_token', 'is', null)
    .gt('pay_token_expires', nowIso)
    .limit(MAX_PER_RUN);
  if (!orders?.length) return [];
  const { data: profiles } = await db
    .from('profiles')
    .select('id, account_status')
    .in('id', orders.map((o) => o.user_id));

  return orders.flatMap((o) => {
    if (!o.member_email || !o.pay_token || !o.pay_token_expires) return [];
    const issued = Date.parse(o.pay_token_expires) - TOKEN_TTL_DAYS * 24 * HOUR;
    return [
      {
        stage: 'pay' as const,
        // A re-issued link has a new expiry, so its reminders start over.
        ref: `${o.id}:${o.pay_token_expires}`,
        email: o.member_email,
        anchor: new Date(issued).toISOString(),
        lastStep: -1,
        suspended: profiles?.find((p) => p.id === o.user_id)?.account_status !== 'active',
        expiresAt: o.pay_token_expires,
        firstName: firstNameOf(o.member_name, ''),
        url: `${SITE_URL}/pay/${o.pay_token}`,
        order: { number: o.order_number, totalCents: o.total_cents ?? 0, expires: o.pay_token_expires },
      },
    ];
  });
}

/** Fill lastStep from what has already been sent, one query per stage. */
async function withLastSteps(db: Db, list: Followup[]): Promise<void> {
  const stages = [...new Set(list.map((c) => c.stage))];
  await Promise.all(
    stages.map(async (stage) => {
      const mine = list.filter((c) => c.stage === stage);
      const { data } = await db
        .from('email_sends')
        .select('ref, step')
        .eq('stage', stage)
        .in('ref', mine.map((c) => c.ref));
      for (const c of mine) {
        for (const s of data ?? []) if (s.ref === c.ref && s.step > c.lastStep) c.lastStep = s.step;
      }
    }),
  );
}

async function runFollowups(
  db: Db,
  run: Run,
  now: number,
): Promise<{ sent: Record<string, number>; skipped: number; planOwned: Set<string> }> {
  const since = new Date(now - MAX_AGE_HOURS * HOUR).toISOString();
  const nowIso = new Date(now).toISOString();
  const [pay, photos, plan, lead] = await Promise.all([
    payCandidates(db, nowIso),
    photoCandidates(db, since),
    planCandidates(db, since),
    leadCandidates(db, since, nowIso),
  ]);
  const all = [...pay, ...photos, ...plan.list, ...lead];
  const sent: Record<string, number> = { pay: 0, photos: 0, plan: 0, lead: 0 };
  let skipped = 0;
  if (!all.length) return { sent, skipped, planOwned: plan.owned };
  await withLastSteps(db, all);

  for (const { c, step } of selectDue(all, now, run.recent)) {
    if (run.budget <= 0) break;
    // Claim before sending: the unique (stage, ref, step) makes a second claim fail.
    const { error } = await db
      .from('email_sends')
      .insert({ email: c.email.toLowerCase(), stage: c.stage, ref: c.ref, step });
    if (error) {
      skipped += 1;
      continue;
    }
    const msg = followupEmail({
      stage: c.stage,
      step,
      firstName: c.firstName || undefined,
      url: c.url,
      unsubscribeUrl: c.unsubscribeUrl,
      order: c.order,
    });
    const ok = await deliver(run, c.email, msg, c.unsubscribeUrl);
    if (c.stage === 'lead') {
      await db
        .from('leads')
        .update({ emails_sent: (c.leadEmailsSent ?? 0) + 1, last_email_at: new Date().toISOString() })
        .eq('id', c.ref);
    }
    if (ok) sent[c.stage] += 1;
    else skipped += 1;
  }
  return { sent, skipped, planOwned: plan.owned };
}

/* ---------------------------- one-shot nudges ----------------------------- */

/** Returning members who left a cart and have not been nudged for it. */
async function recoverCarts(
  db: Db,
  run: Run,
  quietBefore: string,
  staleAfter: string,
  planOwned: Set<string>,
): Promise<{ sent: number; skipped: number }> {
  const { data, error } = await db
    .from('profiles')
    .select('id, email, full_name, cart, notification_prefs, account_status, unsubscribe_token')
    .is('cart_reminder_at', null)
    .lt('cart_updated_at', quietBefore)
    .gt('cart_updated_at', staleAfter)
    .limit(MAX_PER_RUN);

  if (error || !data) return { sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (const row of data) {
    if (run.budget <= 0) break;
    const items = Array.isArray(row.cart) ? (row.cart as unknown as CartItem[]) : [];
    const prefs = (row.notification_prefs ?? {}) as Record<string, boolean>;

    // An empty cart is not an abandoned one; someone who turned reminders off
    // has already answered this question; and a first-timer's cart is the
    // plan sequence's to chase.
    if (
      !row.email ||
      items.length === 0 ||
      prefs.reminders === false ||
      row.account_status !== 'active' ||
      planOwned.has(row.id)
    ) {
      skipped += 1;
      // Stamp anyway so the row leaves the index instead of being re-scanned
      // on every run forever.
      await db.from('profiles').update({ cart_reminder_at: new Date().toISOString() }).eq('id', row.id);
      continue;
    }
    // Already mailed today: leave it unstamped and try tomorrow.
    if (run.recent.has(row.email.toLowerCase())) {
      skipped += 1;
      continue;
    }

    // Claim it before sending: a duplicate nudge is worse than a missed one.
    const claimedAt = new Date().toISOString();
    const { error: claimErr } = await db
      .from('profiles')
      .update({ cart_reminder_at: claimedAt })
      .eq('id', row.id)
      .is('cart_reminder_at', null);
    if (claimErr) {
      skipped += 1;
      continue;
    }

    // A cart can reference a SKU that has since been pulled from the
    // catalogue — do not name something we no longer sell.
    const live = await getLiveProducts();
    const named: { name: string; cadence: string }[] = [];
    for (const i of items) {
      const p = live.find((sp) => sp.id === i.productId);
      if (p) named.push({ name: p.name, cadence: String(i.cadence) });
    }

    if (named.length === 0) {
      skipped += 1;
      continue;
    }

    const unsubscribe = unsubscribeUrl(row.unsubscribe_token);
    const msg = abandonedCartEmail({
      firstName: firstNameOf(row.full_name),
      items: named,
      cartUrl: `${SITE_URL}/checkout`,
      unsubscribeUrl: unsubscribe,
    });
    await logSend(db, row.email, 'cart', `${row.id}:${claimedAt}`);
    if (await deliver(run, row.email, msg, unsubscribe)) sent += 1;
    else skipped += 1;
  }

  return { sent, skipped };
}

/** Intakes stuck at awaiting_visit — the member never finished the questions. */
async function recoverVisits(
  db: Db,
  run: Run,
  quietBefore: string,
  staleAfter: string,
): Promise<{ sent: number; skipped: number }> {
  const { data, error } = await db
    .from('intake_submissions')
    .select('id, email, user_id, answers')
    .eq('status', 'awaiting_visit')
    .is('reminder_at', null)
    .lt('updated_at', quietBefore)
    .gt('updated_at', staleAfter)
    .limit(MAX_PER_RUN);

  if (error || !data) return { sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (const row of data) {
    if (run.budget <= 0) break;
    // Already mailed today: leave it unclaimed and try tomorrow.
    if (!row.email || run.recent.has(row.email.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const { error: claimErr } = await db
      .from('intake_submissions')
      .update({ reminder_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('reminder_at', null);
    if (claimErr) {
      skipped += 1;
      continue;
    }
    if (row.user_id) {
      const { data: p } = await db
        .from('profiles')
        .select('account_status')
        .eq('id', row.user_id)
        .maybeSingle();
      if (p && p.account_status !== 'active') {
        skipped += 1;
        continue;
      }
    }

    const answers = (row.answers ?? {}) as Record<string, unknown>;
    const msg = unfinishedVisitEmail({
      firstName:
        typeof answers.first_name === 'string'
          ? firstNameOf(answers.first_name)
          : 'there',
      visitUrl: `${SITE_URL}/portal/visit`,
    });
    await logSend(db, row.email, 'visit', row.id);
    if (await deliver(run, row.email, msg)) sent += 1;
    else skipped += 1;
  }

  return { sent, skipped };
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdminConfigured() || !emailConfigured()) {
    return NextResponse.json({ skipped: 'not_configured' });
  }

  const now = Date.now();
  const quietBefore = new Date(now - QUIET_HOURS * HOUR).toISOString();
  const staleAfter = new Date(now - STALE_DAYS * 24 * HOUR).toISOString();

  const db = createSupabaseAdminClient();

  // Everyone who got a follow-up inside the gap. Before 0020 the table is
  // missing, this comes back empty, and the new stages find nothing to send.
  const { data: recentRows } = await db
    .from('email_sends')
    .select('email')
    .gt('sent_at', new Date(now - GAP_HOURS * HOUR).toISOString());
  const run: Run = {
    recent: new Set((recentRows ?? []).map((r) => r.email.toLowerCase())),
    budget: SEND_BUDGET,
  };

  // In priority order, one after another, so the daily cap holds across them.
  const followups = await runFollowups(db, run, now);
  const visits = await recoverVisits(db, run, quietBefore, staleAfter);
  const carts = await recoverCarts(db, run, quietBefore, staleAfter, followups.planOwned);

  return NextResponse.json({
    followups: { sent: followups.sent, skipped: followups.skipped },
    visits,
    carts,
  });
}
