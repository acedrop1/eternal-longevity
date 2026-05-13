import 'server-only';
import { cookies } from 'next/headers';
import { DEMO_USERS, SESSION_COOKIE, type DemoUser, type Role } from './auth';

/** Read the current demo session, if any. */
export async function getSession(): Promise<DemoUser | null> {
  const store = await cookies();
  const v = store.get(SESSION_COOKIE)?.value as Role | undefined;
  if (!v) return null;
  return DEMO_USERS.find((u) => u.role === v) ?? null;
}

/** Persist a session for the given role. 7 day expiry. */
export async function setSession(role: Role): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, role, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** Wipe the session cookie. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
