import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { allow } from '@/lib/rate-limit';
import { dayOf } from '@/lib/profit';

/*
 * Anonymous site events for Admin → Marketing (migration 0029). Stores the
 * event, the page, the link's tags and the New York day: nothing that
 * identifies a person. Always answers 204, so a blocked or failed write
 * never shows up for the visitor.
 */
const KINDS = new Set(['visit', 'start', 'step', 'complete']);
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor/i;
const clip = (v: unknown, n: number) =>
  typeof v === 'string' && v ? v.trim().toLowerCase().replace(/[^a-z0-9._\-/: ]/g, '').slice(0, n) || null : null;

export async function POST(req: NextRequest) {
  const none = new NextResponse(null, { status: 204 });
  if (!supabaseAdminConfigured() || BOT.test(req.headers.get('user-agent') ?? '')) return none;
  if (!(await allow('track', { max: 120, windowSeconds: 600 }))) return none;
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return none;
  }
  if (typeof b.kind !== 'string' || !KINDS.has(b.kind)) return none;
  const path = clip(b.path, 120);
  if (path && /^\/(portal|api|login|auth|pay)/.test(path)) return none;
  try {
    const db = createSupabaseAdminClient() as unknown as SupabaseClient;
    await db.from('site_events').insert({
      day: dayOf(Date.now()),
      kind: b.kind,
      path,
      source: clip(b.source, 80) ?? 'direct',
      medium: clip(b.medium, 80),
      campaign: clip(b.campaign, 80),
      step: b.kind === 'step' ? clip(b.step, 100) : null,
    });
  } catch {
    // Missing migration or a hiccup: the visitor never notices.
  }
  return none;
}
