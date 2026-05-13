'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
  /** When true, render the small circular monogram (mobile Saki-style). */
  variant?: 'full' | 'monogram';
}

/**
 * Logo renders /public/logo.svg in two variants:
 *   - "full"     — the full wordmark for the desktop header
 *   - "monogram" — a small circular badge that just shows the EL portion
 *                  (mobile Saki pattern)
 *
 * Subtle scale-down on scroll for a Saki-style polish.
 */
export function Logo({ collapsed = false, className, variant = 'full' }: LogoProps) {
  if (variant === 'monogram') {
    return (
      <Link
        href="/"
        className={cn('relative flex items-center select-none', className)}
        aria-label="Eternal Longevity — home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="Eternal Longevity"
          className="h-7 w-auto"
          draggable={false}
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={cn('relative flex items-center select-none', className)}
      aria-label="Eternal Longevity — home"
    >
      <motion.div
        animate={{ scale: collapsed ? 0.88 : 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="origin-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="Eternal Longevity"
          className="h-9 w-auto md:h-10"
          draggable={false}
        />
      </motion.div>
    </Link>
  );
}
