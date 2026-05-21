'use server';

/**
 * Auth server actions. Each one branches on whether Supabase is configured:
 *   • Demo mode  — the cookie-based demo login.
 *   • Live mode  — real Supabase Auth (sign-in, sign-up, reset).
 *
 * The /login, /signup, /forgot-password, /auth/reset pages all post to these.
 */
import { redirect } from 'next/navigation';
import { DEMO_USERS, redirectForRole, type Role } from './auth';
import { clearSession, setSession } from './auth-server';
import { supabaseConfigured } from './env';
import { createSupabaseServerClient } from './supabase/server';
import { SITE_URL } from './site';

/** Sign in. Form fields: email, password. */
export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!supabaseConfigured) {
    const demo = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email && u.password === password,
    );
    if (!demo) redirect('/login?error=invalid');
    await setSession(demo.role);
    redirect(demo.redirectTo);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) redirect('/login?error=invalid');

  // Land on the dashboard for this account's role.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role: Role = 'member';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = (profile?.role as Role) ?? 'member';
  }
  redirect(redirectForRole(role));
}

/** Create an account. Form fields: name, email, password. Live mode only. */
export async function signupAction(formData: FormData): Promise<void> {
  if (!supabaseConfigured) redirect('/login');

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('name') ?? '').trim();

  if (!email.includes('@') || password.length < 8) {
    redirect('/signup?error=invalid');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/portal`,
    },
  });
  if (error) redirect('/signup?error=taken');

  // With email confirmation enabled there's no session until the link is
  // clicked; otherwise the user is signed in immediately.
  if (data.session) redirect('/portal');
  redirect('/login?notice=check-email');
}

/** Sign out. */
export async function logoutAction(): Promise<void> {
  if (supabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } else {
    await clearSession();
  }
  redirect('/login');
}

/** Send a password-reset email. Form field: email. */
export async function requestPasswordResetAction(
  formData: FormData,
): Promise<void> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (supabaseConfigured && email.includes('@')) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/auth/reset`,
    });
  }

  // Always confirm the same way — never reveal whether an account exists.
  redirect('/forgot-password?sent=1');
}

/** Set a new password. Form field: password. Requires a recovery session. */
export async function updatePasswordAction(
  formData: FormData,
): Promise<void> {
  if (!supabaseConfigured) redirect('/login');

  const password = String(formData.get('password') ?? '');
  if (password.length < 8) redirect('/auth/reset?error=weak');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect('/auth/reset?error=failed');

  redirect('/portal');
}
