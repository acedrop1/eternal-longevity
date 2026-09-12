import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/env';

/**
 * Prove the person at the keyboard is still the account holder.
 *
 * A signature is the legal artifact this practice produces, and a session that
 * survives thirty idle minutes is not evidence that the prescriber is the one
 * clicking. EHRs ask again at the moment of signing for exactly this reason;
 * so does Shopify before it moves a payout account.
 *
 * The check runs on a throwaway client with no cookie storage — signing in here
 * must not rotate, extend or replace the session the browser is holding.
 */
export async function passwordMatches(
  email: string,
  password: string,
): Promise<boolean> {
  if (!supabaseConfigured || !password) return false;
  try {
    const probe = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await probe.auth.signInWithPassword({ email, password });
    return !error;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*  The signing window                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Typing a full password thirty times a morning is how people end up choosing
 * a bad one, or leaving the browser to remember it. So the password is asked
 * for once and then holds for a short window — the same bargain `sudo` strikes,
 * and short enough that it cannot outlive the prescriber's presence at the desk.
 *
 * The window rolls forward with each signature and dies with the browser
 * session, so walking away ends it.
 */
export const SIGN_COOKIE = 'el_sign';
export const SIGN_MINUTES = 10;

function secret(): string | null {
  return process.env.MFA_SECRET || process.env.CRON_SECRET || null;
}

export async function signWindowOpen(userId: string): Promise<boolean> {
  const key = secret();
  if (!key) return false;
  const raw = (await cookies()).get(SIGN_COOKIE)?.value;
  if (!raw) return false;
  const [expRaw, sig] = raw.split('.');
  if (!expRaw || !sig || Number(expRaw) < Date.now()) return false;
  const expected = createHmac('sha256', key)
    .update(`${userId}|${expRaw}`)
    .digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function openSignWindow(userId: string): Promise<void> {
  const key = secret();
  if (!key) return;
  const expires = Date.now() + SIGN_MINUTES * 60_000;
  const sig = createHmac('sha256', key)
    .update(`${userId}|${expires}`)
    .digest('hex');
  (await cookies()).set(SIGN_COOKIE, `${expires}.${sig}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // No maxAge on purpose: the window dies with the browser session as well
    // as with its own clock.
  });
}
