'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { META_PIXEL_ID } from '@/lib/site';

/**
 * Meta Pixel, consent-first and marketing pages only.
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
    // The footer's "Cookie Choices" link reopens this. Next's Link changes the
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

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[560px] rounded-[18px] bg-white p-4 text-ink shadow-[0_12px_40px_rgba(0,0,0,0.16)] ring-1 ring-ink/10 md:bottom-5 md:p-5"
    >
      {gpc.current ? (
        <p className="text-[14px] leading-snug">
          Your browser sends a Global Privacy Control signal, so advertising cookies stay off. Nothing to choose here.
        </p>
      ) : (
        <p className="text-[14px] leading-snug">
          May we use one advertising cookie (Meta) on our marketing pages to measure our ads? It never runs on your
          assessment, checkout or member portal, and we never share health information.{' '}
          <Link href="/legal/cookies" className="underline decoration-ink/30 underline-offset-[3px]">
            Cookie Notice
          </Link>
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {gpc.current ? (
          <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-ink px-5 py-2 text-[14px] font-semibold text-white">
            OK
          </button>
        ) : (
          <>
            <button type="button" onClick={() => decide('granted')} className="rounded-full bg-ink px-5 py-2 text-[14px] font-semibold text-white">
              Accept
            </button>
            <button type="button" onClick={() => decide('denied')} className="rounded-full bg-milk px-5 py-2 text-[14px] font-semibold text-ink">
              Decline
            </button>
          </>
        )}
      </div>
    </div>
  );
}
