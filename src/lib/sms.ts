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
    console.warn(`[sms] Twilio not configured — skipped message to ${to}`);
    return { ok: false, error: 'not_configured' };
  }
  try {
    const message = await getTwilio().messages.create({
      to,
      from: process.env.TWILIO_FROM_NUMBER,
      body,
    });
    return { ok: true, sid: message.sid };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
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
