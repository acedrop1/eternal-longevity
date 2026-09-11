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
        window.location.href = '/login?timeout=idle';
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

  return (
    <div
      role="alertdialog"
      aria-labelledby="idle-title"
      className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-sm rounded-2xl border border-accent/40 bg-surface p-5 shadow-2xl"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      <p id="idle-title" className="text-sm font-semibold text-foreground">
        Still there?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-foreground/60">
        You&apos;ll be signed out in{' '}
        <span className="tabular-nums text-foreground/90">{left}s</span> to keep
        your records private.
      </p>
      <button
        type="button"
        onClick={staySignedIn}
        className="mt-3 w-full rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-soft"
      >
        Stay signed in
      </button>
    </div>
  );
}
