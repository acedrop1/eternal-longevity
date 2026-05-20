'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MobileMenuProps {
  links: { label: string; href: string }[];
}

/**
 * Saki-style mobile menu:
 *   - Closed state: a white pill "Menu" + chevron that sits in the center of
 *     the header row.
 *   - Open state: chevron flips up, and a clean white dropdown card slides
 *     down below the header showing a list of nav rows with right-chevrons.
 *
 * Pairs with the monogram-on-the-left + login-on-the-right buttons that the
 * Header component places alongside it.
 */
export function MobileMenu({ links }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* "Menu" trigger pill. Centered in the header row (matches desktop glass) */}
      {/* When open, "Menu + chevron" crossfades out and an X crossfades in,
          all in the same pill shell so the position never jumps. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className={cn(
          // z-[45] keeps the pill (and its X) above the dropdown scrim
          // (z-35) and panel (z-40) so it never gets covered + blurred.
          'relative z-[45] inline-flex items-center justify-center rounded-full px-5 py-2.5 transition-colors',
          'glass text-foreground text-sm font-semibold tracking-wider min-w-[96px] h-[40px]'
        )}
      >
        {/* "Menu ⌄" label. Fades out when open (opacity-only, no scale —
            scale transforms leave the icon rasterized + blurry on a
            composited layer). */}
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-2',
            'transition-opacity duration-300 ease-out-expo',
            open ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          Menu
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>

        {/* "✕" icon. Fades in when open (opacity-only crossfade) */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'transition-opacity duration-300 ease-out-expo',
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      </button>

      {/* Dropdown panel. Slides down below the header on open */}
      <div
        ref={panelRef}
        className={cn(
          'fixed left-4 right-4 top-[88px] z-40 origin-top overflow-y-auto',
          'rounded-3xl bg-foreground text-background shadow-2xl',
          'transition-all duration-500 ease-out-expo',
          open
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 -translate-y-2 scale-[0.97] pointer-events-none'
        )}
        style={{ maxHeight: 'calc(100vh - 100px)' }}
      >
        <nav className="flex flex-col">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                'group flex items-center justify-between px-6 py-5 text-lg font-semibold tracking-tight',
                i < links.length - 1 ? 'border-b border-background/10' : ''
              )}
            >
              <span>{link.label}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-50 transition-transform duration-300 group-hover:translate-x-1"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </nav>

        {/* Sticky bottom CTA inside the panel */}
        <div className="border-t border-background/10 p-4">
          <Link
            href="/start"
            onClick={() => setOpen(false)}
            className="block w-full rounded-full bg-accent text-black font-semibold text-center px-6 py-3.5 hover:bg-accent-soft transition-colors"
          >
            Apply Now
          </Link>
        </div>
      </div>

      {/* Subtle scrim behind the dropdown. Taps anywhere to close.
          z-[35] keeps it above the sticky lead-capture (z-30) and below the
          dropdown panel (z-40) so the menu panel always reads on top. */}
      <div
        className={cn(
          'fixed inset-0 z-[35] bg-background/50 backdrop-blur-sm transition-opacity duration-500',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />
    </>
  );
}
