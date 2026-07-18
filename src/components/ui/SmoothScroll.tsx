'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

/**
 * Lenis smooth scroll — the weighted, easing scroll behind the marketing site.
 *
 * Scoped deliberately. App surfaces (portal, checkout, intake, auth) keep
 * native scrolling: they are form-heavy, have their own scroll panels, and
 * call scrollIntoView({ behavior: 'smooth' }), which fights Lenis's loop.
 *
 * Lenis drives the real window scroll rather than transforming a wrapper, so
 * the IntersectionObserver reveals (FadeIn, SectionReveal, useInView), the
 * window.scrollY listeners in Header / ProtocolStickyBar / useScrollProgress,
 * and the sticky hero all keep working untouched.
 *
 * Nested scrollers opt out with data-lenis-prevent (see ProtocolCarousel).
 */

/** Route prefixes that keep native scrolling. */
const NATIVE_SCROLL_ROUTES = [
  '/portal',
  '/checkout',
  '/start',
  '/login',
  '/signup',
  '/forgot-password',
  '/auth',
];

export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (NATIVE_SCROLL_ROUTES.some((route) => pathname?.startsWith(route))) {
      return;
    }

    // Honour the OS-level "reduce motion" setting — smoothing the scroll is
    // exactly the kind of motion those users are asking us to drop.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.1, // weighted glide, still responsive to a fast flick
      smoothWheel: true,
      // Native momentum already feels right on touch devices, and smoothing it
      // introduces lag on iOS. Wheel/trackpad only.
      syncTouch: false,
      anchors: true, // in-page #links ease instead of jumping
      autoRaf: true,
    });

    // Overlays like MobileMenu lock the page with `body { overflow: hidden }`.
    // Lenis runs its own scroll loop, so that alone will not stop it — pause
    // it explicitly whenever something locks the body.
    const syncLockState = () => {
      if (document.body.style.overflow === 'hidden') lenis.stop();
      else lenis.start();
    };
    syncLockState();

    const lockObserver = new MutationObserver(syncLockState);
    lockObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => {
      lockObserver.disconnect();
      lenis.destroy();
    };
  }, [pathname]);

  return null;
}
