'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Protocol } from '@/lib/protocols';
import { cn } from '@/lib/utils';

interface Props {
  protocol: Protocol;
}

/**
 * Eight Sleep-style sticky checkout bar. Appears once user scrolls past the
 * hero pricing card (~600px down) and stays at the bottom of the viewport.
 * Mobile-first — collapses to product name + CTA on narrow viewports.
 */
export function ProtocolStickyBar({ protocol }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show after user scrolls past the initial hero area
      setVisible(window.scrollY > 700);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 transition-all duration-500 ease-out-expo',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 pb-safe md:pb-6">
        <div
          className="flex items-center gap-3 md:gap-4 rounded-2xl border border-line bg-background/95 px-4 py-3 md:px-5 md:py-3.5 shadow-2xl"
          style={{ backdropFilter: 'blur(20px) saturate(180%)' }}
        >
          {/* Mini product swatch */}
          <div
            className="hidden sm:block h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden border border-line"
            style={{
              background: `linear-gradient(135deg, ${protocol.swatch} 0%, var(--bg, #000000) 100%)`,
            }}
          >
            <div className="flex h-full items-center justify-center">
              <span className="text-[8px] tracking-widest text-accent font-bold">
                {protocol.name.slice(0, 4)}
              </span>
            </div>
          </div>

          {/* Title + price */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="text-sm md:text-base font-semibold text-foreground truncate">
                {protocol.name}
              </div>
              <span className="hidden sm:inline text-[10px] tracking-widest text-foreground/40">
                {protocol.category}
              </span>
            </div>
            <div className="text-xs text-foreground/55">
              Physician-supervised
              <span className="hidden md:inline"> — pricing shown after your assessment</span>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/start"
            className="flex-shrink-0 inline-flex items-center justify-center rounded-full bg-accent text-black px-5 md:px-7 py-2.5 md:py-3 text-sm font-semibold hover:bg-accent-soft transition-colors whitespace-nowrap"
          >
            Start Assessment
          </Link>
        </div>
      </div>
    </div>
  );
}
