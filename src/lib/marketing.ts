/**
 * Shared server pieces of the marketing program (migration 0033): the consent
 * ledger, email suppression, phone normalising and masking. Not a 'use server'
 * module on purpose: nothing here may be callable from a browser.
 */
import 'server-only';
import { headers } from 'next/headers';
import type { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/database.types';
import { clientKey } from '@/lib/rate-limit';

type Db = ReturnType<typeof createSupabaseAdminClient>;
type ConsentEvent = Database['public']['Tables']['marketing_consent_events']['Insert'];

/** US numbers only: "(555) 555-1234" → "+15555551234", anything else → null. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10 && /^[2-9]/.test(d)) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1') && /^[2-9]/.test(d.slice(1))) return `+${d}`;
  return null;
}

/** IP and user agent of the request being served, for the ledger. */
export async function requestMeta(): Promise<{ ip: string; user_agent: string | null }> {
  const ua = (await headers()).get('user-agent');
  return { ip: await clientKey(), user_agent: ua ? ua.slice(0, 500) : null };
}

/** Append to the consent ledger. Never updated, never deleted. */
export async function logConsent(db: Db, events: ConsentEvent[]): Promise<void> {
  if (!events.length) return;
  const { error } = await db.from('marketing_consent_events').insert(events);
  if (error) console.error('[marketing] consent ledger write failed', error.message);
}

/**
 * Stop marketing email to this address in the marketing program, logging the
 * opt-out. A no-op when the address never subscribed or already opted out.
 */
export async function suppressEmail(
  db: Db,
  email: string,
  ctx: { formUrl: string; disclosure: string; ip?: string | null; user_agent?: string | null },
): Promise<void> {
  const { data } = await db
    .from('marketing_contacts')
    .update({ email_status: 'unsubscribed', email_token: null })
    .eq('email', email.trim().toLowerCase())
    .in('email_status', ['pending', 'subscribed'])
    .select('id');
  await logConsent(
    db,
    (data ?? []).map((c) => ({
      contact_id: c.id,
      channel: 'email' as const,
      action: 'opt_out' as const,
      disclosure_text: ctx.disclosure,
      form_url: ctx.formUrl,
      ip: ctx.ip ?? null,
      user_agent: ctx.user_agent ?? null,
    })),
  );
}

/** "adam@gmail.com" → "a•••@g•••.com". */
export function maskEmail(email: string): string {
  const [local, domain = ''] = email.split('@');
  const dot = domain.lastIndexOf('.');
  return `${local.slice(0, 1)}•••@${domain.slice(0, 1)}•••${dot > 0 ? domain.slice(dot) : ''}`;
}

/** "+15555551234" → "•••-•••-1234". */
export function maskPhone(phone: string): string {
  return `•••-•••-${phone.slice(-4)}`;
}

/** Email and preference tokens: 64 hex characters. */
export const TOKEN = /^[a-f0-9]{64}$/;

/** The contact a signed preferences link belongs to, or null. */
export async function contactByPrefToken(db: Db, token: string) {
  if (!TOKEN.test(token)) return null;
  const { data } = await db
    .from('marketing_contacts')
    .select('id, email, phone, email_status, sms_status, pref_token')
    .eq('pref_token', token)
    .maybeSingle();
  return data;
}

/**
 * Marketing email opt-in from the sign-up or assessment form: a pre-checked box
 * the person can untick, counted when they submit (owner's choice; email
 * marketing is opt-out under CAN-SPAM). Logged to the consent ledger with the
 * wording shown. Never re-subscribes someone who opted out: only an explicit
 * /subscribe does that. SMS is never enrolled this way (TCPA needs an unticked box).
 */
export async function optInEmailFromForm(
  db: Db,
  input: { email: string; firstName?: string | null; state?: string | null; formUrl: string; disclosure: string; version: string },
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  try {
    const { data: existing } = await db.from('marketing_contacts').select('id, email_status').eq('email', email).maybeSingle();
    if (existing?.email_status === 'unsubscribed' || existing?.email_status === 'subscribed') return;
    const row = { email, email_status: 'subscribed' as const, ...(input.firstName ? { first_name: input.firstName } : {}), ...(input.state ? { state: input.state } : {}) };
    const { data: saved } = existing
      ? await db.from('marketing_contacts').update(row).eq('id', existing.id).select('id').single()
      : await db.from('marketing_contacts').insert(row).select('id').single();
    if (!saved) return;
    const meta = await requestMeta();
    await logConsent(db, [
      {
        contact_id: saved.id,
        channel: 'email',
        action: 'opt_in',
        disclosure_text: `${input.disclosure} [Pre-checked box, left checked on submit.]`,
        disclosure_version: input.version,
        form_url: input.formUrl,
        ...meta,
      },
    ]);
  } catch (err) {
    // Sign-up and the assessment never fail over marketing.
    console.error('[marketing] form opt-in failed', err instanceof Error ? err.message : err);
  }
}
