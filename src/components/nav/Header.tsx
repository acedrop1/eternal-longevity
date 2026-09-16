'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Science', href: '/science' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
];

/**
 * Header with two distinct layouts:
 *
 * Desktop (md+):
 *   - Full wordmark logo (left) + center frosted-pill nav + Login + Apply Now (right)
 *
 * Mobile (< md):
 *   - Saki pattern: monogram badge (left) + centered "Menu" pill (center) + Login pill (right)
 *   - Tapping Menu opens a clean white dropdown panel. See MobileMenu.tsx
 *
 * On scroll, the desktop pill gets a stronger frosted backdrop and the
 * wordmark scales down slightly (Saki collapse).
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 anim-slide-down">
      <div
        className={cn(
          'mx-auto flex h-16 max-w-7xl items-center justify-between transition-all duration-500 ease-out-expo',
          scrolled ? 'mt-3' : 'mt-4'
        )}
      >
        {/* ============ DESKTOP LAYOUT ============ */}
        <div className="hidden md:flex flex-1 items-center">
          <Logo collapsed={scrolled} />
        </div>

        <nav className="hidden md:block">
          {/*
           * Always dark, never themed. The page alternates between black and
           * cream bands and the header floats across both — a glass pill that
           * tints white disappears the moment it crosses a light one, labels
           * and all. A solid dark pill reads on either ground, which is what
           * every site built out of bands ends up doing with its nav.
           */}
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1.5 backdrop-blur-xl transition-all duration-500 ease-out-expo',
              scrolled
                ? 'bg-black/80 ring-1 ring-white/15'
                : 'bg-black/55 ring-1 ring-white/10'
            )}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="pill text-white/80 hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="hidden md:flex flex-1 items-center justify-end gap-2">
          <Link
            href="/login"
            className="pill bg-black/55 text-white/75 backdrop-blur-xl ring-1 ring-white/10 hover:text-white"
          >
            Login
          </Link>
          <Link
            href="/start"
            className="pill bg-accent text-black font-semibold hover:bg-accent-soft"
          >
            Apply Now
          </Link>
        </div>

        {/* ============ MOBILE LAYOUT ============ */}
        {/* Left: monogram badge */}
        <div className="md:hidden flex-1 flex justify-start">
          <Logo variant="monogram" />
        </div>

        {/* Center: "Menu" pill (manages the dropdown internally) */}
        <div className="md:hidden">
          <MobileMenu links={NAV_LINKS} />
        </div>

        {/* Right: Login badge (Saki pattern, but Login instead of cart) */}
        <div className="md:hidden flex-1 flex justify-end">
          <Link
            href="/login"
            aria-label="Login"
            className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white/80 backdrop-blur-xl ring-1 ring-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
