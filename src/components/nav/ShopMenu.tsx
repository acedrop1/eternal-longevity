'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CategoryTile, LineupRow, useListedCategories } from '@/components/lineup/Lineup';
import { countLabel, listedItems } from '@/lib/lineup';
import { cn } from '@/lib/utils';

/**
 * Desktop Shop menu: rhode's tabbed product row, with Hims' detail on every
 * item (what it's for, form, price). Opens under the header bar on hover or
 * click of Shop; the header owns open/close.
 */
export function ShopMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState('featured');
  // Only what's listed; a category with nothing listed gets no tab.
  const cats = useListedCategories().filter((c) => c.items.length);
  const all = listedItems(cats).map(({ item, category }) => ({ item, tint: category.tint }));
  const tabs = [{ slug: 'featured', name: 'Featured' }, ...cats.map((c) => ({ slug: c.slug, name: c.name }))];
  const cat = cats.find((c) => c.slug === tab);
  const rows = cat ? cat.items.map((item) => ({ item, tint: cat.tint })) : all.slice(0, 9);

  return (
    <div
      inert={!open}
      className={cn(
        'absolute inset-x-0 top-[calc(100%+8px)] hidden before:absolute before:inset-x-0 before:-top-2 before:h-2 rounded-shell bg-white/85 p-5 text-ink shadow-[0_30px_80px_-30px_rgba(17,17,17,0.35)] ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150 md:block lg:p-6',
        'origin-top transition-[opacity,transform] duration-300 ease-out-expo motion-reduce:transition-none',
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
      )}
    >
      <div role="tablist" aria-label="Shop" className="mb-5 flex flex-wrap justify-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.slug}
            type="button"
            role="tab"
            aria-selected={tab === t.slug}
            onMouseEnter={() => setTab(t.slug)}
            onFocus={() => setTab(t.slug)}
            onClick={() => setTab(t.slug)}
            className={cn(
              'rounded-full px-4 py-2 text-[14px] font-semibold tracking-[-0.01em] transition-colors',
              tab === t.slug ? 'bg-ink text-white' : 'text-ink/50 hover:text-ink'
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-5 xl:grid-cols-[1fr_300px]">
        <div className="grid content-start gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ item, tint }) => (
            <LineupRow key={item.slug} item={item} tint={tint} onNavigate={onClose} />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {cat ? (
            <CategoryTile c={cat} className="min-h-[220px] flex-1" sizes="300px" />
          ) : (
            <Link href="/shop" onClick={onClose} className="group flex min-h-[220px] flex-1 flex-col justify-end rounded-shell bg-butter p-5">
              <span className="text-[28px] font-semibold leading-none tracking-[-0.04em]">Shop all</span>
              <span className="mt-2 text-[13px] text-ink/70">
                {all.length ? `${countLabel(all.length)} across ${cats.length} ${cats.length === 1 ? 'category' : 'categories'}` : 'More treatments coming soon'}
              </span>
            </Link>
          )}
          <Link
            href={cat ? `/treatments/${cat.slug}` : '/shop'}
            onClick={onClose}
            className="group flex items-center justify-center gap-1.5 rounded-full py-3 text-[14px] font-semibold ring-1 ring-ink/80 transition-colors hover:bg-ink hover:text-white"
          >
            Shop {cat ? cat.name.toLowerCase() : 'all'}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" strokeWidth={2.2} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
