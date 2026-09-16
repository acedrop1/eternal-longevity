'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PUBLIC_PRODUCTS } from '@/lib/shopProducts';
import { cn } from '@/lib/utils';

/**
 * The catalogue, directly under the brand statement.
 *
 * Someone who has just read what we do should be able to see what we sell
 * without hunting for the nav — every storefront puts a rail here for that
 * reason. It scrolls rather than stacks so five products cost one screen
 * instead of five, and it snaps so a flick lands on a card rather than
 * between two.
 */
export function ProductRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /** Which arrows are live. Recomputed on scroll and on resize. */
  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    // A pixel of slack: sub-pixel layout means scrollLeft rarely hits the end
    // exactly, which would otherwise leave the arrow enabled on a dead rail.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [sync]);

  const nudge = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    // One card plus its gap, so a click advances exactly one product.
    const card = el.querySelector('[data-card]') as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: 'smooth' });
  };

  return (
    <section className="bg-background px-6 py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-[11px] tracking-widest text-foreground/45">
              THE CATALOGUE
            </p>
            <h2
              className="font-semibold tracking-tight text-foreground"
              style={{
                fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)',
                letterSpacing: '-0.022em',
                lineHeight: 1.1,
              }}
            >
              What a prescriber can write for you.
            </h2>
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <RailButton
              label="Previous product"
              disabled={atStart}
              onClick={() => nudge(-1)}
            >
              ←
            </RailButton>
            <RailButton
              label="Next product"
              disabled={atEnd}
              onClick={() => nudge(1)}
            >
              →
            </RailButton>
          </div>
        </div>
      </div>

      {/*
       * On a phone the rail bleeds into the gutter, because a sliced card at
       * the edge is what tells a thumb there is more to swipe. On a desktop
       * there is no thumb and the slice just reads as a clipped layout, so the
       * rail ends exactly where the container does and the cards are sized to
       * divide it evenly — every resting position lands on clean edges.
       */}
      <div className="mx-auto max-w-7xl">
        <div
          ref={railRef}
          onScroll={sync}
          className="scrollbar-hide -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 md:mx-0 md:px-0"
          style={{ scrollPaddingLeft: '1.5rem' }}
        >
          {PUBLIC_PRODUCTS.map((p) => (
            <Link
              key={p.id}
              data-card
              href={`/shop/${p.id}`}
              className="group relative w-[74vw] shrink-0 snap-start overflow-hidden rounded-[1.75rem] border border-line bg-surface transition-colors duration-500 hover:border-accent/30 sm:w-[46vw] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
            >
              <div
                className="relative aspect-[5/6] overflow-hidden"
                style={{ background: p.swatch }}
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="(max-width: 640px) 74vw, (max-width: 1024px) 46vw, 300px"
                  className="object-cover opacity-50 transition-transform duration-700 ease-out-expo group-hover:scale-105"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/75"
                />
                <div className="relative flex h-full flex-col justify-end p-5">
                  <div className="mb-1.5 text-[10px] tracking-widest text-accent">
                    {p.tagline.toUpperCase()}
                  </div>
                  <div
                    className="font-bold tracking-tight text-white"
                    style={{
                      fontSize: 'clamp(1.35rem, 3vw, 1.75rem)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      textShadow: '0 2px 16px rgba(0,0,0,0.6)',
                    }}
                  >
                    {p.name}
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3 p-5">
                <div>
                  <div className="text-[10px] tracking-widest text-foreground/45">
                    FROM
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    ${Math.round(p.pricing.quarterly / 3)}
                    <span className="text-sm font-normal text-foreground/60">
                      /mo
                    </span>
                  </div>
                </div>
                <span className="text-[11px] tracking-widest text-foreground/45 transition-colors group-hover:text-accent">
                  VIEW →
                </span>
              </div>
            </Link>
          ))}

          {/* Clears the mobile gutter; unwanted once the rail ends at the container. */}
          <div aria-hidden className="w-2 shrink-0 md:hidden" />
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl">
        <Link
          href="/shop"
          className="pill inline-flex items-center gap-2 border border-line bg-surface px-5 py-2.5 text-sm text-foreground/85 transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          See every product →
        </Link>
      </div>
    </section>
  );
}

function RailButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-colors',
        disabled
          ? 'cursor-default border-line text-foreground/20'
          : 'border-line text-foreground/70 hover:border-accent/40 hover:text-accent',
      )}
    >
      {children}
    </button>
  );
}
