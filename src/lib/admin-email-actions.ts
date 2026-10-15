'use server';

import { getSession } from '@/lib/auth-server';
import { adminComposedEmail, sendEmail } from '@/lib/email';
import { recordAudit } from '@/lib/prescriber';
import { allow } from '@/lib/rate-limit';

/*
 * Admin → Emails: a branded email written by hand (the same look as every
 * other email: logo header, "Hi {name}," and the team sign-off). Admin only,
 * rate-limited, and each send is written to the audit log.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Draft {
  name: string;
  subject: string;
  body: string;
}

function build(d: Draft) {
  const firstName = d.name.trim().split(/\s+/)[0] || 'there';
  return adminComposedEmail({ firstName, subject: d.subject.trim(), body: d.body.trim() });
}

export async function previewCustomEmailAction(d: Draft): Promise<{ ok: boolean; html?: string }> {
  const user = await getSession();
  if (!user || user.role !== 'admin') return { ok: false };
  return { ok: true, html: build({ name: d.name ?? '', subject: d.subject ?? '', body: d.body || 'Your message appears here.' }).html };
}

export async function sendCustomEmailAction(
  d: Draft & { to: string },
): Promise<{ ok: boolean; message: string }> {
  const user = await getSession();
  if (!user || user.role !== 'admin') return { ok: false, message: 'Not authorised.' };
  const to = (d.to ?? '').trim().toLowerCase();
  const subject = (d.subject ?? '').trim();
  const body = (d.body ?? '').trim();
  if (!EMAIL.test(to) || to.length > 254) return { ok: false, message: 'Enter one valid email address.' };
  if (!subject || subject.length > 150) return { ok: false, message: 'Add a subject (150 characters max).' };
  if (!body || body.length > 5000) return { ok: false, message: 'Write a message (5,000 characters max).' };
  if (!(await allow('admin-email', { max: 30, windowSeconds: 3600 }, user.id))) {
    return { ok: false, message: 'That’s 30 emails this hour. Try again later.' };
  }

  const msg = build({ name: d.name ?? '', subject, body });
  const sent = await sendEmail({ to, subject: msg.subject, html: msg.html });
  if (!sent.ok) return { ok: false, message: sent.error === 'not_configured' ? 'Email isn’t set up on this server.' : sent.error ?? 'Could not send.' };

  await recordAudit([
    { actorId: user.id, actorName: user.name, actorRole: 'admin', entity: 'email', entityId: null, field: `Custom email to ${to}`, oldValue: null, newValue: subject },
  ]);
  return { ok: true, message: `Sent to ${to}.` };
}
