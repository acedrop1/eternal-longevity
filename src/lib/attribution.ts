/**
 * Where a visitor came from, for Admin → Marketing. Shared by the browser
 * (capture) and the server (cleaning). Holds no personal data: the link's
 * tags, the first page and the referring site's domain only.
 *
 * Links carry the standard tags: ?utm_source=eternalhair&utm_medium=email&
 * utm_campaign=hair-launch (or the short ?src=eternalhair-email). Ad platforms
 * add their own click ids (fbclid, gclid), which mark the source when no tag
 * is set. Last tagged visit wins, kept for 30 days in this browser.
 */
export interface Attribution {
  source: string;
  medium: string;
  campaign: string;
  landing: string;
  referrer: string;
  at: number;
}

const KEY = 'el_attr';
const DAYS_30 = 30 * 86400_000;
const clip = (v: unknown, n = 80) =>
  typeof v === 'string' ? v.trim().toLowerCase().replace(/[^a-z0-9._\-/ ]/g, '').slice(0, n) : '';

/** A safe copy of whatever came in, or null. Used by the API route and the intake actions. */
export function cleanAttribution(x: unknown): Attribution | null {
  if (!x || typeof x !== 'object') return null;
  const a = x as Record<string, unknown>;
  const out: Attribution = {
    source: clip(a.source) || 'direct',
    medium: clip(a.medium),
    campaign: clip(a.campaign),
    landing: clip(a.landing, 120),
    referrer: clip(a.referrer),
    at: typeof a.at === 'number' && Number.isFinite(a.at) ? a.at : Date.now(),
  };
  return out;
}

/** Turn the current URL and referrer into tags, or null for an untagged visit. */
function fromUrl(url: URL, referrer: string): Omit<Attribution, 'at'> | null {
  const q = url.searchParams;
  const ref = (() => {
    try {
      const h = new URL(referrer).hostname.replace(/^www\./, '');
      return h && h !== url.hostname.replace(/^www\./, '') ? h : '';
    } catch {
      return '';
    }
  })();
  const src = q.get('src'); // short form: source-medium
  let source = clip(q.get('utm_source') ?? (src ? src.split('-')[0] : ''));
  let medium = clip(q.get('utm_medium') ?? (src && src.includes('-') ? src.split('-').slice(1).join('-') : ''));
  const campaign = clip(q.get('utm_campaign') ?? '');
  if (!source && q.get('fbclid')) [source, medium] = ['meta', 'paid'];
  if (!source && (q.get('gclid') || q.get('gbraid') || q.get('wbraid'))) [source, medium] = ['google', 'paid'];
  if (!source && ref) {
    source = ref.split('.').slice(-2, -1)[0] || ref;
    medium = /google|bing|duckduckgo|yahoo/.test(ref) ? 'organic' : /facebook|instagram|tiktok|t\.co|twitter|linkedin|youtube/.test(ref) ? 'social' : 'referral';
  }
  if (!source) return null;
  return { source, medium, campaign, landing: clip(url.pathname, 120), referrer: ref };
}

/** Browser: record this page's tags if it has any; returns what's on file. */
export function captureAttribution(): Attribution {
  const now = Date.now();
  let saved: Attribution | null = null;
  try {
    saved = cleanAttribution(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
    if (saved && now - saved.at > DAYS_30) saved = null;
  } catch {}
  const fresh = fromUrl(new URL(window.location.href), document.referrer);
  const current: Attribution = fresh
    ? { ...fresh, at: now }
    : saved ?? { source: 'direct', medium: '', campaign: '', landing: window.location.pathname.slice(0, 120), referrer: '', at: now };
  try {
    if (fresh || !saved) localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  return current;
}

/** Browser: what's on file, without changing it. */
export function readAttribution(): Attribution | null {
  try {
    return cleanAttribution(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return null;
  }
}

export type SiteEventKind = 'visit' | 'start' | 'step' | 'complete';

/** Browser: send one anonymous event. Never throws, never blocks. */
export function track(kind: SiteEventKind, extra: { step?: string; path?: string } = {}): void {
  try {
    const a = readAttribution() ?? captureAttribution();
    const body = JSON.stringify({
      kind,
      path: extra.path ?? window.location.pathname,
      step: extra.step,
      source: a.source,
      medium: a.medium,
      campaign: a.campaign,
    });
    if (!navigator.sendBeacon?.('/api/t', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/t', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
    }
  } catch {}
}
