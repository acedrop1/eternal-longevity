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

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const startOffset = offset.start ?? 0;
      const endOffset = offset.end ?? 0;
      // 0 when top of el = bottom of viewport; 1 when bottom of el = top of viewport
      const total = rect.height + vh - startOffset - endOffset;
      const scrolled = vh - rect.top - startOffset;
      const p = Math.min(1, Math.max(0, scrolled / total));
      setProgress(p);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ref, offset.start, offset.end]);

  return progress;
}
