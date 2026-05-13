'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  SHOP_CATEGORIES,
  SHOP_PRODUCTS,
  DELIVERY_LABEL,
  type ShopCategory,
} from '@/lib/shopProducts';

type Filter = 'all' | ShopCategory;

export function ShopCatalog() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SHOP_PRODUCTS.filter((p) => {
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
  }, [filter, query]);

  return (
    <div>
      {/* Search + Category pill row — sticky on scroll.
          On mobile the portal header has a sub-nav row, so sticky-top is higher. */}
      <div className="sticky top-[100px] md:top-14 z-30 -mx-4 md:-mx-6 mb-10 bg-background/90 backdrop-blur py-3 md:py-4 px-4 md:px-6 border-b border-line">
        {/* Search input */}
        <div className="mb-3 relative">
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
            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/45"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search peptides — name, category, benefit…"
            className="w-full rounded-full border border-line bg-surface pl-11 pr-10 py-2.5 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-colors"
            aria-label="Search shop"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full text-foreground/55 hover:bg-foreground/10 hover:text-foreground transition-colors"
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

        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          <Pill active={filter === 'all'} onClick={() => setFilter('all')}>
            All products
          </Pill>
          {SHOP_CATEGORIES.map((c) => (
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

      {/* Product grid */}
      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/portal/shop/${p.id}`}
            className="group relative block overflow-hidden rounded-[2rem] border border-line bg-surface transition-all duration-500 ease-out-expo hover:-translate-y-1 hover:border-accent/30"
            style={{ boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)' }}
          >
            {/* Image header on swatch */}
            <div
              className="relative aspect-[5/6] overflow-hidden"
              style={{ background: p.swatch }}
            >
              <Image
                src={p.image}
                alt={p.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover opacity-45 transition-all duration-[1.6s] ease-out-expo group-hover:scale-105 group-hover:opacity-65"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/70"
              />

              {/* Popular badge */}
              {p.popular && (
                <span className="absolute top-4 left-4 inline-flex items-center rounded-full bg-accent/95 text-black px-2.5 py-1 text-[10px] tracking-widest font-semibold">
                  POPULAR
                </span>
              )}

              {/* Centered name overlay */}
              <div className="relative flex h-full flex-col items-center justify-end p-6 text-center">
                <span className="text-[10px] tracking-widest text-white/65 mb-2">
                  ETERNAL LONGEVITY
                </span>
                <div style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
                  <div className="mb-2 text-[10px] tracking-widest text-accent">
                    {p.tagline.toUpperCase()}
                  </div>
                  <div
                    className="font-bold tracking-tight text-white"
                    style={{
                      fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {p.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom row — description, price, CTA */}
            <div className="p-5 md:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-line bg-background px-2 py-0.5 text-[10px] tracking-wider text-foreground/65">
                  {DELIVERY_LABEL[p.delivery].toUpperCase()}
                </span>
                <span className="rounded-full border border-line bg-background px-2 py-0.5 text-[10px] tracking-wider text-foreground/65">
                  {p.cycleLength.toUpperCase()}
                </span>
              </div>
              <p className="mb-5 text-sm text-foreground/70 leading-relaxed line-clamp-3">
                {p.shortDescription}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] tracking-widest text-foreground/45">
                    SUBSCRIBE FROM
                  </div>
                  <div className="text-lg font-semibold text-foreground tracking-tight">
                    ${Math.round(p.pricing.annual / 12)}
                    <span className="text-sm text-foreground/55 font-normal">
                      /mo
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] tracking-widest text-accent transition-transform duration-300 ease-out-expo group-hover:translate-x-1">
                  EXPLORE
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-16">
          <p className="text-foreground/55 mb-4">
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
              className="text-sm tracking-wider text-accent hover:underline"
            >
              Clear filters →
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
      className={cn(
        'flex-shrink-0 rounded-full px-4 py-2 text-xs tracking-wider font-medium border transition-all',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-surface text-foreground/70 border-line hover:border-foreground/30 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
