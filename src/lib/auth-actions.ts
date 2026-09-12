'use server';

/**
 * Auth server actions. Each one branches on whether Supabase is configured:
 *   • Demo mode  — the cookie-based demo login.
 *   • Live mode  — real Supabase Auth (sign-in, sign-up, reset).
 *
 * The /login, /signup, /forgot-password, /auth/reset pages all post to these.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEMO_USERS, redirectForRole, type Role } from './auth';
import { clearSession, setSession } from './auth-server';
import { supabaseConfigured } from './env';
import { createSupabaseServerClient } from './supabase/server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from './supabase/admin';
import { passwordResetEmail, sendEmail } from './email';
import { SITE_URL } from './site';
import { ACTIVITY_COOKIE, SESSION_START_COOKIE } from './session-policy';
import { MFA_COOKIE, issueCode, mfaConfigured, mfaRequiredFor } from './mfa';
import { passwordValid } from './intakeSchema';

/** Sign in. Form fields: email, password. */
/** Reset the automatic-logoff clocks. See session-policy.ts. */
async function stampNewSession(): Promise<void> {
  const store = await cookies();
  const now = String(Date.now());
  const opts = { httpOnly: true, sameSite: 'lax' as const, path: '/' };
  store.set(ACTIVITY_COOKIE, now, opts);
  store.set(SESSION_START_COOKIE, now, opts);
}

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

  /*
   * A fresh sign-in starts a fresh clock. Without this the stamps from the
   * previous session survive, so signing in after being timed out lands on the
   * portal with an idle stamp that is already stale — and the middleware
   * bounces straight back to the login page. Same for the twelve-hour ceiling.
   */
  await stampNewSession();

  // Land on the dashboard for this account's role.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role: Role = 'member';
  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();
    role = (profile?.role as Role) ?? 'member';
    fullName = profile?.full_name ?? null;
  }

  /*
   * Staff get a second factor. A member's password protects their own chart;
   * a doctor's or an admin's protects everyone's, so a leak there is a
   * different kind of event.
   */
  if (user && mfaRequiredFor(role) && mfaConfigured()) {
    const sent = await issueCode(user.id, user.email ?? email, fullName);
    if (sent) redirect('/login/verify');
    // Could not email a code — do not silently drop the second factor.
    redirect('/login?error=mfa_unavailable');
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
  const store = await cookies();
  store.delete(ACTIVITY_COOKIE);
  store.delete(SESSION_START_COOKIE);
  store.delete(MFA_COOKIE);

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

  if (supabaseAdminConfigured() && email.includes('@')) {
    // Generate the recovery token ourselves and send it through our own
    // branded email, so nothing arrives "from Supabase" — and the link goes
    // straight to our /auth/confirm route instead of through Supabase's
    // redirect allowlist (which is what breaks the default links).
    try {
      const admin = createSupabaseAdminClient();
      const { data } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
      });
      const tokenHash = data?.properties?.hashed_token;
      if (tokenHash) {
        const link = `${SITE_URL}/auth/confirm?token_hash=${encodeURIComponent(
          tokenHash,
        )}&type=recovery&next=/auth/reset`;
        const msg = passwordResetEmail(link);
        await sendEmail({ to: email, subject: msg.subject, html: msg.html });
      }
      // No token = no such account. Fall through silently.
    } catch {
      // Never surface errors here — same response either way.
    }
  } else if (supabaseConfigured && email.includes('@')) {
    // Fallback (no service key): Supabase's own email flow.
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
  if (!passwordValid(password)) redirect('/auth/reset?error=weak');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect('/auth/reset?error=failed');

  redirect('/portal');
}
