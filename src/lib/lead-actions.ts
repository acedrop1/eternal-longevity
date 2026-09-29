'use server';

/**
 * Leads: the email given at the assessment's email step, before any account.
 *
 * captureLeadAction is best effort — the wizard carries on whatever it
 * returns. The follow-up emails themselves go out from the recovery cron.
 */
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { LEAD_CONSENT } from '@/lib/followups';
import type { Json } from '@/lib/database.types';
import { LIMITS, allow } from './rate-limit';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Product ids and category keys are short slugs; anything else is dropped, not stored. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export async function captureLeadAction(input: {
  email: string;
  productId?: string;
  category?: string;
  consent: true;
}): Promise<{ ok: boolean; error?: string }> {
  const email = String(input?.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: 'invalid_email' };
  // No consent, no lead: the box on the email step is what lets us write.
  if (input.consent !== true) return { ok: false, error: 'consent_required' };

  const throttled =
    !(await allow('lead', LIMITS.form)) || !(await allow('lead', LIMITS.form, email));
  if (throttled) return { ok: false, error: 'rate_limited' };

  if (!supabaseAdminConfigured()) return { ok: true };

  const productId = typeof input.productId === 'string' && SLUG.test(input.productId) ? input.productId : null;
  const category = typeof input.category === 'string' && SLUG.test(input.category) ? input.category : null;
  const now = new Date().toISOString();

  try {
    const db = createSupabaseAdminClient();
    const { data: member } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
    const converted = member ? now : null;

    const { data: existing } = await db
      .from('leads')
      .select('id, converted_at')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      // Keep the original consent and any unsubscribe; just note they came back.
      const { error } = await db
        .from('leads')
        .update({
          last_seen_at: now,
          ...(productId || category ? { product_id: productId, category } : {}),
          ...(converted && !existing.converted_at ? { converted_at: converted } : {}),
        })
        .eq('id', existing.id);
      return error ? { ok: false, error: 'save_failed' } : { ok: true };
    }

    const { error } = await db.from('leads').insert({
      email,
      product_id: productId,
      category,
      consent_at: now,
      consent_text: `[${LEAD_CONSENT.version}] ${LEAD_CONSENT.text}`,
      converted_at: converted,
    });
    // A double submit racing itself lands on the unique email: already saved.
    if (error && error.code !== '23505') return { ok: false, error: 'save_failed' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'save_failed' };
  }
}

/* ------------------------------- unsubscribe ------------------------------ */

const TOKEN = /^[a-f0-9]{64}$/;

/** Whether an unsubscribe token belongs to anyone, and whether it is already used. */
export async function unsubscribeStatus(
  token: string,
): Promise<'invalid' | 'subscribed' | 'unsubscribed'> {
  if (!TOKEN.test(token) || !supabaseAdminConfigured()) return 'invalid';
  const db = createSupabaseAdminClient();
  const [{ data: lead }, { data: member }] = await Promise.all([
    db.from('leads').select('unsubscribed_at').eq('unsubscribe_token', token).maybeSingle(),
    db.from('profiles').select('notification_prefs').eq('unsubscribe_token', token).maybeSingle(),
  ]);
  if (lead) return lead.unsubscribed_at ? 'unsubscribed' : 'subscribed';
  if (member) {
    const prefs = (member.notification_prefs ?? {}) as Record<string, unknown>;
    return prefs.reminders === false ? 'unsubscribed' : 'subscribed';
  }
  return 'invalid';
}

/**
 * Stop reminder and marketing email for whoever owns this token — the lead,
 * the member with that address, or both. The token is the credential, so this
 * works straight from the email without signing in.
 */
export async function unsubscribeAction(token: string): Promise<{ ok: boolean }> {
  if (!TOKEN.test(token) || !supabaseAdminConfigured()) return { ok: false };
  const db = createSupabaseAdminClient();

  const [{ data: lead }, { data: byToken }] = await Promise.all([
    db.from('leads').select('id, email, unsubscribed_at').eq('unsubscribe_token', token).maybeSingle(),
    db.from('profiles').select('id, email').eq('unsubscribe_token', token).maybeSingle(),
  ]);
  if (!lead && !byToken) return { ok: false };
  const email = (lead?.email ?? byToken?.email ?? '').toLowerCase();

  if (lead && !lead.unsubscribed_at) {
    await db.from('leads').update({ unsubscribed_at: new Date().toISOString() }).eq('id', lead.id);
  } else if (!lead && email) {
    // A member unsubscribing also covers the lead on the same address.
    await db
      .from('leads')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('email', email)
      .is('unsubscribed_at', null);
  }

  // The member on this address, if any: turn off reminders and marketing in
  // the same preferences their account page shows.
  const { data: member } = byToken
    ? await db.from('profiles').select('id, notification_prefs').eq('id', byToken.id).maybeSingle()
    : email
      ? await db.from('profiles').select('id, notification_prefs').eq('email', email).maybeSingle()
      : { data: null };
  if (member) {
    const prefs = (member.notification_prefs ?? {}) as Record<string, unknown>;
    await db
      .from('profiles')
      .update({ notification_prefs: { ...prefs, reminders: false, marketing: false } as Json })
      .eq('id', member.id);
  }
  return { ok: true };
}
