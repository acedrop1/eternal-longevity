'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-server';
import { redirectForRole } from '@/lib/auth';
import {
  MFA_COOKIE,
  MFA_HOURS,
  checkCode,
  issueCode,
  mfaConfigured,
  signTicket,
} from '@/lib/mfa';
import { noteStaffSignIn } from '@/lib/device-alert';

const MESSAGES: Record<string, string> = {
  wrong: 'That code is not right. Check the email and try again.',
  expired: 'That code has expired. We have sent you another.',
  locked: 'Too many attempts. We have sent you a new code.',
  unavailable: 'Two-factor is not available right now.',
};

/**
 * Finish signing in.
 *
 * The password already checked out — this proves the person also holds the
 * mailbox. A wrong or stale code sends a fresh one rather than leaving someone
 * stuck on a screen they cannot get past.
 */
export async function verifyMfaAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect('/login');

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
    await noteStaffSignIn({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    redirect(redirectForRole(user.role));
  }

  if (result === 'expired' || result === 'locked') {
    await issueCode(user.id, user.email, user.name);
  }
  redirect(`/login/verify?error=${result}`);
}

/** Send another code, for the one that never arrived. */
export async function resendMfaAction(): Promise<void> {
  const user = await getSession();
  if (!user) redirect('/login');
  if (!mfaConfigured()) redirect('/login/verify?error=unavailable');
  await issueCode(user.id, user.email, user.name);
  redirect('/login/verify?sent=1');
}

export async function mfaMessageFor(key: string | undefined): Promise<string | null> {
  return key ? (MESSAGES[key] ?? null) : null;
}
