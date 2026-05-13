'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Lightweight IntersectionObserver hook.
 * Returns `true` once the element has entered the viewport, then stays true.
 * Reliable substitute for framer-motion's whileInView (which has hydration
 * issues in Next 15 / React 19).
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  options: { rootMargin?: string; threshold?: number; once?: boolean } = {}
): boolean {
  const { rootMargin = '-80px 0px', threshold = 0.05, once = true } = options;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, rootMargin, threshold, once]);

  return inView;
}
