import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { LOCK_COOKIE, SITE_LOCKED, isOpenPath, lockToken } from '@/lib/site-lock';
import { PATH_HEADER } from '@/lib/safe-next';

/**
 * Staff portals live on their own addresses. Sign-in cookies are per address,
 * so staff sign in there separately from the public site.
 */
const APEX = 'etlongevity.com';
const STAFF_HOSTS: Record<string, string> = { admin: '/portal/admin', doctor: '/portal/doctor' };

function staffHostRedirect(request: NextRequest): NextResponse | null {
  if (request.method !== 'GET') return null;
  const host = (request.headers.get('host') ?? '').split(':')[0];
  if (!host.endsWith(`.${APEX}`)) return null; // localhost and previews are left alone
  const sub = host.slice(0, -APEX.length - 1);
  const { pathname, search } = request.nextUrl;
  // A staff portal asked for on www (old links, staff emails) or the other staff address moves to its own.
  for (const [name, base] of Object.entries(STAFF_HOSTS)) {
    if (sub !== name && (pathname === base || pathname.startsWith(`${base}/`))) {
      return NextResponse.redirect(`https://${name}.${APEX}${pathname}${search}`, 307);
    }
  }
  if (Object.hasOwn(STAFF_HOSTS, sub) && pathname === '/') {
    return NextResponse.redirect(new URL(STAFF_HOSTS[sub], request.url), 307);
  }
  return null;
}

const isStaffHost = (request: NextRequest) =>
  Object.keys(STAFF_HOSTS).some((s) => (request.headers.get('host') ?? '').split(':')[0] === `${s}.${APEX}`);

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
  if (isStaffHost(request)) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
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
