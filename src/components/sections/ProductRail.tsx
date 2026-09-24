'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type ShowcaseItem } from '@/lib/showcase';
import { useCatalog } from '@/components/catalog/CatalogProvider';
import { cn } from '@/lib/utils';

/**
 * Shop All (David pattern). Sits directly under the hero and rises over it.
 *
 * Edge-to-edge rail of tall photo cards. Each card carries a frosted
 * price badge top-left and a frosted name + tagline panel along the bottom.
 * Desktop gets two small round arrows beside the heading; mobile gets a thin
 * scroll-position bar under the rail instead.
 */
export function ProductRail() {
  const { showcase } = useCatalog();
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [bar, setBar] = useState({ left: 0, width: 1 });

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    // A pixel of slack: sub-pixel layout means scrollLeft rarely hits the end
    // exactly, which would otherwise leave the arrow live on a dead rail.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    setBar({ left: el.scrollLeft / el.scrollWidth, width: Math.min(1, el.clientWidth / el.scrollWidth) });
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [sync]);

  const nudge = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]') as HTMLElement | null;
    const step = card ? card.offsetWidth + 12 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: 'smooth' });
  };

  return (
    <section className="bg-white py-14 text-black md:py-16">
      <div className="mb-6 flex items-center justify-between gap-4 px-5 md:mb-7 md:px-4">
        <h2
          className="font-display font-normal"
          style={{ fontSize: 'clamp(1.6rem, 1.9vw + 1rem, 2.6rem)', fontStretch: '75%', lineHeight: 1 }}
        >
          Shop our best sellers.
        </h2>
        <div className="flex shrink-0 items-center gap-5">
          <Link
            href="/shop"
            className="font-mono text-[13px] underline underline-offset-[3px] decoration-black/50 transition-colors hover:decoration-black"
          >
            Shop all
          </Link>
          <div className="hidden items-center gap-1.5 md:flex">
            <RailButton label="Previous product" disabled={atStart} onClick={() => nudge(-1)} dir="prev" />
            <RailButton label="Next product" disabled={atEnd} onClick={() => nudge(1)} dir="next" />
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={sync}
        className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 md:px-4"
        style={{ scrollPaddingLeft: '1.25rem' }}
      >
        {showcase.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            className="w-[80vw] snap-start md:w-[calc((100vw-2rem)/2.4)] lg:w-[calc((100vw-2rem)/3.3)] xl:w-[calc((100vw-2rem)/4.2)] 2xl:w-[calc((100vw-2rem)/5.2)]"
          />
        ))}
        {/* Lets the last card clear the right gutter */}
        <div aria-hidden className="w-3 shrink-0" />
      </div>

      {/* Mobile scroll-position bar */}
      <div className="mx-auto mt-8 h-[3px] w-[62%] bg-black/15 md:hidden">
        <div className="relative h-full">
          <span
            className="absolute inset-y-0 bg-black"
            style={{ left: `${bar.left * 100}%`, width: `${bar.width * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}

/**
 * Tall photo card, shared by the rail and the shop grid; className sizes it.
 * Both use the site's near-square corners (4px card, 2px overlays). "rail" is
 * the homepage row; "grid" is the shop page, with tighter overlays scaled
 * down so two fit across a phone.
 */
export function ProductCard({
  item,
  className,
  variant = 'rail',
  cta = true,
}: {
  item: ShowcaseItem;
  className?: string;
  variant?: 'rail' | 'grid';
  /** Start-assessment button. Off in the member portal: members are past it. */
  cta?: boolean;
}) {
  const grid = variant === 'grid';
  // 4px card, 2px overlay corners, same as every card on the site.
  const v = grid
    ? {
        card: 'rounded-[4px]',
        overlay: 'rounded-[2px]',
        top: 'left-2 top-2 md:left-3 md:top-3',
        panel: 'inset-x-2 bottom-2 p-2 md:inset-x-3 md:bottom-3 md:px-4 md:py-3.5',
        name: 'clamp(1.05rem, 0.9vw + 0.8rem, 1.75rem)',
        // Phones: no divider and a tight gap, so name, tagline and button
        // stay a compact block on a half-width card.
        tagline: 'mt-0.5 text-[12px] md:mt-3 md:border-t md:pt-3 md:text-[14px]',
        sizes: '(max-width: 1024px) 50vw, 33vw',
      }
    : {
        card: 'rounded-[4px]',
        overlay: 'rounded-[2px]',
        top: 'left-4 top-4',
        panel: 'inset-x-4 bottom-4 px-4 py-3.5',
        name: 'clamp(1.4rem, 0.6vw + 1.2rem, 1.75rem)',
        tagline: 'mt-3 border-t pt-3 text-[14px]',
        sizes: '(max-width: 768px) 80vw, 34vw',
      };

  const body = (
    <>
      <Image
        src={item.image}
        alt=""
        fill
        sizes={v.sizes}
        className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
      />

      {/* Price (monthly struck through beside the quarterly plan's per-month
          price, the comparison the product page already makes) and, in local
          dev, the preview tag. Stacked so they never collide on a narrow card. */}
      <div className={cn('absolute flex flex-col items-start gap-1.5', v.top, !grid && 'right-4 flex-row justify-between')}>
        {item.price && (
          <div
            className={cn(
              'flex items-baseline gap-1.5 bg-black/70 text-white ring-1 ring-white/10 backdrop-blur-xl',
              v.overlay,
              grid ? 'px-2 py-1.5 md:gap-2 md:px-3 md:py-2' : 'gap-2 px-3 py-2'
            )}
          >
            <s className={cn('text-white/50', grid ? 'text-[12px] md:text-[15px]' : 'text-[15px]')}>${item.price.was}</s>
            <span className={cn('font-medium', grid ? 'text-[14px] md:text-[17px]' : 'text-[17px]')}>${item.price.now}</span>
            <span className={cn('text-white/80', grid ? 'text-[11px] md:text-[13px]' : 'text-[13px]')}>
              /mo{grid ? <span className="hidden md:inline"> quarterly</span> : ' quarterly'}
            </span>
          </div>
        )}
        {item.preview && (
          <span className={cn('bg-[#EFE7D6] px-2.5 py-1.5 text-[11px] text-black', v.overlay, !grid && 'ml-auto')}>
            Local preview
          </span>
        )}
      </div>

      {/* Name + tagline panel with a Start assessment button. Grid: full
          width under the tagline on a phone, beside it from md. Rail: always
          beside it (the rail card is wide enough on every screen). */}
      {/* Above the card link (z-2) but click-through, except the button:
          backdrop-blur makes the panel its own stacking context, so the
          button can only rise above the link if the panel does. */}
      <div className={cn('pointer-events-none absolute z-[2] bg-black/70 text-white ring-1 ring-white/10 backdrop-blur-xl', v.overlay, v.panel)}>
        <p className="font-display font-normal" style={{ fontSize: v.name, fontStretch: '75%', lineHeight: 1.05 }}>
          {item.name}
        </p>
        <div
          className={cn(
            'border-white/25',
            v.tagline,
            grid ? 'md:flex md:items-center md:justify-between md:gap-3' : 'flex items-center justify-between gap-3'
          )}
        >
          <p className="min-w-0 text-white/90">{item.tagline}</p>
          {cta && (
          <Link
            href={`/start?product=${item.id}`}
            className={cn(
              'pointer-events-auto block shrink-0 bg-white text-center font-mono text-black transition-colors hover:bg-white/85',
              grid
                ? 'mt-1.5 rounded-[2px] px-2 py-1.5 text-[11px] md:mt-0 md:px-3 md:py-2 md:text-[13px]'
                : 'rounded-[2px] px-3 py-2 text-[13px]'
            )}
          >
            Start assessment
          </Link>
          )}
        </div>
      </div>
    </>
  );

  // The card is a box with a stretched link to the product page underneath
  // its overlays, so a second link (the CTA) can sit on top without nesting
  // one link inside another.
  return (
    <div
      data-card
      className={cn('group relative aspect-[3/4] shrink-0 overflow-hidden bg-neutral-200', v.card, className)}
      aria-label={item.href ? undefined : `${item.name} (local preview, not on the live site)`}
    >
      {body}
      {item.href && (
        <Link href={item.href} aria-label={`Shop ${item.name}`} className="absolute inset-0 z-[1]" />
      )}
    </div>
  );
}

function RailButton({
  label,
  disabled,
  onClick,
  dir,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  dir: 'prev' | 'next';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-full shadow-sm transition-colors',
        disabled ? 'cursor-default bg-black/5 text-black/25' : 'bg-white text-black ring-1 ring-black/10 hover:bg-black/5'
      )}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 'prev' ? 'M19 12H5M11 18l-6-6 6-6' : 'M5 12h14M13 6l6 6-6 6'} />
      </svg>
    </button>
  );
}
