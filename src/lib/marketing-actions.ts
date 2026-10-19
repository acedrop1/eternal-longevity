'use server';

/**
 * The optional marketing program: /subscribe, its email confirmation, and the
 * /marketing-preferences opt-outs. Contact details and channel choices only —
 * no health information is asked for or stored.
 *
 * Nothing is 'subscribed' until confirmed: email by the link we send, SMS by
 * a YES reply (api/webhooks/twilio). Every opt-in, confirmation and opt-out
 * lands in the consent ledger with the words shown and where it came from.
 */
import { randomBytes } from 'crypto';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { noticeEmail, sendEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { SITE_URL } from '@/lib/site';
import type { Json, MarketingStatus } from '@/lib/database.types';
import {
  CONSENT_VERSION,
  EMAIL_DISCLOSURE,
  SERVICE_STATES,
  SMS_CONFIRM_TEXT,
  SMS_DISCLOSURE,
  smsMarketingEnabled,
} from '@/lib/marketing-consent';
import { TOKEN, contactByPrefToken, logConsent, normalizePhone, requestMeta, suppressEmail } from '@/lib/marketing';
import { LIMITS, allow } from './rate-limit';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIVE: MarketingStatus[] = ['pending', 'subscribed'];

export async function subscribeAction(input: {
  email?: string;
  phone?: string;
  firstName?: string;
  state: string;
  emailOptIn: boolean;
  smsOptIn: boolean;
  timezone?: string;
  /** Honeypot. */
  website?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (input?.website) return { ok: true };
  const wantsEmail = input.emailOptIn === true;
  // The SMS box is not on the page until the program is provisioned; a forged one is ignored.
  const wantsSms = input.smsOptIn === true && smsMarketingEnabled();
  if (!wantsEmail && !wantsSms) return { ok: false, error: 'Choose at least one way to hear from us.' };

  const email = wantsEmail ? String(input.email ?? '').trim().toLowerCase() : null;
  if (email !== null && (!EMAIL.test(email) || email.length > 254)) {
    return { ok: false, error: 'That email address does not look right.' };
  }
  const phone = wantsSms ? normalizePhone(String(input.phone ?? '')) : null;
  if (wantsSms && !phone) return { ok: false, error: 'Enter a 10-digit US mobile number.' };
  const state = String(input.state ?? '');
  if (!SERVICE_STATES.some((s) => s.value === state)) return { ok: false, error: 'Choose your state.' };
  const firstName = String(input.firstName ?? '').trim().slice(0, 60) || null;
  let timezone: string | null = String(input.timezone ?? '').slice(0, 64) || null;
  try {
    if (timezone) new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    timezone = null;
  }

  const throttled =
    !(await allow('form', LIMITS.form)) || !(await allow('subscribe', LIMITS.form, email ?? phone ?? undefined));
  if (throttled) return { ok: false, error: 'Too many attempts. Try again shortly.' };
  if (!supabaseAdminConfigured()) return { ok: true };

  const db = createSupabaseAdminClient();
  const cols = 'id, email, phone, email_status, sms_status, email_token';
  // ponytail: matched on email first, else phone; a phone already on another row stays there too (STOP covers every row).
  const { data: existing } = email
    ? await db.from('marketing_contacts').select(cols).eq('email', email).maybeSingle()
    : await db.from('marketing_contacts').select(cols).eq('phone', phone!).order('created_at').limit(1).maybeSingle();

  // A fresh affirmative submit restarts confirmation; only a live subscription on the same address stays live.
  const emailStatus: MarketingStatus | undefined = wantsEmail
    ? existing?.email_status === 'subscribed' ? 'subscribed' : 'pending'
    : undefined;
  const smsStatus: MarketingStatus | undefined = wantsSms
    ? existing?.sms_status === 'subscribed' && existing.phone === phone ? 'subscribed' : 'pending'
    : undefined;
  const emailToken = emailStatus === 'pending' ? randomBytes(32).toString('hex') : undefined;

  const row = {
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(firstName ? { first_name: firstName } : {}),
    ...(emailStatus ? { email_status: emailStatus } : {}),
    ...(smsStatus ? { sms_status: smsStatus } : {}),
    ...(emailToken ? { email_token: emailToken } : {}),
    state,
    ...(timezone ? { timezone } : {}),
  };
  const saved = existing
    ? await db.from('marketing_contacts').update(row).eq('id', existing.id).select('id').single()
    : await db.from('marketing_contacts').insert(row).select('id').single();
  // A double submit racing itself lands on the unique email: the first one did the work.
  if (saved.error || !saved.data) return saved.error?.code === '23505' ? { ok: true } : { ok: false, error: 'Something went wrong. Try again.' };

  const meta = await requestMeta();
  const base = { contact_id: saved.data.id, action: 'opt_in' as const, disclosure_version: CONSENT_VERSION, form_url: `${SITE_URL}/subscribe`, ...meta };
  await logConsent(db, [
    ...(wantsEmail ? [{ ...base, channel: 'email' as const, disclosure_text: EMAIL_DISCLOSURE }] : []),
    // The number is part of the evidence: the contact row's phone can change later.
    ...(wantsSms ? [{ ...base, channel: 'sms' as const, disclosure_text: `${SMS_DISCLOSURE}\n\nMobile number: ${phone}` }] : []),
  ]);

  if (emailToken && email) {
    await sendEmail({
      to: email,
      subject: 'Confirm your subscription',
      html: noticeEmail({
        eyebrow: 'One more step',
        heading: 'Confirm your email.',
        body: 'Tap the button to confirm you’d like marketing emails from Eternal Longevity: updates and offers. Nothing is sent until you confirm.',
        cta: { label: 'Confirm subscription', href: `${SITE_URL}/subscribe/confirm?t=${emailToken}` },
        footnote: 'Didn’t sign up? Ignore this email and you won’t hear from us.',
      }),
    });
  }
  if (smsStatus === 'pending' && phone) await sendSms(phone, SMS_CONFIRM_TEXT);
  return { ok: true };
}

/** The confirmation link's button. Returns the preferences token so the page can land there. */
export async function confirmEmailAction(token: string): Promise<{ ok: boolean; prefToken?: string }> {
  if (!TOKEN.test(token) || !supabaseAdminConfigured()) return { ok: false };
  const db = createSupabaseAdminClient();
  // Only a pending address confirms: after an opt-out the token is cleared, so an old link cannot re-subscribe.
  const { data } = await db
    .from('marketing_contacts')
    .update({ email_status: 'subscribed', email_token: null })
    .eq('email_token', token)
    .eq('email_status', 'pending')
    .select('id, pref_token')
    .maybeSingle();
  if (!data) return { ok: false };
  await logConsent(db, [
    {
      contact_id: data.id,
      channel: 'email',
      action: 'confirm',
      disclosure_text: 'Confirmed by the link emailed to this address.',
      disclosure_version: CONSENT_VERSION,
      form_url: `${SITE_URL}/subscribe/confirm`,
      ...(await requestMeta()),
    },
  ]);
  return { ok: true, prefToken: data.pref_token };
}

/**
 * Opt out from the signed preferences link. Turning a channel back on is not
 * offered here: re-enrolment needs a fresh affirmative request at /subscribe.
 */
export async function optOutAction(token: string, channel: 'email' | 'sms' | 'all'): Promise<{ ok: boolean }> {
  if (!supabaseAdminConfigured()) return { ok: false };
  const db = createSupabaseAdminClient();
  const c = await contactByPrefToken(db, token);
  if (!c) return { ok: false };
  const meta = await requestMeta();
  const ctx = { formUrl: `${SITE_URL}/marketing-preferences`, disclosure: 'Turned off on the Marketing Preferences page.', ...meta };

  if ((channel === 'email' || channel === 'all') && c.email) {
    await suppressEmail(db, c.email, ctx);
    // The assessment reminders are marketing too: one opt-out covers both.
    await db.from('leads').update({ unsubscribed_at: new Date().toISOString() }).eq('email', c.email).is('unsubscribed_at', null);
    const { data: member } = await db.from('profiles').select('id, notification_prefs').eq('email', c.email).maybeSingle();
    if (member) {
      const prefs = (member.notification_prefs ?? {}) as Record<string, unknown>;
      await db.from('profiles').update({ notification_prefs: { ...prefs, reminders: false, marketing: false } as Json }).eq('id', member.id);
    }
  }
  if ((channel === 'sms' || channel === 'all') && LIVE.includes(c.sms_status)) {
    await db.from('marketing_contacts').update({ sms_status: 'unsubscribed' }).eq('id', c.id);
    await logConsent(db, [
      { contact_id: c.id, channel: 'sms', action: 'opt_out', disclosure_text: ctx.disclosure, form_url: ctx.formUrl, ...meta },
    ]);
  }
  return { ok: true };
}

/** "Email me my preferences link." Same answer whether or not the address is on the list. */
export async function sendPreferencesLinkAction(rawEmail: string): Promise<{ ok: boolean; error?: string }> {
  const email = String(rawEmail ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: 'That email address does not look right.' };
  const throttled =
    !(await allow('form', LIMITS.form)) || !(await allow('prefs-link', LIMITS.form, email));
  if (throttled) return { ok: false, error: 'Too many attempts. Try again shortly.' };
  if (!supabaseAdminConfigured()) return { ok: true };

  const { data } = await createSupabaseAdminClient()
    .from('marketing_contacts')
    .select('pref_token')
    .eq('email', email)
    .maybeSingle();
  if (data) {
    await sendEmail({
      to: email,
      subject: 'Your marketing preferences link',
      html: noticeEmail({
        eyebrow: 'Marketing preferences',
        heading: 'Manage what we send you.',
        body: 'Use this link to turn marketing emails or texts off. It works without signing in, so keep it to yourself.',
        cta: { label: 'Open my preferences', href: `${SITE_URL}/marketing-preferences?t=${data.pref_token}` },
        footnote: 'Didn’t ask for this? You can ignore this email; nothing has changed.',
      }),
    });
  }
  return { ok: true };
}
