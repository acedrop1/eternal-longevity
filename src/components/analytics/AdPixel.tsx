'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { META_PIXEL_ID } from '@/lib/site';

/**
 * Optional advertising and analytics tags (Meta Pixel today), consent-first,
 * on an exact list of reviewed general pages only (Mo's Account and Website
 * Setup Brief, sections 2 and 6; the FTC's GoodRx / BetterHelp / Cerebral cases):
 *  - nothing optional loads until an affirmative choice; Analytics and
 *    Advertising are separate and off by default; a Global Privacy Control
 *    signal counts as Reject optional;
 *  - the pixel runs only on REVIEWED_PAGES (exact paths, no wildcards): never
 *    on treatment, product, quiz, assessment, consent, sign-in, checkout,
 *    payment, portal, subscribe, preferences or privacy-request pages. If it
 *    was loaded earlier in the visit, entering any other page reloads it, so
 *    no tag code stays in memory there;
 *  - one event only: PageView. Automatic event detection, history tracking and
 *    advanced matching are off; nothing identifying is ever passed;
 *  - every choice (and withdrawal) is logged server-side with its version.
 */

/** Exact paths the privacy owner reviewed as general marketing pages. Add to this list only after review. */
const REVIEWED_PAGES = new Set(['/', '/about', '/contact']);
const isReviewed = (path: string) => REVIEWED_PAGES.has(path);

export const CONSENT_VERSION = '2026-10-19';
const STORE_KEY = 'el_consent_v2';
const CHOICES_HASH = '#cookie-choices';

interface Choice {
  analytics: boolean;
  advertising: boolean;
  v: string;
}

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

const REJECTED: Choice = { analytics: false, advertising: false, v: CONSENT_VERSION };

function readChoice(): Choice | null {
  if (navigator.globalPrivacyControl) return REJECTED;
  try {
    const c = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as Choice | null;
    // A choice made under an older banner version is asked again.
    return c && c.v === CONSENT_VERSION ? c : null;
  } catch {
    return null;
  }
}

/** Server-side record of the choice and the banner version it was made under. Best effort. */
function logChoice(c: Choice, gpc: boolean) {
  try {
    let id = localStorage.getItem('el_cid');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('el_cid', id);
    }
    void fetch('/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, analytics: c.analytics, advertising: c.advertising, version: c.v, gpc }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/** Meta's base snippet, written out: automatic events, history tracking and advanced matching off. */
function loadPixel() {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  fbq.disablePushState = true;
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  fbq('set', 'autoConfig', false, META_PIXEL_ID);
  // No second argument: no advanced matching, no user data.
  fbq('init', META_PIXEL_ID);
}

export function AdPixel() {
  const pathname = usePathname() ?? '/';
  const [choice, setChoice] = useState<Choice | null>(REJECTED);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, advertising: false });
  const [reopened, setReopened] = useState(false);
  const loaded = useRef(false);
  const gpc = useRef(false);

  // Read the stored choice once in the browser.
  useEffect(() => {
    gpc.current = !!navigator.globalPrivacyControl;
    const c = readChoice();
    setChoice(c);
    if (c) setDraft({ analytics: c.analytics, advertising: c.advertising });
    const fromLink = window.location.hash === CHOICES_HASH;
    setReopened(fromLink);
    setOpen(c === null || fromLink);
    setReady(true);
    // The footer's "Privacy Choices" link reopens this. Next's Link changes the
    // hash with pushState (no hashchange event), so listen for the click.
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(`a[href$="${CHOICES_HASH}"]`)) {
        e.preventDefault();
        setReopened(true);
        setManage(true);
        setOpen(true);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Advertising granted and a reviewed page: load and send a PageView. Any other
  // page after loading: reload, so the tag is gone from memory.
  useEffect(() => {
    if (!ready || !META_PIXEL_ID) return;
    if (!isReviewed(pathname)) {
      if (loaded.current) window.location.reload();
      return;
    }
    if (!choice?.advertising) return;
    loadPixel();
    loaded.current = true;
    window.fbq?.('track', 'PageView');
  }, [pathname, choice, ready]);

  const decide = (next: { analytics: boolean; advertising: boolean }) => {
    const c: Choice = { ...next, v: CONSENT_VERSION };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(c));
    } catch {}
    logChoice(c, gpc.current);
    setOpen(false);
    setManage(false);
    setReopened(false);
    if (window.location.hash === CHOICES_HASH) history.replaceState(null, '', window.location.pathname + window.location.search);
    // Withdrawing after a tag loaded: reload so collection stops at once.
    if (!c.advertising && loaded.current) window.location.reload();
    setChoice(c);
  };

  // First visit: ask on the reviewed pages (the only places optional tags could run). Reopened from the footer: anywhere.
  if (!ready || !open) return null;
  if (!reopened && !isReviewed(pathname)) return null;

  const btn =
    'inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-5 text-[14px] font-semibold transition-colors md:w-[190px]';
  // Reject is exactly as prominent as Accept (same size, weight and contrast).
  const solid = `${btn} bg-ink text-white hover:bg-ink/85`;
  const link = 'underline decoration-ink/30 underline-offset-[3px] transition-colors hover:decoration-ink';

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-choices-title"
      className="fixed inset-x-2 bottom-2 z-[60] max-h-[90svh] overflow-y-auto rounded-shell bg-white text-ink shadow-[0_-8px_48px_rgba(17,17,17,0.14)] ring-1 ring-ink/10 md:inset-x-4 md:bottom-4"
    >
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:gap-10 md:px-10 md:py-6">
        <div className="min-w-0 flex-1">
          <h2 id="cookie-choices-title" className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] md:text-[19px]">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-butter-deep" />
            Privacy choices
          </h2>
          {gpc.current ? (
            <p className="mt-1.5 max-w-[80ch] text-[14px] leading-relaxed text-ink/75">
              Your browser sends a Global Privacy Control signal, so optional analytics and advertising stay off. There is nothing
              you need to do. Your choice will not affect access to care.
            </p>
          ) : (
            <p className="mt-1.5 max-w-[80ch] text-[14px] leading-relaxed text-ink/75">
              We use necessary technologies to run this site. With your permission, we also use optional analytics and advertising
              tools on selected general marketing pages. These tools help measure our marketing and may receive device and
              public-page interaction information. Choose Accept all, Reject optional or Manage preferences. Your choice will not
              affect access to care. See{' '}
              <Link href="/legal/cookies" className={link}>Cookie Notice</Link> and{' '}
              <Link href="/legal/privacy" className={link}>Privacy Policy</Link>.
            </p>
          )}

          {manage && !gpc.current && (
            <fieldset className="mt-4 max-w-[80ch] divide-y divide-ink/10 rounded-inner bg-milk px-4">
              <legend className="sr-only">Manage preferences</legend>
              <Row title="Necessary" body="Security, sign-in, your cart and payment. Always on; the site can’t work without them." locked />
              <Row
                title="Analytics"
                body="Measures visits to selected general marketing pages. Off unless you turn it on."
                on={draft.analytics}
                onChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
              />
              <Row
                title="Advertising"
                body="Meta, TikTok and Google tools on selected general marketing pages only, never on treatment, assessment, checkout or account pages. Off unless you turn it on."
                on={draft.advertising}
                onChange={(v) => setDraft((d) => ({ ...d, advertising: v }))}
              />
            </fieldset>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
          {gpc.current ? (
            <button type="button" onClick={() => setOpen(false)} className={solid}>
              OK
            </button>
          ) : manage ? (
            <>
              <button type="button" onClick={() => decide(draft)} className={solid}>
                Save choices
              </button>
              <button type="button" onClick={() => decide({ analytics: false, advertising: false })} className={solid}>
                Reject optional
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => decide({ analytics: true, advertising: true })} className={solid}>
                Accept all
              </button>
              <button type="button" onClick={() => decide({ analytics: false, advertising: false })} className={solid}>
                Reject optional
              </button>
              <button
                type="button"
                onClick={() => setManage(true)}
                className={`${btn} bg-white ring-1 ring-inset ring-ink/25 hover:bg-milk`}
              >
                Manage preferences
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  title,
  body,
  on = true,
  locked = false,
  onChange,
}: {
  title: string;
  body: string;
  on?: boolean;
  locked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink/70">{body}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={on}
        disabled={locked}
        onChange={(e) => onChange?.(e.target.checked)}
        aria-label={title}
        className="mt-1 h-5 w-9 shrink-0 cursor-pointer accent-ink disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}
