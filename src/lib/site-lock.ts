/**
 * Pre-launch lock. While on, every page redirects to /coming-soon, which
 * collects emails; the team gets in with SITE_PASSWORD (a Vercel env var).
 * No password set = nobody gets in (fails closed).
 *
 * On for every Vercel deployment (production and previews); local dev stays
 * open (FORCE_SITE_LOCK=1 turns it on locally). Set SITE_PASSWORD for both.
 * To launch: set PRE_LAUNCH to false and deploy.
 */
const PRE_LAUNCH = false;
export const SITE_LOCKED = PRE_LAUNCH && (!!process.env.VERCEL_ENV || process.env.FORCE_SITE_LOCK === '1');

export const LOCK_COOKIE = 'el_preview';

/** Paths that must keep working while locked: the gate itself, Stripe/cron/API
 *  traffic, and links already emailed to members (pay, check-in, unsubscribe). */
const OPEN = ['/coming-soon', '/api/', '/pay/', '/checkin/', '/unsubscribe/', '/auth/', '/robots.txt', '/opengraph-image', '/icon', '/apple-icon', '/manifest'];

export function isOpenPath(pathname: string): boolean {
  return OPEN.some((p) => pathname.startsWith(p));
}

/** The cookie holds a hash of the password, never the password. Web Crypto, so it runs in middleware. */
export async function lockToken(): Promise<string | null> {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`eternal-longevity:${pw}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
