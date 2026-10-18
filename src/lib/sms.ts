/**
 * SMS via Twilio.
 *
 * Server-only. Every send is a no-op (logged, not thrown) when Twilio env vars
 * are missing, so the demo and the build are never blocked by SMS config.
 *
 * NOTE: if SMS will ever contain health information, a Twilio BAA is required.
 * Two-factor codes and generic delivery alerts generally do not.
 */
import 'server-only';
import twilio from 'twilio';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logMessage } from '@/lib/message-log';

let cached: ReturnType<typeof twilio> | null = null;

/** True when account SID, auth token, and from-number are all present. */
export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

function getTwilio(): ReturnType<typeof twilio> {
  if (cached) return cached;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error('Twilio is not configured.');
  }
  cached = twilio(sid, token);
  return cached;
}

export interface SendSmsResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

/** Send one SMS. Resolves with { ok: false } instead of throwing on failure. */
export async function sendSms(
  to: string,
  body: string,
): Promise<SendSmsResult> {
  if (!smsConfigured()) {
    console.warn(`[sms] Twilio not configured — skipped a message to …${to.slice(-2)}`);
    return { ok: false, error: 'not_configured' };
  }
  // US numbers arrive as typed ("(555) 555-1234", "555.555.1234"); Twilio wants E.164.
  const digits = to.replace(/\D/g, '');
  const e164 = to.trim().startsWith('+') ? `+${digits}` : digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : null;
  if (!e164 || !e164.startsWith('+1')) {
    await logMessage({ channel: 'sms', to, body, ok: false, error: 'not a US number' });
    return { ok: false, error: 'invalid_number' };
  }
  to = e164;
  // Carrier rules: every text says how to stop them (Twilio honours STOP itself).
  if (!/\bSTOP\b/.test(body)) body = `${body} Reply STOP to opt out.`;
  try {
    const message = await getTwilio().messages.create({
      to,
      from: process.env.TWILIO_FROM_NUMBER,
      body,
    });
    await logMessage({ channel: 'sms', to, body, ok: true, providerId: message.sid });
    return { ok: true, sid: message.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unknown error';
    await logMessage({ channel: 'sms', to, body, ok: false, error });
    return { ok: false, error };
  }
}

/** Convenience: send a 6-digit verification code. */
export async function sendVerificationCode(
  to: string,
  code: string,
): Promise<SendSmsResult> {
  return sendSms(
    to,
    `Your Eternal Longevity verification code is ${code}. It expires in 10 minutes.`,
  );
}

/**
 * Member text alerts are opt-in: the unticked "sms_alerts" box on the intake
 * consents step (Text Messaging Terms, /legal/text-messages). Reads the
 * member's most recent intake. STOP replies are handled by Twilio itself.
 */
export async function memberTextsAllowed(db: SupabaseClient, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data } = await db
    .from('intake_submissions')
    .select('answers')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const consents = (data?.answers as { consents?: Record<string, unknown> } | null)?.consents;
  return consents?.sms_alerts === true;
}
