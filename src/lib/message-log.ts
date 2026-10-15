/**
 * Every email and text the site sends, recorded (migration 0031) so admin can
 * show what went to whom on a member's page and an order. Best effort: a
 * logging failure never blocks or fails a send.
 *
 * Links are removed and sign-in codes masked before storing, so a reset link,
 * an unsubscribe token or a sign-in code never lands in the table.
 */
import 'server-only';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“', '&mdash;': '—', '&ndash;': '–', '&middot;': '·', '&hellip;': '…',
};

/** Plain, safe text from an email's HTML or a text message. */
export function redact(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '[link]')
    // Sign-in and verification codes ("Your code is 123456", "123456 is your … code"), not order numbers.
    .replace(/\b\d{6}\b(?= is your)|(?<=code is )\d{6}\b/gi, '••••••');
}

export function htmlToText(html: string): string {
  return redact(
    html
      .replace(/<(style|head|script)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>|<\/(p|tr|h\d|li|div|table)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? ' ')
      .replace(/[ \t ‌͏]+/g, ' ')
      .replace(/ *\n[\s]*/g, '\n')
      .trim(),
  ).slice(0, 4000);
}

export async function logMessage(row: {
  channel: 'email' | 'sms';
  to: string | string[];
  subject?: string;
  body: string;
  ok: boolean;
  error?: string;
  providerId?: string;
}): Promise<void> {
  if (!supabaseAdminConfigured()) return;
  try {
    const db = createSupabaseAdminClient();
    const body = row.channel === 'email' ? htmlToText(row.body) : redact(row.body);
    await db.from('message_log').insert(
      [row.to].flat().map((r) => ({
        channel: row.channel,
        recipient: r.trim().toLowerCase(),
        subject: row.subject ? redact(row.subject) : null,
        body,
        status: row.ok ? ('sent' as const) : ('failed' as const),
        error: row.error ?? null,
        provider_id: row.providerId ?? null,
      })),
    );
  } catch {
    // Table not migrated yet, or the database is down: the send already happened.
  }
}

export interface LoggedMessage {
  id: number;
  channel: 'email' | 'sms';
  to: string;
  subject: string | null;
  body: string | null;
  sent: boolean;
  error: string | null;
  at: string;
}

/** Messages to any of these addresses or phone numbers, newest first. */
export async function messagesTo(recipients: (string | null | undefined)[], since?: string): Promise<LoggedMessage[]> {
  const to = [...new Set(recipients.filter((r): r is string => !!r).map((r) => r.trim().toLowerCase()))];
  if (!to.length || !supabaseAdminConfigured()) return [];
  try {
    let q = createSupabaseAdminClient()
      .from('message_log')
      .select('id, channel, recipient, subject, body, status, error, created_at')
      .in('recipient', to)
      .order('created_at', { ascending: false })
      .limit(200);
    if (since) q = q.gte('created_at', since);
    const { data } = await q;
    return (data ?? []).map((m) => ({
      id: m.id,
      channel: m.channel,
      to: m.recipient,
      subject: m.subject,
      body: m.body,
      sent: m.status === 'sent',
      error: m.error,
      at: m.created_at,
    }));
  } catch {
    return [];
  }
}
