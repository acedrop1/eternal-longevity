/**
 * Auth callback. Supabase redirects here from email links (signup confirmation,
 * password recovery) and from "Continue with Google". It exchanges the
 * one-time code for a session cookie, then forwards to `next`.
 *
 * Google is for members only: staff sign in with a password and a second
 * factor (lib/auth-actions loginAction), and an OAuth session would skip it,
 * so a staff account arriving here from Google is signed straight back out.
 * A new Google account gets the same welcome email and reminder consent as
 * /signup.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { safeNext } from '@/lib/safe-next';
import { markRecovery } from '@/lib/recovery';
import { ACTIVITY_COOKIE, SESSION_START_COOKIE } from '@/lib/session-policy';
import { SIGNUP_CONSENT } from '@/lib/followups';
import { sendEmail, signupWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/** A Google account created in the last few minutes counts as a new sign-up. */
const NEW_ACCOUNT_MS = 10 * 60_000;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Only allow same-site relative redirect targets.
  const next = safeNext(searchParams.get('next')) ?? '/portal';

  // Behind Vercel's proxy, prefer the forwarded host for the redirect base.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocal = process.env.NODE_ENV === 'development';
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  if (supabaseConfigured && code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const user = data.user;

      // Staff never sign in here (it would skip their second factor), except a password reset.
      if (!next.startsWith('/auth/reset')) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if ((profile?.role ?? 'member') !== 'member') {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${base}/login?error=use_password`);
        }
      }

      // A new Google account: welcome it once, and keep the consent the button showed (for the signup reminders).
      if (user.app_metadata?.provider === 'google') {
        const isNew = Date.now() - Date.parse(user.created_at) < NEW_ACCOUNT_MS;
        if (isNew && !user.user_metadata?.welcomed && supabaseAdminConfigured()) {
          try {
            await createSupabaseAdminClient().auth.admin.updateUserById(user.id, {
              user_metadata: {
                ...user.user_metadata,
                welcomed: true,
                reminders_consent: { at: new Date().toISOString(), version: SIGNUP_CONSENT.version, text: SIGNUP_CONSENT.text },
              },
            });
            if (user.email) {
              const first = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '').trim().split(/\s+/)[0];
              const msg = signupWelcomeEmail({ firstName: first || undefined });
              await sendEmail({ to: user.email, subject: msg.subject, html: msg.html });
            }
          } catch {
            // The account works either way; the welcome is best effort.
          }
        }
      }

      /*
       * Supabase's own reset email (the fallback when there is no service key)
       * lands here with next=/auth/reset. The code is PKCE-bound to the browser
       * that asked for the reset, so this session came from that mailbox.
       */
      if (next.startsWith('/auth/reset')) await markRecovery(user.id);

      // A fresh sign-in starts fresh session clocks, as loginAction does; a
      // leftover idle stamp would otherwise sign them out on the next page.
      const out = NextResponse.redirect(`${base}${next}`);
      const now = String(Date.now());
      const opts = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' };
      out.cookies.set(ACTIVITY_COOKIE, now, opts);
      out.cookies.set(SESSION_START_COOKIE, now, opts);
      return out;
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
