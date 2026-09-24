'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileMenuProps {
  links: { label: string; href: string }[];
}

/**
 * Mobile menu: hamburger / X in the header, and a frosted black panel that
 * drops in under the header (same glass as the header and the product buy
 * bar) with big condensed links, then the assessment CTA and Log in.
 *
 * The panel and scrim render through a portal on document.body: the header
 * uses backdrop-filter, which makes it the containing block for any fixed
 * child, so a scrim inside it would only cover the header itself.
 */
export function MobileMenu({ links }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  // The header's height changes (announcement bar and category strip fold
  // away on scroll), so open the panel right under wherever it ends now.
  const [panelTop, setPanelTop] = useState(88);
  const toggle = () => {
    const bottom = buttonRef.current?.closest('header')?.getBoundingClientRect().bottom;
    if (bottom) setPanelTop(bottom + 8);
    setOpen((s) => !s);
  };
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        onClick={toggle}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center text-white"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </>
          )}
        </svg>
      </button>

      {mounted &&
        createPortal(
          <>
            {/* Scrim over the page, under the header (z-50) so the X stays sharp. */}
            <div
              className={cn(
                'fixed inset-0 z-[45] bg-black/40 backdrop-blur-sm transition-opacity duration-500',
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
              onClick={() => setOpen(false)}
              aria-hidden
            />

            <div
              ref={panelRef}
              inert={!open}
              className={cn(
                'fixed inset-x-3 z-[46] origin-top overflow-y-auto rounded-[4px] bg-black/75 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/15 backdrop-blur-2xl backdrop-saturate-150',
                'transition-[opacity,transform] duration-500 ease-out-expo motion-reduce:transition-none',
                open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
              )}
              style={{ top: panelTop, maxHeight: `calc(100svh - ${panelTop + 12}px)` }}
            >
              <nav className="flex flex-col px-5 pt-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-center justify-between border-b border-white/10 py-4"
                  >
                    <span
                      className="font-display font-normal"
                      style={{ fontSize: '2rem', fontStretch: '75%', lineHeight: 1 }}
                    >
                      {link.label}
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="h-5 w-5 text-white/50 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      strokeWidth={1.5}
                    />
                  </Link>
                ))}
              </nav>

              <div className="flex flex-col gap-2 p-5">
                <Link
                  href="/start"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-white px-5 py-3.5 text-center font-mono text-[14px] text-black transition-colors hover:bg-white/85"
                >
                  Start your assessment
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-full px-5 py-3.5 text-center font-mono text-[14px] text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
                >
                  Log in
                </Link>
                <p className="mt-2 text-center font-mono text-[12px] text-white/50">
                  NJ, NY, PA &amp; MI only · Prescription required · 18+
                </p>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
