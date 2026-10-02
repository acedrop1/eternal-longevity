import type { Role } from './auth';

/** Staff areas, each open to one role only. */
const STAFF_AREAS: [prefix: string, role: Role][] = [
  ['/portal/admin', 'admin'],
  ['/portal/doctor', 'doctor'],
  ['/portal/pharmacy', 'pharmacy'],
];

/**
 * Where to send someone after sign-in, from an untrusted `?next=`.
 *
 * Returns a same-site path the role may open, or null (use the role's
 * dashboard). Anything that could leave the site is refused: `//host` and
 * `/\host` are protocol-relative to a browser, and a scheme is a scheme.
 * The path is checked after URL normalisation too, so `/./x/../admin` or
 * `/.//evil.com` cannot sneak past the prefix checks.
 *
 * Pure on purpose: it runs on the server, in the browser and under tsx.
 */
export function safeNext(raw: unknown, role?: Role): string | null {
  if (typeof raw !== 'string' || raw.length > 2000) return null;
  // Backslashes and control characters are rewritten or dropped by URL
  // parsers, which is how `/\evil.com` and `/\t/evil.com` become hosts.
  if (!raw.startsWith('/') || raw.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, 'http://self.invalid');
  } catch {
    return null;
  }
  if (url.origin !== 'http://self.invalid' || url.pathname.startsWith('//')) return null;

  // Checked decoded: the router decodes `/portal/%61dmin` to the admin area.
  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (role && STAFF_AREAS.some(([prefix, owner]) => path.startsWith(prefix) && owner !== role)) {
    return null;
  }
  return url.pathname + url.search + url.hash;
}

/** Request header the middleware fills with the page path and query. */
export const PATH_HEADER = 'x-el-path';

/** `/login`, carrying where the person was headed when there is somewhere. */
export function loginHref(next: unknown): string {
  const safe = safeNext(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : '/login';
}
