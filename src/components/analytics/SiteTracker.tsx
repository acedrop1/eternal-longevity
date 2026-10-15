'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAttribution, track } from '@/lib/attribution';

/**
 * First-party, anonymous: notes which link brought a visitor (kept in this
 * browser) and counts one visit per browser session, for Admin → Marketing.
 * Nothing leaves our servers. Portal, sign-in and payment pages are skipped.
 */
const SKIP = /^\/(portal|login|auth|pay|forgot-password|checkin|unsubscribe)/;
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
  return null;
}
