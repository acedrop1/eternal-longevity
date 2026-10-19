'use server';

/**
 * Privacy requests (/privacy-request) and the admin workflow for them.
 *
 * Each request gets a reference and a 45-day deadline; the support inbox is
 * told, the requester gets a receipt saying how to appeal. Advertising
 * opt-outs need no account or identity check. Never asks for health details.
 */
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth-server';
import { recordAudit } from '@/lib/prescriber';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { SUPPORT_EMAIL, noticeEmail, sendEmail } from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import { PRIVACY_REQUEST_TYPES, type PrivacyRequestValue } from '@/lib/marketing-consent';
import type { PrivacyRequestStatus } from '@/lib/database.types';
import { LIMITS, allow } from './rate-limit';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REF = /^PR-[A-F0-9]{6}$/;
const DAY = 86_400_000;
const STATES = ['NJ', 'NY', 'PA', 'MI', 'Other'];

const label = (t: string) => PRIVACY_REQUEST_TYPES.find((x) => x.value === t)?.label ?? t;
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

export async function submitPrivacyRequestAction(input: {
  type: string;
  name: string;
  email: string;
  state: string;
  details?: string;
  agentName?: string;
  agentStatement?: boolean;
  appealOf?: string;
  /** Honeypot. */
  website?: string;
}): Promise<{ ok: boolean; ref?: string; error?: string }> {
  if (input?.website) return { ok: true };
  const type = PRIVACY_REQUEST_TYPES.find((t) => t.value === input.type)?.value as PrivacyRequestValue | undefined;
  const name = String(input.name ?? '').trim().slice(0, 120);
  const email = String(input.email ?? '').trim().toLowerCase();
  const state = STATES.includes(input.state) ? input.state : null;
  const details = String(input.details ?? '').trim();
  const isAgent = type === 'agent';
  const agentName = isAgent ? String(input.agentName ?? '').trim().slice(0, 120) : null;
  const appealOf = type === 'appeal' ? String(input.appealOf ?? '').trim().toUpperCase() : null;

  if (!type) return { ok: false, error: 'Choose what you’d like us to do.' };
  if (!name || !EMAIL.test(email) || email.length > 254) return { ok: false, error: 'Enter your name and a valid email.' };
  if (!state) return { ok: false, error: 'Choose your state.' };
  if (details.length > 2000) return { ok: false, error: 'Details can be up to 2000 characters.' };
  if (isAgent && (!agentName || input.agentStatement !== true)) {
    return { ok: false, error: 'Agents: enter your name and confirm you’re authorized.' };
  }
  if (appealOf !== null && !REF.test(appealOf)) return { ok: false, error: 'Enter the reference of the request you’re appealing, like PR-1A2B3C.' };

  const throttled =
    !(await allow('form', LIMITS.form)) || !(await allow('privacy', LIMITS.form, email));
  if (throttled) return { ok: false, error: 'Too many requests. Try again shortly.' };
  if (!supabaseAdminConfigured()) return { ok: false, error: 'We couldn’t save that. Email us instead.' };

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('privacy_requests')
    .insert({ request_type: type, name, email, state, details: details || null, is_agent: isAgent, agent_name: agentName, appeal_of: appealOf })
    .select('ref, due_at')
    .single();
  if (error || !data) return { ok: false, error: 'We couldn’t save that. Email us instead.' };
  // Only the requester who made the original request can move it to appealed.
  if (appealOf) {
    await db.from('privacy_requests').update({ status: 'appealed' }).eq('ref', appealOf).eq('email', email).in('status', ['completed', 'denied']);
  }

  const due = longDate(data.due_at);
  await Promise.all([
    sendEmail({
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `Privacy request ${data.ref}: ${label(type)}`,
      html: noticeEmail({
        eyebrow: 'Privacy request',
        heading: `${label(type)} — respond by ${due}`,
        rows: [
          ['Reference', data.ref],
          ['Request', label(type)],
          ['From', `${name} <${email}>`],
          ['State', state],
          ...(agentName ? ([['Authorized agent', agentName]] as [string, string][]) : []),
          ...(appealOf ? ([['Appeal of', appealOf]] as [string, string][]) : []),
          ['Respond by', due],
        ],
        body: details || undefined,
        cta: { label: 'Open privacy requests', href: `${SITE_URL}/portal/admin/privacy-requests` },
        footnote:
          type === 'ad_opt_out'
            ? 'Advertising opt-out: act on it without asking for an account or identity verification.'
            : 'Replying to this email goes straight back to the requester.',
      }),
    }),
    sendEmail({
      to: email,
      subject: `We received your privacy request (${data.ref})`,
      html: noticeEmail({
        eyebrow: 'Privacy request',
        heading: 'We’ve got your request.',
        body: `Thanks, ${name}. We respond to privacy requests within 45 days. If we need more time, we’ll tell you why before then and extend by no more than 45 more days.`,
        rows: [
          ['Reference', data.ref],
          ['Request', label(type)],
          ['We’ll respond by', due],
        ],
        next: `Disagree with our answer? Reply to this email with “Privacy Appeal” and your reference, or choose “Appeal a decision” at ${SITE_URL}/privacy-request. We respond to appeals within 45 days.`,
      }),
    }),
  ]);
  return { ok: true, ref: data.ref };
}

/* --------------------------------- admin ---------------------------------- */

const SETTABLE: PrivacyRequestStatus[] = ['in_progress', 'extended', 'completed', 'denied'];

export async function updatePrivacyRequestAction(input: {
  id: string;
  status: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'admin') return { ok: false, error: 'Not allowed.' };
  const status = SETTABLE.find((s) => s === input.status);
  const reason = String(input.reason ?? '').trim().slice(0, 1000);
  if (!status) return { ok: false, error: 'Choose a status.' };
  if (status === 'extended' && !reason) return { ok: false, error: 'Say why the extension is needed: the requester is told.' };
  if (!supabaseAdminConfigured()) return { ok: false, error: 'Database not connected.' };

  const db = createSupabaseAdminClient();
  const { data: row } = await db
    .from('privacy_requests')
    .select('id, ref, name, email, request_type, status, due_at, extended_until')
    .eq('id', String(input.id))
    .maybeSingle();
  if (!row) return { ok: false, error: 'Request not found.' };
  if (status === 'extended' && row.extended_until) return { ok: false, error: 'Already extended once.' };

  // One extension, of at most 45 days past the original deadline.
  const extendedUntil = status === 'extended' ? new Date(Date.parse(row.due_at) + 45 * DAY).toISOString() : undefined;
  const { error } = await db
    .from('privacy_requests')
    .update({ status, ...(extendedUntil ? { extended_until: extendedUntil, extension_reason: reason } : {}) })
    .eq('id', row.id);
  if (error) return { ok: false, error: 'Could not save.' };

  await recordAudit([
    {
      actorId: user.id,
      actorName: user.name,
      actorRole: 'admin',
      entity: 'privacy_request',
      entityId: row.id,
      field: 'status',
      oldValue: row.status,
      newValue: reason ? `${status}: ${reason}` : status,
    },
  ]);

  // The requester hears about an extension (required within the first 45 days) and a denial (with how to appeal).
  if (status === 'extended' || status === 'denied') {
    await sendEmail({
      to: row.email,
      subject: `Your privacy request ${row.ref}`,
      html: noticeEmail({
        eyebrow: 'Privacy request',
        heading: status === 'extended' ? 'We need a little more time.' : 'We can’t complete this request.',
        body:
          status === 'extended'
            ? `Hi ${row.name}, we’re extending our response to your request to ${longDate(extendedUntil!)}. Why: ${reason}`
            : `Hi ${row.name}, we’re unable to complete your request (${label(row.request_type)}).${reason ? ` Why: ${reason}` : ''}`,
        rows: [['Reference', row.ref]],
        next: `You can appeal: reply to this email with “Privacy Appeal” and your reference, or choose “Appeal a decision” at ${SITE_URL}/privacy-request. We respond to appeals within 45 days.`,
      }),
    });
  }
  revalidatePath('/portal/admin/privacy-requests');
  return { ok: true };
}
