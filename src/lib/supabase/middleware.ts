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
  await supabase.auth.getUser();

  return response;
}
