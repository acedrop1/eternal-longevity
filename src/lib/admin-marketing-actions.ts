'use server';

/**
 * Admin → Members → a member → Consents & marketing.
 *
 * Admin can record a member's verbal consent to marketing email (given on a
 * call) and turn either channel off for them. Admin cannot switch marketing
 * texts on: the TCPA needs the member's own written consent, so texts only
 * start from /subscribe. Every action is audited on the member.
 */
import { revalidatePath } from 'next/cache';
import { getSession } from './auth-server';
import { recordAudit } from './prescriber';
import { createSupabaseAdminClient, supabaseAdminConfigured } from './supabase/admin';
import { logConsent, suppressEmail } from './marketing';
import { CONSENT_VERSION, EMAIL_DISCLOSURE } from './marketing-consent';
import { SITE_URL } from './site';

type Result = { ok: boolean; message: string };

async function adminAndMember(memberId: string) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  if (!supabaseAdminConfigured()) return null;
  const db = createSupabaseAdminClient();
  const { data: profile } = await db.from('profiles').select('id, email, full_name').eq('id', memberId).maybeSingle();
  if (!profile?.email) return null;
  return { session, db, profile, email: profile.email.trim().toLowerCase() };
}

/**
 * The member agreed to marketing email on a call with admin: subscribe them now.
 * The consent ledger records it as verbal consent, who recorded it, and the
 * disclosure they agreed to.
 */
export async function markEmailSubscribedAction(memberId: string): Promise<Result> {
  const ctx = await adminAndMember(memberId);
  if (!ctx) return { ok: false, message: 'Admin access is required.' };
  const { db, email, profile, session } = ctx;
  const { data: existing } = await db.from('marketing_contacts').select('id, email_status').eq('email', email).maybeSingle();
  if (existing?.email_status === 'subscribed') return { ok: true, message: 'Already subscribed.' };
  const firstName = (profile.full_name ?? '').trim().split(/\s+/)[0] || null;
  const row = { email, email_status: 'subscribed' as const, email_token: null, ...(firstName ? { first_name: firstName } : {}) };
  const saved = existing
    ? await db.from('marketing_contacts').update(row).eq('id', existing.id).select('id').single()
    : await db.from('marketing_contacts').insert(row).select('id').single();
  if (saved.error || !saved.data) return { ok: false, message: 'Could not save. Try again.' };

  const day = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  await logConsent(db, [
    {
      contact_id: saved.data.id,
      channel: 'email',
      action: 'opt_in',
      disclosure_text: `${EMAIL_DISCLOSURE} [Verbal consent by phone, recorded by ${session.name} (admin) on ${day}.]`,
      disclosure_version: CONSENT_VERSION,
      form_url: `${SITE_URL}/portal/admin/members/${memberId}`,
      ip: null,
      user_agent: null,
    },
  ]);
  await recordAudit([
    { actorId: session.id, actorName: session.name, actorRole: 'admin', entity: 'member', entityId: memberId, field: 'Marketing email', oldValue: existing?.email_status ?? 'none', newValue: 'subscribed (verbal consent by phone)' },
  ]);
  revalidatePath(`/portal/admin/members/${memberId}`);
  return { ok: true, message: 'Subscribed. Recorded as consent given by phone.' };
}

/** Turn marketing email or texts off for the member (e.g. they asked by phone or email). */
export async function stopMarketingAction(memberId: string, channel: 'email' | 'sms'): Promise<Result> {
  const ctx = await adminAndMember(memberId);
  if (!ctx) return { ok: false, message: 'Admin access is required.' };
  const { db, email, session } = ctx;
  const why = { formUrl: `${SITE_URL}/portal/admin/members/${memberId}`, disclosure: `Turned off by admin (${session.name}).` };
  const { data: c } = await db.from('marketing_contacts').select('id, email_status, sms_status').eq('email', email).maybeSingle();
  if (!c) return { ok: true, message: 'Not enrolled.' };
  if (channel === 'email') {
    await suppressEmail(db, email, why);
  } else if (c.sms_status === 'pending' || c.sms_status === 'subscribed') {
    await db.from('marketing_contacts').update({ sms_status: 'unsubscribed' }).eq('id', c.id);
    await logConsent(db, [{ contact_id: c.id, channel: 'sms', action: 'opt_out', disclosure_text: why.disclosure, form_url: why.formUrl, ip: null, user_agent: null }]);
  }
  await recordAudit([
    {
      actorId: session.id,
      actorName: session.name,
      actorRole: 'admin',
      entity: 'member',
      entityId: memberId,
      field: channel === 'email' ? 'Marketing email' : 'Marketing texts',
      oldValue: channel === 'email' ? c.email_status : c.sms_status,
      newValue: 'unsubscribed',
    },
  ]);
  revalidatePath(`/portal/admin/members/${memberId}`);
  return { ok: true, message: 'Turned off.' };
}
