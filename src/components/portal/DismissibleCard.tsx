'use client';

import { useState } from 'react';

/** Cookie the member home reads (server side) to leave closed notices out. */
export const DISMISSED_COOKIE = 'el_dismissed';

/**
 * Wraps an informational card with a close button. Closing hides it at once
 * and remembers it (on this device) so it doesn't come back.
 */
export function DismissibleCard({ cardKey, children }: { cardKey: string; children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss() {
    try {
      const current = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${DISMISSED_COOKIE}=`))
        ?.slice(DISMISSED_COOKIE.length + 1);
      const keys = new Set(decodeURIComponent(current ?? '').split(',').filter(Boolean));
      keys.add(cardKey);
      // Newest 40 only: the cookie stays small.
      const value = encodeURIComponent([...keys].slice(-40).join(','));
      document.cookie = `${DISMISSED_COOKIE}=${value}; path=/portal; max-age=${60 * 60 * 24 * 365}; samesite=lax; secure`;
    } catch {
      // Hidden for now either way.
    }
    setHidden(true);
  }

  return (
    // Room on the right for the X beside the eyebrow and title.
    <div className="relative [&>section>h2]:pr-10 [&>section>p:first-child]:pr-10">
      {children}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-ink/55 transition-colors hover:bg-white/70 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 md:right-4 md:top-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
