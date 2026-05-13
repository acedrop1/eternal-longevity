'use client';

import { useRef, type ReactNode } from 'react';
import { useInView } from '@/lib/useInView';
import { cn } from '@/lib/utils';

interface FadeInProps {
  children: ReactNode;
  delay?: number; // in ms
  /** translate-y start offset in px (default 24) */
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'li' | 'ul' | 'ol';
}

/**
 * Wrap any block of content. It starts hidden (opacity 0, slightly translated
 * down) and fades-up smoothly the first time it enters the viewport.
 * IntersectionObserver-based — bulletproof, no framer-motion quirks.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 24,
  className,
  as = 'div',
}: FadeInProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const Component = as as 'div';

  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn('will-change-transform', className)}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 800ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 800ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </Component>
  );
}
