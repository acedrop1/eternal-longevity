'use server';

import { noticeEmail, sendEmail } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/site';

export interface ContactResult {
  ok: boolean;
  error?: string;
}

const TOPIC_LABELS: Record<string, string> = {
  clinical: 'Support question (existing member)',
  product: 'Question about a protocol',
  eligibility: 'Eligibility / state availability',
  billing: 'Billing or order issue',
  press: 'Press / partnerships',
  other: 'Something else',
};

function escape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Delivers a message from the public contact form to the support inbox.
 *
 * The form used to submit into nothing — no action, no handler, no field names
 * — so every enquiry a visitor typed was thrown away when the page reloaded.
 * Replies go straight back to the sender because the support address is set as
 * reply-to, which means support can answer without copying the address across.
 */
export async function sendContactMessage(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
  /** Hidden field. A human leaves it empty; bots fill everything in. */
  website?: string;
}): Promise<ContactResult> {
  if (input.website) return { ok: true }; // silently drop, don't teach the bot

  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (!name || !email || !message) {
    return { ok: false, error: 'Fill in your name, email and message.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: 'That email address does not look right.' };
  }
  if (message.length > 5000) {
    return { ok: false, error: 'That message is too long — 5000 characters max.' };
  }

  const topic = TOPIC_LABELS[input.topic] ?? 'Something else';
  const sent = await sendEmail({
    to: SUPPORT_EMAIL,
    replyTo: email,
    subject: `Contact form — ${topic}`,
    html: noticeEmail({
      eyebrow: 'Contact form',
      heading: `${name} got in touch`,
      rows: [
        ['From', `${escape(name)} &lt;${escape(email)}&gt;`],
        ['Topic', escape(topic)],
      ],
      body: `<span style="white-space:pre-wrap">${escape(message)}</span>`,
      footnote: 'Replying to this email goes straight back to them.',
    }),
  });

  if (!sent.ok) {
    return {
      ok: false,
      error: 'We could not send that just now. Please email us directly.',
    };
  }
  return { ok: true };
}
