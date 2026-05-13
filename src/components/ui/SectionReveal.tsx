'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface SectionRevealProps {
  children: ReactNode;
  /** Translate-Y distance the section rises from (default 60px). */
  rise?: number;
  /** Duration of the reveal animation in ms (default 900). */
  duration?: number;
  /** Optional delay before the animation starts in ms (default 0). */
  delay?: number;
  /** Viewport intersection threshold to fire reveal (default 0.15 = 15% visible). */
  threshold?: number;
  /** Optional className applied to the wrapper. */
  className?: string;
}

/**
 * SectionReveal — fade + rise entrance for full sections.
 *
 * Wraps any section so it starts invisible + translated down, then animates
 * in with a smooth cubic-bezier ease when it scrolls into view. Fires once
 * via IntersectionObserver.unobserve so the animation never replays.
 *
 * Honors prefers-reduced-motion (renders content as-is).
 */
export function SectionReveal({
  children,
  rise = 60,
  duration = 900,
  delay = 0,
  threshold = 0.15,
  className,
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`relative z-10 bg-background ${className ?? ''}`}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : `translateY(${rise}px)`,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
