import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import {
  abandonedCartEmail,
  emailConfigured,
  sendEmail,
  unfinishedVisitEmail,
} from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import { SHOP_PRODUCTS } from '@/lib/shopProducts';
import type { CartItem } from '@/lib/cartTypes';

/**
 * Abandoned-funnel recovery.
 *
 * Two drop-out points, one job, because both need the same three checks: has
 * it gone quiet, have we already said something, and is the person still
 * eligible to hear from us.
 *
 *   1. Unfinished visit — signup done, medical questions never answered, so
 *      no prescriber can look at it. Highest value: they gave an email, a
 *      history and an intent, and are blocked on a step they may not know is
 *      outstanding.
 *   2. Abandoned cart — items saved on the profile, untouched since.
 *
 * Exactly one email per abandonment. The reminder timestamp is written before
 * the send, so a failure or a retry can never produce a second nudge; a
 * missed reminder costs a conversion, a duplicate costs trust.
 *
 * Triggered by the Vercel cron entry in vercel.json.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** How long something has to sit still before it counts as abandoned. */
const QUIET_HOURS = 24;
/** Older than this and a nudge is just noise. */
const STALE_DAYS = 30;
/** Ceiling per run, so one bad query cannot mail the whole table. */
const MAX_PER_RUN = 100;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function firstNameOf(full?: string | null, fallback = 'there'): string {
  const n = (full ?? '').trim().split(/\s+/)[0];
  return n || fallback;
}

/** Members who left a cart and have not been nudged for it. */
async function recoverCarts(
  db: ReturnType<typeof createSupabaseAdminClient>,
  quietBefore: string,
  staleAfter: string,
): Promise<{ sent: number; skipped: number }> {
  const { data, error } = await db
    .from('profiles')
    .select('id, email, full_name, cart, notification_prefs')
    .is('cart_reminder_at', null)
    .lt('cart_updated_at', quietBefore)
    .gt('cart_updated_at', staleAfter)
    .limit(MAX_PER_RUN);

  if (error || !data) return { sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (const row of data) {
    const items = Array.isArray(row.cart) ? (row.cart as unknown as CartItem[]) : [];
    const prefs = (row.notification_prefs ?? {}) as Record<string, boolean>;

    // An empty cart is not an abandoned one, and someone who turned marketing
    // off has already answered this question.
    if (!row.email || items.length === 0 || prefs.marketing === false) {
      skipped += 1;
      // Stamp anyway so the row leaves the index instead of being re-scanned
      // on every run forever.
      await db.from('profiles').update({ cart_reminder_at: new Date().toISOString() }).eq('id', row.id);
      continue;
    }

    // Claim it before sending: a duplicate nudge is worse than a missed one.
    const { error: claimErr } = await db
      .from('profiles')
      .update({ cart_reminder_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('cart_reminder_at', null);
    if (claimErr) {
      skipped += 1;
      continue;
    }

    // A cart can reference a SKU that has since been pulled from the
    // catalogue — do not name something we no longer sell.
    const named: { name: string; cadence: string }[] = [];
    for (const i of items) {
      const p = SHOP_PRODUCTS.find((sp) => sp.id === i.productId);
      if (p) named.push({ name: p.name, cadence: String(i.cadence) });
    }

    if (named.length === 0) {
      skipped += 1;
      continue;
    }

    const msg = abandonedCartEmail({
      firstName: firstNameOf(row.full_name),
      items: named,
      cartUrl: `${SITE_URL}/checkout`,
    });
    try {
      await sendEmail({ to: row.email, subject: msg.subject, html: msg.html });
      sent += 1;
    } catch {
      skipped += 1;
    }
  }

  return { sent, skipped };
}

/** Intakes stuck at awaiting_visit — the member never finished the questions. */
async function recoverVisits(
  db: ReturnType<typeof createSupabaseAdminClient>,
  quietBefore: string,
  staleAfter: string,
): Promise<{ sent: number; skipped: number }> {
  const { data, error } = await db
    .from('intake_submissions')
    .select('id, email, answers')
    .eq('status', 'awaiting_visit')
    .is('reminder_at', null)
    .lt('updated_at', quietBefore)
    .gt('updated_at', staleAfter)
    .limit(MAX_PER_RUN);

  if (error || !data) return { sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (const row of data) {
    const { error: claimErr } = await db
      .from('intake_submissions')
      .update({ reminder_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('reminder_at', null);
    if (claimErr || !row.email) {
      skipped += 1;
      continue;
    }

    const answers = (row.answers ?? {}) as Record<string, unknown>;
    const msg = unfinishedVisitEmail({
      firstName:
        typeof answers.first_name === 'string'
          ? firstNameOf(answers.first_name)
          : 'there',
      visitUrl: `${SITE_URL}/portal/visit`,
    });
    try {
      await sendEmail({ to: row.email, subject: msg.subject, html: msg.html });
      sent += 1;
    } catch {
      skipped += 1;
    }
  }

  return { sent, skipped };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdminConfigured() || !emailConfigured()) {
    return NextResponse.json({ skipped: 'not_configured' });
  }

  const now = Date.now();
  const quietBefore = new Date(now - QUIET_HOURS * 3600_000).toISOString();
  const staleAfter = new Date(now - STALE_DAYS * 86400_000).toISOString();

  const db = createSupabaseAdminClient();
  const [visits, carts] = await Promise.all([
    recoverVisits(db, quietBefore, staleAfter),
    recoverCarts(db, quietBefore, staleAfter),
  ]);

  return NextResponse.json({ visits, carts });
}
