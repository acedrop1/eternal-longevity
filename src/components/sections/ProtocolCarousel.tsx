'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PROTOCOLS } from '@/lib/protocols';
import { cn } from '@/lib/utils';
import { FeaturedProtocolCard } from './FeaturedProtocolCard';

/**
 * Mobile-only INFINITE centered carousel for Featured Protocols.
 *
 * The active card sits centered with its neighbors peeking + dimmed on both
 * sides (coverflow feel). Because there's always a card on each side, it
 * looks "in motion" from the very first frame. Including the first card.
 *
 * Infinite loop trick: the protocol list is rendered three times. We start
 * scrolled into the MIDDLE copy. Whenever scrolling settles inside the first
 * or third copy, we instantly (no animation) reposition to the matching
 * card in the middle copy. Invisible to the user because the cards are
 * identical clones. The result is a seamless wrap-around in both directions.
 *
 * Hidden at sm+. The desktop grid in FeaturedProtocol takes over there.
 */
const N = PROTOCOLS.length;
const LOOP = [...PROTOCOLS, ...PROTOCOLS, ...PROTOCOLS];

export function ProtocolCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0); // 0..N-1
  const rafRef = useRef<number | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Scroll so that the child at loopIdx is centered in the viewport. */
  const centerOn = useCallback((loopIdx: number, smooth: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    const child = el.children[loopIdx] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({
      left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  /** Index (in LOOP space) of the card currently closest to viewport center. */
  const closestLoopIndex = useCallback(() => {
    const el = trackRef.current;
    if (!el) return N; // default: first card of the middle copy
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let closestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const cc = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(cc - center);
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    });
    return closest;
  }, []);

  // Initial: jump into the middle copy so a card is centered with neighbors
  // peeking on BOTH sides from the first frame. We can't rely on a single
  // useLayoutEffect call. The track may not have its final width yet
  // (it lives inside fade-in / reveal wrappers). A ResizeObserver fires the
  // centering the moment the track actually has a measurable width, then
  // disconnects so it only runs once.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let done = false;

    const tryCenter = () => {
      if (done) return;
      if (el.clientWidth === 0) return;
      const child = el.children[N] as HTMLElement | undefined;
      if (!child || child.offsetWidth === 0) return;
      el.scrollLeft =
        child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2;
      done = true;
      setActive(0);
    };

    tryCenter(); // synchronous attempt. Works if layout is already ready
    if (done) return;

    const ro = new ResizeObserver(() => tryCenter());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Live update: track the centered card for scale/opacity + dots.
  const recompute = useCallback(() => {
    const idx = closestLoopIndex();
    setActive(((idx % N) + N) % N);
  }, [closestLoopIndex]);

  // After scrolling settles, if we've drifted into copy 1 or copy 3, snap
  // back to the equivalent card in copy 2. Instant + invisible.
  const reposition = useCallback(() => {
    const idx = closestLoopIndex();
    if (idx < N) {
      centerOn(idx + N, false);
    } else if (idx >= 2 * N) {
      centerOn(idx - N, false);
    }
  }, [closestLoopIndex, centerOn]);

  const onScroll = useCallback(() => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        recompute();
      });
    }
    // debounce the reposition until scrolling has settled
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = setTimeout(reposition, 140);
  }, [recompute, reposition]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (settleRef.current) clearTimeout(settleRef.current);
    };
  }, []);

  /** Tap a dot → scroll to that protocol within the nearest copy. */
  const goTo = (n: number) => {
    const idx = closestLoopIndex();
    const copyStart = Math.floor(idx / N) * N;
    centerOn(copyStart + n, true);
  };

  return (
    <div className="sm:hidden">
      {/* Scroll track. Full-bleed, centered snap, both neighbors peek */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-6 px-[16%] pb-2"
      >
        {LOOP.map((p, i) => {
          const isActive = active === i % N;
          return (
            <div
              key={`${p.id}-${i}`}
              className="snap-center shrink-0 w-[68%] transition-all duration-500 ease-out-expo"
              style={{
                transform: isActive ? 'scale(1)' : 'scale(0.9)',
                opacity: isActive ? 1 : 0.45,
              }}
            >
              <FeaturedProtocolCard p={p} />
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="mt-6 flex justify-center gap-2">
        {PROTOCOLS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => goTo(i)}
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
