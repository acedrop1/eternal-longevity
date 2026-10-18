import 'server-only';
import { headers } from 'next/headers';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

/**
 * A small fixed-window limiter for the endpoints an attacker hammers.
 *
 * Counted in the database (rate_hit, migration 0032), so every serverless
 * instance shares one count. If that call fails (not migrated yet, or the
 * database is down) it falls back to a per-instance in-memory count: a speed
 * bump rather than a wall, but never a lockout.
 */
type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();

/** Keep the map from growing without bound on a long-lived instance. */
function sweep(now: number): void {
  if (buckets.size < 5_000) return;
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}

export interface Limit {
  /** Attempts allowed inside the window. */
  max: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/** The caller's IP, as far forward as the proxy will tell us. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  return (
    (h.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Returns false when the caller has spent their attempts.
 * `scope` separates buckets, so a login flood cannot lock out password resets.
 * `id` keys the bucket on something other than the IP — an email address, say.
 */
export async function allow(scope: string, limit: Limit, id?: string): Promise<boolean> {
  const now = Date.now();
  sweep(now);
  const key = `${scope}:${id ? `id:${id}` : await clientKey()}`;
  if (supabaseAdminConfigured()) {
    try {
      const { data, error } = await createSupabaseAdminClient().rpc(
        'rate_hit' as never,
        { p_key: key, p_max: limit.max, p_window: limit.windowSeconds } as never,
      );
      if (!error && typeof data === 'boolean') return data;
    } catch {
      // Fall through to the in-memory count.
    }
  }
  const hit = buckets.get(key);

  if (!hit || hit.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + limit.windowSeconds * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= limit.max;
}

/** The endpoints worth limiting, and what each is worth. */
export const LIMITS = {
  /** Password guessing. */
  login: { max: 10, windowSeconds: 300 },
  /** Account enumeration and reset-mail flooding. */
  passwordReset: { max: 5, windowSeconds: 900 },
  /** Signup abuse. */
  signup: { max: 5, windowSeconds: 900 },
  /** A six-digit code is 10^6; resend is how you get more tries. */
  mfa: { max: 15, windowSeconds: 900 },
  /** Does this email have an account? */
  enumeration: { max: 20, windowSeconds: 600 },
  /** Promo-code guessing. */
  promo: { max: 20, windowSeconds: 600 },
  /** Contact-form and intake spam. */
  form: { max: 10, windowSeconds: 900 },
  /** Assessment autosave: debounced, so a minute of brisk answering stays well under. */
  drafts: { max: 60, windowSeconds: 60 },
} as const satisfies Record<string, Limit>;
