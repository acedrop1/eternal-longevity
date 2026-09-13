import 'server-only';
import { headers } from 'next/headers';

/**
 * A small fixed-window limiter for the endpoints an attacker hammers.
 *
 * In-memory on purpose. A serverless instance is short-lived and there are
 * several of them, so this is a speed bump rather than a wall — but a speed
 * bump on each instance still turns "unlimited password guesses" into a rate
 * an attacker cannot get anything out of, and it costs no infrastructure.
 *
 * ponytail: swap the Map for Upstash Redis if a real distributed limit is ever
 * needed — the call sites do not change.
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
 */
export async function allow(scope: string, limit: Limit): Promise<boolean> {
  const now = Date.now();
  sweep(now);
  const key = `${scope}:${await clientKey()}`;
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
} as const satisfies Record<string, Limit>;
