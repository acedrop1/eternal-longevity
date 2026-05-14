'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PROTOCOLS } from '@/lib/protocols';
import { cn } from '@/lib/utils';
import { FeaturedProtocolCard } from './FeaturedProtocolCard';

/**
 * Mobile-only centered carousel for Featured Protocols.
 *
 * The active card sits centered in the viewport with its neighbors peeking
 * in on BOTH sides. Inactive cards scale down + dim slightly so the centered
 * one reads as the focus (coverflow feel). Native scroll-snap drives the
 * swipe; a scroll handler tracks which card is centered to update the
 * scale/opacity and the dot indicators. Tapping a dot scrolls to that card.
 *
 * Hidden at sm+ — the desktop grid in FeaturedProtocol takes over there.
 */
export function ProtocolCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const rafRef = useRef<number | null>(null);

  const recompute = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let closestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const childCenter = c.offsetLeft + c.offsetWidth / 2;
      const dist = Math.abs(childCenter - center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setActive(closest);
  }, []);

  const onScroll = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      recompute();
    });
  }, [recompute]);

  // Set the initial active card once mounted
  useEffect(() => {
    recompute();
  }, [recompute]);

  const scrollToCard = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({
      left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2,
      behavior: 'smooth',
    });
  };

  return (
    <div className="sm:hidden">
      {/* Scroll track — full-bleed, centered snap, both neighbors peek */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-6 px-[16%] pb-2"
      >
        {PROTOCOLS.map((p, i) => (
          <div
            key={p.id}
            className="snap-center shrink-0 w-[68%] transition-all duration-500 ease-out-expo"
            style={{
              transform: active === i ? 'scale(1)' : 'scale(0.9)',
              opacity: active === i ? 1 : 0.45,
            }}
          >
            <FeaturedProtocolCard p={p} />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="mt-6 flex justify-center gap-2">
        {PROTOCOLS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => scrollToCard(i)}
            aria-label={`Go to ${p.name}`}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              active === i ? 'w-6 bg-accent' : 'w-1.5 bg-foreground/25',
            )}
          />
        ))}
      </div>
    </div>
  );
}
