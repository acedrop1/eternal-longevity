'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { META_PIXEL_ID } from '@/lib/site';

/**
 * Advertising and analytics tags (Meta Pixel today; add others here), consent-first,
 * marketing pages only.
 *
 * Telehealth pixels are where the big privacy cases came from (GoodRx,
 * BetterHelp, Cerebral), so the rules here are deliberately narrow:
 *  - nothing loads until the visitor taps Accept; a Global Privacy Control
 *    signal counts as Decline and the banner is never shown;
 *  - it only runs on the marketing pages below. Assessment, checkout,
 *    portal, sign-in and payment pages never load it, and if it was loaded
 *    earlier in the visit, entering one of them reloads the page so no
 *    pixel code stays in memory there;
 *  - automatic events and history tracking are off. We send PageView and a
 *    bare Lead (tap on "Start"), never a product, condition or answer.
 */

const CONSENT_KEY = 'el_ad_consent';
const CHOICES_HASH = '#cookie-choices';

const MARKETING = [/^\/$/, /^\/shop(\/|$)/, /^\/treatments(\/|$)/, /^\/about$/, /^\/faq$/, /^\/compliance$/, /^\/contact$/, /^\/hair$/];
const isMarketing = (path: string) => MARKETING.some((re) => re.test(path));

type Choice = 'granted' | 'denied' | null;

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

function readChoice(): Choice {
  if (navigator.globalPrivacyControl) return 'denied';
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

/** Meta's base snippet, written out, with auto events and pushState tracking off. */
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
  fbq('init', META_PIXEL_ID);
}

export function AdPixel() {
  const pathname = usePathname() ?? '/';
  const [choice, setChoice] = useState<Choice>('denied');
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [reopened, setReopened] = useState(false);
  const loaded = useRef(false);
  const gpc = useRef(false);

  // Read the stored choice once in the browser.
  useEffect(() => {
    gpc.current = !!navigator.globalPrivacyControl;
    const c = readChoice();
    setChoice(c);
    const fromLink = window.location.hash === CHOICES_HASH;
    setReopened(fromLink);
    setOpen(c === null || fromLink);
    setReady(true);
    // The footer's "Your Privacy Choices" link reopens this. Next's Link changes the
    // hash with pushState (no hashchange event), so listen for the click.
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(`a[href$="${CHOICES_HASH}"]`)) {
        setReopened(true);
        setOpen(true);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Load on marketing pages after Accept; PageView on each of them. Leaving
  // for a non-marketing page after loading reloads it, so the pixel is gone.
  useEffect(() => {
    if (!ready || !META_PIXEL_ID) return;
    if (!isMarketing(pathname)) {
      if (loaded.current) window.location.reload();
      return;
    }
    if (choice !== 'granted') return;
    loadPixel();
    loaded.current = true;
    window.fbq?.('track', 'PageView');
  }, [pathname, choice, ready]);

  // Bare Lead when someone taps through to the assessment.
  useEffect(() => {
    if (choice !== 'granted') return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="/start"]');
      if (a && loaded.current) window.fbq?.('track', 'Lead');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [choice]);

  const decide = (c: 'granted' | 'denied') => {
    try {
      localStorage.setItem(CONSENT_KEY, c);
    } catch {}
    setOpen(false);
    setReopened(false);
    if (window.location.hash === CHOICES_HASH) history.replaceState(null, '', window.location.pathname + window.location.search);
    // Withdrawing after the pixel loaded: reload so it is gone.
    if (c === 'denied' && loaded.current) window.location.reload();
    setChoice(c);
  };

  // First visit: ask on marketing pages only. Reopened from the footer: anywhere.
  if (!ready || !open || !META_PIXEL_ID) return null;
  if (!reopened && !isMarketing(pathname)) return null;

  const btn = 'inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-[14px] font-semibold transition-colors md:w-[200px]';
  const link = 'underline decoration-ink/30 underline-offset-[3px] transition-colors hover:decoration-ink';

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-choices-title"
      className="fixed inset-x-2 bottom-2 z-[60] rounded-shell bg-white text-ink shadow-[0_-8px_48px_rgba(17,17,17,0.14)] ring-1 ring-ink/10 md:inset-x-4 md:bottom-4"
    >
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:gap-10 md:px-10 md:py-6">
        <div className="min-w-0 flex-1">
          <h2 id="cookie-choices-title" className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] md:text-[19px]">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-butter-deep" />
            Your privacy choices
          </h2>
          {gpc.current ? (
            <p className="mt-1.5 max-w-[80ch] text-[13.5px] leading-relaxed text-ink/70">
              Your browser sends a Global Privacy Control signal, so our advertising and analytics tags stay off. There is nothing you need to do.
            </p>
          ) : (
            <p className="mt-1.5 max-w-[80ch] text-[13.5px] leading-relaxed text-ink/70">
              We and our advertising and analytics partners use cookies and similar tracking technologies to collect data
              about you and how you use our site, measure and personalize ads, and improve our services. This may include
              sensitive health information, such as the treatment pages you view. By clicking &ldquo;I consent,&rdquo; you
              agree that we may process this information for analytics and advertising. We never share your intake answers,
              prescriptions or medical records.
            </p>
          )}
          <p className="mt-2 text-[13px] font-medium text-ink/80">
            <Link href="/legal/cookies" className={link}>Cookie Notice</Link>
            <span aria-hidden className="mx-2 text-ink/30">·</span>
            <Link href="/legal/privacy" className={link}>Privacy Policy</Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2 md:flex-col">
          {gpc.current ? (
            <button type="button" onClick={() => setOpen(false)} className={`${btn} bg-butter hover:bg-butter-deep`}>
              OK
            </button>
          ) : (
            <>
              <button type="button" onClick={() => decide('granted')} className={`${btn} bg-butter hover:bg-butter-deep`}>
                I consent
              </button>
              <button type="button" onClick={() => decide('denied')} className={`${btn} bg-white ring-1 ring-inset ring-ink/25 hover:bg-milk`}>
                I do not consent
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
