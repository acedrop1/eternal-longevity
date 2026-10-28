import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { igConfigured, logEvent, putIgToken, studioSession } from '@/lib/studio';
import type { GridBrand } from '@/lib/studio-types';

const STATE = 'el_ig_state';

/*
 * Connect a page to Instagram (API with Instagram Login, read-only scope).
 * GET ?connect=<page> sends you to Instagram; Instagram sends you back here with ?code.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/studio?ig=${q}`, url.origin));
  const { user } = await studioSession();
  if (!user) return NextResponse.redirect(new URL('/studio', url.origin));
  if (!igConfigured()) return back('setup');
  const appId = process.env.INSTAGRAM_APP_ID!;
  const redirectUri = `${url.origin}/studio/instagram`;

  const code = url.searchParams.get('code')?.replace(/#_$/, '');
  if (!code) {
    const brand = url.searchParams.get('connect');
    if (brand !== 'longevity' && brand !== 'hair') return back('failed');
    const state = `${brand}.${randomBytes(16).toString('hex')}`;
    const go = new URL('https://www.instagram.com/oauth/authorize');
    go.search = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, response_type: 'code', scope: 'instagram_business_basic', state }).toString();
    const res = NextResponse.redirect(go);
    res.cookies.set(STATE, state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/studio', maxAge: 600 });
    return res;
  }

  const state = url.searchParams.get('state') ?? '';
  if (!state || state !== req.cookies.get(STATE)?.value) return back('failed');
  const brand = state.split('.')[0] as GridBrand;
  try {
    const short = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({ client_id: appId, client_secret: process.env.INSTAGRAM_APP_SECRET!, grant_type: 'authorization_code', redirect_uri: redirectUri, code }),
    }).then((r) => r.json() as Promise<{ access_token?: string; data?: { access_token?: string }[] }>);
    const shortToken = short.access_token ?? short.data?.[0]?.access_token;
    if (!shortToken) return back('failed');
    const long = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(process.env.INSTAGRAM_APP_SECRET!)}&access_token=${encodeURIComponent(shortToken)}`,
    ).then((r) => r.json() as Promise<{ access_token?: string }>);
    await putIgToken(brand, long.access_token ?? shortToken);
    await logEvent({ by: user.name, action: `connected the ${brand === 'hair' ? 'Hair & Esthetics' : 'Longevity'} Instagram` });
  } catch {
    return back('failed');
  }
  const res = back('connected');
  res.cookies.delete({ name: STATE, path: '/studio' });
  return res;
}
