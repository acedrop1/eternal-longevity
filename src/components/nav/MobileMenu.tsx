'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { useCatalog } from '@/components/catalog/CatalogProvider';
import { LineupRow, useListedCategories } from '@/components/lineup/Lineup';
import { countLabel, fromPrice } from '@/lib/lineup';
import { cn } from '@/lib/utils';
import { SERVICE_AREA_SHORT } from '@/lib/site';

interface MobileMenuProps {
  links: { label: string; href: string }[];
  /** Ink icon on a light bar; white over photography. */
  light?: boolean;
}

/**
 * Mobile menu: hamburger / X in the header, and a white panel under it.
 * Hims' category list (each opens into rhode-style product rows), top
 * treatments, Learn links, then the assessment CTA and Log in.
 *
 * The panel and scrim render through a portal on document.body: the header
 * uses backdrop-filter, which makes it the containing block for any fixed
 * child, so a scrim inside it would only cover the header itself.
 */
export function MobileMenu({ links, light = true }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const top = useCatalog().products.filter((p) => p.category !== 'metabolic');
  const categories = useListedCategories().filter((c) => c.items.length);
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
        className={cn('relative grid h-9 w-9 place-items-center', light ? 'text-ink' : 'text-white')}
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
                'fixed inset-0 z-[45] bg-black/25 backdrop-blur-sm transition-opacity duration-500',
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
              onClick={() => setOpen(false)}
              aria-hidden
            />

            <div
              ref={panelRef}
              inert={!open}
              className={cn(
                'fixed inset-x-3 z-[46] origin-top overflow-y-auto rounded-inner bg-white/95 text-ink shadow-[0_24px_60px_-20px_rgba(17,17,17,0.35)] ring-1 ring-black/5 backdrop-blur-2xl',
                'transition-[opacity,transform] duration-500 ease-out-expo motion-reduce:transition-none',
                open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
              )}
              style={{ top: panelTop, maxHeight: `calc(100svh - ${panelTop + 12}px)` }}
            >
              {/* Hims' category list; each opens into rhode-style product rows. */}
              <nav aria-label="Shop by category" className="px-3 pt-3">
                <p className="px-2 pb-2 text-[13px] font-medium text-ink/50">Shop by category</p>
                {categories.map((c) => {
                  const expanded = openCat === c.slug;
                  return (
                    <div key={c.slug} className="border-b border-black/5 last:border-0">
                      <button
                        type="button"
                        onClick={() => setOpenCat(expanded ? null : c.slug)}
                        aria-expanded={expanded}
                        className="flex w-full items-center gap-3 px-2 py-3 text-left"
                      >
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-inner bg-milk">
                          <Image src={c.image} alt="" fill sizes="48px" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[22px] font-semibold leading-none tracking-[-0.04em]">{c.name}</span>
                          <span className="mt-1 block truncate text-[13px] text-ink-soft">{countLabel(c.items.length)} · {c.line}</span>
                        </span>
                        <ChevronDown
                          aria-hidden
                          className={cn('h-5 w-5 shrink-0 text-ink/50 transition-transform duration-300', expanded && 'rotate-180')}
                          strokeWidth={1.8}
                        />
                      </button>
                      {expanded && (
                        <div className="flex flex-col gap-2 rounded-inner bg-milk p-2 mb-3">
                          {c.items.map((item) => (
                            <LineupRow key={item.slug} item={item} tint={c.tint} onNavigate={() => setOpen(false)} />
                          ))}
                          <Link
                            href={`/treatments/${c.slug}`}
                            onClick={() => setOpen(false)}
                            className="mt-1 block rounded-full py-3 text-center text-[14px] font-semibold ring-1 ring-ink/80"
                          >
                            Shop all {c.name.toLowerCase()}
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              {/* Top treatments: what's live, with the real product shots. */}
              {top.length > 0 && (
                <div className="mt-3 bg-milk/60 py-4">
                  <p className="px-5 pb-3 text-[13px] font-medium text-ink/50">Top treatments</p>
                  <div className="flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {top.map((p) => (
                      <Link key={p.id} href={`/shop/${p.id}`} onClick={() => setOpen(false)} className="w-36 shrink-0">
                        <span className="relative block aspect-[4/5] overflow-hidden rounded-inner bg-milk">
                          <Image src={p.image} alt="" fill sizes="144px" className="object-cover" />
                          <span className="absolute left-2 top-2 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">Rx</span>
                        </span>
                        <span className="mt-2 block text-[14px] font-semibold tracking-[-0.02em]">{p.name}</span>
                        <span className="block text-[12px] text-ink-soft">from ${fromPrice(p.pricing)}/mo</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <nav aria-label="Learn" className="flex flex-col px-5 pt-3">
                <p className="pb-1 text-[13px] font-medium text-ink/50">Learn</p>
                {links
                  .filter((l) => l.href !== '/shop')
                  .map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between border-b border-black/5 py-3 last:border-0"
                    >
                      <span className="text-[17px] font-medium tracking-[-0.02em]">{link.label}</span>
                      <ArrowUpRight aria-hidden className="h-4 w-4 text-ink/40" strokeWidth={1.8} />
                    </Link>
                  ))}
              </nav>

              <div className="flex flex-col gap-2 p-5">
                <Link
                  href="/start"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-butter px-5 py-3.5 text-center text-[15px] font-semibold text-ink transition-colors hover:bg-butter-deep"
                >
                  Start your assessment
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-full bg-milk px-5 py-3.5 text-center text-[15px] font-medium text-ink transition-colors hover:bg-milk-deep"
                >
                  Log in
                </Link>
                <p className="mt-2 text-center text-[12px] text-ink/50">
                  {SERVICE_AREA_SHORT} only · Prescription required · 18+
                </p>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
