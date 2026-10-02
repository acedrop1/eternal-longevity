import 'server-only';
import { cookies } from 'next/headers';
import { signTicket, verifyTicket } from './mfa';

/*
 * Short-lived proof that this browser just came through a password-recovery
 * link. A session alone is not enough to set a new password without the old
 * one: anyone at an unlocked, signed-in laptop has a session.
 *
 * Signed with the MFA secret (MFA_SECRET, else CRON_SECRET) under its own
 * prefix, so an MFA ticket is never accepted as one. With neither secret set,
 * reset by link is off — the same rule as staff two-factor.
 */
const RECOVERY_COOKIE = 'el_recovery';
const RECOVERY_MINUTES = 15;
const id = (userId: string) => `recovery:${userId}`;

/** Called once the recovery token has been verified for this user. */
export async function markRecovery(userId: string): Promise<void> {
  const expires = Date.now() + RECOVERY_MINUTES * 60_000;
  (await cookies()).set(RECOVERY_COOKIE, signTicket(id(userId), expires), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expires),
  });
}

/** True, once, if this browser holds a live recovery flag for this user. Consumes it either way. */
export async function takeRecovery(userId: string): Promise<boolean> {
  const store = await cookies();
  const ok = verifyTicket(store.get(RECOVERY_COOKIE)?.value, id(userId));
  store.delete(RECOVERY_COOKIE);
  return ok;
}
