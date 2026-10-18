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
import { safeNext } from '@/lib/safe-next';
import { finishSignIn } from '@/lib/auth-finish';

export const dynamic = 'force-dynamic';

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
      return finishSignIn(supabase, data.user, next, base);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
