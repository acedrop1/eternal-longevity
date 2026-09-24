'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  SHOP_CATEGORIES,
  DELIVERY_LABEL,
  type ShopCategory,
  type ShopProduct,
} from '@/lib/shopProducts';
import { useCatalog } from '@/components/catalog/CatalogProvider';

type Filter = 'all' | ShopCategory;

interface ShopCatalogProps {
  /** Products to list. Defaults to the live catalogue. */
  items?: ShopProduct[];
  /** Category pills to offer. Defaults to all categories. */
  categories?: typeof SHOP_CATEGORIES;
  /** Route prefix for product links. '/shop' on the public storefront. */
  basePath?: string;
  /**
   * When set, each card gets a primary "Get started" CTA pointing at this
   * path with ?product=<slug>, alongside a secondary "Learn more" to the
   * product page. Omitted on the member shop, where the card opens the PDP.
   * A plain string, not a function — this crosses the server/client boundary.
   */
  startPath?: string;
}

export function ShopCatalog({
  items: itemsProp,
  categories = SHOP_CATEGORIES,
  basePath = '/portal/shop',
  startPath,
}: ShopCatalogProps = {}) {
  const { products: live } = useCatalog();
  const items = itemsProp ?? live;
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (!q) return true;
      const haystack = [
        p.name,
        p.tagline,
        p.category,
        p.shortDescription,
        ...p.benefits,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, filter, query]);

  return (
    <div>
      {/* Search + category filter.
          Was a full-bleed bar pulled outside its container with -mx-4, which
          made the page wider than the viewport — and with overflow-x:clip on
          the root that surplus was sliced off rather than scrolled, taking the
          right edge of every card with it.
          Now an inset frosted panel: fixed to the bottom on a phone, where the
          thumb is and where it stops covering the cards, and sticky under the
          top bar from md where a filter bar belongs. */}
      <div
        className={cn(
          'z-30 rounded-[4px] bg-white/85 p-2.5 ring-1 ring-black/10 backdrop-blur-xl backdrop-saturate-150',
          'fixed inset-x-3 bottom-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)]',
          'md:sticky md:inset-x-auto md:bottom-auto md:top-[4.5rem] md:mb-8 md:p-3 md:shadow-none',
        )}
      >
        {/* Search input */}
        <div className="relative mb-2.5">
          <svg
            aria-hidden
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-black/55"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search peptides. Name, category, benefit…"
            className="w-full rounded-[2px] bg-white py-3 pl-11 pr-12 text-[16px] text-black ring-1 ring-black/15 placeholder:text-black/40 transition-shadow focus:outline-none focus:ring-2 focus:ring-black"
            aria-label="Search shop"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-black/60 transition-colors hover:text-black"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          <Pill active={filter === 'all'} onClick={() => setFilter('all')}>
            All products
          </Pill>
          {categories.map((c) => (
            <Pill
              key={c.key}
              active={filter === c.key}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Product grid. Photo tile (price + popular on frosted chips, as on
          the public shop), then name, plan facts and price underneath. */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-8 pb-44 md:gap-x-3 md:gap-y-10 md:pb-0 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <div key={p.id} className="group flex min-w-0 flex-col">
            <Link
              href={`${basePath}/${p.id}`}
              className="flex min-w-0 flex-1 flex-col"
            >
              <div
                className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-neutral-200"
                style={p.shot ? undefined : { background: p.swatch }}
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className={`object-cover ${p.shot ? '' : 'opacity-50'} transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]`}
                />
                <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5 md:left-3 md:top-3">
                  <span className="flex items-baseline gap-1 rounded-[2px] bg-black/70 px-2 py-1.5 text-white ring-1 ring-white/10 backdrop-blur-xl md:px-3 md:py-2">
                    <span className="text-[14px] font-medium tabular-nums md:text-[16px]">
                      ${Math.round(p.pricing.quarterly / 3)}
                    </span>
                    <span className="text-[11px] text-white/80 md:text-[13px]">/mo</span>
                  </span>
                  {p.popular && (
                    <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-white/90 px-2 py-1 font-mono text-[11px] text-black md:text-[12px]">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#D5A850]" />
                      Popular
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex min-w-0 flex-1 flex-col px-0.5">
                <p
                  className="font-display font-normal text-black"
                  style={{ fontSize: 'clamp(1.2rem, 0.8vw + 0.95rem, 1.6rem)', fontStretch: '75%', lineHeight: 1.05 }}
                >
                  {p.name}
                </p>
                <p className="mt-1 text-[14px] text-black/70 md:text-[15px]">{p.tagline}</p>
                <p className="mt-2 font-mono text-[12px] text-black/55">
                  {DELIVERY_LABEL[p.delivery]}
                  <span className="hidden sm:inline"> · {p.cycleLength}</span>
                </p>
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-black/60 sm:text-[14px]">
                  {p.shortDescription}
                </p>
                <p className="mt-auto pt-3 font-mono text-[12px] text-black/55">
                  {startPath ? 'From' : 'Subscribe from'}{' '}
                  <span className="text-[14px] text-black tabular-nums">
                    ${Math.round(p.pricing.quarterly / 3)}/mo
                  </span>
                </p>
              </div>
            </Link>

            {startPath && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`${startPath}?product=${p.id}`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-black px-3 py-2.5 font-mono text-[13px] text-white transition-colors hover:bg-black/85 md:min-h-[40px]"
                >
                  Get started
                </Link>
                <Link
                  href={`${basePath}/${p.id}`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-white px-3 py-2.5 font-mono text-[13px] text-black ring-1 ring-black/15 transition-colors hover:bg-black/[0.04] md:min-h-[40px]"
                >
                  Learn more
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="rounded-[4px] bg-[#F2F2F0] px-6 py-10 text-center">
          <p className="text-[15px] text-black/70">
            {query
              ? `No products match "${query}"${filter !== 'all' ? ' in this category' : ''}.`
              : 'No products in this category yet.'}
          </p>
          {(query || filter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-5 py-2.5 font-mono text-[13px] text-white transition-colors hover:bg-black/85 md:min-h-[40px]"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-h-[44px] flex-shrink-0 rounded-full px-4 font-mono text-[13px] transition-colors md:min-h-[36px]',
        active
          ? 'bg-black text-white'
          : 'bg-white text-black/75 ring-1 ring-black/15 hover:text-black'
      )}
    >
      {children}
    </button>
  );
}
