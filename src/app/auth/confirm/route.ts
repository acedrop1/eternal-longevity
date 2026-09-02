/**
 * Verifies a one-time token from our own branded auth emails (password
 * recovery). Exchanges the token_hash for a session cookie server-side, then
 * forwards to `next` — no dependency on Supabase's redirect allowlist.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = (searchParams.get('type') ?? 'recovery') as EmailOtpType;

  // Only same-site relative redirect targets.
  const nextParam = searchParams.get('next') ?? '/auth/reset';
  const next = nextParam.startsWith('/') ? nextParam : '/auth/reset';

  // Behind Vercel's proxy, prefer the forwarded host for the redirect base.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocal = process.env.NODE_ENV === 'development';
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  if (supabaseConfigured && tokenHash) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/forgot-password?error=expired`);
}
