'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAttribution, track } from '@/lib/attribution';

/**
 * First-party, anonymous: notes which link brought a visitor (kept in this
 * browser) and counts one visit per browser session, for Admin → Marketing.
 * Nothing leaves our servers. Portal, sign-in and payment pages are skipped.
 */
// Subscribe, preferences and privacy-request handle contact details: no analytics there (Mo's brief, section 2).
const SKIP = /^\/(portal|login|auth|pay|forgot-password|checkin|unsubscribe|subscribe|marketing-preferences|privacy-request)/;
const SESSION = 'el_visit';

export function SiteTracker() {
  const pathname = usePathname() ?? '/';
  useEffect(() => {
    if (SKIP.test(pathname)) return;
    captureAttribution();
    try {
      if (sessionStorage.getItem(SESSION)) return;
      sessionStorage.setItem(SESSION, '1');
    } catch {}
    track('visit', { path: pathname });
  }, [pathname]);

  // Which products people look at: one anonymous count per product page per session, first-party only
  // (Admin → Marketing). Never sent to an ad platform: product pages are excluded from the pixel.
  useEffect(() => {
    const m = /^\/shop\/([a-z0-9-]+)$/.exec(pathname);
    if (!m) return;
    try {
      const key = `el_pv:${m[1]}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    track('product', { path: pathname });
  }, [pathname]);
  return null;
}
