import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { noticeEmail, sendEmail } from '@/lib/email';
import type { Role } from '@/lib/auth';

/**
 * A second factor for staff.
 *
 * A password alone is one leak away from every patient record in the system.
 * Members keep a single factor — their own chart is the only thing at risk —
 * while doctor, admin and pharmacy accounts get a code emailed on each new
 * sign-in.
 */

export const MFA_COOKIE = 'el_mfa';
export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
/** Matches the absolute session ceiling, so the two expire together. */
export const MFA_HOURS = 12;

/** "Remember this device" — how long a code can be skipped on this browser. */
export const TRUST_COOKIE = 'el_trust';
export const TRUST_DAYS = 30;

export function mfaRequiredFor(role: Role): boolean {
  return role === 'admin' || role === 'doctor' || role === 'pharmacy';
}

function secret(): string | null {
  return process.env.MFA_SECRET || process.env.CRON_SECRET || null;
}

/** Off when there is no secret to sign with, rather than silently insecure. */
export function mfaConfigured(): boolean {
  return Boolean(secret()) && supabaseAdminConfigured();
}

function hash(value: string): string {
  return createHmac('sha256', secret() ?? '').update(value).digest('hex');
}

/** Proof that this browser passed the check, without a database read per request. */
export function signTicket(userId: string, expiresAt: number): string {
  return `${userId}.${expiresAt}.${hash(`${userId}.${expiresAt}`)}`;
}

/**
 * A browser the account holder has vouched for.
 *
 * Skips the code, never the password, and never the idle logoff — the same
 * bargain Shopify, Google and GitHub strike. Bound to the user agent as well as
 * the account, so the cookie is worth nothing lifted onto another machine, and
 * it carries its own expiry so there is no table to sweep.
 */
export function signTrust(userId: string, userAgent: string): string {
  const expires = Date.now() + TRUST_DAYS * 86_400_000;
  return `${expires}.${hash(`${userId}|${userAgent}|${expires}`)}`;
}

export function trustValid(
  cookie: string | undefined,
  userId: string,
  userAgent: string,
): boolean {
  if (!cookie || !secret()) return false;
  const [expRaw, sig] = cookie.split('.');
  if (!expRaw || !sig) return false;
  if (Number(expRaw) < Date.now()) return false;
  const expected = hash(`${userId}|${userAgent}|${expRaw}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyTicket(ticket: string | undefined, userId: string): boolean {
  if (!ticket || !secret()) return false;
  const [id, expRaw, sig] = ticket.split('.');
  if (!id || !expRaw || !sig) return false;
  if (id !== userId) return false;
  if (Number(expRaw) < Date.now()) return false;
  const expected = hash(`${id}.${expRaw}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Issue a code and email it. Returns false only if it could not be sent. */
export async function issueCode(
  userId: string,
  email: string,
  name: string | null,
): Promise<boolean> {
  if (!mfaConfigured()) return false;
  const db = createSupabaseAdminClient();

  // randomInt is drawn from the CSPRNG; Math.random is not, and a predictable
  // second factor is not a second factor.
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

  const { error } = await db.from('mfa_codes').insert({
    user_id: userId,
    code_hash: hash(code),
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) return false;

  const msg = noticeEmail({
    eyebrow: 'Sign-in code',
    heading: `Your code is ${code}`,
    body: `Hi ${(name ?? '').trim().split(/\s+/)[0] || 'there'} — enter this to finish signing in. It expires in ${CODE_TTL_MINUTES} minutes.`,
    footnote:
      'If you did not just try to sign in, someone has your password. Reply to this email and we will lock the account.',
  });
  try {
    const sent = await sendEmail({
      to: email,
      subject: `${code} is your Eternal Longevity sign-in code`,
      html: msg,
    });
    return sent.ok;
  } catch {
    return false;
  }
}

export type CheckResult = 'ok' | 'wrong' | 'expired' | 'locked' | 'unavailable';

/** Single-use, time-limited, and rate-limited by attempts on the row. */
export async function checkCode(
  userId: string,
  code: string,
): Promise<CheckResult> {
  if (!mfaConfigured()) return 'unavailable';
  const db = createSupabaseAdminClient();

  const { data: row } = await db
    .from('mfa_codes')
    .select('id, code_hash, expires_at, attempts, used_at')
    .eq('user_id', userId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return 'expired';
  if (new Date(row.expires_at).getTime() < Date.now()) return 'expired';
  if (row.attempts >= MAX_ATTEMPTS) return 'locked';

  if (hash(code.trim()) !== row.code_hash) {
    await db
      .from('mfa_codes')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id);
    return row.attempts + 1 >= MAX_ATTEMPTS ? 'locked' : 'wrong';
  }

  await db
    .from('mfa_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id);
  return 'ok';
}
