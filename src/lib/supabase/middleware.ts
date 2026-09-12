/**
 * Session-refresh helper run from the root middleware on every request.
 *
 * When Supabase is not configured this is a pure pass-through, so the demo
 * keeps working untouched. Once Supabase env vars are set it keeps the auth
 * token fresh and available to Server Components.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/env';
import {
  ABSOLUTE_HOURS,
  ACTIVITY_COOKIE,
  SESSION_START_COOKIE,
  idleMinutesForPath,
} from '@/lib/session-policy';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Demo mode — no backend connected yet.
  if (!supabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Touching getUser() refreshes an expired token if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return response;

  /*
   * Automatic logoff. Supabase refreshes a token forever as long as the tab
   * lives, so without this a doctor's laptop stays signed in indefinitely —
   * which is the one thing the Security Rule names. Enforced here rather than
   * in the browser because a timer a user can stop is not a control.
   */
  const path = request.nextUrl.pathname;
  if (path.startsWith('/portal') || path.startsWith('/checkout')) {
    const now = Date.now();
    const seen = Number(request.cookies.get(ACTIVITY_COOKIE)?.value ?? 0);
    const since = Number(request.cookies.get(SESSION_START_COOKIE)?.value ?? 0);

    const idleMs = idleMinutesForPath(path) * 60_000;
    const absoluteMs = ABSOLUTE_HOURS * 3_600_000;

    /*
     * A stamp older than the absolute ceiling cannot describe the session in
     * front of us — it is a leftover a sign-out failed to clear. Treating it as
     * evidence signs someone out the instant they sign in.
     */
    const stale = seen > 0 && now - seen > absoluteMs;
    const idledOut = !stale && seen > 0 && now - seen > idleMs;
    const agedOut = !stale && since > 0 && now - since > absoluteMs;

    if (idledOut || agedOut) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?timeout=${idledOut ? 'idle' : 'expired'}`;
      const out = NextResponse.redirect(url);
      // Drop every auth cookie, not just the session stamps.
      for (const c of request.cookies.getAll()) {
        if (c.name.startsWith('sb-')) out.cookies.delete(c.name);
      }
      out.cookies.delete(ACTIVITY_COOKIE);
      out.cookies.delete(SESSION_START_COOKIE);
      return out;
    }

    const secure = request.nextUrl.protocol === 'https:';
    response.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
    });
    if (!since || stale) {
      response.cookies.set(SESSION_START_COOKIE, String(now), {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
      });
    }
  }

  return response;
}
