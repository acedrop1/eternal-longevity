/**
 * Where "Continue with Google" lands once Supabase has signed the member in
 * from Google's ID token (components/auth/GoogleButton): the same finishing
 * step as an email link (lib/auth-finish), then on to `next`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';
import { finishSignIn } from '@/lib/auth-finish';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get('next')) ?? '/portal';
  const forwardedHost = request.headers.get('x-forwarded-host');
  const base = process.env.NODE_ENV !== 'development' && forwardedHost ? `https://${forwardedHost}` : origin;
  if (supabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    // Never the password-reset path from here: that needs an emailed link.
    if (data.user) return finishSignIn(supabase, data.user, next.startsWith('/auth/reset') ? '/portal' : next, base);
  }
  return NextResponse.redirect(`${base}/login?error=auth`);
}
