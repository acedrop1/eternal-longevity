/**
 * The link in our own branded recovery emails. Verifies nothing itself: it
 * forwards to /auth/continue, where a button posts the token to
 * confirmRecoveryAction. A GET that signs someone in can be fired by a mail
 * scanner (spending the token) or by any page that links here (signing the
 * visitor in to the attacker's account). Recovery links only; signup
 * confirmation goes through /auth/callback.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/safe-next';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') ?? 'recovery';

  // Behind Vercel's proxy, prefer the forwarded host for the redirect base.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocal = process.env.NODE_ENV === 'development';
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  if (!tokenHash || type !== 'recovery') {
    return NextResponse.redirect(`${base}/forgot-password?error=expired`);
  }
  const next = safeNext(searchParams.get('next')) ?? '/auth/reset';
  const qs = new URLSearchParams({ token_hash: tokenHash, next });
  return NextResponse.redirect(`${base}/auth/continue?${qs}`);
}
