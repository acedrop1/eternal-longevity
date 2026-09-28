import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { LOCK_COOKIE, SITE_LOCKED, isOpenPath, lockToken } from '@/lib/site-lock';

/**
 * Root middleware. Refreshes the Supabase auth session on every request once
 * the backend is connected; a harmless pass-through until then.
 */
export async function middleware(request: NextRequest) {
  if (SITE_LOCKED && !isOpenPath(request.nextUrl.pathname)) {
    const token = await lockToken();
    if (!token || request.cookies.get(LOCK_COOKIE)?.value !== token) {
      const url = request.nextUrl.clone();
      url.pathname = '/coming-soon';
      url.search = '';
      return NextResponse.redirect(url, 307);
    }
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path except Next.js internals and static assets.
     */
    '/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)',
  ],
};
