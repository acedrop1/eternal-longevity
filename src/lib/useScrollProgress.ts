'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Returns a 0-to-1 progress value for how far a target element has scrolled
 * through the viewport. 0 = top of element at bottom of viewport (just entered).
 * 1 = bottom of element at top of viewport (just left).
 *
 * Built with a plain scroll listener instead of framer-motion's useScroll,
 * which has hydration issues in Next 15 / React 19.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  offset: { start?: number; end?: number } = {}
): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let last = -1;
    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Off screen: nothing to drive, so do not touch React state at all.
      if (rect.bottom < 0 || rect.top > vh) return;
      const startOffset = offset.start ?? 0;
      const endOffset = offset.end ?? 0;
      // 0 when top of el = bottom of viewport; 1 when bottom of el = top of viewport
      const total = rect.height + vh - startOffset - endOffset;
      const scrolled = vh - rect.top - startOffset;
      const p = Math.min(1, Math.max(0, scrolled / total));
      // Sub-pixel scroll deltas do not deserve a re-render.
      if (Math.abs(p - last) < 0.002) return;
      last = p;
      setProgress(p);
    };
    // Coalesce the burst of scroll events into one measurement per frame.
    const update = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ref, offset.start, offset.end]);

  return progress;
}
