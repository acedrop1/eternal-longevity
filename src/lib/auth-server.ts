import 'server-only';
import { cookies } from 'next/headers';
import {
  DEMO_USERS,
  SESSION_COOKIE,
  redirectForRole,
  type Role,
  type SessionUser,
} from './auth';
import { supabaseConfigured } from './env';
import { createSupabaseServerClient } from './supabase/server';

/**
 * Read the current session.
 *   • Supabase Auth when the project is configured.
 *   • Demo cookie otherwise.
 * Either way the return shape is identical, so portal pages never branch.
 */
export async function getSession(): Promise<SessionUser | null> {
  return supabaseConfigured ? getSupabaseSession() : getDemoSession();
}

/* -------------------------------------------------------------------------- */
/*  Demo mode                                                                 */
/* -------------------------------------------------------------------------- */

async function getDemoSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const role = store.get(SESSION_COOKIE)?.value as Role | undefined;
  if (!role) return null;
  const demo = DEMO_USERS.find((u) => u.role === role);
  if (!demo) return null;
  return {
    id: `demo-${demo.role}`,
    role: demo.role,
    email: demo.email,
    name: demo.name,
    redirectTo: demo.redirectTo,
  };
}

/** Persist a demo session. No-op once Supabase is connected. */
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

/** Wipe the demo session cookie. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/* -------------------------------------------------------------------------- */
/*  Supabase mode                                                             */
/* -------------------------------------------------------------------------- */

async function getSupabaseSession(): Promise<SessionUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single();

    const role: Role = (profile?.role as Role) ?? 'member';
    return {
      id: user.id,
      role,
      email: profile?.email ?? user.email ?? '',
      name:
        profile?.full_name ??
        (user.email ? user.email.split('@')[0] : 'Member'),
      redirectTo: redirectForRole(role),
    };
  } catch {
    return null;
  }
}
