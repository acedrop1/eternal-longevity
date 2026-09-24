'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Rotating announcement bar (David pattern): one underlined line, arrows
 * either side, hairline underneath. Every message is a claim the site already
 * makes and links to the page that backs it up.
 */
const MESSAGES = [
  { text: 'Prescribed by a licensed physician. NJ, NY, PA & MI.', href: '/about' },
  { text: 'Compounded by a licensed 503A pharmacy.', href: '/legal/pharmacy-fulfillment' },
  { text: 'Free shipping on every cycle.', href: '/legal/shipping' },
];

const ROTATE_MS = 4500;

export function AnnouncementBar({ collapsed }: { collapsed: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % MESSAGES.length), ROTATE_MS);
    return () => window.clearTimeout(t);
  }, [index, paused]);

  const step = (d: number) => setIndex((i) => (i + d + MESSAGES.length) % MESSAGES.length);

  return (
    <div
      className={cn(
        'overflow-hidden border-b border-white/15 text-white transition-[height,border-color] duration-500 ease-out-expo',
        collapsed ? 'h-0 border-transparent' : 'h-8'
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto flex h-8 w-full items-center justify-between md:max-w-[46rem]">
        <Arrow dir="prev" onClick={() => step(-1)} />
        <div className="relative h-8 flex-1 overflow-hidden">
          {MESSAGES.map((m, i) => (
            <Link
              key={m.text}
              href={m.href}
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
              className={cn(
                'absolute inset-0 flex items-center justify-center text-[12px] underline underline-offset-[3px] decoration-white/60 transition-all duration-500 ease-out-expo hover:decoration-white',
                i === index ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
              )}
            >
              {m.text}
            </Link>
          ))}
        </div>
        <Arrow dir="next" onClick={() => step(1)} />
      </div>
    </div>
  );
}

function Arrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous announcement' : 'Next announcement'}
      className="grid h-8 w-10 place-items-center text-white/70 transition-colors hover:text-white"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  );
}
