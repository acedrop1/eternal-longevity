import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { allow } from '@/lib/rate-limit';

/*
 * The consent banner's record (migration 0034): which optional categories a
 * browser chose, under which banner version, and whether Global Privacy
 * Control was on. Keyed by a random browser id, not a person. Always 204.
 */
export async function POST(req: NextRequest) {
  const none = new NextResponse(null, { status: 204 });
  if (!supabaseAdminConfigured()) return none;
  if (!(await allow('consent', { max: 30, windowSeconds: 600 }))) return none;
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return none;
  }
  const id = typeof b.id === 'string' && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : null;
  const version = typeof b.version === 'string' ? b.version.slice(0, 20) : null;
  if (!id || !version) return none;
  try {
    const db = createSupabaseAdminClient() as unknown as SupabaseClient;
    await db.from('consent_log').insert({
      browser_id: id,
      analytics: b.analytics === true,
      advertising: b.advertising === true,
      gpc: b.gpc === true,
      version,
    });
  } catch {
    // The choice still applies in the browser.
  }
  return none;
}
