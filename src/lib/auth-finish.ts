import 'server-only';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import type { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { markRecovery } from '@/lib/recovery';
import { ACTIVITY_COOKIE, SESSION_START_COOKIE } from '@/lib/session-policy';
import { SIGNUP_CONSENT } from '@/lib/followups';
import { sendEmail, signupWelcomeEmail } from '@/lib/email';

/** A Google account created in the last few minutes counts as a new sign-up. */
const NEW_ACCOUNT_MS = 10 * 60_000;

/**
 * The end of every sign-in that doesn't go through loginAction: an email link
 * (/auth/callback) or Google's popup (/auth/finish). Staff are signed back out
 * (it would skip their second factor), a new Google account is welcomed once,
 * and the session clocks start fresh.
 */
export async function finishSignIn(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: User,
  next: string,
  base: string,
): Promise<NextResponse> {

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
