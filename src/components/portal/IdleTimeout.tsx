'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WARN_SECONDS } from '@/lib/session-policy';

/**
 * The visible half of automatic logoff.
 *
 * The middleware is what actually ends an idle session — a timer the browser
 * owns is not a control. This exists so the end is not a surprise: a prescriber
 * halfway through a clinical note should be warned and given the chance to stay,
 * not discover on submit that his note went to a login page.
 */
export function IdleTimeout({ idleMinutes }: { idleMinutes: number }) {
  const [left, setLeft] = useState<number | null>(null);
  const lastActive = useRef(Date.now());

  const idleMs = idleMinutes * 60_000;
  const warnAtMs = idleMs - WARN_SECONDS * 1000;

  const staySignedIn = useCallback(() => {
    lastActive.current = Date.now();
    setLeft(null);
    // Any request refreshes the activity cookie through the middleware.
    void fetch(window.location.pathname, { method: 'HEAD', cache: 'no-store' });
  }, []);

  useEffect(() => {
    const bump = () => {
      // While the warning is up, only the button counts — otherwise brushing
      // the trackpad on the way past the laptop silently extends the session.
      if (left !== null) return;
      lastActive.current = Date.now();
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const tick = window.setInterval(() => {
      const idleFor = Date.now() - lastActive.current;
      if (idleFor >= idleMs) {
        const here = window.location.pathname + window.location.search;
        window.location.href = `/login?timeout=idle&next=${encodeURIComponent(here)}`;
      } else if (idleFor >= warnAtMs) {
        setLeft(Math.ceil((idleMs - idleFor) / 1000));
      }
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(tick);
    };
  }, [idleMs, warnAtMs, left]);

  if (left === null) return null;

  // Floats like the shop's buy bar: frosted glass, inset from the edges.
  return (
    <div
      role="alertdialog"
      aria-labelledby="idle-title"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-sm rounded-shell bg-white/80 p-6 text-ink shadow-[0_24px_60px_-24px_rgba(17,17,17,0.45)] ring-1 ring-ink/5 backdrop-blur-2xl backdrop-saturate-150"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      <p
        id="idle-title"
        className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em]"
      >
        Still there?
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        You&apos;ll be signed out in{' '}
        <span className="font-semibold tabular-nums text-ink">{left}s</span> to keep
        your records private.
      </p>
      <button
        type="button"
        onClick={staySignedIn}
        className="mt-4 min-h-[44px] w-full rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85"
      >
        Stay signed in
      </button>
    </div>
  );
}
