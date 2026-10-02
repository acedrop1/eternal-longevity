'use server';

import { safeNext } from '@/lib/safe-next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionBeforeMfa } from '@/lib/auth-server';
import { redirectForRole } from '@/lib/auth';
import {
  MFA_COOKIE,
  MFA_HOURS,
  TRUST_COOKIE,
  TRUST_DAYS,
  checkCode,
  issueCode,
  mfaConfigured,
  signTicket,
  signTrust,
} from '@/lib/mfa';
import { LIMITS, allow } from '@/lib/rate-limit';
import { noteStaffSignIn } from '@/lib/device-alert';

const MESSAGES: Record<string, string> = {
  wrong: 'That code is not right. Check the email and try again.',
  expired: 'That code has expired. We have sent you another.',
  locked: 'Too many attempts. We have sent you a new code.',
  unavailable: 'Two-factor is not available right now.',
  throttled: 'Too many attempts. Wait a few minutes and try again.',
};

/**
 * Finish signing in.
 *
 * The password already checked out — this proves the person also holds the
 * mailbox. A wrong or stale code sends a fresh one rather than leaving someone
 * stuck on a screen they cannot get past.
 */
export async function verifyMfaAction(formData: FormData): Promise<void> {
  const user = await getSessionBeforeMfa();
  if (!user) redirect('/login');

  /*
   * Five attempts are enforced per code, but a wrong code issues a fresh one —
   * so without a ceiling here the six-digit space is walkable.
   */
  // Per IP and per account: rotating IPs does not buy one account more guesses.
  if (!(await allow('mfa', LIMITS.mfa)) || !(await allow('mfa', LIMITS.mfa, user.id))) {
    redirect('/login/verify?error=throttled');
  }

  const code = String(formData.get('code') ?? '').replace(/\D/g, '');
  const result = await checkCode(user.id, code);

  if (result === 'ok') {
    const expires = Date.now() + MFA_HOURS * 3_600_000;
    const store = await cookies();
    store.set(MFA_COOKIE, signTicket(user.id, expires), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(expires),
    });

    // Vouching for a browser is the account holder's call, never a default.
    if (formData.get('remember')) {
      const ua = (await headers()).get('user-agent') ?? '';
      store.set(TRUST_COOKIE, signTrust(user.id, ua), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: TRUST_DAYS * 86_400,
      });
    }

    await noteStaffSignIn({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    // Back to where they were headed (validated for this role), else their dashboard.
    redirect(safeNext(formData.get('next'), user.role) ?? redirectForRole(user.role));
  }

  if (result === 'expired' || result === 'locked') {
    await issueCode(user.id, user.email, user.name);
  }
  redirect(`/login/verify?error=${result}`);
}

/** Send another code, for the one that never arrived. */
export async function resendMfaAction(): Promise<void> {
  const user = await getSessionBeforeMfa();
  if (!user) redirect('/login');
  if (!(await allow('mfa', LIMITS.mfa)) || !(await allow('mfa', LIMITS.mfa, user.id))) {
    redirect('/login/verify?error=throttled');
  }
  if (!mfaConfigured()) redirect('/login/verify?error=unavailable');
  // False when the hourly cap is reached (or the mail failed): don't claim it was sent.
  const sent = await issueCode(user.id, user.email, user.name);
  redirect(sent ? '/login/verify?sent=1' : '/login/verify?error=throttled');
}

export async function mfaMessageFor(key: string | undefined): Promise<string | null> {
  return key ? (MESSAGES[key] ?? null) : null;
}
