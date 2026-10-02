'use server';

/**
 * Auth server actions. Each one branches on whether Supabase is configured:
 *   • Demo mode  — the cookie-based demo login.
 *   • Live mode  — real Supabase Auth (sign-in, sign-up, reset).
 *
 * The /login, /signup, /forgot-password, /auth/reset pages all post to these.
 */
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEMO_USERS, redirectForRole, type Role } from './auth';
import { clearSession, getSession, setSession } from './auth-server';
import { loginHref, safeNext } from './safe-next';
import { supabaseConfigured } from './env';
import { createSupabaseServerClient } from './supabase/server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from './supabase/admin';
import { passwordResetEmail, sendEmail } from './email';
import { SITE_URL } from './site';
import { ACTIVITY_COOKIE, SESSION_START_COOKIE } from './session-policy';
import {
  MFA_COOKIE,
  MFA_HOURS,
  TRUST_COOKIE,
  issueCode,
  mfaConfigured,
  mfaRequiredFor,
  signTicket,
  trustValid,
} from './mfa';
import { markRecovery, takeRecovery } from './recovery';
import { passwordValid } from './intakeSchema';
import { LIMITS, allow } from './rate-limit';
import { noteStaffSignIn } from './device-alert';

/** Sign in. Form fields: email, password. */
/** Reset the automatic-logoff clocks. See session-policy.ts. */
async function stampNewSession(): Promise<void> {
  const store = await cookies();
  const now = String(Date.now());
  const opts = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' };
  store.set(ACTIVITY_COOKIE, now, opts);
  store.set(SESSION_START_COOKIE, now, opts);
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  // Where they were headed. Checked against the role once it is known.
  const next = formData.get('next');
  const keep = safeNext(next);
  const withNext = (path: string) =>
    keep ? `${path}${path.includes('?') ? '&' : '?'}next=${encodeURIComponent(keep)}` : path;

  /*
   * Nothing stood between an attacker and unlimited password guesses against
   * a known staff address, and the admin account reaches every chart.
   */
  if (!(await allow('login', LIMITS.login))) {
    redirect(withNext('/login?error=throttled'));
  }

  if (!supabaseConfigured) {
    const demo = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email && u.password === password,
    );
    if (!demo) redirect(withNext('/login?error=invalid'));
    await setSession(demo.role);
    redirect(safeNext(next, demo.role) ?? demo.redirectTo);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) redirect(withNext('/login?error=invalid'));

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
    /*
     * A browser this account has already vouched for skips the code — it does
     * not skip the password, the idle logoff or the new-device alert.
     */
    const store = await cookies();
    const ua = (await headers()).get('user-agent') ?? '';
    if (trustValid(store.get(TRUST_COOKIE)?.value, user.id, ua)) {
      const expires = Date.now() + MFA_HOURS * 3_600_000;
      store.set(MFA_COOKIE, signTicket(user.id, expires), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: new Date(expires),
      });
      await noteStaffSignIn({
        id: user.id,
        email: user.email ?? email,
        name: fullName,
        role,
      });
      redirect(safeNext(next, role) ?? redirectForRole(role));
    }

    const sent = await issueCode(user.id, user.email ?? email, fullName);
    if (sent) redirect(withNext('/login/verify'));
    // Could not email a code — do not silently drop the second factor.
    redirect(withNext('/login?error=mfa_unavailable'));
  }

  /*
   * Sign-in is complete here only when there is no second factor to clear;
   * otherwise the alert fires from verifyMfaAction, so a password guess that
   * never gets past the code cannot fill someone's inbox.
   */
  if (user) {
    await noteStaffSignIn({
      id: user.id,
      email: user.email ?? email,
      name: fullName,
      role,
    });
  }

  redirect(safeNext(next, role) ?? redirectForRole(role));
}

/**
 * Sign in from inside the assessment. A returning member keeps the answers
 * already given (they live only in the page, never in storage) instead of
 * being sent to /login and starting over. Members only: staff have a second
 * factor, so they are told to use /login.
 */
export async function assessmentSignInAction(
  rawEmail: string,
  password: string,
): Promise<{ ok: boolean; error?: 'invalid' | 'throttled' | 'use_login' }> {
  const email = rawEmail.trim().toLowerCase();
  if (!(await allow('login', LIMITS.login))) return { ok: false, error: 'throttled' };

  if (!supabaseConfigured) {
    const demo = DEMO_USERS.find((u) => u.email.toLowerCase() === email && u.password === password);
    if (!demo) return { ok: false, error: 'invalid' };
    if (demo.role !== 'member') return { ok: false, error: 'use_login' };
    await setSession(demo.role);
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, error: 'invalid' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
  if ((profile?.role ?? 'member') !== 'member') {
    await supabase.auth.signOut();
    return { ok: false, error: 'use_login' };
  }
  await stampNewSession();
  return { ok: true };
}

/** Create an account. Form fields: name, email, password. Live mode only. */
export async function signupAction(formData: FormData): Promise<void> {
  if (!supabaseConfigured) redirect('/login');

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('name') ?? '').trim();

  if (!(await allow('signup', LIMITS.signup))) {
    redirect('/signup?error=throttled');
  }

  if (!email.includes('@') || !passwordValid(password)) {
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
  // Via a page that clears the assessment answers this browser kept.
  redirect('/auth/signed-out');
}

/** Send a password-reset email. Form field: email. */
export async function requestPasswordResetAction(
  formData: FormData,
): Promise<void> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  // Carried through the email link so the reset lands where they were headed.
  const keep = safeNext(formData.get('next'));
  const sentPath = keep ? `/forgot-password?sent=1&next=${encodeURIComponent(keep)}` : '/forgot-password?sent=1';
  const resetPath = keep ? `/auth/reset?next=${encodeURIComponent(keep)}` : '/auth/reset';

  // Reset mail is free outbound email addressed to anyone you name.
  if (!(await allow('reset', LIMITS.passwordReset))) {
    redirect(sentPath);
  }

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
        )}&type=recovery&next=${encodeURIComponent(resetPath)}`;
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
  redirect(sentPath);
}

/**
 * The button behind a recovery link (/auth/continue). Verifying on a POST
 * rather than on the link's GET means a mail scanner cannot spend the token,
 * and a page elsewhere cannot sign a visitor in to someone else's account by
 * linking them here: a server action refuses cross-site posts. Recovery only;
 * signup confirmation goes through /auth/callback.
 */
export async function confirmRecoveryAction(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get('token_hash') ?? '');
  const next = safeNext(formData.get('next')) ?? '/auth/reset';
  if (!supabaseConfigured || !tokenHash) redirect('/forgot-password?error=expired');
  if (!(await allow('recovery', LIMITS.login))) redirect('/forgot-password?error=expired');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
  if (error || !data.user) redirect('/forgot-password?error=expired');
  await markRecovery(data.user.id);
  redirect(next);
}

/**
 * Set a new password. Form field: password. Only straight after a recovery
 * link (the flag confirmRecoveryAction sets), never on a session alone: a
 * signed-in password change goes through changePasswordAction, which asks
 * for the current one.
 */
export async function updatePasswordAction(
  formData: FormData,
): Promise<void> {
  if (!supabaseConfigured) redirect('/login');

  const next = formData.get('next');
  const keep = safeNext(next);
  const again = (err: string) =>
    `/auth/reset?error=${err}${keep ? `&next=${encodeURIComponent(keep)}` : ''}`;

  const password = String(formData.get('password') ?? '');
  if (!passwordValid(password)) redirect(again('weak'));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  // One use: the flag is spent whether or not the change goes through.
  if (!authUser || !(await takeRecovery(authUser.id))) redirect(again('failed'));

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(again('failed'));
  // Whoever else holds a session on this account (the reason for a reset, often) is out.
  await supabase.auth.signOut({ scope: 'others' });

  /*
   * The recovery link is a fresh sign-in: restart the logoff clocks, or the
   * idle stamp of an older session bounces them out on the next page.
   */
  await stampNewSession();

  // Staff still owe the second factor (no session yet), so they sign in again
  // and land on `next` from there.
  const user = await getSession();
  redirect(user ? (safeNext(next, user.role) ?? user.redirectTo) : loginHref(next));
}
