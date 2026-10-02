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
  isStaffPath,
} from '@/lib/session-policy';
import { PATH_HEADER } from '@/lib/safe-next';

const MFA_COOKIE = 'el_mfa';

/**
 * Verify the second-factor ticket without a database read.
 *
 * Written with Web Crypto rather than the helper in lib/mfa.ts because that
 * module is server-only and this runs on the edge on every request. The ticket
 * is userId.expiry.hmac — anything a browser could forge fails the signature.
 */
async function ticketValid(
  ticket: string | undefined,
  userId: string,
  secret: string,
): Promise<boolean> {
  if (!ticket) return false;
  const [id, expRaw, sig] = ticket.split('.');
  if (!id || !expRaw || !sig) return false;
  if (id !== userId || Number(expRaw) < Date.now()) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${expRaw}`),
  );
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant time: compare every byte whatever happens.
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

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
  // This page, for `?next=` on the way out (the root middleware strips _rsc).
  const here = request.headers.get(PATH_HEADER) ?? path;

  /*
   * Staff areas need the second factor as well as the password. Checked here
   * because a page-level guard only covers the pages someone remembered to
   * guard, and these are the accounts that reach every patient record.
   */
  const mfaSecret = process.env.MFA_SECRET || process.env.CRON_SECRET;
  if (mfaSecret && isStaffPath(path)) {
    const ok = await ticketValid(
      request.cookies.get(MFA_COOKIE)?.value,
      user.id,
      mfaSecret,
    );
    if (!ok) {
      const url = request.nextUrl.clone();
      url.pathname = '/login/verify';
      url.search = `?next=${encodeURIComponent(here)}`;
      return NextResponse.redirect(url);
    }
  }

  /*
   * Every page counts as activity, not just the portal: a member who spends
   * forty minutes between the shop and the assessment is not idle, and must
   * not be bounced when the wizard hands them to checkout. The idle check runs
   * on the same requests, so a stale session cannot be revived by visiting a
   * public page first. API polling is not a person, and /auth is where a
   * fresh session is being set up (updatePasswordAction restarts the clocks).
   */
  const guarded = path.startsWith('/portal') || path.startsWith('/checkout');
  if (!path.startsWith('/api/') && !path.startsWith('/auth/')) {
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
      const authCookies = request.cookies
        .getAll()
        .filter((c) => c.name.startsWith('sb-') || c.name === MFA_COOKIE);
      let out: NextResponse;
      if (guarded) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.search = `?timeout=${idledOut ? 'idle' : 'expired'}&next=${encodeURIComponent(here)}`;
        out = NextResponse.redirect(url);
      } else {
        // A public page just renders signed out; no reason to send them to /login.
        for (const c of authCookies) request.cookies.delete(c.name);
        out = NextResponse.next({ request });
      }
      // Drop every auth cookie, not just the session stamps.
      for (const c of authCookies) out.cookies.delete(c.name);
      out.cookies.delete(ACTIVITY_COOKIE);
      out.cookies.delete(SESSION_START_COOKIE);
      out.cookies.delete(MFA_COOKIE);
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
