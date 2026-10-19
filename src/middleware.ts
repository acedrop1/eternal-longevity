import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { LOCK_COOKIE, SITE_LOCKED, isOpenPath, lockToken } from '@/lib/site-lock';
import { PATH_HEADER } from '@/lib/safe-next';
import { STAFF_APEX, STAFF_PORTALS, requestHost, staffPortalFor } from '@/lib/staff-host';

function staffHostRedirect(request: NextRequest): NextResponse | null {
  if (request.method !== 'GET') return null;
  const host = requestHost(request.headers);
  if (!host.endsWith(`.${STAFF_APEX}`)) return null; // localhost and previews are left alone
  const here = staffPortalFor(host);
  const { pathname, search } = request.nextUrl;
  // A staff portal asked for on www (old links, staff emails) or the other staff address moves to its own.
  for (const [name, base] of Object.entries(STAFF_PORTALS)) {
    if (here !== name && (pathname === base || pathname.startsWith(`${base}/`))) {
      return NextResponse.redirect(`https://${name}.${STAFF_APEX}${pathname}${search}`, 307);
    }
  }
  // The staff address's front door is its sign-in (or the portal, once signed in).
  if (here && pathname === '/') {
    return NextResponse.redirect(`https://${host}${STAFF_PORTALS[here]}`, 307);
  }
  return null;
}

/**
 * Root middleware. Refreshes the Supabase auth session on every request once
 * the backend is connected; a harmless pass-through until then.
 */
export async function middleware(request: NextRequest) {
  const moved = staffHostRedirect(request);
  if (moved) return moved;
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
  const response = await updateSession(request);
  // Staff addresses never appear in search results.
  if (staffPortalFor(requestHost(request.headers))) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except Next.js internals and static assets.
     */
    '/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)',
  ],
};
