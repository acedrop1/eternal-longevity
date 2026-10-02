/**
 * Auth callback. Supabase redirects here from email links (signup confirmation,
 * password recovery). It exchanges the one-time code for a session cookie,
 * then forwards to `next`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';
import { markRecovery } from '@/lib/recovery';

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
    if (!error) {
      /*
       * Supabase's own reset email (the fallback when there is no service key)
       * lands here with next=/auth/reset. The code is PKCE-bound to the browser
       * that asked for the reset, so this session came from that mailbox.
       */
      if (data.user && next.startsWith('/auth/reset')) await markRecovery(data.user.id);
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
