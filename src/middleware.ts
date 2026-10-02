import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { LOCK_COOKIE, SITE_LOCKED, isOpenPath, lockToken } from '@/lib/site-lock';
import { PATH_HEADER } from '@/lib/safe-next';

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
  /*
   * Tell server pages where they are, so a signed-out visitor to a guarded
   * page goes to /login?next=<here> (see loginUrl). Set, never appended, so a
   * browser cannot supply its own.
   */
  const here = request.nextUrl.clone();
  here.searchParams.delete('_rsc');
  request.headers.set(PATH_HEADER, here.pathname + here.search);
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
